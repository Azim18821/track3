import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { User, ChevronsRight } from 'lucide-react';
import { OnboardingData } from '@/types/onboarding';
import { cn } from '@/lib/utils';

interface GenderSelectionProps {
  onSelect: (gender: OnboardingData['gender']) => void;
  selectedGender: OnboardingData['gender'];
}

const GenderCard = ({ 
  title, 
  description, 
  selected, 
  onClick 
}: { 
  title: string;
  description: string;
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
    <CardContent className="pt-6 sm:pt-8 pb-6 sm:pb-8 h-full">
      <div className="flex flex-col items-center text-center space-y-3 h-full">
        <div className={cn(
          "p-3 sm:p-4 rounded-full mb-2 transition-colors duration-200",
          selected ? "bg-primary text-primary-foreground" : "bg-muted dark:bg-muted/80"
        )}>
          <User className="h-6 w-6" />
        </div>
        <h3 className="font-medium text-lg sm:text-xl">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </CardContent>
  </Card>
);

export default function GenderSelection({ onSelect, selectedGender }: GenderSelectionProps) {
  const genders = [
    {
      title: "Male",
      description: "I identify as male",
      value: "male" as const
    },
    {
      title: "Female",
      description: "I identify as female",
      value: "female" as const
    },
    {
      title: "Other",
      description: "I identify differently",
      value: "other" as const
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Tell us about yourself</h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto px-1">
          This helps us personalize your fitness journey with recommendations best suited to your body.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
        {genders.map((gender) => (
          <GenderCard
            key={gender.value}
            title={gender.title}
            description={gender.description}
            selected={selectedGender === gender.value}
            onClick={() => onSelect(gender.value)}
          />
        ))}
      </div>

      <div className="flex justify-center mt-6 sm:mt-8">
        <Button
          size="lg"
          disabled={!selectedGender}
          onClick={() => onSelect(selectedGender)}
          className="w-full max-w-md px-4 sm:px-8 py-4 sm:py-6 h-auto text-sm sm:text-base font-medium"
        >
          Continue <ChevronsRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    </div>
  );
}