import { useAuth } from "@/contexts/auth-provider.tsx";
import { Navigate, Outlet } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react"; // Import useEffect for logging

export function ProtectedRoute() {
  const { user, loading } = useAuth(); // Removed profile from destructuring

  useEffect(() => {
    console.log(`[ProtectedRoute] Render - Loading: ${loading}, User: ${user?.id ? 'Present' : 'Absent'}`);
  }, [loading, user]);

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

  // If user is logged in and not loading, render the protected content
  console.log("[ProtectedRoute] User ready, rendering Outlet.");
  return <Outlet />;
}