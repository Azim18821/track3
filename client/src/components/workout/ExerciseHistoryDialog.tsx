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
import { Loader2, CalendarDays, Info } from 'lucide-react';
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

  // Calculate personal records
  const personalRecords = React.useMemo(() => {
    if (!exerciseHistory.length) return null;

    let maxWeight = 0;
    let maxVolumePerSet = 0;
    let maxVolume = 0;
    let volumeWorkoutDate = '';
    let weightWorkoutDate = '';

    exerciseHistory.forEach(workout => {
      if (!workout.sets || !workout.sets.length) return;

      // Find max weight in any set
      const workoutMaxWeight = Math.max(...workout.sets.map(set => set.weight || 0));
      if (workoutMaxWeight > maxWeight) {
        maxWeight = workoutMaxWeight;
        weightWorkoutDate = workout.date;
      }

      // Calculate volume (weight * reps) for this workout
      let workoutVolume = 0;
      let maxSetVolume = 0;
      
      workout.sets.forEach(set => {
        const setVolume = (set.weight || 0) * (set.reps || 0);
        workoutVolume += setVolume;
        maxSetVolume = Math.max(maxSetVolume, setVolume);
      });

      if (maxSetVolume > maxVolumePerSet) {
        maxVolumePerSet = maxSetVolume;
      }

      if (workoutVolume > maxVolume) {
        maxVolume = workoutVolume;
        volumeWorkoutDate = workout.date;
      }
    });

    return {
      maxWeight,
      maxVolumePerSet,
      maxVolume,
      volumeWorkoutDate,
      weightWorkoutDate,
    };
  }, [exerciseHistory]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{exerciseName} History</DialogTitle>
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
          <>
            {/* Personal records section */}
            {personalRecords && (
              <div className="bg-muted/50 p-4 rounded-lg mb-4">
                <h3 className="font-medium mb-2">Personal Records</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Max Weight</p>
                    <p className="font-medium">{personalRecords.maxWeight} kg</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(personalRecords.weightWorkoutDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max Volume (Single Workout)</p>
                    <p className="font-medium">{personalRecords.maxVolume} kg</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(personalRecords.volumeWorkoutDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Exercise history table */}
            <div className="overflow-y-auto max-h-[400px] rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Date</TableHead>
                    <TableHead className="w-40">Workout</TableHead>
                    <TableHead>Sets / Reps / Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exerciseHistory.map((item) => (
                    <TableRow key={`${item.id}-${item.date}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <CalendarDays className="h-3 w-3 mr-1 text-muted-foreground" />
                          {format(new Date(item.date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="truncate">{item.workoutName}</span>
                          {item.completed && (
                            <span className="text-xs text-green-600">Completed</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
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
          </>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseHistoryDialog;