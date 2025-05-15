import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Gauge, Scale, Zap, ChevronsRight, ArrowLeft, TrendingUp, AlertCircle } from 'lucide-react';
import { OnboardingData } from '@/types/onboarding';
import { cn } from '@/lib/utils';
import { BodyTypeSelector } from './BodyTypeSelector';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// iOS detection helper
const isIOSStandalone = () => {
  if (typeof window === 'undefined') return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone;
  return isIOS && isStandalone;
};

interface GoalSelectionProps {
  onSelect: (goals: OnboardingData['fitnessGoals'], bodyType?: OnboardingData['bodyType']) => void;
  selectedGoals: OnboardingData['fitnessGoals'];
  selectedBodyType?: OnboardingData['bodyType'];
  userGender: OnboardingData['gender']; // New prop to customize based on gender
  onBack: () => void; // New prop to go back to gender selection
}

const GoalCard = ({ 
  title, 
  description, 
  icon, 
  value, 
  selected, 
  onClick,
  disabled = false
}: { 
  title: string;
  description: string;
  icon: React.ReactNode;
  value: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <Card 
    className={cn(
      "transition-all transform", 
      !disabled && "cursor-pointer hover:scale-105 hover:shadow-lg",
      "border overflow-hidden h-full",
      selected 
        ? "border-primary border-2 shadow-md bg-primary/5 dark:bg-primary/10" 
        : disabled 
          ? "opacity-50 cursor-not-allowed" 
          : "hover:border-primary/50"
    )}
    onClick={!disabled ? onClick : undefined}
  >
    <CardContent className="pt-4 sm:pt-6 pb-4 sm:pb-6 h-full">
      <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3 h-full">
        <div className={cn(
          "p-3 rounded-full mb-1 transition-colors duration-200",
          selected ? "bg-primary text-primary-foreground" : "bg-muted dark:bg-muted/80"
        )}>
          {icon}
        </div>
        <h3 className="font-medium text-base sm:text-lg">{title}</h3>
        <p className="text-muted-foreground text-xs sm:text-sm">{description}</p>
        {selected && <Badge variant="outline" className="bg-primary/10">Selected</Badge>}
      </div>
    </CardContent>
  </Card>
);

export default function GoalSelection({ 
  onSelect, 
  selectedGoals: initialGoals, 
  selectedBodyType: initialBodyType,
  userGender,
  onBack
}: GoalSelectionProps) {
  const [activeStep, setActiveStep] = useState<'goal' | 'bodyType'>('goal');
  const [selectedGoals, setSelectedGoals] = useState<OnboardingData['fitnessGoals']>(initialGoals || []);
  const [selectedBodyType, setSelectedBodyType] = useState<OnboardingData['bodyType']>(initialBodyType || null);
  const { toast } = useToast();
  
  // Add CSS to handle any iOS-specific styling issues
  useEffect(() => {
    // This adds a style for iOS standalone mode that fixes the gap issue
    if (isIOSStandalone()) {
      const style = document.createElement('style');
      style.innerHTML = `
        /* Fix iOS standalone gap issues */
        .ios-standalone-fix {
          margin-top: 0 !important;
          padding-top: 0 !important;
        }
        
        /* Adjust content height for iOS */
        .ios-standalone-fix .bg-muted\\/50 {
          margin-bottom: 8px !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);
  
  const MAX_GOALS = 2;
  
  // Generate fitness goals with personalized descriptions based on gender
  const getGoals = () => [
    {
      title: "Weight Loss",
      description: userGender === 'female' 
        ? "Shed unwanted fat, boost metabolism, and achieve a toned, slimmer figure" 
        : "Lose fat, improve metabolism, and achieve a leaner, more defined physique",
      icon: <Scale className="h-5 w-5" />,
      value: "weightLoss"
    },
    {
      title: "Weight Gain",
      description: userGender === 'female'
        ? "Healthily increase body weight with balanced muscle and curves"
        : "Increase overall body mass with quality weight and muscle gain",
      icon: <TrendingUp className="h-5 w-5" />,
      value: "weightGain"
    },
    {
      title: "Muscle Building",
      description: userGender === 'female' 
        ? "Develop lean, toned muscles and enhance overall body shape"
        : "Increase muscle mass, definition, and overall physical appearance",
      icon: <Dumbbell className="h-5 w-5" />,
      value: "muscleBuild"
    },
    {
      title: "Stamina & Endurance",
      description: "Improve cardiovascular fitness, energy levels, and overall endurance",
      icon: <Gauge className="h-5 w-5" />,
      value: "stamina"
    },
    {
      title: "Strength Building",
      description: userGender === 'female'
        ? "Build functional strength and powerful, confident movements"
        : "Focus on raw strength, power output, and athletic performance",
      icon: <Zap className="h-5 w-5" />,
      value: "strength"
    }
  ];

  const goals = getGoals();

  // Toggle goal selection with a limit of MAX_GOALS
  const toggleGoalSelection = (value: string) => {
    setSelectedGoals(prev => {
      // If already selected, remove it
      if (prev.includes(value as any)) {
        return prev.filter(goal => goal !== value);
      } 
      // If not selected and we haven't reached the limit, add it
      else if (prev.length < MAX_GOALS) {
        return [...prev, value as any];
      } 
      // If we've reached the limit, show a toast and don't change
      else {
        toast({
          title: `Maximum ${MAX_GOALS} goals allowed`,
          description: `Please deselect a goal before selecting another one.`,
          variant: "destructive"
        });
        return prev;
      }
    });
  };

  // When the user clicks continue after selecting goals, show the body type selector
  const handleGoalContinue = () => {
    setActiveStep('bodyType');
  };

  // When the user clicks continue after selecting a body type, pass both values to parent
  const handleBodyTypeContinue = () => {
    if (selectedGoals.length > 0 && selectedBodyType) {
      onSelect(selectedGoals, selectedBodyType);
    }
  };

  // Handle back button clicks
  const handleGoBack = () => {
    if (activeStep === 'bodyType') {
      setActiveStep('goal');
    } else {
      onBack(); // Go back to gender selection
    }
  };

  // Check if we're on iOS standalone mode
  const isiOS = isIOSStandalone();

  return (
    <div className={cn(
      "space-y-5 sm:space-y-6",
      isiOS && "ios-standalone-fix" // Add custom class for iOS fixes
    )}>
      {activeStep === 'goal' ? (
        <div className={cn(
          "space-y-5 sm:space-y-6 py-2",
          isiOS && "pt-0" // Remove top padding on iOS
        )}>
          <div className={cn(
            "text-center",
            isiOS ? "mb-1 sm:mb-2" : "mb-3 sm:mb-4" // Reduce margin on iOS
          )}>
            <h2 className="text-xl sm:text-2xl font-medium mb-2">What are your fitness goals?</h2>
            <p className="text-muted-foreground text-sm max-w-2xl mx-auto px-1">
              Select up to {MAX_GOALS} goals that best represent what you want to achieve.
            </p>
          </div>

          <div className="bg-muted/50 border border-muted-foreground/20 rounded-md p-3 flex items-start mb-4">
            <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
            <p className="text-xs sm:text-sm">
              For best results, we recommend focusing on no more than {MAX_GOALS} fitness goals at once.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {goals.map((goal) => (
              <GoalCard
                key={goal.value}
                title={goal.title}
                description={goal.description}
                icon={goal.icon}
                value={goal.value}
                selected={selectedGoals.includes(goal.value as any)}
                onClick={() => toggleGoalSelection(goal.value)}
                disabled={selectedGoals.length >= MAX_GOALS && !selectedGoals.includes(goal.value as any)}
              />
            ))}
          </div>

          <div className="flex justify-between mt-5 sm:mt-6 max-w-4xl mx-auto px-1">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex items-center gap-1 px-3 sm:px-4"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" /> Back
            </Button>
            
            <Button
              size="lg"
              disabled={selectedGoals.length === 0}
              onClick={handleGoalContinue}
              className="px-4 sm:px-6 py-2 sm:py-4 h-auto text-sm font-medium"
            >
              Continue <ChevronsRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-6 py-2">
          <BodyTypeSelector 
            selectedType={selectedBodyType} 
            onSelect={setSelectedBodyType}
            userGender={userGender}
          />
          
          <div className="flex justify-between mt-5 sm:mt-6 max-w-4xl mx-auto px-1">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex items-center gap-1 px-3 sm:px-4"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" /> Back
            </Button>
            
            <Button
              size="lg"
              disabled={!selectedBodyType}
              onClick={handleBodyTypeContinue}
              className="px-4 sm:px-6 py-2 sm:py-4 h-auto text-sm font-medium"
            >
              Continue <ChevronsRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}