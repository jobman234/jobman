import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { format } from "date-fns";

type DetailType =
  | "totalUsers"
  | "customers"
  | "artisans"
  | "pendingVerifications"
  | "approvedArtisans"
  | "openJobs"
  | "totalJobs"
  | "totalWalletBalance"
  | "openDisputes"
  | "totalDisputes"
  | null;

interface Props {
  type: DetailType;
  onClose: () => void;
}

const TITLES: Record<Exclude<DetailType, null>, string> = {
  totalUsers: "All Users",
  customers: "Customers",
  artisans: "Artisans",
  pendingVerifications: "Pending Verifications",
  approvedArtisans: "Verified Artisans",
  openJobs: "Open Jobs",
  totalJobs: "All Jobs",
  totalWalletBalance: "Wallet Balances",
  openDisputes: "Open Disputes",
  totalDisputes: "All Disputes",
};

const SEARCH_PLACEHOLDERS: Record<Exclude<DetailType, null>, string> = {
  totalUsers: "Search by name, email, phone, or state…",
  customers: "Search by name, email, phone, or state…",
  artisans: "Search by name, email, phone, or state…",
  pendingVerifications: "Search by name, email, or trade…",
  approvedArtisans: "Search by name, email, or trade…",
  openJobs: "Search by title, customer, or trade…",
  totalJobs: "Search by title, customer, trade, or status…",
  totalWalletBalance: "Search by name or email…",
  openDisputes: "Search by category or user name…",
  totalDisputes: "Search by category, status, or user name…",
};

function matchesSearch(row: any, query: string, kind: string): boolean {
  const q = query.toLowerCase();
  const check = (...fields: (string | number | null | undefined)[]) =>
    fields.some((f) => f != null && String(f).toLowerCase().includes(q));

  switch (kind) {
    case "profiles":
      return check(row.full_name, row.email, row.phone, row.role, row.state);
    case "artisanProfiles":
      return check(row.full_name, row.email, row.primary_trade, row.verification_status);
    case "jobs":
      return check(row.title, row.customer_name, row.trade_category, row.status);
    case "wallets":
      return check(row.full_name, row.email);
    case "disputes":
      return check(row.category, row.raised_by_name, row.raised_against_name, row.status);
    default:
      return true;
  }
}

