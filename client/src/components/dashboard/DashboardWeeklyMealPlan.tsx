import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Coffee, Utensils, Pizza, Dumbbell, GanttChartSquare, Moon, Apple, Cookie } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "wouter";

interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Meal {
  id: number;
  userId: number;
  name: string;
  mealType: string;
  servingSize: number;
  servingUnit: string;
  date: string;
  nutrition: NutritionInfo;
}

interface DashboardWeeklyMealPlanProps {
  activeFitnessPlan?: any;
}

const DashboardWeeklyMealPlan: React.FC<DashboardWeeklyMealPlanProps> = ({ 
  activeFitnessPlan
}) => {
  const [, navigate] = useLocation();
  const today = new Date();
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const [selectedDay, setSelectedDay] = useState<string>(daysOfWeek[0]); // Default to Monday
  
  // Check if there's an active fitness plan with meal plan data
  const hasMealPlan = activeFitnessPlan && 
                      activeFitnessPlan.mealPlan && 
                      (activeFitnessPlan.mealPlan.weeklyMeals || activeFitnessPlan.mealPlan.dailyMeals);
                      
  // Determine if we have weekly meals or daily meals
  const hasWeeklyMeals = activeFitnessPlan?.mealPlan?.weeklyMeals;
  
  // Get the meals for the selected day or daily meals if that's all we have
  const getSelectedDayMeals = () => {
    if (hasWeeklyMeals) {
      return activeFitnessPlan.mealPlan.weeklyMeals[selectedDay] || null;
    } else if (activeFitnessPlan?.mealPlan?.dailyMeals) {
      // If we only have daily meals, use those regardless of selected day
      return activeFitnessPlan.mealPlan.dailyMeals;
    }
    return null;
  };
  
  const selectedMeals = getSelectedDayMeals();

  // Function to get meal type icon
  const getMealTypeIcon = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        return <Coffee className="h-4 w-4" />;
      case 'lunch':
        return <Utensils className="h-4 w-4" />;
      case 'dinner':
        return <Pizza className="h-4 w-4" />;
      case 'pre_workout':
      case 'pre-workout':
        return <Dumbbell className="h-4 w-4" />;
      case 'post_workout':
      case 'post-workout':
        return <GanttChartSquare className="h-4 w-4" />;
      case 'evening_meal':
      case 'evening-meal':
        return <Moon className="h-4 w-4" />;
      default:
        return <Utensils className="h-4 w-4" />;
    }
  };

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-50">Weekly Meal Plan</h3>
        {hasMealPlan && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate("/nutrition")}
          >
            View Full Plan
          </Button>
        )}
      </div>

      {!hasMealPlan ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                You don't have an active meal plan. 
                Create or manage your nutrition plan.
              </p>
              <Button onClick={() => navigate("/nutrition")}>
                Create Meal Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-md">Your Weekly Meal Plan</CardTitle>
            <CardDescription>
              {activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('muscle') || 
               activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('gain') || 
               activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('bulk') ? (
                "4-6 daily meals optimized for muscle gain"
              ) : activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('weight loss') ||
                  activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('lose weight') ||
                  activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('fat loss') ? (
                "2-3 strategic meals for weight loss"
              ) : (
                "Balanced nutrition based on your fitness goals"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Day selector for weekly meal plans */}
            {hasWeeklyMeals && (
              <div className="mb-4">
                <Select
                  value={selectedDay}
                  onValueChange={(value) => setSelectedDay(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day} value={day} className="capitalize">
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {selectedMeals ? (
              <Tabs defaultValue="breakfast">
                <TabsList className="grid grid-cols-7 mb-4">
                  <TabsTrigger value="breakfast" className="flex items-center gap-1">
                    <Coffee className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Breakfast</span>
                  </TabsTrigger>
                  <TabsTrigger value="lunch" className="flex items-center gap-1">
                    <Utensils className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Lunch</span>
                  </TabsTrigger>
                  <TabsTrigger value="dinner" className="flex items-center gap-1">
                    <Pizza className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Dinner</span>
                  </TabsTrigger>
                  
                  {/* Add snacks tab */}
                  {selectedMeals.snacks && selectedMeals.snacks.length > 0 && (
                    <TabsTrigger value="snacks" className="flex items-center gap-1">
                      <Apple className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Snacks</span>
                    </TabsTrigger>
                  )}
                  
                  {/* Additional meal tabs for specific diet plans */}
                  {selectedMeals.pre_workout && (
                    <TabsTrigger value="pre_workout" className="flex items-center gap-1">
                      <Dumbbell className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Pre-Workout</span>
                    </TabsTrigger>
                  )}
                  
                  {selectedMeals.post_workout && (
                    <TabsTrigger value="post_workout" className="flex items-center gap-1">
                      <GanttChartSquare className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Post-Workout</span>
                    </TabsTrigger>
                  )}
                  
                  {selectedMeals.evening_meal && (
                    <TabsTrigger value="evening_meal" className="flex items-center gap-1">
                      <Moon className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Evening</span>
                    </TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="breakfast">
                  <div className="space-y-4">
                    <div className="bg-muted/40 dark:bg-gray-800/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">{selectedMeals.breakfast.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{selectedMeals.breakfast.description}</p>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Calories</div>
                          <div>{selectedMeals.breakfast.calories} kcal</div>
                        </div>
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Protein</div>
                          <div>{selectedMeals.breakfast.protein}g</div>
                        </div>
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Carbs</div>
                          <div>{selectedMeals.breakfast.carbs}g</div>
                        </div>
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Fat</div>
                          <div>{selectedMeals.breakfast.fat}g</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="lunch">
                  <div className="space-y-4">
                    <div className="bg-muted/40 dark:bg-gray-800/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">{selectedMeals.lunch.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{selectedMeals.lunch.description}</p>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Calories</div>
                          <div>{selectedMeals.lunch.calories} kcal</div>
                        </div>
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Protein</div>
                          <div>{selectedMeals.lunch.protein}g</div>
                        </div>
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Carbs</div>
                          <div>{selectedMeals.lunch.carbs}g</div>
                        </div>
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Fat</div>
                          <div>{selectedMeals.lunch.fat}g</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="dinner">
                  <div className="space-y-4">
                    <div className="bg-muted/40 dark:bg-gray-800/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-1">{selectedMeals.dinner.name}</h4>
                      <p className="text-sm text-muted-foreground mb-3">{selectedMeals.dinner.description}</p>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Calories</div>
                          <div>{selectedMeals.dinner.calories} kcal</div>
                        </div>
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Protein</div>
                          <div>{selectedMeals.dinner.protein}g</div>
                        </div>
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Carbs</div>
                          <div>{selectedMeals.dinner.carbs}g</div>
                        </div>
                        <div className="bg-background dark:bg-gray-700 p-2 rounded">
                          <div className="font-medium">Fat</div>
                          <div>{selectedMeals.dinner.fat}g</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Pre-workout meal tab */}
                {selectedMeals.pre_workout && (
                  <TabsContent value="pre_workout">
                    <div className="space-y-4">
                      <div className="bg-muted/40 dark:bg-gray-800/50 p-4 rounded-lg">
                        <h4 className="font-medium mb-1">{selectedMeals.pre_workout.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{selectedMeals.pre_workout.description}</p>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Calories</div>
                            <div>{selectedMeals.pre_workout.calories} kcal</div>
                          </div>
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Protein</div>
                            <div>{selectedMeals.pre_workout.protein}g</div>
                          </div>
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Carbs</div>
                            <div>{selectedMeals.pre_workout.carbs}g</div>
                          </div>
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Fat</div>
                            <div>{selectedMeals.pre_workout.fat}g</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}
                
                {/* Post-workout meal tab */}
                {selectedMeals.post_workout && (
                  <TabsContent value="post_workout">
                    <div className="space-y-4">
                      <div className="bg-muted/40 dark:bg-gray-800/50 p-4 rounded-lg">
                        <h4 className="font-medium mb-1">{selectedMeals.post_workout.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{selectedMeals.post_workout.description}</p>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Calories</div>
                            <div>{selectedMeals.post_workout.calories} kcal</div>
                          </div>
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Protein</div>
                            <div>{selectedMeals.post_workout.protein}g</div>
                          </div>
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Carbs</div>
                            <div>{selectedMeals.post_workout.carbs}g</div>
                          </div>
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Fat</div>
                            <div>{selectedMeals.post_workout.fat}g</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}
                
                {/* Evening meal tab */}
                {selectedMeals.evening_meal && (
                  <TabsContent value="evening_meal">
                    <div className="space-y-4">
                      <div className="bg-muted/40 dark:bg-gray-800/50 p-4 rounded-lg">
                        <h4 className="font-medium mb-1">{selectedMeals.evening_meal.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{selectedMeals.evening_meal.description}</p>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Calories</div>
                            <div>{selectedMeals.evening_meal.calories} kcal</div>
                          </div>
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Protein</div>
                            <div>{selectedMeals.evening_meal.protein}g</div>
                          </div>
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Carbs</div>
                            <div>{selectedMeals.evening_meal.carbs}g</div>
                          </div>
                          <div className="bg-background dark:bg-gray-700 p-2 rounded">
                            <div className="font-medium">Fat</div>
                            <div>{selectedMeals.evening_meal.fat}g</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                )}
                
                {/* Snacks tab */}
                {selectedMeals.snacks && selectedMeals.snacks.length > 0 && (
                  <TabsContent value="snacks">
                    <div className="space-y-4">
                      {selectedMeals.snacks.map((snack, index) => (
                        <div key={index} className="bg-muted/40 dark:bg-gray-800/50 p-4 rounded-lg">
                          <h4 className="font-medium mb-1">
                            {snack.name}
                            {snack.timing && <span className="text-xs text-muted-foreground ml-2">({snack.timing})</span>}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-3">{snack.description}</p>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className="bg-background dark:bg-gray-700 p-2 rounded">
                              <div className="font-medium">Calories</div>
                              <div>{snack.calories} kcal</div>
                            </div>
                            <div className="bg-background dark:bg-gray-700 p-2 rounded">
                              <div className="font-medium">Protein</div>
                              <div>{snack.protein}g</div>
                            </div>
                            <div className="bg-background dark:bg-gray-700 p-2 rounded">
                              <div className="font-medium">Carbs</div>
                              <div>{snack.carbs}g</div>
                            </div>
                            <div className="bg-background dark:bg-gray-700 p-2 rounded">
                              <div className="font-medium">Fat</div>
                              <div>{snack.fat}g</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No meal data available for {selectedDay}. Please choose another day.
              </div>
            )}

            {/* Display additional meal info for muscle gain */}
            {(activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('muscle') || 
              activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('gain') || 
              activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('bulk')) && selectedMeals && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                <div className="font-medium mb-1">Muscle Gain Meal Strategy:</div>
                <p className="text-muted-foreground">
                  Your plan includes additional meals to support muscle growth. Check for:
                  <span className="block mt-1">• Pre-workout meals (1-2 hours before training)</span>
                  <span className="block">• Post-workout meals (within 30-60 minutes after)</span>
                  <span className="block">• Evening meals to maintain protein synthesis overnight</span>
                </p>
              </div>
            )}
            
            {/* Display meal info for weight loss */}
            {(activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('weight loss') || 
              activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('lose weight') ||
              activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('fat loss')) && selectedMeals && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg text-sm">
                <div className="font-medium mb-1">Weight Loss Meal Strategy:</div>
                <p className="text-muted-foreground">
                  Your plan features fewer, more strategic meals to support fat loss:
                  <span className="block mt-1">• 2-3 nutrient-dense meals per day</span>
                  <span className="block">• Higher protein content to preserve muscle</span>
                  <span className="block">• Strategic meal timing to manage hunger</span>
                </p>
              </div>
            )}
            
            {/* Display meal info for general fitness */}
            {(!(activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('weight loss') || 
               activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('lose weight') ||
               activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('fat loss') ||
               activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('muscle') || 
               activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('gain') || 
               activeFitnessPlan?.preferences?.goal?.toLowerCase()?.includes('bulk')) && 
               selectedMeals) && (
              <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm">
                <div className="font-medium mb-1">Balanced Meal Strategy:</div>
                <p className="text-muted-foreground">
                  Your plan incorporates a balanced approach to nutrition:
                  <span className="block mt-1">• 3-4 meals evenly distributed throughout the day</span>
                  <span className="block">• Balanced macronutrient distribution</span>
                  <span className="block">• Focus on overall health and sustainable habits</span>
                </p>
              </div>
            )}
            
            {activeFitnessPlan.mealPlan.notes && (
              <div className="mt-4 p-3 bg-accent/20 rounded-lg text-sm">
                <div className="font-medium mb-1">Nutrition Tips:</div>
                <p className="text-muted-foreground">{activeFitnessPlan.mealPlan.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardWeeklyMealPlan;