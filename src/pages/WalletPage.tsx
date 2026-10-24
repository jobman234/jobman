import { useEffect, useRef, useState } from "react";
import { Navigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Loader2, Wallet, ArrowUpRight, ArrowDownLeft, Lock, ArrowLeft,
  Clock, CheckCircle2, XCircle, AlertCircle, Gift, Download,
} from "lucide-react";
import { format } from "date-fns";
import ReferralTransfer from "@/components/wallet/ReferralTransfer";
import FundWalletDialog from "@/components/wallet/FundWalletDialog";
import WithdrawDialog from "@/components/wallet/WithdrawDialog";
import { toast } from "sonner";

const FUND_WALLET_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fund-wallet`;

const TXN_ICONS = {
  credit: ArrowDownLeft,
  debit: ArrowUpRight,
};

const ESCROW_STATUS = {
  held: { label: "Held in Escrow", icon: Lock, color: "text-warning", bg: "bg-warning/10" },
  released: { label: "Released", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
  refunded: { label: "Refunded", icon: ArrowDownLeft, color: "text-info", bg: "bg-info/10" },
  disputed: { label: "Disputed", icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

const WITHDRAWAL_STATUS = {
  pending: { label: "Pending Review", icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  awaiting_otp: { label: "Processing", icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  paid: { label: "Paid", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
  rejected: { label: "Rejected — Refunded", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  failed: { label: "Failed — Refunded", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
};

const TXN_TYPE_FILTERS = [
  { key: "all", label: "All" },
  { key: "credit", label: "Credits" },
  { key: "debit", label: "Debits" },
] as const;

const DATE_RANGE_FILTERS = [
  { key: "all", label: "All time" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
] as const;

type TxnTypeFilter = (typeof TXN_TYPE_FILTERS)[number]["key"];
type DateRangeFilter = (typeof DATE_RANGE_FILTERS)[number]["key"];

const DATE_RANGE_DAYS: Record<Exclude<DateRangeFilter, "all">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

// Escapes a value for a single CSV field: wraps in quotes if it contains a
// comma, quote, or newline (doubling any embedded quotes), and neutralizes
// formula injection by prefixing a leading apostrophe if the value starts
// with =, +, -, or @ (what Excel/Sheets treat as the start of a formula).
// None of today's transaction fields are free user text, but this costs
// nothing and protects against that changing later without anyone revisiting
// the export code.
const csvField = (value: string | number) => {
  let str = String(value);
  if (/^[=+\-@]/.test(str)) str = `'${str}`;
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const WalletPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const verifiedRef = useRef<string | null>(null);
  const [txnType, setTxnType] = useState<TxnTypeFilter>("all");
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");

  // Returning from Paystack's hosted checkout: verify the payment server-side
  // and credit the wallet. Guarded so it only ever runs once per reference,
  // even under React StrictMode's double-invoke in dev.
  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference || !user || verifiedRef.current === reference) return;
    verifiedRef.current = reference;
    setVerifying(true);

    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch(FUND_WALLET_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action: "verify", reference }),
        });
        const data = await res.json();
        if (res.ok && data.status === "success") {
          toast.success(data.alreadyApplied ? "Payment already credited." : "Wallet funded successfully!");
          queryClient.invalidateQueries({ queryKey: ["wallet"] });
          queryClient.invalidateQueries({ queryKey: ["wallet-txns"] });
        } else {
          toast.error(data.message || data.error || "Payment could not be verified.");
        }
      } catch {
        toast.error("Could not verify payment. If you were charged, contact support.");
      } finally {
        setVerifying(false);
        searchParams.delete("reference");
        setSearchParams(searchParams, { replace: true });
      }
    })();
  }, [searchParams, user, queryClient, setSearchParams]);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: referralStats } = useQuery({
    queryKey: ["referral-stats", user?.id],
    queryFn: async () => {
      const { data: events } = await supabase
        .from("referral_events" as any)
        .select("reward_amount")
        .eq("referrer_id", user!.id);
      return { count: events?.length ?? 0 };
    },
    enabled: !!user,
  });

  const { data: transactions, isLoading: txnsLoading } = useQuery({
    queryKey: ["wallet-txns", wallet?.id, txnType, dateRange],
    queryFn: async () => {
      let query = supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", wallet!.id);

      if (txnType !== "all") {
        query = query.eq("type", txnType);
      }
      if (dateRange !== "all") {
        const since = new Date();
        since.setDate(since.getDate() - DATE_RANGE_DAYS[dateRange]);
        query = query.gte("created_at", since.toISOString());
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!wallet?.id,
  });

  const exportCsv = () => {
    if (!transactions?.length) return;
    const header = ["Date", "Type", "Description", "Reference", "Status", "Amount (NGN)"];
    const rows = transactions.map((t) => [
      format(new Date(t.created_at), "yyyy-MM-dd HH:mm"),
      t.type,
      t.description || "",
      t.reference || "",
      t.status,
      Number(t.amount).toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvField).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jobman-wallet-transactions-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const { data: escrows } = useQuery({
    queryKey: ["escrows", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escrows")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: withdrawalRequests } = useQuery({
    queryKey: ["withdrawal-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (authLoading || walletLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const balance = Number(wallet?.balance ?? 0);
  const referralBalance = Number((wallet as any)?.referral_balance ?? 0);
  const heldInEscrow = escrows
    ?.filter((e) => e.status === "held")
    .reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="font-display text-3xl font-bold text-foreground mb-8">Wallet</h1>

          {/* Balance cards */}
          <div className="grid grid-cols-1 gap-4 mb-8 sm:grid-cols-3">
            <div className="bg-gradient-hero rounded-2xl p-5 sm:p-6 text-primary-foreground sm:col-span-2">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-5 h-5 opacity-80" />
                <span className="text-sm opacity-80">Available Balance</span>
              </div>
              <p className="font-display text-2xl sm:text-3xl font-bold">₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</p>
              <div className="flex gap-3 mt-5">
                <FundWalletDialog />
                <WithdrawDialog balance={balance} />
              </div>
              {verifying && (
                <p className="text-xs opacity-80 mt-2 flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Verifying your payment...
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="bg-card rounded-2xl border border-border p-4 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-warning" />
                  <span className="text-sm text-muted-foreground">Pending Payment</span>
                </div>
                <p className="font-display text-xl font-bold text-foreground">
                  ₦{heldInEscrow.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {escrows?.filter((e) => e.status === "held").length ?? 0} pending
                </p>
              </div>
              <div className="bg-card rounded-2xl border border-border p-4 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Referral Earnings</span>
                </div>
                <p className="font-display text-xl font-bold text-foreground">
                  ₦{referralBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {referralStats?.count ?? 0} referral(s)
                </p>
              </div>
            </div>
          </div>

          {/* Referral transfer */}
          <ReferralTransfer />

          {/* Escrows section */}
          {escrows && escrows.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display font-semibold text-lg text-foreground mb-4">Pending Payments</h2>
              <div className="space-y-3">
                {escrows.map((escrow) => {
                  const cfg = ESCROW_STATUS[escrow.status as keyof typeof ESCROW_STATUS] || ESCROW_STATUS.held;
                  const Icon = cfg.icon;
                  const isPayer = escrow.payer_id === user.id;
                  return (
                    <div
                      key={escrow.id}
                      className="bg-card rounded-xl border border-border p-4 flex items-center gap-4"
                    >
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", cfg.bg)}>
                        <Icon className={cn("w-5 h-5", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            ₦{Number(escrow.amount).toLocaleString()}
                          </p>
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isPayer ? "You funded" : "You're receiving"} · {format(new Date(escrow.created_at), "dd MMM yyyy")}
                        </p>
                      </div>
                      <Link to={`/jobs/${escrow.job_id}`} className="text-xs text-primary hover:underline shrink-0">
                        View Job
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Withdrawal requests */}
          {withdrawalRequests && withdrawalRequests.length > 0 && (
            <div className="mb-8">
              <h2 className="font-display font-semibold text-lg text-foreground mb-4">Withdrawal Requests</h2>
              <div className="space-y-3">
                {withdrawalRequests.map((wr) => {
                  const cfg = WITHDRAWAL_STATUS[wr.status as keyof typeof WITHDRAWAL_STATUS] || WITHDRAWAL_STATUS.pending;
                  const Icon = cfg.icon;
                  return (
                    <div key={wr.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", cfg.bg)}>
                        <Icon className={cn("w-5 h-5", cfg.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            ₦{Number(wr.amount).toLocaleString()}
                          </p>
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.bg, cfg.color)}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {wr.bank_name || wr.bank_code} · {wr.account_name} · {format(new Date(wr.created_at), "dd MMM yyyy")}
                        </p>
                        {wr.admin_note && (wr.status === "rejected" || wr.status === "failed") && (
                          <p className="text-xs text-destructive mt-0.5">{wr.admin_note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transactions */}
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <h2 className="font-display font-semibold text-lg text-foreground">Transaction History</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                disabled={!transactions?.length}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="flex gap-1.5 flex-wrap">
                {TXN_TYPE_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setTxnType(f.key)}
                    className={cn(
                      "text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
                      txnType === f.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap sm:ml-auto">
                {DATE_RANGE_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setDateRange(f.key)}
                    className={cn(
                      "text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
                      dateRange === f.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {txnsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !transactions?.length ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {txnType !== "all" || dateRange !== "all" ? "No transactions match these filters" : "No transactions yet"}
                </p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border divide-y divide-border">
                {transactions.map((txn) => {
                  const isCredit = txn.type === "credit";
                  const Icon = TXN_ICONS[txn.type as keyof typeof TXN_ICONS] || Clock;
                  return (
                    <div key={txn.id} className="flex items-center gap-4 p-4">
                      <div className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                        isCredit ? "bg-primary/10" : "bg-destructive/10"
                      )}>
                        <Icon className={cn("w-4 h-4", isCredit ? "text-primary" : "text-destructive")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{txn.description || (isCredit ? "Credit" : "Debit")}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(txn.created_at), "dd MMM yyyy, HH:mm")}</p>
                      </div>
                      <p className={cn("text-sm font-semibold", isCredit ? "text-primary" : "text-foreground")}>
                        {isCredit ? "+" : "−"}₦{Number(txn.amount).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default WalletPage;
