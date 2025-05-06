import { ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOnboardingCheck } from "@/hooks/use-onboarding-check";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

/**
 * A wrapper component that checks if a user has completed onboarding
 * and redirects to onboarding flow if not completed
 * 
 * Ensures checks run on every mount and route change, using fresh data
 */
export function ProfileCheckRedirect({ 
  children,
  skipCheck = false
}: { 
  children: ReactNode;
  skipCheck?: boolean;
}) {
  const { user, isLoading: authLoading } = useAuth();
  // Tell the hook to always check on mount with fresh data
  const { isCompleted, isLoading: onboardingLoading } = useOnboardingCheck(skipCheck);
  const [location, navigate] = useLocation();
  
  // Force a fresh check on route changes
  useEffect(() => {
    if (user && !skipCheck) {
      console.log(`Route changed to ${location}, checking onboarding status`);
      // This will trigger a refetch through Query invalidation
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
    }
  }, [location, user, skipCheck]);
  
  // Handle redirection with priority over all other effects
  useEffect(() => {
    if (!skipCheck && !onboardingLoading && !isCompleted && user) {
      console.log("User hasn't completed onboarding. Redirecting to /onboarding");
      // Use replace instead of navigate to prevent back button from returning to protected route
      if (location !== '/onboarding') {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [skipCheck, onboardingLoading, isCompleted, navigate, user, location]);
  
  // If we're loading auth or onboarding status, show a loading indicator
  if (authLoading || (onboardingLoading && !skipCheck)) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Immediate redirection if user hasn't completed onboarding
  if (!skipCheck && !isCompleted && user && location !== '/onboarding') {
    console.log("User hasn't completed onboarding. Redirecting and not rendering children.");
    // Just in case the effect hasn't triggered yet
    navigate('/onboarding', { replace: true });
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Check is skipped or user has completed onboarding, so render children
  return <>{children}</>;
}