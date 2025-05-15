import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Define SVG code as React components for better styling control
const MaleEctomorph = () => (
  <svg viewBox="0 0 200 400" className="w-full h-full text-primary">
    <circle cx="100" cy="40" r="30" fill="currentColor" />
    <rect x="90" y="70" width="20" height="15" fill="currentColor" />
    <rect x="60" y="85" width="80" height="15" rx="5" fill="currentColor" />
    <rect x="50" y="85" width="10" height="120" rx="5" fill="currentColor" />
    <rect x="140" y="85" width="10" height="120" rx="5" fill="currentColor" />
    <circle cx="55" cy="215" r="8" fill="currentColor" />
    <circle cx="145" cy="215" r="8" fill="currentColor" />
    <path d="M70,100 L70,220 Q100,230 130,220 L130,100 Z" fill="currentColor" />
    <rect x="80" y="220" width="40" height="15" rx="5" fill="currentColor" />
    <rect x="80" y="235" width="15" height="145" rx="5" fill="currentColor" />
    <rect x="105" y="235" width="15" height="145" rx="5" fill="currentColor" />
    <ellipse cx="87" cy="385" rx="15" ry="7" fill="currentColor" />
    <ellipse cx="113" cy="385" rx="15" ry="7" fill="currentColor" />
  </svg>
);

const MaleMesomorph = () => (
  <svg viewBox="0 0 200 400" className="w-full h-full text-primary">
    <circle cx="100" cy="40" r="30" fill="currentColor" />
    <rect x="88" y="70" width="24" height="15" fill="currentColor" />
    <rect x="45" y="85" width="110" height="20" rx="10" fill="currentColor" />
    <path d="M45,90 C35,120 35,160 45,210" stroke="currentColor" strokeWidth="18" fill="none" />
    <path d="M155,90 C165,120 165,160 155,210" stroke="currentColor" strokeWidth="18" fill="none" />
    <circle cx="45" cy="220" r="10" fill="currentColor" />
    <circle cx="155" cy="220" r="10" fill="currentColor" />
    <path d="M65,85 L65,220 Q100,230 135,220 L135,85 Z" fill="currentColor" />
    <path d="M85,120 C100,130 100,130 115,120" stroke="#444444" strokeWidth="2" fill="none" />
    <path d="M90,150 L110,150" stroke="#444444" strokeWidth="2" />
    <path d="M90,165 L110,165" stroke="#444444" strokeWidth="2" />
    <path d="M90,180 L110,180" stroke="#444444" strokeWidth="2" />
    <rect x="75" y="220" width="50" height="15" rx="7" fill="currentColor" />
    <rect x="75" y="235" width="20" height="145" rx="10" fill="currentColor" />
    <rect x="105" y="235" width="20" height="145" rx="10" fill="currentColor" />
    <ellipse cx="85" cy="385" rx="15" ry="7" fill="currentColor" />
    <ellipse cx="115" cy="385" rx="15" ry="7" fill="currentColor" />
  </svg>
);

const MaleEndomorph = () => (
  <svg viewBox="0 0 200 400" className="w-full h-full text-primary">
    <circle cx="100" cy="40" r="30" fill="currentColor" />
    <rect x="85" y="70" width="30" height="15" fill="currentColor" />
    <rect x="50" y="85" width="100" height="20" rx="10" fill="currentColor" />
    <path d="M50,90 C35,130 35,170 50,210" stroke="currentColor" strokeWidth="25" fill="none" />
    <path d="M150,90 C165,130 165,170 150,210" stroke="currentColor" strokeWidth="25" fill="none" />
    <circle cx="50" cy="220" r="12" fill="currentColor" />
    <circle cx="150" cy="220" r="12" fill="currentColor" />
    <path d="M60,85 Q40,150 65,220 Q100,240 135,220 Q160,150 140,85 Z" fill="currentColor" />
    <rect x="70" y="220" width="60" height="20" rx="10" fill="currentColor" />
    <rect x="70" y="240" width="25" height="140" rx="12" fill="currentColor" />
    <rect x="105" y="240" width="25" height="140" rx="12" fill="currentColor" />
    <ellipse cx="82" cy="385" rx="18" ry="8" fill="currentColor" />
    <ellipse cx="118" cy="385" rx="18" ry="8" fill="currentColor" />
  </svg>
);

const FemaleEctomorph = () => (
  <svg viewBox="0 0 200 400" className="w-full h-full text-primary">
    <circle cx="100" cy="40" r="28" fill="currentColor" />
    <rect x="92" y="68" width="16" height="12" fill="currentColor" />
    <rect x="70" y="80" width="60" height="12" rx="6" fill="currentColor" />
    <rect x="60" y="80" width="10" height="120" rx="5" fill="currentColor" />
    <rect x="130" y="80" width="10" height="120" rx="5" fill="currentColor" />
    <circle cx="65" cy="210" r="7" fill="currentColor" />
    <circle cx="135" cy="210" r="7" fill="currentColor" />
    <path d="M75,80 C70,110 70,140 75,210 Q100,220 125,210 C130,140 130,110 125,80 Z" fill="currentColor" />
    <path d="M85,110 C100,118 100,118 115,110" stroke="#444444" strokeWidth="1" fill="none" />
    <rect x="85" y="210" width="30" height="10" rx="5" fill="currentColor" />
    <path d="M85,220 C80,235 80,235 85,250" stroke="currentColor" strokeWidth="12" fill="none" />
    <path d="M115,220 C120,235 120,235 115,250" stroke="currentColor" strokeWidth="12" fill="none" />
    <rect x="85" y="230" width="12" height="150" rx="6" fill="currentColor" />
    <rect x="103" y="230" width="12" height="150" rx="6" fill="currentColor" />
    <ellipse cx="91" cy="385" rx="12" ry="5" fill="currentColor" />
    <ellipse cx="109" cy="385" rx="12" ry="5" fill="currentColor" />
  </svg>
);

const FemaleMesomorph = () => (
  <svg viewBox="0 0 200 400" className="w-full h-full text-primary">
    <circle cx="100" cy="40" r="28" fill="currentColor" />
    <rect x="92" y="68" width="16" height="12" fill="currentColor" />
    <rect x="65" y="80" width="70" height="15" rx="7" fill="currentColor" />
    <path d="M65,85 C60,120 60,160 65,205" stroke="currentColor" strokeWidth="14" fill="none" />
    <path d="M135,85 C140,120 140,160 135,205" stroke="currentColor" strokeWidth="14" fill="none" />
    <circle cx="65" cy="215" r="7" fill="currentColor" />
    <circle cx="135" cy="215" r="7" fill="currentColor" />
    <path d="M75,80 C65,120 75,150 85,210 Q100,220 115,210 C125,150 135,120 125,80 Z" fill="currentColor" />
    <path d="M85,110 C100,125 100,125 115,110" stroke="#444444" strokeWidth="1.5" fill="none" />
    <rect x="85" y="210" width="30" height="12" rx="6" fill="currentColor" />
    <path d="M80,222 C70,235 70,250 80,270" stroke="currentColor" strokeWidth="14" fill="none" />
    <path d="M120,222 C130,235 130,250 120,270" stroke="currentColor" strokeWidth="14" fill="none" />
    <rect x="83" y="235" width="15" height="145" rx="7" fill="currentColor" />
    <rect x="102" y="235" width="15" height="145" rx="7" fill="currentColor" />
    <ellipse cx="90" cy="385" rx="12" ry="5" fill="currentColor" />
    <ellipse cx="110" cy="385" rx="12" ry="5" fill="currentColor" />
  </svg>
);

const FemaleEndomorph = () => (
  <svg viewBox="0 0 200 400" className="w-full h-full text-primary">
    <circle cx="100" cy="40" r="28" fill="currentColor" />
    <rect x="90" y="68" width="20" height="12" fill="currentColor" />
    <rect x="65" y="80" width="70" height="15" rx="7" fill="currentColor" />
    <path d="M65,85 C55,120 55,160 65,205" stroke="currentColor" strokeWidth="20" fill="none" />
    <path d="M135,85 C145,120 145,160 135,205" stroke="currentColor" strokeWidth="20" fill="none" />
    <circle cx="65" cy="215" r="8" fill="currentColor" />
    <circle cx="135" cy="215" r="8" fill="currentColor" />
    <path d="M75,80 C55,120 65,150 80,210 Q100,225 120,210 C135,150 145,120 125,80 Z" fill="currentColor" />
    <path d="M85,105 C100,130 100,130 115,105" stroke="#444444" strokeWidth="2" fill="none" />
    <rect x="80" y="210" width="40" height="15" rx="7" fill="currentColor" />
    <path d="M75,225 C60,245 60,265 75,285" stroke="currentColor" strokeWidth="22" fill="none" />
    <path d="M125,225 C140,245 140,265 125,285" stroke="currentColor" strokeWidth="22" fill="none" />
    <rect x="80" y="235" width="18" height="145" rx="9" fill="currentColor" />
    <rect x="102" y="235" width="18" height="145" rx="9" fill="currentColor" />
    <ellipse cx="89" cy="385" rx="14" ry="6" fill="currentColor" />
    <ellipse cx="111" cy="385" rx="14" ry="6" fill="currentColor" />
  </svg>
);

