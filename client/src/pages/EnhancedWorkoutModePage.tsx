import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import EnhancedWorkoutMode from "@/components/workout/EnhancedWorkoutMode";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

interface SetData {
  reps?: number | null;
  weight?: number | null;
  completed: boolean;
  setType?: string;
  targetRPE?: number;
  tempo?: string;
  notes?: string;
}

interface Exercise {
  id?: number;
  name: string;
  sets: number;
  reps?: number;
  weight?: number;
  unit?: string;
  setsData?: SetData[];
  rest?: string;
}

interface Workout {
  id: number;
  name: string;
  date: string;
  duration: number;
  notes?: string;
  exercises: Exercise[];
  completed?: boolean;
  isPlanMode?: boolean;
}

export default function EnhancedWorkoutModePage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/enhanced-workout-mode/:id");
  const workoutId = match ? parseInt(params.id) : 0;

  // Fetch workout data
  const { 
    data: workout, 
    isLoading, 
    error 
  } = useQuery<Workout>({
    queryKey: [`/api/workouts/${workoutId}`],
    enabled: !isNaN(workoutId)
  });

  // Handle navigation back to workout list
  const handleExit = () => {
    navigate("/workouts");
  };

  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={handleExit} className="p-0 h-9 w-9 mr-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex items-center mb-4">
          <Button variant="ghost" onClick={handleExit} className="p-0 h-9 w-9 mr-2">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Error</h1>
        </div>
        <div className="bg-destructive/10 p-4 rounded-md text-destructive">
          Failed to load workout data. Please try again.
        </div>
        <Button onClick={handleExit} className="mt-4">
          Return to Workouts
        </Button>
      </div>
    );
  }

  return <EnhancedWorkoutMode workout={workout} onExit={handleExit} />;
}