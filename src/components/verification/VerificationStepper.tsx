import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Identity", short: "NIN & ID" },
  { label: "Address", short: "Address" },
  { label: "Selfie", short: "Photo" },
  { label: "Review", short: "Submit" },
];

interface Props {
  currentStep: number;
}

const VerificationStepper = ({ currentStep }: Props) => (
  <div className="flex items-center justify-between w-full max-w-xl mx-auto mb-8">
    {STEPS.map((step, i) => {
      const done = i < currentStep;
      const active = i === currentStep;
      return (
        <div key={step.label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                done && "bg-primary text-primary-foreground",
                active && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium hidden sm:block",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            <span
              className={cn(
                "text-xs font-medium sm:hidden",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step.short}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "flex-1 h-0.5 mx-2 rounded-full transition-colors",
                i < currentStep ? "bg-primary" : "bg-border"
              )}
            />
          )}
        </div>
      );
    })}
  </div>
);

export default VerificationStepper;
