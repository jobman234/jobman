import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import FileUploadField from "./FileUploadField";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
];

export interface AddressData {
  currentHouse: string;
  currentStreet: string;
  currentLga: string;
  currentState: string;
  currentLandmark: string;
  previousHouse: string;
  previousStreet: string;
  previousLga: string;
  previousState: string;
  previousLandmark: string;
  proofOfAddressFile: File | null;
}

interface Props {
  data: AddressData;
  onChange: (data: AddressData) => void;
  onNext: () => void;
  onBack: () => void;
}

const AddressField = ({
  prefix,
  title,
  data,
  onChange,
}: {
  prefix: "current" | "previous";
  title: string;
  data: AddressData;
  onChange: (data: AddressData) => void;
}) => (
  <div className="space-y-3">
    <h3 className="font-display font-semibold text-foreground text-sm flex items-center gap-2">
      <MapPin className="w-4 h-4 text-primary" />
      {title}
    </h3>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label>House No.</Label>
        <Input
          placeholder="e.g. 12"
          className="mt-1"
          value={(data as any)[`${prefix}House`]}
          onChange={(e) => onChange({ ...data, [`${prefix}House`]: e.target.value })}
        />
      </div>
      <div>
        <Label>Street</Label>
        <Input
          placeholder="e.g. Adeola Odeku St"
          className="mt-1"
          value={(data as any)[`${prefix}Street`]}
          onChange={(e) => onChange({ ...data, [`${prefix}Street`]: e.target.value })}
        />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label>LGA</Label>
        <Input
          placeholder="Local govt area"
          className="mt-1"
          value={(data as any)[`${prefix}Lga`]}
          onChange={(e) => onChange({ ...data, [`${prefix}Lga`]: e.target.value })}
        />
      </div>
      <div>
        <Label>State</Label>
        <Select
          value={(data as any)[`${prefix}State`]}
          onValueChange={(v) => onChange({ ...data, [`${prefix}State`]: v })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {NIGERIAN_STATES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    <div>
      <Label>Nearest Landmark</Label>
      <Input
        placeholder="e.g. Near Shoprite Mall"
        className="mt-1"
        value={(data as any)[`${prefix}Landmark`]}
        onChange={(e) => onChange({ ...data, [`${prefix}Landmark`]: e.target.value })}
      />
    </div>
  </div>
);

const StepAddress = ({ data, onChange, onNext, onBack }: Props) => {
  const canProceed =
    data.currentStreet && data.currentLga && data.currentState;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">Address Details</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Current and previous addresses for background verification.
        </p>
      </div>

      <AddressField prefix="current" title="Current Address *" data={data} onChange={onChange} />

      <div className="border-t border-border pt-4">
        <AddressField prefix="previous" title="Previous Address (optional)" data={data} onChange={onChange} />
      </div>

      <FileUploadField
        label="Proof of Address (utility bill, bank statement)"
        file={data.proofOfAddressFile}
        onFileChange={(f) => onChange({ ...data, proofOfAddressFile: f })}
        accept="image/*,.pdf"
      />

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

export default StepAddress;
