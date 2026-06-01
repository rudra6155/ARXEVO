"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Initial fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Do not show the floating "My Arc" nav on the profile page itself, since it already has a prominent nav
  const showGlobalNav = user && pathname !== "/profile";

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {showGlobalNav && (
        <div style={{ position: "fixed", top: "24px", right: "24px", zIndex: 9999 }}>
          <Link
            href="/profile"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#b8960c",
              background: "#111109",
              border: "1px solid #2a2820",
              padding: "10px 20px",
              textDecoration: "none",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#b8960c"; e.currentTarget.style.color = "#e8e0d0"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2a2820"; e.currentTarget.style.color = "#b8960c"; }}
          >
            My Arc
          </Link>
        </div>
      )}
      {children}
    </AuthContext.Provider>
  );
}
