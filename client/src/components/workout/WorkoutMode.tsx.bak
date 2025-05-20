import React, { useState, useEffect, Suspense } from "react";
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
  ChevronLeft,
  ChevronRight,
  Plus,
  Play,
  Pause,
  HistoryIcon,
  Award,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

// Use dynamic import for ExerciseHistoryPopup to avoid type conflicts
const ExerciseHistoryPopup = React.lazy(() => import("./ExerciseHistoryPopup"));

interface SetData {
  reps?: number | null;
  weight?: number | null;
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
  // Add state for exercise history popup
  const [isHistoryPopupOpen, setIsHistoryPopupOpen] = useState<boolean>(true); // Auto-open on first exercise
  
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
          description: "Track your workout by entering values as you go.",
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
        // For plan mode, we'll initialize with empty strings that will show just the placeholder
        // This keeps inputs controlled but visually empty with just placeholders
        reps: typeof ex.reps === 'number' ? ex.reps : null, // Using null to display empty field with placeholder
        weight: typeof ex.weight === 'number' ? ex.weight : null, // Using null to display empty field with placeholder
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
        if (currentSet.reps === null || currentSet.reps === undefined || currentSet.reps <= 0) {
          // Show toast error and don't toggle
          toast({
            title: "Missing reps",
            description: "Please enter the number of reps before marking this set as complete.",
            variant: "destructive",
          });
          return prevState; // Don't update state
        }
        
