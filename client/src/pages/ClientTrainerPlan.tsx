import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

// UI Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// Icons
import {
  Activity,
  AlertCircle,
  Apple,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Coffee,
  Dumbbell,
  Loader2,
  MessageCircle,
  User,
  Users,
  ChefHat,
  Utensils,
  Info,
} from "lucide-react";

export default function ClientTrainerPlan() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedWorkoutDay, setSelectedWorkoutDay] = useState("");
  const [selectedMealDay, setSelectedMealDay] = useState("");
  
  // Fetch active fitness plan from trainer
  const {
    data: activePlan,
    isLoading: planLoading,
    isError: planError,
    error: planErrorDetail,
  } = useQuery({
    queryKey: ["/api/fitness-plans/active"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/fitness-plans/active");
      if (!res.ok) {
        if (res.status === 404) {
          // No active plan is not an error condition
          return null;
        }
        throw new Error("Failed to fetch active fitness plan");
      }
      return await res.json();
    },
  });

  // Fetch trainer information
  const {
    data: trainerInfo,
    isLoading: trainerLoading,
  } = useQuery({
    queryKey: ["/api/client/trainers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/client/trainers");
      if (!res.ok) throw new Error("Failed to fetch trainer information");
      return await res.json();
    },
    enabled: !!activePlan,
  });

  // Loading state
  if (planLoading || trainerLoading) {
    return (
      <div className="container py-10 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your fitness plan...</p>
      </div>
    );
  }

  // Error state
  if (planError) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {planErrorDetail instanceof Error
              ? planErrorDetail.message
              : "Failed to load fitness plan"}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/")}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

  // No active plan state
  if (!activePlan) {
    return (
      <div className="container py-10 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>No Active Fitness Plan</CardTitle>
            <CardDescription>
              You don't have an active fitness plan from your trainer at the moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-6">
            <div className="flex flex-col items-center text-center max-w-md">
              <Users className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
              <h3 className="text-xl font-medium mb-2">Contact Your Trainer</h3>
              <p className="text-muted-foreground mb-6">
                Reach out to your personal trainer to request a customized fitness plan tailored to your goals.
              </p>
            </div>
            <Button 
              onClick={() => navigate("/messages")}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Message Trainer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract plan details
  const { id: planId, preferences, workoutPlan, mealPlan, createdAt, trainerId } = activePlan;
  
  // Get trainer details if available
  const trainer = trainerInfo?.trainers?.find((t: any) => t.id === trainerId) || null;

  return (
    <div className="container py-4 sm:py-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Your Trainer's Fitness Plan</h1>
          <p className="text-muted-foreground">
            Created on {format(parseISO(createdAt), "MMMM d, yyyy")}
          </p>
        </div>
        {trainer && (
          <Card className="bg-muted p-3 flex items-center space-x-3">
            <User className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm font-medium">{trainer.username}</p>
              <p className="text-xs text-muted-foreground">Your Personal Trainer</p>
            </div>
          </Card>
        )}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="mb-2 w-full grid grid-cols-3 gap-1">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="workouts" className="text-xs sm:text-sm">Workouts</TabsTrigger>
          <TabsTrigger value="meals" className="text-xs sm:text-sm">Meals</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Summary</CardTitle>
                <CardDescription>Your fitness plan details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Primary Goal</Label>
                    <p className="font-medium capitalize">
                      {preferences?.fitnessGoal?.replace("_", " ") || preferences?.goal || "Not specified"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Workout Days Per Week
                    </Label>
                    <p className="font-medium">{preferences?.workoutDaysPerWeek || 
                      (workoutPlan?.weeklySchedule ? Object.keys(workoutPlan.weeklySchedule).length : "Not specified")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Plan Duration
                    </Label>
                    <p className="font-medium">
                      {preferences?.durationWeeks ? `${preferences.durationWeeks} weeks` : "Ongoing"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Fitness Level
                    </Label>
                    <p className="font-medium capitalize">
                      {preferences?.fitnessLevel || preferences?.level || "Not specified"}
                    </p>
                  </div>
                </div>
                
                {trainer && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium">Trainer Notes</h4>
                      <div className="p-3 bg-muted rounded-md text-sm">
                        {preferences?.notes || activePlan.notes || "No additional notes from your trainer."}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/messages")}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message Trainer
                </Button>
              </CardFooter>
            </Card>

            {/* Weekly Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle>Your Progress</CardTitle>
                <CardDescription>Weekly workout and nutrition tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    This Week's Workouts
                  </h4>
                  <div className="grid grid-cols-7 gap-1">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                      const hasWorkout = workoutPlan?.weeklySchedule?.[day.toLowerCase()] !== undefined;
                      return (
                        <div 
                          key={day}
                          className={`flex flex-col items-center justify-center p-2 rounded-md 
                            ${hasWorkout ? "bg-primary/10" : "bg-muted"}`}
                        >
                          <span className="text-xs">{day}</span>
                          {hasWorkout ? (
                            <Check className="h-4 w-4 text-primary mt-1" />
                          ) : (
                            <span className="h-4 w-4 mt-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center">
                    <ChefHat className="h-4 w-4 mr-2" />
                    Nutrition Goals
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-muted rounded-md">
                      <span className="text-xs text-muted-foreground block">
                        Daily Calories
                      </span>
                      <span className="font-medium">
                        {Math.round(
                          preferences?.nutritionData?.calories || 
                          preferences?.nutritionGoals?.calories || 
                          mealPlan?.nutritionData?.calories || 0
                        )} kcal
                      </span>
                    </div>
                    <div className="p-2 bg-muted rounded-md">
                      <span className="text-xs text-muted-foreground block">
                        Protein
                      </span>
                      <span className="font-medium">
                        {Math.round(
                          preferences?.nutritionData?.protein || 
                          preferences?.nutritionGoals?.protein || 
                          mealPlan?.nutritionData?.protein || 0
                        )} g
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/progress")}
                >
                  <Activity className="mr-2 h-4 w-4" />
                  View Detailed Progress
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Workouts Tab */}
        <TabsContent value="workouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Workout Schedule</CardTitle>
              <CardDescription>
                Your personalized workout plan from your trainer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workoutPlan?.weeklySchedule ? (
                <div className="space-y-4">
                  {Object.entries(workoutPlan.weeklySchedule).map(([day, workout]) => (
                    <Collapsible
                      key={day}
                      open={selectedWorkoutDay === day}
                      onOpenChange={() => setSelectedWorkoutDay(selectedWorkoutDay === day ? "" : day)}
                      className="border rounded-lg"
                    >
                      <CollapsibleTrigger className="flex w-full justify-between items-center p-4 hover:bg-muted/50 rounded-t-lg">
                        <div className="flex items-center">
                          <Badge variant="outline" className="mr-3 capitalize">
                            {day}
                          </Badge>
                          <span className="font-medium">{workout.name}</span>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${
                            selectedWorkoutDay === day ? "transform rotate-180" : ""
                          }`}
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="p-4 pt-1 border-t">
                        <div className="space-y-4">
                          {workout.exercises?.map((exercise, index) => (
                            <div key={index} className="bg-muted p-3 rounded-md">
                              <h4 className="font-medium mb-2">{exercise.name}</h4>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div className="flex items-center">
                                  <Dumbbell className="h-4 w-4 mr-1" />
                                  <span>{exercise.sets} sets</span>
                                </div>
                                <div className="flex items-center">
                                  <Activity className="h-4 w-4 mr-1" />
                                  <span>{exercise.reps} reps</span>
                                </div>
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-1" />
                                  <span>{exercise.rest}s rest</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="w-full mt-4"
                            onClick={() => navigate("/workouts/start", { 
                              state: { 
                                workoutName: workout.name,
                                workoutDay: day,
                                exercises: workout.exercises,
                                planId: planId
                              }
                            })}
                          >
                            <Dumbbell className="mr-2 h-4 w-4" />
                            Start This Workout
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <Alert variant="default" className="bg-muted">
                  <Info className="h-4 w-4" />
                  <AlertTitle>No detailed workout plan</AlertTitle>
                  <AlertDescription>
                    Your trainer hasn't provided a detailed workout schedule yet. Message them for more information.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/workouts")}
              >
                <Dumbbell className="mr-2 h-4 w-4" />
                Log Workouts
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Meals Tab */}
        <TabsContent value="meals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Meal Plan</CardTitle>
              <CardDescription>
                Your personalized nutrition plan from your trainer
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mealPlan?.weeklyMeals ? (
                <div className="space-y-4">
                  {Object.entries(mealPlan.weeklyMeals).map(([day, meals]) => (
                    <Collapsible
                      key={day}
                      open={selectedMealDay === day}
                      onOpenChange={() => setSelectedMealDay(selectedMealDay === day ? "" : day)}
                      className="border rounded-lg"
                    >
                      <CollapsibleTrigger className="flex w-full justify-between items-center p-4 hover:bg-muted/50 rounded-t-lg">
                        <div className="flex items-center">
                          <Badge variant="outline" className="mr-3 capitalize">
                            {day}
                          </Badge>
                          <span className="font-medium">Daily Meals</span>
                        </div>
                        <ChevronDown
                          className={`h-5 w-5 transition-transform ${
                            selectedMealDay === day ? "transform rotate-180" : ""
                          }`}
                        />
                      </CollapsibleTrigger>
                      <div className="px-4 pb-2 pt-0 border-t">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="w-full mt-2"
                          onClick={() => navigate("/nutrition/log-day", { 
                            state: { 
                              dayMeals: meals,
                              dayName: day,
                              planId: planId
                            }
                          })}
                        >
                          <Utensils className="mr-2 h-4 w-4" />
                          Add All Meals for Today
                        </Button>
                      </div>
                      <CollapsibleContent className="p-4 pt-1 border-t">
                        <div className="space-y-4">
                          {/* Breakfast */}
                          {meals.breakfast && (
                            <div className="bg-muted p-3 rounded-md">
                              <div className="flex items-center mb-2">
                                <Coffee className="h-4 w-4 mr-2" />
                                <h4 className="font-medium">Breakfast</h4>
                              </div>
                              <p className="text-sm mb-2">{meals.breakfast.name}</p>
                              <p className="text-xs text-muted-foreground">{meals.breakfast.description}</p>
                              <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                                <span className="text-muted-foreground">
                                  {meals.breakfast.calories} kcal
                                </span>
                                <span className="text-muted-foreground">
                                  P: {meals.breakfast.protein}g
                                </span>
                                <span className="text-muted-foreground">
                                  C: {meals.breakfast.carbs}g
                                </span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-2 w-full flex items-center justify-center"
                                onClick={() => navigate("/nutrition/log", { 
                                  state: { 
                                    mealName: meals.breakfast.name, 
                                    mealType: "breakfast",
                                    calories: meals.breakfast.calories,
                                    protein: meals.breakfast.protein,
                                    carbs: meals.breakfast.carbs,
                                    fat: meals.breakfast.fat || 0
                                  }
                                })}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Log Breakfast
                              </Button>
                            </div>
                          )}

                          {/* Lunch */}
                          {meals.lunch && (
                            <div className="bg-muted p-3 rounded-md">
                              <div className="flex items-center mb-2">
                                <Utensils className="h-4 w-4 mr-2" />
                                <h4 className="font-medium">Lunch</h4>
                              </div>
                              <p className="text-sm mb-2">{meals.lunch.name}</p>
                              <p className="text-xs text-muted-foreground">{meals.lunch.description}</p>
                              <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                                <span className="text-muted-foreground">
                                  {meals.lunch.calories} kcal
                                </span>
                                <span className="text-muted-foreground">
                                  P: {meals.lunch.protein}g
                                </span>
                                <span className="text-muted-foreground">
                                  C: {meals.lunch.carbs}g
                                </span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-2 w-full flex items-center justify-center"
                                onClick={() => navigate("/nutrition/log", { 
                                  state: { 
                                    mealName: meals.lunch.name, 
                                    mealType: "lunch",
                                    calories: meals.lunch.calories,
                                    protein: meals.lunch.protein,
                                    carbs: meals.lunch.carbs,
                                    fat: meals.lunch.fat || 0
                                  }
                                })}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Log Lunch
                              </Button>
                            </div>
                          )}

                          {/* Dinner */}
                          {meals.dinner && (
                            <div className="bg-muted p-3 rounded-md">
                              <div className="flex items-center mb-2">
                                <Utensils className="h-4 w-4 mr-2" />
                                <h4 className="font-medium">Dinner</h4>
                              </div>
                              <p className="text-sm mb-2">{meals.dinner.name}</p>
                              <p className="text-xs text-muted-foreground">{meals.dinner.description}</p>
                              <div className="mt-2 grid grid-cols-3 gap-1 text-xs">
                                <span className="text-muted-foreground">
                                  {meals.dinner.calories} kcal
                                </span>
                                <span className="text-muted-foreground">
                                  P: {meals.dinner.protein}g
                                </span>
                                <span className="text-muted-foreground">
                                  C: {meals.dinner.carbs}g
                                </span>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="mt-2 w-full flex items-center justify-center"
                                onClick={() => navigate("/nutrition/log", { 
                                  state: { 
                                    mealName: meals.dinner.name, 
                                    mealType: "dinner",
                                    calories: meals.dinner.calories,
                                    protein: meals.dinner.protein,
                                    carbs: meals.dinner.carbs,
                                    fat: meals.dinner.fat || 0
                                  }
                                })}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Log Dinner
                              </Button>
                            </div>
                          )}

                          {/* Snacks */}
                          {meals.snacks && meals.snacks.length > 0 && (
                            <div className="bg-muted p-3 rounded-md">
                              <div className="flex items-center mb-2">
                                <Apple className="h-4 w-4 mr-2" />
                                <h4 className="font-medium">Snacks</h4>
                              </div>
                              <div className="space-y-3">
                                {meals.snacks.map((snack, idx) => (
                                  <div key={idx} className="border-t border-muted-foreground/20 pt-2 mt-2 first:border-0 first:pt-0 first:mt-0">
                                    <p className="text-sm">{snack.name}</p>
                                    <p className="text-xs text-muted-foreground">{snack.description}</p>
                                    <div className="mt-1 flex gap-3 text-xs">
                                      <span className="text-muted-foreground">
                                        {snack.calories} kcal
                                      </span>
                                      <span className="text-muted-foreground">
                                        P: {snack.protein}g
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <Alert variant="default" className="bg-muted">
                  <Info className="h-4 w-4" />
                  <AlertTitle>No detailed meal plan</AlertTitle>
                  <AlertDescription>
                    Your trainer hasn't provided a detailed meal plan yet. Message them for more information.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/nutrition")}
              >
                <ChefHat className="mr-2 h-4 w-4" />
                Log Meals
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}