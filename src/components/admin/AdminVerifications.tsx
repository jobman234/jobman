import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Loader2, CheckCircle2, XCircle, Clock, Eye, ChevronDown, ChevronUp,
  Fingerprint, MapPin, Users, Camera, FileCheck, ExternalLink, Download,
  Video, Briefcase, AlertTriangle,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

type VerificationStatus = "unverified" | "pending" | "approved" | "rejected";

const STATUS_FILTER = [
  { value: "pending", label: "Pending", icon: Clock, color: "text-warning" },
  { value: "unverified", label: "Unverified", icon: Eye, color: "text-muted-foreground" },
  { value: "approved", label: "Approved", icon: CheckCircle2, color: "text-primary" },
  { value: "rejected", label: "Rejected", icon: XCircle, color: "text-destructive" },
  { value: "all", label: "All", icon: Eye, color: "text-foreground" },
];

const PAGE_SIZE = 20;

const AdminVerifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [confirmApprove, setConfirmApprove] = useState<{ id: string; name: string; status: string } | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  const changeFilter = (value: string) => {
    setFilter(value);
    setLimit(PAGE_SIZE);
  };

  const { data: artisansPage, isLoading } = useQuery({
    queryKey: ["admin-artisans", filter, limit],
    queryFn: async () => {
      let query = supabase
        .from("artisan_profiles")
        .select("*")
        .order("updated_at", { ascending: false })
        .range(0, limit);

      if (filter !== "all") {
        query = query.eq("verification_status", filter as VerificationStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const hasMore = (artisansPage?.length ?? 0) > limit;
  const artisans = artisansPage?.slice(0, limit);

  // Tab badge counts need every status's true total, not just the rows the
  // paginated, filter-scoped query above happens to have loaded — a
  // dedicated lightweight query (one column, every row) keeps them accurate
  // regardless of which filter is active or how many pages are loaded.
  const { data: statusCounts } = useQuery({
    queryKey: ["admin-artisans-status-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("artisan_profiles").select("verification_status");
      if (error) throw error;
      const counts: Record<string, number> = { all: data.length };
      data.forEach((a) => {
        counts[a.verification_status as string] = (counts[a.verification_status as string] ?? 0) + 1;
      });
      return counts;
    },
  });

  // Fetch profiles for names
  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, email, phone");
      const map: Record<string, { full_name: string; email: string | null; phone: string | null }> = {};
      data?.forEach((p) => { map[p.user_id] = p; });
      return map;
    },
  });

  const approve = useMutation({
    mutationFn: async (artisanId: string) => {
      const { data, error } = await supabase
        .from("artisan_profiles")
        .update({
          verification_status: "approved" as VerificationStatus,
          is_public: true,
          approved_at: new Date().toISOString(),
          rejection_note: null,
        })
        .eq("id", artisanId)
        .select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Approval was blocked — you may not have admin permission on this record.");
      if (user) {
        await supabase.rpc("log_admin_action", {
          _admin_id: user.id,
          _action: "verification_approved",
          _entity_type: "artisan_profile",
          _entity_id: artisanId,
          _details: {},
        });
      }
    },
    onSuccess: () => {
      toast.success("Artisan approved and profile is now public!");
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-artisans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-artisans-status-counts"] });
      // Pending filter would hide the row and look like an empty page — show the result instead.
      setFilter((f) => {
        if (f !== "pending" && f !== "unverified") return f;
        setLimit(PAGE_SIZE);
        return "approved";
      });
    },
    onError: (err: any) => toast.error(err?.message || "Could not approve this artisan."),
  });

  const reject = useMutation({
    mutationFn: async ({ artisanId, note }: { artisanId: string; note: string }) => {
      const { error } = await supabase
        .from("artisan_profiles")
        .update({
          verification_status: "rejected" as VerificationStatus,
          is_public: false,
          rejection_note: note || "Verification requirements not met.",
        })
        .eq("id", artisanId);
      if (error) throw error;
      if (user) {
        await supabase.rpc("log_admin_action", {
          _admin_id: user.id,
          _action: "verification_rejected",
          _entity_type: "artisan_profile",
          _entity_id: artisanId,
          _details: { note: note || "Verification requirements not met." },
        });
      }
    },
    onSuccess: () => {
      toast.success("Artisan rejected.");
      setRejectionNote("");
      setExpandedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin-artisans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-artisans-status-counts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTER.map((f) => {
          const Icon = f.icon;
          const count = statusCounts?.[f.value] ?? 0;
          return (
            <button
              key={f.value}
              onClick={() => changeFilter(f.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                filter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {f.label}
              {count !== undefined && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full",
                  filter === f.value ? "bg-primary-foreground/20" : "bg-background"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {!artisans?.length ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No artisan profiles matching this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {artisans.map((artisan) => {
            const profile = profiles?.[artisan.user_id];
            const isExpanded = expandedId === artisan.id;
            const canApprove = artisan.verification_status !== "approved";
            const canReject = artisan.verification_status !== "rejected";

            return (
              <div key={artisan.id} className="bg-card rounded-xl border border-border overflow-hidden">
                {/* Header row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : artisan.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">{profile?.full_name || "Unknown"}</p>
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full border",
                        artisan.verification_status === "pending" && "bg-warning/10 text-warning border-warning/30",
                        artisan.verification_status === "approved" && "bg-primary/10 text-primary border-primary/30",
                        artisan.verification_status === "rejected" && "bg-destructive/10 text-destructive border-destructive/30",
                        artisan.verification_status === "unverified" && "bg-muted text-muted-foreground border-border",
                      )}>
                        {artisan.verification_status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {artisan.primary_trade} · {artisan.years_experience ?? 0} yrs exp · Updated {format(new Date(artisan.updated_at), "dd MMM yyyy")}
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-border p-4 sm:p-6 space-y-5">
                    {/* Contact & Bio */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Email</p>
                        <p className="text-foreground">{profile?.email || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Phone</p>
                        <p className="text-foreground">{profile?.phone || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Date of Birth</p>
                        <p className="text-foreground">{artisan.date_of_birth || "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Trade / Experience</p>
                        <p className="text-foreground">{artisan.primary_trade} · {artisan.years_experience ?? 0} yrs</p>
                      </div>
                    </div>
                    {artisan.bio && (
                      <div className="text-sm">
                        <p className="text-muted-foreground text-xs mb-1">Bio</p>
                        <p className="text-foreground bg-muted/30 rounded-lg p-3">{artisan.bio}</p>
                      </div>
                    )}

                    {/* Identity */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Fingerprint className="w-4 h-4 text-primary" /> Identity
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground text-xs">NIN</p>
                          <p className="text-foreground font-mono">{artisan.nin || "—"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-xs">ID Type</p>
                          <p className="text-foreground">{artisan.government_id_type || "—"}</p>
                        </div>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {artisan.government_id_front_url && (
                          <DocPreview label="ID Front" url={artisan.government_id_front_url} />
                        )}
                        {artisan.government_id_back_url && (
                          <DocPreview label="ID Back" url={artisan.government_id_back_url} />
                        )}
                      </div>
                    </div>

                    {/* Current Address */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" /> Current Address
                      </h4>
                      <p className="text-sm text-foreground">
                        {[artisan.current_address_house, artisan.current_address_street].filter(Boolean).join(" ") || "—"}
                        {artisan.current_address_lga && `, ${artisan.current_address_lga}`}
                        {artisan.current_address_state && `, ${artisan.current_address_state}`}
                      </p>
                      {artisan.current_address_landmark && (
                        <p className="text-xs text-muted-foreground">Landmark: {artisan.current_address_landmark}</p>
                      )}
                    </div>

                    {/* Previous Address */}
                    {(artisan.previous_address_street || artisan.previous_address_lga) && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-muted-foreground" /> Previous Address
                        </h4>
                        <p className="text-sm text-foreground">
                          {[artisan.previous_address_house, artisan.previous_address_street].filter(Boolean).join(" ") || "—"}
                          {artisan.previous_address_lga && `, ${artisan.previous_address_lga}`}
                          {artisan.previous_address_state && `, ${artisan.previous_address_state}`}
                        </p>
                        {artisan.previous_address_landmark && (
                          <p className="text-xs text-muted-foreground">Landmark: {artisan.previous_address_landmark}</p>
                        )}
                      </div>
                    )}

                    {/* Proof of Address */}
                    {artisan.proof_of_address_url && (
                      <DocPreview label="Proof of Address" url={artisan.proof_of_address_url} />
                    )}

                    {/* References */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary" /> References
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {artisan.reference1_name && (
                          <div className="bg-muted/50 rounded-lg p-3 text-sm">
                            <p className="font-medium text-foreground">{artisan.reference1_name}</p>
                            <p className="text-muted-foreground">{artisan.reference1_phone}</p>
                            <p className="text-muted-foreground text-xs">{artisan.reference1_location} · {artisan.reference1_job_type}</p>
                          </div>
                        )}
                        {artisan.reference2_name && (
                          <div className="bg-muted/50 rounded-lg p-3 text-sm">
                            <p className="font-medium text-foreground">{artisan.reference2_name}</p>
                            <p className="text-muted-foreground">{artisan.reference2_phone}</p>
                            <p className="text-muted-foreground text-xs">{artisan.reference2_location} · {artisan.reference2_job_type}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Photos & Documents */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-primary" /> Photos & Media
                      </h4>
                      <div className="flex gap-3 flex-wrap">
                        {artisan.selfie_url && <DocPreview label="Selfie" url={artisan.selfie_url} />}
                        {artisan.portrait_url && <DocPreview label="Portrait" url={artisan.portrait_url} />}
                        {artisan.work_photo_url && <DocPreview label="Work Photo" url={artisan.work_photo_url} />}
                      </div>
                      {artisan.job_photos && artisan.job_photos.length > 0 && (
                        <div className="flex gap-3 flex-wrap mt-2">
                          {artisan.job_photos.map((url, i) => (
                            <DocPreview key={i} label={`Job Photo ${i + 1}`} url={url} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Download all documents */}
                    <div className="pt-2">
                      <DownloadAllButton artisan={artisan} profileName={profile?.full_name || "artisan"} />
                    </div>

                    {/* Rejection note (if rejected) */}
                    {artisan.rejection_note && (
                      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
                        <p className="text-xs font-semibold text-destructive mb-1">Previous rejection note</p>
                        <p className="text-sm text-foreground">{artisan.rejection_note}</p>
                      </div>
                    )}

                    {/* Actions — available for any non-approved status */}
                    {(canApprove || canReject) && (
                      <div className="border-t border-border pt-4 space-y-3">
                        <div className="flex gap-3 flex-wrap">
                          {canApprove && (
                            <Button
                              disabled={approve.isPending}
                              onClick={() => setConfirmApprove({
                                id: artisan.id,
                                name: profile?.full_name || "this artisan",
                                status: artisan.verification_status,
                              })}
                              className="bg-gradient-hero text-primary-foreground hover:opacity-90"
                            >
                              {approve.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                              Approve{artisan.verification_status === "unverified" ? " (Skip Verification)" : ""}
                            </Button>
                          )}
                          {canReject && (
                            <Button
                              variant="outline"
                              className="border-destructive/30 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                if (!rejectionNote.trim()) {
                                  toast.error("Please provide a rejection reason");
                                  return;
                                }
                                reject.mutate({ artisanId: artisan.id, note: rejectionNote });
                              }}
                              disabled={reject.isPending}
                            >
                              {reject.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                              Reject
                            </Button>
                          )}
                        </div>
                        {canReject && (
                          <Textarea
                            placeholder="Rejection reason (required if rejecting)..."
                            value={rejectionNote}
                            onChange={(e) => setRejectionNote(e.target.value)}
                            className="min-h-[80px]"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={!!confirmApprove} onOpenChange={(o) => !o && setConfirmApprove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmApprove?.status === "unverified" ? "Approve without verification?" : "Confirm Approval"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmApprove?.status === "unverified"
                ? "This artisan has NOT submitted any verification documents. Their profile will be made public and visible to customers. Are you sure?"
                : `Approve ${confirmApprove?.name ?? "this artisan"}? Their profile will be made public.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const id = confirmApprove?.id;
                setConfirmApprove(null);
                if (id) approve.mutate(id);
              }}
              className="bg-gradient-hero text-primary-foreground hover:opacity-90"
            >
              Yes, Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const DocPreview = ({ label, url }: { label: string; url: string }) => {
  const [showPreview, setShowPreview] = useState(false);
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);

  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${label.replace(/\s+/g, "_").toLowerCase()}.${isImage ? "jpg" : "pdf"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-1">
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors text-sm"
        >
          {isImage ? <Camera className="w-4 h-4 text-primary" /> : <FileCheck className="w-4 h-4 text-primary" />}
          <span className="text-foreground">{label}</span>
          {showPreview ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <Eye className="w-3 h-3 text-muted-foreground" />}
        </button>
        <button
          onClick={handleDownload}
          className="p-2 rounded-lg border border-border bg-muted/30 hover:bg-muted transition-colors"
          title={`Download ${label}`}
        >
          <Download className="w-4 h-4 text-primary" />
        </button>
      </div>
      {showPreview && (
        <div className="relative rounded-lg border border-border overflow-hidden bg-muted/20 max-w-sm">
          {isImage ? (
            <img src={url} alt={label} className="w-full h-auto max-h-64 object-contain" />
          ) : (
            <iframe src={url} title={label} className="w-full h-64 border-0" />
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
};

const DownloadAllButton = ({ artisan, profileName }: { artisan: any; profileName: string }) => {
  const allDocs = [
    { label: "ID Front", url: artisan.government_id_front_url },
    { label: "ID Back", url: artisan.government_id_back_url },
    { label: "Proof of Address", url: artisan.proof_of_address_url },
    { label: "Selfie", url: artisan.selfie_url },
    { label: "Portrait", url: artisan.portrait_url },
    { label: "Work Photo", url: artisan.work_photo_url },
    ...(artisan.job_photos || []).map((url: string, i: number) => ({ label: `Job Photo ${i + 1}`, url })),
  ].filter((d) => d.url);

  if (allDocs.length === 0) return null;

  const downloadAll = async () => {
    for (const doc of allDocs) {
      try {
        const response = await fetch(doc.url);
        const blob = await response.blob();
        const ext = doc.url.match(/\.(jpg|jpeg|png|gif|pdf|mp4|mov|webm)/i)?.[1] || "jpg";
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${profileName.replace(/\s+/g, "_")}_${doc.label.replace(/\s+/g, "_").toLowerCase()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      } catch {
        window.open(doc.url, "_blank");
      }
      // Small delay between downloads
      await new Promise((r) => setTimeout(r, 300));
    }
    toast.success(`Downloaded ${allDocs.length} documents.`);
  };

  return (
    <Button variant="outline" size="sm" onClick={downloadAll}>
      <Download className="w-4 h-4 mr-2" />
      Download All Documents ({allDocs.length})
    </Button>
  );
};

export default AdminVerifications;
