import React from "react";
import { format } from "date-fns";
import { Check, Dumbbell, Clock, Calendar, Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Exercise, Workout } from "@/types/workout";

interface SetData {
  reps: number;
  weight: number;
  completed: boolean;
}

interface WorkoutDetailDialogProps {
  workout: Workout | null;
  isOpen: boolean;
  onClose: () => void;
  onStartWorkout?: (workout: Workout) => void;
  isTrainerView?: boolean;
}

const WorkoutDetailDialog: React.FC<WorkoutDetailDialogProps> = ({
  workout,
  isOpen,
  onClose,
  onStartWorkout,
  isTrainerView = false,
}) => {
  if (!workout) return null;

  // Format the date properly
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch (error) {
      return dateString;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-[600px] md:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            <Dumbbell className="mr-2 h-5 w-5 text-primary" />
            {workout.name}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap gap-3 pt-2">
            <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal">
              <Calendar className="h-3 w-3" />
              {formatDate(workout.date)}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-xs font-normal">
              <Clock className="h-3 w-3" />
              {workout.duration} minutes
            </Badge>
            {workout.completed && (
              <Badge className="bg-green-600 text-white flex items-center gap-1">
                <Check className="h-3 w-3" />
                Completed
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <h3 className="text-lg font-semibold mb-2">Exercises</h3>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exercise</TableHead>
                  <TableHead className="w-16 text-right">Sets</TableHead>
                  <TableHead className="w-16 text-right">Reps</TableHead>
                  <TableHead className="w-24 text-right">Weight</TableHead>
                  {isTrainerView && <TableHead className="w-16 text-right">Rest</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {workout.exercises?.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">{exercise.name}</TableCell>
                    <TableCell className="text-right">{exercise.sets}</TableCell>
                    <TableCell className="text-right">{exercise.reps}</TableCell>
                    <TableCell className="text-right">
                      {exercise.weight ? `${exercise.weight} ${exercise.unit || 'kg'}` : 'Bodyweight'}
                    </TableCell>
                    {isTrainerView && <TableCell className="text-right">{exercise.rest || '60s'}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {workout.exercises?.some(ex => ex.setsData && ex.setsData.length > 0) && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Detailed Sets Information</h3>
              <div className="space-y-4">
                {workout.exercises
                  .filter(ex => ex.setsData && ex.setsData.length > 0)
                  .map((exercise) => (
                    <div key={`${exercise.id}-details`} className="border rounded-md p-3">
                      <h4 className="font-medium mb-2">{exercise.name}</h4>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="font-medium text-sm">Set</div>
                        <div className="font-medium text-sm text-right">Reps</div>
                        <div className="font-medium text-sm text-right">Weight</div>
                        <div className="font-medium text-sm text-right">Status</div>
                        
                        {exercise.setsData?.map((set, index) => (
                          <React.Fragment key={`set-${index}`}>
                            <div className="text-sm">{index + 1}</div>
                            <div className="text-sm text-right">{set.reps}</div>
                            <div className="text-sm text-right">{set.weight} {exercise.unit || 'kg'}</div>
                            <div className="text-sm text-right">
                              {set.completed ? (
                                <span className="text-green-600 flex items-center justify-end">
                                  <Check className="h-4 w-4" />
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Pending</span>
                              )}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {workout.notes && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <div className="bg-muted/30 p-3 rounded-md text-sm whitespace-pre-wrap">
                {workout.notes}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          {onStartWorkout && !workout.completed && !isTrainerView && (
            <Button 
              onClick={() => onStartWorkout(workout)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="mr-2 h-4 w-4" />
              Start Workout
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutDetailDialog;