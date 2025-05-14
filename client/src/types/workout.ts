// Define interfaces for workout-related types used throughout the app

export interface Exercise {
  id?: number;
  workoutId?: number;
  name: string;
  sets: number;
  reps: number;
  weight?: number | null;
  unit?: string;
  rest?: string;
  notes?: string;
  completedSets?: number[];
  setsData?: Array<{ reps: number; weight: number; completed: boolean }>;
}

export interface Workout {
  id: number;
  userId?: number;
  name: string;
  date: string;
  duration: number;
  notes?: string;
  completed?: boolean;
  isCompleted?: boolean;
  exercises: Exercise[];
}