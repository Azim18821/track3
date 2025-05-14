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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, ChevronRight, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SetData {
  reps: number;
  weight: number;
  completed: boolean;
}

interface Exercise {
  id?: number;
  name: string;
  sets: number;
  reps?: number;
  weight?: number;
  unit?: string;
  setsData?: SetData[];
}

interface ExerciseHistory {
  id: number;
  date: string;
  workoutId: number;
  workoutName: string;
  sets: SetData[];
  completed: boolean;
}

interface ExerciseHistoryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentExercise: Exercise | null;
  nextExercise: Exercise | null;
  onStartNextExercise: () => void;
}

const ExerciseHistoryPopup: React.FC<ExerciseHistoryPopupProps> = ({
  isOpen,
  onClose,
  currentExercise,
  nextExercise,
  onStartNextExercise,
}) => {
  const { toast } = useToast();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(currentExercise);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<ExerciseHistory[]>([]);
  const [activeTab, setActiveTab] = useState('current');

  // Load exercise history when the component mounts or selectedExercise changes
  useEffect(() => {
    if (!selectedExercise) return;
    
    const fetchExerciseHistory = async () => {
      setIsLoading(true);
      
      try {
        const response = await fetch(`/api/exercise-history/${encodeURIComponent(selectedExercise.name)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch exercise history');
        }
        
        const data = await response.json();
        setHistory(data);
      } catch (error) {
        console.error('Error fetching exercise history:', error);
        toast({
          title: 'Error',
          description: 'Failed to load exercise history. You can continue your workout.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExerciseHistory();
  }, [selectedExercise, toast]);

  // Find the most recent weight/reps to recommend
  const getRecommendedValues = () => {
    if (!history.length) return null;
    
    // Get most recent workout that was completed
    const mostRecentCompleted = history.find(item => item.completed);
    
    if (!mostRecentCompleted || !mostRecentCompleted.sets.length) return null;
    
    // Calculate max weight from sets
    const maxWeight = Math.max(...mostRecentCompleted.sets.map(set => set.weight || 0));
    // Get average reps
    const totalReps = mostRecentCompleted.sets.reduce((sum, set) => sum + (set.reps || 0), 0);
    const avgReps = Math.round(totalReps / mostRecentCompleted.sets.length);
    
    return {
      weight: maxWeight,
      reps: avgReps,
      date: format(new Date(mostRecentCompleted.date), 'MMM d, yyyy')
    };
  };

  const recommendedValues = getRecommendedValues();

  // Personal records calculation
  const getPersonalRecords = () => {
    if (!history.length) return null;
    
    let maxWeight = 0;
    let maxReps = 0;
    let maxVolumeSet = 0;
    let maxVolumeWorkout = 0;
    
    history.forEach(workout => {
      if (!workout.sets || !workout.sets.length) return;
      
      // Max weight in any set
      const workoutMaxWeight = Math.max(...workout.sets.map(set => set.weight || 0));
      maxWeight = Math.max(maxWeight, workoutMaxWeight);
      
      // Max reps in any set
      const workoutMaxReps = Math.max(...workout.sets.map(set => set.reps || 0));
      maxReps = Math.max(maxReps, workoutMaxReps);
      
      // Max volume for a single set (weight * reps)
      let workoutMaxVolumeSet = 0;
      let workoutTotalVolume = 0;
      
      workout.sets.forEach(set => {
        const setVolume = (set.weight || 0) * (set.reps || 0);
        workoutMaxVolumeSet = Math.max(workoutMaxVolumeSet, setVolume);
        workoutTotalVolume += setVolume;
      });
      
      maxVolumeSet = Math.max(maxVolumeSet, workoutMaxVolumeSet);
      maxVolumeWorkout = Math.max(maxVolumeWorkout, workoutTotalVolume);
    });
    
    return {
      maxWeight,
      maxReps,
      maxVolumeSet,
      maxVolumeWorkout
    };
  };

  const personalRecords = getPersonalRecords();

  // Toggle between current and next exercise
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'current') {
      setSelectedExercise(currentExercise);
    } else if (value === 'next' && nextExercise) {
      setSelectedExercise(nextExercise);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Exercise History</span>
            {nextExercise && (
              <Tabs value={activeTab} onValueChange={handleTabChange} className="mr-2">
                <TabsList>
                  <TabsTrigger value="current">Current</TabsTrigger>
                  <TabsTrigger value="next">Next</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </DialogTitle>
          <DialogDescription>
            {selectedExercise && (
              <>Your history for <span className="font-semibold">{selectedExercise.name}</span></>
            )}
          </DialogDescription>
        </DialogHeader>

        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
              <span>Loading history...</span>
            </div>
          ) : (
            <>
              {recommendedValues && (
                <div className="bg-primary/10 p-4 rounded-lg mb-4">
                  <h3 className="font-medium mb-2 flex items-center">
                    <Award className="h-4 w-4 mr-2 text-primary" />
                    Recommended for Today
                  </h3>
                  <div className="text-sm">
                    <p>Based on your last workout on {recommendedValues.date}</p>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-muted-foreground">Weight</p>
                        <p className="font-semibold">{recommendedValues.weight} kg</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reps</p>
                        <p className="font-semibold">{recommendedValues.reps}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {personalRecords && (
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <h3 className="font-medium mb-2">Personal Records</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Max Weight</p>
                      <p className="font-medium">{personalRecords.maxWeight} kg</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Reps (Single Set)</p>
                      <p className="font-medium">{personalRecords.maxReps}</p>
                    </div>
                  </div>
                </div>
              )}

              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No history found for this exercise.</p>
                  <p className="text-sm mt-1">This might be your first time doing it!</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[300px] border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">Date</TableHead>
                        <TableHead>Sets / Reps / Weight</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.slice(0, 5).map((item) => (
                        <TableRow key={`${item.workoutId}-${item.date}`}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(item.date), 'MMM d, yyyy')}
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
                                <span className="text-muted-foreground text-sm">No set data</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between">
          {nextExercise && activeTab === 'current' ? (
            <Button 
              onClick={() => {
                setActiveTab('next');
                setSelectedExercise(nextExercise);
              }}
              variant="secondary"
              className="flex items-center"
            >
              View Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <span /> // Empty span for alignment
          )}
          
          <div>
            {activeTab === 'next' ? (
              <Button onClick={onStartNextExercise} className="ml-2">
                Start Next Exercise
              </Button>
            ) : (
              <Button onClick={onClose} className="ml-2">
                Continue Workout
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExerciseHistoryPopup;