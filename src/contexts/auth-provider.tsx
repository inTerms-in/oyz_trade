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
  
  // Function to fetch user profile
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    console.log(`[AuthProvider] Attempting to fetch profile for user: ${userId}`);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is handled by returning null
        console.error(`[AuthProvider] Error fetching profile for user ${userId}:`, error);
        return null;
      }
      if (data) {
        console.log(`[AuthProvider] Profile found for user ${userId}:`, data);
        return data as Profile;
      }
      console.log(`[AuthProvider] No profile found for user ${userId}.`);
      return null;
    } catch (e) {
      console.error(`[AuthProvider] Exception in fetchProfile for user ${userId}:`, e);
      return null;
    }
  };

  // Function to check if default settings and shop exist (assuming trigger creates them)
  const checkDefaultUserSettings = async (userId: string) => {
    console.log(`[AuthProvider] Checking default user settings for user: ${userId}`);
    try {
      // Check settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('[AuthProvider] Error checking existing settings:', settingsError);
      } else if (!settingsData) {
        console.warn(`[AuthProvider] Default settings not found for user ${userId}. This might indicate a trigger issue.`);
      } else {
        console.log(`[AuthProvider] Default settings found for user ${userId}.`);
      }

      // Check shop details
      const { data: shopData, error: shopError } = await supabase
        .from('shop')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (shopError && shopError.code !== 'PGRST116') {
        console.error('[AuthProvider] Error checking existing shop details:', shopError);
      } else if (!shopData) {
        console.warn(`[AuthProvider] Default shop details not found for user ${userId}. This might indicate a trigger issue.`);
      } else {
        console.log(`[AuthProvider] Default shop details found for user ${userId}.`);
      }
    } catch (e) {
      console.error('[AuthProvider] Exception in checkDefaultUserSettings:', e);
    }
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
          userProfile = await fetchProfile(currentSession.user.id);
          await checkDefaultUserSettings(currentSession.user.id); // Check, don't create
        }
        setProfile(userProfile);
        setLoading(false);
        console.log("[AuthProvider] Auth state change handler finished. Loading set to false.");
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      console.log("[AuthProvider] Initial session check:", initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      let userProfile: Profile | null = null;
      if (initialSession?.user) {
        userProfile = await fetchProfile(initialSession.user.id);
        await checkDefaultUserSettings(initialSession.user.id); // Check, don't create
      }
      setProfile(userProfile);
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