type BodyType = 'ectomorph' | 'mesomorph' | 'endomorph';
type Gender = string | null; // Match OnboardingData['gender'] type which might be null

interface BodyTypeSelectorProps {
  selectedType: BodyType | null;
  onSelect: (type: BodyType) => void;
  userGender: Gender; // Add the gender that was selected in the first step
}

// Male body type data
const maleBodyTypes = [
  {
    type: 'ectomorph',
    title: 'Ectomorph',
    description: 'Naturally thin and lean with a fast metabolism. Typically has a hard time gaining weight.',
    image: <MaleEctomorph />,
  },
  {
    type: 'mesomorph',
    title: 'Mesomorph',
    description: 'Athletic build with well-defined muscles. Gains muscle easily and stays relatively lean.',
    image: <MaleMesomorph />,
  },
  {
    type: 'endomorph',
    title: 'Endomorph',
    description: 'Naturally carries more body fat with a slower metabolism. Tends to gain weight more easily.',
    image: <MaleEndomorph />,
  }
];

// Female body type data
const femaleBodyTypes = [
  {
    type: 'ectomorph',
    title: 'Ectomorph',
    description: 'Naturally thin and lean with a fast metabolism. Typically has a hard time gaining weight.',
    image: <FemaleEctomorph />,
  },
  {
    type: 'mesomorph',
    title: 'Mesomorph',
    description: 'Athletic build with well-defined muscles. Gains muscle easily and stays relatively lean.',
    image: <FemaleMesomorph />,
  },
  {
    type: 'endomorph',
    title: 'Endomorph',
    description: 'Naturally carries more body fat with a slower metabolism. Tends to gain weight more easily.',
    image: <FemaleEndomorph />,
  }
];

export function BodyTypeSelector({ selectedType, onSelect, userGender }: BodyTypeSelectorProps) {
  // Select which body type array to use based on the user's gender from the first step
  // Show female body types for 'female', and male body types for 'male', 'other', or null
  let bodyTypes = maleBodyTypes;
  if (userGender === 'female') {
    bodyTypes = femaleBodyTypes;
  }
  // For 'other' gender, we still need to show some body types (using male as default)
  // In a more comprehensive app, we could have specific body types for 'other' gender
  
  return (
    <div className="space-y-6 sm:space-y-8 py-2 sm:py-4">
      <div className="text-center mb-4 sm:mb-6">
        <h3 className="text-lg sm:text-xl font-medium mb-2 sm:mb-3">What body type do you have?</h3>
        <p className="text-muted-foreground text-sm sm:text-base px-1">
          {userGender === 'female' 
            ? "Select the female body type that most closely resembles yours" 
            : userGender === 'male' 
              ? "Select the male body type that most closely resembles yours"
              : "Select the body type that most closely resembles yours"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto px-1">
        {bodyTypes.map((bodyType) => (
          <Card 
            key={bodyType.type}
            className={cn(
              "cursor-pointer transition-all transform hover:scale-105 hover:shadow-lg",
              "border overflow-hidden h-full",
              selectedType === bodyType.type 
                ? "border-primary border-2 shadow-md bg-primary/5 dark:bg-primary/10" 
                : "hover:border-primary/50"
            )}
            onClick={() => onSelect(bodyType.type as BodyType)}
          >
            <CardContent className="flex flex-col items-center text-center pt-3 sm:pt-4 pb-3 sm:pb-4 px-2 sm:px-4 space-y-1 sm:space-y-2 h-full">
              <div className={cn(
                "w-16 sm:w-20 md:w-24 h-36 sm:h-44 md:h-52 flex items-center justify-center mb-1 transition-colors duration-200",
                selectedType === bodyType.type 
                  ? "text-primary" 
                  : "text-muted-foreground dark:text-muted-foreground/70"
              )}>
                {bodyType.image}
              </div>
              <h4 className="font-medium text-sm sm:text-base md:text-lg">{bodyType.title}</h4>
              <p className="text-muted-foreground text-xs sm:text-sm line-clamp-3 sm:line-clamp-none">{bodyType.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}