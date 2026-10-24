import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Loader2, Banknote, Landmark, ShieldQuestion, XCircle } from "lucide-react";

const PROCESS_WITHDRAWAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-withdrawal`;

const STATUS_FILTER = [
  { value: "pending", label: "Pending" },
  { value: "awaiting_otp", label: "Awaiting OTP" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
  { value: "all", label: "All" },
];

const PAGE_SIZE = 20;

const AdminWithdrawals = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [otpFor, setOtpFor] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const changeFilter = (value: string) => {
    setFilter(value);
    setLimit(PAGE_SIZE);
  };

  const { data: requestsPage, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", filter, limit],
    queryFn: async () => {
      let query = supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .range(0, limit);
      if (filter !== "all") query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const hasMore = (requestsPage?.length ?? 0) > limit;
  const requests = requestsPage?.slice(0, limit);

  const { data: profiles } = useQuery({
    queryKey: ["admin-withdrawal-requesters", requests?.map((r) => r.user_id).join(",")],
    enabled: !!requests?.length,
    queryFn: async () => {
      const ids = [...new Set(requests!.map((r) => r.user_id))];
      const { data } = await supabase.from("public_profiles").select("user_id, full_name").in("user_id", ids);
      return Object.fromEntries((data ?? []).map((p) => [p.user_id, p.full_name]));
    },
  });

  const authedFetch = async (body: object) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch(PROCESS_WITHDRAWAL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  };

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });

  const process = async (id: string) => {
    setProcessingId(id);
    try {
      const data = await authedFetch({ request_id: id, action: "initiate" });
      if (data.needsOtp) {
        toast.info("Paystack requires an OTP to finalize this transfer — check the business's registered phone/email.");
        setOtpFor(id);
      } else if (data.status === "paid") {
        toast.success("Transfer sent — marked as paid.");
      }
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Could not process this withdrawal.");
    } finally {
      setProcessingId(null);
    }
  };

  const finalizeOtp = async (id: string) => {
    if (!otp.trim()) { toast.error("Enter the OTP"); return; }
    setProcessingId(id);
    try {
      await authedFetch({ request_id: id, action: "finalize_otp", otp: otp.trim() });
      toast.success("Transfer finalized — marked as paid.");
      setOtpFor(null);
      setOtp("");
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Could not finalize transfer.");
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (id: string) => {
    if (!rejectNote.trim()) { toast.error("Provide a reason — it's shown to the user."); return; }
    setProcessingId(id);
    try {
      await authedFetch({ request_id: id, action: "reject", note: rejectNote.trim() });
      toast.success("Rejected and refunded to the user's wallet.");
      setRejectingId(null);
      setRejectNote("");
      refresh();
    } catch (err: any) {
      toast.error(err.message || "Could not reject this withdrawal.");
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTER.map((f) => (
          <button
            key={f.value}
            onClick={() => changeFilter(f.value)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              filter === f.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!requests?.length ? (
        <div className="text-center py-12 bg-card rounded-2xl border border-border">
          <Banknote className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No withdrawal requests matching this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="bg-card rounded-xl border border-border p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display font-semibold text-foreground">
                    ₦{Number(r.amount).toLocaleString()}
                    <span className="ml-2 text-xs font-medium text-muted-foreground">{profiles?.[r.user_id] ?? "User"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <Landmark className="w-3.5 h-3.5" /> {r.account_name} · {r.account_number} · {r.bank_name || r.bank_code}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Requested {format(new Date(r.created_at), "dd MMM yyyy, HH:mm")}
                  </p>
                  {r.admin_note && <p className="text-xs text-destructive mt-1">{r.admin_note}</p>}
                </div>

                {(r.status === "pending" || r.status === "awaiting_otp") && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => process(r.id)} disabled={processingId === r.id}>
                      {processingId === r.id ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Banknote className="w-4 h-4 mr-1.5" />}
                      {r.status === "awaiting_otp" ? "Retry" : "Process"}
                    </Button>
                    <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => setRejectingId(rejectingId === r.id ? null : r.id)}>
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              {otpFor === r.id && (
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                  <ShieldQuestion className="w-4 h-4 text-warning shrink-0" />
                  <Input
                    placeholder="Enter OTP sent to the business's phone/email"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button size="sm" onClick={() => finalizeOtp(r.id)} disabled={processingId === r.id}>
                    {processingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Finalize"}
                  </Button>
                </div>
              )}

              {rejectingId === r.id && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <Textarea
                    placeholder="Reason for rejection (shown to the user)..."
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    className="min-h-[70px]"
                  />
                  <Button size="sm" variant="destructive" onClick={() => reject(r.id)} disabled={processingId === r.id}>
                    {processingId === r.id ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                    Confirm Reject & Refund
                  </Button>
                </div>
              )}
            </div>
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawals;
