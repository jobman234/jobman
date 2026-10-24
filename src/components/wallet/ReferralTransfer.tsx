import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gift, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ReferralTransfer = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("id, balance, referral_balance")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const referralBalance = Number((wallet as any)?.referral_balance ?? 0);

  const transfer = useMutation({
    mutationFn: async (transferAmount: number) => {
      const { error } = await supabase.rpc("transfer_referral_to_wallet" as any, {
        _amount: transferAmount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-txns"] });
      queryClient.invalidateQueries({ queryKey: ["referral-wallet"] });
      toast.success("Referral earnings transferred to your wallet!");
      setAmount("");
    },
    onError: (err: any) => toast.error(err.message || "Transfer failed"),
  });

  const handleTransfer = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { toast.error("Enter a valid amount"); return; }
    transfer.mutate(val);
  };

  if (referralBalance <= 0) return null;

  return (
    <div className="bg-primary/5 rounded-xl border border-primary/20 p-5 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">
          Transfer Referral Earnings to Main Wallet
        </p>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Available: <span className="font-bold text-primary">₦{referralBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
      </p>
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="transfer-amount" className="sr-only">Amount</Label>
          <Input
            id="transfer-amount"
            type="number"
            placeholder="Amount (min ₦100)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={100}
            max={referralBalance}
          />
        </div>
        <Button
          onClick={handleTransfer}
          disabled={transfer.isPending || !amount}
          className="shrink-0"
        >
          {transfer.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>Transfer <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>
          )}
        </Button>
      </div>
      <button
        className="text-xs text-primary hover:underline mt-2 block"
        onClick={() => setAmount(String(referralBalance))}
      >
        Transfer all ₦{referralBalance.toLocaleString()}
      </button>
    </div>
  );
};

export default ReferralTransfer;
