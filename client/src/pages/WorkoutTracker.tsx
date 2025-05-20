import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ExerciseProgress from "@/components/workout/ExerciseProgress";
import WorkoutList from "@/components/workout/WorkoutList";
import AddWorkoutDialog from "@/components/workout/AddWorkoutDialog";
import WorkoutDetailDialog from "@/components/workout/WorkoutDetailDialog";
import WeeklyWorkoutView from "@/components/workout/WeeklyWorkoutView";
import ExerciseHistoryCard from "@/components/workout/ExerciseHistoryCard";
import ExerciseHistoryDialog from "@/components/workout/ExerciseHistoryDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Calendar, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";

// Import the type definitions from the centralized types file
import { Exercise, Workout } from "@/types/workout";

const WorkoutTracker = () => {
  const [isAddWorkoutOpen, setIsAddWorkoutOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [activeTab, setActiveTab] = useState("weekly");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // State for exercise history dialog
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [isExerciseHistoryOpen, setIsExerciseHistoryOpen] = useState(false);

  // Fetch all workouts
  const { data: workouts = [], isLoading } = useQuery<Workout[]>({
    queryKey: ['/api/workouts'],
  });

  // Delete workout mutation
  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      return await fetch(`/api/workouts/${workoutId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: "Workout deleted",
        description: "The workout has been successfully deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the workout",
        variant: "destructive",
      });
    }
  });

  const handleDeleteWorkout = (workoutId: number) => {
    deleteWorkoutMutation.mutate(workoutId);
  };

  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const handleViewWorkout = (workout: Workout) => {
    // Fetch the complete workout data with exercises before showing details
    fetch(`/api/workouts/${workout.id}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch workout details');
        }
        return response.json();
      })
      .then(completeWorkout => {
        setSelectedWorkout(completeWorkout);
        toast({
          title: "Workout details",
          description: `Viewing: ${completeWorkout.name} (${completeWorkout.exercises.length} exercises)`,
        });
      })
      .catch(error => {
        console.error('Error fetching workout details:', error);
        toast({
          title: "Error",
          description: "Failed to load workout details. Please try again.",
          variant: "destructive",
        });
      });
  };

  const handleAddWorkout = (date: string) => {
    setSelectedDate(date);
    setIsAddWorkoutOpen(true);
  };

  const handleStartWorkout = (workout: Workout) => {
    // Instead of showing the workout mode as a modal, navigate to the dedicated workout mode page
    navigate(`/workout-mode/${workout.id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-3 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold leading-7 sm:text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Workout Tracker
          </h2>
        </div>
        <div className="mt-3 flex sm:mt-0 sm:ml-4">
          <Button
            onClick={() => {
              setSelectedDate(format(new Date(), "yyyy-MM-dd"));
              setIsAddWorkoutOpen(true);
            }}
            className="flex items-center gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <PlusCircle className="h-4 w-4" />
            Add Workout
          </Button>
        </div>
      </div>

      <Tabs defaultValue="weekly" value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="grid w-full grid-cols-2 mb-4 rounded-xl bg-muted/60 dark:bg-gray-800/50 p-1">
          <TabsTrigger value="weekly" className="flex items-center gap-2 rounded-lg">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Weekly View</span>
            <span className="inline sm:hidden">Weekly</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2 rounded-lg">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">List View</span>
            <span className="inline sm:hidden">List</span>
          </TabsTrigger>
        </TabsList>

        <div className="bg-white dark:bg-gray-950 rounded-xl shadow-sm border dark:border-gray-800 p-3 sm:p-4">
          <TabsContent value="weekly" className="space-y-4 mt-0">
            <WeeklyWorkoutView 
              workouts={workouts} 
              onViewWorkout={handleViewWorkout}
              onAddWorkout={handleAddWorkout}
              onStartWorkout={handleStartWorkout}
              onDeleteWorkout={handleDeleteWorkout}
            />
          </TabsContent>

          <TabsContent value="list" className="space-y-5 mt-0">
            {/* Exercise History Card - Shows exercises and last weight used */}
            <ExerciseHistoryCard 
              workouts={workouts} 
              onExerciseClick={(exerciseName) => {
                // Open the exercise history dialog
                setSelectedExercise(exerciseName);
                setIsExerciseHistoryOpen(true);
                
                // Add a toast notification to indicate the dialog is opening
                toast({
                  title: "Loading Exercise History",
                  description: `Viewing all "${exerciseName}" workout history`,
                });
              }}
            />
            
            {/* Workout Progress */}
            <ExerciseProgress workouts={workouts} />

            {/* Recent Workouts */}
            <WorkoutList 
              workouts={workouts} 
              isLoading={isLoading} 
              onDeleteWorkout={handleDeleteWorkout}
              onStartWorkout={handleStartWorkout}
              onViewWorkout={handleViewWorkout}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Fixed Action Button on mobile */}
      <div className="fixed right-4 bottom-24 sm:hidden z-10">
        <Button
          onClick={() => {
            setSelectedDate(format(new Date(), "yyyy-MM-dd"));
            setIsAddWorkoutOpen(true);
          }}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          <PlusCircle className="h-6 w-6" />
          <span className="sr-only">Add Workout</span>
        </Button>
      </div>

      {/* Add Workout Dialog */}
      <AddWorkoutDialog 
        isOpen={isAddWorkoutOpen}
        initialDate={selectedDate}
        onClose={() => {
          setIsAddWorkoutOpen(false);
          // After adding a workout, switch to weekly view
          setActiveTab("weekly");
        }} 
      />

      {/* Workout Detail Dialog */}
      <WorkoutDetailDialog
        workout={selectedWorkout}
        isOpen={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
        onStartWorkout={handleStartWorkout}
      />
      
      {/* Exercise History Dialog */}
      {selectedExercise && (
        <ExerciseHistoryDialog
          exerciseName={selectedExercise}
          isOpen={isExerciseHistoryOpen}
          onClose={() => {
            setIsExerciseHistoryOpen(false);
            setSelectedExercise(null);
          }}
        />
      )}
    </div>
  );
};

export default WorkoutTracker;
