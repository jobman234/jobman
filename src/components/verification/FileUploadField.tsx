import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Upload, X, FileCheck } from "lucide-react";
import { toast } from "sonner";

interface Props {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  maxSizeMB?: number;
  hint?: string;
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

const FileUploadField = ({ label, file, onFileChange, accept = "image/jpeg,image/png", maxSizeMB = 30, hint }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const isVideo = accept.includes("video");
  const acceptedTypes = isVideo ? ACCEPTED_VIDEO_TYPES : ACCEPTED_IMAGE_TYPES;
  const formatLabel = isVideo ? "MP4, MOV, or WebM" : "JPG or PNG";

  const handleFile = (f: File | null) => {
    if (!f) { onFileChange(null); return; }
    if (!acceptedTypes.includes(f.type)) {
      toast.error(`Invalid format. Please upload ${formatLabel} only.`);
      return;
    }
    if (f.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File must be under ${maxSizeMB}MB.`);
      return;
    }
    onFileChange(f);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      <div className="mt-1.5">
        {file ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50">
            <FileCheck className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-foreground truncate block">{file.name}</span>
              <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
            </div>
            <button
              type="button"
              onClick={() => onFileChange(null)}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-colors flex flex-col items-center gap-2"
          >
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Click to upload</span>
            <span className="text-xs text-muted-foreground/70">{formatLabel} · Max {maxSizeMB}MB</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0] ?? null);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </div>
    </div>
  );
};

export default FileUploadField;
