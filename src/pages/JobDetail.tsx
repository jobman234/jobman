import { useState, useRef } from "react";
import { Navigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn, isVideoUrl } from "@/lib/utils";
import {
  Loader2, ArrowLeft, MapPin, Banknote, Clock, Briefcase,
  CheckCircle2, Lock, ShieldCheck, Timer, PartyPopper, Star,
  AlertTriangle, Play, Flag, ImagePlus, X, AlertCircle, Wallet,
} from "lucide-react";
import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";
import { useEffect } from "react";
import DisputeDialog from "@/components/job/DisputeDialog";
import ReviewDialog from "@/components/job/ReviewDialog";
import TrustScoreBadge from "@/components/job/TrustScoreBadge";
import JobChat from "@/components/job/JobChat";

const formatBudget = (min: number | null, max: number | null) => {
  if (min && max) return `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`;
  if (min) return `From ₦${min.toLocaleString()}`;
  if (max) return `Up to ₦${max.toLocaleString()}`;
  return "Budget flexible";
};

const STEP_NOTES = {
  agreed_customer: "You've agreed on terms. Fund the escrow from your wallet so the artisan can start. Your money is held safely until you confirm job completion.",
  agreed_artisan: "The customer has accepted your offer! Once payment is funded, you'll see a 'Start Project' button. Click it when you begin work.",
  funded_artisan: "Payment has been secured in escrow. Click 'Start Project' when you're ready to begin. Upload photos/videos as evidence during the job.",
  in_progress_customer: "The artisan is working on your job. You'll be notified when they mark it as complete.",
  in_progress_artisan: "You're working on this job. Upload progress photos/videos. When finished, click 'Job Completed' to notify the customer.",
  completed_customer: "The artisan has marked this job as complete. Review the work and either Accept (releases payment) or Reject (files a dispute). Payment auto-releases in 48 hours if no action is taken.",
  completed_artisan: "You've marked this job as complete. Waiting for the customer to review. Payment will auto-release in 48 hours if the customer doesn't respond.",
};

const JobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, userRole } = useAuth();
  const queryClient = useQueryClient();
  const evidenceInputRef = useRef<HTMLInputElement>(null);

  const [countdown, setCountdown] = useState("");

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs_safe")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: negotiations } = useQuery({
    queryKey: ["negotiations", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("negotiations")
        .select("*")
        .eq("job_id", id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: existingEscrow } = useQuery({
    queryKey: ["job-escrow", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("escrows")
        .select("id, status")
        .eq("job_id", id!)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!id,
  });

  const { data: existingDispute } = useQuery({
    queryKey: ["job-dispute", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("disputes" as any)
        .select("id, status")
        .eq("job_id", id!)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user && !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ["job-reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("job_id", id!);
      return data ?? [];
    },
    enabled: !!user && !!id,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallets")
        .select("balance")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const chatOtherPartyId = job && user
    ? (job.customer_id === user.id ? job.assigned_artisan_id : job.customer_id)
    : null;
  const { data: otherPartyProfile } = useQuery({
    queryKey: ["other-party-profile", chatOtherPartyId],
    queryFn: async () => {
      // profiles RLS only allows "own row" or "admin" -- a job's customer
      // has no policy letting them read the assigned artisan's row (or vice
      // versa), so this always returned nothing. Only full_name is actually
      // used below (for the chat header), and that's exactly one of the
      // columns public_profiles already exposes safely to everyone, so read
      // it from there instead of the raw table.
      const { data } = await supabase
        .from("public_profiles")
        .select("full_name")
        .eq("user_id", chatOtherPartyId!)
        .maybeSingle();
      return data;
    },
    enabled: !!chatOtherPartyId,
  });

  // Check artisan verification for payment blocking.
  // RLS on artisan_profiles only allows an artisan to read their own row (or
  // an admin to read any row) -- a customer reading the row of their job's
  // assigned artisan has no policy to match, so a direct select here always
  // returns nothing. get_assigned_artisan_verification() is a narrow RPC
  // scoped to this job's participants that returns just the one status
  // value, without opening up the sensitive identity columns on the table.
  const { data: assignedArtisanVerificationStatus } = useQuery({
    queryKey: ["assigned-artisan-verification", job?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_assigned_artisan_verification", {
        _job_id: job!.id,
      });
      return data;
    },
    enabled: !!job?.id && !!job?.assigned_artisan_id,
  });

  const artisanIsVerified = assignedArtisanVerificationStatus === "approved";

  // Fund escrow from wallet
  const fundEscrow = useMutation({
    mutationFn: async () => {
      if (!job || !user) throw new Error("Missing data");
      if (!artisanIsVerified) throw new Error("Cannot fund escrow: the assigned artisan is not verified.");
      const { error } = await supabase.rpc("fund_escrow", {
        _job_id: job.id,
        _payer_id: user.id,
        _payee_id: job.assigned_artisan_id!,
        _amount: Number(job.agreed_price),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment funded! The artisan can now start the project.");
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      queryClient.invalidateQueries({ queryKey: ["job-escrow", id] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Artisan starts job
  const startJob = useMutation({
    mutationFn: async () => {
      if (!job) throw new Error("Missing data");
      const { error } = await supabase.rpc("start_job" as any, { _job_id: job.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job started! The customer has been notified.");
      queryClient.invalidateQueries({ queryKey: ["job", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Artisan marks complete
  const markComplete = useMutation({
    mutationFn: async () => {
      if (!job) throw new Error("Missing data");
      const { error } = await supabase.rpc("artisan_mark_complete" as any, { _job_id: job.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job marked as complete! Waiting for customer review.");
      queryClient.invalidateQueries({ queryKey: ["job", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Customer accepts completion
  const acceptCompletion = useMutation({
    mutationFn: async () => {
      if (!job || !user) throw new Error("Missing data");
      const { error } = await supabase.rpc("complete_job", {
        _job_id: job.id,
        _user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Job accepted! Payment released to artisan.");
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      queryClient.invalidateQueries({ queryKey: ["job-escrow", id] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Upload evidence photos/videos
  const uploadEvidence = async (files: FileList | null) => {
    if (!files || !job || !user) return;
    const currentPhotos = job.photos || [];
    const newUrls: string[] = [];

    for (const file of Array.from(files).slice(0, 10 - currentPhotos.length)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("job-photos").upload(path, file, { upsert: true });
      if (error) { toast.error(error.message); continue; }
      const { data: urlData } = supabase.storage.from("job-photos").getPublicUrl(path);
      newUrls.push(urlData.publicUrl);
    }

    if (newUrls.length > 0) {
      await supabase.from("jobs").update({
        photos: [...currentPhotos, ...newUrls],
      }).eq("id", job.id);
      toast.success(`${newUrls.length} file(s) uploaded as evidence`);
      queryClient.invalidateQueries({ queryKey: ["job", id] });
    }
  };

  // Countdown timer for escrow auto-release
  useEffect(() => {
    if (!job?.escrow_release_deadline || !job.artisan_completed_at) return;
    const update = () => {
      const secs = differenceInSeconds(new Date(job.escrow_release_deadline!), new Date());
      if (secs <= 0) {
        setCountdown("Auto-releasing...");
        queryClient.invalidateQueries({ queryKey: ["job", id] });
        return;
      }
      const hrs = Math.floor(secs / 3600);
      const mins = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setCountdown(`${hrs}h ${mins}m ${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [job?.escrow_release_deadline, job?.artisan_completed_at, id, queryClient]);

  if (authLoading || jobLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 pt-24 pb-12 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">Job not found</h1>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/jobs">Back to Jobs</Link>
          </Button>
        </main>
      </div>
    );
  }

  const isOwner = job.customer_id === user.id;
  const isAssignedArtisan = job.assigned_artisan_id === user.id;
  const isAgreed = ["agreed", "in_progress", "completed"].includes(job.status);
  const canNegotiate = !isAgreed && job.status !== "cancelled";
  const artisanMarkedComplete = !!job.artisan_completed_at;
  const hasSufficientBalance = wallet && Number(wallet.balance) >= Number(job.agreed_price || 0);

  // Determine which step note to show
  let stepNote = "";
  if (job.status === "agreed" && !existingEscrow && isOwner) stepNote = STEP_NOTES.agreed_customer;
  else if (job.status === "agreed" && !existingEscrow && isAssignedArtisan) stepNote = STEP_NOTES.agreed_artisan;
  else if (job.status === "agreed" && existingEscrow && isAssignedArtisan) stepNote = STEP_NOTES.funded_artisan;
  else if (job.status === "in_progress" && !artisanMarkedComplete && isOwner) stepNote = STEP_NOTES.in_progress_customer;
  else if (job.status === "in_progress" && !artisanMarkedComplete && isAssignedArtisan) stepNote = STEP_NOTES.in_progress_artisan;
  else if (job.status === "in_progress" && artisanMarkedComplete && isOwner) stepNote = STEP_NOTES.completed_customer;
  else if (job.status === "in_progress" && artisanMarkedComplete && isAssignedArtisan) stepNote = STEP_NOTES.completed_artisan;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Jobs
          </Link>

          {/* Job details card */}
          <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 mb-6">
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">{job.title}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Briefcase className="w-4 h-4" /> {job.trade_category}
              </span>
              <span className="flex items-center gap-1">
                <Banknote className="w-4 h-4" /> {formatBudget(job.budget_min, job.budget_max)}
              </span>
              {job.location_state && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location_lga ? `${job.location_lga}, ` : ""}{job.location_state}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
              </span>
            </div>

            <p className="text-foreground whitespace-pre-wrap mb-4">{job.description}</p>

            {job.photos && job.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {job.photos.map((url, i) =>
                  isVideoUrl(url) ? (
                    <video
                      key={i}
                      src={url}
                      controls
                      className="w-32 h-24 rounded-lg object-cover border border-border shrink-0 bg-muted"
                    />
                  ) : (
                    <img
                      key={i}
                      src={url}
                      alt={`Job photo ${i + 1}`}
                      className="w-32 h-24 rounded-lg object-cover border border-border shrink-0"
                    />
                  )
                )}
              </div>
            )}
          </div>

          {/* Step guidance note */}
          {stepNote && (
            <div className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{stepNote}</p>
            </div>
          )}

          {/* Agreement & Job Lifecycle Panel */}
          {isAgreed && (
            <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 mb-6 space-y-5">
              {/* Agreement details */}
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-5 h-5 text-primary" />
                  <h2 className="font-display font-bold text-foreground">Agreement Locked</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Agreed Price</p>
                    <p className="font-semibold text-foreground">₦{job.agreed_price?.toLocaleString()}</p>
                  </div>
                  {job.agreed_timeline && (
                    <div>
                      <p className="text-muted-foreground">Timeline</p>
                      <p className="font-semibold text-foreground">{job.agreed_timeline}</p>
                    </div>
                  )}
                  {job.agreed_at && (
                    <div>
                      <p className="text-muted-foreground">Agreed On</p>
                      <p className="font-semibold text-foreground">{format(new Date(job.agreed_at), "dd MMM yyyy")}</p>
                    </div>
                  )}
                </div>
                {job.agreed_scope && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <p className="text-muted-foreground text-sm">Scope</p>
                    <p className="text-foreground text-sm">{job.agreed_scope}</p>
                  </div>
                )}
              </div>

              {/* === Artisan awaiting payment note === */}
              {isAssignedArtisan && job.status === "agreed" && !existingEscrow && (
                <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <Timer className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Awaiting Payment</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      The customer has accepted your offer of <span className="font-semibold text-foreground">₦{job.agreed_price?.toLocaleString()}</span>. 
                      Once they fund the payment, you'll be able to start the project. Hang tight!
                    </p>
                  </div>
                </div>
              )}

              {/* === STEP 1: Customer funds escrow === */}
              {isOwner && job.status === "agreed" && !existingEscrow && (
                <div className="space-y-3">
                  {!artisanIsVerified && (
                    <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">
                        <strong className="text-destructive">Cannot make payment:</strong> The assigned artisan has not completed identity verification. Payment will be enabled once they are verified.
                      </p>
                    </div>
                  )}
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-primary" />
                    Pay from Wallet
                  </h3>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                    <span className="text-sm text-muted-foreground">Your wallet balance</span>
                    <span className="font-bold text-foreground">₦{Number(wallet?.balance || 0).toLocaleString()}</span>
                  </div>
                  {!hasSufficientBalance && (
                    <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">
                        Insufficient balance. You need ₦{Number(job.agreed_price || 0).toLocaleString()}. 
                        <Link to="/wallet" className="text-primary font-semibold ml-1 hover:underline">Fund your wallet</Link>
                      </p>
                    </div>
                  )}
                  <Button
                    onClick={() => fundEscrow.mutate()}
                    disabled={fundEscrow.isPending || !hasSufficientBalance || !artisanIsVerified}
                    className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90"
                  >
                    {fundEscrow.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing Payment...</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4 mr-2" />Pay ₦{job.agreed_price?.toLocaleString()} (Held Securely)</>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Your payment is held securely and only released when you confirm the job is complete.
                  </p>
                </div>
              )}

              {/* Escrow funded status */}
              {existingEscrow && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      Payment {existingEscrow.status === "held" ? "secured in escrow" : existingEscrow.status}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">₦{job.agreed_price?.toLocaleString()}</span>
                  </div>

                  {/* === STEP 2: Artisan starts job === */}
                  {isAssignedArtisan && job.status === "agreed" && existingEscrow.status === "held" && (
                    <Button
                      onClick={() => startJob.mutate()}
                      disabled={startJob.isPending}
                      className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90"
                      size="lg"
                    >
                      {startJob.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting...</>
                      ) : (
                        <><Play className="w-4 h-4 mr-2" />Start Project</>
                      )}
                    </Button>
                  )}

                  {/* === STEP 3: In progress - artisan can upload evidence & mark complete === */}
                  {job.status === "in_progress" && existingEscrow.status === "held" && !artisanMarkedComplete && (
                    <>
                      {isAssignedArtisan && (
                        <div className="space-y-3">
                          {/* Upload evidence */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => evidenceInputRef.current?.click()}
                            >
                              <ImagePlus className="w-4 h-4 mr-1.5" />
                              Upload Progress Evidence
                            </Button>
                            <input
                              ref={evidenceInputRef}
                              type="file"
                              accept="image/*,video/*"
                              multiple
                              className="hidden"
                              onChange={(e) => uploadEvidence(e.target.files)}
                            />
                          </div>

                          <Button
                            onClick={() => markComplete.mutate()}
                            disabled={markComplete.isPending}
                            className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90"
                            size="lg"
                          >
                            {markComplete.isPending ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                            ) : (
                              <><Flag className="w-4 h-4 mr-2" />Job Completed</>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* === STEP 4: Artisan marked complete - customer reviews === */}
                  {job.status === "in_progress" && artisanMarkedComplete && existingEscrow.status === "held" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                        <Timer className="w-4 h-4 text-warning" />
                        <span className="text-sm text-foreground">
                          Auto-release in: <span className="font-bold">{countdown}</span>
                        </span>
                      </div>

                      {isOwner && (
                        <div className="flex gap-3">
                          <Button
                            onClick={() => acceptCompletion.mutate()}
                            disabled={acceptCompletion.isPending}
                            className="flex-1 bg-gradient-hero text-primary-foreground hover:opacity-90"
                            size="lg"
                          >
                            {acceptCompletion.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <><CheckCircle2 className="w-4 h-4 mr-2" />Accept Job</>
                            )}
                          </Button>
                          {!existingDispute && (
                            <DisputeDialog
                              jobId={job.id}
                              escrowId={existingEscrow.id}
                              raisedBy={user.id}
                              raisedAgainst={job.assigned_artisan_id!}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dispute raised */}
                  {existingEscrow.status === "disputed" && existingDispute && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-semibold">Dispute raised — escrow frozen. Under admin review.</span>
                    </div>
                  )}

                  {/* Completed */}
                  {job.status === "completed" && existingEscrow.status === "released" && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary">
                      <PartyPopper className="w-4 h-4" />
                      <span className="text-sm font-semibold">Job completed — payment released!</span>
                    </div>
                  )}

                  {/* In-progress dispute (before artisan completes) */}
                  {job.status === "in_progress" && !artisanMarkedComplete && existingEscrow.status === "held" && !existingDispute && (
                    <div className="pt-2 border-t border-border">
                      <DisputeDialog
                        jobId={job.id}
                        escrowId={existingEscrow.id}
                        raisedBy={user.id}
                        raisedAgainst={isOwner ? job.assigned_artisan_id! : job.customer_id}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Review section after completion */}
          {job.status === "completed" && (
            <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 mb-6">
              <h2 className="font-display font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Reviews
              </h2>

              {reviews && reviews.length > 0 && (
                <div className="space-y-3 mb-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={cn("w-4 h-4", s <= review.rating ? "fill-primary text-primary" : "text-border")} />
                        ))}
                      </div>
                      {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}

              {isOwner && job.assigned_artisan_id && (
                <ReviewDialog
                  jobId={job.id}
                  reviewerId={user.id}
                  revieweeId={job.assigned_artisan_id}
                  revieweeName="Artisan"
                  hasReviewed={!!reviews?.find((r) => r.reviewer_id === user.id)}
                />
              )}
              {!isOwner && userRole === "artisan" && (
                <ReviewDialog
                  jobId={job.id}
                  reviewerId={user.id}
                  revieweeId={job.customer_id}
                  revieweeName="Customer"
                  hasReviewed={!!reviews?.find((r) => r.reviewer_id === user.id)}
                />
              )}
            </div>
          )}

          {/* Chat */}
          {job.assigned_artisan_id && (
            <div className="mb-6">
              <JobChat
                jobId={job.id}
                customerId={job.customer_id}
                artisanId={job.assigned_artisan_id}
                otherPartyName={otherPartyProfile?.full_name}
              />
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default JobDetail;
