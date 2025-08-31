import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth-provider'; // Import useAuth
import { useNavigate } from 'react-router-dom'; // Import useNavigate

function Login() {
  const { user, loading } = useAuth(); // Get user and loading state from AuthContext
  const navigate = useNavigate();

  useEffect(() => {
    // If not loading and user is authenticated, redirect to dashboard
    if (!loading && user) {
      console.log("[Login Page] User authenticated, redirecting to /");
      navigate('/', { replace: true }); // Use replace to prevent going back to login page
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
          showLinks={false} // Strictly hide all links, including signup
        />
      </div>
    </div>
  );
}

export default Login;