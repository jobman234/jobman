import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Loader2, MapPin, Briefcase, Banknote, UserCheck, Inbox, Send } from "lucide-react";

type Req = {
  id: string;
  user_id: string;
  conversation_id: string | null;
  trade_category: string;
  description: string;
  location_state: string | null;
  location_lga: string | null;
  budget_min: number | null;
  budget_max: number | null;
  preferred_start: string | null;
  status: string;
  assigned_artisan_id: string | null;
  agreed_price: number | null;
  agreed_timeline: string | null;
  admin_note: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-info/10 text-info border-info/30" },
  admin_review: { label: "Needs matching", className: "bg-warning/10 text-warning border-warning/30" },
  matched: { label: "Matched", className: "bg-primary/10 text-primary border-primary/30" },
  assigned: { label: "Assigned", className: "bg-primary/10 text-primary border-primary/30" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
};

const PAGE_SIZE = 20;

const AdminRequests = () => {
  const qc = useQueryClient();
  const [active, setActive] = useState<Req | null>(null);
  const [artisanId, setArtisanId] = useState("");
  const [price, setPrice] = useState("");
  const [timeline, setTimeline] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [replyFor, setReplyFor] = useState<Req | null>(null);
  const [reply, setReply] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: requestsPage, isLoading } = useQuery({
    queryKey: ["admin-artisan-requests", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artisan_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .range(0, limit);
      if (error) throw error;
      return data as Req[];
    },
  });

  const hasMore = (requestsPage?.length ?? 0) > limit;
  const requests = requestsPage?.slice(0, limit);

  const { data: customers } = useQuery({
    queryKey: ["admin-request-customers", requests?.length],
    enabled: !!requests?.length,
    queryFn: async () => {
      const ids = [...new Set(requests!.map((r) => r.user_id))];
      const { data } = await supabase
        .from("public_profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      return Object.fromEntries((data ?? []).map((p) => [p.user_id, p.full_name]));
    },
  });

  const { data: artisans } = useQuery({
    queryKey: ["admin-approved-artisans", active?.trade_category],
    enabled: !!active,
    queryFn: async () => {
      const { data: aps } = await supabase
        .from("artisan_profiles")
        .select("user_id, primary_trade")
        .eq("verification_status", "approved");
      const ids = (aps ?? []).map((a) => a.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("public_profiles")
        .select("user_id, full_name, state, lga")
        .in("user_id", ids);
      const pmap = new Map((profs ?? []).map((p) => [p.user_id, p]));
      return (aps ?? []).map((a) => ({
        user_id: a.user_id,
        trade: a.primary_trade,
        name: pmap.get(a.user_id)?.full_name ?? "Artisan",
        location: [pmap.get(a.user_id)?.lga, pmap.get(a.user_id)?.state].filter(Boolean).join(", "),
      })).sort((x, y) => Number(y.trade === active?.trade_category) - Number(x.trade === active?.trade_category));
    },
  });

  const openAssign = (r: Req) => {
    setActive(r);
    setArtisanId(r.assigned_artisan_id ?? "");
    setPrice(r.agreed_price ? String(r.agreed_price) : "");
    setTimeline(r.agreed_timeline ?? "");
    setNote(r.admin_note ?? "");
  };

  const assign = async () => {
    if (!active || !artisanId || !price || !timeline) {
      toast.error("Artisan, price and timeline are required.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("admin_assign_request", {
      _request_id: active.id,
      _artisan_id: artisanId,
      _price: Number(price),
      _timeline: timeline,
      _note: note || undefined,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Artisan assigned and job created.");
    setActive(null);
    qc.invalidateQueries({ queryKey: ["admin-artisan-requests"] });
  };

  const sendReply = async () => {
    if (!replyFor?.conversation_id || !reply.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("chat_messages").insert({
      conversation_id: replyFor.conversation_id,
      role: "assistant",
      sender_role: "admin",
      request_id: replyFor.id,
      content: reply.trim(),
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    await supabase.from("chat_conversations")
      .update({ admin_unread: false, updated_at: new Date().toISOString() })
      .eq("id", replyFor.conversation_id);
    toast.success("Reply sent to the customer's chat.");
    setReply("");
    setReplyFor(null);
  };

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (!requests?.length) {
    return (
      <div className="text-center py-16 bg-card rounded-2xl border border-border">
        <Inbox className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">No artisan requests yet</p>
        <p className="text-sm text-muted-foreground mt-1">Requests customers make in the concierge chat land here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((r) => {
        const s = STATUS_STYLE[r.status] ?? STATUS_STYLE.new;
        return (
          <div key={r.id} className="bg-card rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-display font-semibold text-foreground flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4 text-primary" />
                    {r.trade_category}
                  </span>
                  <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", s.className)}>
                    {s.label}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {customers?.[r.user_id] ?? "Customer"} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{r.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {(r.location_state || r.location_lga) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {[r.location_lga, r.location_state].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {(r.budget_min || r.budget_max) && (
                    <span className="flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5" />
                      ₦{Number(r.budget_min ?? 0).toLocaleString()} – ₦{Number(r.budget_max ?? 0).toLocaleString()}
                    </span>
                  )}
                  {r.preferred_start && <span>Start: {r.preferred_start}</span>}
                  {r.agreed_price && <span>Agreed: ₦{Number(r.agreed_price).toLocaleString()} · {r.agreed_timeline}</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {r.conversation_id && (
                  <Button size="sm" variant="outline" onClick={() => { setReplyFor(r); setReply(""); }}>
                    <Send className="w-4 h-4 mr-1.5" />
                    Reply
                  </Button>
                )}
                <Button size="sm" onClick={() => openAssign(r)}
                  disabled={r.status === "completed" || r.status === "cancelled"}>
                  <UserCheck className="w-4 h-4 mr-1.5" />
                  {r.assigned_artisan_id ? "Reassign" : "Assign artisan"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Load more
          </Button>
        </div>
      )}

      {/* Assign dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign artisan</DialogTitle>
            <DialogDescription>
              This creates the job, links it to the request, and notifies both parties.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Artisan</label>
              <Select value={artisanId} onValueChange={setArtisanId}>
                <SelectTrigger><SelectValue placeholder="Select an approved artisan" /></SelectTrigger>
                <SelectContent>
                  {(artisans ?? []).map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.name} — {a.trade}{a.location ? ` (${a.location})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Agreed price (₦)</label>
                <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="150000" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Timeline</label>
                <Input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder="5 days" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Note to customer (optional)</label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                placeholder="We matched you with a verified tiler in Ikeja…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={assign} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reply dialog */}
      <Dialog open={!!replyFor} onOpenChange={(o) => !o && setReplyFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply in customer chat</DialogTitle>
            <DialogDescription>Your message appears in the customer's concierge chat as "Jobman Team".</DialogDescription>
          </DialogHeader>
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={5}
            placeholder="Hi, we've found a verified electrician in your area…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyFor(null)}>Cancel</Button>
            <Button onClick={sendReply} disabled={saving || !reply.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRequests;
