import { useAuth } from "@/contexts/auth-provider.tsx";
import { Navigate, Outlet } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react"; // Import useEffect for logging

export function ProtectedRoute() {
  const { user, loading, profile } = useAuth();

  useEffect(() => {
    console.log(`[ProtectedRoute] Render - Loading: ${loading}, User: ${user?.id ? 'Present' : 'Absent'}, Profile: ${profile?.id ? 'Present' : 'Absent'}, Role: ${profile?.role}`);
  }, [loading, user, profile]);

  // If authentication state is still loading (initial check), show a loading skeleton
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 w-full max-w-md p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  // If no user is logged in (and not in a loading state), redirect to login
  if (!user) {
    console.log("[ProtectedRoute] No user, redirecting to /login");
    return <Navigate to="/login" replace />;
  }

  // If user is logged in but profile hasn't loaded yet or doesn't have a role,
  // it means the profile data is not fully ready. Show a specific loading state.
  if (user && (!profile || !profile.role)) {
    console.log("[ProtectedRoute] User present but profile not ready, showing profile loading state.");
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="space-y-4 w-full max-w-md p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-96 w-full" />
            <p className="text-center text-muted-foreground">Loading user profile...</p>
        </div>
      </div>
    );
  }

  // If user is logged in and profile with a role is available, render the protected content
  console.log("[ProtectedRoute] User and profile ready, rendering Outlet.");
  return <Outlet />;
}