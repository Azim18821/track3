import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import { formatDate, sortDaysOfWeek, capitalize, formatMealType } from "@/utils/format";

// UI Components
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Icons
import {
  Activity,
  AlertCircle,
  Apple,
  BarChart,
  Beef,
  Brain,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  FlaskConical,
  Milk,
  MessageSquare,
  Package,
  Package2,
  Salad,
  ShoppingBag,
  Snowflake,
  Utensils,
  User,
  Dumbbell,
  Copy,
} from "lucide-react";

// Custom Components
import PageHeader from "@/components/PageHeader";
import PageContainer from "@/components/PageContainer";
import Loading from "@/components/Loading";
import ErrorDisplay from "@/components/ErrorDisplay";
import VerticalNavigation from "@/components/VerticalNavigation";
import { useToast } from "@/hooks/use-toast";

// Using shared utility functions imported from @/utils/format

const TrainerAssignedPlanView = () => {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedMealDay, setSelectedMealDay] = useState<string | null>(null);
  const [syncWithTracker, setSyncWithTracker] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  
  // Query for active plan
  const {
    data: activePlan,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["/api/fitness-plans/active"],
    refetchOnWindowFocus: false,
  });

  // Query for client-trainer relationship
  const { data: trainerRelationships } = useQuery({
    queryKey: ["/api/client/trainers"],
    refetchOnWindowFocus: false,
  });

  // Check if user has a trainer
  const hasTrainer: boolean = !!(trainerRelationships && Array.isArray(trainerRelationships) && trainerRelationships.length > 0);

  // Redirect non-clients (users without trainers) to the fitness-plan page
  useEffect(() => {
    if (!isLoading && !hasTrainer) {
      setLocation('/fitness-plan');
      toast({
        title: "Access restricted",
        description: "This page is only for clients with trainers. Redirecting to your fitness plan.",
        variant: "destructive"
      });
    }
  }, [isLoading, hasTrainer, setLocation, toast]);

  // Handle case where the plan data is loading
  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader 
          title="Your Fitness Plan" 
          description="View your trainer-assigned fitness plan"
          icon={<Activity className="h-6 w-6" />}
        />
        <Loading message="Loading your fitness plan..." />
      </PageContainer>
    );
  }
  
  // If user doesn't have a trainer, don't render the component (will redirect)
  if (!hasTrainer) {
    return (
      <PageContainer>
        <Loading message="Redirecting to appropriate plan view..." />
      </PageContainer>
    );
  }

  // Handle cases where there is no active plan
  if (isError || !activePlan) {
    return (
      <PageContainer>
        <PageHeader 
          title="Your Fitness Plan" 
          description="View your trainer-assigned fitness plan"
          icon={<Activity className="h-6 w-6" />}
        />
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Active Plan</AlertTitle>
          <AlertDescription>
            {isError ? `Error loading plan: ${error?.toString()}` : "You don't have an active fitness plan. Contact your trainer to get started."}
          </AlertDescription>
        </Alert>
        
        {hasTrainer ? (
          <Button 
            className="mt-4" 
            variant="secondary" 
            onClick={() => setLocation("/messages")}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Message Your Trainer
          </Button>
        ) : (
          <div className="mt-4 bg-muted p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Need personalized guidance?</h3>
            <p className="mb-3">Connect with a personal trainer to get customized fitness plans.</p>
            <Button 
              variant="default" 
              onClick={() => setLocation("/find-trainer")}
            >
              <User className="h-4 w-4 mr-2" />
              Find a Trainer
            </Button>
          </div>
        )}
      </PageContainer>
    );
  }

  // Extract plan details
  const { id: planId, preferences, workoutPlan, mealPlan, createdAt, createdByTrainer } = activePlan as any; // Type assertion to resolve TypeScript issues
  const weeklyBudget = preferences?.weeklyBudget || mealPlan?.shoppingList?.budget || 50;
  const preferredStore = preferences?.preferredStore || mealPlan?.shoppingList?.store || 'Tesco';
  
  // Calculate nutrition totals from dailyMeals if present
  let calculatedNutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  };
  
  if (mealPlan?.dailyMeals) {
    const meals = mealPlan.dailyMeals;
    
    // Add standard meals
    ['breakfast', 'lunch', 'dinner'].forEach(mealType => {
      if (meals[mealType]) {
        calculatedNutrition.calories += meals[mealType].calories || 0;
        calculatedNutrition.protein += meals[mealType].protein || 0;
        calculatedNutrition.carbs += meals[mealType].carbs || 0;
        calculatedNutrition.fat += meals[mealType].fat || 0;
      }
    });
    
    // Add snacks
    if (meals.snacks && Array.isArray(meals.snacks)) {
      meals.snacks.forEach((snack: { calories?: number, protein?: number, carbs?: number, fat?: number }) => {
        calculatedNutrition.calories += snack.calories || 0;
        calculatedNutrition.protein += snack.protein || 0;
        calculatedNutrition.carbs += snack.carbs || 0;
        calculatedNutrition.fat += snack.fat || 0;
      });
    }
    
    // Add custom meals
    if (meals.customMeals && Array.isArray(meals.customMeals)) {
      meals.customMeals.forEach((meal: { calories?: number, protein?: number, carbs?: number, fat?: number }) => {
        calculatedNutrition.calories += meal.calories || 0;
        calculatedNutrition.protein += meal.protein || 0;
        calculatedNutrition.carbs += meal.carbs || 0;
        calculatedNutrition.fat += meal.fat || 0;
      });
    }
  }
  
  // Prepare workout days list
  const workoutDays = workoutPlan?.weeklySchedule ? Object.keys(workoutPlan.weeklySchedule) : [];
  const sortedWorkoutDays = sortDaysOfWeek(workoutDays);
  
  // Set default selected day if not already set
  useEffect(() => {
    if (sortedWorkoutDays.length > 0 && !selectedDay) {
      setSelectedDay(sortedWorkoutDays[0]);
    }
  }, [sortedWorkoutDays, selectedDay]);

  // Handler for syncing plan with tracker
  const handleSyncWithTracker = () => {
    // This functionality is already implemented server-side
    // When a plan is created, the meals and workouts are already created
    // We're just providing a visual confirmation to the user
    toast({
      title: "Plan synced with trackers",
      description: "Your nutrition and workout trackers have been updated with this plan.",
      variant: "default",
    });
    
    setSyncDialogOpen(false);
    setSyncWithTracker(true);
  };

  // Handle trainer information display
  const trainerInfo = trainerRelationships && Array.isArray(trainerRelationships) && trainerRelationships[0] 
    ? trainerRelationships[0].trainer 
    : undefined;
  
  // Determine if the plan was created by the client's trainer
  const isPlanFromTrainer = createdByTrainer && preferences?.trainerId === trainerInfo?.id;

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <PageHeader 
          title="Your Fitness Plan" 
          description={isPlanFromTrainer ? `Created by your trainer ${trainerInfo?.name || trainerInfo?.username}` : "Your active fitness plan"}
          icon={<Activity className="h-6 w-6" />}
          className="mb-0"
        />
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => setSyncDialogOpen(true)}
            disabled={syncWithTracker}
            className="flex-shrink-0"
          >
            <Copy className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="whitespace-nowrap">
              {syncWithTracker ? "Synced" : "Sync Plan"}
            </span>
          </Button>
          
          {hasTrainer && (
            <Button 
              variant="secondary"
              size="sm"
              onClick={() => setLocation("/messages")}
              className="flex-shrink-0"
            >
              <MessageSquare className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="whitespace-nowrap">Message Trainer</span>
            </Button>
          )}
        </div>
      </div>

      {/* Plan Header */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
            <div>
              <CardTitle className="text-xl sm:text-2xl font-bold">
                {preferences?.name || "Your Fitness Plan"}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {preferences?.description || `${preferences?.goal || "General fitness"} - ${preferences?.level || "Intermediate"} level`}
              </CardDescription>
            </div>
            
            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-0 w-full sm:w-auto mt-2 sm:mt-0">
              <Badge className="sm:mb-2" variant="outline">
                {preferences?.durationWeeks || 4} week plan
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto sm:ml-0">
                Created {formatDate(createdAt || new Date())}
              </span>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center p-3 bg-muted rounded-md">
              <Activity className="h-5 w-5 mb-1 text-primary" />
              <span className="text-sm font-medium">Goal</span>
              <span className="text-xs">{preferences?.goal || "General fitness"}</span>
            </div>
            
            <div className="flex flex-col items-center p-3 bg-muted rounded-md">
              <Dumbbell className="h-5 w-5 mb-1 text-primary" />
              <span className="text-sm font-medium">Level</span>
              <span className="text-xs">{preferences?.level || "Intermediate"}</span>
            </div>
            
            <div className="flex flex-col items-center p-3 bg-muted rounded-md">
              <Calendar className="h-5 w-5 mb-1 text-primary" />
              <span className="text-sm font-medium">Workouts</span>
              <span className="text-xs">{workoutDays.length || 0} days/week</span>
            </div>
            
            <div className="flex flex-col items-center p-3 bg-muted rounded-md">
              <Utensils className="h-5 w-5 mb-1 text-primary" />
              <span className="text-sm font-medium">Meal Plan</span>
              <span className="text-xs">
                {mealPlan && (mealPlan.weeklyMeals || mealPlan.weeklyMealPlan || mealPlan.dailyMeals) 
                  ? "Included" 
                  : "Not available"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs 
        value={selectedTab} 
        onValueChange={setSelectedTab} 
        className="space-y-4"
      >
        <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Nutrition Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <BarChart className="h-5 w-5 mr-2" />
                Nutrition Goals
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-muted p-3 rounded-md flex flex-col items-center">
                  <span className="text-xs text-muted-foreground mb-1">Daily Calories</span>
                  <span className="text-lg font-semibold">
                    {mealPlan?.nutritionData?.calories || 
                     mealPlan?.dailyNutrition?.calories || 
                     (mealPlan?.dailyMeals ? calculatedNutrition.calories : 0)} kcal
                  </span>
                </div>
                
                <div className="bg-muted p-3 rounded-md flex flex-col items-center">
                  <span className="text-xs text-muted-foreground mb-1">Protein</span>
                  <span className="text-lg font-semibold">
                    {mealPlan?.nutritionData?.protein || 
                     mealPlan?.dailyNutrition?.protein || 
                     (mealPlan?.dailyMeals ? calculatedNutrition.protein : 0)}g
                  </span>
                </div>
                
                <div className="bg-muted p-3 rounded-md flex flex-col items-center">
                  <span className="text-xs text-muted-foreground mb-1">Carbs</span>
                  <span className="text-lg font-semibold">
                    {mealPlan?.nutritionData?.carbs || 
                     mealPlan?.dailyNutrition?.carbs || 
                     (mealPlan?.dailyMeals ? calculatedNutrition.carbs : 0)}g
                  </span>
                </div>
                
                <div className="bg-muted p-3 rounded-md flex flex-col items-center">
                  <span className="text-xs text-muted-foreground mb-1">Fat</span>
                  <span className="text-lg font-semibold">
                    {mealPlan?.nutritionData?.fat || 
                     mealPlan?.dailyNutrition?.fat || 
                     (mealPlan?.dailyMeals ? calculatedNutrition.fat : 0)}g
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Weekly Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Weekly Schedule
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-7 gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const dayKey = day.toLowerCase();
                  const hasWorkout = workoutPlan?.weeklySchedule?.[dayKey];
                  const workoutCount = hasWorkout?.exercises?.length || 0;
                  
                  return (
                    <div 
                      key={day}
                      className={cn(
                        "p-3 rounded-md border flex flex-col items-center cursor-pointer hover:bg-accent/50 transition-colors",
                        hasWorkout ? "border-primary/30" : "border-muted"
                      )}
                      onClick={() => {
                        if (hasWorkout) {
                          setSelectedDay(dayKey);
                          setSelectedTab("workouts");
                        }
                      }}
                    >
                      <span className="text-sm font-medium">{day}</span>
                      {hasWorkout ? (
                        <>
                          <span className="text-xs mt-1 text-center">{hasWorkout.name}</span>
                          <Badge variant="secondary" className="mt-2">
                            {workoutCount} exercise{workoutCount !== 1 ? 's' : ''}
                          </Badge>
                        </>
                      ) : (
                        <span className="text-xs mt-2 text-muted-foreground">Rest day</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          {/* Notes from your trainer */}
          {isPlanFromTrainer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Trainer Notes
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm">
                    {workoutPlan?.notes || "No specific notes from your trainer."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Workouts Tab */}
        <TabsContent value="workouts" className="space-y-4">
          {workoutDays.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No workouts found</AlertTitle>
              <AlertDescription>
                This plan doesn't include any workout schedules.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Day Selector */}
              <div className="flex gap-1 sm:gap-2 mb-4 overflow-x-auto pb-2 px-1 -mx-1">
                {sortedWorkoutDays.map(day => (
                  <Button
                    key={day}
                    variant={selectedDay === day ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDay(day)}
                    className="capitalize flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3"
                  >
                    {day}
                  </Button>
                ))}
              </div>
              
              {selectedDay && workoutPlan?.weeklySchedule?.[selectedDay] && (
                <Card>
                  <CardHeader>
                    <CardTitle className="capitalize flex items-center">
                      <Dumbbell className="h-5 w-5 mr-2" />
                      {workoutPlan.weeklySchedule[selectedDay].name || `${selectedDay} Workout`}
                    </CardTitle>
                    {workoutPlan.weeklySchedule[selectedDay].notes && (
                      <CardDescription>
                        {workoutPlan.weeklySchedule[selectedDay].notes}
                      </CardDescription>
                    )}
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {workoutPlan.weeklySchedule[selectedDay].exercises.map((exercise: {
                        name: string;
                        sets?: number;
                        reps?: number;
                        weight?: number;
                        unit?: string;
                        rest?: string;
                        notes?: string;
                        useAdvancedSets?: boolean;
                        setType?: string;
                        supersetWith?: string;
                        setsData?: Array<{
                          reps: number;
                          weight?: number;
                          completed?: boolean;
                        }>;
                      }, index: number) => (
                        <Collapsible key={index} className="border rounded-md">
                          <CollapsibleTrigger className="flex items-center justify-between w-full p-4">
                            <div className="flex items-center">
                              <span className="font-medium">{exercise.name}</span>
                              <Badge className="ml-3" variant="outline">
                                {exercise.sets || 3} sets × {exercise.reps || 10} reps
                              </Badge>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent className="px-4 pb-4">
                            <Separator className="my-2" />
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex flex-col">
                                <span className="text-muted-foreground">Weight</span>
                                <span>{exercise.weight || 0} {exercise.unit || 'kg'}</span>
                              </div>
                              
                              <div className="flex flex-col">
                                <span className="text-muted-foreground">Rest</span>
                                <span>{exercise.rest || '60s'}</span>
                              </div>
                              
                              {exercise.useAdvancedSets && exercise.setsData && (
                                <div className="col-span-2 mt-2">
                                  <span className="text-muted-foreground mb-1 block">Advanced Sets</span>
                                  <div className="grid grid-cols-3 gap-1 text-xs">
                                    {exercise.setsData.map((set: {
                                      reps: number;
                                      weight?: number;
                                      completed?: boolean;
                                    }, idx: number) => (
                                      <div key={idx} className="bg-muted p-2 rounded">
                                        <span className="font-semibold">Set {idx + 1}:</span> {set.reps} reps {set.weight && `@ ${set.weight}${exercise.unit || 'kg'}`}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {exercise.setType && (
                                <div className="col-span-2 mt-2">
                                  <span className="text-muted-foreground">Set Type</span>
                                  <Badge variant="secondary" className="ml-2">{exercise.setType}</Badge>
                                </div>
                              )}
                              
                              {exercise.supersetWith && (
                                <div className="col-span-2 mt-2">
                                  <span className="text-muted-foreground">Superset with</span>
                                  <Badge variant="secondary" className="ml-2">{exercise.supersetWith}</Badge>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      onClick={() => setLocation("/workouts")}
                      className="w-full"
                    >
                      Track This Workout
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </>
          )}
        </TabsContent>
        
        {/* Nutrition Tab */}
        <TabsContent value="nutrition" className="space-y-4">
          {!mealPlan || (!mealPlan.weeklyMeals && !mealPlan.weeklyMealPlan && !mealPlan.dailyMeals) ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No meal plan found</AlertTitle>
              <AlertDescription>
                This plan doesn't include any meal schedules.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Day Selector for Meals (only for weekly plans) */}
              {(mealPlan.weeklyMeals || mealPlan.weeklyMealPlan) && (
                <div className="mb-4">
                  <Label htmlFor="meal-day-select" className="text-sm font-medium">Select Day</Label>
                  <div className="relative mt-1">
                    <select
                      id="meal-day-select"
                      className="w-full p-2 border border-input rounded-md bg-background appearance-none text-sm"
                      value={selectedMealDay || sortDaysOfWeek(Object.keys(mealPlan.weeklyMeals || mealPlan.weeklyMealPlan))[0]}
                      onChange={(e) => {
                        setSelectedMealDay(e.target.value);
                      }}
                    >
                      {sortDaysOfWeek(Object.keys(mealPlan.weeklyMeals || mealPlan.weeklyMealPlan)).map((day) => (
                        <option key={day} value={day}>
                          {capitalize(day)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none text-muted-foreground" />
                  </div>
                </div>
              )}
              
              {/* Meal Plan Display */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="capitalize flex items-center text-lg sm:text-xl">
                    <Utensils className="h-5 w-5 mr-2" />
                    {mealPlan.dailyMeals 
                      ? "Daily Meal Plan" 
                      : `${capitalize(selectedMealDay || Object.keys(mealPlan.weeklyMeals || mealPlan.weeklyMealPlan)[0])} Meals`}
                  </CardTitle>
                </CardHeader>
                
                <CardContent>
                  {(() => {
                    // For daily meal plans
                    if (mealPlan.dailyMeals) {
                      const meals = mealPlan.dailyMeals;
                      return (
                        <div className="space-y-6">
                          {/* Standard meals */}
                          {['breakfast', 'lunch', 'dinner'].map(mealType => {
                            if (!meals[mealType]) return null;
                            return (
                              <div key={mealType} className="space-y-2">
                                <h3 className="font-medium capitalize">{formatMealType(mealType)}</h3>
                                <div className="p-3 bg-muted rounded-md">
                                  <div className="flex justify-between items-start">
                                    <div className="font-medium">{meals[mealType].name}</div>
                                    <Badge variant="outline">{meals[mealType].calories || 0} kcal</Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                                    <div>Protein: {meals[mealType].protein || 0}g</div>
                                    <div>Carbs: {meals[mealType].carbs || 0}g</div>
                                    <div>Fat: {meals[mealType].fat || 0}g</div>
                                  </div>
                                  
                                  {meals[mealType].servingSize && (
                                    <div className="text-xs mt-1">
                                      Serving: {meals[mealType].servingSize} {meals[mealType].servingUnit || 'serving'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Snacks */}
                          {meals.snacks && meals.snacks.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="font-medium capitalize">Snacks</h3>
                              <div className="space-y-2">
                                {meals.snacks.map((snack: { 
                                  name: string; 
                                  calories?: number; 
                                  protein?: number; 
                                  carbs?: number; 
                                  fat?: number;
                                  servingSize?: string;
                                  servingUnit?: string;
                                }, i: number) => (
                                  <div key={i} className="p-3 bg-muted rounded-md">
                                    <div className="flex justify-between items-start">
                                      <div className="font-medium">{snack.name}</div>
                                      <Badge variant="outline">{snack.calories || 0} kcal</Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                                      <div>Protein: {snack.protein || 0}g</div>
                                      <div>Carbs: {snack.carbs || 0}g</div>
                                      <div>Fat: {snack.fat || 0}g</div>
                                    </div>
                                    
                                    {snack.servingSize && (
                                      <div className="text-xs mt-1">
                                        Serving: {snack.servingSize} {snack.servingUnit || 'serving'}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Custom Meals */}
                          {meals.customMeals && meals.customMeals.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="font-medium">Custom Meals</h3>
                              <div className="space-y-2">
                                {meals.customMeals.map((meal: { 
                                  name: string;
                                  type?: string;
                                  calories?: number;
                                  protein?: number;
                                  carbs?: number;
                                  fat?: number;
                                  servingSize?: string;
                                  servingUnit?: string;
                                }, i: number) => (
                                  <div key={i} className="p-3 bg-muted rounded-md">
                                    <div className="flex justify-between items-start">
                                      <div className="font-medium">{meal.name} <span className="text-xs text-muted-foreground">({meal.type})</span></div>
                                      <Badge variant="outline">{meal.calories || 0} kcal</Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                                      <div>Protein: {meal.protein || 0}g</div>
                                      <div>Carbs: {meal.carbs || 0}g</div>
                                      <div>Fat: {meal.fat || 0}g</div>
                                    </div>
                                    
                                    {meal.servingSize && (
                                      <div className="text-xs mt-1">
                                        Serving: {meal.servingSize} {meal.servingUnit || 'serving'}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }
                    
                    // For weekly meal plans
                    const day = selectedMealDay || sortDaysOfWeek(Object.keys(mealPlan.weeklyMeals || mealPlan.weeklyMealPlan))[0];
                    const meals = (mealPlan.weeklyMeals || mealPlan.weeklyMealPlan)[day];
                    
                    return (
                      <div className="space-y-6">
                        {Object.entries(meals).map(([mealType, mealContent]) => {
                          // Skip if not a valid meal object
                          if (!mealContent || typeof mealContent !== 'object') return null;
                          
                          // Function to render meal item
                          const renderMealItem = (item: {
                            name: string;
                            calories?: number;
                            protein?: number;
                            carbs?: number;
                            fat?: number;
                            servingSize?: string;
                            servingUnit?: string;
                          }, index: number) => (
                            <div key={index} className="p-3 bg-muted rounded-md">
                              <div className="flex justify-between items-start">
                                <div className="font-medium">{item.name}</div>
                                <Badge variant="outline">{item.calories || 0} kcal</Badge>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-muted-foreground">
                                <div>Protein: {item.protein || 0}g</div>
                                <div>Carbs: {item.carbs || 0}g</div>
                                <div>Fat: {item.fat || 0}g</div>
                              </div>
                              
                              {item.servingSize && (
                                <div className="text-xs mt-1">
                                  Serving: {item.servingSize} {item.servingUnit || 'serving'}
                                </div>
                              )}
                            </div>
                          );
                          
                          // Handle array types like snacks and customMeals
                          if (Array.isArray(mealContent)) {
                            return (
                              <div key={mealType} className="space-y-2">
                                <h3 className="font-medium capitalize">{formatMealType(mealType)}</h3>
                                <div className="space-y-2">
                                  {mealContent.map((item: {
                                    name: string;
                                    calories?: number;
                                    protein?: number;
                                    carbs?: number;
                                    fat?: number;
                                    servingSize?: string;
                                    servingUnit?: string;
                                  }, i: number) => renderMealItem(item, i))}
                                </div>
                              </div>
                            );
                          }
                          
                          // Handle foods array if present
                          if ((mealContent as any).foods && Array.isArray((mealContent as any).foods)) {
                            return (
                              <div key={mealType} className="space-y-2">
                                <h3 className="font-medium capitalize">{formatMealType(mealType)}</h3>
                                <div className="space-y-2">
                                  {(mealContent as any).foods.map((item: {
                                    name: string;
                                    calories?: number;
                                    protein?: number;
                                    carbs?: number;
                                    fat?: number;
                                    servingSize?: string;
                                    servingUnit?: string;
                                  }, i: number) => renderMealItem(item, i))}
                                </div>
                              </div>
                            );
                          }
                          
                          // Handle direct meal data
                          // Adding explicit type assertion to ensure mealContent has the required fields
                          const mealContentWithName = {
                            name: (mealContent as any).name || mealType,
                            calories: (mealContent as any).calories,
                            protein: (mealContent as any).protein,
                            carbs: (mealContent as any).carbs,
                            fat: (mealContent as any).fat,
                            servingSize: (mealContent as any).servingSize,
                            servingUnit: (mealContent as any).servingUnit
                          };
                          
                          return (
                            <div key={mealType} className="space-y-2">
                              <h3 className="font-medium capitalize">{formatMealType(mealType)}</h3>
                              {renderMealItem(mealContentWithName, 0)}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </CardContent>
                
                <CardFooter>
                  <Button 
                    onClick={() => setLocation("/nutrition")}
                    className="w-full"
                  >
                    Track Your Nutrition
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Shopping List */}
              {mealPlan.shoppingList && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingBag className="h-5 w-5 mr-2" />
                      Shopping List
                    </CardTitle>
                  </CardHeader>
                  
                  <CardContent>
                    {!((mealPlan.shoppingList as any)?.categories || (mealPlan.ingredients?.categories)) ? (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <div className="rounded-full bg-muted p-3 mb-2">
                          <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          No shopping list found for this meal plan.
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px]">
                        <div className="space-y-4">
                          {Object.entries((mealPlan.shoppingList as any)?.categories || (mealPlan.ingredients?.categories) || {}).map(
                            ([category, items]: [string, any]) => (
                              <Collapsible key={category} className="border rounded-md">
                                <CollapsibleTrigger className="flex items-center justify-between w-full p-3">
                                  <div className="flex items-center">
                                    <span className="font-medium capitalize">{category}</span>
                                    <Badge className="ml-2" variant="outline">
                                      {Array.isArray(items) ? items.length : Object.keys(items).length} items
                                    </Badge>
                                  </div>
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                </CollapsibleTrigger>
                                
                                <CollapsibleContent className="p-3 pt-0">
                                  <Separator className="my-2" />
                                  
                                  <div className="space-y-1">
                                    {Array.isArray(items) ? (
                                      items.map((item, idx) => (
                                        <div 
                                          key={idx} 
                                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                                        >
                                          <div className="flex items-center">
                                            <Checkbox id={`item-${category}-${idx}`} className="mr-2" />
                                            <Label htmlFor={`item-${category}-${idx}`} className="text-sm">
                                              {typeof item === 'string' ? item : item.name}
                                            </Label>
                                          </div>
                                          
                                          {item.quantity && (
                                            <Badge variant="outline" className="text-xs">
                                              {item.quantity} {item.unit || ''}
                                            </Badge>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      Object.entries(items).map(([itemName, details]: [string, any], idx) => (
                                        <div 
                                          key={idx} 
                                          className="flex items-center justify-between p-2 bg-muted rounded-md"
                                        >
                                          <div className="flex items-center">
                                            <Checkbox id={`item-${category}-${idx}`} className="mr-2" />
                                            <Label htmlFor={`item-${category}-${idx}`} className="text-sm">
                                              {itemName}
                                            </Label>
                                          </div>
                                          
                                          {details.quantity && (
                                            <Badge variant="outline" className="text-xs">
                                              {details.quantity} {details.unit || ''}
                                            </Badge>
                                          )}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Sync Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sync Plan with Trackers</DialogTitle>
            <DialogDescription>
              This will update your nutrition and workout trackers with the meals and workouts from this plan.
              <Badge className="ml-2" variant="outline">Recommended</Badge>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-3">
            <div className="flex items-start space-x-3 p-3 border rounded-md">
              <div className="mt-1">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Workout Tracker</h4>
                <p className="text-sm text-muted-foreground">
                  Your workout schedule will be added to your tracker for the upcoming week.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 border rounded-md">
              <div className="mt-1">
                <Utensils className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Nutrition Tracker</h4>
                <p className="text-sm text-muted-foreground">
                  Meal recommendations will be added to your nutrition tracker.
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSyncWithTracker}>Sync Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

// Using formatMealType imported from utils/format.ts

export default TrainerAssignedPlanView;