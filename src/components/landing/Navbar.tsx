import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, MessageCircle, LogOut } from "lucide-react";
import jobmanLogo from "@/assets/jobman-logo.png";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const navLinks = [
  { label: "About", href: "#about" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Services", href: "#services" },
  { label: "Why Us", href: "#why-us" },
  { label: "Testimonials", href: "#testimonials" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={jobmanLogo} alt="Jobman logo" className="h-28 w-auto" />
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/dashboard">Dashboard</Link>
              </Button>
              <Button variant="ghost" size="icon" className="relative" asChild>
                <Link to="/assistant">
                  <MessageCircle className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profile">Profile</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive">
                <LogOut className="w-4 h-4 mr-1.5" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button size="sm" className="bg-gradient-hero hover:opacity-90 text-primary-foreground" asChild>
                <Link to="/register">Get Started</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-background border-b border-border overflow-hidden"
          >
            <div className="container px-4 py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex items-center gap-3 pt-3 border-t border-border">
                <ThemeToggle />
                <NotificationBell />
                {user ? (
                  <>
                    <Button variant="ghost" size="sm" className="flex-1" asChild>
                      <Link to="/dashboard">Dashboard</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/assistant">
                        <MessageCircle className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" asChild>
                      <Link to="/profile">Profile</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { handleLogout(); setMobileOpen(false); }} className="text-destructive hover:text-destructive">
                      <LogOut className="w-4 h-4 mr-1.5" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="flex-1" asChild>
                      <Link to="/login">Sign In</Link>
                    </Button>
                    <Button size="sm" className="flex-1 bg-gradient-hero text-primary-foreground" asChild>
                      <Link to="/register">Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
