/**
 * Plan Generation Progress
 * Component that shows the current status of plan generation
 */

import React, { useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { usePlanGeneration } from "@/hooks/use-plan-generation";

/**
 * PlanGenerationProgress component displays the current status of plan generation
 * @param onComplete - Callback for when the plan generation is complete
 * @param onCancel - Callback for when the user cancels the plan generation
 */
export function PlanGenerationProgress({
  onComplete,
  onCancel,
}: {
  onComplete?: () => void;
  onCancel?: () => void;
}) {
  const {
    progressQuery,
    cancelGenerationMutation,
    getFormattedProgress,
    checkProgress,
    isGenerating,
  } = usePlanGeneration();

  // Start polling for progress updates when the component mounts
  useEffect(() => {
    // Check progress immediately
    checkProgress();
    
    // Set up interval for continuous polling
    const pollingInterval = setInterval(() => {
      checkProgress();
    }, 3000);

    // Clean up interval on unmount
    return () => clearInterval(pollingInterval);
  }, [checkProgress]);

  // Handle completion
  useEffect(() => {
    const formattedProgress = getFormattedProgress();
    if (formattedProgress?.isComplete && onComplete) {
      onComplete();
    }
  }, [progressQuery.data, getFormattedProgress, onComplete]);

  // Handle cancel button click
  const handleCancel = async () => {
    try {
      await cancelGenerationMutation.mutateAsync();
      if (onCancel) onCancel();
    } catch (error) {
      console.error("Error cancelling plan generation:", error);
    }
  };

  // Show loading state if we're still fetching the initial progress
  if (progressQuery.isLoading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Checking Plan Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading your plan generation status...</p>
        </CardContent>
      </Card>
    );
  }

  // Get formatted progress data
  const progress = getFormattedProgress();

  // Handle error state
  if (progressQuery.isError) {
    return (
      <Card className="w-full max-w-md border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <XCircle className="h-5 w-5 mr-2" />
            Error Checking Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>There was a problem checking your plan generation status.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {progressQuery.error instanceof Error
              ? progressQuery.error.message
              : "Unknown error occurred"}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => checkProgress()}>Retry</Button>
        </CardFooter>
      </Card>
    );
  }

  // If no progress data or the generation has failed
  if (!progress || progress.hasFailed) {
    return (
      <Card className="w-full max-w-md border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <XCircle className="h-5 w-5 mr-2" />
            Plan Generation Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>There was a problem generating your fitness plan.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {progress?.errorMessage || "Unknown error occurred"}
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={onCancel}>Try Again</Button>
        </CardFooter>
      </Card>
    );
  }

  // If the plan is complete
  if (progress.isComplete) {
    return (
      <Card className="w-full max-w-md border-success">
        <CardHeader>
          <CardTitle className="flex items-center text-success">
            <CheckCircle className="h-5 w-5 mr-2" />
            Plan Generation Complete!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Your personalized fitness plan is ready to view.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={onComplete}>View My Plan</Button>
        </CardFooter>
      </Card>
    );
  }

  // Default case: Show the progress
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          {isGenerating ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Generating Your Plan
            </>
          ) : (
            <>
              <Clock className="h-5 w-5 mr-2" />
              Waiting to Start
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>{progress.stepMessage}</span>
            <span>{progress.percentComplete}%</span>
          </div>
          <Progress value={progress.percentComplete} className="h-2" />
        </div>
        <p className="text-sm text-muted-foreground">
          Step {progress.currentStep} of {progress.totalSteps} • {progress.timeRemainingText}
        </p>
        <p className="text-sm">
          We're using AI to create your personalized fitness and meal plan based on your
          preferences. This may take a few minutes.
        </p>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={cancelGenerationMutation.isPending}
          className="w-full"
        >
          {cancelGenerationMutation.isPending ? "Cancelling..." : "Cancel Generation"}
        </Button>
      </CardFooter>
    </Card>
  );
}