import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import GoalSelection from '@/components/onboarding/GoalSelection';
import GenderSelection from '@/components/onboarding/GenderSelection';
import MeasurementsInput from '@/components/onboarding/MeasurementsInput';
import FinalSummary from '@/components/onboarding/FinalSummary';
import { useUser } from '@/hooks/use-user';
import { OnboardingData, AIAnalysis } from '@/types/onboarding';
import { Card, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Step, StepLabel, Stepper } from '@/components/ui/stepper';
import { OnboardingLayout } from '@/components/OnboardingLayout';
import { cn } from '@/lib/utils';

export default function OnboardingPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [isIOSStandalone, setIsIOSStandalone] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    fitnessGoal: null,
    fitnessGoals: [],
    bodyType: null,
    height: null,
    weight: null,
    heightUnit: 'cm',
    weightUnit: 'kg',
    dateOfBirth: null,
    gender: null
  });
  
  // Detect if running as standalone PWA on iOS
  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone;
    
    setIsIOSStandalone(isIOS && isStandalone);
    
    // If running as PWA on iOS, we need to adjust the viewport for notches and home indicator
    if (isIOS && isStandalone) {
      // Add a small delay to ensure rendering is complete
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    }
  }, []);
  
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const { toast } = useToast();
  const { user, updateUser } = useUser();
  const [, setLocation] = useLocation();
  
  // Check if we have user data to pre-populate or if user has already completed onboarding
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;
      
      try {
        // Re-check onboarding status from the API directly instead of relying on cached user data
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/onboarding/status?t=${timestamp}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          credentials: 'include'
        });
        
        const status = await response.json();
        console.log('Onboarding API status check:', status);
        
        if (status.completed) {
          console.log('Onboarding API confirms user has completed onboarding, redirecting to home page');
          setLocation('/');
          return;
        }
        
        // If not completed according to API, fallback to checking user profile data
        const hasCompletedOnboarding = Boolean(
          (user.fitnessGoal || (user.fitnessGoals && user.fitnessGoals.length > 0)) &&
          user.bodyType &&
          user.height &&
          user.weight && 
          user.gender
        );
        
        console.log('Onboarding profile data check:', {
          fitnessGoal: user.fitnessGoal,
          bodyType: user.bodyType,
          height: user.height,
          weight: user.weight,
          gender: user.gender,
          hasCompletedOnboarding
        });
        
        if (hasCompletedOnboarding) {
          console.log('User profile data indicates onboarding is complete, but API says not completed');
          // We'll continue with onboarding since API is the source of truth
        }
      } catch (err) {
        console.error('Error checking onboarding status:', err);
        
        // Fallback to checking user data on API error
        const hasCompletedOnboarding = Boolean(
          (user.fitnessGoal || (user.fitnessGoals && user.fitnessGoals.length > 0)) &&
          user.bodyType &&
          user.height &&
          user.weight && 
          user.gender
        );
        
        if (hasCompletedOnboarding) {
          console.log('User has already completed onboarding (based on profile data), redirecting to home page');
          // Add a small delay before redirecting to ensure everything is loaded
          setTimeout(() => {
            setLocation('/');
          }, 100);
        }
      }
    };
    
    checkOnboardingStatus();
    
    // If we have user data, pre-populate the form
    if (user) {
      // User is defined here, so we can safely access its properties
      const fitnessGoal = user?.fitnessGoal as OnboardingData['fitnessGoal'] || null;
      
      // Convert single fitness goal to array for new multi-goal format
      const fitnessGoals = fitnessGoal ? [fitnessGoal] : [];
      
      const userProfile: OnboardingData = {
        fitnessGoal: fitnessGoal,
        fitnessGoals: fitnessGoals,
        bodyType: user?.bodyType as OnboardingData['bodyType'] || null,
        height: user?.height || null,
        weight: user?.weight || null,
        heightUnit: user?.heightUnit as 'cm' | 'inches' || 'cm',
        weightUnit: user?.weightUnit as 'kg' | 'lb' || 'kg',
        dateOfBirth: user?.dateOfBirth || null,
        gender: user?.gender as 'male' | 'female' | 'other' || null,
        age: calculateAge(user?.dateOfBirth || null)
      };
      
      setData(userProfile);
    }
  }, [user, setLocation]);

  const calculateAge = (dob: string | null): number | undefined => {
    if (!dob) return undefined;
    
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleNext = () => {
    setActiveStep(prevStep => prevStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevStep => prevStep - 1);
  };

  // Handler for gender selection
  const handleGenderSelection = (gender: OnboardingData['gender']) => {
    setData(prev => ({ 
      ...prev, 
      gender
    }));
    handleNext();
  };

  // Handler for goals and body type selection
  const handleGoalSelection = (goals: OnboardingData['fitnessGoals'], bodyType?: OnboardingData['bodyType']) => {
    // Set the primary goal as the first selected goal for backward compatibility
    const primaryGoal = goals.length > 0 ? goals[0] : null;
    
    setData(prev => ({ 
      ...prev, 
      fitnessGoals: goals,
      fitnessGoal: primaryGoal, // For backward compatibility
      bodyType: bodyType || prev.bodyType
    }));
    handleNext();
  };

  const handleMeasurementsSubmit = (measurements: Partial<OnboardingData>) => {
    // Calculate age from date of birth if provided
    let age: number | undefined = undefined;
    if (measurements.dateOfBirth) {
      age = calculateAge(measurements.dateOfBirth);
    }
    
    setData(prev => ({ 
      ...prev, 
      ...measurements,
      age 
    }));
    handleNext();
  };

  const handleComplete = async (aiAnalysis?: AIAnalysis) => {
    try {
      // Handle the case where we're receiving a new analysis
      let analysisToUse: AIAnalysis | null | undefined = aiAnalysis;
      
      if (aiAnalysis) {
        console.log("Setting new analysis from parameter:", aiAnalysis);
        // First, set it in the component state
        setAnalysis(aiAnalysis);
        // Don't proceed with saving yet if we're just generating the analysis
        return;
      } else {
        // Use the stored analysis from state
        analysisToUse = analysis;
        
        // Try to retrieve from localStorage as a backup if state is null
        if (!analysisToUse) {
          try {
            const storedAnalysis = localStorage.getItem('temp_analysis');
            if (storedAnalysis) {
              console.log("Retrieved analysis from localStorage");
              const parsedAnalysis = JSON.parse(storedAnalysis) as AIAnalysis;
              analysisToUse = parsedAnalysis;
              // Update state with the parsed analysis
              setAnalysis(parsedAnalysis);
            }
          } catch (e) {
            console.error("Error retrieving analysis from localStorage:", e);
          }
        }
      }
      
      console.log("Completing onboarding with analysis:", analysisToUse);
      
      // Only proceed if we have an analysis (either stored in state or retrieved from localStorage)
      if (analysisToUse) {
        console.log("Saving user profile data:", data);
        
        // Extract data we need to save, but remove age as it's calculated
        const { age, ...profileData } = data;
        
        // Store the AI analysis in the user profile
        try {
          // Convert the analysis object to a JSON string for storage
          const analysisJson = JSON.stringify(analysisToUse);
          
          // Add the analysis to the profile data
          const updatedProfileData = {
            ...profileData,
            aiAnalysis: analysisJson,
          };
          
          console.log("Saving profile with analysis data");
          
          // Save to user profile
          await updateUser(updatedProfileData);
          
          toast({
            title: "Profile Updated",
            description: "Your profile has been successfully updated with personalized insights.",
          });
          
          // Clear temporary storage after successful save
          localStorage.removeItem('temp_analysis');
          
          // Set flag in localStorage to indicate onboarding is complete
          localStorage.setItem('onboardingCompleted', 'true');
          
          console.log("Onboarding completed, redirecting to home page...");
          
          // Redirect immediately to the root path which will show the dashboard for logged-in users
          setLocation('/');
        } catch (e) {
          console.error("Error processing analysis for storage:", e);
          
          // Even if there's an error processing the analysis,
          // still save the basic profile data
          await updateUser(profileData);
          
          toast({
            title: "Profile Partially Updated",
            description: "Your profile was saved, but we couldn't process your analysis data.",
            variant: "destructive",
          });
          
          // Still redirect to home
          setTimeout(() => {
            setLocation('/');
          }, 100);
        }
      } else {
        console.error("Cannot complete onboarding: No analysis data available");
        toast({
          title: "Missing Data",
          description: "Please generate an analysis before continuing.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      toast({
        title: "Error",
        description: "There was a problem updating your profile. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleGeneratePlan = async () => {
    try {
      // First save the user profile data with analysis
      const { age, ...profileData } = data;
      
      // Get analysis from state or localStorage
      let analysisToUse = analysis;
      
      // If we don't have analysis in state, try to get from localStorage
      if (!analysisToUse) {
        try {
          const storedAnalysis = localStorage.getItem('temp_analysis');
          if (storedAnalysis) {
            console.log("Retrieved analysis from localStorage for plan generation");
            analysisToUse = JSON.parse(storedAnalysis);
            // Update state for future use
            setAnalysis(analysisToUse);
          }
        } catch (e) {
          console.error("Error retrieving analysis from localStorage:", e);
        }
      }
      
      // Include the AI analysis in the profile data
      if (analysisToUse) {
        try {
          // Convert analysis to JSON string
          const analysisJson = JSON.stringify(analysisToUse);
          
          // Create a properly typed object with the analysis data
          const updatedProfileData = {
            ...profileData,
            aiAnalysis: analysisJson
          };
          
          console.log("Saving profile with analysis before generating plan");
          
          // Use the updated profile data for the update
          await updateUser(updatedProfileData);
        } catch (e) {
          console.error("Error processing analysis for plan generation:", e);
          // If there was an error with the analysis, just save the basic profile data
          await updateUser(profileData);
        }
      } else {
        console.warn("No analysis found for plan generation - proceeding without analysis data");
        await updateUser(profileData);
      }
      
      // Clear localStorage after successful save
      try {
        localStorage.removeItem('temp_analysis');
        // Set flag in localStorage to indicate onboarding is complete
        localStorage.setItem('onboardingCompleted', 'true');
      } catch (e) {
        console.error("Could not update localStorage:", e);
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved. Preparing your personalized fitness plan...",
      });
      
      // Redirect to coach page with query parameters to auto-start plan generation
      setLocation(`/coach?generate=true&goal=${data.fitnessGoal}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "There was a problem updating your profile. Please try again.",
        variant: "destructive",
      });
      console.error("Error generating plan:", error);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <GenderSelection
          onSelect={handleGenderSelection}
          selectedGender={data.gender}
        />;
      case 1:
        return <GoalSelection 
          onSelect={handleGoalSelection} 
          selectedGoals={data.fitnessGoals}
          selectedBodyType={data.bodyType}
          userGender={data.gender}
          onBack={handleBack}
        />;
      case 2:
        return <MeasurementsInput data={data} onSubmit={handleMeasurementsSubmit} onBack={handleBack} />;
      case 3:
        return <FinalSummary 
          data={{
            ...data,
            // For backward compatibility with FinalSummary component
            fitnessGoal: data.fitnessGoal || (data.fitnessGoals.length > 0 ? data.fitnessGoals[0] : null)
          }} 
          onComplete={handleComplete} 
          analysis={analysis} 
          onGeneratePlan={handleGeneratePlan}
        />;
      default:
        return "Unknown step";
    }
  };

  const steps = ['About You', 'Your Goals', 'Body Details', 'Get Analysis'];

  return (
    <OnboardingLayout>
      <div className={cn(
        "w-full max-w-5xl px-2 sm:px-4 flex items-start justify-center",
        isIOSStandalone 
          ? "py-0 min-h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom))]" 
          : "py-2 sm:py-4 min-h-[calc(100vh-80px)]"
      )}>
        <Card className={cn(
          "mx-auto border-0 shadow-lg sm:shadow-xl",
          "bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm",
          "transition-all duration-500",
          "rounded-lg sm:rounded-xl",
          "w-full overflow-hidden",
          isIOSStandalone ? "p-2 ios-card mt-1" : "p-3 sm:p-4 md:p-6"
        )}>
          <div className={cn(
            "text-center",
            isIOSStandalone ? "mb-1" : "mb-3 sm:mb-4 md:mb-6"
          )}>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Shape Your Fitness Journey</CardTitle>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1 max-w-2xl mx-auto px-1">
              Complete your profile to get a personalized experience tailored to your goals
            </p>
          </div>
          
          <div className={cn(
            "overflow-visible px-0 sm:px-4", 
            isIOSStandalone ? "mb-2" : "mb-4 sm:mb-6 md:mb-8"
          )}>
            <div className="max-w-3xl mx-auto">
              <Stepper 
                activeStep={activeStep} 
                alternativeLabel 
                className={cn(
                  "min-w-[300px] w-full onboarding-stepper",
                  isIOSStandalone && "ios-stepper scale-90 transform-origin-top"
                )}
              >
                {steps.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </div>
          </div>
          
          <div className={cn(
            isIOSStandalone ? "mt-0" : "mt-3 sm:mt-4 md:mt-6"
          )}>
            {getStepContent(activeStep)}
          </div>
        </Card>
      </div>
    </OnboardingLayout>
  );
}