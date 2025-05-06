import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format, parseISO, addDays } from 'date-fns';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  ArrowLeft, Loader2, Plus, Save, Trash2, Edit, Calendar, Dumbbell, 
  ChevronDown, ChevronUp, ArrowUpDown, Check
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Workout form schema
const workoutSchema = z.object({
  name: z.string().min(1, { message: "Workout name is required" }),
  date: z.date(),
  notes: z.string().optional(),
});

// Exercise schema
const exerciseSchema = z.object({
  name: z.string().min(1, { message: "Exercise name is required" }),
  sets: z.coerce.number().min(1, { message: "At least 1 set is required" }),
  reps: z.coerce.number().min(1, { message: "At least 1 rep is required" }),
  weight: z.coerce.number().optional(),
  restSeconds: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;
type ExerciseFormValues = z.infer<typeof exerciseSchema>;

interface Exercise {
  id?: number; 
  workoutId?: number;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  restSeconds?: number;
  notes?: string;
}

interface Workout {
  id: number;
  userId: number;
  name: string;
  date: string;
  notes?: string;
  createdAt: string;
  exercises: Exercise[];
}

// Component for add/edit exercise form
function ExerciseForm({
  exercise,
  onSave,
  onCancel,
}: {
  exercise?: Exercise;
  onSave: (exercise: ExerciseFormValues) => void;
  onCancel: () => void;
}) {
  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: exercise || {
      name: '',
      sets: 3,
      reps: 10,
      weight: 0,
      restSeconds: 60,
      notes: '',
    },
  });

  const onSubmit = (data: ExerciseFormValues) => {
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Exercise Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Bench Press" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sets</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="reps"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reps</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight (optional)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="kg or lbs" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="restSeconds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rest (seconds)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 60" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional instructions..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            Save Exercise
          </Button>
        </div>
      </form>
    </Form>
  );
}

