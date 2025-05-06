import { useAuth } from "../hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

export function ProtectedRoute({ path, component: Component }: ProtectedRouteProps) {
  return (
    <Route path={path}>
      {(params) => {
        const { user, isLoading } = useAuth();
        
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }
        
        if (!user) {
          return <Redirect to="/auth" />;
        }
        
        if (!user.isApproved) {
          return <Redirect to="/auth" />;
        }
        
        // Pass URL parameters to the component
        return <Component {...params} />;
      }}
    </Route>
  );
}