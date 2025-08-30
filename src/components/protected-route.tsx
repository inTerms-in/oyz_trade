import { useAuth } from "@/contexts/auth-provider.tsx";
import { Navigate, Outlet } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute() {
  const { user, loading, profile } = useAuth(); // Destructure profile

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

  // If user is not logged in OR user is logged in but no profile (and thus no role) is found, redirect to login
  if (!user || !profile?.role) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}