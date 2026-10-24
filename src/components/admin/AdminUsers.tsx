import { useState, useRef } from "react";
import AdminUserProfileDialog from "./AdminUserProfileDialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Loader2, Search, Users, HardHat, User, Mail, Phone, Calendar,
  ShieldPlus, UserPlus, ShieldMinus, ShieldAlert, ShieldCheck, KeyRound,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const ROLE_BADGES: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  customer: { label: "Customer", icon: User, className: "bg-info/10 text-info border-info/30" },
  artisan: { label: "Artisan", icon: HardHat, className: "bg-primary/10 text-primary border-primary/30" },
  admin: { label: "Admin", icon: Users, className: "bg-accent/10 text-accent border-accent/30" },
  super_admin: { label: "Super Admin", icon: Users, className: "bg-destructive/10 text-destructive border-destructive/30" },
};

const PAGE_SIZE = 30;
// A broad search (e.g. a single common letter) could otherwise pull huge
// swaths of the table at once — cap it well above what anyone scans by eye.
const SEARCH_LIMIT = 200;

const AdminUsers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [addAdminOpen, setAddAdminOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Debounce search so every keystroke doesn't fire a new query.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSearch = (value: string) => {
    setSearchTerm(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(value.trim());
      setLimit(PAGE_SIZE);
    }, 300);
  };

  const isSearching = debouncedSearch.length > 0;

  const { data: profilesPage, isLoading } = useQuery({
    queryKey: ["admin-all-profiles", debouncedSearch, limit],
    queryFn: async () => {
      if (isSearching) {
        // Search the whole table, not just whatever page happens to be
        // loaded — a name/email/phone match anywhere must be findable.
        // Escape LIKE wildcards in the value, then quote it per PostgREST's
        // or() syntax so a comma or colon the user types can't be misread
        // as the separator between the three conditions.
        const escaped = debouncedSearch.replace(/[%_]/g, "\\$&").replace(/"/g, '\\"');
        const term = `"%${escaped}%"`;
        // Ask for one more than the cap so the UI can tell "exactly
        // SEARCH_LIMIT matches" apart from "more than SEARCH_LIMIT, truncated".
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .or(`full_name.ilike.${term},email.ilike.${term},phone.ilike.${term}`)
          .order("created_at", { ascending: false })
          .limit(SEARCH_LIMIT + 1);
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .range(0, limit);
      if (error) throw error;
      return data;
    },
  });

  const hasMore = !isSearching && (profilesPage?.length ?? 0) > limit;
  const searchTruncated = isSearching && (profilesPage?.length ?? 0) > SEARCH_LIMIT;
  const profiles = isSearching ? profilesPage?.slice(0, SEARCH_LIMIT) : profilesPage?.slice(0, limit);

  // Total/role counts must reflect every user, not just the current page or
  // search results — a dedicated lightweight query keeps them accurate.
  const { data: userCounts } = useQuery({
    queryKey: ["admin-user-counts"],
    queryFn: async () => {
      const [{ count: total }, { count: artisans }, { count: customers }] = await Promise.all([
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "artisan"),
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "customer"),
      ]);
      return { total: total ?? 0, artisans: artisans ?? 0, customers: customers ?? 0 };
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("user_id, role");
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((r) => { map[r.user_id] = r.role; });
      return map;
    },
  });

  const { data: artisanVerifications } = useQuery({
    queryKey: ["admin-artisan-verifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artisan_profiles")
        .select("user_id, verification_status");
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((a) => { map[a.user_id] = a.verification_status; });
      return map;
    },
  });

  const addAdmin = useMutation({
    mutationFn: async (email: string) => {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error("No user found with that email address.");

      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      if (existingRole?.role === "admin" || existingRole?.role === "super_admin") {
        throw new Error(`${profile.full_name || email} is already an admin.`);
      }

      const { error: updateError } = await supabase
        .from("user_roles")
        .update({ role: "admin" as any })
        .eq("user_id", profile.user_id);

      if (updateError) throw updateError;
      if (user) {
        await supabase.rpc("log_admin_action", {
          _admin_id: user.id,
          _action: "admin_access_granted",
          _entity_type: "user",
          _entity_id: profile.user_id,
          _details: { email },
        });
      }
      return profile.full_name || email;
    },
    onSuccess: (name) => {
      toast.success(`${name} has been made an admin!`);
      setAdminEmail("");
      setAddAdminOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-counts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeAdmin = useMutation({
    mutationFn: async (userId: string) => {
      if (userId === user?.id) throw new Error("You cannot remove your own admin access.");
      const { error } = await supabase
        .from("user_roles")
        .update({ role: "customer" as any })
        .eq("user_id", userId);
      if (error) throw error;
      if (user) {
        await supabase.rpc("log_admin_action", {
          _admin_id: user.id,
          _action: "admin_access_revoked",
          _entity_type: "user",
          _entity_id: userId,
          _details: {},
        });
      }
    },
    onSuccess: () => {
      toast.success("Admin access revoked.");
      queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-counts"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleResetPassword = async () => {
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Password reset email sent to ${resetEmail}`);
      setResetPasswordOpen(false);
      setResetEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };

  const filtered = profiles;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => updateSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {/* Reset Password Dialog */}
          <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <KeyRound className="w-4 h-4" />
                Reset Password
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-primary" />
                  Reset User Password
                </DialogTitle>
                <DialogDescription>
                  Send a password reset email to a user. They will receive a link to set a new password.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>User Email</Label>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleResetPassword} disabled={resetLoading || !resetEmail.trim()}>
                  {resetLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                  Send Reset Email
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Admin Dialog */}
          <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <ShieldPlus className="w-4 h-4" />
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Add Admin
                </DialogTitle>
                <DialogDescription>
                  Enter the email of an existing user to grant them admin access.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!adminEmail.trim()) return;
                  addAdmin.mutate(adminEmail);
                }}
                className="space-y-4 pt-2"
              >
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setAddAdminOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addAdmin.isPending || !adminEmail.trim()}>
                    {addAdmin.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldPlus className="w-4 h-4 mr-2" />}
                    Grant Admin
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{userCounts?.total ?? 0} total users</span>
        <span>{userCounts?.artisans ?? 0} artisans</span>
        <span>{userCounts?.customers ?? 0} customers</span>
        {isSearching && (
          <span>
            · {profiles?.length ?? 0}{searchTruncated ? "+" : ""} matching "{debouncedSearch}"
            {searchTruncated && " — narrow your search to see all results"}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-foreground">User</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden sm:table-cell">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground hidden md:table-cell">Joined</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered?.map((profile) => {
                const role = roles?.[profile.user_id] || "customer";
                const badge = ROLE_BADGES[role] || ROLE_BADGES.customer;
                const BadgeIcon = badge.icon;
                return (
                  <tr key={profile.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedUserId(profile.user_id)}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{profile.full_name}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{profile.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border w-fit", badge.className)}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </span>
                        {role === "artisan" && artisanVerifications?.[profile.user_id] !== "approved" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-destructive/10 text-destructive border-destructive/30 w-fit">
                            <ShieldAlert className="w-3 h-3" />
                            {artisanVerifications?.[profile.user_id] === "pending" ? "Pending Review" : "Unverified"}
                          </span>
                        )}
                        {role === "artisan" && artisanVerifications?.[profile.user_id] === "approved" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/30 w-fit">
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="space-y-0.5">
                        {profile.email && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" /> {profile.email}
                          </p>
                        )}
                        {profile.phone && (
                          <p className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" /> {profile.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(profile.created_at), "dd MMM yyyy")}
                      </p>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        {/* Quick reset password */}
                        {profile.email && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-muted-foreground hover:text-foreground"
                            title="Reset password"
                            onClick={() => {
                              setResetEmail(profile.email || "");
                              setResetPasswordOpen(true);
                            }}
                          >
                            <KeyRound className="w-3 h-3" />
                          </Button>
                        )}
                        {(role === "admin") && profile.user_id !== user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => removeAdmin.mutate(profile.user_id)}
                            disabled={removeAdmin.isPending}
                          >
                            {removeAdmin.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldMinus className="w-3 h-3" />}
                            Remove
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered?.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Load more
          </Button>
        </div>
      )}

      {/* User Profile Dialog */}
      <AdminUserProfileDialog
        userId={selectedUserId}
        profile={selectedUserId ? filtered?.find(p => p.user_id === selectedUserId) : null}
        role={selectedUserId ? (roles?.[selectedUserId] || "customer") : "customer"}
        onClose={() => setSelectedUserId(null)}
      />
    </div>
  );
};

export default AdminUsers;
