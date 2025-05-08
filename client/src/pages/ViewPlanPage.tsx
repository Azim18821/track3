/**
 * View Plan Page
 * Page for viewing an active fitness plan
 */

import React, { useState } from "react";
import { useNavigate } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, ShoppingCart, Dumbbell, Utensils, Calculator } from "lucide-react";
import { usePlanGeneration } from "@/hooks/use-plan-generation";
import { useAuth } from "@/hooks/use-auth";
import type { Workout, Meal, FoodItem } from "@/services/planGeneratorService";

/**
 * Main ViewPlanPage component
 */
export default function ViewPlanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<string>("monday");
  const { activePlanQuery } = usePlanGeneration();

  // Load the active plan on component mount
  React.useEffect(() => {
    activePlanQuery.refetch();
  }, [activePlanQuery]);

  // If not logged in, show a message
  if (!user) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Your Fitness Plan</h1>
          <p className="mb-6">Please log in to view your personalized fitness plan.</p>
          <Button onClick={() => navigate("/auth")}>Log In</Button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (activePlanQuery.isLoading) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin mb-4" />
          <h2 className="text-xl font-semibold">Loading your fitness plan...</h2>
        </div>
      </div>
    );
  }

  // Show error state
  if (activePlanQuery.isError) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="flex flex-col items-center justify-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Plan</h2>
          <p className="text-muted-foreground mb-4">
            {activePlanQuery.error instanceof Error
              ? activePlanQuery.error.message
              : "Failed to load your fitness plan"}
          </p>
          <Button onClick={() => activePlanQuery.refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  // If no active plan exists, show a message
  const plan = activePlanQuery.data;
  if (!plan) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">No Active Plan</h1>
          <p className="mb-6">You don't have an active fitness plan yet.</p>
          <Button onClick={() => navigate("/generate-plan")}>
            Generate a New Plan
          </Button>
        </div>
      </div>
    );
  }

  // Get the data from the plan
  const {
    workoutPlan,
    mealPlan,
    groceryList,
    nutritionData,
    summary
  } = plan;

  // Get available days from workout plan
  const days = Object.keys(workoutPlan.weeklySchedule).sort((a, b) => {
    const weekdayOrder = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    return weekdayOrder.indexOf(a) - weekdayOrder.indexOf(b);
  });

  // Get current day's workout
  const currentWorkout = workoutPlan.weeklySchedule[selectedDay];
  
  // Get current day's meals
  const currentDayMeals = mealPlan.weeklyMeals[selectedDay];

  // Get basic plan stats
  const workoutDaysCount = Object.keys(workoutPlan.weeklySchedule).length;
  const avgCaloriesPerDay = Object.values(mealPlan.weeklyMeals).reduce(
    (sum, day) => sum + day.totalCalories,
    0
  ) / 7;

  // Format calorie counts nicely
  const formatCalories = (calories: number) => Math.round(calories).toLocaleString();
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: plan.budgetCurrency || 'GBP'
    }).format(amount);
  };

  // Format title case for day names
  const formatDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold">Your Fitness Plan</h1>
          <p className="text-muted-foreground">
            Personalized for your {summary.fitnessGoal} goal • {summary.dietType} diet
          </p>
        </div>
        <Button 
          className="mt-4 sm:mt-0" 
          onClick={() => navigate("/generate-plan")}
        >
          Generate New Plan
        </Button>
      </div>

      {/* Plan summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Weekly Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <ShoppingCart className="h-5 w-5 mr-2 text-primary" />
              {formatCurrency(summary.weeklyCost)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Workout Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <Dumbbell className="h-5 w-5 mr-2 text-primary" />
              {workoutDaysCount} days / week
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Daily Calories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <Utensils className="h-5 w-5 mr-2 text-primary" />
              {formatCalories(avgCaloriesPerDay)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Daily Macros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-3 text-sm">
              <div>
                <span className="font-semibold">{nutritionData.protein}g</span>
                <div className="text-xs text-muted-foreground">Protein</div>
              </div>
              <div>
                <span className="font-semibold">{nutritionData.carbs}g</span>
                <div className="text-xs text-muted-foreground">Carbs</div>
              </div>
              <div>
                <span className="font-semibold">{nutritionData.fat}g</span>
                <div className="text-xs text-muted-foreground">Fat</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Day selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Daily Plan</h2>
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {days.map((day) => (
            <Button
              key={day}
              variant={selectedDay === day ? "default" : "outline"}
              onClick={() => setSelectedDay(day)}
              className="min-w-[100px]"
            >
              {formatDayName(day)}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs for workout, nutrition, groceries */}
      <Tabs defaultValue="workout" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="workout">Workout</TabsTrigger>
          <TabsTrigger value="meals">Meals</TabsTrigger>
          <TabsTrigger value="groceries">Groceries</TabsTrigger>
        </TabsList>

        {/* Workout tab */}
        <TabsContent value="workout">
          {currentWorkout ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Dumbbell className="h-5 w-5 mr-2" />
                      {currentWorkout.name}
                    </CardTitle>
                    <CardDescription>
                      {currentWorkout.workoutType} • {currentWorkout.duration} minutes • 
                      Approximately {currentWorkout.caloriesBurned} calories
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="font-medium mb-2">Target Muscle Groups:</div>
                      <div className="flex flex-wrap gap-2">
                        {currentWorkout.targetMuscleGroups.map((muscle) => (
                          <Badge key={muscle} variant="outline">
                            {muscle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="font-medium">Exercises:</h3>
                      {currentWorkout.exercises.map((exercise, index) => (
                        <div key={index} className="border rounded-md p-3">
                          <div className="font-medium">{exercise.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {exercise.sets} sets × {exercise.reps} reps • 
                            {exercise.rest}s rest between sets
                            {exercise.weight && ` • ${exercise.weight}kg`}
                          </div>
                          {exercise.notes && (
                            <div className="text-sm mt-2 italic">
                              {exercise.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Workout Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line">{workoutPlan.notes}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Rest Day</CardTitle>
              </CardHeader>
              <CardContent>
                <p>
                  Today is a scheduled rest day. Rest is an important part of your
                  fitness journey to allow your muscles to recover and grow stronger.
                </p>
                <p className="mt-4 font-medium">
                  Consider these recovery activities:
                </p>
                <ul className="list-disc ml-6 mt-2">
                  <li>Light stretching or yoga</li>
                  <li>Leisurely walking</li>
                  <li>Foam rolling</li>
                  <li>Proper hydration</li>
                  <li>Getting enough sleep</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Meals tab */}
        <TabsContent value="meals">
          {currentDayMeals ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Breakfast */}
              <Card>
                <CardHeader>
                  <CardTitle>Breakfast</CardTitle>
                  <CardDescription>
                    {currentDayMeals.breakfast.name} • 
                    {currentDayMeals.breakfast.calories} kcal • 
                    {currentDayMeals.breakfast.prepTime} mins
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MealDisplay meal={currentDayMeals.breakfast} />
                </CardContent>
              </Card>

              {/* Lunch */}
              <Card>
                <CardHeader>
                  <CardTitle>Lunch</CardTitle>
                  <CardDescription>
                    {currentDayMeals.lunch.name} • 
                    {currentDayMeals.lunch.calories} kcal • 
                    {currentDayMeals.lunch.prepTime} mins
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MealDisplay meal={currentDayMeals.lunch} />
                </CardContent>
              </Card>

              {/* Dinner */}
              <Card>
                <CardHeader>
                  <CardTitle>Dinner</CardTitle>
                  <CardDescription>
                    {currentDayMeals.dinner.name} • 
                    {currentDayMeals.dinner.calories} kcal • 
                    {currentDayMeals.dinner.prepTime} mins
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MealDisplay meal={currentDayMeals.dinner} />
                </CardContent>
              </Card>

              {/* Snacks */}
              <Card>
                <CardHeader>
                  <CardTitle>Snacks</CardTitle>
                  <CardDescription>
                    {currentDayMeals.snacks.length} snacks • 
                    {currentDayMeals.snacks.reduce((sum, snack) => sum + snack.calories, 0)} kcal total
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentDayMeals.snacks.map((snack, idx) => (
                      <div key={idx}>
                        <h4 className="font-medium mb-2">{snack.name}</h4>
                        <MealDisplay meal={snack} compact />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Pre-workout meal (if available) */}
              {currentDayMeals.pre_workout && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pre-Workout</CardTitle>
                    <CardDescription>
                      {currentDayMeals.pre_workout.name} • 
                      {currentDayMeals.pre_workout.calories} kcal • 
                      {currentDayMeals.pre_workout.prepTime} mins
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MealDisplay meal={currentDayMeals.pre_workout} />
                  </CardContent>
                </Card>
              )}

              {/* Post-workout meal (if available) */}
              {currentDayMeals.post_workout && (
                <Card>
                  <CardHeader>
                    <CardTitle>Post-Workout</CardTitle>
                    <CardDescription>
                      {currentDayMeals.post_workout.name} • 
                      {currentDayMeals.post_workout.calories} kcal • 
                      {currentDayMeals.post_workout.prepTime} mins
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MealDisplay meal={currentDayMeals.post_workout} />
                  </CardContent>
                </Card>
              )}

              {/* Daily nutrition summary */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Daily Nutrition Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Calories</div>
                      <div className="text-2xl font-bold">
                        {formatCalories(currentDayMeals.totalCalories)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Protein</div>
                      <div className="text-2xl font-bold">
                        {Math.round(currentDayMeals.totalProtein)}g
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Carbs</div>
                      <div className="text-2xl font-bold">
                        {Math.round(currentDayMeals.totalCarbs)}g
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Fat</div>
                      <div className="text-2xl font-bold">
                        {Math.round(currentDayMeals.totalFat)}g
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Cost</div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(currentDayMeals.totalCost)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Meal Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p>No meal plan data is available for this day.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Groceries tab */}
        <TabsContent value="groceries">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Weekly Shopping List
                  </CardTitle>
                  <CardDescription>
                    Total Cost: {formatCurrency(groceryList.totalCost)} • 
                    {groceryList.items.length} items
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {groceryList.items.map((item, idx) => (
                        <GroceryItemCard key={idx} item={item} />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="h-5 w-5 mr-2" />
                    Budget Allocation
                  </CardTitle>
                  <CardDescription>
                    Weekly budget: {formatCurrency(plan.weeklyBudget)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <BudgetItem 
                      label="Protein Sources" 
                      amount={groceryList.budgetAllocation.protein} 
                      currency={plan.budgetCurrency}
                    />
                    <BudgetItem 
                      label="Carbs & Grains" 
                      amount={groceryList.budgetAllocation.carbs} 
                      currency={plan.budgetCurrency}
                    />
                    <BudgetItem 
                      label="Fruits" 
                      amount={groceryList.budgetAllocation.fruits} 
                      currency={plan.budgetCurrency}
                    />
                    <BudgetItem 
                      label="Vegetables" 
                      amount={groceryList.budgetAllocation.vegetables} 
                      currency={plan.budgetCurrency}
                    />
                    <BudgetItem 
                      label="Dairy" 
                      amount={groceryList.budgetAllocation.dairy} 
                      currency={plan.budgetCurrency}
                    />
                    <BudgetItem 
                      label="Other Items" 
                      amount={groceryList.budgetAllocation.other} 
                      currency={plan.budgetCurrency}
                    />
                    <div className="h-px bg-border my-2"></div>
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>{formatCurrency(groceryList.totalCost)}</span>
                    </div>
                    
                    {groceryList.totalCost > plan.weeklyBudget ? (
                      <div className="text-sm text-destructive">
                        ⚠️ Over budget by {formatCurrency(groceryList.totalCost - plan.weeklyBudget)}
                      </div>
                    ) : (
                      <div className="text-sm text-green-600">
                        ✓ Under budget by {formatCurrency(plan.weeklyBudget - groceryList.totalCost)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Plan Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{mealPlan.notes}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Component to display a meal
 */
function MealDisplay({ meal, compact = false }: { meal: Meal; compact?: boolean }) {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="space-y-4">
      {!compact && (
        <p className="text-muted-foreground">{meal.description}</p>
      )}
      
      <div>
        <h4 className="font-medium mb-2">Ingredients:</h4>
        <ul className="list-disc pl-5 space-y-1">
          {meal.ingredients.map((ingredient, idx) => (
            <li key={idx}>
              {ingredient.quantity} {ingredient.unit} {ingredient.name}
            </li>
          ))}
        </ul>
      </div>
      
      {!compact && (
        <div>
          {!showInstructions ? (
            <Button
              variant="link"
              className="p-0"
              onClick={() => setShowInstructions(true)}
            >
              Show Instructions
            </Button>
          ) : (
            <div>
              <h4 className="font-medium mb-2">Instructions:</h4>
              <ol className="list-decimal pl-5 space-y-1">
                {meal.instructions.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
              <Button
                variant="link"
                className="p-0 mt-2"
                onClick={() => setShowInstructions(false)}
              >
                Hide Instructions
              </Button>
            </div>
          )}
        </div>
      )}
      
      <div className="flex space-x-6 text-sm">
        <div>
          <span className="font-semibold">{meal.protein}g</span>
          <div className="text-xs text-muted-foreground">Protein</div>
        </div>
        <div>
          <span className="font-semibold">{meal.carbs}g</span>
          <div className="text-xs text-muted-foreground">Carbs</div>
        </div>
        <div>
          <span className="font-semibold">{meal.fat}g</span>
          <div className="text-xs text-muted-foreground">Fat</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Component to display a grocery item
 */
function GroceryItemCard({ item }: { item: FoodItem }) {
  return (
    <div className="border rounded-md p-3">
      <div className="flex justify-between">
        <div className="font-medium">{item.name}</div>
        <div className="font-medium">
          {new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP'
          }).format(item.price)}
        </div>
      </div>
      <div className="text-sm text-muted-foreground">
        {item.quantity} {item.unit}
      </div>
      
      <div className="flex space-x-4 text-xs mt-2">
        <div>{item.calories} kcal</div>
        <div>{item.protein}g protein</div>
        <div>{item.carbs}g carbs</div>
        <div>{item.fat}g fat</div>
      </div>
      
      <div className="mt-2">
        <div className="text-xs text-muted-foreground">Used in:</div>
        <div className="flex flex-wrap gap-1 mt-1">
          {item.usedIn.map((meal, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {meal}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Budget item component
 */
function BudgetItem({ 
  label, 
  amount, 
  currency = 'GBP' 
}: { 
  label: string; 
  amount: number; 
  currency: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>
        {new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency
        }).format(amount)}
      </span>
    </div>
  );
}