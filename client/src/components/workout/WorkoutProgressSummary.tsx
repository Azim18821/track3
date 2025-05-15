import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, ArrowLeft, Clock, BarChart, Dumbbell, Medal } from "lucide-react";

interface SetData {
  reps?: number | null;
  weight?: number | null;
  completed: boolean;
  setType?: string;
  targetRPE?: number;
  tempo?: string;
  notes?: string;
}

interface Exercise {
  id?: number;
  name: string;
  sets: number;
  reps?: number;
  weight?: number;
  unit?: string;
  setsData?: Array<{
    reps?: number | null;
    weight?: number | null;
    completed: boolean;
  }>;
}

interface Workout {
  id: number;
  name: string;
  exercises: Exercise[];
  date: string;
  duration: number;
  completed?: boolean;
  isPlanMode?: boolean;
}

interface WorkoutProgressSummaryProps {
  workout: Workout;
  elapsedTime: number;
  onComplete: () => void;
  onExit: () => void;
}

export default function WorkoutProgressSummary({
  workout,
  elapsedTime,
  onComplete,
  onExit,
}: WorkoutProgressSummaryProps) {
  // Format elapsed time as HH:MM:SS
  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours > 0 ? `${hours}:` : ""}${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };
  
  // Calculate completion stats
  const calculateStats = () => {
    let totalSets = 0;
    let completedSets = 0;
    let totalReps = 0;
    let totalWeight = 0;
    
    workout.exercises.forEach(exercise => {
      if (!exercise.setsData) return;
      
      totalSets += exercise.sets;
      
      exercise.setsData.forEach(set => {
        if (set.completed) {
          completedSets++;
          if (set.reps) totalReps += set.reps;
          if (set.weight && set.reps) totalWeight += set.weight * set.reps;
        }
      });
    });
    
    return {
      completionRate: totalSets > 0 ? (completedSets / totalSets) * 100 : 0,
      totalSets,
      completedSets,
      totalReps,
      totalWeight,
      duration: elapsedTime,
    };
  };
  
  const stats = calculateStats();
  
  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onExit} className="p-0 h-9 w-9">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Workout Summary</h1>
        <div className="w-9"></div> {/* For alignment */}
      </div>
      
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Congratulations!</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">
              You've completed <span className="font-bold">{workout.name}</span>
            </p>
            <p className="text-muted-foreground mt-1">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart className="h-5 w-5 text-primary" />
              Workout Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Duration</span>
                </div>
                <p className="text-2xl font-mono">{formatDuration(stats.duration)}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Weight</span>
                </div>
                <p className="text-2xl font-mono">{stats.totalWeight.toLocaleString()}kg</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Medal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Reps</span>
                </div>
                <p className="text-2xl font-mono">{stats.totalReps}</p>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Sets Completed</span>
                </div>
                <p className="text-2xl font-mono">{stats.completedSets}/{stats.totalSets}</p>
              </div>
            </div>
            
            <div className="mt-6 mb-2">
              <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
                <span>Completion Rate</span>
                <span>{Math.round(stats.completionRate)}%</span>
              </div>
              <Progress value={stats.completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Exercise Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workout.exercises.map((exercise, index) => {
                const completed = exercise.setsData 
                  ? exercise.setsData.filter(set => set.completed).length 
                  : 0;
                const total = exercise.sets;
                const completionRate = (completed / total) * 100;
                
                return (
                  <div key={index} className="border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{exercise.name}</span>
                      <Badge variant={completionRate === 100 ? "secondary" : "outline"} className={completionRate === 100 ? "bg-green-500 hover:bg-green-500/80 text-white" : ""}>
                        {completed}/{total} sets
                      </Badge>
                    </div>
                    <Progress value={completionRate} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        <Button onClick={onComplete} className="w-full" size="lg">
          Finish Workout
        </Button>
      </div>
    </div>
  );
}