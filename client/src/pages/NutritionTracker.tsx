import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import NutritionSummary from "@/components/nutrition/NutritionSummary";
import MealList from "@/components/nutrition/MealList";
import AddMealDialog from "@/components/nutrition/AddMealDialog";
import NutritionGoalsForm from "@/components/nutrition/NutritionGoalsForm";
import WeeklyNutritionView from "@/components/nutrition/WeeklyNutritionView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Calendar, ListChecks, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

const NutritionTracker = () => {
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [selectedDate] = useState(new Date());
  const { toast } = useToast();

  // Define meal interface
  interface Meal {
    id: number;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    date: string;
  }

  // Define nutrition goals interface
  interface NutritionGoals {
    caloriesTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
  }

  // Fetch meals for the selected date
  const { data: meals = [], isLoading: isMealsLoading } = useQuery<Meal[]>({
    queryKey: [`/api/nutrition/meals?date=${format(selectedDate, 'yyyy-MM-dd')}`],
  });

  // Fetch nutrition goals
  const { data: nutritionGoals } = useQuery<NutritionGoals>({
    queryKey: ['/api/nutrition/goals'],
  });

  // Calculate daily nutrition totals from meals
  const dailyTotals = meals.reduce((acc: { calories: number; protein: number; carbs: number; fat: number }, meal: Meal) => {
    acc.calories += meal.calories;
    acc.protein += meal.protein;
    acc.carbs += meal.carbs;
    acc.fat += meal.fat;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Delete meal mutation
  const deleteMealMutation = useMutation({
    mutationFn: async (mealId: number) => {
      const response = await fetch(`/api/nutrition/meals/${mealId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete meal');
      }
      
      return mealId;
    },
    onSuccess: () => {
      // Invalidate all meal-related queries to ensure data is refreshed
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition/meals'] });
      queryClient.invalidateQueries({ queryKey: [`/api/nutrition/meals?date=${format(selectedDate, 'yyyy-MM-dd')}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      
      toast({
        title: "Meal deleted",
        description: "The meal has been successfully deleted",
      });
    },
    onError: (error) => {
      console.error('Error deleting meal:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete the meal",
        variant: "destructive",
      });
    }
  });

  const handleDeleteMeal = (mealId: number) => {
    if (confirm("Are you sure you want to delete this meal?")) {
      deleteMealMutation.mutate(mealId);
    }
  };

  // Fetch all meals for the weekly view
  const { data: allMeals = [] } = useQuery<any[]>({
    queryKey: ['/api/nutrition/meals'],
  });

  // Convert the meals to the format expected by WeeklyNutritionView
  const formattedMeals = allMeals.map(meal => ({
    id: meal.id,
    userId: meal.userId,
    name: meal.name,
    mealType: meal.mealType || 'other',
    servingSize: meal.servingSize || 1,
    servingUnit: meal.servingUnit || 'serving',
    date: meal.date,
    nutrition: {
      calories: meal.calories || 0,
      protein: meal.protein || 0,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0
    }
  }));

  const handleViewDay = (date: string) => {
    // We could update selectedDate here if we wanted to show a specific day
    toast({
      title: "Day selected",
      description: `Viewing meals for ${format(parseISO(date), 'MMMM d, yyyy')}`,
    });
  };

  const [activeTab, setActiveTab] = useState("weekly");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-white sm:text-3xl sm:truncate">
            Nutrition Tracker
          </h2>
        </div>
        <div className="mt-4 flex sm:mt-0 sm:ml-4">
          <Button
            onClick={() => setIsAddMealOpen(true)}
            className="flex items-center gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            Add Meal
          </Button>
        </div>
      </div>

      <Tabs defaultValue="weekly" value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Weekly View</span>
            <span className="inline sm:hidden">Weekly</span>
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Daily Summary</span>
            <span className="inline sm:hidden">Daily</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            <span className="hidden sm:inline">Meal List</span>
            <span className="inline sm:hidden">List</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="space-y-6">
          <WeeklyNutritionView 
            meals={formattedMeals}
            nutritionGoals={{
              calories: nutritionGoals?.caloriesTarget || 2000,
              protein: nutritionGoals?.proteinTarget || 150,
              carbs: nutritionGoals?.carbsTarget || 225,
              fat: nutritionGoals?.fatTarget || 65
            }}
            onViewDay={handleViewDay}
          />
        </TabsContent>

        <TabsContent value="daily" className="space-y-6">
          {/* Daily Summary */}
          <NutritionSummary 
            dailyTotals={dailyTotals} 
            goals={nutritionGoals ? nutritionGoals : {
              caloriesTarget: 2000,
              proteinTarget: 150,
              carbsTarget: 225,
              fatTarget: 65
            }} 
          />

          <div className="mt-4">
            <NutritionGoalsForm currentGoals={nutritionGoals} />
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-6">
          {/* Meal Entries */}
          <MealList 
            meals={meals} 
            isLoading={isMealsLoading} 
            onDeleteMeal={handleDeleteMeal} 
            onEditMeal={(meal) => {
              // For now, just re-open the dialog and let it handle existing data
              console.log("Edit meal:", meal);
            }} 
          />
        </TabsContent>
      </Tabs>

      {/* Add Meal Dialog */}
      <AddMealDialog 
        isOpen={isAddMealOpen} 
        onClose={() => {
          setIsAddMealOpen(false);
          // After adding a meal, switch to weekly view
          setActiveTab("weekly");
        }} 
      />
    </div>
  );
};

export default NutritionTracker;
