import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
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
  
  const getOrCreateProfile = async (userId: string, email: string | undefined): Promise<Profile | null> => {
    console.log(`[AuthProvider] Attempting to get or create profile for user: ${userId}`);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      console.log(`[AuthProvider] Profile found for user ${userId}:`, data);
      return data as Profile;
    }

    if (error && error.code === 'PGRST116') {
      console.log(`[AuthProvider] No profile found for user ${userId}, creating one.`);
      const { data: newProfileData, error: insertError } = await supabase
        .from('profiles')
        .insert({ 
          id: userId, 
          first_name: email ? email.split('@')[0] : 'User',
          role: 'user'
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('[AuthProvider] Error creating new profile:', insertError);
        return null;
      }
      console.log(`[AuthProvider] New profile created for user ${userId}:`, newProfileData);
      return newProfileData as Profile;
    }

    if (error) {
      console.error('[AuthProvider] Error fetching profile:', error);
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    const handleAuthEvent = async (currentSession: Session | null) => {
      if (!isMounted) return;

      console.log(`[AuthProvider] Processing session:`, currentSession);
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      let userProfile: Profile | null = null;
      if (currentSession?.user) {
        userProfile = await getOrCreateProfile(currentSession.user.id, currentSession.user.email);
      }
      setProfile(userProfile);
      setLoading(false); // Ensure loading is set to false ONLY after profile is handled
    };

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log("[AuthProvider] Initial getSession result:", initialSession);
      await handleAuthEvent(initialSession);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;
        console.log(`[AuthProvider] Auth state changed via listener: ${event}`, currentSession);
        // Only re-process if the session actually changed or if it's a relevant event
        // This prevents redundant calls if handleAuthEvent already processed the initial state.
        // For SIGNED_IN/SIGNED_OUT/USER_UPDATED, we want to ensure state is fresh.
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          await handleAuthEvent(currentSession);
        }
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []); // Empty dependency array to run once on mount

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