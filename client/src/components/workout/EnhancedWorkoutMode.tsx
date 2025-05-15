import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Play, Pause, CheckCircle, Clock, Edit, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EnhancedExerciseCard from "./EnhancedExerciseCard";
import WorkoutProgressSummary from "./WorkoutProgressSummary";
import { cn, formatDuration } from "@/lib/utils";

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

interface EnhancedWorkoutModeProps {
  workout: Workout;
  onExit: () => void;
}

export default function EnhancedWorkoutMode({ workout, onExit }: EnhancedWorkoutModeProps) {
  const { toast } = useToast();
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  // Clone the workout to track modifications
  const [workoutState, setWorkoutState] = useState<Workout>(() => {
    // Initialize setsData for each exercise if not already present
    const workoutCopy = { ...workout };
    workoutCopy.exercises = workout.exercises.map(exercise => {
      if (!exercise.setsData) {
        const defaultSets: SetData[] = Array(exercise.sets).fill(0).map((_, idx) => ({
          reps: exercise.reps,
          weight: exercise.weight,
          completed: false
        }));
        return { ...exercise, setsData: defaultSets };
      }
      return { ...exercise };
    });
    return workoutCopy;
  });
  
  // Handle starting and stopping the timer
  useEffect(() => {
    if (isTimerRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - elapsedTime * 1000;
      }
      
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);
  
  // Start the timer automatically when component mounts
  useEffect(() => {
    setIsTimerRunning(true);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Handle toggling timer
  const handleToggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };
  
  // Update an exercise's set data
  const updateExerciseSetData = (exerciseIndex: number, setIndex: number, data: Partial<SetData>) => {
    setWorkoutState(prev => {
      const newWorkoutState = { ...prev };
      const newExercises = [...newWorkoutState.exercises];
      const exercise = { ...newExercises[exerciseIndex] };
      
      if (!exercise.setsData) {
        const defaultSets: SetData[] = Array(exercise.sets).fill(0).map((_, idx) => ({
          reps: exercise.reps,
          weight: exercise.weight,
          completed: false
        }));
        exercise.setsData = defaultSets;
      }
      
      const newSetsData = [...exercise.setsData];
      newSetsData[setIndex] = { ...newSetsData[setIndex], ...data };
      exercise.setsData = newSetsData;
      newExercises[exerciseIndex] = exercise;
      newWorkoutState.exercises = newExercises;
      
      return newWorkoutState;
    });
  };
  
  // Calculate progress through the workout
  const calculateProgress = () => {
    const totalSets = workoutState.exercises.reduce((acc, exercise) => 
      acc + exercise.sets, 0);
    
    const completedSets = workoutState.exercises.reduce((acc, exercise) => {
      if (!exercise.setsData) return acc;
      return acc + exercise.setsData.filter(set => set.completed).length;
    }, 0);
    
    return (completedSets / totalSets) * 100;
  };

  // Mutation to save workout progress
  const saveWorkoutMutation = useMutation({
    mutationFn: async (updatedWorkout: Workout) => {
      const response = await fetch(`/api/workouts/${updatedWorkout.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedWorkout),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save workout progress');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      toast({
        title: "Progress saved",
        description: "Your workout progress has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save workout progress. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Save workout progress
  const handleSaveProgress = async () => {
    await saveWorkoutMutation.mutateAsync(workoutState);
  };
  
  // Complete workout
  const handleCompleteWorkout = async () => {
    setIsTimerRunning(false);
    setShowCompletionSummary(true);
  };
  
  // Handle finishing workout after seeing summary
  const handleFinishWorkout = async () => {
    const updatedWorkout = {
      ...workoutState,
      completed: true,
      duration: elapsedTime
    };
    
    await saveWorkoutMutation.mutateAsync(updatedWorkout);
    onExit();
  };
  
  // Navigate between exercises
  const goToNextExercise = () => {
    if (activeExerciseIndex < workoutState.exercises.length - 1) {
      setActiveExerciseIndex(prevIndex => prevIndex + 1);
    }
  };
  
  const goToPreviousExercise = () => {
    if (activeExerciseIndex > 0) {
      setActiveExerciseIndex(prevIndex => prevIndex - 1);
    }
  };
  
  // If showing completion summary, render that instead
  if (showCompletionSummary) {
    return (
      <WorkoutProgressSummary 
        workout={workoutState}
        elapsedTime={elapsedTime}
        onComplete={handleFinishWorkout}
        onExit={() => setShowCompletionSummary(false)}
      />
    );
  }
  
  // Calculate progress percentage
  const progressPercentage = calculateProgress();
  const currentExercise = workoutState.exercises[activeExerciseIndex];
  
  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Workout header */}
      <div className="flex flex-col mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onExit} className="p-0 h-9 w-9 mr-2">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold truncate">{workoutState.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleToggleTimer}
              className="w-10 h-10 p-0"
            >
              {isTimerRunning ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <div className="text-lg font-mono">
              {formatDuration(elapsedTime)}
            </div>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="mb-2">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </div>
      
      {/* Exercise navigation */}
      <div className="mb-6">
        <Tabs defaultValue="current" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="current">Current Exercise</TabsTrigger>
            <TabsTrigger value="all">All Exercises</TabsTrigger>
          </TabsList>
          
          <TabsContent value="current" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex justify-between items-center">
                  <span>{currentExercise.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {activeExerciseIndex + 1} of {workoutState.exercises.length}
                  </span>
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <EnhancedExerciseCard
                  exercise={currentExercise}
                  exerciseIndex={activeExerciseIndex}
                  onSetDataUpdate={(setIndex, data) => 
                    updateExerciseSetData(activeExerciseIndex, setIndex, data)
                  }
                />
              </CardContent>
              
              <CardFooter className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={goToPreviousExercise}
                  disabled={activeExerciseIndex === 0}
                >
                  Previous
                </Button>
                <Button 
                  onClick={goToNextExercise}
                  disabled={activeExerciseIndex === workoutState.exercises.length - 1}
                >
                  Next Exercise
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="all" className="mt-4">
            <div className="space-y-4">
              {workoutState.exercises.map((exercise, index) => (
                <Card 
                  key={`exercise-${index}`}
                  className={index === activeExerciseIndex ? 'border-primary' : ''}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between items-center">
                      <span>{exercise.name}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => setActiveExerciseIndex(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="text-sm">
                      {exercise.sets} sets {exercise.reps && `× ${exercise.reps} reps`}
                      {exercise.weight && ` @ ${exercise.weight}${exercise.unit || 'kg'}`}
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                        <span>Completed</span>
                        <span>
                          {exercise.setsData 
                            ? exercise.setsData.filter(set => set.completed).length 
                            : 0} of {exercise.sets} sets
                        </span>
                      </div>
                      <Progress 
                        value={exercise.setsData 
                          ? (exercise.setsData.filter(set => set.completed).length / exercise.sets) * 100
                          : 0
                        } 
                        className="h-1.5" 
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Action buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-2 justify-between">
        <Button 
          variant="outline" 
          onClick={handleSaveProgress}
          disabled={saveWorkoutMutation.isPending}
          className="flex-1"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Progress
        </Button>
        <Button 
          onClick={handleCompleteWorkout}
          disabled={saveWorkoutMutation.isPending}
          className="flex-1"
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Complete Workout
        </Button>
      </div>
      
      {/* Add spacing to account for fixed bottom bar */}
      <div className="h-20"></div>
    </div>
  );
}