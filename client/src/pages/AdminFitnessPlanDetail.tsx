import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useRoute, useLocation } from 'wouter';

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  rest: number;
  weight?: number | null;
}

interface Workout {
  name: string;
  exercises: Exercise[];
}

interface Meal {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DailyMeals {
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  snacks: Meal[];
}

interface FitnessPlan {
  id: number;
  userId: number;
  preferences: {
    goal: string;
    currentWeight: number;
    targetWeight?: number;
    unit: string;
    workoutDaysPerWeek: number;
    dietaryRestrictions: string[];
    preferredFoods: string[];
    fitnessLevel: string;
  };
  workoutPlan: {
    weeklySchedule: {
      [key: string]: Workout;
    };
    notes: string;
  };
  mealPlan: {
    dailyMeals: DailyMeals;
    notes: string;
  };
  isActive: boolean;
  createdAt: string;
  username?: string; // Added by the API
}

export default function AdminFitnessPlanDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [match, params] = useRoute<{ id: string }>('/admin/fitness-plans/:id');
  const planId = params?.id ? parseInt(params.id) : 0;
  
  const [updatedPlan, setUpdatedPlan] = useState<FitnessPlan | null>(null);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  
  // Redirect if not admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Fetch fitness plan details
  const { data: plan, isLoading } = useQuery({
    queryKey: ['/api/admin/fitness-plans', planId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/fitness-plans/${planId}`);
      if (!res.ok) throw new Error('Failed to fetch fitness plan');
      return await res.json();
    },
    enabled: !!user?.isAdmin && !!planId
  });
  
  // Initialize updatedPlan when plan loads
  useEffect(() => {
    if (plan) {
      setUpdatedPlan(JSON.parse(JSON.stringify(plan))); // Deep copy
    }
  }, [plan]);
  
  // Check for changes
  useEffect(() => {
    if (plan && updatedPlan) {
      // Deep comparison to detect changes
      const planStr = JSON.stringify(plan);
      const updatedPlanStr = JSON.stringify(updatedPlan);
      setHasChanges(planStr !== updatedPlanStr);
    }
  }, [updatedPlan, plan]);
  
  // Helper function to update workout notes
  const updateWorkoutNotes = (notes: string) => {
    if (!updatedPlan) return;
    setUpdatedPlan({
      ...updatedPlan,
      workoutPlan: {
        ...updatedPlan.workoutPlan,
        notes
      }
    });
  };

  // Helper function to update meal notes
  const updateMealNotes = (notes: string) => {
    if (!updatedPlan) return;
    setUpdatedPlan({
      ...updatedPlan,
      mealPlan: {
        ...updatedPlan.mealPlan,
        notes
      }
    });
  };

  // Helper function to update exercise details
  const updateExercise = (dayKey: string, exerciseIndex: number, field: keyof Exercise, value: any) => {
    if (!updatedPlan) return;
    const newPlan = { ...updatedPlan };
    const workout = newPlan.workoutPlan.weeklySchedule[dayKey];
    if (workout && workout.exercises[exerciseIndex]) {
      workout.exercises[exerciseIndex] = {
        ...workout.exercises[exerciseIndex],
        [field]: value
      };
    }
    setUpdatedPlan(newPlan);
  };

  // Helper function to update meal details
  const updateMeal = (mealType: 'breakfast' | 'lunch' | 'dinner', field: keyof Meal, value: any) => {
    if (!updatedPlan) return;
    const newPlan = { ...updatedPlan };
    newPlan.mealPlan.dailyMeals[mealType] = {
      ...newPlan.mealPlan.dailyMeals[mealType],
      [field]: value
    };
    setUpdatedPlan(newPlan);
  };

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async () => {
      if (!updatedPlan) throw new Error('No changes to save');
      
      // Only send what's needed to update
      const updates = {
        workoutPlan: updatedPlan.workoutPlan,
        mealPlan: updatedPlan.mealPlan
      };
      
      const res = await apiRequest('PUT', `/api/admin/fitness-plans/${planId}`, updates);
      if (!res.ok) throw new Error('Failed to update fitness plan');
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Plan updated",
        description: "The fitness plan has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/fitness-plans', planId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating plan",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Handle save
  const handleSave = () => {
    updatePlanMutation.mutate();
  };
  
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
  
  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!plan) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>
            The fitness plan you're looking for doesn't exist.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/fitness-plans')}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Plans
        </Button>
        
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Fitness Plan Details
        </h1>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium">Username</p>
              <p>{plan.username}</p>
            </div>
            <div>
              <p className="text-sm font-medium">User ID</p>
              <p>{plan.userId}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Plan Created</p>
              <p>{new Date(plan.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Status</p>
              <Badge variant={plan.isActive ? "default" : "secondary"}>
                {plan.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>User Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium">Goal</p>
              <p className="capitalize">{plan.preferences.goal.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Current Weight</p>
              <p>{plan.preferences.currentWeight} {plan.preferences.unit}</p>
            </div>
            {plan.preferences.targetWeight && (
              <div>
                <p className="text-sm font-medium">Target Weight</p>
                <p>{plan.preferences.targetWeight} {plan.preferences.unit}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium">Fitness Level</p>
              <p className="capitalize">{plan.preferences.fitnessLevel}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Workout Days</p>
              <p>{plan.preferences.workoutDaysPerWeek} days per week</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Dietary Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium">Dietary Restrictions</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {plan.preferences.dietaryRestrictions.length > 0 ? (
                  plan.preferences.dietaryRestrictions.map(restriction => (
                    <Badge key={restriction} variant="outline" className="capitalize">
                      {restriction}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">None specified</p>
                )}
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium mt-2">Preferred Foods</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {plan.preferences.preferredFoods.length > 0 ? (
                  plan.preferences.preferredFoods.map(food => (
                    <Badge key={food} variant="outline" className="capitalize">
                      {food}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">None specified</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="workout" className="mb-6">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="workout">Workout Plan</TabsTrigger>
          <TabsTrigger value="meal">Meal Plan</TabsTrigger>
        </TabsList>
        
        <TabsContent value="workout" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Workout Schedule</CardTitle>
              <CardDescription>
                Workout routine based on user's preferences and goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {Object.entries(plan.workoutPlan.weeklySchedule).map(([day, workout]) => (
                <div key={day} className="mb-6">
                  <h3 className="text-lg font-medium mb-2 capitalize">{day}: {workout.name}</h3>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exercise</TableHead>
                        <TableHead>Sets</TableHead>
                        <TableHead>Reps</TableHead>
                        <TableHead>Weight</TableHead>
                        <TableHead>Rest</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workout.exercises.map((exercise, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input 
                              value={updatedPlan?.workoutPlan.weeklySchedule[day]?.exercises[index]?.name || exercise.name}
                              onChange={(e) => updateExercise(day, index, 'name', e.target.value)}
                              className="w-full"
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              value={updatedPlan?.workoutPlan.weeklySchedule[day]?.exercises[index]?.sets || exercise.sets}
                              onChange={(e) => updateExercise(day, index, 'sets', parseInt(e.target.value))}
                              className="w-full"
                              min={1}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              value={updatedPlan?.workoutPlan.weeklySchedule[day]?.exercises[index]?.reps || exercise.reps}
                              onChange={(e) => updateExercise(day, index, 'reps', parseInt(e.target.value))}
                              className="w-full"
                              min={1}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              value={updatedPlan?.workoutPlan.weeklySchedule[day]?.exercises[index]?.weight || ''}
                              onChange={(e) => updateExercise(day, index, 'weight', e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full"
                              placeholder="Bodyweight"
                              min={0}
                            />
                          </TableCell>
                          <TableCell>
                            <Input 
                              type="number"
                              value={updatedPlan?.workoutPlan.weeklySchedule[day]?.exercises[index]?.rest || exercise.rest}
                              onChange={(e) => updateExercise(day, index, 'rest', parseInt(e.target.value))}
                              className="w-full"
                              min={0}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
              
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-2">Workout Notes (Editable)</h3>
                <Textarea 
                  value={updatedPlan?.workoutPlan.notes || ''}
                  onChange={(e) => updateWorkoutNotes(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="meal" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Daily Meal Plan</CardTitle>
              <CardDescription>
                Nutritional guidance based on user's preferences and goals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Breakfast</h3>
                  <Card>
                    <CardHeader>
                      <Input
                        value={updatedPlan?.mealPlan.dailyMeals.breakfast.name || plan.mealPlan.dailyMeals.breakfast.name}
                        onChange={(e) => updateMeal('breakfast', 'name', e.target.value)}
                        className="font-medium text-base w-full"
                        placeholder="Meal name"
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        value={updatedPlan?.mealPlan.dailyMeals.breakfast.description || plan.mealPlan.dailyMeals.breakfast.description}
                        onChange={(e) => updateMeal('breakfast', 'description', e.target.value)}
                        className="text-sm w-full min-h-[100px]"
                        placeholder="Meal description"
                      />
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="font-medium">Calories</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.breakfast.calories || plan.mealPlan.dailyMeals.breakfast.calories}
                            onChange={(e) => updateMeal('breakfast', 'calories', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                        <div>
                          <p className="font-medium">Protein</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.breakfast.protein || plan.mealPlan.dailyMeals.breakfast.protein}
                            onChange={(e) => updateMeal('breakfast', 'protein', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                        <div>
                          <p className="font-medium">Carbs</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.breakfast.carbs || plan.mealPlan.dailyMeals.breakfast.carbs}
                            onChange={(e) => updateMeal('breakfast', 'carbs', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                        <div>
                          <p className="font-medium">Fat</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.breakfast.fat || plan.mealPlan.dailyMeals.breakfast.fat}
                            onChange={(e) => updateMeal('breakfast', 'fat', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Lunch</h3>
                  <Card>
                    <CardHeader>
                      <Input
                        value={updatedPlan?.mealPlan.dailyMeals.lunch.name || plan.mealPlan.dailyMeals.lunch.name}
                        onChange={(e) => updateMeal('lunch', 'name', e.target.value)}
                        className="font-medium text-base w-full"
                        placeholder="Meal name"
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        value={updatedPlan?.mealPlan.dailyMeals.lunch.description || plan.mealPlan.dailyMeals.lunch.description}
                        onChange={(e) => updateMeal('lunch', 'description', e.target.value)}
                        className="text-sm w-full min-h-[100px]"
                        placeholder="Meal description"
                      />
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="font-medium">Calories</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.lunch.calories || plan.mealPlan.dailyMeals.lunch.calories}
                            onChange={(e) => updateMeal('lunch', 'calories', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                        <div>
                          <p className="font-medium">Protein</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.lunch.protein || plan.mealPlan.dailyMeals.lunch.protein}
                            onChange={(e) => updateMeal('lunch', 'protein', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                        <div>
                          <p className="font-medium">Carbs</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.lunch.carbs || plan.mealPlan.dailyMeals.lunch.carbs}
                            onChange={(e) => updateMeal('lunch', 'carbs', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                        <div>
                          <p className="font-medium">Fat</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.lunch.fat || plan.mealPlan.dailyMeals.lunch.fat}
                            onChange={(e) => updateMeal('lunch', 'fat', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Dinner</h3>
                  <Card>
                    <CardHeader>
                      <Input
                        value={updatedPlan?.mealPlan.dailyMeals.dinner.name || plan.mealPlan.dailyMeals.dinner.name}
                        onChange={(e) => updateMeal('dinner', 'name', e.target.value)}
                        className="font-medium text-base w-full"
                        placeholder="Meal name"
                      />
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        value={updatedPlan?.mealPlan.dailyMeals.dinner.description || plan.mealPlan.dailyMeals.dinner.description}
                        onChange={(e) => updateMeal('dinner', 'description', e.target.value)}
                        className="text-sm w-full min-h-[100px]"
                        placeholder="Meal description"
                      />
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div>
                          <p className="font-medium">Calories</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.dinner.calories || plan.mealPlan.dailyMeals.dinner.calories}
                            onChange={(e) => updateMeal('dinner', 'calories', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                        <div>
                          <p className="font-medium">Protein</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.dinner.protein || plan.mealPlan.dailyMeals.dinner.protein}
                            onChange={(e) => updateMeal('dinner', 'protein', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                        <div>
                          <p className="font-medium">Carbs</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.dinner.carbs || plan.mealPlan.dailyMeals.dinner.carbs}
                            onChange={(e) => updateMeal('dinner', 'carbs', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                        <div>
                          <p className="font-medium">Fat</p>
                          <Input
                            type="number"
                            value={updatedPlan?.mealPlan.dailyMeals.dinner.fat || plan.mealPlan.dailyMeals.dinner.fat}
                            onChange={(e) => updateMeal('dinner', 'fat', parseInt(e.target.value))}
                            className="w-full"
                            min={0}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {(updatedPlan?.mealPlan.dailyMeals.snacks || plan.mealPlan.dailyMeals.snacks).length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Snacks</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {(updatedPlan?.mealPlan.dailyMeals.snacks || plan.mealPlan.dailyMeals.snacks).map((snack, index) => (
                        <Card key={index}>
                          <CardHeader>
                            <Input
                              value={updatedPlan?.mealPlan.dailyMeals.snacks[index]?.name || snack.name}
                              onChange={(e) => {
                                if (!updatedPlan) return;
                                const newPlan = { ...updatedPlan };
                                newPlan.mealPlan.dailyMeals.snacks[index].name = e.target.value;
                                setUpdatedPlan(newPlan);
                              }}
                              className="font-medium text-base w-full"
                              placeholder="Snack name"
                            />
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <Textarea
                              value={updatedPlan?.mealPlan.dailyMeals.snacks[index]?.description || snack.description}
                              onChange={(e) => {
                                if (!updatedPlan) return;
                                const newPlan = { ...updatedPlan };
                                newPlan.mealPlan.dailyMeals.snacks[index].description = e.target.value;
                                setUpdatedPlan(newPlan);
                              }}
                              className="text-sm w-full min-h-[80px]"
                              placeholder="Snack description"
                            />
                            <div className="grid grid-cols-4 gap-2 text-sm">
                              <div>
                                <p className="font-medium">Calories</p>
                                <Input
                                  type="number"
                                  value={updatedPlan?.mealPlan.dailyMeals.snacks[index]?.calories || snack.calories}
                                  onChange={(e) => {
                                    if (!updatedPlan) return;
                                    const newPlan = { ...updatedPlan };
                                    newPlan.mealPlan.dailyMeals.snacks[index].calories = parseInt(e.target.value);
                                    setUpdatedPlan(newPlan);
                                  }}
                                  className="w-full"
                                  min={0}
                                />
                              </div>
                              <div>
                                <p className="font-medium">Protein</p>
                                <Input
                                  type="number"
                                  value={updatedPlan?.mealPlan.dailyMeals.snacks[index]?.protein || snack.protein}
                                  onChange={(e) => {
                                    if (!updatedPlan) return;
                                    const newPlan = { ...updatedPlan };
                                    newPlan.mealPlan.dailyMeals.snacks[index].protein = parseInt(e.target.value);
                                    setUpdatedPlan(newPlan);
                                  }}
                                  className="w-full"
                                  min={0}
                                />
                              </div>
                              <div>
                                <p className="font-medium">Carbs</p>
                                <Input
                                  type="number"
                                  value={updatedPlan?.mealPlan.dailyMeals.snacks[index]?.carbs || snack.carbs}
                                  onChange={(e) => {
                                    if (!updatedPlan) return;
                                    const newPlan = { ...updatedPlan };
                                    newPlan.mealPlan.dailyMeals.snacks[index].carbs = parseInt(e.target.value);
                                    setUpdatedPlan(newPlan);
                                  }}
                                  className="w-full"
                                  min={0}
                                />
                              </div>
                              <div>
                                <p className="font-medium">Fat</p>
                                <Input
                                  type="number"
                                  value={updatedPlan?.mealPlan.dailyMeals.snacks[index]?.fat || snack.fat}
                                  onChange={(e) => {
                                    if (!updatedPlan) return;
                                    const newPlan = { ...updatedPlan };
                                    newPlan.mealPlan.dailyMeals.snacks[index].fat = parseInt(e.target.value);
                                    setUpdatedPlan(newPlan);
                                  }}
                                  className="w-full"
                                  min={0}
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Meal Plan Notes (Editable)</h3>
                  <Textarea 
                    value={updatedPlan?.mealPlan.notes || ''}
                    onChange={(e) => updateMealNotes(e.target.value)}
                    className="min-h-[150px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={!hasChanges || updatePlanMutation.isPending}
        >
          {updatePlanMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}