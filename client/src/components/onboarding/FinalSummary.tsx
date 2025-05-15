import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingData, AIAnalysis } from '@/types/onboarding';
import { Loader2, Info, Clock, CheckCircle, ListChecks, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface FinalSummaryProps {
  data: OnboardingData;
  analysis: AIAnalysis | null;
  onComplete: (analysis?: AIAnalysis) => void;
  onGeneratePlan?: () => void; // Optional callback for generating a fitness plan
}

export default function FinalSummary({ data, analysis, onComplete, onGeneratePlan }: FinalSummaryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<'idle' | 'sending' | 'processing' | 'receiving' | 'complete'>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const { toast } = useToast();

  // Prevent navigation while analysis is being generated
  useEffect(() => {
    // Function to warn the user about leaving during analysis generation
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting) {
        // Standard way to show a browser confirmation dialog
        const message = "Analysis generation is in progress. If you leave now, your data will be lost. Are you sure you want to continue?";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    // Show warning alert when users try to reload or close the tab during analysis
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Also prevent navigation via browser back/forward
    const handlePopState = (e: PopStateEvent) => {
      if (isSubmitting) {
        // Prevent navigation if generating analysis
        window.history.pushState(null, '', window.location.pathname);
        
        // Show toast notification
        toast({
          title: "Analysis in progress",
          description: "Please wait for your analysis to complete before navigating away.",
          variant: "destructive",
        });
        
        e.preventDefault();
      }
    };

    // Handle browser navigation
    window.addEventListener('popstate', handlePopState);
    
    // Push a new history state when analysis starts to enable popstate detection
    if (isSubmitting) {
      window.history.pushState(null, '', window.location.pathname);
    }

    // Cleanup event listeners when component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isSubmitting, toast]);

  const getBmiCategory = (bmi: number) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  // Calculate BMI if we have height and weight
  const calculateBmi = () => {
    if (!data.height || !data.weight) return null;

    let height = data.height;
    let weight = data.weight;

    // Convert to metric if needed
    if (data.heightUnit === 'inches') {
      height = height * 2.54; // inches to cm
    }
    if (data.weightUnit === 'lb') {
      weight = weight * 0.453592; // lb to kg
    }

    // BMI formula: weight (kg) / (height (m))^2
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const bmi = calculateBmi();

  // Progress simulation using artificial steps to show progress
  useEffect(() => {
    if (!isSubmitting) return;
    
    let progressTimer: NodeJS.Timeout;
    
    // Gradually increase progress for visual feedback
    if (analysisStep === 'sending') {
      progressTimer = setTimeout(() => {
        setProgressPercent(25);
        setAnalysisStep('processing');
      }, 1000);
    } else if (analysisStep === 'processing') {
      progressTimer = setTimeout(() => {
        setProgressPercent(50);
      }, 1500);
      
      // After a bit, move to next step to show progress
      const nextStepTimer = setTimeout(() => {
        setProgressPercent(75);
        setAnalysisStep('receiving');
      }, 3000);
      
      return () => {
        clearTimeout(progressTimer);
        clearTimeout(nextStepTimer);
      };
    } else if (analysisStep === 'receiving') {
      progressTimer = setTimeout(() => {
        setProgressPercent(90);
      }, 1000);
    }
    
    return () => {
      clearTimeout(progressTimer);
    };
  }, [isSubmitting, analysisStep]);

  const handleAnalysis = async () => {
    setIsSubmitting(true);
    setAnalysisStep('sending');
    setProgressPercent(10);
    
    try {
      // Call our backend API to generate analysis with OpenAI
      console.log('Sending analysis request with data:', {
        fitnessGoal: data.fitnessGoal,
        fitnessGoals: data.fitnessGoals,
        bodyType: data.bodyType,
        height: data.height,
        weight: data.weight,
        heightUnit: data.heightUnit,
        weightUnit: data.weightUnit,
        gender: data.gender || '',
        dateOfBirth: data.dateOfBirth || '',
        age: data.age,
      });
      
      // Create an AbortController to set a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch('/api/onboarding/analysis', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include credentials for authentication
          body: JSON.stringify({
            fitnessGoal: data.fitnessGoal,
            fitnessGoals: data.fitnessGoals,
            bodyType: data.bodyType,
            height: data.height,
            weight: data.weight,
            heightUnit: data.heightUnit,
            weightUnit: data.weightUnit,
            gender: data.gender || '',
            dateOfBirth: data.dateOfBirth || '',
            age: data.age,
          }),
          signal: controller.signal,
        });
        
        // Clear the timeout since the request completed
        clearTimeout(timeoutId);
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          let errorMessage = 'Failed to generate analysis';
          
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          } catch (e) {
            // If the error text isn't JSON, use it directly
            errorMessage = errorText || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        // Update progress now that we've received a response
        setAnalysisStep('receiving');
        setProgressPercent(80);
        
        let analysisData: AIAnalysis;
        try {
          const responseData = await response.json();
          console.log('Raw response data:', responseData);
          
          // Ensure we have a valid AIAnalysis object
          if (typeof responseData === 'object' && 
              responseData.timeframe && 
              responseData.description && 
              Array.isArray(responseData.recommendations)) {
            analysisData = responseData;
          } else {
            // If we received JSON but it's not in the expected format
            console.error('Response not in expected format:', responseData);
            throw new Error('Received invalid analysis data from server');
          }
        } catch (e) {
          console.error('Error parsing analysis response:', e);
          throw new Error('Failed to parse analysis data');
        }
        
        console.log('Analysis data received:', analysisData);
        
        // Store analysis data in state or localStorage before attempting to pass it
        try {
          // Store in localStorage as a backup mechanism
          localStorage.setItem('temp_analysis', JSON.stringify(analysisData));
          console.log('Stored analysis in localStorage for safekeeping');
        } catch (e) {
          console.error('Error storing analysis in localStorage:', e);
        }
        
        // Update UI state to indicate completion
        setAnalysisStep('complete');
        setProgressPercent(100);
        
        // Set flag in localStorage that we just completed onboarding
        // This will trigger the analysis popup to show
        localStorage.setItem('onboardingJustCompleted', 'true');
        
        // Pass the analysis immediately instead of in a setTimeout
        // This avoids timing issues with React's rendering cycle
        onComplete(analysisData);
        
      } catch (error: unknown) {
        // Handle fetch errors
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Analysis request timed out. Please try again.');
        }
        throw error;
      }
    } catch (error: unknown) {
      console.error('Error generating analysis:', error);
      
      // Reset progress and state
      setIsSubmitting(false);
      setAnalysisStep('idle');
      setProgressPercent(0);
      
      // Show a more detailed error message with toast
      toast({
        title: "Could not generate analysis",
        description: `${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-medium mb-1 sm:mb-2">Profile Summary</h2>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Review your information and get personalized fitness insights.
        </p>
      </div>

      {/* Profile Summary Card */}
      <Card className="w-full mb-4 sm:mb-6 dark:bg-slate-900/90">
        <CardHeader className="px-3 py-2 sm:px-4 sm:py-3">
          <CardTitle className="text-base sm:text-lg flex items-center gap-1 sm:gap-2">
            <Info className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
            Your Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 px-3 py-2 sm:px-6 sm:py-4 text-sm">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Fitness Goals</p>
            <p className="font-medium capitalize">
              {data.fitnessGoals && data.fitnessGoals.length > 0
                ? data.fitnessGoals.map(goal => 
                    goal.replace(/([A-Z])/g, ' $1').trim()).join(', ')
                : typeof data.fitnessGoal === 'string'
                  ? data.fitnessGoal.replace(/([A-Z])/g, ' $1').trim()
                  : 'Not specified'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Body Type</p>
            <p className="font-medium capitalize">{data.bodyType || 'Not specified'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Height</p>
            <p className="font-medium">{data.height} {data.heightUnit}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Weight</p>
            <p className="font-medium">{data.weight} {data.weightUnit}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Date of Birth</p>
            <p className="font-medium">
              {data.dateOfBirth ? (
                (() => {
                  try {
                    return format(new Date(data.dateOfBirth), 'PP');
                  } catch (e) {
                    console.error('Error formatting date:', e, 'Value was:', data.dateOfBirth);
                    return 'Invalid date';
                  }
                })()
              ) : (
                'Not provided'
              )}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Gender</p>
            <p className="font-medium">{data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1) : 'Not specified'}</p>
          </div>
          {bmi && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">BMI</p>
              <p className="font-medium">{bmi} ({getBmiCategory(parseFloat(bmi))})</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Section */}
      {isSubmitting ? (
        <Card className="w-full mb-4 sm:mb-6 border-dashed border-primary/50 shadow-lg relative overflow-hidden dark:bg-slate-900/90">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 animate-pulse" />
          <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center relative z-10">
            <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary mb-2 sm:mb-3" />
            
            {/* Progress status message */}
            <p className="text-center text-base sm:text-lg font-medium mb-1 sm:mb-2">
              {analysisStep === 'sending' && "Preparing your data for analysis..."}
              {analysisStep === 'processing' && "Generating your personalized fitness analysis..."}
              {analysisStep === 'receiving' && "Almost done! Processing your results..."}
              {analysisStep === 'complete' && "Analysis complete!"}
            </p>
            
            {/* Progress details */}
            <p className="text-center text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              {analysisStep === 'sending' && "Our AI coach is preparing to analyze your fitness profile."}
              {analysisStep === 'processing' && "Our AI coach is analyzing your information and creating tailored recommendations."}
              {analysisStep === 'receiving' && "Finalizing your personalized fitness insights."}
              {analysisStep === 'complete' && "Your personalized fitness analysis is ready!"}
            </p>
            
            {/* Progress bar */}
            <div className="w-full max-w-md mb-6">
              <div className="h-2 w-full bg-primary-foreground rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
              <p className="text-xs text-right mt-1 text-muted-foreground">
                {progressPercent}% complete
              </p>
            </div>
            
            <div className="w-full max-w-md bg-background/80 dark:bg-slate-800/80 backdrop-blur-sm border rounded-lg p-4 mt-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground/90">Please do not leave this page</p>
                  <p className="text-xs text-muted-foreground">
                    Leaving this page will interrupt the analysis generation process.
                    Your data will be lost and you'll need to start over.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : analysis ? (
        <div className="space-y-6 w-full">
          {/* Timeframe */}
          <Card className="w-full dark:bg-slate-900/90">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-medium mb-2">Expected Timeframe</h3>
                  <div className="flex items-center">
                    <div className="h-2.5 bg-primary-foreground rounded-full w-full max-w-xs">
                      <div className="h-2.5 bg-primary rounded-full w-4/5" />
                    </div>
                    <span className="ml-4 font-semibold text-lg text-primary">{analysis.timeframe}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Results vary based on consistency, nutrition, and recovery quality
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="w-full dark:bg-slate-900/90">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-medium mb-2">Your Fitness Journey</h3>
                  <div className="prose dark:prose-invert">
                    {analysis.description.split('\n').map((paragraph, idx) => (
                      paragraph.trim() ? (
                        <p key={idx} className="mb-3 text-base sm:text-lg leading-relaxed dark:text-slate-200">
                          {paragraph}
                        </p>
                      ) : null
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="w-full dark:bg-slate-900/90">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <ListChecks className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div className="w-full">
                  <h3 className="text-lg font-medium mb-2">Personalized Recommendations</h3>
                  <ul className="list-disc pl-5 space-y-3">
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i} className="text-base sm:text-lg leading-relaxed">
                        <div className="flex items-start">
                          <div className="mr-2 mt-1 text-primary">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          <span className="flex-1">{rec}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="w-full mb-6 border-dashed dark:border-slate-700 dark:bg-slate-900/90">
          <CardContent className="p-8 flex flex-col items-center justify-center">
            <p className="text-center text-muted-foreground">
              Click "Generate Analysis" to receive your personalized fitness insights.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 space-y-4 w-full max-w-md">
        {analysis ? (
          <>
            {/* Auto-complete onboarding when analysis is generated */}
            {(() => {
              // Use an IIFE to prevent the timer ID from being rendered
              // Also reduced delay from 3000ms to 500ms for faster redirect
              setTimeout(() => {
                localStorage.setItem('onboardingJustCompleted', 'true');
                try {
                  // Save to localStorage as a backup in case state updates fail
                  localStorage.setItem('temp_analysis', JSON.stringify(analysis));
                  console.log('Saving analysis to local storage before redirect');
                } catch (e) {
                  console.error('Error saving to localStorage:', e);
                }
                onComplete(analysis);
              }, 500);
              // Return null to avoid rendering anything
              return null;
            })()}
            <div className="flex items-center justify-center">
              <p className="text-center text-muted-foreground animate-pulse">
                Completing your profile setup...
              </p>
            </div>
          </>
        ) : (
          <Button 
            onClick={handleAnalysis}
            className="w-full"
            size="lg"
            disabled={isSubmitting}
          >
            Generate Analysis
          </Button>
        )}
      </div>
    </div>
  );
}