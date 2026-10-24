import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Upload, X } from "lucide-react";
import { uploadToPrivateBucket } from "@/lib/storage";

const DISPUTE_CATEGORIES = [
  "Poor quality work",
  "Incomplete work",
  "Artisan didn't show up",
  "Customer refused payment",
  "Scope disagreement",
  "Damage to property",
  "Safety concern",
  "Fraud / scam",
  "Other",
];

interface DisputeDialogProps {
  jobId: string;
  escrowId: string;
  raisedBy: string;
  raisedAgainst: string;
}

const DisputeDialog = ({ jobId, escrowId, raisedBy, raisedAgainst }: DisputeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const raiseDispute = useMutation({
    mutationFn: async () => {
      if (!category || !description.trim()) throw new Error("Please fill all required fields");

      setUploading(true);
      // Upload evidence files
      const evidenceUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop();
        const path = `${raisedBy}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const url = await uploadToPrivateBucket("dispute-evidence", path, file);
        if (!url) throw new Error(`Could not upload ${file.name}`);
        evidenceUrls.push(url);
      }
      setUploading(false);

      const { error } = await supabase.rpc("raise_dispute" as any, {
        _job_id: jobId,
        _escrow_id: escrowId,
        _raised_by: raisedBy,
        _raised_against: raisedAgainst,
        _category: category,
        _description: description.trim(),
        _evidence_urls: evidenceUrls,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dispute raised. Escrow has been frozen and admin notified.");
      setOpen(false);
      setCategory("");
      setDescription("");
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ["job", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job-escrow", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job-dispute", jobId] });
    },
    onError: (err: any) => {
      setUploading(false);
      toast.error(err.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles].slice(0, 10));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          Raise Dispute
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Raise a Dispute
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will freeze the escrow funds until an admin resolves the dispute.
        </p>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Issue Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {DISPUTE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Describe the Issue *</Label>
            <Textarea
              placeholder="Explain what went wrong in detail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-[100px]"
              maxLength={2000}
            />
          </div>
          <div>
            <Label>Upload Evidence (images, videos, screenshots)</Label>
            <div className="mt-1">
              <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload files (max 10)</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-xs">
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={() => raiseDispute.mutate()}
            disabled={!category || !description.trim() || raiseDispute.isPending || uploading}
            variant="destructive"
            className="w-full"
          >
            {raiseDispute.isPending || uploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{uploading ? "Uploading evidence..." : "Submitting..."}</>
            ) : (
              <><AlertTriangle className="w-4 h-4 mr-2" />Submit Dispute</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DisputeDialog;
