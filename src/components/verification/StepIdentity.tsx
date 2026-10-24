import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Fingerprint, CreditCard, Upload } from "lucide-react";
import FileUploadField from "./FileUploadField";

const ID_TYPES = [
  { value: "National ID Card (NIN Slip)", hint: "Upload the front of your NIN slip. No back needed." },
  { value: "International Passport", hint: "Upload the bio-data page of your passport. No back needed." },
  { value: "Driver's License", hint: "Upload clear photos of both the front and back of your license." },
  { value: "Voter's Card", hint: "Upload clear photos of both the front and back of your card." },
];

export interface IdentityData {
  nin: string;
  dateOfBirth: string;
  governmentIdType: string;
  governmentIdFrontFile: File | null;
  governmentIdBackFile: File | null;
}

interface Props {
  data: IdentityData;
  onChange: (data: IdentityData) => void;
  onNext: () => void;
}

const StepIdentity = ({ data, onChange, onNext }: Props) => {
  const canProceed =
    data.nin.length === 11 &&
    data.dateOfBirth &&
    data.governmentIdType &&
    data.governmentIdFrontFile;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">Identity Verification</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Provide your NIN and government-issued ID for identity verification.
        </p>
      </div>

      <div>
        <Label htmlFor="nin">National Identification Number (NIN) *</Label>
        <div className="relative mt-1.5">
          <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="nin"
            placeholder="12345678901"
            maxLength={11}
            value={data.nin}
            onChange={(e) => onChange({ ...data, nin: e.target.value.replace(/\D/g, "") })}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">11-digit NIN number</p>
      </div>

      <div>
        <Label htmlFor="dob">Date of Birth *</Label>
        <Input
          id="dob"
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => onChange({ ...data, dateOfBirth: e.target.value })}
          className="mt-1.5"
          max={new Date().toISOString().split("T")[0]}
        />
      </div>

      <div>
        <Label>Government ID Type *</Label>
        <Select
          value={data.governmentIdType}
          onValueChange={(v) => onChange({ ...data, governmentIdType: v })}
        >
          <SelectTrigger className="mt-1.5">
            <CreditCard className="w-4 h-4 text-muted-foreground mr-2" />
            <SelectValue placeholder="Select ID type" />
          </SelectTrigger>
          <SelectContent>
            {ID_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.value}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data.governmentIdType && (
          <p className="text-xs text-muted-foreground mt-1.5">
            💡 {ID_TYPES.find((t) => t.value === data.governmentIdType)?.hint}
          </p>
        )}
      </div>

      <FileUploadField
        label="Front of Government ID *"
        file={data.governmentIdFrontFile}
        onFileChange={(f) => onChange({ ...data, governmentIdFrontFile: f })}
        accept="image/*"
      />

      {data.governmentIdType !== "National ID Card (NIN Slip)" &&
        data.governmentIdType !== "International Passport" && (
        <FileUploadField
          label="Back of Government ID"
          file={data.governmentIdBackFile}
          onFileChange={(f) => onChange({ ...data, governmentIdBackFile: f })}
          accept="image/*"
        />
      )}

      <div className="flex justify-end pt-2">
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

export default StepIdentity;