const AdminOverviewDetailDialog = ({ type, onClose }: Props) => {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview-detail", type],
    enabled: !!type,
    queryFn: async () => {
      if (!type) return null;

      switch (type) {
        case "totalUsers":
        case "customers":
        case "artisans": {
          const { data: roles } = await supabase.from("user_roles").select("user_id, role");
          const filterRole = type === "customers" ? "customer" : type === "artisans" ? "artisan" : null;
          const filtered = filterRole ? (roles || []).filter((r) => r.role === filterRole) : roles || [];
          const userIds = filtered.map((r) => r.user_id);
          if (userIds.length === 0) return { kind: "profiles" as const, rows: [] };
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email, phone, state, created_at")
            .in("user_id", userIds);
          return {
            kind: "profiles" as const,
            rows: (profiles || []).map((p) => ({
              ...p,
              role: (roles || []).find((r) => r.user_id === p.user_id)?.role || "—",
            })),
          };
        }

        case "pendingVerifications":
        case "approvedArtisans": {
          const status = type === "pendingVerifications" ? "pending" : "approved";
          const { data: artisans } = await supabase
            .from("artisan_profiles")
            .select("user_id, primary_trade, verification_status, created_at, approved_at")
            .eq("verification_status", status);
          const userIds = (artisans || []).map((a) => a.user_id);
          const { data: profiles } = userIds.length
            ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
            : { data: [] };
          return {
            kind: "artisanProfiles" as const,
            rows: (artisans || []).map((a) => ({
              ...a,
              full_name: (profiles || []).find((p) => p.user_id === a.user_id)?.full_name || "—",
              email: (profiles || []).find((p) => p.user_id === a.user_id)?.email || "—",
            })),
          };
        }

        case "openJobs":
        case "totalJobs": {
          let query = supabase.from("jobs").select("id, title, trade_category, status, customer_id, assigned_artisan_id, created_at, budget_min, budget_max");
          if (type === "openJobs") query = query.eq("status", "open");
          const { data: jobs } = await query;
          const customerIds = [...new Set((jobs || []).map((j) => j.customer_id))];
          const { data: profiles } = customerIds.length
            ? await supabase.from("profiles").select("user_id, full_name").in("user_id", customerIds)
            : { data: [] };
          return {
            kind: "jobs" as const,
            rows: (jobs || []).map((j) => ({
              ...j,
              customer_name: (profiles || []).find((p) => p.user_id === j.customer_id)?.full_name || "—",
            })),
          };
        }

        case "totalWalletBalance": {
          const { data: wallets } = await supabase.from("wallets").select("user_id, balance, referral_balance, currency");
          const userIds = (wallets || []).map((w) => w.user_id);
          const { data: profiles } = userIds.length
            ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds)
            : { data: [] };
          return {
            kind: "wallets" as const,
            rows: (wallets || []).map((w) => ({
              ...w,
              full_name: (profiles || []).find((p) => p.user_id === w.user_id)?.full_name || "—",
              email: (profiles || []).find((p) => p.user_id === w.user_id)?.email || "—",
            })),
          };
        }

        case "openDisputes":
        case "totalDisputes": {
          let query = supabase.from("disputes").select("id, job_id, category, status, raised_by, raised_against, created_at, description");
          if (type === "openDisputes") query = query.in("status", ["open", "under_review"]);
          const { data: disputes } = await query;
          const allUserIds = [
            ...new Set((disputes || []).flatMap((d) => [d.raised_by, d.raised_against])),
          ];
          const { data: profiles } = allUserIds.length
            ? await supabase.from("profiles").select("user_id, full_name").in("user_id", allUserIds)
            : { data: [] };
          const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.full_name]));
          return {
            kind: "disputes" as const,
            rows: (disputes || []).map((d) => ({
              ...d,
              raised_by_name: nameMap[d.raised_by] || "—",
              raised_against_name: nameMap[d.raised_against] || "—",
            })),
          };
        }

        default:
          return null;
      }
    },
  });

  // Reset search when dialog type changes
  const filteredRows = useMemo(() => {
    if (!data || !("rows" in data)) return [];
    if (!search.trim()) return data.rows;
    return data.rows.filter((row: any) => matchesSearch(row, search, data.kind));
  }, [data, search]);

  if (!type) return null;

  const hasData = data && "rows" in data && data.rows.length > 0;

  return (
    <Dialog
      open={!!type}
      onOpenChange={() => {
        setSearch("");
        onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">{TITLES[type]}</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        {hasData && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={SEARCH_PLACEHOLDERS[type]}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        <div className="overflow-y-auto flex-1 min-h-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !hasData ? (
            <p className="text-muted-foreground text-center py-8">No records found.</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No results matching "{search}"
            </p>
          ) : (
            <>
              {/* Result count */}
              <p className="text-xs text-muted-foreground mb-2">
                {search.trim()
                  ? `${filteredRows.length} of ${data.rows.length} results`
                  : `${data.rows.length} total`}
              </p>

              {data.kind === "profiles" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((r: any) => (
                      <TableRow key={r.user_id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell>{r.email || "—"}</TableCell>
                        <TableCell>{r.phone || "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{r.role}</Badge></TableCell>
                        <TableCell>{r.state || "—"}</TableCell>
                        <TableCell>{r.created_at ? format(new Date(r.created_at), "dd MMM yyyy") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {data.kind === "artisanProfiles" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Trade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((r: any) => (
                      <TableRow key={r.user_id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.primary_trade}</TableCell>
                        <TableCell>
                          <Badge variant={r.verification_status === "approved" ? "default" : "secondary"}>
                            {r.verification_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.approved_at
                            ? format(new Date(r.approved_at), "dd MMM yyyy")
                            : r.created_at
                            ? format(new Date(r.created_at), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {data.kind === "jobs" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Trade</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Posted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{r.title}</TableCell>
                        <TableCell>{r.customer_name}</TableCell>
                        <TableCell>{r.trade_category}</TableCell>
                        <TableCell>
                          {r.budget_min && r.budget_max
                            ? `₦${Number(r.budget_min).toLocaleString()} – ₦${Number(r.budget_max).toLocaleString()}`
                            : "—"}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                        <TableCell>{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {data.kind === "wallets" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Referral Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((r: any) => (
                      <TableRow key={r.user_id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>₦{Number(r.balance).toLocaleString()}</TableCell>
                        <TableCell>₦{Number(r.referral_balance).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {data.kind === "disputes" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead>Raised By</TableHead>
                      <TableHead>Against</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.category}</TableCell>
                        <TableCell>{r.raised_by_name}</TableCell>
                        <TableCell>{r.raised_against_name}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "open" || r.status === "under_review" ? "destructive" : "secondary"}>
                            {r.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(r.created_at), "dd MMM yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminOverviewDetailDialog;
export type { DetailType };
