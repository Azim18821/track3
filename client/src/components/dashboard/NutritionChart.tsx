import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const NutritionChart = () => {
  // Get data for the last 7 days
  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, 6 - i);
    return format(date, "yyyy-MM-dd");
  });

  // Fetch nutrition data for each day
  const { data: mealsData = [] } = useQuery<any[]>({
    queryKey: ['/api/nutrition/meals'],
  });

  // Process data for chart
  const chartData = dates.map(dateStr => {
    const day = format(new Date(dateStr), "EEE");
    const date = new Date(dateStr);
    
    // Find meals for this date
    const dayMeals = mealsData.filter((meal: any) => {
      if (!meal.date) return false;
      const mealDate = new Date(meal.date);
      return (
        mealDate.getFullYear() === date.getFullYear() &&
        mealDate.getMonth() === date.getMonth() &&
        mealDate.getDate() === date.getDate()
      );
    });
    
    // Sum up nutrition values
    const calories = dayMeals.reduce((sum: number, meal: any) => sum + meal.calories, 0);
    const protein = dayMeals.reduce((sum: number, meal: any) => sum + meal.protein, 0);
    
    return {
      day,
      date: dateStr,
      calories,
      protein
    };
  });

  return (
    <Card className="overflow-hidden dark:bg-gray-800 dark:border-gray-700">
      <div className="p-4 sm:p-5">
        <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Nutrition Trends</h3>
        <div className="mt-2 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData}
              margin={{
                top: 5,
                right: 5,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12, fill: 'currentColor' }}
                tickMargin={5}
                stroke="rgba(128, 128, 128, 0.2)"
              />
              <YAxis 
                yAxisId="left" 
                tick={{ fontSize: 12, fill: 'currentColor' }}
                tickMargin={5}
                width={30}
                stroke="rgba(128, 128, 128, 0.2)"
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tick={{ fontSize: 12, fill: 'currentColor' }}
                tickMargin={5}
                width={30}
                stroke="rgba(128, 128, 128, 0.2)"
              />
              <Tooltip 
                contentStyle={{ 
                  fontSize: '12px', 
                  backgroundColor: 'var(--background)', 
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
                itemStyle={{ padding: '2px 0' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '5px', color: 'currentColor' }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="calories"
                stroke="#0d9488"
                fill="#0d9488"
                name="Calories"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="protein"
                stroke="#3b82f6"
                fill="#3b82f6"
                name="Protein (g)"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

export default NutritionChart;
