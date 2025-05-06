import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface NutritionSummaryProps {
  dailyTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  goals: {
    caloriesTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
  };
}

const NutritionSummary: React.FC<NutritionSummaryProps> = ({
  dailyTotals,
  goals
}) => {
  // Calculate percentages for progress bars
  const caloriesPercent = Math.min(100, (dailyTotals.calories / goals.caloriesTarget) * 100);
  const proteinPercent = Math.min(100, (dailyTotals.protein / goals.proteinTarget) * 100);
  const carbsPercent = Math.min(100, (dailyTotals.carbs / goals.carbsTarget) * 100);
  const fatPercent = Math.min(100, (dailyTotals.fat / goals.fatTarget) * 100);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Today's Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <dl>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Calories</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
              <div className="flex items-center">
                <span className="font-medium mr-4">
                  {Math.round(dailyTotals.calories)} / {goals.caloriesTarget}
                </span>
                <div className="flex-1">
                  <Progress value={caloriesPercent} className="bg-gray-200 dark:bg-gray-700 h-2" />
                </div>
              </div>
            </dd>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Protein</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
              <div className="flex items-center">
                <span className="font-medium mr-4">
                  {Math.round(dailyTotals.protein)}g / {goals.proteinTarget}g
                </span>
                <div className="flex-1">
                  <Progress value={proteinPercent} className="bg-gray-200 dark:bg-gray-700 h-2" style={{ '--progress-color': 'var(--secondary-600)' } as React.CSSProperties} />
                </div>
              </div>
            </dd>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Carbs</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
              <div className="flex items-center">
                <span className="font-medium mr-4">
                  {Math.round(dailyTotals.carbs)}g / {goals.carbsTarget}g
                </span>
                <div className="flex-1">
                  <Progress value={carbsPercent} className="bg-gray-200 dark:bg-gray-700 h-2" style={{ '--progress-color': 'var(--yellow-500)' } as React.CSSProperties} />
                </div>
              </div>
            </dd>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 bg-white dark:bg-gray-800 px-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Fat</dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2">
              <div className="flex items-center">
                <span className="font-medium mr-4">
                  {Math.round(dailyTotals.fat)}g / {goals.fatTarget}g
                </span>
                <div className="flex-1">
                  <Progress value={fatPercent} className="bg-gray-200 dark:bg-gray-700 h-2" style={{ '--progress-color': 'var(--red-500)' } as React.CSSProperties} />
                </div>
              </div>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
};

export default NutritionSummary;
