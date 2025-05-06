import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

interface StepProps {
  children?: React.ReactNode;
  completed?: boolean;
  active?: boolean;
}

interface StepLabelProps {
  children?: React.ReactNode;
  error?: boolean;
}

interface StepperProps {
  activeStep: number;
  alternativeLabel?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Step = ({ children, completed, active }: StepProps) => {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center",
        active && "text-primary font-semibold",
        completed && !active && "text-foreground",
        !active && !completed && "text-muted-foreground"
      )}
    >
      {children}
    </div>
  );
};

export const StepLabel = ({ children, error }: StepLabelProps) => {
  return (
    <div
      className={cn(
        "text-center text-xs sm:text-sm font-medium transition-all duration-200 whitespace-normal break-words hyphens-auto",
        error && "text-destructive"
      )}
    >
      {children}
    </div>
  );
};

export const Stepper = ({
  activeStep,
  alternativeLabel = false,
  children,
  className,
}: StepperProps) => {
  const childrenArray = React.Children.toArray(children);
  const steps = childrenArray.map((step, index) => {
    const completed = index < activeStep;
    const active = index === activeStep;

    // Create a React.Fragment with only a key prop which is valid
    return (
      // Use a keyed div instead of React.Fragment to avoid warnings
      <div key={index.toString()} className="flex items-center flex-1">
        <div
          className={cn(
            "relative flex items-center justify-center",
            alternativeLabel ? "flex-1" : ""
          )}
        >
          {/* Circle for active step */}
          <div
            className={cn(
              "flex h-7 w-7 sm:h-9 sm:w-9 text-xs sm:text-sm items-center justify-center rounded-full border-2 transition-all duration-300 shadow-sm z-10 bg-white",
              active && "border-primary bg-primary/10 text-primary ring-4 ring-primary/20",
              completed && "border-primary bg-primary text-primary-foreground",
              !active && !completed && "border-muted-foreground bg-white text-muted-foreground"
            )}
          >
            {completed ? (
              <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : (
              <span className="font-semibold">{index + 1}</span>
            )}
          </div>

          {/* Step label */}
          {alternativeLabel && (
            <div className="absolute top-full pt-2 sm:pt-3 left-1/2 transform -translate-x-1/2 w-full max-w-[120px] text-center">
              {React.cloneElement(step as React.ReactElement, {
                active,
                completed,
              })}
            </div>
          )}
        </div>

        {/* Connector between steps */}
        {index < childrenArray.length - 1 && (
          <div
            className={cn(
              "flex-1 border-t-2 mx-2 sm:mx-3 transition-colors duration-300 h-[1px] self-center",
              index < activeStep
                ? "border-primary"
                : "border-muted-foreground/30"
            )}
          />
        )}
      </div>
    );
  });

  return (
    <div
      className={cn(
        "mb-8 sm:mb-10 flex w-full items-center py-2 sm:py-4",
        alternativeLabel ? "flex-col" : "",
        className
      )}
    >
      {alternativeLabel ? (
        <div className="mb-10 sm:mb-12 flex w-full items-center justify-evenly px-3 sm:px-6 relative">
          {/* Equal spacing layout for steps */}
          <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 z-0" aria-hidden="true"></div>
          <div className="flex w-full justify-between relative z-10">
            {steps}
          </div>
        </div>
      ) : (
        <>
          {steps}
          <div className="ml-4 flex-1">
            {childrenArray[activeStep] &&
              React.cloneElement(childrenArray[activeStep] as React.ReactElement, {
                active: true,
              })}
          </div>
        </>
      )}
    </div>
  );
};