import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Plus, Trash, Save } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Form schema
const fitnessPlanSchema = z.object({
  clientId: z.string().transform(val => parseInt(val, 10)),
  name: z.string().min(3, { message: 'Plan name must be at least 3 characters' }),
  description: z.string().optional(),
  notes: z.string().optional(),
});

type FitnessPlanFormData = z.infer<typeof fitnessPlanSchema>;

// Workout and Meal data structures
interface WorkoutDay {
  day: string;
  exercises: {
    name: string;
    sets: number;
    reps: number;
    rest: number;
    notes?: string;
  }[];
}

interface MealDay {
  day: string;
  meals: {
    type: string;
    description: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  }[];
}

const defaultWorkoutWeek: WorkoutDay[] = [
  { day: 'Monday', exercises: [] },
  { day: 'Tuesday', exercises: [] },
  { day: 'Wednesday', exercises: [] },
  { day: 'Thursday', exercises: [] },
  { day: 'Friday', exercises: [] },
  { day: 'Saturday', exercises: [] },
  { day: 'Sunday', exercises: [] },
];

const defaultMealWeek: MealDay[] = [
  { day: 'Monday', meals: [] },
  { day: 'Tuesday', meals: [] },
  { day: 'Wednesday', meals: [] },
  { day: 'Thursday', meals: [] },
  { day: 'Friday', meals: [] },
  { day: 'Saturday', meals: [] },
  { day: 'Sunday', meals: [] },
];

