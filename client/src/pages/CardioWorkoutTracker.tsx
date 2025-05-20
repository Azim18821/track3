import { useState } from "react";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";
import CardioWorkoutForm from '@/components/workout/CardioWorkoutForm';
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function CardioWorkoutTracker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);

  // Fetch user workouts
  const { data: workouts = [], isLoading } = useQuery({
    queryKey: ['/api/workouts'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/workouts');
      if (!res.ok) throw new Error('Failed to fetch workouts');
      return await res.json();
    }
  });

  // Create workout mutation
  const createWorkoutMutation = useMutation({
    mutationFn: async (data: any) => {
      // Format the data for the API
      const formattedData = {
        workout: {
          name: data.name,
          date: data.date.toISOString().split('T')[0],
          duration: data.duration,
          notes: data.notes || '',
        },
        exercises: data.exercises.map((exercise: any) => {
          // Common fields
          const exerciseData: any = {
            name: exercise.name,
            sets: exercise.sets,
            exerciseType: exercise.exerciseType, 
          };

          // Add type-specific fields
          if (exercise.exerciseType === 'strength') {
            exerciseData.reps = exercise.reps;
            exerciseData.weight = exercise.weight;
          } else if (exercise.exerciseType === 'cardio') {
            exerciseData.duration = exercise.duration;
            exerciseData.distance = exercise.distance;
            exerciseData.distanceUnit = exercise.distanceUnit;
            exerciseData.calories = exercise.calories;
            exerciseData.speed = exercise.speed;
          }

          return exerciseData;
        })
      };

      const res = await apiRequest('POST', '/api/workouts', formattedData);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create workout');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Workout created",
        description: "Your workout has been saved successfully."
      });
      setIsAddingWorkout(false);
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to save workout: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Handle workout submission from the form
  const handleWorkoutSubmit = (data: any) => {
    createWorkoutMutation.mutate(data);
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Workout Tracker</h1>
        </div>
        
        <Button 
          onClick={() => setIsAddingWorkout(true)}
          disabled={isAddingWorkout}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Workout
        </Button>
      </div>

      {/* Enhanced Workout Form with Cardio Support */}
      {isAddingWorkout && (
        <CardioWorkoutForm
          onSubmit={handleWorkoutSubmit}
          onCancel={() => setIsAddingWorkout(false)}
        />
      )}
      
      {/* Display existing workouts */}
      {!isAddingWorkout && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workouts.map((workout: any) => (
            <Card key={workout.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-medium">
                  {workout.name}
                </CardTitle>
                <CardDescription>
                  {new Date(workout.date).toLocaleDateString()} • {workout.duration || '45'} min
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-medium mb-2">Exercises:</div>
                <div className="space-y-2">
                  {workout.exercises?.map((exercise: any, i: number) => (
                    <div key={i} className="p-2 bg-muted rounded-md">
                      <div className="font-medium">{exercise.name}</div>
                      {/* Display different details based on exercise type */}
                      {exercise.exerciseType === 'cardio' ? (
                        <div className="text-sm text-muted-foreground">
                          {exercise.duration && `${exercise.duration} min • `}
                          {exercise.distance && `${exercise.distance} ${exercise.distanceUnit || 'km'} • `}
                          {exercise.calories && `${exercise.calories} cal`}
                          {exercise.speed && ` • ${exercise.speed} ${exercise.distanceUnit === 'mi' ? 'mph' : 'km/h'}`}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {exercise.sets} sets × {exercise.reps} reps
                          {exercise.weight ? ` @ ${exercise.weight} kg` : ''}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {workouts.length === 0 && !isLoading && (
            <div className="col-span-1 lg:col-span-2 text-center p-12 border rounded-lg border-dashed">
              <p className="text-muted-foreground mb-4">You don't have any workouts yet</p>
              <Button onClick={() => setIsAddingWorkout(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Workout
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}