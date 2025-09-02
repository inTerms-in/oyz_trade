import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'USER_UPDATED' || event === 'SIGNED_IN') {
      const { error } = await supabase.auth.getSession();
      // Other code here
    }
    if (event === 'SIGNED_OUT') {
      // Other code here
    }
  });

  return () => subscription.unsubscribe();
}, []);