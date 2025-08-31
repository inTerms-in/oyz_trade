import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
// Removed Profile import

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  // Removed profile from AuthContextType
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Removed profile state
  
  // Removed fetchProfile function
  // Removed checkDefaultUserSettings function

  useEffect(() => {
    let isMounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        console.log(`[AuthProvider] Auth state changed: ${event}`, currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Removed profile fetching and setting logic
        // Removed checkDefaultUserSettings call

        setLoading(false);
        console.log("[AuthProvider] Auth state change handler finished. Loading set to false.");
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      console.log("[AuthProvider] Initial session check:", initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      // Removed profile fetching and setting logic
      // Removed checkDefaultUserSettings call

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
    // Removed profile from value
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