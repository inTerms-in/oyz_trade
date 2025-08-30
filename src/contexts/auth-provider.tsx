import { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
// Removed useNavigate as navigation will be handled by ProtectedRoute
// import { useNavigate } from 'react-router-dom'; 
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
  // Removed useNavigate
  // const navigate = useNavigate(); 
  
  const getOrCreateProfile = async (userId: string, email: string | undefined): Promise<Profile | null> => {
    console.log(`[AuthProvider] Attempting to get or create profile for user: ${userId}`);
    // Try to get existing profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      console.log(`[AuthProvider] Profile found for user ${userId}:`, data);
      return data as Profile;
    }

    if (error && error.code === 'PGRST116') { // No rows found, create a new profile
      console.log(`[AuthProvider] No profile found for user ${userId}, creating one.`);
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
        console.error('[AuthProvider] Error creating new profile:', insertError);
        return null;
      }
      console.log(`[AuthProvider] New profile created for user ${userId}:`, newProfileData);
      return newProfileData as Profile;
    }

    // Other errors during fetch
    if (error) {
      console.error('[AuthProvider] Error fetching profile:', error);
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        console.log(`[AuthProvider] Auth state changed: ${event}`, currentSession);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        let userProfile: Profile | null = null;
        if (currentSession?.user) {
          userProfile = await getOrCreateProfile(currentSession.user.id, currentSession.user.email);
        }
        setProfile(userProfile);
        setLoading(false); // Set loading to false only after profile is handled

        // Removed navigation logic from here
        // if (event === 'SIGNED_IN') {
        //   navigate('/');
        // }
        // if (event === 'SIGNED_OUT') {
        //   navigate('/login');
        // }
      }
    );

    // Also fetch initial session on mount, in case onAuthStateChange doesn't fire immediately
    // or if the component mounts after the initial onAuthStateChange event.
    // This ensures `loading` is correctly set to false after the initial state is known.
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      console.log("[AuthProvider] Initial session check:", initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      let userProfile: Profile | null = null;
      if (initialSession?.user) {
        userProfile = await getOrCreateProfile(initialSession.user.id, initialSession.user.email);
      }
      setProfile(userProfile);
      setLoading(false);
    });


    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []); // Removed navigate from dependency array

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