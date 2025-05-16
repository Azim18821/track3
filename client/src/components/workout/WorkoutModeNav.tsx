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
    <div className="fixed top-0 left-0 z-50 w-full bg-background border-b">
      <div className="flex items-center h-14 px-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/workouts')}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold flex-1">Workout</h1>
      </div>
    </div>
  );
};

export default WorkoutModeNav;