const CreateFitnessPlan: React.FC = () => {
  const [, navigate] = useLocation();
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutDay[]>(defaultWorkoutWeek);
  const [mealPlan, setMealPlan] = useState<MealDay[]>(defaultMealWeek);
  
  // Get clients for the dropdown
  const { data: clients, isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: ['/api/trainer/clients'],
    retry: 1,
  });

  // Form setup
  const form = useForm<FitnessPlanFormData>({
    resolver: zodResolver(fitnessPlanSchema),
    defaultValues: {
      name: '',
      description: '',
      notes: '',
    },
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (data: FitnessPlanFormData & { workoutPlan: WorkoutDay[], mealPlan: MealDay[] }) => 
      apiRequest('/api/trainer/fitness-plans', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      navigate('/trainer');
    },
  });

  // Form submission
  function onSubmit(data: FitnessPlanFormData) {
    createPlanMutation.mutate({
      ...data,
      workoutPlan,
      mealPlan,
    });
  }

  // Add a new exercise to a workout day
  const addExercise = (dayIndex: number) => {
    const updatedWorkoutPlan = [...workoutPlan];
    updatedWorkoutPlan[dayIndex].exercises.push({
      name: '',
      sets: 3,
      reps: 10,
      rest: 60,
    });
    setWorkoutPlan(updatedWorkoutPlan);
  };

  // Remove an exercise
  const removeExercise = (dayIndex: number, exerciseIndex: number) => {
    const updatedWorkoutPlan = [...workoutPlan];
    updatedWorkoutPlan[dayIndex].exercises.splice(exerciseIndex, 1);
    setWorkoutPlan(updatedWorkoutPlan);
  };

  // Update an exercise
  const updateExercise = (dayIndex: number, exerciseIndex: number, field: string, value: any) => {
    const updatedWorkoutPlan = [...workoutPlan];
    updatedWorkoutPlan[dayIndex].exercises[exerciseIndex] = {
      ...updatedWorkoutPlan[dayIndex].exercises[exerciseIndex],
      [field]: field === 'sets' || field === 'reps' || field === 'rest' ? parseInt(value) : value
    };
    setWorkoutPlan(updatedWorkoutPlan);
  };

  // Add a new meal to a day
  const addMeal = (dayIndex: number) => {
    const updatedMealPlan = [...mealPlan];
    updatedMealPlan[dayIndex].meals.push({
      type: 'Breakfast',
      description: '',
    });
    setMealPlan(updatedMealPlan);
  };

  // Remove a meal
  const removeMeal = (dayIndex: number, mealIndex: number) => {
    const updatedMealPlan = [...mealPlan];
    updatedMealPlan[dayIndex].meals.splice(mealIndex, 1);
    setMealPlan(updatedMealPlan);
  };

  // Update a meal
  const updateMeal = (dayIndex: number, mealIndex: number, field: string, value: any) => {
    const updatedMealPlan = [...mealPlan];
    updatedMealPlan[dayIndex].meals[mealIndex] = {
      ...updatedMealPlan[dayIndex].meals[mealIndex],
      [field]: ['calories', 'protein', 'carbs', 'fat'].includes(field) ? parseInt(value) : value
    };
    setMealPlan(updatedMealPlan);
  };

  if (clientsLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-6 px-4 md:px-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  if (clientsError || !clients) {
    return (
      <div className="container max-w-4xl mx-auto py-6 px-4 md:px-6">
        <Button variant="ghost" onClick={() => navigate('/trainer')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load clients. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto py-6 px-4 md:px-6">
        <Button variant="ghost" onClick={() => navigate('/trainer')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Alert className="mt-4">
          <AlertTitle>No clients</AlertTitle>
          <AlertDescription>
            You don't have any clients yet. You need at least one client to create a fitness plan.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/trainer')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
      
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Create Fitness Plan</CardTitle>
          <CardDescription>
            Create a comprehensive fitness plan including workout routines and meal plans for your client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select which client this fitness plan is for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Strength Building Program" {...field} />
                    </FormControl>
                    <FormDescription>
                      Give your fitness plan a descriptive name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="A 12-week strength program focusing on compound movements and progressive overload."
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Describe the overall goals and focus of this fitness plan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator className="my-6" />
              
              <div className="space-y-6">
                <h3 className="text-xl font-semibold">Workout Plan</h3>
                
                <Accordion type="multiple" className="w-full">
                  {workoutPlan.map((day, dayIndex) => (
                    <AccordionItem key={day.day} value={day.day}>
                      <AccordionTrigger>
                        <div className="flex items-center">
                          <span>{day.day}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            {day.exercises.length === 0 
                              ? 'Rest day' 
                              : `${day.exercises.length} exercise${day.exercises.length !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {day.exercises.length === 0 && (
                            <p className="text-sm text-muted-foreground">No exercises added yet. Add exercises or leave empty for a rest day.</p>
                          )}
                          
                          {day.exercises.map((exercise, exerciseIndex) => (
                            <div key={exerciseIndex} className="border rounded-md p-4 relative">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2"
                                onClick={() => removeExercise(dayIndex, exerciseIndex)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <FormLabel className="text-sm">Exercise Name</FormLabel>
                                  <Input 
                                    value={exercise.name}
                                    onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'name', e.target.value)}
                                    placeholder="Barbell Squat"
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <FormLabel className="text-sm">Sets</FormLabel>
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      value={exercise.sets}
                                      onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'sets', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <FormLabel className="text-sm">Reps</FormLabel>
                                    <Input 
                                      type="number" 
                                      min="1" 
                                      value={exercise.reps}
                                      onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'reps', e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <FormLabel className="text-sm">Rest (sec)</FormLabel>
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      value={exercise.rest}
                                      onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'rest', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <FormLabel className="text-sm">Notes</FormLabel>
                                <Textarea 
                                  value={exercise.notes || ''}
                                  onChange={(e) => updateExercise(dayIndex, exerciseIndex, 'notes', e.target.value)}
                                  placeholder="Focus on form and depth. Warm up with 2 lighter sets."
                                  rows={2}
                                />
                              </div>
                            </div>
                          ))}
                          
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => addExercise(dayIndex)}
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Add Exercise
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                <Separator className="my-6" />
                
                <h3 className="text-xl font-semibold">Meal Plan</h3>
                
                <Accordion type="multiple" className="w-full">
                  {mealPlan.map((day, dayIndex) => (
                    <AccordionItem key={day.day} value={day.day}>
                      <AccordionTrigger>
                        <div className="flex items-center">
                          <span>{day.day}</span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            {day.meals.length === 0 
                              ? 'No meals' 
                              : `${day.meals.length} meal${day.meals.length !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          {day.meals.length === 0 && (
                            <p className="text-sm text-muted-foreground">No meals added yet.</p>
                          )}
                          
                          {day.meals.map((meal, mealIndex) => (
                            <div key={mealIndex} className="border rounded-md p-4 relative">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2"
                                onClick={() => removeMeal(dayIndex, mealIndex)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <FormLabel className="text-sm">Meal Type</FormLabel>
                                  <Select 
                                    value={meal.type} 
                                    onValueChange={(value) => updateMeal(dayIndex, mealIndex, 'type', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select meal type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Breakfast">Breakfast</SelectItem>
                                      <SelectItem value="Lunch">Lunch</SelectItem>
                                      <SelectItem value="Dinner">Dinner</SelectItem>
                                      <SelectItem value="Snack">Snack</SelectItem>
                                      <SelectItem value="Pre-Workout">Pre-Workout</SelectItem>
                                      <SelectItem value="Post-Workout">Post-Workout</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <FormLabel className="text-sm">Calories</FormLabel>
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      value={meal.calories || ''}
                                      onChange={(e) => updateMeal(dayIndex, mealIndex, 'calories', e.target.value)}
                                      placeholder="Optional"
                                    />
                                  </div>
                                  <div>
                                    <FormLabel className="text-sm">Protein (g)</FormLabel>
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      value={meal.protein || ''}
                                      onChange={(e) => updateMeal(dayIndex, mealIndex, 'protein', e.target.value)}
                                      placeholder="Optional"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div>
                                <FormLabel className="text-sm">Description</FormLabel>
                                <Textarea 
                                  value={meal.description}
                                  onChange={(e) => updateMeal(dayIndex, mealIndex, 'description', e.target.value)}
                                  placeholder="Oatmeal with protein powder, banana, and a tablespoon of almond butter."
                                  rows={2}
                                />
                              </div>
                            </div>
                          ))}
                          
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => addMeal(dayIndex)}
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" /> Add Meal
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
              
              <Separator className="my-6" />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any additional instructions or notes for your client regarding this plan."
                        {...field} 
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/trainer')}
                  disabled={createPlanMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createPlanMutation.isPending}
                >
                  {createPlanMutation.isPending ? 'Saving...' : 'Save Fitness Plan'}
                  {!createPlanMutation.isPending && <Save className="ml-2 h-4 w-4" />}
                </Button>
              </div>

              {createPlanMutation.isError && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to create fitness plan. Please try again.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateFitnessPlan;