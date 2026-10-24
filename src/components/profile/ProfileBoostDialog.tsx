import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Sparkles, Loader2, Check, Wallet, Gift } from "lucide-react";

const BOOST_OPTIONS = [
  {
    type: "weekly",
    label: "Weekly Boost",
    price: 3000,
    days: 7,
    description: "Featured for 7 days in search results and homepage",
  },
  {
    type: "monthly",
    label: "Monthly Boost",
    price: 10000,
    days: 30,
    description: "30 days of premium visibility + sponsored badge",
    popular: true,
  },
];

type PaymentMethod = "wallet" | "referral";

const ProfileBoostDialog = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("monthly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wallet");
  const queryClient = useQueryClient();

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

  const { data: activeBoost } = useQuery({
    queryKey: ["active-boost", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profile_boosts")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .gte("expires_at", new Date().toISOString())
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const purchaseBoost = useMutation({
    mutationFn: async () => {
      if (!user || !wallet) throw new Error("Missing data");
      const option = BOOST_OPTIONS.find((o) => o.type === selectedType)!;

      const balanceToCheck = paymentMethod === "referral"
        ? Number((wallet as any).referral_balance ?? 0)
        : Number(wallet.balance);
      const balanceLabel = paymentMethod === "referral" ? "referral balance" : "wallet balance";

      if (balanceToCheck < option.price) {
        throw new Error(`Insufficient ${balanceLabel}. You need ₦${option.price.toLocaleString()} but have ₦${balanceToCheck.toLocaleString()}`);
      }

      if (paymentMethod === "referral") {
        // Transfer from referral balance first, then purchase
        const { error: transferErr } = await supabase.rpc("transfer_referral_to_wallet", {
          _amount: option.price,
        });
        if (transferErr) throw transferErr;
      }

      const { error } = await supabase.rpc("purchase_profile_boost", {
        _boost_type: option.type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile boosted! You're now featured in search results.");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["active-boost", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["wallet", user?.id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const walletBalance = Number(wallet?.balance ?? 0);
  const referralBalance = Number((wallet as any)?.referral_balance ?? 0);
  const selectedOption = BOOST_OPTIONS.find((o) => o.type === selectedType)!;

  if (activeBoost) {
    return (
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground">Profile Boosted</p>
          <p className="text-xs text-muted-foreground">
            Active until {new Date(activeBoost.expires_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="w-4 h-4" />
          Boost Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Boost Your Profile
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Get more visibility! Boosted profiles appear at the top of search results with a featured badge.
        </p>

        {/* Boost plan selection */}
        <div className="space-y-3 mt-2">
          {BOOST_OPTIONS.map((option) => (
            <button
              key={option.type}
              onClick={() => setSelectedType(option.type)}
              className={cn(
                "w-full text-left rounded-xl border p-4 transition-all",
                selectedType === option.type
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-foreground">{option.label}</span>
                <div className="flex items-center gap-2">
                  {option.popular && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">Popular</span>
                  )}
                  <span className="font-bold text-foreground">₦{option.price.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>

        {/* Payment method selection */}
        <div className="mt-4">
          <p className="text-sm font-semibold text-foreground mb-2">Payment Method</p>
          <div className="space-y-2">
            <button
              onClick={() => setPaymentMethod("wallet")}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                paymentMethod === "wallet"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <Wallet className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Main Wallet</p>
                <p className="text-xs text-muted-foreground">Balance: ₦{walletBalance.toLocaleString()}</p>
              </div>
              {paymentMethod === "wallet" && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>

            <button
              onClick={() => setPaymentMethod("referral")}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                paymentMethod === "referral"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-muted-foreground/30",
                referralBalance <= 0 && "opacity-50 cursor-not-allowed"
              )}
              disabled={referralBalance <= 0}
            >
              <Gift className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Referral Balance</p>
                <p className="text-xs text-muted-foreground">Balance: ₦{referralBalance.toLocaleString()}</p>
              </div>
              {paymentMethod === "referral" && <Check className="w-4 h-4 text-primary shrink-0" />}
            </button>
          </div>
          {((paymentMethod === "wallet" && walletBalance < selectedOption.price) ||
            (paymentMethod === "referral" && referralBalance < selectedOption.price)) && (
            <p className="text-xs text-muted-foreground mt-2">
              Not enough balance?{" "}
              <Link to="/wallet" className="text-primary font-semibold hover:underline" onClick={() => setOpen(false)}>
                Fund your wallet
              </Link>
            </p>
          )}
        </div>

        <Button
          onClick={() => purchaseBoost.mutate()}
          disabled={purchaseBoost.isPending}
          className="w-full mt-3 bg-gradient-hero text-primary-foreground hover:opacity-90"
        >
          {purchaseBoost.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
          ) : (
            <><Check className="w-4 h-4 mr-2" />Pay ₦{selectedOption.price.toLocaleString()} & Boost</>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileBoostDialog;
