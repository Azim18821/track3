import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Timer,
  CheckCircle2,
  RotateCcw,
  Dumbbell,
  Timer as TimerIcon,
  Save,
  RefreshCw,
  Info as InfoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SetData {
  reps?: number;
  weight?: number;
  completed: boolean;
}

interface Exercise {
  id?: number;
  name: string;
  sets: number;
  reps?: number; // Make reps optional for plan mode
  weight?: number; // Default weight value is already optional
  unit?: string; // Weight unit (kg, lbs, etc.)
  setsData?: SetData[]; // Per-set data
}

interface Workout {
  id: number;
  name: string;
  date: string;
  duration: number;
  notes?: string;
  exercises: Exercise[];
  completed?: boolean;
  isPlanMode?: boolean; // Add support for isPlanMode flag
}

interface WorkoutModeProps {
  workout: Workout;
  onExit: () => void;
}

const WorkoutMode: React.FC<WorkoutModeProps> = ({ workout, onExit }) => {
  const { toast } = useToast();
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isExitAlertOpen, setIsExitAlertOpen] = useState(false);
  // Add state to track if this is a plan mode workout
  const [isPlanModeWorkout, setIsPlanModeWorkout] = useState<boolean>(!!workout.isPlanMode);
  
  // Show a toast notification if this is a plan mode workout - only on first mount
  useEffect(() => {
    // Capture the current state of isPlanModeWorkout in the closure
    const currentIsPlanMode = isPlanModeWorkout;
    // Function reference to the current toast function
    const currentToast = toast;
    
    // Only show the toast notification on initial mount to avoid re-renders
    const showToast = () => {
      if (currentIsPlanMode) {
        currentToast({
          title: "Plan Mode Workout",
          description: "Enter the actual weights and reps for each set as you complete them.",
        });
      }
    };
    
    // Small delay to ensure component is fully mounted
    const timer = setTimeout(showToast, 100);
    return () => clearTimeout(timer);
    
    // Empty dependency array ensures this only runs once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const [workoutState, setWorkoutState] = useState<Workout>({
    ...workout,
    exercises: workout.exercises.map(ex => ({
      ...ex,
      // Initialize setsData if it doesn't exist
      setsData: ex.setsData || Array.from({ length: ex.sets }, () => ({
        // Handle plan mode workouts that might not have reps/weight defined
        // For plan mode, we'll initialize with 0 values that can be filled during the workout
        // Important: Use 0 instead of undefined for controlled inputs
        reps: typeof ex.reps === 'number' ? ex.reps : 0, // Initialize with 0 for plan mode instead of undefined
        weight: typeof ex.weight === 'number' ? ex.weight : 0, // Initialize with 0 for plan mode instead of undefined
        completed: false
      }))
    }))
  });

  // We need to track if we're in rest mode (counting down)
  const [isRestMode, setIsRestMode] = useState(false);
  
  // Timer functionality
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prevSeconds => {
          // If we're in rest mode, count down
          if (isRestMode) {
            // If we've reached 1, next will be 0
            if (prevSeconds === 1) {
              // Play notification sound when timer reaches zero
              try {
                const audio = new Audio();
                audio.src = "data:audio/wav;base64,//uQRAAAAWMSLwUIYAAsYkXgoQwAEaYLWfkWgAI0wWs/ItAAAGDgYtAgAyN+QWaAAihwMWm4G8QQRDiMcCBcH3Cc+CDv/7xA4Tvh9Rz/y8QADBwMWgQAZG/ILNAARQ4GLTcDeIIIhxGOBAuD7hOfBB3/94gcJ3w+o5/5eIAIAAAVwWgQAVQ2ORaIQwEMAJiDg95G4nQL7mQVWI6GwRcfsZAcsKkJvxgxEjzFUgfHoSQ9Qq7KNwqHwuB13MA4a1q/DmBrHgPcmjiGoh//EwC5nGPEmS4RcfkVKOhJf+WOgoxJclFz3kgn//dBA+ya1GhurNn8zb//9NNutNuhz31f////9vt///z+IdAEAAAK4LQIAKobHItEIYCGAExBwe8jcToF9zIKrEdDYIuP2MgOWFSE34wYiR5iqQPj0JIeoVdlG4VD4XA67mAcNa1fhzA1jwHuTRxDUQ//iYBczjHiTJcIuPyKlHQkv/LHQUYkuSi57yQT//uggfZNajQ3Vm//Gi60Td+QAAAAKERHh20CFOT+NEwCQchSWAkqCPW5Y1D8eLsDJ3Ufx+jC0DYDQwWCoCkAe//gcyOHqmHGpvTjCkbYBpDhwLlHdL+r9zwZZBUHM64WxwqkJYllhJN7VGE/Ej4K5mD4UOg2A4QJBSwIkLJQY4YNnOIoYYYaTEYLwBeAUIowVwLm88MUDPhIAmZQMPcSUg5YAHmhiIAE4IgAAAAAASUVORK5CYII=";
                audio.play();
                
                // Show toast notification
                toast({
                  title: "Rest Complete!",
                  description: "Time to start your next set",
                });
                
                // Stop the timer and exit rest mode
                setIsTimerRunning(false);
                setIsRestMode(false);
                return 0;
              } catch (e) {
                console.error("Failed to play notification sound:", e);
              }
            }
            return prevSeconds - 1; // Count down in rest mode
          } else {
            return prevSeconds + 1; // Count up in workout mode
          }
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isTimerRunning, isRestMode, toast]);

  // Format seconds as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset timer
  const resetTimer = () => {
    // First stop the timer, then reset seconds
    setIsTimerRunning(false);
    setIsRestMode(false); // Exit rest mode when resetting
    setTimeout(() => {
      setTimerSeconds(0);
    }, 10);
  };

  // Start rest timer (default 60 seconds)
  const startRestTimer = (seconds = 60) => {
    // First stop any running timer
    setIsTimerRunning(false);
    // Then set initial value and start
    setTimeout(() => {
      setTimerSeconds(seconds);
      setIsRestMode(true); // Enable rest mode to count down
      setIsTimerRunning(true);
      
      // Show a toast notification that rest timer has started
      toast({
        title: `${seconds}s Rest Timer Started`,
        description: "Timer will count down and notify you when complete",
      });
    }, 10);
  };

  // Toggle a set's completion status
  const toggleSetCompletion = (exerciseIndex: number, setIndex: number) => {
    setWorkoutState(prevState => {
      const updatedExercises = [...prevState.exercises];
      const updatedSetsData = [...updatedExercises[exerciseIndex].setsData!];
      const currentSet = updatedSetsData[setIndex];
      const currentlyCompleted = currentSet.completed;
      
      // If trying to mark as complete, check if values are filled in
      if (!currentlyCompleted && isPlanModeWorkout) {
        // For plan mode, validate that values are properly set before marking complete
        if (typeof currentSet.reps !== 'number' || currentSet.reps <= 0) {
          // Show toast error and don't toggle
          toast({
            title: "Missing reps",
            description: "Please enter the number of reps before marking this set as complete.",
            variant: "destructive",
          });
          return prevState; // Don't update state
        }
        
        if (typeof currentSet.weight !== 'number') {
          // Show toast error and don't toggle
          toast({
            title: "Missing weight",
            description: "Please enter the weight value before marking this set as complete.",
            variant: "destructive",
          });
          return prevState; // Don't update state
        }
      }
      
      // If validation passes or marking as incomplete, update the set
      updatedSetsData[setIndex] = {
        ...updatedSetsData[setIndex],
        // Initialize with default values if they're not set (for plan mode workouts)
        reps: updatedSetsData[setIndex].reps ?? 10, // Make sure reps has a value when completed
        weight: updatedSetsData[setIndex].weight ?? 0, // Make sure weight has a value when completed
        completed: !currentlyCompleted
      };
      
      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        setsData: updatedSetsData
      };

      return {
        ...prevState,
        exercises: updatedExercises
      };
    });
  };

  // Update set weight
  const updateSetWeight = (exerciseIndex: number, setIndex: number, newWeight: number) => {
    setWorkoutState(prevState => {
      const updatedExercises = [...prevState.exercises];
      const updatedSetsData = [...updatedExercises[exerciseIndex].setsData!];
      
      updatedSetsData[setIndex] = {
        ...updatedSetsData[setIndex],
        weight: newWeight
      };
      
      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        setsData: updatedSetsData
      };

      return {
        ...prevState,
        exercises: updatedExercises
      };
    });
  };

  // Update set reps
  const updateSetReps = (exerciseIndex: number, setIndex: number, newReps: number) => {
    setWorkoutState(prevState => {
      const updatedExercises = [...prevState.exercises];
      const updatedSetsData = [...updatedExercises[exerciseIndex].setsData!];
      
      updatedSetsData[setIndex] = {
        ...updatedSetsData[setIndex],
        reps: newReps
      };
      
      updatedExercises[exerciseIndex] = {
        ...updatedExercises[exerciseIndex],
        setsData: updatedSetsData
      };

      return {
        ...prevState,
        exercises: updatedExercises
      };
    });
  };

  // Check if all sets for all exercises are completed and have valid values
  const allExercisesCompleted = workoutState.exercises.every(exercise => 
    exercise.setsData?.every(set => 
      set.completed && 
      typeof set.reps === 'number' && 
      set.reps > 0 && 
      typeof set.weight === 'number'
    )
  );

  // Calculate progress
  const totalSets = workoutState.exercises.reduce((total, ex) => total + ex.sets, 0);
  const completedSets = workoutState.exercises.reduce((total, ex) => 
    total + (ex.setsData?.filter(set => set.completed).length || 0), 0
  );
  const progressPercentage = Math.round((completedSets / totalSets) * 100);

  // Update workout mutation
  const updateWorkoutMutation = useMutation({
    mutationFn: async (updatedWorkout: Workout) => {
      return await apiRequest("PUT", `/api/workouts/${workout.id}`, {
        ...updatedWorkout,
        completed: true, // Mark as completed
        isPlanMode: false // Convert from plan mode to regular workout
      });
    },
    onSuccess: () => {
      // Show appropriate toast based on whether this was a plan mode workout
      if (isPlanModeWorkout) {
        toast({
          title: "Plan completed!",
          description: "Your plan has been converted to a completed workout with your actual weights and reps.",
        });
      } else {
        toast({
          title: "Workout completed",
          description: "Your workout has been saved successfully",
        });
      }
      
      // Invalidate queries to update the UI
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      onExit();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save workout: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Handle save and complete workout
  const saveAndCompleteWorkout = () => {
    // For plan mode workouts, check if any sets are missing values
    if (isPlanModeWorkout) {
      let missingValues = false;
      
      // Check each exercise and each set for missing values
      for (const exercise of workoutState.exercises) {
        if (!exercise.setsData) continue;
        
        // Use regular for loop to avoid TypeScript iterator issues
        for (let i = 0; i < exercise.setsData.length; i++) {
          const set = exercise.setsData[i];
          if (set.completed) {
            // If completed, the toggleCompletion function already validated it
            continue;
          }
          
          // For incomplete sets, let user know they need to be completed
          if (!set.completed) {
            toast({
              title: "Incomplete workout",
              description: `Some sets in "${exercise.name}" are not marked as completed. Please complete all sets or remove them.`,
              variant: "destructive",
            });
            missingValues = true;
            break;
          }
        }
        
        if (missingValues) break;
      }
      
      if (missingValues) {
        return; // Don't save if there are missing values
      }
    }
    
    // Transform the workout state back to the format expected by the API
    // Include all per-set data
    const apiWorkout = {
      ...workoutState,
      // If this was a plan mode workout, mark that it's no longer in plan mode
      isPlanMode: false,
      exercises: workoutState.exercises.map(ex => {
        // Get average actual values from setsData to update the exercise defaults
        const completedSets = ex.setsData?.filter(set => set.completed) || [];
        
        // Handle possible undefined weights by using 0 as default
        const avgWeight = completedSets.length > 0
          ? completedSets.reduce((sum, set) => sum + (set.weight || 0), 0) / completedSets.length
          : (ex.weight || 0);
        
        // Handle possible undefined reps by using 10 as default
        const avgReps = completedSets.length > 0
          ? Math.round(completedSets.reduce((sum, set) => sum + (set.reps || 10), 0) / completedSets.length)
          : (ex.reps || 10);
          
        return {
          id: ex.id,
          name: ex.name,
          sets: ex.sets,
          // Update with actual values from the workout
          reps: avgReps,
          weight: avgWeight,
          unit: ex.unit || "kg",
          setsData: ex.setsData
        };
      })
    };
    
    updateWorkoutMutation.mutate(apiWorkout);
  };

  // Make sure we have a valid active exercise
  const activeExercise = workoutState.exercises[activeExerciseIndex] || workoutState.exercises[0];

  // Safety check - if there are no exercises, show a message
  if (!activeExercise) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center">
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold mb-4">Workout Error</h2>
          <p className="mb-4">This workout has no exercises or couldn't be loaded properly.</p>
          <Button onClick={onExit}>Return to Workout List</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col h-full overflow-hidden workout-modal-container">
      {/* Header - fixed at top */}
      <div className="p-2 sm:p-4 border-b flex items-center justify-between bg-background z-10 pb-safe">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsExitAlertOpen(true)}
            className="mr-1 sm:mr-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold">{workout.name}</h1>
              {isPlanModeWorkout && (
                <Badge className="bg-blue-500 hover:bg-blue-600">Plan Mode</Badge>
              )}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              Progress: {completedSets}/{totalSets} sets ({progressPercentage}%)
              {isPlanModeWorkout && (
                <span className="ml-2 text-blue-500">Fill in your actual weights and reps</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant={isTimerRunning ? "destructive" : "outline"} 
            size="sm" 
            onClick={() => {
              if (isTimerRunning) {
                // If running, just pause
                setIsTimerRunning(false);
              } else {
                // If paused, resume in same mode (don't change mode)
                setIsTimerRunning(true);
              }
            }}
            className="flex items-center gap-1 text-xs sm:text-sm h-8 sm:h-9"
          >
            <Timer className="h-3 w-3 sm:h-4 sm:w-4" />
            {formatTime(timerSeconds)}
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={resetTimer}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* Timer display for better visibility */}
      <div className={`py-2 text-white text-center sticky top-0 z-10 ${
        // If we're in rest mode, show amber/orange background, otherwise blue background
        isRestMode && timerSeconds > 0
          ? "bg-gradient-to-r from-amber-700 to-amber-600" 
          : "bg-gradient-to-r from-blue-900 to-blue-800"
      }`}>
        <div className="flex justify-center items-center gap-2">
          <TimerIcon className="h-5 w-5 text-blue-100" />
          <span className="text-xl font-mono font-semibold">{formatTime(timerSeconds)}</span>
          
          {/* Show mode indicator */}
          {timerSeconds > 0 && isRestMode ? (
            <span className="text-xs font-medium px-2 py-0.5 bg-white/20 rounded-full">
              Rest Timer
            </span>
          ) : timerSeconds > 0 ? (
            <span className="text-xs font-medium px-2 py-0.5 bg-white/20 rounded-full">
              Workout Time
            </span>
          ) : null}
          
          <div className="flex gap-1">
            <Button 
              variant={isTimerRunning ? "destructive" : "default"} 
              size="sm" 
              onClick={() => {
                if (isTimerRunning) {
                  // If running, just pause
                  setIsTimerRunning(false);
                } else {
                  // If paused, resume in same mode (don't change mode)
                  setIsTimerRunning(true);
                }
              }}
              className="h-7 px-2 text-xs"
            >
              {isTimerRunning ? "Pause" : "Start"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetTimer}
              className="h-7 w-7 p-0 bg-white/10"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
        
      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 pb-16 workout-modal-content">
        {/* Exercise navigation buttons */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-4">
          {workoutState.exercises.map((exercise, index) => {
            const exerciseCompleted = exercise.setsData?.every(set => set.completed);
            const exerciseInProgress = exercise.setsData?.some(set => set.completed) && !exerciseCompleted;
            
            return (
              <Button
                key={index}
                variant={activeExerciseIndex === index ? "default" : "outline"}
                size="sm"
                className={`flex-shrink-0 ${exerciseCompleted ? "opacity-70" : ""}`}
                onClick={() => setActiveExerciseIndex(index)}
              >
                {exerciseCompleted && <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-500" />}
                {exerciseInProgress && <RefreshCw className="h-3.5 w-3.5 mr-1 text-amber-500" />}
                {exercise.name}
              </Button>
            );
          })}
        </div>

        {/* Active exercise */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold mb-1">{activeExercise.name}</h2>
              <div className="flex items-center gap-4 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Dumbbell className="h-4 w-4" />
                  <span>{activeExercise.sets} sets &times; {activeExercise.reps} reps</span>
                </div>
                <Badge variant="outline" className="bg-muted/50">
                  {typeof activeExercise.weight === 'number' 
                    ? `Previous: ${activeExercise.weight} kg` 
                    : 'No previous weight'}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <Button 
                className="h-12 w-full md:w-auto bg-blue-600 hover:bg-blue-700"
                onClick={() => startRestTimer(60)}
              >
                <TimerIcon className="h-4 w-4 mr-2" />
                Start 60s Rest Timer
              </Button>
              <Button 
                className="h-12 hidden md:flex bg-amber-600 hover:bg-amber-700" 
                onClick={() => startRestTimer(90)}
              >
                <TimerIcon className="h-4 w-4 mr-2" />
                90s Rest
              </Button>
              <Button 
                className="h-12 hidden md:flex bg-purple-600 hover:bg-purple-700" 
                onClick={() => startRestTimer(120)}
              >
                <TimerIcon className="h-4 w-4 mr-2" />
                120s Rest
              </Button>
            </div>

            <Separator className="my-4" />
            
            {/* Info text about workout tracking */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm text-blue-700">
              <InfoIcon className="inline-block mr-2 h-4 w-4" />
              You can only mark sets as completed during an active workout. Weight and reps cannot be modified to ensure accurate tracking.
            </div>

            {/* Sets tracking with per-set weight and reps */}
            <div className="space-y-4">
              {activeExercise.setsData?.map((setData, setIndex) => (
                <div key={setIndex} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Set {setIndex + 1}</h3>
                    <Button
                      variant={setData.completed ? "default" : "outline"}
                      size="sm"
                      className={`h-8 ${setData.completed ? "bg-green-600 hover:bg-green-700" : ""}`}
                      onClick={() => toggleSetCompletion(activeExerciseIndex, setIndex)}
                    >
                      {setData.completed ? (
                        <><CheckCircle2 className="h-4 w-4 mr-1" /> Completed</>
                      ) : "Mark Complete"}
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block">Weight (kg)</label>
                      <Input
                        type="number"
                        value={setData.weight === null || setData.weight === undefined ? '' : setData.weight}
                        min={0}
                        onChange={(e) => {
                          const newWeight = e.target.value === '' ? 0 : parseFloat(e.target.value);
                          updateSetWeight(activeExerciseIndex, setIndex, newWeight);
                        }}
                        className="h-10"
                        placeholder="Enter weight"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Reps</label>
                      <Input
                        type="number"
                        value={setData.reps === null || setData.reps === undefined ? '' : setData.reps}
                        min={1}
                        onChange={(e) => {
                          const newReps = e.target.value === '' ? 0 : parseInt(e.target.value);
                          updateSetReps(activeExerciseIndex, setIndex, newReps);
                        }}
                        className="h-10"
                        placeholder="Enter reps"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation buttons - with responsive text */}
        <div className="flex gap-2 mb-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setActiveExerciseIndex(prev => Math.max(0, prev - 1))}
            disabled={activeExerciseIndex === 0}
          >
            <span className="hidden sm:inline">Previous Exercise</span>
            <span className="inline sm:hidden">Previous</span>
          </Button>
          <Button 
            className="flex-1"
            onClick={() => setActiveExerciseIndex(prev => Math.min(workoutState.exercises.length - 1, prev + 1))}
            disabled={activeExerciseIndex === workoutState.exercises.length - 1}
          >
            <span className="hidden sm:inline">Next Exercise</span>
            <span className="inline sm:hidden">Next</span>
          </Button>
        </div>

        {/* Complete workout button or completed status */}
        {workoutState.completed ? (
          <div className="w-full p-4 bg-green-50 text-green-800 rounded-md text-center mb-20">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2" />
            <p className="text-lg font-medium">Workout Completed</p>
            <p className="text-sm mt-1">Great job! This workout has been marked as complete.</p>
          </div>
        ) : (
          <div className="pb-20">
            <Button 
              className="w-full h-12 text-lg"
              disabled={!allExercisesCompleted || updateWorkoutMutation.isPending}
              onClick={saveAndCompleteWorkout}
            >
              <Save className="h-5 w-5 mr-2" />
              Complete Workout
            </Button>
          </div>
        )}
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={isExitAlertOpen} onOpenChange={setIsExitAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Workout Mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be saved, but the workout won't be marked as complete. You can resume later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onExit}>Exit Workout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkoutMode;