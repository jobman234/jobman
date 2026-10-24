import { Button } from "@/components/ui/button";
import { Check, FileCheck, MapPin, Camera, Loader2 } from "lucide-react";
import type { IdentityData } from "./StepIdentity";
import type { AddressData } from "./StepAddress";
import type { SelfieData } from "./StepSelfie";

interface Props {
  identity: IdentityData;
  address: AddressData;
  selfie: SelfieData;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}

const Section = ({
  icon: Icon,
  title,
  items,
}: {
  icon: React.ElementType;
  title: string;
  items: { label: string; value: string }[];
}) => (
  <div className="space-y-2">
    <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" />
      {title}
    </h3>
    <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between text-sm">
          <span className="text-muted-foreground">{item.label}</span>
          <span className="text-foreground font-medium text-right max-w-[60%] truncate">{item.value}</span>
        </div>
      ))}
    </div>
  </div>
);

const StepReview = ({ identity, address, selfie, onBack, onSubmit, submitting }: Props) => (
  <div className="space-y-5">
    <div>
      <h2 className="font-display text-xl font-bold text-foreground">Review & Submit</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Please review your verification details before submitting.
      </p>
    </div>

    <Section
      icon={FileCheck}
      title="Identity"
      items={[
        { label: "NIN", value: identity.nin.replace(/(\d{3})(\d{4})(\d{4})/, "$1-****-$3") },
        { label: "Date of Birth", value: identity.dateOfBirth },
        { label: "ID Type", value: identity.governmentIdType },
        { label: "ID Front", value: identity.governmentIdFrontFile?.name || "—" },
        { label: "ID Back", value: identity.governmentIdBackFile?.name || "—" },
      ]}
    />

    <Section
      icon={MapPin}
      title="Current Address"
      items={[
        { label: "Street", value: `${address.currentHouse} ${address.currentStreet}`.trim() || "—" },
        { label: "LGA", value: address.currentLga || "—" },
        { label: "State", value: address.currentState || "—" },
        { label: "Landmark", value: address.currentLandmark || "—" },
        { label: "Proof", value: address.proofOfAddressFile?.name || "—" },
      ]}
    />

    <Section
      icon={Camera}
      title="Photos"
      items={[
        { label: "Selfie", value: selfie.selfieFile ? "Captured ✓" : "Missing" },
        { label: "Work Photo", value: selfie.workPhotoFile?.name || "—" },
      ]}
    />

    <div className="bg-accent/10 border border-accent/30 rounded-lg p-4">
      <p className="text-sm text-foreground">
        <strong>By submitting</strong>, you confirm that all information provided is accurate.
        Your profile will be reviewed within 24–48 hours.
      </p>
    </div>

    <div className="flex justify-between pt-2">
      <Button variant="outline" onClick={onBack} disabled={submitting}>Back</Button>
      <Button
        onClick={onSubmit}
        disabled={submitting}
        className="bg-gradient-hero text-primary-foreground hover:opacity-90"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Submit for Verification
          </>
        )}
      </Button>
    </div>
  </div>
);

export default StepReview;
