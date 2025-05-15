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
  
  // State to store manually fetched recommendations
  const [forcedRecommendations, setForcedRecommendations] = useState<any>(null);

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
    if (data?.show && data?.recommendations) {
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
  const openRecommendations = async () => {
    // Make a special request that forces recommendations to show
    try {
      console.log('Requesting forced recommendations');
      const response = await fetch('/api/recommendations/daily?force=true');
      console.log('Recommendations response status:', response.status);
      const data = await response.json();
      console.log('Recommendations response data:', data);
      
      if (data.show && data.recommendations) {
        console.log('Setting forced recommendations and showing dialog');
        // Store the forced recommendations
        setForcedRecommendations(data.recommendations);
        // IMPORTANT: directly set the state instead of using handleDismiss
        // which would actually close the dialog
        setTimeout(() => {
          setShowRecommendations(true);
          console.log('Dialog should be open now, showRecommendations =', true);
        }, 100);
      } else {
        // If we can't show recommendations, display the reason
        console.log('Cannot show recommendations:', data.message);
        alert(data.message || 'No recommendations available');
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      alert('Failed to load recommendations. Please try again later.');
    }
  };
  
  // Explicitly type the return object
  return {
    showRecommendations,
    // Provide a direct setter for the dialog component
    setShowRecommendations: (value: boolean) => {
      console.log('setShowRecommendations called with value:', value);
      if (value === false) {
        // Only run handleDismiss logic when closing the dialog
        handleDismiss();
      } else {
        // Just set the state when opening the dialog
        setShowRecommendations(value);
      }
    },
    openRecommendations,
    isLoading,
    hasRecommendations: data?.show === true || !!forcedRecommendations,
    // Use forced recommendations if available, otherwise use data recommendations
    recommendations: forcedRecommendations || data?.recommendations,
  };
}