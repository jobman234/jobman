import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  User, Mail, Phone, MapPin, Calendar, ShieldCheck, ShieldAlert, HardHat,
  MessageSquare, Trash2, Loader2, Briefcase, Star, Wallet,
} from "lucide-react";

interface Props {
  userId: string | null;
  profile: any;
  role: string;
  onClose: () => void;
}

const AdminUserProfileDialog = ({ userId, profile, role, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);

  // Fetch artisan profile if artisan
  const { data: artisanProfile } = useQuery({
    queryKey: ["admin-user-artisan", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artisan_profiles")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId && role === "artisan",
  });

  // Fetch user's messages (as sender)
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["admin-user-messages", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch job titles for messages
  const { data: jobMap } = useQuery({
    queryKey: ["admin-jobs-map", messages?.map(m => m.job_id)],
    queryFn: async () => {
      const jobIds = [...new Set(messages?.map(m => m.job_id) || [])];
      if (!jobIds.length) return {};
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title")
        .in("id", jobIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach(j => { map[j.id] = j.title; });
      return map;
    },
    enabled: !!messages?.length,
  });

  // Fetch wallet
  const { data: wallet } = useQuery({
    queryKey: ["admin-user-wallet", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch reviews
  const { data: reviews } = useQuery({
    queryKey: ["admin-user-reviews", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewee_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const deleteMessage = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-user-messages", userId] });
      setDeleteMessageId(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete message"),
  });

  const avgRating = reviews?.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <>
      <Dialog open={!!userId} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {!profile ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {profile.full_name || "Unknown User"}
            </DialogTitle>
            <DialogDescription>
              View user profile, messages, and activity
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="profile" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="profile" className="gap-1.5">
                <User className="w-3.5 h-3.5" /> Profile
              </TabsTrigger>
              <TabsTrigger value="messages" className="gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Messages
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="flex-1 overflow-auto mt-0">
              <ScrollArea className="h-[55vh] pr-3">
                <div className="space-y-5 py-3">
                  {/* Basic info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoItem icon={Mail} label="Email" value={profile.email} />
                    <InfoItem icon={Phone} label="Phone" value={profile.phone} />
                    <InfoItem icon={MapPin} label="Location" value={[profile.state, profile.lga].filter(Boolean).join(", ")} />
                    <InfoItem icon={Calendar} label="Joined" value={format(new Date(profile.created_at), "dd MMM yyyy")} />
                  </div>

                  {/* Role badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Role:</span>
                    <Badge variant={role === "admin" || role === "super_admin" ? "destructive" : role === "artisan" ? "default" : "secondary"}>
                      {role}
                    </Badge>
                  </div>

                  {/* Wallet */}
                  {wallet && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Wallet className="w-4 h-4 text-primary" /> Wallet
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Balance: <span className="font-semibold">₦{wallet.balance?.toLocaleString()}</span></div>
                        <div>Referral: <span className="font-semibold">₦{wallet.referral_balance?.toLocaleString()}</span></div>
                      </div>
                    </div>
                  )}

                  {/* Artisan details */}
                  {role === "artisan" && artisanProfile && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <HardHat className="w-4 h-4 text-primary" /> Artisan Details
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div>Trade: <span className="font-semibold">{artisanProfile.primary_trade}</span></div>
                        <div>Experience: <span className="font-semibold">{artisanProfile.years_experience} years</span></div>
                        <div className="flex items-center gap-1">
                          Verification:
                          {artisanProfile.verification_status === "approved" ? (
                            <Badge variant="default" className="gap-1 text-xs"><ShieldCheck className="w-3 h-3" /> Verified</Badge>
                          ) : artisanProfile.verification_status === "pending" ? (
                            <Badge variant="secondary" className="gap-1 text-xs"><ShieldAlert className="w-3 h-3" /> Pending</Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-xs">Unverified</Badge>
                          )}
                        </div>
                      </div>
                      {artisanProfile.bio && (
                        <p className="text-sm text-muted-foreground">{artisanProfile.bio}</p>
                      )}
                    </div>
                  )}

                  {/* Reviews */}
                  {reviews && reviews.length > 0 && (
                    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Star className="w-4 h-4 text-yellow-500" /> Reviews ({reviews.length}) — Avg: {avgRating}★
                      </div>
                      <div className="space-y-2">
                        {reviews.slice(0, 5).map(r => (
                          <div key={r.id} className="text-sm border-l-2 border-primary/30 pl-3">
                            <div className="flex items-center gap-1">
                              {"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}
                              <span className="text-xs text-muted-foreground ml-2">
                                {format(new Date(r.created_at), "dd MMM yyyy")}
                              </span>
                            </div>
                            {r.comment && <p className="text-muted-foreground mt-0.5">{r.comment}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="messages" className="flex-1 overflow-auto mt-0">
              <ScrollArea className="h-[55vh] pr-3">
                <div className="py-3">
                  <p className="text-xs text-muted-foreground mb-3">
                    Showing messages sent by this user. Delete any that violate company policies.
                  </p>
                  {messagesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : !messages?.length ? (
                    <p className="text-center text-muted-foreground py-8">No messages found.</p>
                  ) : (
                    <div className="space-y-2">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Briefcase className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground truncate">
                                {jobMap?.[msg.job_id] || "Unknown Job"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(msg.created_at), "dd MMM yyyy, HH:mm")}
                              </span>
                            </div>
                            <p className="text-sm break-words">{msg.content}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                            title="Delete this message"
                            onClick={() => setDeleteMessageId(msg.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteMessageId} onOpenChange={() => setDeleteMessageId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this message for violating company policies. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMessageId && deleteMessage.mutate(deleteMessageId)}
              disabled={deleteMessage.isPending}
            >
              {deleteMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const InfoItem = ({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) => (
  <div className="flex items-center gap-2 text-sm">
    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
    <span className="text-muted-foreground">{label}:</span>
    <span className="font-medium truncate">{value || "—"}</span>
  </div>
);

export default AdminUserProfileDialog;
