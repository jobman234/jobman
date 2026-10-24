import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, Search, Pencil, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  reward_amount: number;
  rewarded_at: string;
  referral_credited: boolean;
  referrer_name: string;
  referrer_email: string;
  referred_name: string;
  referred_email: string;
  referred_role: string;
}

const PAGE_SIZE = 30;

const AdminReferrals = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingRow, setEditingRow] = useState<ReferralRow | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [deletingRow, setDeletingRow] = useState<ReferralRow | null>(null);
  const [viewingUser, setViewingUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  // Referral events grow far more slowly than the user base (one per
  // successful referred signup), so fetching the full table to keep search
  // correct across all of it is reasonable — this only caps how many of the
  // (already fully searched) matches get rendered into the DOM at once.
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  const { data: referrals, isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data: events, error } = await supabase
        .from("referral_events")
        .select("*")
        .order("rewarded_at", { ascending: false });

      if (error) throw error;
      if (!events || events.length === 0) return [];

      const allUserIds = [
        ...new Set(events.flatMap((e) => [e.referrer_id, e.referred_user_id])),
      ];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", allUserIds);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", allUserIds);

      const profileMap = Object.fromEntries(
        (profiles || []).map((p) => [p.user_id, p])
      );
      const roleMap = Object.fromEntries(
        (roles || []).map((r) => [r.user_id, r.role])
      );

      return events.map((e): ReferralRow => ({
        ...e,
        referrer_name: profileMap[e.referrer_id]?.full_name || "—",
        referrer_email: profileMap[e.referrer_id]?.email || "—",
        referred_name: profileMap[e.referred_user_id]?.full_name || "—",
        referred_email: profileMap[e.referred_user_id]?.email || "—",
        referred_role: roleMap[e.referred_user_id] || "—",
      }));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase
        .from("referral_events")
        .update({ reward_amount: amount })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Referral reward updated");
      setEditingRow(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("referral_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
      toast.success("Referral record deleted");
      setDeletingRow(null);
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete"),
  });

  const allMatches = (referrals || []).filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [r.referrer_name, r.referrer_email, r.referred_name, r.referred_email, r.referred_role]
      .some((f) => f.toLowerCase().includes(q));
  });
  const filtered = allMatches.slice(0, displayLimit);
  const hasMore = allMatches.length > displayLimit;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or role…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setDisplayLimit(PAGE_SIZE);
          }}
          className="pl-9"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {search.trim()
          ? `${filtered.length} of ${allMatches.length} matching referrals`
          : `${referrals?.length || 0} total referrals`}
      </p>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {search.trim() ? `No referrals matching "${search}"` : "No referral records yet."}
        </p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referrer</TableHead>
                <TableHead>Referred User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Reward</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <button
                      onClick={() => setViewingUser({ id: r.referrer_id, name: r.referrer_name, email: r.referrer_email, role: "referrer" })}
                      className="text-left hover:underline"
                    >
                      <p className="font-medium">{r.referrer_name}</p>
                      <p className="text-xs text-muted-foreground">{r.referrer_email}</p>
                    </button>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setViewingUser({ id: r.referred_user_id, name: r.referred_name, email: r.referred_email, role: r.referred_role })}
                      className="text-left hover:underline"
                    >
                      <p className="font-medium">{r.referred_name}</p>
                      <p className="text-xs text-muted-foreground">{r.referred_email}</p>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.referred_role}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">₦{r.reward_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={r.referral_credited ? "default" : "secondary"}>
                      {r.referral_credited ? "Credited" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(r.rewarded_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingRow(r);
                          setEditAmount(String(r.reward_amount));
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingRow(r)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setDisplayLimit((l) => l + PAGE_SIZE)}>
            Load more
          </Button>
        </div>
      )}

      {/* Edit reward dialog */}
      <Dialog open={!!editingRow} onOpenChange={() => setEditingRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Referral Reward</DialogTitle>
          </DialogHeader>
          {editingRow && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {editingRow.referrer_name} → {editingRow.referred_name}
              </p>
              <div className="space-y-2">
                <Label>Reward Amount (₦)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRow(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingRow) {
                  updateMutation.mutate({
                    id: editingRow.id,
                    amount: Number(editAmount),
                  });
                }
              }}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingRow} onOpenChange={() => setDeletingRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Referral Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the referral record between{" "}
              <strong>{deletingRow?.referrer_name}</strong> and{" "}
              <strong>{deletingRow?.referred_name}</strong>. This does not reverse wallet credits already applied.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingRow) deleteMutation.mutate(deletingRow.id);
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View user profile dialog */}
      <Dialog open={!!viewingUser} onOpenChange={() => setViewingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{viewingUser.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{viewingUser.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <Badge variant="secondary">{viewingUser.role}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReferrals;
