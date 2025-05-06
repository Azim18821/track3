import { Card, CardContent } from "@/components/ui/card";
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

interface ExerciseProgressProps {
  workouts: any[];
}

const ExerciseProgress: React.FC<ExerciseProgressProps> = ({ workouts = [] }) => {
  // Process data for chart
  const chartData = processWorkoutsForProgressChart(workouts);

  return (
    <Card className="mb-6">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Exercise Progress</h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">Track your improvements over time for key exercises.</p>
      </div>
      <CardContent className="pt-0">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Bench Press" 
                stroke="#f97316" 
                activeDot={{ r: 8 }} 
              />
              <Line 
                type="monotone" 
                dataKey="Squat" 
                stroke="#0d9488" 
              />
              <Line 
                type="monotone" 
                dataKey="Deadlift" 
                stroke="#3b82f6" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to process workout data for the progress chart
function processWorkoutsForProgressChart(workouts: any[]) {
  // Key exercises to track
  const trackedExercises = ["Bench Press", "Squat", "Deadlift"];
  
  // If no workouts, return demo data
  if (!workouts.length) {
    return [
      { date: "Jan", "Bench Press": 155, "Squat": 185, "Deadlift": 210 },
      { date: "Feb", "Bench Press": 160, "Squat": 195, "Deadlift": 220 },
      { date: "Mar", "Bench Press": 165, "Squat": 200, "Deadlift": 230 },
      { date: "Apr", "Bench Press": 170, "Squat": 210, "Deadlift": 240 },
      { date: "May", "Bench Press": 175, "Squat": 215, "Deadlift": 250 },
      { date: "Jun", "Bench Press": 185, "Squat": 225, "Deadlift": 260 },
    ];
  }
  
  // Group workouts by month for the chart
  const exerciseByMonth: Record<string, Record<string, number>> = {};
  
  // Process each workout
  workouts.forEach(workout => {
    if (!workout.exercises) return;
    
    const date = new Date(workout.date);
    const monthKey = date.toLocaleString('default', { month: 'short' });
    
    if (!exerciseByMonth[monthKey]) {
      exerciseByMonth[monthKey] = {};
    }
    
    workout.exercises.forEach((exercise: any) => {
      if (trackedExercises.includes(exercise.name) && exercise.weight) {
        // Only update if this is a heavier weight than previously recorded
        if (!exerciseByMonth[monthKey][exercise.name] || 
            exercise.weight > exerciseByMonth[monthKey][exercise.name]) {
          exerciseByMonth[monthKey][exercise.name] = exercise.weight;
        }
      }
    });
  });
  
  // Convert to chart data format
  return Object.keys(exerciseByMonth).map(month => {
    return {
      date: month,
      ...exerciseByMonth[month]
    };
  });
}

export default ExerciseProgress;
