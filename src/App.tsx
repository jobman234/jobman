import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import ArtisanVerification from "./pages/ArtisanVerification";
import MyJobs from "./pages/MyJobs";
import JobDetail from "./pages/JobDetail";
import Assistant from "./pages/Assistant";
import WalletPage from "./pages/WalletPage";
import AdminDashboard from "./pages/AdminDashboard";
import FindArtisan from "./pages/FindArtisan";
import SavedArtisans from "./pages/SavedArtisans";
import ArtisanProfile from "./pages/ArtisanProfile";
import ProfileSettings from "./pages/ProfileSettings";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import Notifications from "./pages/Notifications";
import DisputeResolution from "./pages/DisputeResolution";
import LegalNotice from "./pages/LegalNotice";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import HelpCenter from "./pages/HelpCenter";
import ContactUs from "./pages/ContactUs";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/verify" element={<ArtisanVerification />} />
            <Route path="/assistant" element={<Assistant />} />
            <Route path="/jobs" element={<MyJobs />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/wallet" element={<WalletPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/find-artisan" element={<FindArtisan />} />
            <Route path="/saved-artisans" element={<SavedArtisans />} />
            <Route path="/artisan/:userId" element={<ArtisanProfile />} />
            <Route path="/profile" element={<ProfileSettings />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/dispute-resolution" element={<DisputeResolution />} />
            <Route path="/legal" element={<LegalNotice />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/contact" element={<ContactUs />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
