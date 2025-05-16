import React, { useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  CalendarDays, 
  Info, 
  TrendingUp,
  Trophy,
  CheckCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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

export interface ChartDataItem {
  date: string;
  fullDate: string;
  maxWeight: number;
  avgWeight: number;
  volume: number;
  sets: number;
}

const ExerciseHistoryDialog: React.FC<ExerciseHistoryDialogProps> = ({
  exerciseName,
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();

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

  // Calculate personal records only - chart data calculation moved to ExerciseProgress
  const personalRecords = React.useMemo(() => {
    if (!exerciseHistory.length) return null;

    let maxWeight = 0;
    let maxWeightReps = 0;
    let maxReps = 0;
    let maxRepsWeight = 0;
    let maxVolumePerSet = 0;
    let maxVolume = 0;
    let volumeWorkoutDate = '';
    let weightWorkoutDate = '';
    let repsWorkoutDate = '';

    // Process each workout to find personal records
    exerciseHistory.forEach(workout => {
      if (!workout.sets || !workout.sets.length) return;
      
      // Process each set to find personal records
      workout.sets.forEach(set => {
        const weight = set.weight || 0;
        const reps = set.reps || 0;
        const setVolume = weight * reps;
        
        // Track max weight record with associated reps
        if (weight > maxWeight) {
          maxWeight = weight;
          maxWeightReps = reps;
          weightWorkoutDate = workout.date;
        }
        
        // Track max reps record with associated weight
        if (reps > maxReps) {
          maxReps = reps;
          maxRepsWeight = weight;
          repsWorkoutDate = workout.date;
        }
        
        // Track max volume per set
        if (setVolume > maxVolumePerSet) {
          maxVolumePerSet = setVolume;
        }
      });
      
      // Calculate total workout volume
      let workoutVolume = 0;
      workout.sets.forEach(set => {
        workoutVolume += (set.weight || 0) * (set.reps || 0);
      });
      
      // Track max volume per workout
      if (workoutVolume > maxVolume) {
        maxVolume = workoutVolume;
        volumeWorkoutDate = workout.date;
      }
    });

    return {
      maxWeight,
      maxWeightReps,
      maxReps,
      maxRepsWeight,
      maxVolumePerSet,
      maxVolume,
      volumeWorkoutDate,
      weightWorkoutDate,
      repsWorkoutDate
    };
  }, [exerciseHistory]);

  // Sort history by date (newest first) for display
  const sortedHistory = React.useMemo(() => {
    return [...exerciseHistory].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [exerciseHistory]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg flex flex-col p-0 h-[85vh] max-h-screen overflow-hidden">
        <div className="p-6 pb-2">
          <DialogHeader className="pb-0">
            <DialogTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {exerciseName} History
            </DialogTitle>
            <DialogDescription>
              Your workout history for {exerciseName}
            </DialogDescription>
          </DialogHeader>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading exercise history...</span>
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-muted-foreground flex-1">
            <Info className="h-10 w-10 text-destructive mx-auto mb-2" />
            <p>Could not load exercise history data.</p>
            <p className="text-sm mt-1">Please try again later.</p>
          </div>
        ) : sortedHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground flex-1">
            <p>No history found for this exercise.</p>
          </div>
        ) : (
          <div className="flex-1 px-6 overflow-y-auto">
            {/* Personal records section */}
            {personalRecords && (
              <Card className="mb-4 shadow-sm">
                <CardContent className="pt-4">
                  <h3 className="font-medium mb-2 flex items-center gap-1.5">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    Personal Records
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Max Weight</p>
                      <p className="font-medium">{personalRecords.maxWeight} kg × {personalRecords.maxWeightReps} reps</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(personalRecords.weightWorkoutDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Max Reps</p>
                      <p className="font-medium">{personalRecords.maxReps} reps × {personalRecords.maxRepsWeight} kg</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(personalRecords.repsWorkoutDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Max Volume (Set)</p>
                      <p className="font-medium">{personalRecords.maxVolumePerSet} kg</p>
                      <p className="text-xs text-muted-foreground">weight × reps in single set</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Max Volume (Workout)</p>
                      <p className="font-medium">{personalRecords.maxVolume} kg</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(personalRecords.volumeWorkoutDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exercise history in card-based vertical layout - more mobile friendly */}
            <div className="space-y-3 pb-2">
              {sortedHistory.map((item) => (
                <Card key={`${item.id}-${item.date}`} className="shadow-sm">
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                      <div className="flex items-center text-sm font-medium">
                        <CalendarDays className="h-4 w-4 mr-1.5 text-muted-foreground" />
                        {format(new Date(item.date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.workoutName}
                        {item.completed && (
                          <span className="ml-2 inline-flex items-center text-xs text-green-600 dark:text-green-400">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <h4 className="text-xs uppercase text-muted-foreground mb-2">Sets</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {item.sets && item.sets.length > 0 ? (
                          item.sets.map((set, index) => (
                            <div key={index} className="text-sm bg-muted/30 p-2 rounded">
                              <div className="flex justify-between text-xs text-muted-foreground mb-0.5">
                                <span>Set {index + 1}</span>
                                {set.completed && <span>✓</span>}
                              </div>
                              <div className="font-medium">
                                {set.reps} reps × {set.weight} kg
                              </div>
                            </div>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No set data</span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 mt-2 border-t shrink-0">
          <Button onClick={onClose} className="ml-auto block">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseHistoryDialog;