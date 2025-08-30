import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client

function Login() {
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
            // Removed custom variables and theme="light" to ensure view="sign_in" takes precedence
          }}
          view="sign_in" 
        />
      </div>
    </div>
  );
}

export default Login; // Export as default