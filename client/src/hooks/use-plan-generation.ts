/**
 * React Hook for Plan Generation
 * Provides a convenient way to use plan generation features in React components
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, UseMutationResult } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { queryClient } from '@/lib/queryClient';
import {
  PlanGenerationParams,
  startPlanGeneration,
  checkPlanGenerationProgress,
  cancelPlanGeneration,
  getActiveFitnessPlan,
  getProgressPercentage,
  formatTimeRemaining
} from '@/services/planGenerationService';
import type { FitnessPlan, PlanGenerationProgress } from '@shared/schema';

/**
 * Custom hook for fitness plan generation
 */
export function usePlanGeneration() {
  const { toast } = useToast();
  const [isPolling, setIsPolling] = useState(false);
  
  // Query for checking generation progress
  const progressQuery = useQuery<PlanGenerationProgress>({
    queryKey: ['/api/fitness-plans/progress'],
    queryFn: checkPlanGenerationProgress,
    enabled: false, // Don't fetch on mount
    refetchInterval: isPolling ? 3000 : false // Poll when active
  });
  
  // Query for getting the active plan
  const activePlanQuery = useQuery<FitnessPlan>({
    queryKey: ['/api/fitness-plans/active'],
    queryFn: getActiveFitnessPlan,
    enabled: false // Don't fetch on mount
  });
  
  // Mutation for starting plan generation
  const startGenerationMutation = useMutation({
    mutationFn: startPlanGeneration,
    onSuccess: () => {
      toast({
        title: "Plan generation started",
        description: "We're creating your personalized fitness plan. This may take a few minutes.",
      });
      
      // Start polling for progress
      setIsPolling(true);
      progressQuery.refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start plan generation",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation for cancelling plan generation
  const cancelGenerationMutation = useMutation({
    mutationFn: cancelPlanGeneration,
    onSuccess: () => {
      toast({
        title: "Plan generation cancelled",
        description: "Plan generation has been cancelled.",
      });
      
      // Stop polling and reset progress
      setIsPolling(false);
      progressQuery.refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel plan generation",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Check for progress completion
  useEffect(() => {
    const progress = progressQuery.data;
    
    if (progress && !progress.isGenerating && !progress.errorMessage) {
      // The generation has completed, stop polling
      setIsPolling(false);
      
      // Refresh the active plan
      activePlanQuery.refetch();
      
      // Show toast
      toast({
        title: "Plan generation complete!",
        description: "Your personalized fitness plan is ready.",
      });
    } else if (progress && !progress.isGenerating && progress.errorMessage) {
      // The generation failed
      setIsPolling(false);
      
      toast({
        title: "Plan generation failed",
        description: progress.errorMessage,
        variant: "destructive",
      });
    }
  }, [progressQuery.data, toast]);
  
  // Function to check if the user has an active plan
  const checkActivePlan = useCallback(() => {
    activePlanQuery.refetch();
  }, [activePlanQuery]);
  
  // Function to check current progress
  const checkProgress = useCallback(() => {
    progressQuery.refetch();
  }, [progressQuery]);
  
  // Helper functions for the progress data
  const getFormattedProgress = useCallback(() => {
    const progress = progressQuery.data;
    if (!progress) return null;
    
    return {
      ...progress,
      percentComplete: getProgressPercentage(progress),
      timeRemainingText: formatTimeRemaining(progress.estimatedTimeRemaining),
      isComplete: !progress.isGenerating && !progress.errorMessage,
      hasFailed: !progress.isGenerating && !!progress.errorMessage
    };
  }, [progressQuery.data]);
  
  return {
    // Mutations
    startGenerationMutation,
    cancelGenerationMutation,
    
    // Queries
    progressQuery,
    activePlanQuery,
    
    // Helper functions
    checkActivePlan,
    checkProgress,
    getFormattedProgress,
    
    // Status flags
    isGenerating: isPolling,
  };
}