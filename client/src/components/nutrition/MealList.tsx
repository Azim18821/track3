import { useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import AddMealDialog from "./AddMealDialog";

interface MealListProps {
  meals: any[];
  isLoading: boolean;
  onDeleteMeal: (id: number) => void;
  onEditMeal: (meal: any) => void;
}

const MealList: React.FC<MealListProps> = ({
  meals = [],
  isLoading,
  onDeleteMeal,
  onEditMeal
}) => {
  const [mealFilter, setMealFilter] = useState("all");
  const [editingMeal, setEditingMeal] = useState<any>(null);

  // Filter meals by type if filter is set
  const filteredMeals = mealFilter === "all" 
    ? meals 
    : meals.filter(meal => meal.mealType === mealFilter);

  const handleEditMeal = (meal: any) => {
    setEditingMeal(meal);
  };

  const handleCloseEditDialog = () => {
    setEditingMeal(null);
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader className="flex justify-between items-center">
          <CardTitle>Today's Meals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-700 dark:text-gray-300">Loading meals...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mt-6">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Today's Meals</CardTitle>
          <Select value={mealFilter} onValueChange={setMealFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Meals" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Meals</SelectItem>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snacks</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {filteredMeals.length === 0 ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              No meals recorded yet. Add a meal to get started.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMeals.map((meal) => (
                <li key={meal.id} className="py-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                    <div>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{meal.mealType}</div>
                        <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-300">
                          {format(new Date(meal.date), "h:mm a")}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="text-sm text-gray-500 dark:text-gray-400">{meal.name}</div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                            {Math.round(meal.calories)} cal
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-100 dark:bg-secondary-900/60 text-secondary-800 dark:text-secondary-300">
                            {parseFloat(meal.protein).toFixed(1)}g protein
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300">
                            {parseFloat(meal.carbs).toFixed(1)}g carbs
                          </span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300">
                            {parseFloat(meal.fat).toFixed(1)}g fat
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditMeal(meal)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDeleteMeal(meal.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Edit meal dialog */}
      {editingMeal && (
        <AddMealDialog 
          isOpen={!!editingMeal} 
          onClose={handleCloseEditDialog}
          initialData={editingMeal}
        />
      )}
    </>
  );
};

export default MealList;
