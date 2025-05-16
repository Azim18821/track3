import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { 
  ListChecks, 
  LineChart as LineChartIcon, 
  BarChart as BarChartIcon,
  ChevronDown,
  ChevronUp,
  PlusCircle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ChartDataItem } from "./ExerciseHistoryDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ExerciseProgressProps {
  workouts: any[];
}

interface ExerciseData {
  name: string;
  history: ChartDataItem[];
}

interface ExerciseHistoryItem {
  id: number;
  date: string;
  workoutName: string;
  sets: {
    reps: number;
    weight: number;
    completed: boolean;
  }[];
  completed: boolean;
}

const ExerciseProgress: React.FC<ExerciseProgressProps> = ({ workouts = [] }) => {
  const { toast } = useToast();
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [chartType, setChartType] = useState<string>("weight");
  const [exerciseList, setExerciseList] = useState<string[]>([]);
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  
  // Extract exercise list from workouts
  useEffect(() => {
    if (!workouts.length) return;
    
    const exercises = new Set<string>();
    workouts.forEach(workout => {
      if (workout.exercises) {
        workout.exercises.forEach((exercise: any) => {
          if (exercise.name) exercises.add(exercise.name);
        });
      }
    });
    
    const exerciseArray = Array.from(exercises).sort();
    setExerciseList(exerciseArray);
    
    // Select the first exercise by default if none is selected
    if (exerciseArray.length && !selectedExercise) {
      setSelectedExercise(exerciseArray[0]);
    }
  }, [workouts, selectedExercise]);
  
  // Fetch exercise history for the selected exercise
  const { data: exerciseHistory = [], isLoading } = useQuery<Array<ExerciseHistoryItem>>({
    queryKey: [`/api/exercise-history/${encodeURIComponent(selectedExercise)}`, selectedExercise],
    enabled: !!selectedExercise,
    retry: 1,
    staleTime: 60000
  });
  
  // Handle errors in the data fetching process
  useEffect(() => {
    if (!isLoading && Array.isArray(exerciseHistory) && exerciseHistory.length === 0 && selectedExercise) {
      toast({
        title: "No history data",
        description: "No workout history found for this exercise.",
        variant: "default",
      });
    }
  }, [isLoading, exerciseHistory, selectedExercise, toast]);
  
  // Process exercise history into chart data
  useEffect(() => {
    if (!Array.isArray(exerciseHistory) || exerciseHistory.length === 0) {
      setChartData([]);
      return;
    }
    
    // Sort history by date (oldest first) for chart data
    const sortedHistory = [...exerciseHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Prepare chart data
    const formattedData = sortedHistory.map(workout => {
      if (!workout.sets || !workout.sets.length) {
        return {
          date: format(new Date(workout.date), 'MMM d'),
          fullDate: workout.date,
          maxWeight: 0,
          avgWeight: 0,
          volume: 0,
          sets: 0
        };
      }
      
      // Calculate metrics for this workout
      const weights = workout.sets.map((set: any) => set.weight || 0);
      const reps = workout.sets.map((set: any) => set.reps || 0);
      
      const workoutMaxWeight = Math.max(...weights);
      const workoutMaxReps = Math.max(...reps);
      const workoutAvgWeight = weights.reduce((sum: number, w: number) => sum + w, 0) / weights.length;
      
      let workoutVolume = 0;
      workout.sets.forEach((set: any) => {
        workoutVolume += (set.weight || 0) * (set.reps || 0);
      });
      
      // Return formatted data for the chart
      return {
        date: format(new Date(workout.date), 'MMM d'),
        fullDate: workout.date,
        maxWeight: workoutMaxWeight,
        avgWeight: parseFloat(workoutAvgWeight.toFixed(1)),
        volume: workoutVolume,
        sets: workout.sets.length
      };
    });
    
    setChartData(formattedData);
  }, [exerciseHistory]);
  
  // Popular exercises to highlight in summary
  const popularExercises = ["Bench Press", "Squat", "Deadlift"];
  
  // Process data for summary chart
  const summaryChartData = React.useMemo(() => {
    // Key exercises to track
    const trackedExercises = popularExercises;
    
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
  }, [workouts]);

  // Determine which chart to show based on selection
  const renderSelectedChart = () => {
    if (!selectedExercise || !chartData.length) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          {isLoading ? "Loading exercise data..." : "No history data available for this exercise."}
        </div>
      );
    }

    if (chartType === "weight") {
      return (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip
                formatter={(value: any, name: any) => {
                  if (name === "Max Weight" || name === "Avg Weight") {
                    return [`${value} kg`, name];
                  }
                  return [value, name];
                }}
                labelFormatter={(date) => {
                  const item = chartData.find(d => d.date === date);
                  return item?.fullDate ? format(new Date(item.fullDate), 'MMM d, yyyy') : String(date);
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="maxWeight"
                name="Max Weight"
                stroke="#1E40AF"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 8 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgWeight"
                name="Avg Weight"
                stroke="#60A5FA"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    } else if (chartType === "volume") {
      return (
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                label={{ value: 'Volume (kg)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
              />
              <Tooltip
                formatter={(value: any) => [`${value} kg`, 'Total Volume']}
                labelFormatter={(date) => {
                  const item = chartData.find(d => d.date === date);
                  return item?.fullDate ? format(new Date(item.fullDate), 'MMM d, yyyy') : String(date);
                }}
              />
              <Legend />
              <Bar
                dataKey="volume"
                name="Total Volume"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    return null;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center">
          <LineChartIcon className="h-5 w-5 mr-2 text-primary" />
          Exercise Progress
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track your improvements over time for specific exercises
        </p>
      </CardHeader>
      
      <CardContent>
        {/* Exercise selection dropdown */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Select value={selectedExercise} onValueChange={setSelectedExercise}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Select an exercise" />
            </SelectTrigger>
            <SelectContent>
              {exerciseList.map(exercise => (
                <SelectItem key={exercise} value={exercise}>
                  {exercise}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Tabs value={chartType} onValueChange={setChartType} className="w-full flex-1">
            <TabsList className="grid w-full sm:w-[200px] grid-cols-2">
              <TabsTrigger value="weight" className="flex items-center gap-1">
                <LineChartIcon className="h-3.5 w-3.5" />
                <span>Weight</span>
              </TabsTrigger>
              <TabsTrigger value="volume" className="flex items-center gap-1">
                <BarChartIcon className="h-3.5 w-3.5" />
                <span>Volume</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Exercise-specific chart */}
        <div className="mt-2 border rounded-md p-3">
          {renderSelectedChart()}
        </div>
        
        {/* Summary chart showing key exercises */}
        <div className="mt-6">
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <ListChecks className="h-4 w-4 mr-1.5 text-primary" />
            Key Exercise Summary
          </h4>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summaryChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', style: { fontSize: '11px' } }} />
                <Tooltip formatter={(value: any) => `${value} kg`} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="Bench Press" 
                  stroke="#f97316" 
                  activeDot={{ r: 8 }} 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="Squat" 
                  stroke="#0d9488" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="Deadlift" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExerciseProgress;
