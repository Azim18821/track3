import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dumbbell, Calendar, ChevronRight } from "lucide-react";
import { format } from "date-fns";

// Import from centralized types
import { Exercise, Workout } from "@/types/workout";

interface ExerciseHistoryCardProps {
  workouts: Workout[];
  onExerciseClick?: (exerciseName: string) => void;
}

const ExerciseHistoryCard: React.FC<ExerciseHistoryCardProps> = ({ 
  workouts = [], 
  onExerciseClick 
}) => {
  // Process workouts to get the last weight used for each exercise
  const exerciseHistory = useMemo(() => {
    const history: Record<string, { lastWeight: number; lastDate: string; unit: string; count: number }> = {};
    
    // Process each workout to find the most recent entry for each exercise
    workouts.forEach(workout => {
      if (!workout.exercises) return;
      
      workout.exercises.forEach((exercise: Exercise) => {
        if (!exercise.name) return;
        
        const workoutDate = new Date(workout.date);
        const existingExercise = history[exercise.name];
        
        // Only update if this is more recent than the previously recorded exercise
        // or if this is the first time we're seeing this exercise
        if (!existingExercise || new Date(existingExercise.lastDate) < workoutDate) {
          history[exercise.name] = {
            lastWeight: exercise.weight || 0,
            lastDate: workout.date,
            unit: exercise.unit || 'kg',
            count: existingExercise ? existingExercise.count + 1 : 1
          };
        } else if (existingExercise) {
          // Just increment the count if we've seen this exercise before
          history[exercise.name].count++;
        }
      });
    });
    
    return history;
  }, [workouts]);
  
  // Convert to array and sort by most recently used
  const sortedExercises = useMemo(() => {
    return Object.entries(exerciseHistory)
      .map(([name, data]) => ({
        name,
        ...data
      }))
      .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime())
      .slice(0, 10); // Just show the 10 most recent exercises
  }, [exerciseHistory]);
  
  if (sortedExercises.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Dumbbell className="mr-2 h-5 w-5 text-primary" />
            Recent Exercises
          </CardTitle>
          <CardDescription>
            Track your progress with recently used exercises
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-muted-foreground">No exercise history found. Start logging workouts to see your progress!</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center">
          <Dumbbell className="mr-2 h-5 w-5 text-primary" />
          Recent Exercises
        </CardTitle>
        <CardDescription>
          Track your progress with recently used exercises
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-3">
          {sortedExercises.map((exercise) => (
            <div 
              key={exercise.name}
              className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onExerciseClick && onExerciseClick(exercise.name)}
            >
              <div className="flex flex-col">
                <div className="font-medium">{exercise.name}</div>
                <div className="text-sm text-muted-foreground flex items-center">
                  <Calendar className="h-3 w-3 mr-1 inline" />
                  {format(new Date(exercise.lastDate), "MMM d, yyyy")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-medium bg-primary/5 text-primary">
                  {exercise.lastWeight} {exercise.unit}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ExerciseHistoryCard;