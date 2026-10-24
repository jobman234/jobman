import { useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Briefcase, MapPin, Banknote, ArrowLeft, ClipboardList, Search, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-info/10 text-info border-info/30" },
  in_negotiation: { label: "In Negotiation", className: "bg-warning/10 text-warning border-warning/30" },
  agreed: { label: "Agreed", className: "bg-primary/10 text-primary border-primary/30" },
  in_progress: { label: "In Progress", className: "bg-primary/10 text-primary border-primary/30" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground border-border" },
};

const ACTIVE_STATUSES = ["open", "in_negotiation", "agreed", "in_progress"];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const formatBudget = (min: number | null, max: number | null) => {
  if (min && max) return `₦${min.toLocaleString()} – ₦${max.toLocaleString()}`;
  if (min) return `From ₦${min.toLocaleString()}`;
  if (max) return `Up to ₦${max.toLocaleString()}`;
  return "Budget flexible";
};

const PAGE_SIZE = 20;

const MyJobs = () => {
  const { user, loading: authLoading } = useAuth();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [statusFilter, setStatusFilter] = useState<FilterKey>("all");
  const [searchTerm, setSearchTerm] = useState("");

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

  const selectFilter = (key: FilterKey) => {
    setStatusFilter(key);
    setLimit(PAGE_SIZE);
  };

  const { data: jobsPage, isLoading } = useQuery({
    queryKey: ["my-jobs", user?.id, limit, statusFilter, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("jobs_safe")
        .select("*")
        .or(`customer_id.eq.${user!.id},assigned_artisan_id.eq.${user!.id}`);

      if (statusFilter === "active") {
        query = query.in("status", ACTIVE_STATUSES);
      } else if (statusFilter === "completed") {
        query = query.eq("status", "completed");
      } else if (statusFilter === "cancelled") {
        query = query.eq("status", "cancelled");
      }

      if (debouncedSearch) {
        // Escape LIKE wildcards, then quote per PostgREST's or() syntax.
        const escaped = debouncedSearch.replace(/[%_]/g, "\\$&").replace(/"/g, '\\"');
        const term = `"%${escaped}%"`;
        query = query.or(`title.ilike.${term},trade_category.ilike.${term}`);
      }

      const { data, error } = await query
        .order("updated_at", { ascending: false })
        .range(0, limit);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const hasMore = (jobsPage?.length ?? 0) > limit;
  const jobs = jobsPage?.slice(0, limit);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const isFiltered = statusFilter !== "all" || debouncedSearch.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-3xl mx-auto">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-4">My Jobs</h1>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
            <div className="flex gap-1.5 flex-wrap">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => selectFilter(f.key)}
                  className={cn(
                    "text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
                    statusFilter === f.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:border-primary/40"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative sm:ml-auto sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Search by title or trade..."
                className="pl-8 pr-8 h-9 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => updateSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !jobs?.length ? (
            <div className="text-center py-16 bg-card rounded-2xl border border-border">
              <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">
                {isFiltered ? "No jobs match your filters" : "No jobs yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isFiltered
                  ? "Try a different status or search term."
                  : "Jobs appear here once the Jobman team matches a request to an artisan."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const s = STATUS_STYLE[job.status] ?? STATUS_STYLE.open;
                return (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="block bg-card rounded-xl border border-border p-4 sm:p-5 hover:shadow-md hover:border-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h2 className="font-display font-semibold text-foreground truncate">{job.title}</h2>
                          <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0", s.className)}>
                            {s.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" /> {job.trade_category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Banknote className="w-3.5 h-3.5" />
                            {job.agreed_price ? `₦${Number(job.agreed_price).toLocaleString()}` : formatBudget(job.budget_min, job.budget_max)}
                          </span>
                          {job.location_state && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {job.location_lga ? `${job.location_lga}, ` : ""}{job.location_state}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(job.updated_at), { addSuffix: true })}
                      </span>
                    </div>
                  </Link>
                );
              })}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setLimit((l) => l + PAGE_SIZE)}
                    className="text-sm font-medium text-primary hover:underline px-4 py-2"
                  >
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyJobs;
