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
  Clock,
  Trophy,
  RotateCw
} from 'lucide-react';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
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
        
        // Filter out any entries that might be from today's workout session
        // This ensures we're only showing previous workout history, not the current one
        const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
        const filteredHistory = data.filter((item: ExerciseHistory) => {
          const itemDate = new Date(item.date).toISOString().split('T')[0];
          return itemDate !== today;
        });
        
        setHistory(filteredHistory);
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
    let maxWeightReps = 0;
    let maxReps = 0;
    let maxRepsWeight = 0;
    let maxVolumeSet = 0;
    let maxVolumeWorkout = 0;
    
    history.forEach(workout => {
      if (!workout.sets || !workout.sets.length) return;
      
      // Check each set for records
      workout.sets.forEach(set => {
        const weight = set.weight || 0;
        const reps = set.reps || 0;
        const setVolume = weight * reps;
        
        // Track max weight record (and its reps)
        if (weight > maxWeight) {
          maxWeight = weight;
          maxWeightReps = reps;
        }
        
        // Track max reps record (and its weight)
        if (reps > maxReps) {
          maxReps = reps;
          maxRepsWeight = weight;
        }
        
        // Track max volume for a single set
        maxVolumeSet = Math.max(maxVolumeSet, setVolume);
      });
      
      // Calculate total workout volume
      let workoutTotalVolume = 0;
      workout.sets.forEach(set => {
        workoutTotalVolume += (set.weight || 0) * (set.reps || 0);
      });
      
      // Track max volume for entire workout
      maxVolumeWorkout = Math.max(maxVolumeWorkout, workoutTotalVolume);
    });
    
    return {
      maxWeight,
      maxWeightReps,
      maxReps,
      maxRepsWeight,
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col overflow-hidden border-0 shadow-lg">
        <DialogHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-t-lg">
          <DialogTitle className="flex justify-between items-center gap-2 text-white">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-white" />
              <span className="font-bold">Exercise History</span>
            </div>
            {nextExercise && (
              <Tabs value={activeTab} onValueChange={handleTabChange} className="mr-0">
                <TabsList className="grid grid-cols-2 h-7 bg-white/20">
                  <TabsTrigger value="current" className="text-xs px-3 data-[state=active]:bg-white/30 data-[state=active]:text-white text-white/80">Current</TabsTrigger>
                  <TabsTrigger value="next" className="text-xs px-3 data-[state=active]:bg-white/30 data-[state=active]:text-white text-white/80">Next</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </DialogTitle>
          <DialogDescription className="text-white/90 mt-1 text-sm">
            {selectedExercise && (
              <div className="flex items-center gap-1">
                <span>Data for</span> 
                <Badge variant="secondary" className="font-medium bg-white/30 text-white hover:bg-white/40 border-0">
                  {selectedExercise.name}
                </Badge>
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2 text-primary" />
              <span>Loading history...</span>
            </div>
          ) : (
            <div className="space-y-4 px-1">
              {/* Compact Recommended values card */}
              {recommendedValues && (
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800/30 mx-3 mb-4 shadow-sm overflow-hidden">
                  <div className="border-b border-blue-200 dark:border-blue-800/30 bg-blue-100/50 dark:bg-blue-900/30 px-3 py-2 flex items-center">
                    <div className="bg-blue-500 text-white p-1 rounded-full mr-2">
                      <Trophy className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                      Today's Recommended Values
                    </p>
                  </div>
                  <CardContent className="py-2 px-3">
                    <p className="text-xs text-blue-700 dark:text-blue-400 mb-2 flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      Based on {recommendedValues.date}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white dark:bg-blue-900/20 rounded p-2 shadow-sm">
                        <p className="text-xs text-blue-700 dark:text-blue-400 font-medium flex items-center">
                          <Dumbbell className="h-3 w-3 mr-1" />
                          Weight
                        </p>
                        <p className="font-semibold text-blue-900 dark:text-blue-200">{recommendedValues.weight} kg</p>
                      </div>
                      <div className="bg-white dark:bg-blue-900/20 rounded p-2 shadow-sm">
                        <p className="text-xs text-blue-700 dark:text-blue-400 font-medium flex items-center">
                          <RotateCw className="h-3 w-3 mr-1" />
                          Reps
                        </p>
                        <p className="font-semibold text-blue-900 dark:text-blue-200">{recommendedValues.reps}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Compact Personal records card */}
              {personalRecords && (
                <Card className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800/30 mx-3 mb-4 shadow-sm overflow-hidden">
                  <div className="border-b border-amber-200 dark:border-amber-800/30 bg-amber-100/50 dark:bg-amber-900/30 px-3 py-2 flex items-center">
                    <div className="bg-amber-500 text-white p-1 rounded-full mr-2">
                      <Award className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                      Personal Records
                    </p>
                  </div>
                  <CardContent className="py-2 px-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white dark:bg-amber-900/20 rounded p-2 shadow-sm">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center">
                          <Dumbbell className="h-3 w-3 mr-1" />
                          Max Weight
                        </p>
                        <p className="font-medium text-xs text-amber-900 dark:text-amber-200">{personalRecords.maxWeight} kg × {personalRecords.maxWeightReps} reps</p>
                      </div>
                      <div className="bg-white dark:bg-amber-900/20 rounded p-2 shadow-sm">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center">
                          <RotateCw className="h-3 w-3 mr-1" />
                          Max Reps
                        </p>
                        <p className="font-medium text-xs text-amber-900 dark:text-amber-200">{personalRecords.maxReps} reps × {personalRecords.maxRepsWeight} kg</p>
                      </div>
                      <div className="bg-white dark:bg-amber-900/20 rounded p-2 shadow-sm">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Best Set
                        </p>
                        <p className="font-medium text-xs text-amber-900 dark:text-amber-200">{personalRecords.maxVolumeSet} kg</p>
                      </div>
                      <div className="bg-white dark:bg-amber-900/20 rounded p-2 shadow-sm">
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-center">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Best Workout
                        </p>
                        <p className="font-medium text-xs text-amber-900 dark:text-amber-200">{personalRecords.maxVolumeWorkout} kg</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* History table with enhanced styling */}
              <Card className="mx-3 border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 flex items-center">
                  <div className="bg-blue-500 text-white p-1 rounded-full mr-2">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Recent History
                  </p>
                </div>
                <CardContent className="py-3 px-3">
                  
                  {history.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <p>No history found for this exercise.</p>
                      <p className="text-xs mt-1">This might be your first time doing it!</p>
                    </div>
                  ) : (
                    <div className="border rounded-md border-border">
                      <div className="overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow>
                              <TableHead className="w-24 py-2">Date</TableHead>
                              <TableHead className="py-2">Performance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* Always show the most recent workout */}
                            {history.slice(0, 1).map((item) => (
                              <TableRow key={`${item.workoutId}-${item.date}`} className="hover:bg-muted/20">
                                <TableCell className="py-2 text-xs">
                                  <div className="font-medium">
                                    {format(new Date(item.date), 'MMM d')}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {format(new Date(item.date), 'yyyy')}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2">
                                  <div className="space-y-1.5">
                                    {item.sets && item.sets.length > 0 ? (
                                      item.sets.map((set, index) => (
                                        <div key={index} className="flex items-center text-sm">
                                          <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center mr-2 text-xs font-normal bg-background">
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
                      
                      {/* Previous workouts in collapsible section */}
                      {history.length > 1 && (
                        <details className="group">
                          <summary className="flex items-center justify-center py-2 px-4 cursor-pointer text-sm font-medium bg-muted/20 hover:bg-muted/40 border-t border-border">
                            <span>Show Previous Workouts</span>
                            <svg 
                              className="w-4 h-4 ml-1.5 transition-transform group-open:rotate-180" 
                              xmlns="http://www.w3.org/2000/svg" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </summary>
                          
                          <div className="overflow-hidden">
                            <Table>
                              <TableBody>
                                {history.slice(1).map((item) => (
                                  <TableRow key={`${item.workoutId}-${item.date}`} className="hover:bg-muted/20 border-t border-border">
                                    <TableCell className="py-2 text-xs">
                                      <div className="font-medium">
                                        {format(new Date(item.date), 'MMM d')}
                                      </div>
                                      <div className="text-muted-foreground">
                                        {format(new Date(item.date), 'yyyy')}
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-2">
                                      <div className="space-y-1.5">
                                        {item.sets && item.sets.length > 0 ? (
                                          item.sets.map((set, index) => (
                                            <div key={index} className="flex items-center text-sm">
                                              <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center mr-2 text-xs font-normal bg-background">
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
                        </details>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-4 p-4 border-t">
          {nextExercise && activeTab === 'current' ? (
            <Button 
              onClick={() => {
                setActiveTab('next');
                setSelectedExercise(nextExercise);
              }}
              variant="outline"
              className="w-full sm:w-auto justify-start sm:justify-center border-gray-300 dark:border-gray-600"
            >
              <SkipForward className="h-4 w-4 mr-1.5" />
              View Next Exercise 
            </Button>
          ) : (
            <div className="hidden sm:block"></div>
          )}
          
          <div className="w-full sm:w-auto flex">
            {activeTab === 'next' ? (
              <Button 
                onClick={onStartNextExercise} 
                className="w-full sm:w-auto flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Dumbbell className="h-4 w-4 mr-1.5" />
                Start Next Exercise
              </Button>
            ) : (
              <Button 
                onClick={onClose} 
                className="w-full sm:w-auto flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
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