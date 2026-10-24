import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";

const FUND_WALLET_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fund-wallet`;
const QUICK_AMOUNTS = [5000, 20000, 50000, 100000];

const FundWalletDialog = () => {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const startPayment = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 100) {
      toast.error("Enter an amount of at least ₦100");
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Please sign in again.");

      const res = await fetch(FUND_WALLET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "initialize", amount: value, origin: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment.");

      // Full-page redirect to Paystack's hosted checkout; the user returns to
      // /wallet?reference=... where WalletPage verifies and credits the wallet.
      window.location.href = data.authorization_url;
    } catch (err: any) {
      toast.error(err.message || "Could not start payment.");
      setLoading(false);
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
          <CreditCard className="w-4 h-4 mr-1.5" />
          Fund Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Fund Your Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="fund-amount">Amount (₦)</Label>
            <Input
              id="fund-amount"
              type="number"
              min={100}
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(String(v))}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
              >
                ₦{v.toLocaleString()}
              </button>
            ))}
          </div>
          <Button
            onClick={startPayment}
            disabled={loading || !amount}
            className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting to Paystack...</>
            ) : (
              <>Continue to Payment</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            You'll be redirected to Paystack's secure checkout to complete payment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FundWalletDialog;
