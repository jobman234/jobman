import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ScrollText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const AdminAuditLog = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data as unknown as AuditLog[]) ?? [];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="text-center py-12">
        <ScrollText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No audit logs yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div key={log.id} className="bg-card rounded-lg border border-border px-4 py-3 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{log.action.replace(/_/g, " ")}</span>
              {" on "}
              <span className="text-muted-foreground">{log.entity_type}</span>
              {log.entity_id && (
                <span className="text-xs text-muted-foreground ml-1">({log.entity_id.slice(0, 8)}...)</span>
              )}
            </p>
            {log.details && Object.keys(log.details as object).length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {Object.entries(log.details as object).map(([k, v]) => `${k}: ${v}`).join(" · ")}
              </p>
            )}
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  );
};

export default AdminAuditLog;
