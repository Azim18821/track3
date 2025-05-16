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
import { 
  Loader2, 
  ChevronRight, 
  Award, 
  Dumbbell, 
  BarChart3, 
  Calendar, 
  TrendingUp,
  SkipForward,
  Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface SetData {
  reps?: number | null;
  weight?: number | null;
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              <span>Exercise History</span>
            </div>
            {nextExercise && (
              <Tabs value={activeTab} onValueChange={handleTabChange} className="mr-0">
                <TabsList className="grid grid-cols-2 h-8">
                  <TabsTrigger value="current" className="text-xs px-3">Current</TabsTrigger>
                  <TabsTrigger value="next" className="text-xs px-3">Next</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1">
            {selectedExercise && (
              <>
                <span>Your performance data for</span> 
                <Badge variant="secondary" className="font-medium">
                  {selectedExercise.name}
                </Badge>
              </>
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
            <div className="space-y-4">
              {/* Recommended values card */}
              {recommendedValues && (
                <Card className="border-blue-100 bg-blue-50">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="hidden sm:flex bg-blue-100 p-2 rounded-full">
                      <Award className="h-6 w-6 text-blue-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-800 flex items-center">
                        <Award className="h-4 w-4 mr-1.5 sm:hidden text-blue-700" />
                        Today's Recommended Values
                      </h3>
                      <p className="text-xs text-blue-700 mt-0.5 mb-2">
                        Based on your last workout on {recommendedValues.date}
                      </p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/60 rounded p-2">
                          <p className="text-xs text-blue-600">Weight</p>
                          <p className="font-semibold text-blue-900">{recommendedValues.weight} kg</p>
                        </div>
                        <div className="bg-white/60 rounded p-2">
                          <p className="text-xs text-blue-600">Reps</p>
                          <p className="font-semibold text-blue-900">{recommendedValues.reps}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Personal records card */}
              {personalRecords && (
                <Card className="border-amber-100 bg-amber-50">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium text-amber-800 flex items-center mb-3">
                      <TrendingUp className="h-4 w-4 mr-1.5 text-amber-600" />
                      Personal Records
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/60 rounded p-2">
                        <p className="text-xs text-amber-600">Max Weight</p>
                        <p className="font-medium text-amber-900">{personalRecords.maxWeight} kg</p>
                      </div>
                      <div className="bg-white/60 rounded p-2">
                        <p className="text-xs text-amber-600">Max Reps</p>
                        <p className="font-medium text-amber-900">{personalRecords.maxReps}</p>
                      </div>
                      <div className="bg-white/60 rounded p-2">
                        <p className="text-xs text-amber-600">Best Set Volume</p>
                        <p className="font-medium text-amber-900">{personalRecords.maxVolumeSet}</p>
                      </div>
                      <div className="bg-white/60 rounded p-2">
                        <p className="text-xs text-amber-600">Best Workout Volume</p>
                        <p className="font-medium text-amber-900">{personalRecords.maxVolumeWorkout}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* History table */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium flex items-center mb-3">
                    <Calendar className="h-4 w-4 mr-1.5 text-slate-600" />
                    Recent History
                  </h3>
                  
                  {history.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No history found for this exercise.</p>
                      <p className="text-xs mt-1">This might be your first time doing it!</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border rounded-md">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead className="w-24 py-2">Date</TableHead>
                            <TableHead className="py-2">Performance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.slice(0, 5).map((item) => (
                            <TableRow key={`${item.workoutId}-${item.date}`} className="hover:bg-slate-50">
                              <TableCell className="py-2 text-xs">
                                <div className="font-medium">
                                  {format(new Date(item.date), 'MMM d')}
                                </div>
                                <div className="text-slate-500">
                                  {format(new Date(item.date), 'yyyy')}
                                </div>
                              </TableCell>
                              <TableCell className="py-2">
                                <div className="space-y-1.5">
                                  {item.sets && item.sets.length > 0 ? (
                                    item.sets.map((set, index) => (
                                      <div key={index} className="flex items-center text-sm">
                                        <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center mr-2 text-xs font-normal">
                                          {index + 1}
                                        </Badge>
                                        <span className="font-medium">
                                          {set.reps} × {set.weight} kg
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
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-4">
          {nextExercise && activeTab === 'current' ? (
            <Button 
              onClick={() => {
                setActiveTab('next');
                setSelectedExercise(nextExercise);
              }}
              variant="outline"
              className="w-full sm:w-auto justify-start sm:justify-center"
            >
              <SkipForward className="h-4 w-4 mr-1.5" />
              View Next Exercise 
            </Button>
          ) : (
            <div className="hidden sm:block" /> // Empty div for alignment on larger screens
          )}
          
          <div className="w-full sm:w-auto flex">
            {activeTab === 'next' ? (
              <Button 
                onClick={onStartNextExercise} 
                className="w-full sm:w-auto flex items-center justify-center"
              >
                <Dumbbell className="h-4 w-4 mr-1.5" />
                Start Next Exercise
              </Button>
            ) : (
              <Button 
                onClick={onClose} 
                className="w-full sm:w-auto flex items-center justify-center"
              >
                <Clock className="h-4 w-4 mr-1.5" />
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