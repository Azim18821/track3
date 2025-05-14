import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to check if recommendations should be shown and manage dialog state
 */
export function useRecommendations() {
  const [shouldCheckRecommendations, setShouldCheckRecommendations] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);
  
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
  const { data, isLoading } = useQuery<{
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
  
  // Open recommendations dialog if data.show is true
  useEffect(() => {
    if (data?.show) {
      // Show the recommendations dialog after a short delay
      // to let the user see the page first
      const timer = setTimeout(() => {
        setShowRecommendations(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [data]);
  
  // Handle dialog close
  const handleDismiss = () => {
    setShowRecommendations(false);
    
    // Save dismissal date to prevent showing again today
    localStorage.setItem('recommendations_dismissed_date', new Date().toISOString());
    setShouldCheckRecommendations(false);
  };
  
  // Function to explicitly open recommendations dialog
  const openRecommendations = () => {
    setShowRecommendations(true);
    // Reset recommendation check flag to ensure we fetch fresh data
    setShouldCheckRecommendations(true);
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