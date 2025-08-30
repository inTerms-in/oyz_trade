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

  // Function to create default settings and shop for a new user
  const createDefaultUserSettings = async (userId: string) => {
    // Check if settings already exist
    const { data: existingSettings, error: settingsError } = await supabase
      .from('settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (settingsError && settingsError.code === 'PGRST116') { // No settings found, create default
      const { error: insertSettingsError } = await supabase
        .from('settings')
        .insert({ user_id: userId, financial_year_start_month: 4 }); // Default to April
      if (insertSettingsError) {
        console.error('[AuthProvider] Error creating default settings:', insertSettingsError);
      } else {
        console.log(`[AuthProvider] Default settings created for user ${userId}.`);
      }
    } else if (settingsError) {
      console.error('[AuthProvider] Error checking existing settings:', settingsError);
    }

    // Check if shop details already exist
    const { data: existingShop, error: shopError } = await supabase
      .from('shop')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (shopError && shopError.code === 'PGRST116') { // No shop details found, create default
      const { error: insertShopError } = await supabase
        .from('shop')
        .insert({ user_id: userId, shop_name: 'My Shop' }); // Default shop name
      if (insertShopError) {
        console.error('[AuthProvider] Error creating default shop details:', insertShopError);
      } else {
        console.log(`[AuthProvider] Default shop details created for user ${userId}.`);
      }
    } else if (shopError) {
      console.error('[AuthProvider] Error checking existing shop details:', shopError);
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
          userProfile = await getOrCreateProfile(currentSession.user.id, currentSession.user.email);
          // Also ensure default settings and shop details are created
          await createDefaultUserSettings(currentSession.user.id);
        }
        setProfile(userProfile);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      console.log("[AuthProvider] Initial session check:", initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      let userProfile: Profile | null = null;
      if (initialSession?.user) {
        userProfile = await getOrCreateProfile(initialSession.user.id, initialSession.user.email);
        await createDefaultUserSettings(initialSession.user.id);
      }
      setProfile(userProfile);
      setLoading(false);
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