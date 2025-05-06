import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PlanGenerationContextType {
  isPlanGenerating: boolean;
  setPlanGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  generationStartTime: number | null;
  resetGenerationState: () => void;
}

const PlanGenerationContext = createContext<PlanGenerationContextType | undefined>(undefined);

export function PlanGenerationProvider({ children }: { children: ReactNode }) {
  const [isPlanGenerating, setPlanGenerating] = useState<boolean>(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  // Initialize state from localStorage on mount
  useEffect(() => {
    const storedGeneratingState = localStorage.getItem('fitness_plan_generating');
    if (storedGeneratingState) {
      const startTime = parseInt(storedGeneratingState);
      const currentTime = Date.now();
      const generationTime = currentTime - startTime;
      const MAX_GENERATION_TIME = 15 * 60 * 1000; // 15 minutes

      // Only consider the plan as still generating if it started less than MAX_GENERATION_TIME ago
      if (generationTime < MAX_GENERATION_TIME) {
        setPlanGenerating(true);
        setGenerationStartTime(startTime);
      } else {
        // Clean up stale state
        localStorage.removeItem('fitness_plan_generating');
      }
    }
  }, []);

  // Update localStorage when state changes
  useEffect(() => {
    if (isPlanGenerating) {
      // If we're starting a generation, record the start time
      if (!generationStartTime) {
        const now = Date.now();
        setGenerationStartTime(now);
        localStorage.setItem('fitness_plan_generating', now.toString());
      }
    } else {
      // If we're stopping generation, clear the start time
      setGenerationStartTime(null);
      localStorage.removeItem('fitness_plan_generating');
    }
  }, [isPlanGenerating, generationStartTime]);

  // Function to reset generation state
  const resetGenerationState = () => {
    setPlanGenerating(false);
    setGenerationStartTime(null);
    localStorage.removeItem('fitness_plan_generating');
  };

  return (
    <PlanGenerationContext.Provider value={{ 
      isPlanGenerating, 
      setPlanGenerating,
      generationStartTime,
      resetGenerationState
    }}>
      {children}
    </PlanGenerationContext.Provider>
  );
}

export function usePlanGeneration() {
  const context = useContext(PlanGenerationContext);
  if (context === undefined) {
    throw new Error('usePlanGeneration must be used within a PlanGenerationProvider');
  }
  return context;
}