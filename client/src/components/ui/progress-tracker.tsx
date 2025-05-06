import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProgressTrackerProps {
  isGenerating: boolean;
  step: number;
  statusMessage: string;
  estimatedTimeRemaining: number;
  totalSteps?: number;
  errorMessage?: string | null;
  elapsedTime?: number;
  isComplete?: boolean;
}

export function ProgressTracker({
  isGenerating,
  step,
  statusMessage,
  estimatedTimeRemaining,
  totalSteps = 5,
  errorMessage = null,
  elapsedTime = 0,
  isComplete = false
}: ProgressTrackerProps) {
  const progressPercentage = Math.min(100, Math.round((step / totalSteps) * 100));

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (isComplete) return 'Complete!';
    if (seconds <= 0) return 'Finishing up...';
    if (seconds < 60) return `${seconds} seconds remaining`;
    const minutes = Math.floor(seconds / 60);
    return `About ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} remaining`;
  };

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (!isGenerating && !errorMessage && !isComplete) return null;

  // Show error state
  if (errorMessage) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            Error: {errorMessage}
          </AlertDescription>
        </Alert>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Plan generation failed</span>
          <span>Please try again</span>
        </div>
      </div>
    );
  }

  // Show completed state
  if (isComplete) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            <span className="font-medium text-green-500">Plan generation complete!</span>
          </div>
          <span className="text-muted-foreground">
            Completed in {formatElapsedTime(elapsedTime)}
          </span>
        </div>
        <Progress value={100} className="h-2 bg-gray-100 dark:bg-gray-800">
          <div className="h-full bg-green-500 transition-all" style={{ width: '100%' }} />
        </Progress>
      </div>
    );
  }

  // Show in-progress state
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
          <span className="font-medium">{statusMessage || 'Processing...'}</span>
        </div>
        <span className="text-muted-foreground">
          {formatTimeRemaining(estimatedTimeRemaining)}
        </span>
      </div>
      <Progress value={progressPercentage} className="h-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          Step {step} of {totalSteps}
        </span>
        <div className="flex gap-4">
          <span>{progressPercentage}% complete</span>
          {elapsedTime > 0 && (
            <span>Elapsed: {formatElapsedTime(elapsedTime)}</span>
          )}
        </div>
      </div>
    </div>
  );
}