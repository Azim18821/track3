import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useParams, useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, ArrowLeft, Plus, Trash2, Calendar, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';

interface Exercise {
  id?: number;
  workoutId: number;
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  unit: string;
}

interface Workout {
  id: number;
  userId: number;
  name: string;
  date: string;
  notes: string | null;
  isCompleted: boolean;
  exercises: Exercise[];
}

const workoutFormSchema = z.object({
  name: z.string().min(1, "Workout name is required"),
  date: z.date({
    required_error: "Date is required",
  }),
  notes: z.string().optional().nullable(),
  isCompleted: z.boolean().default(false),
  exercises: z.array(
    z.object({
      id: z.number().optional(),
      name: z.string().min(1, "Exercise name is required"),
      sets: z.coerce.number().min(1, "Sets must be at least 1"),
      reps: z.coerce.number().min(1, "Reps must be at least 1"),
      weight: z.coerce.number().nullable(),
      unit: z.string().default("kg"),
    })
  ).optional(),
});

type WorkoutFormValues = z.infer<typeof workoutFormSchema>;

export default function AdminUserWorkoutEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { workoutId } = useParams();
  
  // Redirect if not admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch workout details
  const { 
    data: workout, 
    isLoading: workoutLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['/api/admin/workouts', workoutId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/workouts/${workoutId}`);
      if (!res.ok) throw new Error('Failed to fetch workout details');
      return await res.json();
    },
    enabled: !!user?.isAdmin && !!workoutId
  });

  // Form setup
  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues: {
      name: "",
      date: new Date(),
      notes: "",
      isCompleted: false,
      exercises: [],
    },
  });
  
  // Exercises field array
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "exercises",
  });
  
  // Update form with workout data
  useEffect(() => {
    if (workout) {
      form.reset({
        name: workout.name,
        date: new Date(workout.date),
        notes: workout.notes,
        isCompleted: workout.isCompleted,
        exercises: workout.exercises?.map((exercise: Exercise) => ({
          id: exercise.id,
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          weight: exercise.weight,
          unit: exercise.unit || "kg",
        })) || [],
      });
    }
  }, [workout, form]);

  // Update workout mutation
  const updateWorkoutMutation = useMutation({
    mutationFn: async (data: WorkoutFormValues) => {
      const res = await apiRequest('PUT', `/api/admin/workouts/${workoutId}`, data);
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to update workout: ${errorText}`);
      }
      return await res.json();
    },
    onSuccess: (updatedWorkout) => {
      toast({
        title: "Workout updated",
        description: "The workout has been updated successfully.",
      });
      // Invalidate both the workout details and the user's workouts list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/workouts', workoutId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', workout?.userId, 'workouts'] });
      
      // Navigate back
      navigate(`/admin/users/${workout?.userId}/workouts`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating workout",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: WorkoutFormValues) => {
    updateWorkoutMutation.mutate(data);
  };

  // Check if not admin
  if (!user || !user.isAdmin) {
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
  if (workoutLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "An error occurred while fetching workout"}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate(`/admin/users/${workout?.userId}/workouts`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workouts
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Edit Workout
        </h1>
        <Button 
          variant="outline" 
          onClick={() => navigate(`/admin/users/${workout?.userId}/workouts`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Workouts
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Workout Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workout Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Workout name" {...field} />
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
                      <DatePicker
                        date={field.value}
                        setDate={field.onChange}
                      />
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
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add notes about this workout..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isCompleted"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Mark as Completed</FormLabel>
                      <FormDescription>
                        Check this if the user has completed this workout
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Exercises</h3>
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div 
                      key={field.id} 
                      className="grid gap-4 md:grid-cols-5 items-end p-4 border rounded-md relative"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      
                      <FormField
                        control={form.control}
                        name={`exercises.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Exercise Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`exercises.${index}.sets`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sets</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" {...field} />
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
                              <Input 
                                type="number" 
                                min="0" 
                                step="0.5" 
                                {...field} 
                                value={field.value === null ? "" : field.value}
                                onChange={(e) => {
                                  const value = e.target.value === "" ? null : parseFloat(e.target.value);
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
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
                              <SelectTrigger>
                                <SelectValue placeholder="Unit" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectGroup>
                                  <SelectLabel>Weight Unit</SelectLabel>
                                  <SelectItem value="kg">kg</SelectItem>
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => append({
                      name: "",
                      sets: 3,
                      reps: 10,
                      weight: null,
                      unit: "kg"
                    })}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Exercise
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/admin/users/${workout?.userId}/workouts`)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateWorkoutMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                >
                  {updateWorkoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}