        if (currentSet.weight === null || currentSet.weight === undefined) {
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
        // When completing, we've already validated the values exist (for plan mode)
        // When marking incomplete, keep the values as they are
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
  const updateSetWeight = (exerciseIndex: number, setIndex: number, newWeight: number | null) => {
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
  const updateSetReps = (exerciseIndex: number, setIndex: number, newReps: number | null) => {
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
  
  // Add an extra set to an exercise
  const addExtraSet = (exerciseIndex: number) => {
    setWorkoutState(prevState => {
      const updatedExercises = [...prevState.exercises];
      const currentExercise = updatedExercises[exerciseIndex];
      
      // Create a new set data object
      const newSet: SetData = {
        reps: null,
        weight: null,
        completed: false
      };
      
      // Add the new set to the setsData array
      const updatedSetsData = [...currentExercise.setsData!, newSet];
      
      // Update the exercise object
      updatedExercises[exerciseIndex] = {
        ...currentExercise,
        // Increment the sets count
        sets: currentExercise.sets + 1,
        setsData: updatedSetsData
      };
      
      // Show success toast
      toast({
        title: "Extra Set Added",
        description: `Added set ${updatedSetsData.length} to ${currentExercise.name}`,
      });
      
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
      // Use the completed status from the provided workout object
      return await apiRequest("PUT", `/api/workouts/${workout.id}`, {
        ...updatedWorkout,
        isPlanMode: false // Always convert from plan mode to regular workout
      });
    },
    onSuccess: (data, variables) => {
      // Check if this was a completed workout or just saved progress
      if (variables.completed) {
        // Show appropriate toast based on whether this was a plan mode workout
        if (isPlanModeWorkout) {
          toast({
            title: "Plan completed!",
            description: "Your plan has been converted to a completed workout.",
          });
        } else {
          toast({
            title: "Workout completed",
            description: "Your workout has been saved successfully",
          });
        }
      } else {
        // Toast for saved progress
        toast({
          title: "Progress saved",
          description: "Your workout progress has been saved. You can continue later.",
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

  // Save workout progress without completing it
  const saveWorkoutProgress = () => {
    // Create a workout with completed: false so it can be continued later
    const progressWorkout = {
      ...workoutState,
      completed: false, // Explicitly mark as not completed
      exercises: workoutState.exercises.map(ex => {
        return {
          id: ex.id,
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          unit: ex.unit || "kg",
          setsData: ex.setsData // Keep all set data as-is
        };
      })
    };
    
    // Use a direct fetch instead of our API helper to guarantee we're not setting completed: true
    fetch(`/api/workouts/${workout.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(progressWorkout)
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        
        toast({
          title: "Progress saved",
          description: "Your workout progress has been saved. You can continue later.",
        });
        
        // Invalidate queries to update the UI
        queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
        onExit();
      })
      .catch((error) => {
        console.error("Error saving progress:", error);
        toast({
          title: "Error",
          description: `Failed to save workout progress: ${error.message}`,
          variant: "destructive",
        });
      });
  };

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
      completed: true, // Mark as completed
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
      <div className="p-2 sm:p-4 border-b flex items-center justify-between bg-background z-10 pb-safe shadow-sm">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsExitAlertOpen(true)}
            className="mr-1 sm:mr-2"
            aria-label="Exit workout"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-bold">{workout.name}</h1>
              {isPlanModeWorkout && (
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Plan Mode</Badge>
              )}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
              <span>{completedSets}/{totalSets} sets completed</span>
              <span className="hidden sm:inline">({progressPercentage}%)</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant={isTimerRunning ? "destructive" : "outline"} 
            size="sm" 
            onClick={() => {
              if (isTimerRunning) {
                setIsTimerRunning(false);
              } else {
                setIsTimerRunning(true);
              }
            }}
            className="flex items-center gap-1 text-xs sm:text-sm h-8 sm:h-9"
          >
            <Timer className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="font-mono">{formatTime(timerSeconds)}</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={resetTimer}
            className="h-8 w-8 sm:h-9 sm:w-9"
            aria-label="Reset timer"
          >
            <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted w-full">
        <div 
          className="h-full bg-primary" 
          style={{ width: `${progressPercentage}%` }}
          role="progressbar"
          aria-valuenow={progressPercentage}
          aria-valuemin={0}
          aria-valuemax={100}
        ></div>
      </div>

      {/* Timer display */}
      <div className={`py-2 text-white dark:text-background text-center sticky top-0 z-10 transition-colors duration-300 ${
        isRestMode && timerSeconds > 0
          ? "bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-600/90 dark:to-amber-500/90" 
          : isTimerRunning 
            ? "bg-gradient-to-r from-primary/90 to-primary/80 dark:from-primary/90 dark:to-primary/80"
            : "bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-800/90 dark:to-slate-700/90"
      }`}>
        <div className="flex justify-center items-center gap-2">
          <TimerIcon className="h-5 w-5 text-white/90 dark:text-background/90" />
          <span className="text-xl font-mono font-semibold">{formatTime(timerSeconds)}</span>
          
          {/* Mode indicator */}
          {timerSeconds > 0 && isRestMode ? (
            <span className="text-xs font-medium px-2 py-0.5 bg-white/20 dark:bg-background/20 rounded-full">
              Rest Timer
            </span>
          ) : timerSeconds > 0 ? (
            <span className="text-xs font-medium px-2 py-0.5 bg-white/20 dark:bg-background/20 rounded-full">
              Workout Time
            </span>
          ) : null}
          
          <div className="flex gap-1">
            <Button 
              variant={isTimerRunning ? "destructive" : "default"} 
              size="sm" 
              onClick={() => {
                if (isTimerRunning) {
                  setIsTimerRunning(false);
                } else {
                  setIsTimerRunning(true);
                }
              }}
              className="h-7 px-2 text-xs flex gap-1 items-center"
            >
              {isTimerRunning ? (
                <><Pause className="h-3 w-3" /> Pause</>
              ) : (
                <><Play className="h-3 w-3" /> Start</>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={resetTimer}
              className="h-7 w-7 p-0 bg-white/10 dark:bg-background/10"
              aria-label="Reset timer"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
        
      {/* Main content - scrollable */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-16 workout-modal-content">
        {/* Exercise navigation buttons */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar">
          {workoutState.exercises.map((exercise, index) => {
            const exerciseCompleted = exercise.setsData?.every(set => set.completed);
            const exerciseInProgress = exercise.setsData?.some(set => set.completed) && !exerciseCompleted;
            
            return (
              <Button
                key={index}
                variant={activeExerciseIndex === index ? "default" : "outline"}
                size="sm"
                className={`flex-shrink-0 rounded-full px-3 ${
                  exerciseCompleted 
                    ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200 hover:text-green-800" 
                    : exerciseInProgress 
                      ? "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 hover:text-amber-800"
                      : activeExerciseIndex === index
                        ? "" // Use default primary styling
                        : "hover:bg-slate-100"
                }`}
                onClick={() => setActiveExerciseIndex(index)}
              >
                {exerciseCompleted && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600" />}
                {exerciseInProgress && <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-amber-600" />}
                <span className="truncate max-w-[120px]">{exercise.name}</span>
              </Button>
            );
          })}
        </div>

        {/* Active exercise */}
        <Card className="mb-4 shadow-sm border-border">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start mb-1">
              <CardTitle className="text-xl font-bold">{activeExercise.name}</CardTitle>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-2 text-xs flex items-center gap-1 bg-muted hover:bg-muted/80"
                onClick={() => setIsHistoryPopupOpen(true)}
              >
                <HistoryIcon className="h-3 w-3" /> 
                <span className="hidden sm:inline">View History</span>
                <span className="sm:hidden">History</span>
              </Button>
            </div>
            
            <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-1">
              <div className="flex items-center gap-1 text-sm">
                <Dumbbell className="h-4 w-4" />
                <span>{activeExercise.sets} sets × {activeExercise.reps || '?'} reps</span>
              </div>
              
              {typeof activeExercise.weight === 'number' && (
                <Badge variant="outline" className="font-normal px-2 py-1 h-6">
                  {activeExercise.weight} {activeExercise.unit || 'kg'}
                </Badge>
              )}
              
              <div className="hidden sm:flex items-center gap-1 text-xs">
                <Award className="h-3.5 w-3.5 text-amber-500" />
                <span>Best: {activeExercise.weight} {activeExercise.unit || 'kg'} × {activeExercise.reps}</span>
              </div>
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-2">
            {/* Rest timer buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Button 
                variant="outline"
                className="h-10 sm:h-12 bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                onClick={() => startRestTimer(60)}
              >
                <TimerIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">60s Rest</span>
                <span className="sm:hidden">60s</span>
              </Button>
              <Button 
                variant="outline"
                className="h-10 sm:h-12 bg-amber-500/5 text-amber-500 border-amber-500/20 hover:bg-amber-500/10"
                onClick={() => startRestTimer(90)}
              >
                <TimerIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">90s Rest</span>
                <span className="sm:hidden">90s</span>
              </Button>
              <Button 
                variant="outline"
                className="h-10 sm:h-12 bg-purple-500/5 text-purple-500 border-purple-500/20 hover:bg-purple-500/10"
                onClick={() => startRestTimer(120)}
              >
                <TimerIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">120s Rest</span>
                <span className="sm:hidden">120s</span>
              </Button>
            </div>

            {/* Info message for plan mode */}
            {isPlanModeWorkout && (
              <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-md text-sm flex items-start">
                <InfoIcon className="h-4 w-4 mt-0.5 mr-2 flex-shrink-0 text-primary" />
                <span>Enter your actual weight and reps for each set. Mark sets as completed as you perform them.</span>
              </div>
            )}

            {/* Sets tracking with per-set weight and reps */}
            <div className="space-y-3">
              {activeExercise.setsData?.map((setData, setIndex) => (
                <div key={setIndex} className={`border rounded-md overflow-hidden transition-colors ${
                  setData.completed 
                    ? "border-green-500/30 bg-green-500/5 dark:bg-green-500/10"
                    : "border-border hover:border-border/80 bg-background"
                }`}>
                  <div className="flex justify-between items-center px-3 py-2 bg-muted/40 border-b border-border">
                    <h3 className="font-medium text-sm">Set {setIndex + 1}</h3>
                    <Button
                      variant={setData.completed ? "default" : "outline"}
                      size="sm"
                      className={`h-7 text-xs ${
                        setData.completed 
                          ? "bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 dark:text-white" 
                          : "border-border"
                      }`}
                      onClick={() => toggleSetCompletion(activeExerciseIndex, setIndex)}
                    >
                      {setData.completed ? (
                        <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Completed</>
                      ) : (
                        "Mark Complete"
                      )}
                    </Button>
                  </div>
                  
                  <div className="p-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Weight ({activeExercise.unit || 'kg'})</label>
                      <Input
                        type="number"
                        value={setData.weight === null || setData.weight === undefined ? '' : setData.weight}
                        min={0}
                        onChange={(e) => {
                          const newWeight = e.target.value === '' ? null : parseFloat(e.target.value);
                          updateSetWeight(activeExerciseIndex, setIndex, newWeight);
                        }}
                        className={`h-10 ${setData.completed ? "bg-background/90" : ""}`}
                        placeholder={typeof activeExercise.weight === 'number' ? activeExercise.weight.toString() : "Weight"}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block text-muted-foreground">Reps</label>
                      <Input
                        type="number"
                        value={setData.reps === null || setData.reps === undefined ? '' : setData.reps}
                        min={1}
                        onChange={(e) => {
                          const newReps = e.target.value === '' ? null : parseInt(e.target.value);
                          updateSetReps(activeExerciseIndex, setIndex, newReps);
                        }}
                        className={`h-10 ${setData.completed ? "bg-background/90" : ""}`}
                        placeholder={typeof activeExercise.reps === 'number' ? activeExercise.reps.toString() : "Reps"}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Add Extra Set Button */}
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2 py-3 h-auto border-dashed border-2 mt-4 text-muted-foreground hover:text-foreground hover:bg-muted/10"
                onClick={() => addExtraSet(activeExerciseIndex)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Extra Set
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation buttons with improved styling */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button 
            variant="outline" 
            className="flex items-center justify-center gap-1 h-14 text-base transition-all"
            onClick={() => {
              // Navigate to previous exercise
              setActiveExerciseIndex(prev => Math.max(0, prev - 1));
            }}
            disabled={activeExerciseIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
            <div className="flex flex-col items-start">
              <span className="text-xs text-muted-foreground">Previous</span>
              <span className="font-medium truncate max-w-[100px]">
                {activeExerciseIndex > 0 
                  ? workoutState.exercises[activeExerciseIndex - 1].name
                  : "None"}
              </span>
            </div>
          </Button>
          
          <Button 
            variant="default"
            className="flex items-center justify-center gap-1 h-14 text-base transition-all"
            onClick={() => {
              // Navigate to next exercise
              setActiveExerciseIndex(prev => {
                const newIndex = Math.min(workoutState.exercises.length - 1, prev + 1);
                // Only show history popup if we actually changed exercises
                if (newIndex !== prev) {
                  // Show exercise history for the next exercise
                  setIsHistoryPopupOpen(true);
                }
                return newIndex;
              });
            }}
            disabled={activeExerciseIndex === workoutState.exercises.length - 1}
          >
            <div className="flex flex-col items-end">
              <span className="text-xs text-white/80">Next</span>
              <span className="font-medium truncate max-w-[100px]">
                {activeExerciseIndex < workoutState.exercises.length - 1 
                  ? workoutState.exercises[activeExerciseIndex + 1].name
                  : "None"}
              </span>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Complete workout button or completed status */}
        {workoutState.completed ? (
          <Card className="border-green-500/20 bg-green-500/5 dark:bg-green-500/10 mb-20">
            <CardContent className="pt-6 pb-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-green-700 dark:text-green-500 mb-2">Workout Completed</h3>
              <p className="text-green-600 dark:text-green-400">Great job! This workout has been saved to your history.</p>
              
              <div className="mt-6 flex justify-center">
                <Button
                  variant="outline"
                  className="border-green-500/30 text-green-600 dark:text-green-500 hover:bg-green-500/10"
                  onClick={onExit}
                >
                  Return to Workouts
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="pb-20">
            <Card className="border-dashed border-2 border-border bg-muted/20 shadow-none mb-4">
              <CardContent className="p-4 flex items-center">
                <div className="mr-4 p-2 rounded-full bg-primary/10">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Progress Summary</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {completedSets} of {totalSets} sets completed ({progressPercentage}%)
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Button 
              className="w-full h-14 text-lg font-medium shadow-md transition-all"
              disabled={!allExercisesCompleted || updateWorkoutMutation.isPending}
              onClick={saveAndCompleteWorkout}
            >
              {updateWorkoutMutation.isPending ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Complete Workout
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              className="w-full h-10 text-base font-medium mt-3 border-muted-foreground/30"
              onClick={() => setIsExitAlertOpen(true)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit Workout
            </Button>
            
            {!allExercisesCompleted && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                Complete all sets to finish the workout
              </p>
            )}
          </div>
        )}
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={isExitAlertOpen} onOpenChange={setIsExitAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Workout Mode?</AlertDialogTitle>
            <AlertDialogDescription>
              Choose how you want to save your progress:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => {
                  saveWorkoutProgress();
                  setIsExitAlertOpen(false);
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Save Progress
              </Button>
              <Button
                onClick={() => {
                  // For each exercise, mark all incomplete sets as completed with current values
                  const completedWorkout = {
                    ...workoutState,
                    completed: true,
                    exercises: workoutState.exercises.map(ex => ({
                      ...ex,
                      setsData: ex.setsData?.map(set => ({
                        ...set,
                        completed: true,
                        // If weight or reps is null or undefined, set to 0
                        weight: set.weight !== null && set.weight !== undefined ? set.weight : 0,
                        reps: set.reps !== null && set.reps !== undefined ? set.reps : 0
                      }))
                    }))
                  };
                  
                  // Instead of using the mutation, make a direct fetch request
                  fetch(`/api/workouts/${workout.id}`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(completedWorkout)
                  })
                    .then(async (response) => {
                      if (!response.ok) {
                        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
                      }
                      
                      toast({
                        title: "Workout completed",
                        description: "Your workout has been saved as completed.",
                      });
                      
                      // Invalidate queries to update the UI
                      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
                      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
                      setIsExitAlertOpen(false);
                      onExit();
                    })
                    .catch((error) => {
                      console.error("Error completing workout:", error);
                      toast({
                        title: "Error",
                        description: `Failed to complete workout: ${error.message}`,
                        variant: "destructive",
                      });
                    });
                }}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Workout
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Exercise History Popup */}
      {workoutState.exercises.length > 0 && (
        <Suspense fallback={<div>Loading exercise history...</div>}>
          <ExerciseHistoryPopup
            isOpen={isHistoryPopupOpen}
            onClose={() => setIsHistoryPopupOpen(false)}
            currentExercise={workoutState.exercises[activeExerciseIndex]}
            nextExercise={
              activeExerciseIndex < workoutState.exercises.length - 1
                ? workoutState.exercises[activeExerciseIndex + 1]
                : null
            }
            onStartNextExercise={() => {
              if (activeExerciseIndex < workoutState.exercises.length - 1) {
                setActiveExerciseIndex(activeExerciseIndex + 1);
                setIsHistoryPopupOpen(false);
                
                // Show a confirmation toast that we're moving to the next exercise
                toast({
                  title: "Exercise Changed",
                  description: `Starting: ${workoutState.exercises[activeExerciseIndex + 1].name}`,
                });
              }
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default WorkoutMode;