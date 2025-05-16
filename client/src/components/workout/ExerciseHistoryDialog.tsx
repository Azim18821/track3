import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  CalendarDays, 
  Info, 
  BarChart, 
  LineChart as LineChartIcon,
  ChevronDown,
  TrendingUp,
  Trophy
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ExerciseHistoryDialogProps {
  exerciseName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface SetData {
  reps: number;
  weight: number;
  completed: boolean;
}

interface ExerciseHistoryItem {
  id: number;
  date: string;
  workoutName: string;
  sets: SetData[];
  completed: boolean;
}

const ExerciseHistoryDialog: React.FC<ExerciseHistoryDialogProps> = ({
  exerciseName,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("graph");

  // Fetch exercise history data when dialog opens
  const {
    data: exerciseHistory = [],
    isLoading,
    error,
    isError,
  } = useQuery<ExerciseHistoryItem[]>({
    queryKey: [`/api/exercise-history/${encodeURIComponent(exerciseName)}`, exerciseName],
    enabled: isOpen && !!exerciseName,
    refetchOnWindowFocus: false,
  });

  // Show error toast if fetch fails
  useEffect(() => {
    if (isError && error) {
      toast({
        title: 'Error fetching exercise history',
        description: 'Could not load your workout history for this exercise.',
        variant: 'destructive',
      });
    }
  }, [isError, error, toast]);

  // Calculate personal records and prepare chart data
  const { personalRecords, chartData } = React.useMemo(() => {
    if (!exerciseHistory.length) return { personalRecords: null, chartData: [] };

    let maxWeight = 0;
    let maxReps = 0;
    let maxVolumePerSet = 0;
    let maxVolume = 0;
    let volumeWorkoutDate = '';
    let weightWorkoutDate = '';
    let repsWorkoutDate = '';

    // Sort history by date (oldest first) for chart data
    const sortedHistory = [...exerciseHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Prepare chart data
    const chartData = sortedHistory.map(workout => {
      if (!workout.sets || !workout.sets.length) {
        return {
          date: format(new Date(workout.date), 'MMM d'),
          maxWeight: 0,
          avgWeight: 0,
          volume: 0
        };
      }

      // Calculate metrics for this workout
      const weights = workout.sets.map(set => set.weight || 0);
      const reps = workout.sets.map(set => set.reps || 0);
      
      const workoutMaxWeight = Math.max(...weights);
      const workoutMaxReps = Math.max(...reps);
      const workoutAvgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
      
      let workoutVolume = 0;
      let maxSetVolume = 0;
      
      workout.sets.forEach(set => {
        const setVolume = (set.weight || 0) * (set.reps || 0);
        workoutVolume += setVolume;
        maxSetVolume = Math.max(maxSetVolume, setVolume);
      });

      // Update overall records
      if (workoutMaxWeight > maxWeight) {
        maxWeight = workoutMaxWeight;
        weightWorkoutDate = workout.date;
      }
      
      if (workoutMaxReps > maxReps) {
        maxReps = workoutMaxReps;
        repsWorkoutDate = workout.date;
      }

      if (maxSetVolume > maxVolumePerSet) {
        maxVolumePerSet = maxSetVolume;
      }

      if (workoutVolume > maxVolume) {
        maxVolume = workoutVolume;
        volumeWorkoutDate = workout.date;
      }

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

    return {
      personalRecords: {
        maxWeight,
        maxReps,
        maxVolumePerSet,
        maxVolume,
        volumeWorkoutDate,
        weightWorkoutDate,
        repsWorkoutDate
      },
      chartData
    };
  }, [exerciseHistory]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            {exerciseName} Progress
          </DialogTitle>
          <DialogDescription>
            Track your progress for {exerciseName} over time
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading exercise history...</span>
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-muted-foreground">
            <Info className="h-10 w-10 text-destructive mx-auto mb-2" />
            <p>Could not load exercise history data.</p>
            <p className="text-sm mt-1">Please try again later.</p>
          </div>
        ) : exerciseHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No history found for this exercise.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Personal records section */}
            {personalRecords && (
              <div className="bg-muted/20 p-4 rounded-lg mb-4">
                <h3 className="font-medium mb-2 flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Personal Records
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Max Weight</p>
                    <p className="font-medium">{personalRecords.maxWeight} kg</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(personalRecords.weightWorkoutDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Max Reps</p>
                    <p className="font-medium">{personalRecords.maxReps}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(personalRecords.repsWorkoutDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Max Volume (Set)</p>
                    <p className="font-medium">{personalRecords.maxVolumePerSet} kg</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Max Volume (Workout)</p>
                    <p className="font-medium">{personalRecords.maxVolume} kg</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(personalRecords.volumeWorkoutDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabs for graph and history */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto mb-4">
                <TabsTrigger value="graph" className="flex items-center gap-1">
                  <LineChartIcon className="h-4 w-4" />
                  <span>Progress Graph</span>
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  <span>History</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="graph" className="flex-1 mt-0 overflow-hidden">
                <div className="rounded-md border p-1 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{
                        top: 20,
                        right: 20,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        tickMargin={10}
                      />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                      <RechartsTooltip
                        formatter={(value, name) => {
                          if (name === "Max Weight" || name === "Avg Weight") {
                            return [`${value} kg`, name];
                          }
                          if (name === "Volume") {
                            return [`${value} kg total`, name];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(date) => {
                          const item = chartData.find(d => d.date === date);
                          return item ? format(new Date(item.fullDate), 'MMM d, yyyy') : date;
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
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="volume"
                        name="Volume"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="flex-1 mt-0 overflow-y-auto">
                <div className="rounded border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[100px]">Date</TableHead>
                        <TableHead className="w-[120px]">Workout</TableHead>
                        <TableHead>Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exerciseHistory.map((item) => (
                        <TableRow key={`${item.id}-${item.date}`}>
                          <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex items-center">
                              <CalendarDays className="h-3 w-3 mr-1 text-muted-foreground" />
                              {format(new Date(item.date), 'MMM d, yyyy')}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="truncate max-w-[100px]">{item.workoutName}</span>
                              {item.completed && (
                                <span className="text-xs text-green-600 dark:text-green-500">Completed</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5">
                              {item.sets && item.sets.length > 0 ? (
                                item.sets.map((set, index) => (
                                  <div key={index} className="flex items-center text-sm">
                                    <span className="w-12 text-muted-foreground">Set {index + 1}:</span>
                                    <span className="font-medium">
                                      {set.reps} reps × {set.weight} kg
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">No set data available</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseHistoryDialog;