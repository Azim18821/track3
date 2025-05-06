import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const WorkoutChart = () => {
  // Fetch workout data
  const { data: workouts = [] } = useQuery<any[]>({
    queryKey: ['/api/workouts'],
  });

  // Process data for chart
  const processedData = processWorkoutsForChart(workouts as any[]);

  return (
    <Card className="overflow-hidden dark:bg-gray-800 dark:border-gray-700">
      <div className="p-4 sm:p-5">
        <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">Workout Progress</h3>
        <div className="mt-2 h-56 sm:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={processedData}
              margin={{
                top: 5,
                right: 10,
                left: 5,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12, fill: 'currentColor' }}
                tickMargin={5}
                stroke="rgba(128, 128, 128, 0.2)"
              />
              <YAxis 
                label={{ 
                  value: 'Weight (kg)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { fontSize: '12px', textAnchor: 'middle', fill: 'currentColor' },
                  dx: -10
                }} 
                tick={{ fontSize: 12, fill: 'currentColor' }}
                tickMargin={5}
                width={35}
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
              <Bar dataKey="Bench Press" fill="#f97316" />
              <Bar dataKey="Squat" fill="#0d9488" />
              <Bar dataKey="Deadlift" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

// Helper function to process workout data for the chart
function processWorkoutsForChart(workouts: any[]) {
  // Extract exercises with time data for visualization
  const trackedExercises = ["Bench Press", "Squat", "Deadlift"];
  const exerciseData: Record<string, any> = {};
  
  // Group by week
  const weekData: Record<string, any> = {
    "Week 1": {},
    "Week 2": {},
    "Week 3": {},
    "Week 4": {},
  };
  
  // Add some demo data if we don't have real data yet
  if (!workouts.length) {
    return [
      { period: "Week 1", "Bench Press": 75, "Squat": 95, "Deadlift": 105 },
      { period: "Week 2", "Bench Press": 80, "Squat": 97, "Deadlift": 110 },
      { period: "Week 3", "Bench Press": 82, "Squat": 100, "Deadlift": 115 },
      { period: "Week 4", "Bench Press": 85, "Squat": 102, "Deadlift": 120 },
    ];
  }
  
  // Process actual workout data
  workouts.forEach(workout => {
    if (!workout.exercises) return;
    
    workout.exercises.forEach((exercise: any) => {
      if (trackedExercises.includes(exercise.name)) {
        // TODO: Group by week or month depending on data volume
        // For now, just collect max weight for each exercise
        if (!exerciseData[exercise.name] || exercise.weight > exerciseData[exercise.name]) {
          exerciseData[exercise.name] = exercise.weight;
        }
      }
    });
  });
  
  // Convert to chart format
  return Object.keys(weekData).map(week => {
    const dataPoint: any = { period: week };
    
    trackedExercises.forEach(exerciseName => {
      // Simulate increasing weights across weeks for demo
      const baseWeight = exerciseData[exerciseName] || {
        "Bench Press": 75, 
        "Squat": 95, 
        "Deadlift": 105
      }[exerciseName];
      
      const weekIndex = parseInt(week.split(' ')[1]) - 1;
      dataPoint[exerciseName] = baseWeight + (weekIndex * 2.5);
    });
    
    return dataPoint;
  });
}

export default WorkoutChart;
