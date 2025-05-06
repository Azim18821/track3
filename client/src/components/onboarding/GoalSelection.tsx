import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Gauge, Scale, Zap, ChevronsRight, ArrowLeft } from 'lucide-react';
import { OnboardingData } from '@/types/onboarding';
import { cn } from '@/lib/utils';
import { BodyTypeSelector } from './BodyTypeSelector';

interface GoalSelectionProps {
  onSelect: (goal: OnboardingData['fitnessGoal'], bodyType?: OnboardingData['bodyType']) => void;
  selectedGoal: OnboardingData['fitnessGoal'];
  selectedBodyType?: OnboardingData['bodyType'];
}

const GoalCard = ({ 
  title, 
  description, 
  icon, 
  value, 
  selected, 
  onClick 
}: { 
  title: string;
  description: string;
  icon: React.ReactNode;
  value: OnboardingData['fitnessGoal'];
  selected: boolean;
  onClick: () => void;
}) => (
  <Card 
    className={cn(
      "cursor-pointer transition-all transform hover:scale-105 hover:shadow-lg", 
      "border overflow-hidden h-full",
      selected 
        ? "border-primary border-2 shadow-md bg-primary/5 dark:bg-primary/10" 
        : "hover:border-primary/50"
    )}
    onClick={onClick}
  >
    <CardContent className="pt-4 sm:pt-8 pb-4 sm:pb-6 h-full">
      <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4 h-full">
        <div className={cn(
          "p-3 sm:p-4 rounded-full mb-1 sm:mb-2 transition-colors duration-200",
          selected ? "bg-primary text-primary-foreground" : "bg-muted dark:bg-muted/80"
        )}>
          {icon}
        </div>
        <h3 className="font-medium text-base sm:text-lg">{title}</h3>
        <p className="text-muted-foreground text-xs sm:text-sm">{description}</p>
      </div>
    </CardContent>
  </Card>
);

export default function GoalSelection({ onSelect, selectedGoal: initialGoal, selectedBodyType: initialBodyType }: GoalSelectionProps) {
  const [activeStep, setActiveStep] = useState<'goal' | 'bodyType'>('goal');
  const [selectedGoal, setSelectedGoal] = useState<OnboardingData['fitnessGoal']>(initialGoal);
  const [selectedBodyType, setSelectedBodyType] = useState<OnboardingData['bodyType']>(initialBodyType || null);
  
  const goals = [
    {
      title: "Weight Loss",
      description: "Lose fat, improve metabolism, and achieve a healthier body composition",
      icon: <Scale className="h-6 w-6" />,
      value: "weightLoss" as const
    },
    {
      title: "Muscle Building",
      description: "Increase muscle mass, strength, and overall physical appearance",
      icon: <Dumbbell className="h-6 w-6" />,
      value: "muscleBuild" as const
    },
    {
      title: "Stamina & Endurance",
      description: "Improve cardiovascular fitness and overall endurance",
      icon: <Gauge className="h-6 w-6" />,
      value: "stamina" as const
    },
    {
      title: "Strength Building",
      description: "Focus on raw strength and powerful muscle movements",
      icon: <Zap className="h-6 w-6" />,
      value: "strength" as const
    }
  ];

  // When the user clicks continue after selecting a goal, show the body type selector
  const handleGoalContinue = () => {
    setActiveStep('bodyType');
  };

  // When the user clicks continue after selecting a body type, pass both values to parent
  const handleBodyTypeContinue = () => {
    if (selectedGoal && selectedBodyType) {
      onSelect(selectedGoal, selectedBodyType);
    }
  };

  const handleGoBack = () => {
    setActiveStep('goal');
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {activeStep === 'goal' ? (
        <div className="space-y-6 sm:space-y-8 py-2 sm:py-4">
          <div className="text-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-medium mb-2 sm:mb-3">What's your primary fitness goal?</h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto px-1">
              This will help us personalize your experience and provide recommendations
              tailored to your objectives.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {goals.map((goal) => (
              <GoalCard
                key={goal.value}
                title={goal.title}
                description={goal.description}
                icon={goal.icon}
                value={goal.value}
                selected={selectedGoal === goal.value}
                onClick={() => {
                  // Just update the local state, don't call parent's onSelect yet
                  setSelectedGoal(goal.value);
                }}
              />
            ))}
          </div>

          <div className="flex justify-center mt-6 sm:mt-8">
            <Button
              size="lg"
              disabled={!selectedGoal}
              onClick={handleGoalContinue}
              className="w-full max-w-md px-4 sm:px-8 py-4 sm:py-6 h-auto text-sm sm:text-base font-medium"
            >
              Continue <ChevronsRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-8 py-2 sm:py-4">
          <BodyTypeSelector 
            selectedType={selectedBodyType} 
            onSelect={setSelectedBodyType}
          />
          
          <div className="flex justify-between mt-6 sm:mt-8 max-w-4xl mx-auto px-1">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6"
            >
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" /> Back
            </Button>
            
            <Button
              size="lg"
              disabled={!selectedBodyType}
              onClick={handleBodyTypeContinue}
              className="px-4 sm:px-8 py-4 sm:py-6 h-auto text-sm sm:text-base font-medium"
            >
              Continue <ChevronsRight className="ml-1 sm:ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}