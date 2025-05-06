import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Dumbbell, Clock, CalendarDays } from 'lucide-react';

// For mapping workout days
const dayMap: { [key: string]: string } = {
  'monday': 'Monday',
  'tuesday': 'Tuesday',
  'wednesday': 'Wednesday',
  'thursday': 'Thursday',
  'friday': 'Friday',
  'saturday': 'Saturday',
  'sunday': 'Sunday'
};

interface Exercise {
  name: string;
  sets: number;
  reps: string | number;
  rest?: string;
  weight?: string;
  notes?: string;
  category?: string;
}

interface WorkoutDay {
  day: string;
  exercises: Exercise[];
  duration?: number;
  targetMuscles?: string[];
  name?: string;
  warmup?: string;
  cooldown?: string;
}

interface WorkoutPlanViewProps {
  workoutPlan: {
    days: WorkoutDay[];
    notes?: string;
    restDays?: string[];
    schedule?: { [key: string]: string };
  };
  className?: string;
}

export default function WorkoutPlanView({ workoutPlan, className }: WorkoutPlanViewProps) {
  // Filter to only include days that have exercises
  const activeDays = workoutPlan.days.filter(day => day.exercises && day.exercises.length > 0);
  
  return (
    <div className={cn("space-y-6", className)}>
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Dumbbell className="h-6 w-6 text-primary" />
        Weekly Workout Plan
      </h2>
      
      <Tabs defaultValue={activeDays[0]?.day || "monday"} className="w-full">
        <TabsList className="mb-4 flex flex-wrap h-auto">
          {activeDays.map((day) => (
            <TabsTrigger 
              key={day.day} 
              value={day.day}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {dayMap[day.day.toLowerCase()] || day.day}
              {day.name && (
                <span className="ml-1 text-xs opacity-70">({day.name})</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {activeDays.map((day) => (
          <TabsContent 
            key={day.day} 
            value={day.day}
            className="space-y-4"
          >
            <div className="flex flex-wrap gap-2 items-center">
              {day.targetMuscles && day.targetMuscles.length > 0 && (
                <div className="flex flex-wrap gap-1 items-center">
                  <span className="text-sm font-medium text-muted-foreground">Target Areas:</span>
                  {day.targetMuscles.map((muscle, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {muscle}
                    </Badge>
                  ))}
                </div>
              )}
              
              {day.duration && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
                  <Clock className="h-3 w-3" />
                  <span>{day.duration} minutes</span>
                </div>
              )}
            </div>
            
            {day.warmup && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Warm-up</CardTitle>
                </CardHeader>
                <CardContent className="py-2 text-sm">
                  <p>{day.warmup}</p>
                </CardContent>
              </Card>
            )}
            
            <div className="grid gap-4">
              {day.exercises.map((exercise, index) => (
                <Card key={index}>
                  <CardHeader className="py-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base font-semibold">{exercise.name}</CardTitle>
                      {exercise.category && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {exercise.category}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Sets</p>
                      <p className="font-medium">{exercise.sets}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Reps</p>
                      <p className="font-medium">{exercise.reps}</p>
                    </div>
                    {exercise.weight && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Weight</p>
                        <p className="font-medium">{exercise.weight}</p>
                      </div>
                    )}
                    {exercise.rest && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Rest</p>
                        <p className="font-medium">{exercise.rest}</p>
                      </div>
                    )}
                    {exercise.notes && (
                      <div className="col-span-3 mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Notes</p>
                        <p className="text-sm">{exercise.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {day.cooldown && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Cool-down</CardTitle>
                </CardHeader>
                <CardContent className="py-2 text-sm">
                  <p>{day.cooldown}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
      
      {workoutPlan.notes && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Weekly Training Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 text-sm">
            <p>{workoutPlan.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}