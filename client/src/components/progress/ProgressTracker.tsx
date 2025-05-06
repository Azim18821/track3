import React, { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { getProgressColor } from '@/lib/gradients';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export type GenerationStep = 
  | 'INITIALIZE'
  | 'NUTRITION_CALCULATION'
  | 'WORKOUT_PLAN'
  | 'MEAL_PLAN'
  | 'EXTRACT_INGREDIENTS'
  | 'SHOPPING_LIST'
  | 'COMPLETE';

export interface ProgressTrackerProps {
  isGenerating?: boolean;
  currentStep: GenerationStep | number;
  stepMessage?: string;
  totalSteps: number;
  estimatedTimeRemaining?: number;
  error?: string | null;
  errorMessage?: string | null;  // Support both error and errorMessage
  isComplete?: boolean;
  onContinue?: () => void;
  onCancel?: () => void;
  onReset?: () => void;  // Support reset function
  isAdmin?: boolean;     // Support admin flag
  className?: string;
}

/**
 * Displays progress during multi-step plan generation
 */
export function ProgressTracker({
  isGenerating = false,
  currentStep,
  stepMessage = "Initializing...",
  totalSteps,
  estimatedTimeRemaining = 0,
  error = null,
  errorMessage = null, // Support both error and errorMessage
  isComplete = false,
  onContinue,
  onCancel,
  onReset, // Add reset handler
  isAdmin = false,
  className
}: ProgressTrackerProps) {
  const { toast } = useToast();
  const [progress, setProgress] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(estimatedTimeRemaining);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Use whichever error is provided
  const errorToDisplay = error || errorMessage;
  
  // Map step names to numeric values
  const stepValues: Record<GenerationStep, number> = {
    INITIALIZE: 0,
    NUTRITION_CALCULATION: 1,
    WORKOUT_PLAN: 2,
    MEAL_PLAN: 3,
    EXTRACT_INGREDIENTS: 4,
    SHOPPING_LIST: 5,
    COMPLETE: 6
  };
  
  // Calculate the current step number based on the type of currentStep
  let currentStepNumber: number;
  if (typeof currentStep === 'number') {
    // If it's already a number, use it directly
    currentStepNumber = currentStep;
  } else if (currentStep) {
    // If it's a GenerationStep enum string, map it to a number
    // Using type assertion to tell TypeScript this is safe
    currentStepNumber = stepValues[currentStep as GenerationStep];
  } else {
    // Default to 0 if undefined
    currentStepNumber = 0;
  }
  
  // Calculate progress percentage
  useEffect(() => {
    // Normalize to 0-100 scale and handle potential invalid values
    if (isNaN(currentStepNumber) || currentStepNumber < 0) {
      setProgress(0);
    } else {
      const percentage = Math.round((currentStepNumber / (totalSteps)) * 100);
      setProgress(isComplete ? 100 : percentage);
    }
  }, [currentStepNumber, totalSteps, isComplete]);
  
  // Start countdown timer
  useEffect(() => {
    // Clear any existing interval
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }
    
    // Initialize time left from props
    setTimeLeft(estimatedTimeRemaining);
    
    // Start countdown if needed
    if (isGenerating && estimatedTimeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          const newValue = Math.max(0, prev - 1);
          if (newValue === 0) {
            clearInterval(interval);
          }
          return newValue;
        });
      }, 1000);
      
      setCountdownInterval(interval);
      
      return () => clearInterval(interval);
    }
  }, [isGenerating, estimatedTimeRemaining, currentStep]);
  
  // Format time remaining
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds <= 0) return 'Estimating...';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  };
  
  const handleContinue = () => {
    if (onContinue) {
      onContinue();
      toast({
        title: 'Continuing generation',
        description: `Proceeding to the next step: ${stepMessage}`,
      });
    }
  };
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      toast({
        title: 'Generation cancelled',
        description: 'The plan generation process has been cancelled.',
        variant: 'destructive'
      });
    }
  };
  
  const handleReset = () => {
    if (onReset) {
      onReset();
      toast({
        title: 'Plan generation reset',
        description: 'The plan generation state has been reset.',
        variant: 'default'
      });
    }
  };

  return (
    <Card className={cn('w-full shadow-lg', className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg font-semibold">
            Plan Generation
            {isGenerating && <span className="ml-2 inline-block animate-pulse">⚡</span>}
          </CardTitle>
          {isGenerating ? (
            <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              In Progress
            </Badge>
          ) : isComplete ? (
            <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
              Complete
            </Badge>
          ) : errorToDisplay ? (
            <Badge variant="outline" className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
              Error
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
              Paused
            </Badge>
          )}
        </div>
        <CardDescription>
          {errorToDisplay ? (
            <div className="flex items-center text-red-500">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errorToDisplay}
            </div>
          ) : (
            stepMessage
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-between text-xs text-muted-foreground">
            <div>
              Step {currentStepNumber} of {totalSteps}
            </div>
            <div className={cn(getProgressColor(progress))}>
              {progress}% Complete
            </div>
          </div>
          
          {isGenerating && (
            <div className="flex items-center justify-between mt-2 text-sm">
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span>Working on it...</span>
              </div>
              <div>
                {timeLeft > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    ~{formatTimeRemaining(timeLeft)} remaining
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    Estimating time...
                  </span>
                )}
              </div>
            </div>
          )}
          
          {isComplete && (
            <div className="flex items-center justify-center mt-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              <span>Plan generation complete!</span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-end space-x-2 pt-0">
        {/* Only allow admins to reset in any situation */}
        {isGenerating && onReset && isAdmin && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleReset}
            className="mr-auto"
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Reset Generation
          </Button>
        )}
        
        {/* Show reset button for admins when there's an error */}
        {errorToDisplay && onReset && isAdmin && (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleReset}
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Reset Generation
          </Button>
        )}
        
        {!isComplete && !errorToDisplay && (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancel}
              disabled={!isGenerating}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleContinue}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              )}
              Continue
            </Button>
          </>
        )}
        
        {errorToDisplay && onReset && !isAdmin && (
          <div className="text-sm text-red-500 italic w-full text-center">
            Please contact support to reset plan generation.
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

export default ProgressTracker;