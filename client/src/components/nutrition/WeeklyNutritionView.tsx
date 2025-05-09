import { useState, useEffect } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, addWeeks, subWeeks } from "date-fns";
import { ChevronLeft, ChevronRight, Coffee, Utensils, Pizza } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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

interface WeeklyNutritionViewProps {
  meals: Meal[];
  nutritionGoals: NutritionInfo;
  onViewDay: (date: string) => void;
}

const WeeklyNutritionView: React.FC<WeeklyNutritionViewProps> = ({ 
  meals = [], 
  nutritionGoals = { calories: 2000, protein: 150, carbs: 200, fat: 70 },
  onViewDay 
}) => {
  // Ensure nutritionGoals has all required properties
  const safeNutritionGoals = {
    calories: nutritionGoals?.calories || 2000,
    protein: nutritionGoals?.protein || 150,
    carbs: nutritionGoals?.carbs || 200,
    fat: nutritionGoals?.fat || 70
  };
  // Use today's date as the maximum available date for navigation
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [weeklyMeals, setWeeklyMeals] = useState<{ [key: string]: Meal[] }>({});
  const [dailyTotals, setDailyTotals] = useState<{ [key: string]: NutritionInfo }>({});

  // Calculate the oldest allowed date (3 weeks before today)
  const threeWeeksAgo = subWeeks(startOfWeek(today, { weekStartsOn: 1 }), 3);
  
  // Calculate the start and end of the week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Week starts on Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  // Generate array of days for the current week
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    // Group meals by day
    const sortedMeals: { [key: string]: Meal[] } = {};
    const totals: { [key: string]: NutritionInfo } = {};
    
    // Initialize all days of the week with empty arrays and zero totals
    daysOfWeek.forEach(day => {
      const formattedDate = format(day, "yyyy-MM-dd");
      sortedMeals[formattedDate] = [];
      totals[formattedDate] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    });
    
    // Add meals to their respective days and calculate daily totals
    if (Array.isArray(meals)) {
      meals.forEach(meal => {
        try {
          // Skip invalid meal objects
          if (!meal || typeof meal !== 'object') return;
          
          // Standardize date format - some dates might come with time component
          let mealDate = meal.date || '';
          if (typeof mealDate !== 'string') {
            // If date is not a string, try to convert or skip
            try {
              mealDate = String(mealDate);
            } catch (e) {
              return; // Skip this meal if date cannot be processed
            }
          }
          
          if (mealDate.includes('T')) {
            // If the date has a time component, strip it off
            mealDate = mealDate.split('T')[0];
          }
          
          if (sortedMeals[mealDate]) {
            sortedMeals[mealDate].push({...meal, date: mealDate});
            
            // Add to daily totals if nutrition data exists
            if (meal.nutrition && typeof meal.nutrition === 'object') {
              totals[mealDate].calories += Number(meal.nutrition.calories) || 0;
              totals[mealDate].protein += Number(meal.nutrition.protein) || 0;
              totals[mealDate].carbs += Number(meal.nutrition.carbs) || 0;
              totals[mealDate].fat += Number(meal.nutrition.fat) || 0;
            }
          }
        } catch (error) {
          console.error('Error processing meal:', error);
          // Continue with next meal
        }
      });
    }
    
    setWeeklyMeals(sortedMeals);
    setDailyTotals(totals);
  }, [meals, currentDate]);

  const navigateWeek = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      // Don't allow going into the future past the current week
      if (weekStart < startOfWeek(today, { weekStartsOn: 1 })) {
        setCurrentDate(addWeeks(currentDate, 1));
      }
    } else {
      // Don't allow going back more than 3 weeks
      if (weekStart > threeWeeksAgo) {
        setCurrentDate(subWeeks(currentDate, 1));
      }
    }
  };

  // Format for display
  const getWeekDateRange = () => {
    return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
  };

  const getTodayString = () => format(new Date(), "yyyy-MM-dd");

  // Get meal type icon
  const getMealTypeIcon = (mealType: string) => {
    switch (mealType.toLowerCase()) {
      case 'breakfast':
        return <Coffee className="h-3 w-3" />;
      case 'lunch':
        return <Utensils className="h-3 w-3" />;
      case 'dinner':
        return <Pizza className="h-3 w-3" />;
      default:
        return <Utensils className="h-3 w-3" />;
    }
  };

  // Calculate percentage of goal
  const getPercentage = (value: number, goal: number) => {
    if (!goal) return 0;
    return Math.min(Math.round((value / goal) * 100), 100);
  };
  
  // Check if we're at limits for navigation
  const isAtOldestWeek = weekStart <= threeWeeksAgo;
  const isAtCurrentWeek = weekStart >= startOfWeek(today, { weekStartsOn: 1 });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Weekly Nutrition Log</h2>
        <div className="flex items-center space-x-1">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateWeek('prev')}
            disabled={isAtOldestWeek}
            className="h-8 w-8 p-0"
            title={isAtOldestWeek ? "Can't go back more than 3 weeks" : "Previous week"}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous Week</span>
          </Button>
          <span className="text-sm px-2">{getWeekDateRange()}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigateWeek('next')}
            disabled={isAtCurrentWeek}
            className="h-8 w-8 p-0"
            title={isAtCurrentWeek ? "Can't go into the future" : "Next week"}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next Week</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 overflow-hidden">
        {daysOfWeek.map((day, index) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayMeals = weeklyMeals[dateStr] || [];
          const dayTotal = dailyTotals[dateStr] || { calories: 0, protein: 0, carbs: 0, fat: 0 };
          const isToday = dateStr === getTodayString();
          
          // Group meals by type for display
          const mealsByType: { [key: string]: number } = {};
          dayMeals.forEach(meal => {
            try {
              // Use a default meal type if not provided
              const mealType = meal.mealType || 'other';
              if (mealsByType[mealType]) {
                mealsByType[mealType]++;
              } else {
                mealsByType[mealType] = 1;
              }
            } catch (error) {
              console.error('Error processing meal type:', error);
            }
          });
          
          return (
            <Card 
              key={index} 
              className={`overflow-hidden cursor-pointer ${isToday ? 'border-primary' : ''}`}
              onClick={() => onViewDay(dateStr)}
            >
              <CardHeader className="p-3 bg-muted/30">
                <CardTitle className="text-sm flex justify-between items-center">
                  <span>{format(day, "EEE")}</span>
                  <span className="text-xs text-muted-foreground">{format(day, "MMM d")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 min-h-[130px] max-h-[300px] overflow-y-auto">
                {dayMeals.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">No meals logged</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium">Calories</span>
                        <span className="text-muted-foreground">
                          {dayTotal.calories} / {safeNutritionGoals.calories}
                        </span>
                      </div>
                      <Progress 
                        value={getPercentage(dayTotal.calories, safeNutritionGoals.calories)} 
                        className="h-1.5" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-1">
                      <div className="space-y-1">
                        <div className="text-[10px] font-medium">Protein</div>
                        <div className="text-[10px] text-muted-foreground">
                          {dayTotal.protein}g
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-medium">Carbs</div>
                        <div className="text-[10px] text-muted-foreground">
                          {dayTotal.carbs}g
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-medium">Fat</div>
                        <div className="text-[10px] text-muted-foreground">
                          {dayTotal.fat}g
                        </div>
                      </div>
                    </div>
                    
                    <div className="pt-1 flex flex-wrap gap-1 text-[10px]">
                      {Object.entries(mealsByType).map(([type, count], i) => (
                        <div key={i} className="bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                          {getMealTypeIcon(type)}
                          <span className="capitalize">{type}</span>
                          <span className="text-muted-foreground">({count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyNutritionView;