import { Sparkles, TrendingUp, Eye, Search, BadgeCheck } from "lucide-react";
import ProfileBoostDialog from "./ProfileBoostDialog";

const BENEFITS = [
  { icon: Search, text: "Appear first in search results" },
  { icon: Eye, text: "Featured on the homepage carousel" },
  { icon: BadgeCheck, text: "Get a 'Featured' badge on your profile" },
  { icon: TrendingUp, text: "Up to 5x more profile views" },
];

const BoostInfoCard = () => {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <h2 className="font-display font-semibold text-lg text-foreground">Promote Your Profile</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Stand out from the crowd! Boost your profile to get more job offers and visibility.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
        {BENEFITS.map((benefit, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-foreground">
            <benefit.icon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{benefit.text}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
        <span className="px-2 py-1 rounded-full bg-muted font-semibold">₦3,000/week</span>
        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold">₦10,000/month</span>
      </div>
      <ProfileBoostDialog />
    </div>
  );
};

export default BoostInfoCard;
