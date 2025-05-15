import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to check if recommendations should be shown and manage dialog state
 */
export function useRecommendations() {
  const [shouldCheckRecommendations, setShouldCheckRecommendations] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [autoShowChecked, setAutoShowChecked] = useState(false);
  
  // Check if user has dismissed recommendations today
  useEffect(() => {
    const lastDismissed = localStorage.getItem('recommendations_dismissed_date');
    
    if (lastDismissed) {
      const today = new Date().toISOString().split('T')[0];
      const dismissedDate = new Date(lastDismissed).toISOString().split('T')[0];
      
      // If recommendations were dismissed today, don't check again
      if (today === dismissedDate) {
        setShouldCheckRecommendations(false);
      }
    }
  }, []);
  
  // Query to check if recommendations should be shown
  const { data, isLoading, refetch } = useQuery<{
    show: boolean;
    recommendations?: any;
    message?: string;
  }>({
    queryKey: ['/api/recommendations/daily'],
    enabled: shouldCheckRecommendations,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  
  // Open recommendations dialog if data.show is true - but only do this ONCE automatically
  useEffect(() => {
    // Only auto-show recommendations once per page load
    if (data?.show && data?.recommendations && !autoShowChecked && shouldCheckRecommendations) {
      setAutoShowChecked(true); // Mark that we've checked for auto-showing
      
      // Show the recommendations dialog after a short delay
      // to let the user see the page first
      const timer = setTimeout(() => {
        setShowRecommendations(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [data, autoShowChecked, shouldCheckRecommendations]);
  
  // Handle dialog close
  const handleDismiss = () => {
    setShowRecommendations(false);
    
    // Save dismissal date to prevent showing again today
    localStorage.setItem('recommendations_dismissed_date', new Date().toISOString());
    setShouldCheckRecommendations(false);
  };
  
  // Function to explicitly open recommendations dialog (when user clicks the button)
  const openRecommendations = async () => {
    // Manually trigger a refetch if we're opening the dialog via button click
    if (!shouldCheckRecommendations) {
      setShouldCheckRecommendations(true);
      await refetch();
    }
    
    // Open the dialog - data will be handled by the DailyRecommendationsDialog component
    setShowRecommendations(true);
  };
  
  // Explicitly type the return object
  return {
    showRecommendations,
    setShowRecommendations: handleDismiss,
    openRecommendations,
    isLoading,
    hasRecommendations: data?.show === true,
    recommendations: data?.recommendations,
  };
}