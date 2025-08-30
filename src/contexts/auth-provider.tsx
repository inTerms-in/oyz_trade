import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Profile } from '@/types'; // Import Profile type

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null; // Added profile to context
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
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
    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const userProfile = await getProfile(session.user.id);
        setProfile(userProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    getSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userProfile = await getProfile(session.user.id);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
        setLoading(false);
        if (event === 'SIGNED_IN') {
          navigate('/');
        }
        if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
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