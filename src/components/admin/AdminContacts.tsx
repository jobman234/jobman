import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, MailOpen, Eye, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface ContactReply {
  id: string;
  submission_id: string;
  admin_id: string;
  message: string;
  created_at: string;
}

const PAGE_SIZE = 30;

const AdminContacts = () => {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactSubmission | null>(null);
  const [replies, setReplies] = useState<ContactReply[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchSubmissions = async (currentLimit: number) => {
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .range(0, currentLimit);

    if (error) {
      toast({ title: "Error", description: "Failed to load submissions.", variant: "destructive" });
    } else {
      setHasMore((data?.length ?? 0) > currentLimit);
      setSubmissions((data ?? []).slice(0, currentLimit));
    }
    setLoading(false);
  };

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from("contact_submissions")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    setUnreadCount(count ?? 0);
  };

  useEffect(() => { fetchSubmissions(limit); }, [limit]);
  useEffect(() => { fetchUnreadCount(); }, []);

  const fetchReplies = async (submissionId: string) => {
    setLoadingReplies(true);
    const { data } = await supabase
      .from("contact_replies")
      .select("*")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: true });
    setReplies(data || []);
    setLoadingReplies(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("contact_submissions").update({ is_read: true }).eq("id", id);
    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, is_read: true } : s)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const openSubmission = (s: ContactSubmission) => {
    setSelected(s);
    setReplyText("");
    if (!s.is_read) markAsRead(s.id);
    fetchReplies(s.id);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selected || !user) return;
    setSending(true);

    const { error } = await supabase.from("contact_replies").insert({
      submission_id: selected.id,
      admin_id: user.id,
      message: replyText.trim(),
    });

    setSending(false);

    if (error) {
      toast({ title: "Error", description: "Failed to send reply.", variant: "destructive" });
      return;
    }

    toast({ title: "Reply saved", description: "Your reply has been recorded." });
    setReplyText("");
    fetchReplies(selected.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-foreground">
          Contact Submissions
          {unreadCount > 0 && (
            <Badge variant="destructive" className="ml-2">{unreadCount} unread</Badge>
          )}
        </h2>
      </div>

      {submissions.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No contact submissions yet.</p>
      ) : (
        <div className="space-y-2">
          {submissions.map((s) => (
            <button
              key={s.id}
              onClick={() => openSubmission(s)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                s.is_read ? "bg-card" : "bg-primary/5 border-primary/20"
              } hover:bg-accent`}
            >
              <div className="flex items-center gap-3">
                {s.is_read ? (
                  <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <Mail className="h-4 w-4 text-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${s.is_read ? "text-foreground" : "text-primary"}`}>
                      {s.name}
                    </span>
                    <Badge variant="outline" className="text-xs">{s.subject}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto shrink-0">
                      {format(new Date(s.created_at), "MMM d, yyyy · h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">{s.message}</p>
                </div>
              </div>
            </button>
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Contact Message
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Name</span>
                  <p className="font-medium text-foreground">{selected.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="font-medium text-foreground">{selected.email}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Subject</span>
                  <p className="font-medium text-foreground">{selected.subject}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date</span>
                  <p className="font-medium text-foreground">
                    {format(new Date(selected.created_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Message</span>
                <p className="mt-1 text-sm text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                  {selected.message}
                </p>
              </div>

              {/* Replies thread */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-foreground mb-3">Replies</h4>
                {loadingReplies ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                ) : replies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No replies yet.</p>
                ) : (
                  <div className="space-y-3">
                    {replies.map((r) => (
                      <div key={r.id} className="bg-primary/5 border border-primary/10 rounded-lg p-3">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{r.message}</p>
                        <span className="text-xs text-muted-foreground mt-1 block">
                          {format(new Date(r.created_at), "MMM d, yyyy · h:mm a")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Reply input */}
              <div className="border-t pt-4 space-y-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  maxLength={2000}
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sending}
                  className="w-full"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  {sending ? "Sending..." : "Send Reply"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContacts;
