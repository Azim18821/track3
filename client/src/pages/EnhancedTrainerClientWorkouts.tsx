import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format, parseISO, addDays } from 'date-fns';
import { formatDate } from '@/utils/format';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import WorkoutDetailDialog from '@/components/workout/WorkoutDetailDialog';

// We'll be adapting our workout data to match the WorkoutDetailDialog component's expected type
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, Loader2, Plus, Save, Trash2, Edit, Calendar, Dumbbell, 
  ChevronDown, ChevronUp, ArrowUpDown, Check, X, Search as SearchIcon, Pencil, Clock,
  AlertTriangle, ListChecks
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
  DialogClose,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Define the SetData interface for tracking per-set information
interface SetData {
  reps: number;
  weight: number;
  completed: boolean;
}

// Define schema for individual set data (matching AddWorkoutDialog schema)
const setDataSchema = z.object({
  reps: z.coerce.number().positive("Reps must be positive"),
  weight: z.coerce.number().nonnegative("Weight cannot be negative"),
  completed: z.boolean().default(false)
});

// Exercise schema (matching AddWorkoutDialog schema)
const exerciseSchema = z.object({
  name: z.string().min(1, "Exercise name is required"),
  sets: z.coerce.number().positive("Sets must be positive"),
  reps: z.coerce.number().positive("Reps must be positive"),
  weight: z.coerce.number().nonnegative("Weight cannot be negative").optional(),
  unit: z.string().default("kg"),
  rest: z.string().optional(),
  notes: z.string().optional(),
  setsData: z.array(setDataSchema).optional()
});

