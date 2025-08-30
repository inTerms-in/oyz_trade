import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Profile } from '@/types'; // Import Profile type

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean; // This will be true only during initial load
  profile: Profile | null; // Added profile to context
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Initial loading state
  const [profile, setProfile] = useState<Profile | null>(null); // New state for profile
  const navigate = useNavigate();
  
  const getProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error('Error fetching profile:', error);
      return null;
    }
    return data as Profile;
  };

  useEffect(() => {
    let isMounted = true; // To prevent state updates on unmounted component

    const setupAuth = async () => {
      // 1. Initial session and profile fetch
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (isMounted) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          const userProfile = await getProfile(initialSession.user.id);
          if (isMounted) setProfile(userProfile);
        } else {
          if (isMounted) setProfile(null);
        }
        if (isMounted) setLoading(false); // Set loading to false after initial fetch
      }

      // 2. Set up auth state change listener
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event, currentSession) => {
          if (!isMounted) return;

          setSession(currentSession);
          setUser(currentSession?.user ?? null);

          if (currentSession?.user) {
            const userProfile = await getProfile(currentSession.user.id);
            setProfile(userProfile);
          } else {
            setProfile(null);
          }
          // Removed setLoading(false) from here.
          // The `loading` state is now only for the initial check.

          if (event === 'SIGNED_IN') {
            navigate('/');
          }
          if (event === 'SIGNED_OUT') {
            navigate('/login');
          }
        }
      );

    return () => {
        isMounted = false;
        authListener.subscription.unsubscribe();
      };
    };

    setupAuth();

  }, [navigate]);

  const value = {
    session,
    user,
    loading,
    profile, // Provide profile in context
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