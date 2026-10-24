import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRole: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    setUserRole(data?.role ?? null);
  };

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Inactivity auto-logout (skip if "remember me" is set)
  const resetInactivityTimer = useCallback(() => {
    const rememberMe = localStorage.getItem("jobman_remember_me") === "true";
    if (rememberMe) return;

    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      if (user) {
        signOut();
      }
    }, INACTIVITY_TIMEOUT_MS);
  }, [user, signOut]);

  useEffect(() => {
    if (!user) return;

    const rememberMe = localStorage.getItem("jobman_remember_me") === "true";
    if (rememberMe) return;

    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    const handler = () => resetInactivityTimer();

    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetInactivityTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRole(session.user.id), 0);
        } else {
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
