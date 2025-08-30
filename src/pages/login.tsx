import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth-provider';
import { useNavigate } from 'react-router-dom';

function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[Login Page useEffect] Current state - Loading:", loading, "User:", user ? "Present" : "Absent");
    // If not loading and user is authenticated, redirect to dashboard
    if (!loading && user) {
      console.log("[Login Page] User authenticated, attempting redirection to /");
      // Add a small delay to ensure the Supabase UI has fully rendered/processed its state
      // before we force a navigation. This can help with race conditions.
      const timer = setTimeout(() => {
        navigate('/', { replace: true });
        console.log("[Login Page] Navigation to / executed.");
      }, 100); // 100ms delay

      return () => clearTimeout(timer); // Cleanup the timer if component unmounts
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-foreground">Welcome Back!</h1>
        <p className="text-center text-muted-foreground">Sign in to manage your purchases and sales.</p>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
          }}
          view="sign_in" 
          showLinks={false}
        />
      </div>
    </div>
  );
}

export default Login;