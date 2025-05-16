import { useState, useEffect } from "react";
import { useLocation, useRoute, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import WorkoutMode from "@/components/workout/WorkoutMode";
import WorkoutModeNav from "@/components/workout/WorkoutModeNav";

interface SetData {
  reps: number;
  weight: number;
  completed: boolean;
}

interface Exercise {
  id?: number;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  unit?: string;
  setsData?: SetData[];
}

interface Workout {
  id: number;
  name: string;
  date: string;
  duration: number;
  notes?: string;
  completed?: boolean;
  exercises: Exercise[];
}

const WorkoutModePage = () => {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/workout-mode/:id");
  const { toast } = useToast();
  
  // Get workout ID from URL parameters
  const workoutId = match && params.id ? parseInt(params.id) : null;
  
  useEffect(() => {
    // If no match for this route, redirect back to workout tracker
    if (!match) {
      navigate("/workouts");
      toast({
        title: "Navigation Error",
        description: "Could not find workout details. Redirecting back to workout tracker.",
        variant: "destructive"
      });
    }
  }, [match, navigate, toast]);
  
  // Fetch the workout data with all exercise details
  const {
    data: workout,
    isLoading,
    isError,
    error
  } = useQuery<Workout>({
    queryKey: [`/api/workouts/${workoutId}`],
    enabled: !!workoutId,
    queryFn: async () => {
      if (!workoutId) throw new Error("No workout ID provided");
      const response = await fetch(`/api/workouts/${workoutId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch workout details");
      }
      return response.json();
    }
  });

  // Handle errors and loading states
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
        <h2 className="text-lg font-medium">Loading workout...</h2>
      </div>
    );
  }

  if (isError || !workout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md text-center">
          <h2 className="text-xl font-bold mb-4">Error Loading Workout</h2>
          <p className="mb-4 text-muted-foreground">
            {error instanceof Error ? error.message : "There was an error loading the workout."}
          </p>
          <Button onClick={() => navigate("/workouts")}>
            Return to Workout Tracker
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Add the workout mode navigation with back button at the top */}
      <WorkoutModeNav workoutId={workout.id} />
      
      <WorkoutMode
        workout={workout}
        onExit={() => {
          // Redirect back to the workout tracker
          queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
          navigate("/workouts");
        }}
      />
    </>
  );
};

export default WorkoutModePage;