import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, Phone, MapPin, Briefcase } from "lucide-react";

export interface ReferencesData {
  ref1Name: string;
  ref1Phone: string;
  ref1Location: string;
  ref1JobType: string;
  ref2Name: string;
  ref2Phone: string;
  ref2Location: string;
  ref2JobType: string;
}

interface Props {
  data: ReferencesData;
  onChange: (data: ReferencesData) => void;
  onNext: () => void;
  onBack: () => void;
}

const RefBlock = ({
  num,
  prefix,
  data,
  onChange,
}: {
  num: number;
  prefix: "ref1" | "ref2";
  data: ReferencesData;
  onChange: (d: ReferencesData) => void;
}) => (
  <div className="space-y-3">
    <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
      <Users className="w-4 h-4 text-primary" />
      Reference {num} {num === 1 ? "*" : "(optional)"}
    </h3>
    <div>
      <Label>Full Name</Label>
      <Input
        placeholder="Referee's full name"
        className="mt-1"
        value={(data as any)[`${prefix}Name`]}
        onChange={(e) => onChange({ ...data, [`${prefix}Name`]: e.target.value })}
      />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label>Phone</Label>
        <div className="relative mt-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="+234..."
            className="pl-10"
            value={(data as any)[`${prefix}Phone`]}
            onChange={(e) => onChange({ ...data, [`${prefix}Phone`]: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Location</Label>
        <div className="relative mt-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="City/Area"
            className="pl-10"
            value={(data as any)[`${prefix}Location`]}
            onChange={(e) => onChange({ ...data, [`${prefix}Location`]: e.target.value })}
          />
        </div>
      </div>
    </div>
    <div>
      <Label>Type of Job Done</Label>
      <div className="relative mt-1">
        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="e.g. Kitchen renovation"
          className="pl-10"
          value={(data as any)[`${prefix}JobType`]}
          onChange={(e) => onChange({ ...data, [`${prefix}JobType`]: e.target.value })}
        />
      </div>
    </div>
  </div>
);

const StepReferences = ({ data, onChange, onNext, onBack }: Props) => {
  const canProceed = data.ref1Name && data.ref1Phone;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">Work References</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Provide at least one reference from a previous client or employer.
        </p>
      </div>

      <RefBlock num={1} prefix="ref1" data={data} onChange={onChange} />

      <div className="border-t border-border pt-4">
        <RefBlock num={2} prefix="ref2" data={data} onChange={onChange} />
      </div>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="bg-gradient-hero text-primary-foreground hover:opacity-90"
        >
          Continue
        </Button>
      </div>
    </div>
  );
};

export default StepReferences;
