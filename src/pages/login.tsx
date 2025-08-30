import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from "@/integrations/supabase/client"; // Import supabase client

export default function Login() {
  // Other code here
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted">
      <div className="w-full max-w-md p-8 space-y-4 bg-background rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center text-primary mb-6">Welcome to PurchaseTracker</h1>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                },
              },
            },
          }}
          theme="light"
        />
      </div>
    </div>
  );
}