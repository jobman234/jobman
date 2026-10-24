import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2, AlertTriangle, CheckCircle2, XCircle, Scale,
  ExternalLink, Image as ImageIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Open", color: "text-warning" },
  under_review: { label: "Under Review", color: "text-info" },
  resolved_artisan: { label: "Resolved (Artisan)", color: "text-primary" },
  resolved_customer: { label: "Resolved (Customer)", color: "text-primary" },
  resolved_split: { label: "Resolved (Split)", color: "text-primary" },
  closed: { label: "Closed", color: "text-muted-foreground" },
};

const PAGE_SIZE = 20;

const AdminDisputes = () => {
  const queryClient = useQueryClient();
  const [selectedDispute, setSelectedDispute] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [resolution, setResolution] = useState("");
  const [artisanAmount, setArtisanAmount] = useState("");
  const [customerAmount, setCustomerAmount] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: disputesPage, isLoading } = useQuery({
    queryKey: ["admin-disputes", limit],
    queryFn: async () => {
      // Fetch one extra row to know whether a "Load more" is warranted.
      const { data, error } = await supabase
        .from("disputes" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .range(0, limit);
      if (error) throw error;
      return data as any[];
    },
  });

  const hasMore = (disputesPage?.length ?? 0) > limit;
  const disputes = disputesPage?.slice(0, limit);

  const { data: disputeProfiles } = useQuery({
    queryKey: ["admin-dispute-profiles"],
    queryFn: async () => {
      if (!disputes?.length) return {};
      const ids = [
        ...new Set(disputes.flatMap((d) => [d.raised_by, d.raised_against])),
      ];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      data?.forEach((p) => { map[p.user_id] = p.full_name; });
      return map;
    },
    enabled: !!disputes?.length,
  });

  const { data: escrowAmounts } = useQuery({
    queryKey: ["admin-dispute-escrows", disputes?.map((d) => d.escrow_id).join(",")],
    queryFn: async () => {
      const ids = [...new Set(disputes!.map((d) => d.escrow_id))];
      const { data } = await supabase.from("escrows").select("id, amount").in("id", ids);
      const map: Record<string, number> = {};
      data?.forEach((e) => { map[e.id] = Number(e.amount); });
      return map;
    },
    enabled: !!disputes?.length,
  });

  const resolveDispute = useMutation({
    mutationFn: async () => {
      if (!selectedDispute || !resolution) throw new Error("Select a resolution");

      const { error } = await supabase.rpc("admin_resolve_dispute", {
        _dispute_id: selectedDispute,
        _resolution: resolution,
        _admin_notes: adminNotes.trim() || null,
        _artisan_amount: resolution === "resolved_split" ? Number(artisanAmount) : null,
        _customer_amount: resolution === "resolved_split" ? Number(customerAmount) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dispute resolved");
      setSelectedDispute(null);
      setAdminNotes("");
      setResolution("");
      setArtisanAmount("");
      setCustomerAmount("");
      queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!disputes?.length) {
    return (
      <div className="text-center py-12">
        <Scale className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No disputes yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {disputes.map((dispute) => {
        const statusInfo = STATUS_LABELS[dispute.status] || STATUS_LABELS.open;
        const isSelected = selectedDispute === dispute.id;
        const isPending = dispute.status === "open" || dispute.status === "under_review";

        return (
          <div key={dispute.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="font-semibold text-sm text-foreground">{dispute.category}</span>
                  <span className={cn("text-xs font-semibold", statusInfo.color)}>
                    • {statusInfo.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Raised by {disputeProfiles?.[dispute.raised_by] || "User"} against {disputeProfiles?.[dispute.raised_against] || "User"}
                  {" · "}
                  {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <p className="text-sm text-foreground mb-3">{dispute.description}</p>

            {/* Evidence */}
            {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Evidence ({dispute.evidence_urls.length} files)
                </p>
                <div className="flex gap-2 overflow-x-auto">
                  {dispute.evidence_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                      className="w-20 h-16 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0 hover:border-primary transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Admin notes if resolved */}
            {dispute.admin_notes && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Admin Notes</p>
                <p className="text-foreground">{dispute.admin_notes}</p>
              </div>
            )}

            {/* Resolution form */}
            {isPending && (
              <div>
                {isSelected ? (
                  <div className="border-t border-border pt-4 mt-3 space-y-3">
                    <div>
                      <Label>Resolution *</Label>
                      <Select value={resolution} onValueChange={setResolution}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Choose resolution" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resolved_artisan">Release funds to artisan</SelectItem>
                          <SelectItem value="resolved_customer">Refund customer</SelectItem>
                          <SelectItem value="resolved_split">Partial split</SelectItem>
                          <SelectItem value="closed">Close without action</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {resolution === "resolved_split" && (() => {
                      const escrowTotal = escrowAmounts?.[dispute.escrow_id] ?? 0;
                      const sum = (Number(artisanAmount) || 0) + (Number(customerAmount) || 0);
                      const mismatch = artisanAmount !== "" && customerAmount !== "" && Math.abs(sum - escrowTotal) > 0.01;
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>To Artisan (₦)</Label>
                            <Input type="number" min={0} value={artisanAmount}
                              onChange={(e) => setArtisanAmount(e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label>To Customer (₦)</Label>
                            <Input type="number" min={0} value={customerAmount}
                              onChange={(e) => setCustomerAmount(e.target.value)} className="mt-1" />
                          </div>
                          <p className={cn("col-span-2 text-xs", mismatch ? "text-destructive" : "text-muted-foreground")}>
                            Must add up to the escrowed total: ₦{escrowTotal.toLocaleString()}
                          </p>
                        </div>
                      );
                    })()}
                    <div>
                      <Label>Admin Notes</Label>
                      <Textarea
                        placeholder="Explain your decision..."
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => resolveDispute.mutate()}
                        disabled={
                          !resolution ||
                          resolveDispute.isPending ||
                          (resolution === "resolved_split" &&
                            Math.abs((Number(artisanAmount) || 0) + (Number(customerAmount) || 0) - (escrowAmounts?.[dispute.escrow_id] ?? 0)) > 0.01)
                        }
                        className="bg-gradient-hero text-primary-foreground hover:opacity-90"
                        size="sm"
                      >
                        {resolveDispute.isPending ? (
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                        )}
                        Confirm Resolution
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedDispute(null)}>
                        <XCircle className="w-4 h-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDispute(dispute.id)}
                  >
                    <Scale className="w-3.5 h-3.5 mr-1" />
                    Review & Resolve
                  </Button>
                )}
              </div>
            )}
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
    </div>
  );
};

export default AdminDisputes;
