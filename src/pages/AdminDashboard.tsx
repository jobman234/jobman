import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/landing/Navbar";
import { Loader2, LayoutDashboard, ShieldCheck, Users, Scale, ScrollText, MessageSquare, Gift, Inbox, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminVerifications from "@/components/admin/AdminVerifications";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminDisputes from "@/components/admin/AdminDisputes";
import AdminAuditLog from "@/components/admin/AdminAuditLog";
import AdminContacts from "@/components/admin/AdminContacts";
import AdminReferrals from "@/components/admin/AdminReferrals";
import AdminRequests from "@/components/admin/AdminRequests";
import AdminWithdrawals from "@/components/admin/AdminWithdrawals";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "requests", label: "Requests", icon: Inbox },
  { id: "verifications", label: "Verifications", icon: ShieldCheck },
  { id: "withdrawals", label: "Withdrawals", icon: Banknote },
  { id: "users", label: "Users", icon: Users },
  { id: "referrals", label: "Referrals", icon: Gift },
  { id: "disputes", label: "Disputes", icon: Scale },
  { id: "contacts", label: "Contacts", icon: MessageSquare },
  { id: "audit", label: "Audit Log", icon: ScrollText },
] as const;

type TabId = typeof TABS[number]["id"];

const AdminDashboard = () => {
  const { user, loading, userRole } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (userRole !== "admin" && userRole !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage users, verifications, and platform activity.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1 w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && <AdminOverview />}
        {activeTab === "requests" && <AdminRequests />}
        {activeTab === "verifications" && <AdminVerifications />}
        {activeTab === "withdrawals" && <AdminWithdrawals />}
        {activeTab === "users" && <AdminUsers />}
        {activeTab === "referrals" && <AdminReferrals />}
        {activeTab === "disputes" && <AdminDisputes />}
        {activeTab === "contacts" && <AdminContacts />}
        {activeTab === "audit" && <AdminAuditLog />}
      </main>
    </div>
  );
};

export default AdminDashboard;
