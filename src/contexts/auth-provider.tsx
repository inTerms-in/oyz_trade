import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Profile } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: Profile | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();
  
  const getOrCreateProfile = async (userId: string, email: string | undefined): Promise<Profile | null> => {
    // Try to get existing profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      return data as Profile;
    }

    if (error && error.code === 'PGRST116') { // No rows found, create a new profile
      console.log(`No profile found for user ${userId}, creating one.`);
      const { data: newProfileData, error: insertError } = await supabase
        .from('profiles')
        .insert({ 
          id: userId, 
          first_name: email ? email.split('@')[0] : 'User', // Use email part as default name
          role: 'user' // Default role
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Error creating new profile:', insertError);
        return null;
      }
      return newProfileData as Profile;
    }

    // Other errors during fetch
    if (error) {
      console.error('Error fetching profile:', error);
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        let userProfile: Profile | null = null;
        if (currentSession?.user) {
          userProfile = await getOrCreateProfile(currentSession.user.id, currentSession.user.email);
        }
        setProfile(userProfile);
        setLoading(false); // Set loading to false only after profile is handled

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
  }, [navigate]);

  const value = {
    session,
    user,
    loading,
    profile,
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