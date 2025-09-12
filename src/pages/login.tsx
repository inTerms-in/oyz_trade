import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-provider'; // Import useAuth

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      // Redirect to the dashboard if the user is logged in
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            // You can add custom styles here if needed, e.g.,
            // variables: {
            //   default: {
            //     colors: {
            //       brand: 'hsl(var(--primary))',
            //       brandAccent: 'hsl(var(--primary-foreground))',
            //     },
            //   },
            // },
          }}
          theme="light"
          view="sign_in" // Ensures only the sign-in form is shown
        />
      </div>
    </div>
  );
}