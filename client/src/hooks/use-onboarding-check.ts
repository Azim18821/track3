import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";

/**
 * Hook to check onboarding status and redirect if needed
 * @param skipCheck - If true, skip the check and avoid redirects
 * @returns Object containing the onboarding status
 */
export function useOnboardingCheck(skipCheck: boolean = false) {
  const [, navigate] = useLocation();
  
  // Query the onboarding status from the API with real-time data
  const {
    data: onboardingStatus,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['/api/onboarding/status'],
    queryFn: async () => {
      if (skipCheck) return { completed: true, analysisAcknowledged: true };
      // Add timestamp to avoid browser caching
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/onboarding/status?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        // Include credentials to ensure we get the user's actual data
        credentials: 'include'
      });
      if (!res.ok) {
        throw new Error('Failed to check onboarding status');
      }
      return res.json();
    },
    retry: 1,
    refetchOnWindowFocus: true, // Always recheck when window gets focus
    refetchOnMount: true, // Always recheck when component mounts
    refetchOnReconnect: true, // Recheck when reconnecting
    staleTime: 0 // Consider data always stale to force refetch
  });
  
  // Redirect to onboarding if status check succeeds but onboarding is not complete
  useEffect(() => {
    if (!skipCheck && !isLoading && onboardingStatus && !onboardingStatus.completed) {
      const location = window.location.pathname;
      if (location !== '/onboarding') {
        console.log(`useOnboardingCheck: Redirecting from ${location} to /onboarding`);
        navigate('/onboarding', { replace: true });
      }
    }
  }, [onboardingStatus, isLoading, navigate, skipCheck]);
  
  // Invalidate related queries when onboarding status changes
  useEffect(() => {
    if (onboardingStatus) {
      // Invalidate user profile data to force a refresh of any dependent components
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
    }
  }, [onboardingStatus?.completed, onboardingStatus?.analysisAcknowledged]);
  
  // Return the status for the component to use
  return {
    isCompleted: onboardingStatus?.completed || false,
    isAnalysisAcknowledged: onboardingStatus?.analysisAcknowledged || false,
    isLoading,
    isError,
    error,
    data: onboardingStatus?.data
  };
}