export default function TrainerClientWorkouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { clientId } = useParams();
  
  // State for workout creation/editing
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState<number | null>(null);
  const [workoutDate, setWorkoutDate] = useState<Date>(new Date());
  const [workoutExercises, setWorkoutExercises] = useState<Exercise[]>([]);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [editingExerciseIndex, setEditingExerciseIndex] = useState<number | null>(null);
  const [confirmDeleteWorkoutId, setConfirmDeleteWorkoutId] = useState<number | null>(null);
  
  // Redirect if not trainer
  useEffect(() => {
    if (user && !user.isTrainer && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  // Reset workout form when switching modes
  useEffect(() => {
    if (isAddingWorkout) {
      setWorkoutExercises([]);
      setEditingWorkoutId(null);
      workoutForm.reset({
        name: '',
        date: new Date(),
        notes: '',
      });
    }
  }, [isAddingWorkout]);

  // Fetch client details
  const { 
    data: clientData, 
    isLoading: clientLoading,
    isError: clientError,
    error: clientErrorDetail
  } = useQuery({
    queryKey: ['/api/trainer/clients', clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/clients/${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch client details');
      return await res.json();
    },
    enabled: !!(user?.isTrainer || user?.isAdmin) && !!clientId
  });

  // Fetch client workouts
  const { 
    data: workouts = [], 
    isLoading: workoutsLoading,
    isError: workoutsError,
    error: workoutsErrorDetail,
    refetch: refetchWorkouts
  } = useQuery({
    queryKey: ['/api/trainer/clients', clientId, 'workouts'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/clients/${clientId}/workouts`);
      if (!res.ok) throw new Error('Failed to fetch client workouts');
      return await res.json();
    },
    enabled: !!(user?.isTrainer || user?.isAdmin) && !!clientId
  });

  // Form setup for workout
  const workoutForm = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      name: '',
      date: new Date(),
      notes: '',
    },
  });

  // Create workout mutation
  const createWorkoutMutation = useMutation({
    mutationFn: async (data: { workout: WorkoutFormValues, exercises: Exercise[] }) => {
      const { workout, exercises } = data;
      const payload = {
        workout: {
          ...workout,
          date: format(workout.date, 'yyyy-MM-dd'),
        },
        exercises
      };
      
      const res = await apiRequest('POST', `/api/trainer/clients/${clientId}/workouts`, payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create workout');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Workout created",
        description: "The workout has been created successfully.",
      });
      setIsAddingWorkout(false);
      setWorkoutExercises([]);
      // Refetch workouts
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/clients', clientId, 'workouts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating workout",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update workout mutation
  const updateWorkoutMutation = useMutation({
    mutationFn: async (data: { workoutId: number, workout: WorkoutFormValues, exercises: Exercise[] }) => {
      const { workoutId, workout, exercises } = data;
      const payload = {
        workoutUpdate: {
          ...workout,
          date: format(workout.date, 'yyyy-MM-dd'),
        },
        exercises
      };
      
      const res = await apiRequest('PUT', `/api/trainer/clients/${clientId}/workouts/${workoutId}`, payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update workout');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Workout updated",
        description: "The workout has been updated successfully.",
      });
      setEditingWorkoutId(null);
      setWorkoutExercises([]);
      // Refetch workouts
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/clients', clientId, 'workouts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating workout",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete workout mutation
  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      const res = await apiRequest('DELETE', `/api/trainer/clients/${clientId}/workouts/${workoutId}`);
      if (!res.ok && res.status !== 204) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete workout');
      }
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Workout deleted",
        description: "The workout has been deleted successfully.",
      });
      setConfirmDeleteWorkoutId(null);
      // Refetch workouts
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/clients', clientId, 'workouts'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting workout",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Function to add an exercise to the list
  const handleAddExercise = (exercise: ExerciseFormValues) => {
    if (editingExerciseIndex !== null) {
      // Update existing exercise
      const updatedExercises = [...workoutExercises];
      updatedExercises[editingExerciseIndex] = exercise;
      setWorkoutExercises(updatedExercises);
      setEditingExerciseIndex(null);
    } else {
      // Add new exercise
      setWorkoutExercises([...workoutExercises, exercise]);
    }
    setIsAddingExercise(false);
  };

  // Function to edit an exercise
  const handleEditExercise = (index: number) => {
    setEditingExerciseIndex(index);
    setIsAddingExercise(true);
  };

  // Function to remove an exercise
  const handleRemoveExercise = (index: number) => {
    const updatedExercises = workoutExercises.filter((_, i) => i !== index);
    setWorkoutExercises(updatedExercises);
  };

  // Function to move an exercise up or down in the list
  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const updatedExercises = [...workoutExercises];
      const temp = updatedExercises[index];
      updatedExercises[index] = updatedExercises[index - 1];
      updatedExercises[index - 1] = temp;
      setWorkoutExercises(updatedExercises);
    } else if (direction === 'down' && index < workoutExercises.length - 1) {
      const updatedExercises = [...workoutExercises];
      const temp = updatedExercises[index];
      updatedExercises[index] = updatedExercises[index + 1];
      updatedExercises[index + 1] = temp;
      setWorkoutExercises(updatedExercises);
    }
  };

  // Handle workout form submission
  const onSubmitWorkout = (data: WorkoutFormValues) => {
    if (workoutExercises.length === 0) {
      toast({
        title: "No exercises added",
        description: "Please add at least one exercise to the workout.",
        variant: "destructive",
      });
      return;
    }

    if (editingWorkoutId) {
      // Update existing workout
      updateWorkoutMutation.mutate({
        workoutId: editingWorkoutId,
        workout: data,
        exercises: workoutExercises
      });
    } else {
      // Create new workout
      createWorkoutMutation.mutate({
        workout: data,
        exercises: workoutExercises
      });
    }
  };

  // Function to start editing an existing workout
  const startEditingWorkout = (workout: Workout) => {
    setEditingWorkoutId(workout.id);
    setIsAddingWorkout(false);
    
    // Set form values
    workoutForm.reset({
      name: workout.name,
      date: new Date(workout.date),
      notes: workout.notes || '',
    });
    
    // Set exercises
    setWorkoutExercises(workout.exercises);
  };

  // Check if not trainer or admin
  if (!user || (!user.isTrainer && !user.isAdmin)) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Show loading state
  if (clientLoading || workoutsLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show error state
  if (clientError || workoutsError) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {clientError && (clientErrorDetail instanceof Error ? clientErrorDetail.message : "An error occurred while fetching client data")}
            {workoutsError && (workoutsErrorDetail instanceof Error ? workoutsErrorDetail.message : "An error occurred while fetching workouts")}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate(`/trainer/clients/${clientId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Client
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Workouts for {clientData?.client?.username}
        </h1>
        <div className="flex space-x-3">
          <Button 
            onClick={() => {
              setIsAddingWorkout(true);
              setEditingWorkoutId(null);
            }}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
            disabled={isAddingWorkout || editingWorkoutId !== null}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Workout
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate(`/trainer/clients/${clientId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Client
          </Button>
        </div>
      </div>

      {/* Create/Edit Workout Form */}
      {(isAddingWorkout || editingWorkoutId !== null) && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>
              {editingWorkoutId !== null ? "Edit Workout" : "Create New Workout"}
            </CardTitle>
            <CardDescription>
              Create a workout plan for your client with specific exercises.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...workoutForm}>
              <form onSubmit={workoutForm.handleSubmit(onSubmitWorkout)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={workoutForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Workout Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Upper Body Strength" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={workoutForm.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Workout Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className="w-full pl-3 text-left font-normal flex justify-between"
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <Calendar className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={workoutForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workout Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter any additional instructions or notes about this workout..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium">Exercises</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsAddingExercise(true);
                        setEditingExerciseIndex(null);
                      }}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Exercise
                    </Button>
                  </div>
                  
                  {workoutExercises.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Dumbbell className="mx-auto h-12 w-12 opacity-20" />
                      <p className="mt-2">No exercises added yet</p>
                      <p className="text-sm">Click "Add Exercise" to build your workout</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workoutExercises.map((exercise, index) => (
                        <div key={index} className="border rounded-md p-3 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{exercise.name}</div>
                            <div className="flex space-x-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveExercise(index, 'up')}
                                disabled={index === 0}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMoveExercise(index, 'down')}
                                disabled={index === workoutExercises.length - 1}
                                className="h-8 w-8 p-0"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditExercise(index)}
                                className="h-8 w-8 p-0 text-blue-600"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveExercise(index)}
                                className="h-8 w-8 p-0 text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {exercise.sets} sets × {exercise.reps} reps
                            {exercise.weight && exercise.weight > 0 ? ` at ${exercise.weight} kg` : ''}
                            {exercise.restSeconds ? ` (${exercise.restSeconds}s rest)` : ''}
                          </div>
                          {exercise.notes && (
                            <div className="mt-1 text-sm italic">{exercise.notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddingWorkout(false);
                      setEditingWorkoutId(null);
                      setWorkoutExercises([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createWorkoutMutation.isPending ||
                      updateWorkoutMutation.isPending ||
                      workoutExercises.length === 0
                    }
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                  >
                    {(createWorkoutMutation.isPending || updateWorkoutMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    {editingWorkoutId ? "Update Workout" : "Create Workout"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Exercise Add/Edit Dialog */}
      <Dialog 
        open={isAddingExercise} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddingExercise(false);
            setEditingExerciseIndex(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExerciseIndex !== null ? "Edit Exercise" : "Add Exercise"}
            </DialogTitle>
            <DialogDescription>
              {editingExerciseIndex !== null
                ? "Update the details for this exercise"
                : "Fill in the details for the exercise you want to add."}
            </DialogDescription>
          </DialogHeader>
          
          <ExerciseForm
            exercise={editingExerciseIndex !== null ? workoutExercises[editingExerciseIndex] : undefined}
            onSave={handleAddExercise}
            onCancel={() => {
              setIsAddingExercise(false);
              setEditingExerciseIndex(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Workout Confirmation Dialog */}
      <Dialog
        open={confirmDeleteWorkoutId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteWorkoutId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workout</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workout? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteWorkoutId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteWorkoutMutation.isPending}
              onClick={() => {
                if (confirmDeleteWorkoutId) {
                  deleteWorkoutMutation.mutate(confirmDeleteWorkoutId);
                }
              }}
            >
              {deleteWorkoutMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workouts List */}
      <Card>
        <CardHeader>
          <CardTitle>Client Workouts</CardTitle>
          <CardDescription>
            View and manage the workouts you've created for this client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workouts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Dumbbell className="mx-auto h-16 w-16 opacity-20" />
              <p className="mt-4">No workouts found</p>
              <p className="text-sm mt-2">Create your first workout for this client using the button above.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {workouts.sort((a: Workout, b: Workout) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((workout: Workout) => (
                <AccordionItem 
                  key={workout.id} 
                  value={`workout-${workout.id}`}
                  className="border rounded-lg overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-2 hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center">
                        <div className="font-medium">{workout.name}</div>
                        <div className="ml-4 text-sm text-muted-foreground">
                          {format(new Date(workout.date), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="text-sm bg-muted px-2 py-1 rounded-full">
                        {workout.exercises.length} exercises
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-0">
                    <div className="px-4 pb-3 pt-0">
                      {workout.notes && (
                        <div className="mb-3 text-sm italic border-l-2 pl-3 py-1 border-muted">
                          {workout.notes}
                        </div>
                      )}
                      
                      <div className="space-y-3 mb-4">
                        {workout.exercises.map((exercise: Exercise, index: number) => (
                          <div key={index} className="border rounded-md p-3 bg-muted/10">
                            <div className="font-medium">{exercise.name}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {exercise.sets} sets × {exercise.reps} reps
                              {exercise.weight && exercise.weight > 0 ? ` at ${exercise.weight} kg` : ''}
                              {exercise.restSeconds ? ` (${exercise.restSeconds}s rest)` : ''}
                            </div>
                            {exercise.notes && (
                              <div className="mt-1 text-sm italic">{exercise.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-end space-x-2 border-t pt-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEditingWorkout(workout)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => setConfirmDeleteWorkoutId(workout.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}