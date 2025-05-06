import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, addWeeks, subWeeks, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Dumbbell, Clock, Plus, Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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

interface Workout {
  id: number;
  name: string;
  date: string;
  duration: number;
  notes?: string;
  completed?: boolean;
  exercises: Exercise[];
}

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  unit?: string;
}

interface WeeklyWorkoutViewProps {
  workouts: Workout[];
  onViewWorkout: (workout: Workout) => void;
  onAddWorkout?: (date: string) => void;
  onStartWorkout?: (workout: Workout) => void;
  onDeleteWorkout?: (id: number) => void;
}

const WeeklyWorkoutView: React.FC<WeeklyWorkoutViewProps> = ({ 
  workouts, 
  onViewWorkout,
  onAddWorkout,
  onStartWorkout,
  onDeleteWorkout
}) => {
  // Use today's date as the maximum available date for navigation
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [weeklyWorkouts, setWeeklyWorkouts] = useState<{ [key: string]: Workout[] }>({});
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<number | null>(null);

  // Calculate the oldest allowed date (3 weeks before today)
  const threeWeeksAgo = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 3);
  
  // Calculate the start and end of the week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Week starts on Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  // Generate array of days for the current week
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    // Group workouts by day
    const sortedWorkouts: { [key: string]: Workout[] } = {};
    
    // Initialize all days of the week with empty arrays
    daysOfWeek.forEach(day => {
      const formattedDate = format(day, "yyyy-MM-dd");
      sortedWorkouts[formattedDate] = [];
    });
    
    // Add workouts to their respective days
    if (workouts && workouts.length > 0) {
      workouts.forEach(workout => {
        // Standardize date format - some dates might come with time component
        let workoutDate = workout.date;
        if (workoutDate.includes('T')) {
          // If the date has a time component, strip it off
          workoutDate = workoutDate.split('T')[0];
        }
        
        if (sortedWorkouts[workoutDate]) {
          sortedWorkouts[workoutDate].push({...workout, date: workoutDate});
        } else {
          // If the date is outside the current week view, we won't show it
          // But we could expand this later to show workouts from other weeks
          // console.log(`Workout ${workout.id} has date ${workoutDate} which is not in the current week view`);
        }
      });
    }
    
    setWeeklyWorkouts(sortedWorkouts);
  }, [workouts, currentDate]);

  const navigateWeek = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      // Don't allow going into the future past the current week
      if (weekStart < startOfWeek(today, { weekStartsOn: 1 })) {
        setCurrentDate(addWeeks(currentDate, 1));
      }
    } else {
      // Don't allow going back more than 3 weeks
      if (weekStart > threeWeeksAgo) {
        setCurrentDate(subWeeks(currentDate, 1));
      }
    }
  };

  // Format for display
  const getWeekDateRange = () => {
    return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  };

  const getTodayString = () => format(new Date(), "yyyy-MM-dd");

  const handleAddWorkout = (dateStr: string) => {
    if (onAddWorkout) {
      onAddWorkout(dateStr);
    }
  };

  const handleDeleteWorkout = (id: number) => {
    setWorkoutToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteWorkout = () => {
    if (workoutToDelete && onDeleteWorkout) {
      onDeleteWorkout(workoutToDelete);
      setWorkoutToDelete(null);
    }
    setIsDeleteDialogOpen(false);
  };
  
  // Check if we're at limits for navigation
  const isAtOldestWeek = weekStart <= threeWeeksAgo;
  const isAtCurrentWeek = weekStart >= startOfWeek(today, { weekStartsOn: 1 });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Weekly Workout Log</h2>
        <div className="flex items-center space-x-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateWeek('prev')}
            disabled={isAtOldestWeek}
            className="h-8 w-8 p-0"
            title={isAtOldestWeek ? "Can't go back more than 3 weeks" : "Previous week"}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous Week</span>
          </Button>
          <span className="text-sm px-2">{getWeekDateRange()}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateWeek('next')}
            disabled={isAtCurrentWeek}
            className="h-8 w-8 p-0"
            title={isAtCurrentWeek ? "Can't go into the future" : "Next week"}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next Week</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-hidden">
        {daysOfWeek.map((day, index) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayWorkouts = weeklyWorkouts[dateStr] || [];
          const isToday = dateStr === getTodayString();
          const isPast = new Date(dateStr) < new Date(getTodayString());
          
          return (
            <Card 
              key={index} 
              className={`overflow-hidden ${isToday ? 'border-primary' : ''}`}
            >
              <CardHeader className="p-3 bg-muted/30 dark:bg-gray-800/50">
                <CardTitle className="text-sm flex justify-between items-center">
                  <span>{format(day, "EEE")}</span>
                  <span className="text-xs text-muted-foreground">{format(day, "MMM d")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 min-h-[100px] max-h-[300px] overflow-y-auto">
                {dayWorkouts.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">No workouts</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayWorkouts.map((workout) => (
                      <div 
                        key={workout.id} 
                        className={`p-2 rounded-md text-xs cursor-pointer hover:bg-accent dark:hover:bg-gray-700 transition-colors ${
                          workout.completed ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/50 dark:bg-gray-800/70'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-medium mb-1">{workout.name}</div>
                          {onDeleteWorkout && !workout.completed && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWorkout(workout.id);
                              }}
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{workout.duration} min</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                          <Dumbbell className="h-3 w-3" />
                          <span>{workout.exercises?.length || 0} exercises</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {onStartWorkout && !workout.completed && (
                            <Button 
                              size="sm" 
                              className="h-6 px-2 text-[10px] bg-green-600 hover:bg-green-700 w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartWorkout(workout);
                              }}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start Workout
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            className="h-6 px-2 text-[10px] w-full dark:border-gray-600"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewWorkout(workout);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                        {workout.completed && (
                          <Badge className="mt-1 bg-green-500 hover:bg-green-600 text-[10px]">
                            Completed
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-2 flex justify-center border-t dark:border-gray-700">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full h-7 text-xs"
                  onClick={() => handleAddWorkout(dateStr)}
                >
                  <Plus className="h-3 w-3 mr-1" /> 
                  Add Workout
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workout? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteWorkout} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WeeklyWorkoutView;