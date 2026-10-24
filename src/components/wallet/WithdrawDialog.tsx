import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Building2, Loader2, CheckCircle2 } from "lucide-react";

const RESOLVE_BANK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resolve-bank-account`;
const REQUEST_WITHDRAWAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/request-withdrawal`;

interface Bank {
  name: string;
  code: string;
}

interface WithdrawDialogProps {
  balance: number;
}

const WithdrawDialog = ({ balance }: WithdrawDialogProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authedFetch = async (url: string, body: object) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Please sign in again.");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  };

  useEffect(() => {
    if (!open || banks.length > 0) return;
    setBanksLoading(true);
    authedFetch(RESOLVE_BANK_URL, { action: "list_banks" })
      .then((data) => setBanks(data.banks ?? []))
      .catch((err) => toast.error(err.message || "Could not load bank list."))
      .finally(() => setBanksLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Re-verify whenever the account number or bank changes.
  useEffect(() => {
    setAccountName("");
    if (!/^\d{10}$/.test(accountNumber) || !bankCode) return;
    setVerifying(true);
    const timeout = setTimeout(() => {
      authedFetch(RESOLVE_BANK_URL, { action: "resolve", account_number: accountNumber, bank_code: bankCode })
        .then((data) => setAccountName(data.account_name))
        .catch((err) => toast.error(err.message || "Could not verify this account."))
        .finally(() => setVerifying(false));
    }, 500);
    return () => clearTimeout(timeout);
  }, [accountNumber, bankCode]);

  const submit = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 500) {
      toast.error("Enter an amount of at least ₦500");
      return;
    }
    if (value > balance) {
      toast.error("Amount exceeds your available balance.");
      return;
    }
    if (!accountName) {
      toast.error("Verify a bank account first.");
      return;
    }

    setSubmitting(true);
    try {
      const bank = banks.find((b) => b.code === bankCode);
      await authedFetch(REQUEST_WITHDRAWAL_URL, {
        amount: value,
        bank_code: bankCode,
        bank_name: bank?.name,
        account_number: accountNumber,
      });
      toast.success("Withdrawal requested — funds are reserved and pending admin payout.");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-txns"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawal-requests"] });
      setOpen(false);
      setAmount("");
      setAccountNumber("");
      setAccountName("");
      setBankCode("");
    } catch (err: any) {
      toast.error(err.message || "Could not submit withdrawal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="secondary"
          className="bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground border-0"
        >
          <Building2 className="w-4 h-4 mr-1.5" />
          Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Withdraw to Bank Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Bank</Label>
            <Select value={bankCode} onValueChange={setBankCode}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder={banksLoading ? "Loading banks..." : "Select your bank"} />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="account-number">Account Number</Label>
            <Input
              id="account-number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit NUBAN"
              inputMode="numeric"
              maxLength={10}
              className="mt-1.5"
            />
            {verifying && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Verifying account...
              </p>
            )}
            {accountName && !verifying && (
              <p className="text-xs text-primary mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {accountName}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="withdraw-amount">Amount (₦)</Label>
            <Input
              id="withdraw-amount"
              type="number"
              min={500}
              max={balance}
              placeholder="e.g. 20000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available: ₦{balance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </p>
          </div>
          <Button
            onClick={submit}
            disabled={submitting || !accountName || !amount}
            className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
            ) : (
              <>Request Withdrawal</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            The amount is reserved immediately and paid out by an admin after a quick review.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawDialog;
