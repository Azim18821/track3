import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WorkoutModeNavProps {
  workoutId: number;
}

const WorkoutModeNav: React.FC<WorkoutModeNavProps> = ({ workoutId }) => {
  const [, navigate] = useLocation();

  return (
    <div className="fixed top-0 left-0 z-[100] w-full bg-background/95 backdrop-blur-sm border-b shadow-sm">
      <div className="flex items-center h-12 px-2">
        <Button 
          variant="default" 
          onClick={() => navigate('/workouts')}
          className="text-white bg-primary hover:bg-primary/90 flex items-center gap-1 text-sm h-8 rounded-md"
          aria-label="Back to workouts"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </Button>
      </div>
    </div>
  );
};

export default WorkoutModeNav;