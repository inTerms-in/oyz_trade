import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    let isMounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        console.log(`[AuthProvider] Auth state changed: ${event}`, currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        setLoading(false);
        console.log("[AuthProvider] Auth state change handler finished. Loading set to false.");

        // Explicitly navigate to the dashboard if logged in and currently on the login page
        if (event === 'SIGNED_IN' && currentSession?.user && window.location.pathname === '/login') {
          console.log("[AuthProvider] SIGNED_IN event on login page, navigating to /");
          window.location.href = '/'; // Force a full reload to the root
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      console.log("[AuthProvider] Initial session check:", initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      setLoading(false);
      console.log("[AuthProvider] Initial session check finished. Loading set to false.");
    }).catch(e => {
      console.error("[AuthProvider] Error during initial session fetch:", e);
      setLoading(false); // Ensure loading is set to false even on error
    });


    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}