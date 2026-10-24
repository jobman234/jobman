import { useRef, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Smile, Eye, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import FileUploadField from "./FileUploadField";

const GESTURES = [
  { icon: Smile, label: "Smile naturally at the camera" },
  { icon: Eye, label: "Blink your eyes twice" },
  { icon: ArrowLeftRight, label: "Slowly turn your head left, then right" },
] as const;


export interface SelfieData {
  selfieFile: File | null;
  workPhotoFile: File | null;
  shortVideoFile: File | null;
}

interface Props {
  data: SelfieData;
  onChange: (data: SelfieData) => void;
  onNext: () => void;
  onBack: () => void;
}

const StepSelfie = ({ data, onChange, onNext, onBack }: Props) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const [gestureIndex, setGestureIndex] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch { /* noop */ }
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
    setCountdown(null);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setGestureIndex(0);
    setCountdown(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Your browser doesn't support camera access. Please use the upload option below.");
      setFallbackMode(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      // Flip streaming first so the <video> element mounts, then attach in the effect below.
      setStreaming(true);
    } catch (err: any) {
      const name = err?.name ?? "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraError("Camera access denied. Please allow camera permission in your browser settings, or upload a selfie photo instead.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraError("No camera found on this device. Please upload a selfie photo instead.");
      } else if (name === "NotReadableError") {
        setCameraError("Camera is already in use by another app. Close it and try again, or upload a selfie photo instead.");
      } else {
        setCameraError("Couldn't open the camera. Please upload a selfie photo instead.");
      }
      setFallbackMode(true);
    }
  }, []);

  // Attach the MediaStream once the <video> element is mounted.
  useEffect(() => {
    if (!streaming) return;
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) return;
    video.srcObject = stream;
    video.play().catch(() => {
      setCameraError("Couldn't start the camera preview. Please try again.");
    });
  }, [streaming]);

  // Clean up the camera stream on unmount.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  // Countdown timer for the "capture in N…" flow.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const doCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx.drawImage(videoRef.current, 0, 0);
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
          onChange({ ...data, selfieFile: file });
        }
      },
      "image/jpeg",
      0.9
    );
    stopCamera();
  }, [data, onChange, stopCamera]);

  // When countdown hits 0, take the shot.
  useEffect(() => {
    if (countdown === 0) doCapture();
  }, [countdown, doCapture]);

  const startCountdown = () => setCountdown(3);
  const nextGesture = () => setGestureIndex((i) => Math.min(i + 1, GESTURES.length - 1));
  const prevGesture = () => setGestureIndex((i) => Math.max(i - 1, 0));

  const retake = () => {
    // Clear the captured file, stop any lingering stream, and re-open the camera.
    onChange({ ...data, selfieFile: null });
    setCameraError(null);
    setGestureIndex(0);
    setCountdown(null);
    stopCamera();
    if (!fallbackMode) {
      // Small delay so the browser releases the previous track before we request again.
      setTimeout(() => { startCamera(); }, 150);
    }
  };


  const handleFallbackFile = (f: File | null) => {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(f.type)) {
      setCameraError("Please upload a JPG or PNG image.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setCameraError("Image must be under 10MB.");
      return;
    }
    setCameraError(null);
    onChange({ ...data, selfieFile: f });
  };

  const canProceed = !!data.selfieFile;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">Live Selfie & Work Photo</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Take a live selfie for facial matching with your government ID.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Live Selfie *</p>

        {data.selfieFile ? (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-border bg-muted aspect-[4/3] max-w-sm mx-auto">
              <img
                src={URL.createObjectURL(data.selfieFile)}
                alt="Selfie preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Selfie captured. Not happy with it? Retake below.
            </div>
            <div className="flex justify-center">
              <Button variant="outline" size="sm" onClick={retake}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake selfie
              </Button>
            </div>
          </div>
        ) : streaming ? (
          <div className="space-y-3">
            {(() => {
              const G = GESTURES[gestureIndex];
              const Icon = G.icon;
              return (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 max-w-sm mx-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Liveness check {gestureIndex + 1} of {GESTURES.length}
                      </p>
                      <p className="text-sm font-medium text-foreground">{G.label}</p>
                    </div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <button
                      type="button"
                      onClick={prevGesture}
                      disabled={gestureIndex === 0}
                      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={nextGesture}
                      disabled={gestureIndex === GESTURES.length - 1}
                      className="text-xs text-primary hover:underline disabled:opacity-40"
                    >
                      Next gesture
                    </button>
                  </div>
                </div>
              );
            })()}

            <div className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-[4/3] max-w-sm mx-auto">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
              {countdown !== null && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm">
                  <span className="text-6xl font-display font-bold text-foreground drop-shadow-lg">
                    {countdown}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Button
                onClick={startCountdown}
                disabled={countdown !== null}
                className="bg-gradient-hero text-primary-foreground hover:opacity-90"
              >
                <Camera className="w-4 h-4 mr-2" />
                {countdown !== null ? `Capturing in ${countdown}…` : "Capture selfie (3s)"}
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={startCamera}
              className="w-full max-w-sm aspect-[4/3] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center gap-3"
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Camera className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Click to open camera</span>
            </button>
            {cameraError && (
              <p className="text-sm text-destructive text-center max-w-sm">{cameraError}</p>
            )}
            <div className="flex items-center gap-2 w-full max-w-sm">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => selfieInputRef.current?.click()}
            >
              Upload a selfie photo instead
            </Button>
            <input
              ref={selfieInputRef}
              type="file"
              accept="image/jpeg,image/png"
              capture="user"
              className="hidden"
              onChange={(e) => {
                handleFallbackFile(e.target.files?.[0] ?? null);
                if (selfieInputRef.current) selfieInputRef.current.value = "";
              }}
            />
          </div>
        )}
      </div>


      <canvas ref={canvasRef} className="hidden" />

      <FileUploadField
        label="Photo of your work (optional)"
        file={data.workPhotoFile}
        onFileChange={(f) => onChange({ ...data, workPhotoFile: f })}
        accept="image/jpeg,image/png"
      />

      <FileUploadField
        label="Short video introduction (optional)"
        file={data.shortVideoFile}
        onFileChange={(f) => onChange({ ...data, shortVideoFile: f })}
        accept="video/mp4,video/quicktime,video/webm"
        maxSizeMB={30}
        hint="Record a 30-60 second video introducing yourself and your skills."
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

export default StepSelfie;
