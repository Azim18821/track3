import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, ChevronDown, ChevronUp, Play } from "lucide-react";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Workout } from "@/types/workout";

interface WorkoutListProps {
  workouts: Workout[];
  isLoading: boolean;
  onDeleteWorkout: (id: number) => void;
  onStartWorkout?: (workout: Workout) => void;
  onViewWorkout?: (workout: Workout) => void;
}

const WorkoutList: React.FC<WorkoutListProps> = ({
  workouts = [],
  isLoading,
  onDeleteWorkout,
  onStartWorkout,
  onViewWorkout
}) => {
  const [workoutFilter, setWorkoutFilter] = useState("all");
  const [expandedWorkouts, setExpandedWorkouts] = useState<Record<number, boolean>>({});

  // Toggle workout expanded state
  const toggleWorkoutExpanded = (workoutId: number) => {
    setExpandedWorkouts(prev => ({
      ...prev,
      [workoutId]: !prev[workoutId]
    }));
  };

  // Filter workouts by type if filter is set
  const filteredWorkouts = workoutFilter === "all" 
    ? workouts 
    : workouts.filter(workout => {
        if (workoutFilter === "upper") {
          return workout.name.toLowerCase().includes("upper");
        } else if (workoutFilter === "lower") {
          return workout.name.toLowerCase().includes("lower");
        } else if (workoutFilter === "cardio") {
          return workout.name.toLowerCase().includes("cardio");
        }
        return true;
      });

  // Sort workouts by date (newest first)
  const sortedWorkouts = [...filteredWorkouts].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Recent Workouts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading workouts...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row justify-between items-center">
        <CardTitle>Recent Workouts</CardTitle>
        <Select value={workoutFilter} onValueChange={setWorkoutFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Workouts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Workouts</SelectItem>
            <SelectItem value="upper">Upper Body</SelectItem>
            <SelectItem value="lower">Lower Body</SelectItem>
            <SelectItem value="cardio">Cardio</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {sortedWorkouts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No workouts recorded yet. Add a workout to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedWorkouts.map((workout) => (
              <div key={workout.id} className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-md font-medium">{workout.name}</h4>
                      {workout.completed && (
                        <div className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full font-medium">
                          Completed
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(workout.date), { addSuffix: true })} • {workout.duration} minutes
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {onStartWorkout && !workout.completed && (
                      <Button 
                        type="button" 
                        variant="default" 
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 h-9 flex-shrink-0"
                        onClick={() => onStartWorkout(workout)}
                      >
                        <Play className="mr-1 h-4 w-4" />
                        {/* Check if workout has any progress (any exercises with completed sets) */}
                        {workout.exercises?.some(ex => ex.setsData?.some((set: any) => set.completed)) ? (
                          <span><span className="hidden xs:inline">Continue</span> Workout</span>
                        ) : (
                          <span><span className="hidden xs:inline">Start</span> Workout</span>
                        )}
                      </Button>
                    )}
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      className="dark:border-gray-600 h-9 flex-1 min-w-[100px]"
                      onClick={() => {
                        if (onViewWorkout) {
                          onViewWorkout(workout);
                        } else {
                          toggleWorkoutExpanded(workout.id);
                        }
                      }}
                    >
                      <span className="hidden xs:inline">{expandedWorkouts[workout.id] && !onViewWorkout ? "Hide" : "View"} Details</span>
                      <span className="xs:hidden">Details</span>
                      {expandedWorkouts[workout.id] && !onViewWorkout ? (
                        <ChevronUp className="ml-1 h-4 w-4" />
                      ) : (
                        <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </Button>
                    {!workout.completed && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-9 w-9 flex-shrink-0"
                        onClick={() => onDeleteWorkout(workout.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {expandedWorkouts[workout.id] && (
                  <div className="mt-3">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {workout.exercises?.map((exercise: any) => (
                        <div key={exercise.id} className="py-3 flex flex-col sm:flex-row sm:justify-between text-sm">
                          <div className="flex-grow mb-1 sm:mb-0">
                            <span className="font-medium">{exercise.name}</span>
                            <span className="text-muted-foreground ml-2 block sm:inline mt-1 sm:mt-0">
                              {exercise.sets} sets × {exercise.reps} reps
                            </span>
                          </div>
                          <div className="text-primary font-medium flex flex-wrap items-center gap-2">
                            <span>{exercise.weight ? `${exercise.weight} kg` : 'Bodyweight'}</span>
                            {exercise.setsData && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded cursor-help">
                                    Set details
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="space-y-1 text-xs">
                                    {exercise.setsData.map((set: { reps: number, weight: number, completed: boolean }, index: number) => (
                                      <div key={index} className="flex justify-between">
                                        <span>Set {index + 1}:</span>
                                        <span>{set.reps} reps × {set.weight} kg</span>
                                      </div>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      ))}
                      {workout.notes && (
                        <div className="py-3 text-sm">
                          <p className="font-medium mb-1">Notes:</p>
                          <p>{workout.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkoutList;
