import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Utensils, ShoppingBag, Clock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MealItem {
  name: string;
  ingredients?: string[];
  recipe?: string;
  portions?: string | number;
  prepTime?: string | number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  notes?: string;
}

interface DailyMeals {
  day: string;
  breakfast?: MealItem;
  lunch?: MealItem;
  dinner?: MealItem;
  snacks?: MealItem[];
  preWorkout?: MealItem;
  postWorkout?: MealItem;
  evening?: MealItem;
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  notes?: string;
}

interface MealPlanViewProps {
  mealPlan: {
    days: DailyMeals[];
    notes?: string;
    weeklyBudget?: string | number;
    macroBreakdown?: {
      protein: number;
      carbs: number;
      fat: number;
    };
    alternativeMeals?: MealItem[];
  };
  className?: string;
  onGenerateShoppingList?: () => void;
  showShoppingListButton?: boolean;
}

export default function MealPlanView({ 
  mealPlan, 
  className,
  onGenerateShoppingList,
  showShoppingListButton = true
}: MealPlanViewProps) {
  const dayMap: { [key: string]: string } = {
    'monday': 'Monday',
    'tuesday': 'Tuesday',
    'wednesday': 'Wednesday',
    'thursday': 'Thursday',
    'friday': 'Friday',
    'saturday': 'Saturday',
    'sunday': 'Sunday',
    'day1': 'Day 1',
    'day2': 'Day 2',
    'day3': 'Day 3',
    'day4': 'Day 4',
    'day5': 'Day 5',
    'day6': 'Day 6',
    'day7': 'Day 7'
  };
  
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Utensils className="h-6 w-6 text-primary" />
          Weekly Meal Plan
        </h2>
        
        {showShoppingListButton && onGenerateShoppingList && (
          <Button 
            onClick={onGenerateShoppingList} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1.5"
          >
            <ShoppingBag className="h-4 w-4" />
            Generate Shopping List
          </Button>
        )}
      </div>
      
      {mealPlan.macroBreakdown && (
        <Card className="bg-muted/40">
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Daily Macro Targets</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm font-medium">Protein</p>
                <p className="text-2xl font-bold">{mealPlan.macroBreakdown.protein}g</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(mealPlan.macroBreakdown.protein * 4)} calories
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Carbs</p>
                <p className="text-2xl font-bold">{mealPlan.macroBreakdown.carbs}g</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(mealPlan.macroBreakdown.carbs * 4)} calories
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Fat</p>
                <p className="text-2xl font-bold">{mealPlan.macroBreakdown.fat}g</p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(mealPlan.macroBreakdown.fat * 9)} calories
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs defaultValue={mealPlan.days[0]?.day || "monday"} className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto">
          {mealPlan.days.map((day) => (
            <TabsTrigger 
              key={day.day} 
              value={day.day}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {dayMap[day.day.toLowerCase()] || day.day}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {mealPlan.days.map((day) => (
          <TabsContent 
            key={day.day} 
            value={day.day}
            className="space-y-4"
          >
            {day.totalCalories && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted/40 rounded-md">
                <div className="flex gap-4">
                  {day.totalCalories && (
                    <div>
                      <p className="text-xs text-muted-foreground">Calories</p>
                      <p className="font-medium">{day.totalCalories}</p>
                    </div>
                  )}
                  {day.totalProtein && (
                    <div>
                      <p className="text-xs text-muted-foreground">Protein</p>
                      <p className="font-medium">{day.totalProtein}g</p>
                    </div>
                  )}
                  {day.totalCarbs && (
                    <div>
                      <p className="text-xs text-muted-foreground">Carbs</p>
                      <p className="font-medium">{day.totalCarbs}g</p>
                    </div>
                  )}
                  {day.totalFat && (
                    <div>
                      <p className="text-xs text-muted-foreground">Fat</p>
                      <p className="font-medium">{day.totalFat}g</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Breakfast */}
            {day.breakfast && (
              <MealCard 
                title="Breakfast" 
                meal={day.breakfast} 
                highlightProtein={true} 
              />
            )}
            
            {/* Pre-workout meal */}
            {day.preWorkout && (
              <MealCard 
                title="Pre-Workout Meal" 
                meal={day.preWorkout} 
                highlightProtein={false} 
              />
            )}
            
            {/* Lunch */}
            {day.lunch && (
              <MealCard 
                title="Lunch" 
                meal={day.lunch} 
                highlightProtein={true} 
              />
            )}
            
            {/* Post-workout meal */}
            {day.postWorkout && (
              <MealCard 
                title="Post-Workout Meal" 
                meal={day.postWorkout} 
                highlightProtein={true} 
              />
            )}
            
            {/* Dinner */}
            {day.dinner && (
              <MealCard 
                title="Dinner" 
                meal={day.dinner} 
                highlightProtein={true} 
              />
            )}
            
            {/* Evening meal */}
            {day.evening && (
              <MealCard 
                title="Evening Meal" 
                meal={day.evening} 
                highlightProtein={false} 
              />
            )}
            
            {/* Snacks */}
            {day.snacks && day.snacks.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base font-medium">Snacks</CardTitle>
                </CardHeader>
                <CardContent className="py-2 grid gap-4">
                  {day.snacks.map((snack, index) => (
                    <div key={index} className="border-t pt-3 first:border-0 first:pt-0">
                      <h4 className="font-medium text-sm">{snack.name}</h4>
                      {snack.ingredients && (
                        <div className="mt-1">
                          <p className="text-xs text-muted-foreground mb-1">Ingredients:</p>
                          <ul className="text-sm space-y-1 pl-4 list-disc">
                            {snack.ingredients.map((ingredient, idx) => (
                              <li key={idx}>{ingredient}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(snack.calories || snack.protein) && (
                        <div className="flex gap-3 mt-2 text-xs">
                          {snack.calories && (
                            <span className="text-muted-foreground">
                              {snack.calories} calories
                            </span>
                          )}
                          {snack.protein && (
                            <span className="font-medium">
                              {snack.protein}g protein
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            
            {/* Daily Notes */}
            {day.notes && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Day Notes</CardTitle>
                </CardHeader>
                <CardContent className="py-2 text-sm">
                  <p>{day.notes}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {/* Alternative meals */}
      {mealPlan.alternativeMeals && mealPlan.alternativeMeals.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Alternative Meal Options
            </CardTitle>
            <CardDescription>
              Substitute these meals when you need variety
            </CardDescription>
          </CardHeader>
          <CardContent className="py-2 grid gap-4">
            {mealPlan.alternativeMeals.map((meal, index) => (
              <div key={index} className="border-t pt-3 first:border-0 first:pt-0">
                <h4 className="font-medium">{meal.name}</h4>
                {meal.ingredients && (
                  <div className="mt-1">
                    <p className="text-xs text-muted-foreground mb-1">Ingredients:</p>
                    <ul className="text-sm space-y-1 pl-4 list-disc">
                      {meal.ingredients.map((ingredient, idx) => (
                        <li key={idx}>{ingredient}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {meal.recipe && (
                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-1">Instructions:</p>
                    <p className="text-sm">{meal.recipe}</p>
                  </div>
                )}
                {(meal.calories || meal.protein) && (
                  <div className="flex gap-3 mt-2 text-xs">
                    {meal.calories && (
                      <span className="text-muted-foreground">
                        {meal.calories} calories
                      </span>
                    )}
                    {meal.protein && (
                      <span className="font-medium">
                        {meal.protein}g protein
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      
      {/* Weekly meal plan notes */}
      {mealPlan.notes && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Weekly Meal Plan Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 text-sm">
            <p>{mealPlan.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper component for individual meals
function MealCard({ 
  title, 
  meal, 
  highlightProtein = false 
}: { 
  title: string; 
  meal: MealItem; 
  highlightProtein?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        <CardDescription className="mt-1 text-base font-medium">
          {meal.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="py-2">
        {meal.ingredients && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-1">Ingredients:</p>
            <ul className="text-sm space-y-1 pl-4 list-disc">
              {meal.ingredients.map((ingredient, idx) => (
                <li key={idx}>{ingredient}</li>
              ))}
            </ul>
          </div>
        )}
        
        {meal.recipe && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-1">Instructions:</p>
            <p className="text-sm">{meal.recipe}</p>
          </div>
        )}
        
        <div className="flex flex-wrap gap-4 mt-2 border-t pt-2">
          {meal.prepTime && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Prep: {meal.prepTime} mins</span>
            </div>
          )}
          
          {meal.portions && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Portions: {meal.portions}</span>
            </div>
          )}
        </div>
        
        {(meal.calories || meal.protein || meal.carbs || meal.fat) && (
          <div className="flex flex-wrap gap-4 mt-2">
            {meal.calories && (
              <div className="text-xs">
                <span className="text-muted-foreground">Calories: </span>
                <span>{meal.calories}</span>
              </div>
            )}
            {meal.protein && (
              <div className="text-xs">
                <span className="text-muted-foreground">Protein: </span>
                <span className={highlightProtein ? "font-bold" : ""}>
                  {meal.protein}g
                </span>
              </div>
            )}
            {meal.carbs && (
              <div className="text-xs">
                <span className="text-muted-foreground">Carbs: </span>
                <span>{meal.carbs}g</span>
              </div>
            )}
            {meal.fat && (
              <div className="text-xs">
                <span className="text-muted-foreground">Fat: </span>
                <span>{meal.fat}g</span>
              </div>
            )}
          </div>
        )}
        
        {meal.notes && (
          <div className="mt-3 text-sm">
            <p className="text-xs text-muted-foreground mb-1">Notes:</p>
            <p>{meal.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}