// Workout schema (matching AddWorkoutDialog schema)
const workoutSchema = z.object({
  name: z.string().min(1, { message: "Workout name is required" }),
  date: z.string().min(1, { message: "Date is required" }),
  duration: z.coerce.number().positive("Duration must be positive"),
  notes: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1, "Add at least one exercise"),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;

// Interface definitions
interface Exercise {
  id?: number; 
  workoutId?: number;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  unit?: string;
  rest?: string;
  notes?: string;
  setsData?: SetData[];
}

interface Workout {
  id: number;
  userId: number;
  name: string;
  date: string;
  duration: number;
  notes?: string;
  createdAt: string;
  exercises: Exercise[];
}

export default function EnhancedTrainerClientWorkouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const clientId = params?.clientId;
  
  // UI state
  const [isAddingWorkout, setIsAddingWorkout] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditingWorkout, setIsEditingWorkout] = useState<number | null>(null);
  const [confirmDeleteWorkout, setConfirmDeleteWorkout] = useState<number | null>(null);
  const [confirmDeleteExercise, setConfirmDeleteExercise] = useState<{workoutId: number, exerciseIndex: number} | null>(null);
  // Using any type for selectedWorkout to match WorkoutDetailDialog's expected prop type structure
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null);
  
  // Check if user is a trainer
  useEffect(() => {
    if (user && !user.isTrainer && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Fetch client details
  const { 
    data: clientData, 
    isLoading: clientLoading,
    isError: clientError,
    error: clientErrorDetails
  } = useQuery({
    queryKey: ['/api/trainer/clients', clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/clients/${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch client details');
      return await res.json();
    },
    enabled: !!clientId && !!(user?.isTrainer || user?.isAdmin)
  });
  
  // Fetch client workouts
  const { 
    data: workouts = [], 
    isLoading: workoutsLoading,
    refetch: refetchWorkouts
  } = useQuery({
    queryKey: ['/api/trainer/clients/workouts', clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/clients/${clientId}/workouts`);
      if (!res.ok) throw new Error('Failed to fetch client workouts');
      return await res.json();
    },
    enabled: !!clientId && !!(user?.isTrainer || user?.isAdmin)
  });
  
  // Fetch exercise library
  const { 
    data: exerciseLibrary = [], 
    isLoading: exerciseLibraryLoading 
  } = useQuery({
    queryKey: ['/api/exercise-library'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/exercise-library`);
      if (!res.ok) throw new Error('Failed to fetch exercise library');
      return await res.json();
    }
  });
  
  // Filtered exercises based on search
  const filteredExercises = exerciseLibrary.filter((exercise: any) => 
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Create workout form
  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      name: "Workout",
      date: format(new Date(), "yyyy-MM-dd"),
      duration: 45,
      notes: "",
      exercises: [
        { 
          name: "", 
          sets: 3, 
          reps: 10, 
          weight: 0, 
          unit: "kg",
          rest: "60 sec",
          setsData: Array(3).fill({ reps: 10, weight: 0, completed: false })
        }
      ]
    }
  });
  
  // Form field array for exercises
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "exercises"
  });
  
  // Create workout mutation
  const createWorkoutMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Mutation function data:", data);
      
      // Make sure we're sending the right format to the server
      const res = await apiRequest('POST', `/api/trainer/clients/${clientId}/workouts`, data);
      
      // Log the response status
      console.log("API Response status:", res.status);
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error("API Error response:", errorData);
        throw new Error(errorData.message || 'Failed to create workout');
      }
      
      const responseData = await res.json();
      console.log("API Success response:", responseData);
      return responseData;
    },
    onSuccess: () => {
      toast({
        title: "Workout created",
        description: "The workout has been created successfully and assigned to the client"
      });
      // Reset form to default values
      form.reset({
        name: "Workout",
        date: format(new Date(), "yyyy-MM-dd"),
        duration: 45,
        notes: "",
        exercises: [
          { 
            name: "", 
            sets: 3, 
            reps: 10, 
            weight: 0, 
            unit: "kg",
            rest: "60 sec",
            setsData: Array(3).fill({ reps: 10, weight: 0, completed: false })
          }
        ]
      });
      setIsAddingWorkout(false);
      refetchWorkouts();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating workout",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Delete workout mutation
  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      const res = await apiRequest('DELETE', `/api/trainer/clients/${clientId}/workouts/${workoutId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to delete workout');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Workout deleted",
        description: "The workout has been removed from the client's schedule"
      });
      setConfirmDeleteWorkout(null);
      refetchWorkouts();
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting workout",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Helper function to generate set data based on sets count
  const generateSetsData = (sets: number, reps: number, weight: number): SetData[] => {
    return Array(sets).fill({ reps, weight, completed: false });
  };
  
  // Handle exercise selection from library
  const handleSelectExercise = (exercise: any) => {
    if (isAddingExercise) {
      // Add the selected exercise to the form
      append({
        name: exercise.name,
        sets: 3,
        reps: 10,
        weight: 0,
        unit: "kg",
        rest: "60 sec",
        setsData: generateSetsData(3, 10, 0)
      });
      
      setIsAddingExercise(false);
    }
  };
  
  // Handle form submission
  const onSubmit = (data: WorkoutFormValues) => {
    console.log("Form submission data:", data);
    
    // Ensure each exercise has setsData populated
    const updatedExercises = data.exercises.map(exercise => {
      if (!exercise.setsData || exercise.setsData.length !== exercise.sets) {
        return {
          ...exercise,
          setsData: generateSetsData(exercise.sets, exercise.reps, exercise.weight || 0)
        };
      }
      return exercise;
    });
    
    // Format the data to match what the server expects - we don't need to include userId
    // since the server will extract it from the request URL parameter
    const workoutData = {
      name: data.name,
      date: data.date,
      duration: data.duration,
      notes: data.notes,
      exercises: updatedExercises
    };
    
    console.log("Submitting workout data:", workoutData);
    createWorkoutMutation.mutate(workoutData);
  };
  
  // Helper function to update setsData when sets count changes
  const handleSetsChange = (index: number, value: number) => {
    const currentExercise = form.getValues(`exercises.${index}`);
    const currentReps = currentExercise.reps;
    const currentWeight = currentExercise.weight || 0;
    
    // Generate new setsData array based on new sets count
    const newSetsData = generateSetsData(value, currentReps, currentWeight);
    
    // Update the form
    form.setValue(`exercises.${index}.sets`, value);
    form.setValue(`exercises.${index}.setsData`, newSetsData);
  };
  
  // Function to adapt our internal Workout type to match the type expected by WorkoutDetailDialog
  const adaptWorkoutForDetailDialog = (workout: Workout): any => {
    // Map the exercises to match the expected structure in WorkoutDetailDialog
    const adaptedExercises = workout.exercises.map(ex => ({
      id: ex.id || 0,  // Ensure id is always a number
      workoutId: ex.workoutId || workout.id, // Use workout id if exercise workoutId is missing
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      unit: ex.unit,
      rest: ex.rest,
      notes: ex.notes,
      setsData: ex.setsData || []
    }));
    
    // Create an object that matches the Workout type in WorkoutDetailDialog
    return {
      id: workout.id,
      userId: workout.userId,
      name: workout.name,
      date: workout.date,
      duration: workout.duration,
      notes: workout.notes,
      completed: false, // Default to false if not specified
      exercises: adaptedExercises
    };
  };

  // Handle view workout details
  const handleViewWorkout = (workout: Workout) => {
    // Convert the workout to the expected type for the detail dialog
    const adaptedWorkout = adaptWorkoutForDetailDialog(workout);
    setSelectedWorkout(adaptedWorkout);
  };
  
  // Using formatDate from utils/format.ts
  
  // Handle delete exercise
  const handleDeleteExercise = (index: number) => {
    remove(index);
  };
  
  // Loading state
  if (clientLoading || workoutsLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  // Error state
  if (clientError) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {clientErrorDetails instanceof Error ? clientErrorDetails.message : "Failed to load client data"}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate('/trainer')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container px-2 sm:px-6 py-4 sm:py-6 max-w-4xl overflow-x-hidden">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(`/trainer/clients/${clientId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Client
          </Button>
        </div>
        
        <Button 
          onClick={() => setIsAddingWorkout(true)}
          disabled={isAddingWorkout}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Workout
        </Button>
      </div>
      
      {/* Create Workout Dialog */}
      <Dialog open={isAddingWorkout} onOpenChange={setIsAddingWorkout}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[600px] md:max-w-[800px] overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base sm:text-lg">
              <Dumbbell className="mr-2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
              Create Workout for {clientData?.client?.username}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Design a workout for your client including sets, reps, and weights.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workout Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Leg Day" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              {field.value ? (
                                format(new Date(field.value), "PPP")
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
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min="5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Input placeholder="Any additional notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Exercises</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingExercise(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Exercise
                  </Button>
                </div>
                
                {fields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-2">No exercises added yet</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddingExercise(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Exercise
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="border rounded-lg p-4 relative"
                      >
                        <div className="absolute top-2 right-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteExercise(index)}
                            className="h-7 w-7 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`exercises.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Exercise Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g. Bench Press" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-3 gap-2">
                            <FormField
                              control={form.control}
                              name={`exercises.${index}.sets`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Sets</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      {...field} 
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (value > 0) {
                                          handleSetsChange(index, value);
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`exercises.${index}.reps`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Reps</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="1" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`exercises.${index}.weight`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Weight</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="0" step="0.5" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name={`exercises.${index}.unit`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit</FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={field.onChange}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select unit" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                    <SelectItem value="lb">Pounds (lb)</SelectItem>
                                    <SelectItem value="bodyweight">Bodyweight</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name={`exercises.${index}.rest`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rest Time</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="e.g. 60 sec" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Optional: Show per-set configuration */}
                        <div className="mt-3">
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="sets-config">
                              <AccordionTrigger className="text-sm">
                                <span className="flex items-center">
                                  <span className="mr-2">Set-by-Set Configuration</span>
                                  <Badge className="text-xs bg-blue-500">{form.getValues(`exercises.${index}.sets`)} sets</Badge>
                                </span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-2 mt-2">
                                  <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center justify-center">Set #</div>
                                    <div className="flex items-center justify-center">Reps</div>
                                    <div className="flex items-center justify-center">Weight</div>
                                    <div className="flex items-center justify-center">Unit</div>
                                  </div>
                                  
                                  {Array.from({ length: form.getValues(`exercises.${index}.sets`) || 0 }).map((_, setIndex) => (
                                    <div key={setIndex} className="grid grid-cols-4 gap-2">
                                      <div className="flex items-center justify-center bg-muted rounded-md py-1">
                                        <span className="text-xs font-medium">{setIndex + 1}</span>
                                      </div>
                                      <Input 
                                        type="number" 
                                        min="1" 
                                        className="h-8"
                                        defaultValue={form.getValues(`exercises.${index}.reps`)}
                                        onChange={(e) => {
                                          // Update this specific set's reps
                                          const setsData = [...(form.getValues(`exercises.${index}.setsData`) || [])];
                                          if (!setsData[setIndex]) {
                                            setsData[setIndex] = { reps: parseInt(e.target.value), weight: 0, completed: false };
                                          } else {
                                            setsData[setIndex].reps = parseInt(e.target.value);
                                          }
                                          form.setValue(`exercises.${index}.setsData`, setsData);
                                        }}
                                      />
                                      <Input 
                                        type="number" 
                                        min="0" 
                                        step="0.5" 
                                        className="h-8"
                                        defaultValue={form.getValues(`exercises.${index}.weight`)}
                                        onChange={(e) => {
                                          // Update this specific set's weight
                                          const setsData = [...(form.getValues(`exercises.${index}.setsData`) || [])];
                                          if (!setsData[setIndex]) {
                                            setsData[setIndex] = { reps: form.getValues(`exercises.${index}.reps`), weight: parseFloat(e.target.value), completed: false };
                                          } else {
                                            setsData[setIndex].weight = parseFloat(e.target.value);
                                          }
                                          form.setValue(`exercises.${index}.setsData`, setsData);
                                        }}
                                      />
                                      <Select
                                        defaultValue={form.getValues(`exercises.${index}.unit`)}
                                        onValueChange={(value) => {
                                          form.setValue(`exercises.${index}.unit`, value);
                                        }}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue placeholder="Unit" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="kg">kg</SelectItem>
                                          <SelectItem value="lb">lb</SelectItem>
                                          <SelectItem value="bodyweight">BW</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingWorkout(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createWorkoutMutation.isPending}
                >
                  {createWorkoutMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Workout
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Exercise Library Dialog */}
      <Dialog open={isAddingExercise} onOpenChange={setIsAddingExercise}>
        <DialogContent className="max-w-[95vw] sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Exercise Library</DialogTitle>
            <DialogDescription>
              Select an exercise from the library or create a custom exercise
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative">
            <Input
              placeholder="Search exercises..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          
          <ScrollArea className="h-[300px] rounded-md border p-2">
            {filteredExercises.length > 0 ? (
              <div className="space-y-1">
                {filteredExercises.map((exercise: any) => (
                  <Button
                    key={exercise.id}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => handleSelectExercise(exercise)}
                  >
                    <span className="flex-1">{exercise.name}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No exercises found</p>
                <p className="text-sm mt-1">Try a different search term or create a custom exercise</p>
              </div>
            )}
          </ScrollArea>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button 
              size="sm"
              onClick={() => {
                append({
                  name: "",
                  sets: 3,
                  reps: 10,
                  weight: 0,
                  unit: "kg",
                  rest: "60 sec",
                  setsData: generateSetsData(3, 10, 0)
                });
                setIsAddingExercise(false);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Custom Exercise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Workout Confirmation Dialog */}
      <Dialog open={confirmDeleteWorkout !== null} onOpenChange={() => setConfirmDeleteWorkout(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workout? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteWorkout(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDeleteWorkout !== null) {
                  deleteWorkoutMutation.mutate(confirmDeleteWorkout);
                }
              }}
              disabled={deleteWorkoutMutation.isPending}
            >
              {deleteWorkoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Workout"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Main Content */}
      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList className="grid grid-cols-2 max-w-xs mb-4">
          <TabsTrigger value="calendar"><Calendar className="h-4 w-4 mr-2" /> Calendar</TabsTrigger>
          <TabsTrigger value="list"><ListChecks className="h-4 w-4 mr-2" /> List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="calendar">
          {/* Calendar View of Workouts */}
          <Card>
            <CardHeader>
              <CardTitle>Workout Calendar</CardTitle>
              <CardDescription>
                View your client's workouts by date
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex justify-center p-4">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  className="rounded-md border"
                  modifiersStyles={{
                    selected: {
                      backgroundColor: 'rgb(79, 70, 229)',
                      color: 'white'
                    }
                  }}
                  modifiers={{
                    workout: workouts.map((workout: any) => new Date(workout.date))
                  }}
                  modifiersClassNames={{
                    workout: "bg-blue-100 text-blue-600 font-medium dark:bg-blue-900/30"
                  }}
                />
              </div>
              
              <div className="px-4 pb-4">
                <Separator className="my-4" />
                
                <h3 className="text-lg font-medium mb-4">
                  {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
                </h3>
                
                {selectedDate && (
                  <>
                    {workouts.filter((workout: any) => {
                      const workoutDate = new Date(workout.date);
                      return (
                        workoutDate.getDate() === selectedDate.getDate() &&
                        workoutDate.getMonth() === selectedDate.getMonth() &&
                        workoutDate.getFullYear() === selectedDate.getFullYear()
                      );
                    }).length > 0 ? (
                      <div className="space-y-4">
                        {workouts
                          .filter((workout: any) => {
                            const workoutDate = new Date(workout.date);
                            return (
                              workoutDate.getDate() === selectedDate.getDate() &&
                              workoutDate.getMonth() === selectedDate.getMonth() &&
                              workoutDate.getFullYear() === selectedDate.getFullYear()
                            );
                          })
                          .map((workout: any) => (
                            <Card key={workout.id} className="overflow-hidden">
                              <CardHeader className="py-2 px-4 bg-muted/50">
                                <div className="flex justify-between items-center">
                                  <CardTitle className="text-base">{workout.name}</CardTitle>
                                  <div className="flex gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => setConfirmDeleteWorkout(workout.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => navigate(`/trainer/clients/${clientId}/workouts/${workout.id}`)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="pt-3 pb-3">
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                                  <div className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {workout.duration} min
                                  </div>
                                  <div className="flex items-center">
                                    <Dumbbell className="h-3 w-3 mr-1" />
                                    {workout.exercises?.length || 0} exercises
                                  </div>
                                </div>
                                
                                {workout.exercises && workout.exercises.length > 0 && (
                                  <ul className="mt-2 space-y-1">
                                    {workout.exercises.map((exercise: any) => (
                                      <li key={exercise.id} className="text-sm flex justify-between">
                                        <span>{exercise.name}</span>
                                        <span className="text-muted-foreground">
                                          {exercise.sets} × {exercise.reps} 
                                          {exercise.weight ? ` @ ${exercise.weight} ${exercise.unit || 'kg'}` : ''}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg">
                        <p className="text-muted-foreground mb-3">No workouts scheduled for this date</p>
                        <Button
                          onClick={() => {
                            setIsAddingWorkout(true);
                            form.setValue('date', format(selectedDate, "yyyy-MM-dd"));
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Workout
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="list">
          {/* List View of Workouts */}
          <Card>
            <CardHeader>
              <CardTitle>Workout List</CardTitle>
              <CardDescription>
                View all of your client's workouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workouts.length > 0 ? (
                <div className="space-y-4">
                  {workouts
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((workout: any) => (
                      <div key={workout.id} className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-xs flex items-center gap-1"
                            >
                              <Calendar className="h-3 w-3" />
                              {formatDate(workout.date)}
                            </Badge>
                            <h3 className="text-base font-medium">{workout.name}</h3>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleViewWorkout(workout)}
                              title="View Details"
                            >
                              <ListChecks className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setConfirmDeleteWorkout(workout.id)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => navigate(`/trainer/clients/${clientId}/workouts/${workout.id}`)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value={`workout-${workout.id}`} className="border-b-0">
                            <AccordionTrigger className="py-2 text-sm">
                              <div className="flex items-center gap-3 text-muted-foreground">
                                <div className="flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {workout.duration} min
                                </div>
                                <div className="flex items-center">
                                  <Dumbbell className="h-3 w-3 mr-1" />
                                  {workout.exercises?.length || 0} exercises
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="p-2 bg-muted/30 rounded-lg">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Exercise</TableHead>
                                      <TableHead className="text-right">Sets</TableHead>
                                      <TableHead className="text-right">Reps</TableHead>
                                      <TableHead className="text-right">Weight</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {workout.exercises && workout.exercises.map((exercise: any) => (
                                      <TableRow key={exercise.id}>
                                        <TableCell>{exercise.name}</TableCell>
                                        <TableCell className="text-right">{exercise.sets}</TableCell>
                                        <TableCell className="text-right">{exercise.reps}</TableCell>
                                        <TableCell className="text-right">
                                          {exercise.weight !== undefined && exercise.weight !== null
                                            ? `${exercise.weight} ${exercise.unit || 'kg'}`
                                            : '-'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                
                                {workout.notes && (
                                  <div className="mt-3 text-sm">
                                    <span className="font-medium">Notes: </span>
                                    <span className="text-muted-foreground">{workout.notes}</span>
                                  </div>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                        
                        <Separator className="mt-1" />
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10">
                  <p className="text-muted-foreground mb-4">No workouts created yet</p>
                  <Button
                    onClick={() => setIsAddingWorkout(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Workout
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Workout Detail Dialog */}
      <WorkoutDetailDialog
        workout={selectedWorkout}
        isOpen={!!selectedWorkout}
        onClose={() => setSelectedWorkout(null)}
        isTrainerView={true}
      />
    </div>
  );
}