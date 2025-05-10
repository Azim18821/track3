import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Loader2, ArrowLeft, Save, Dumbbell, Utensils, AlertTriangle,
  Plus, Trash2, ClipboardList, LayoutGrid, ListChecks, HelpCircle,
  Calendar, Copy, ChevronRight, Coffee, Settings, X, RefreshCw, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; 
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import TrainerNavbar from '@/components/TrainerNavbar';
import TrainerPageHeader from '@/components/TrainerPageHeader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Types for form schema
interface SetVariation {
  reps: number;
  weight: number;
  completed?: boolean;
  setType?: string;  // regular, drop, super, circuit, etc.
  targetRPE?: number; // Rate of Perceived Exertion (1-10)
  tempo?: string;    // e.g., "3-1-3" for eccentric-pause-concentric timing
  distance?: number; // For cardio/distance-based exercises
  duration?: number; // For timed sets
  restAfter?: number; // Rest time after this specific set (in seconds)
  notes?: string;    // Notes specific to this set
}

interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
  unit?: string;
  rest?: string;
  // Enhanced with set variations support
  setsData?: SetVariation[];
  setType?: string;   // Default set type if not specified per set
  supersetWith?: string; // For supersets, name of exercise to superset with
  useAdvancedSets?: boolean; // Flag to indicate if this exercise uses advanced set configuration
}

interface WorkoutDay {
  name: string;
  exercises: Exercise[];
  notes?: string;
}

interface MealItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
}

interface CustomMeal extends MealItem {
  type: string; // breakfast, lunch, dinner, snack, or custom types like "pre-workout", "post-workout", etc.
  order: number; // For ordering meals in a day (breakfast=1, lunch=2, etc.)
}

interface DailyMeal {
  // Core meals
  breakfast: MealItem;
  lunch: MealItem;
  dinner: MealItem;
  snacks: MealItem[];
  // Support for custom meals
  customMeals?: CustomMeal[];
}

// This ErrorDisplay component was moved down to line ~574

// Form schema
const fitnessPlanSchema = z.object({
  clientId: z.string().transform(val => parseInt(val, 10)),
  name: z.string().min(3, { message: 'Plan name must be at least 3 characters' }),
  description: z.string().optional(),
  workoutNotes: z.string().optional(),
  mealNotes: z.string().optional(),
  goal: z.string(),
  durationWeeks: z.string().transform(val => parseInt(val, 10)),
  level: z.string(),
  days: z.array(z.object({
    day: z.string(),
    enabled: z.boolean().default(true),
    name: z.string(),
    exercises: z.array(z.object({
      name: z.string().min(1, "Exercise name is required"),
      sets: z.number().min(1, "Sets must be at least 1"),
      reps: z.number().min(1, "Reps must be at least 1"),
      weight: z.number().optional(),
      unit: z.string().optional(),
      rest: z.string().optional(),
      // Enhanced with set variations support
      setsData: z.array(z.object({
        reps: z.number(),
        weight: z.number(),
        completed: z.boolean().optional(),
        setType: z.string().optional(),
        targetRPE: z.number().optional(),
        tempo: z.string().optional(),
        distance: z.number().optional(),
        duration: z.number().optional(),
        restAfter: z.number().optional(),
        notes: z.string().optional()
      })).optional(),
      setType: z.string().optional(),
      supersetWith: z.string().optional(),
      useAdvancedSets: z.boolean().optional().default(false),
    })),
    notes: z.string().optional(),
  })),
  dailyMeals: z.object({
    breakfast: z.object({
      name: z.string().min(1, "Meal name is required"),
      calories: z.number().min(0, "Calories must be a positive number"),
      protein: z.number().min(0, "Protein must be a positive number"),
      carbs: z.number().min(0, "Carbs must be a positive number"),
      fat: z.number().min(0, "Fat must be a positive number"),
      servingSize: z.number().min(0, "Serving size must be a positive number"),
      servingUnit: z.string(),
    }),
    lunch: z.object({
      name: z.string().min(1, "Meal name is required"),
      calories: z.number().min(0, "Calories must be a positive number"),
      protein: z.number().min(0, "Protein must be a positive number"),
      carbs: z.number().min(0, "Carbs must be a positive number"),
      fat: z.number().min(0, "Fat must be a positive number"),
      servingSize: z.number().min(0, "Serving size must be a positive number"),
      servingUnit: z.string(),
    }),
    dinner: z.object({
      name: z.string().min(1, "Meal name is required"),
      calories: z.number().min(0, "Calories must be a positive number"),
      protein: z.number().min(0, "Protein must be a positive number"),
      carbs: z.number().min(0, "Carbs must be a positive number"),
      fat: z.number().min(0, "Fat must be a positive number"),
      servingSize: z.number().min(0, "Serving size must be a positive number"),
      servingUnit: z.string(),
    }),
    snacks: z.array(z.object({
      name: z.string().min(1, "Snack name is required"),
      calories: z.number().min(0, "Calories must be a positive number"),
      protein: z.number().min(0, "Protein must be a positive number"),
      carbs: z.number().min(0, "Carbs must be a positive number"),
      fat: z.number().min(0, "Fat must be a positive number"),
      servingSize: z.number().min(0, "Serving size must be a positive number"),
      servingUnit: z.string(),
    })),
    // Support for custom meals with specific types and order
    customMeals: z.array(z.object({
      name: z.string().min(1, "Meal name is required"),
      calories: z.number().min(0, "Calories must be a positive number"),
      protein: z.number().min(0, "Protein must be a positive number"),
      carbs: z.number().min(0, "Carbs must be a positive number"),
      fat: z.number().min(0, "Fat must be a positive number"),
      servingSize: z.number().min(0, "Serving size must be a positive number"),
      servingUnit: z.string(),
      type: z.string().min(1, "Meal type is required"),
      order: z.number().min(1, "Order must be a positive number"),
    })).optional().default([]),
  }),
  calculateNutritionGoals: z.boolean().default(true),
});

type FitnessPlanFormValues = z.infer<typeof fitnessPlanSchema>;

// Exercise template data
const exerciseTemplates = {
  beginner: {
    chest: [
      { name: "Push-Ups", sets: 3, reps: 10, weight: 0, unit: "bodyweight", rest: "60 sec" },
      { name: "Bench Press", sets: 3, reps: 8, weight: 20, unit: "kg", rest: "90 sec" },
      { name: "Chest Flyes", sets: 3, reps: 12, weight: 5, unit: "kg", rest: "60 sec" },
    ],
    back: [
      { name: "Assisted Pull-Ups", sets: 3, reps: 8, weight: 0, unit: "bodyweight", rest: "60 sec" },
      { name: "Bent Over Rows", sets: 3, reps: 10, weight: 15, unit: "kg", rest: "90 sec" },
      { name: "Lat Pulldowns", sets: 3, reps: 12, weight: 30, unit: "kg", rest: "60 sec" },
    ],
    legs: [
      { name: "Bodyweight Squats", sets: 3, reps: 15, weight: 0, unit: "bodyweight", rest: "60 sec" },
      { name: "Lunges", sets: 3, reps: 10, weight: 0, unit: "bodyweight", rest: "60 sec" },
      { name: "Leg Press", sets: 3, reps: 12, weight: 40, unit: "kg", rest: "90 sec" },
    ],
    shoulders: [
      { name: "Shoulder Press", sets: 3, reps: 10, weight: 10, unit: "kg", rest: "90 sec" },
      { name: "Lateral Raises", sets: 3, reps: 12, weight: 5, unit: "kg", rest: "60 sec" },
      { name: "Front Raises", sets: 3, reps: 12, weight: 5, unit: "kg", rest: "60 sec" },
    ],
    arms: [
      { name: "Bicep Curls", sets: 3, reps: 12, weight: 8, unit: "kg", rest: "60 sec" },
      { name: "Tricep Extensions", sets: 3, reps: 12, weight: 8, unit: "kg", rest: "60 sec" },
      { name: "Hammer Curls", sets: 3, reps: 12, weight: 8, unit: "kg", rest: "60 sec" },
    ],
    core: [
      { name: "Crunches", sets: 3, reps: 15, weight: 0, unit: "bodyweight", rest: "45 sec" },
      { name: "Plank", sets: 3, reps: 1, weight: 0, unit: "bodyweight", rest: "30 sec" },
      { name: "Russian Twists", sets: 3, reps: 20, weight: 0, unit: "bodyweight", rest: "45 sec" },
    ],
  },
  intermediate: {
    chest: [
      { name: "Bench Press", sets: 4, reps: 8, weight: 40, unit: "kg", rest: "90 sec" },
      { name: "Incline Bench Press", sets: 3, reps: 10, weight: 30, unit: "kg", rest: "90 sec" },
      { name: "Cable Crossovers", sets: 3, reps: 12, weight: 15, unit: "kg", rest: "60 sec" },
    ],
    back: [
      { name: "Pull-Ups", sets: 3, reps: 8, weight: 0, unit: "bodyweight", rest: "90 sec" },
      { name: "Barbell Rows", sets: 4, reps: 8, weight: 30, unit: "kg", rest: "90 sec" },
      { name: "Seated Cable Row", sets: 3, reps: 10, weight: 40, unit: "kg", rest: "90 sec" },
    ],
    legs: [
      { name: "Barbell Squats", sets: 4, reps: 8, weight: 60, unit: "kg", rest: "120 sec" },
      { name: "Romanian Deadlifts", sets: 3, reps: 10, weight: 50, unit: "kg", rest: "90 sec" },
      { name: "Walking Lunges", sets: 3, reps: 12, weight: 10, unit: "kg", rest: "60 sec" },
    ],
    shoulders: [
      { name: "Overhead Press", sets: 4, reps: 8, weight: 25, unit: "kg", rest: "90 sec" },
      { name: "Face Pulls", sets: 3, reps: 15, weight: 20, unit: "kg", rest: "60 sec" },
      { name: "Upright Rows", sets: 3, reps: 12, weight: 15, unit: "kg", rest: "60 sec" },
    ],
    arms: [
      { name: "EZ Bar Curls", sets: 3, reps: 10, weight: 20, unit: "kg", rest: "60 sec" },
      { name: "Skull Crushers", sets: 3, reps: 10, weight: 20, unit: "kg", rest: "60 sec" },
      { name: "Preacher Curls", sets: 3, reps: 10, weight: 15, unit: "kg", rest: "60 sec" },
    ],
    core: [
      { name: "Hanging Leg Raises", sets: 3, reps: 12, weight: 0, unit: "bodyweight", rest: "60 sec" },
      { name: "Weighted Plank", sets: 3, reps: 1, weight: 5, unit: "kg", rest: "45 sec" },
      { name: "Cable Crunches", sets: 3, reps: 15, weight: 25, unit: "kg", rest: "60 sec" },
    ],
  },
  advanced: {
    chest: [
      { name: "Barbell Bench Press", sets: 5, reps: 5, weight: 60, unit: "kg", rest: "120 sec" },
      { name: "Incline Dumbbell Press", sets: 4, reps: 8, weight: 25, unit: "kg", rest: "90 sec" },
      { name: "Weighted Dips", sets: 3, reps: 10, weight: 15, unit: "kg", rest: "90 sec" },
    ],
    back: [
      { name: "Weighted Pull-Ups", sets: 4, reps: 6, weight: 10, unit: "kg", rest: "120 sec" },
      { name: "Deadlifts", sets: 5, reps: 5, weight: 100, unit: "kg", rest: "180 sec" },
      { name: "T-Bar Rows", sets: 4, reps: 8, weight: 50, unit: "kg", rest: "90 sec" },
    ],
    legs: [
      { name: "Back Squats", sets: 5, reps: 5, weight: 100, unit: "kg", rest: "180 sec" },
      { name: "Front Squats", sets: 4, reps: 6, weight: 70, unit: "kg", rest: "120 sec" },
      { name: "Bulgarian Split Squats", sets: 3, reps: 10, weight: 20, unit: "kg", rest: "90 sec" },
    ],
    shoulders: [
      { name: "Push Press", sets: 5, reps: 5, weight: 40, unit: "kg", rest: "120 sec" },
      { name: "Lateral Raises Dropset", sets: 3, reps: 12, weight: 12, unit: "kg", rest: "90 sec" },
      { name: "Barbell Shrugs", sets: 4, reps: 10, weight: 60, unit: "kg", rest: "90 sec" },
    ],
    arms: [
      { name: "Weighted Chin-Ups", sets: 4, reps: 6, weight: 10, unit: "kg", rest: "90 sec" },
      { name: "Close-Grip Bench Press", sets: 4, reps: 8, weight: 50, unit: "kg", rest: "90 sec" },
      { name: "Alternating Hammer Curls", sets: 3, reps: 12, weight: 15, unit: "kg", rest: "60 sec" },
    ],
    core: [
      { name: "Weighted Hanging Leg Raises", sets: 4, reps: 10, weight: 5, unit: "kg", rest: "90 sec" },
      { name: "Ab Wheel Rollouts", sets: 4, reps: 10, weight: 0, unit: "bodyweight", rest: "90 sec" },
      { name: "Dragon Flags", sets: 3, reps: 8, weight: 0, unit: "bodyweight", rest: "90 sec" },
    ],
  },
};

// Meal template data
const mealTemplates = {
  "weight_loss": {
    breakfast: { 
      name: "Greek Yogurt with Berries and Honey", 
      calories: 320, 
      protein: 20, 
      carbs: 40, 
      fat: 8, 
      servingSize: 1, 
      servingUnit: "bowl" 
    },
    lunch: { 
      name: "Grilled Chicken Salad with Olive Oil Dressing", 
      calories: 420, 
      protein: 35, 
      carbs: 15, 
      fat: 25, 
      servingSize: 1, 
      servingUnit: "plate" 
    },
    dinner: { 
      name: "Baked Salmon with Roasted Vegetables", 
      calories: 480, 
      protein: 40, 
      carbs: 20, 
      fat: 25, 
      servingSize: 1, 
      servingUnit: "plate" 
    },
    snacks: [
      { 
        name: "Apple with Almond Butter", 
        calories: 200, 
        protein: 5, 
        carbs: 25, 
        fat: 10, 
        servingSize: 1, 
        servingUnit: "serving" 
      }
    ],
    // Example of custom meals with specific timing or purpose
    customMeals: [
      {
        name: "Pre-Workout Green Tea",
        calories: 5,
        protein: 0,
        carbs: 0,
        fat: 0,
        servingSize: 1,
        servingUnit: "cup",
        type: "pre-workout",
        order: 3 // Between lunch and dinner
      },
      {
        name: "Casein Protein Before Bed",
        calories: 120,
        protein: 25,
        carbs: 3,
        fat: 1,
        servingSize: 1, 
        servingUnit: "scoop",
        type: "evening",
        order: 5 // After dinner, before sleep
      }
    ]
  },
  "muscle_gain": {
    breakfast: { 
      name: "Protein Oatmeal with Banana and Peanut Butter", 
      calories: 550, 
      protein: 30, 
      carbs: 70, 
      fat: 15, 
      servingSize: 1, 
      servingUnit: "bowl" 
    },
    lunch: { 
      name: "Turkey and Brown Rice Bowl with Vegetables", 
      calories: 650, 
      protein: 45, 
      carbs: 70, 
      fat: 20, 
      servingSize: 1, 
      servingUnit: "bowl" 
    },
    dinner: { 
      name: "Steak with Sweet Potato and Broccoli", 
      calories: 700, 
      protein: 50, 
      carbs: 50, 
      fat: 30, 
      servingSize: 1, 
      servingUnit: "plate" 
    },
    snacks: [
      { 
        name: "Protein Shake with Banana", 
        calories: 300, 
        protein: 25, 
        carbs: 30, 
        fat: 5, 
        servingSize: 1, 
        servingUnit: "shake" 
      },
      { 
        name: "Greek Yogurt with Granola", 
        calories: 250, 
        protein: 15, 
        carbs: 30, 
        fat: 8, 
        servingSize: 1, 
        servingUnit: "cup" 
      }
    ],
    // Example of custom meals optimized for muscle gain
    customMeals: [
      {
        name: "Pre-Workout Meal",
        calories: 350,
        protein: 25,
        carbs: 45,
        fat: 5,
        servingSize: 1,
        servingUnit: "serving",
        type: "pre-workout",
        order: 2 // Between breakfast and lunch
      },
      {
        name: "Post-Workout Protein Shake with Creatine",
        calories: 330,
        protein: 40,
        carbs: 30,
        fat: 3,
        servingSize: 1, 
        servingUnit: "shake",
        type: "post-workout",
        order: 4 // After workout, before dinner
      },
      {
        name: "Slow-Digesting Protein Before Bed",
        calories: 180,
        protein: 40,
        carbs: 4,
        fat: 2,
        servingSize: 1, 
        servingUnit: "serving",
        type: "night",
        order: 6 // Before sleep
      }
    ]
  },
  "maintenance": {
    breakfast: { 
      name: "Whole Grain Toast with Eggs and Avocado", 
      calories: 400, 
      protein: 20, 
      carbs: 35, 
      fat: 20, 
      servingSize: 1, 
      servingUnit: "serving" 
    },
    lunch: { 
      name: "Quinoa Bowl with Chickpeas and Vegetables", 
      calories: 500, 
      protein: 25, 
      carbs: 60, 
      fat: 15, 
      servingSize: 1, 
      servingUnit: "bowl" 
    },
    dinner: { 
      name: "Grilled Fish with Brown Rice and Mixed Vegetables", 
      calories: 550, 
      protein: 35, 
      carbs: 50, 
      fat: 20, 
      servingSize: 1, 
      servingUnit: "plate" 
    },
    snacks: [
      { 
        name: "Mixed Nuts and Dried Fruit", 
        calories: 200, 
        protein: 6, 
        carbs: 20, 
        fat: 12, 
        servingSize: 30, 
        servingUnit: "g" 
      }
    ],
    // Example of custom meals for maintenance/lifestyle goals
    customMeals: [
      {
        name: "Afternoon Tea",
        calories: 60,
        protein: 1,
        carbs: 8,
        fat: 2,
        servingSize: 1,
        servingUnit: "cup",
        type: "afternoon",
        order: 3 // Between lunch and dinner
      },
      {
        name: "Bedtime Chamomile Tea",
        calories: 2,
        protein: 0,
        carbs: 0,
        fat: 0,
        servingSize: 1, 
        servingUnit: "cup",
        type: "evening",
        order: 5 // Before bed
      }
    ]
  }
};

// Week days
const weekDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

interface EnhancedTrainerPlanCreationProps {
  showDeprecationWarning?: boolean;
}

// Simple error fallback component
function ErrorDisplay({ error, resetError }: { error: string, resetError: () => void }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <h2 className="text-xl font-bold text-red-700 mb-2">Something went wrong</h2>
      <p className="text-red-600 mb-2">The application encountered an error.</p>
      <pre className="bg-red-100 p-2 rounded overflow-auto text-sm">{error}</pre>
      <div className="mt-4 flex gap-4">
        <Button 
          onClick={resetError}
          variant="outline"
        >
          Try Again
        </Button>
        <Button 
          onClick={() => window.location.href = '/trainer'}
          variant="destructive"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}

export default function EnhancedTrainerPlanCreation({ showDeprecationWarning = false }: EnhancedTrainerPlanCreationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Debug output - this should help identify where issues might be occurring
  console.log("EnhancedTrainerPlanCreation component started rendering");
  console.log("Current auth user:", user);
  
  const resetError = () => {
    setHasError(false);
    setErrorMessage('');
  };
  
  // Show console warning for deprecated route
  useEffect(() => {
    if (showDeprecationWarning) {
      console.warn(
        "The /trainer/new-plan route is deprecated and will be removed in a future version. " +
        "Please use /enhanced-trainer-plan-creation instead."
      );
    }
  }, [showDeprecationWarning]);
  
  // Get URL parameters using Wouter's useLocation hook
  // Access the search params directly from window.location to ensure we get the most current URL
  const searchParams = new URLSearchParams(window.location.search);
  const clientIdParam = searchParams.get('clientId');
  const planIdParam = searchParams.get('planId');
  const isEdit = searchParams.get('edit') === 'true';
  
  // Update document title - remove "Fitness Plan Creation" title
  useEffect(() => {
    document.title = isEdit ? 'Edit Plan' : 'Create Plan';
  }, [isEdit]);
  
  // Parse client ID as a number, ensuring proper type handling
  const clientId = clientIdParam ? parseInt(clientIdParam, 10) : null;
  
  // Enhanced logging for debugging type issues
  console.log('Current location:', window.location.href);
  console.log('Search params:', window.location.search);
  console.log('Client ID from URL (raw):', clientIdParam, 'Type:', typeof clientIdParam);
  console.log('Parsed Client ID:', clientId, 'Type:', typeof clientId);
  console.log('Is valid number:', clientId !== null && !isNaN(clientId));
  
  // Redirect to trainer screen if no client ID is provided or if it's invalid
  useEffect(() => {
    // Delay the validation to ensure the URL is fully processed
    const validationTimeout = setTimeout(() => {
      if (!clientIdParam || clientId === null || isNaN(clientId)) {
        console.log('Invalid client ID - redirecting to trainer dashboard');
        toast({
          title: "Missing or invalid client information",
          description: "A valid client ID is required to create a fitness plan. Please select a client first.",
          variant: "destructive"
        });
        navigate('/trainer');
        return;
      }
      
      // Additional validation: Ensure client ID is a positive number
      if (clientId <= 0) {
        console.log('Non-positive client ID - redirecting to trainer dashboard');
        toast({
          title: "Invalid client ID",
          description: "The client ID must be a positive number.",
          variant: "destructive"
        });
        navigate('/trainer');
      }
    }, 500); // Half-second delay to ensure URL params are processed
    
    return () => clearTimeout(validationTimeout);
  }, [clientIdParam, clientId, navigate, toast]);
  
  // UI State
  const [activeTab, setActiveTab] = useState("details");
  const [isAddingExercise, setIsAddingExercise] = useState(false);
  const [currentDayIndex, setCurrentDayIndex] = useState<number | null>(null);
  const [exerciseType, setExerciseType] = useState<string>('');
  const [newExercise, setNewExercise] = useState<Exercise>({
    name: '',
    sets: 3,
    reps: 10,
    weight: 0,
    unit: 'kg',
    rest: '60 sec',
    useAdvancedSets: false
  });
  const [isAddingSnack, setIsAddingSnack] = useState(false);
  const [newSnack, setNewSnack] = useState<MealItem>({
    name: '',
    calories: 100,
    protein: 5,
    carbs: 15,
    fat: 3,
    servingSize: 1,
    servingUnit: 'serving'
  });
  const [isAddingCustomMeal, setIsAddingCustomMeal] = useState(false);
  const [newCustomMeal, setNewCustomMeal] = useState<CustomMeal>({
    name: '',
    calories: 150,
    protein: 10,
    carbs: 15,
    fat: 5,
    servingSize: 1,
    servingUnit: 'serving',
    type: 'pre-workout',
    order: 2
  });
  const [mealPlanType, setMealPlanType] = useState<string>('weight_loss');
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Initialize form
  const form = useForm<FitnessPlanFormValues>({
    resolver: zodResolver(fitnessPlanSchema),
    defaultValues: {
      clientId: clientId ? String(clientId) : '0', // Convert number to string for form
      name: '',
      description: '',
      workoutNotes: '',
      mealNotes: '',
      goal: 'weight_loss',
      durationWeeks: '4',
      level: 'beginner',
      days: weekDays.map(day => ({
        day,
        enabled: day !== 'saturday' && day !== 'sunday', // Default to weekdays only
        name: `${day.charAt(0).toUpperCase() + day.slice(1)} Workout`,
        exercises: [],
        notes: ''
      })),
      dailyMeals: {
        breakfast: { 
          name: "Breakfast", 
          calories: 300, 
          protein: 20, 
          carbs: 30, 
          fat: 10, 
          servingSize: 1, 
          servingUnit: "meal" 
        },
        lunch: { 
          name: "Lunch", 
          calories: 400, 
          protein: 30, 
          carbs: 40, 
          fat: 15, 
          servingSize: 1, 
          servingUnit: "meal" 
        },
        dinner: { 
          name: "Dinner", 
          calories: 500, 
          protein: 35, 
          carbs: 50, 
          fat: 20, 
          servingSize: 1, 
          servingUnit: "meal" 
        },
        snacks: [
          { 
            name: "Snack", 
            calories: 150, 
            protein: 5, 
            carbs: 20, 
            fat: 5, 
            servingSize: 1, 
            servingUnit: "snack" 
          }
        ]
      },
      calculateNutritionGoals: true
    }
  });
  
  // Get field arrays for exercises, snacks, and custom meals
  const { fields: dayFields, replace: replaceDays } = useFieldArray({
    name: "days",
    control: form.control
  });
  
  const { fields: snackFields, append: appendSnack, remove: removeSnack } = useFieldArray({
    name: "dailyMeals.snacks",
    control: form.control
  });
  
  // Add support for custom meals array
  const { fields: customMealFields, append: appendCustomMeal, remove: removeCustomMeal } = useFieldArray({
    name: "dailyMeals.customMeals",
    control: form.control
  });

  // Fetch client details if we have a client ID
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['/api/trainer/clients', clientIdParam],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/clients/${clientIdParam}`);
      if (!res.ok) throw new Error('Failed to fetch client details');
      return await res.json();
    },
    enabled: !!clientIdParam
  });

  // Fetch plan details if in edit mode
  const { data: planData, isLoading: planLoading } = useQuery({
    queryKey: ['/api/trainer/clients', clientIdParam, 'plans', planIdParam],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/clients/${clientIdParam}/plans/${planIdParam}`);
      if (!res.ok) throw new Error('Failed to fetch plan details');
      const data = await res.json();
      console.log('Raw plan data from API:', data);
      return data;
    },
    enabled: !!clientIdParam && !!planIdParam && isEdit
  });

  // Create fitness plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (data: FitnessPlanFormValues) => {
      // Transform days data into workoutPlan format expected by the API
      const weeklySchedule: Record<string, any> = {};
      
      // Process advanced set configuration for exercises
      data.days.forEach(day => {
        if (day.enabled) {
          // Create a deep copy of the exercises to avoid reference issues
          const processedExercises = day.exercises.map(exercise => {
            // Handle advanced set configurations
            if (exercise.useAdvancedSets && exercise.setsData) {
              return {
                ...exercise,
                // Ensure setsData is properly included
                setsData: exercise.setsData.map(setData => ({
                  reps: setData.reps,
                  weight: setData.weight,
                  completed: false, // Default to false since it's a new plan
                  setType: setData.setType || exercise.setType || 'regular',
                  targetRPE: setData.targetRPE,
                  tempo: setData.tempo,
                  distance: setData.distance,
                  duration: setData.duration,
                  restAfter: setData.restAfter,
                  notes: setData.notes
                }))
              };
            }
            return exercise;
          });
          
          weeklySchedule[day.day] = {
            name: day.name,
            exercises: processedExercises,
            notes: day.notes || ''
          };
        }
      });
      
      const payload = {
        name: data.name,
        goal: data.goal,
        durationWeeks: data.durationWeeks,
        description: data.description,
        level: data.level,
        workoutPlan: {
          weeklySchedule,
          notes: data.workoutNotes || ''
        },
        mealPlan: {
          dailyMeals: data.dailyMeals,
          notes: data.mealNotes || ''
        },
        calculateNutritionGoals: data.calculateNutritionGoals
      };
      
      console.log('Sending fitness plan payload:', JSON.stringify(payload));
      
      const res = await apiRequest('POST', `/api/trainer/clients/${data.clientId}/fitness-plan`, payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create fitness plan');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Fitness plan created",
        description: "The fitness plan has been created successfully and assigned to the client."
      });
      // Redirect to client detail page
      navigate(`/trainer/clients/${clientId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating fitness plan",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update fitness plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async (data: FitnessPlanFormValues) => {
      // Transform days data into workoutPlan format expected by the API
      const weeklySchedule: Record<string, any> = {};
      
      // Process advanced set configuration for exercises
      data.days.forEach(day => {
        if (day.enabled) {
          // Create a deep copy of the exercises to avoid reference issues
          const processedExercises = day.exercises.map(exercise => {
            // Handle advanced set configurations
            if (exercise.useAdvancedSets && exercise.setsData) {
              return {
                ...exercise,
                // Ensure setsData is properly included
                setsData: exercise.setsData.map(setData => ({
                  reps: setData.reps,
                  weight: setData.weight,
                  completed: setData.completed || false,
                  setType: setData.setType || exercise.setType || 'regular',
                  targetRPE: setData.targetRPE,
                  tempo: setData.tempo,
                  distance: setData.distance,
                  duration: setData.duration,
                  restAfter: setData.restAfter,
                  notes: setData.notes
                }))
              };
            }
            return exercise;
          });
          
          weeklySchedule[day.day] = {
            name: day.name,
            exercises: processedExercises,
            notes: day.notes || ''
          };
        }
      });
      
      const payload = {
        name: data.name,
        goal: data.goal,
        durationWeeks: data.durationWeeks,
        description: data.description,
        level: data.level,
        workoutPlan: {
          weeklySchedule,
          notes: data.workoutNotes || ''
        },
        mealPlan: {
          dailyMeals: data.dailyMeals,
          notes: data.mealNotes || ''
        },
        calculateNutritionGoals: data.calculateNutritionGoals
      };
      
      console.log('Sending fitness plan update payload:', JSON.stringify(payload));
      
      const res = await apiRequest('PUT', `/api/trainer/clients/${data.clientId}/plans/${planIdParam}`, payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update fitness plan');
      }
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Fitness plan updated",
        description: "The fitness plan has been updated successfully."
      });
      // Redirect to client detail page
      navigate(`/trainer/clients/${clientId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating fitness plan",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Initialize data from existing plan if in edit mode
  useEffect(() => {
    try {
      if (planData && isEdit) {
        console.log("Loading existing plan data:", planData);
        
        // Plan data exists but check structure
        // Try to determine if we got a direct plan object or a wrapper
        // Let's extract the important fields we need
        
        // First try: Check if planData itself has the expected structure
        if (planData.workoutPlan || planData.preferences) {
          console.log("Using direct plan data structure");
        } else if (planData.plan && (planData.plan.workoutPlan || planData.plan.preferences)) {
          console.log("Using nested plan data structure");
        } else {
          // Examine more deeply what we've received
          console.log("Plan data structure inspection:", Object.keys(planData));
          console.error("Plan data is missing in the response");
          setHasError(true);
          setErrorMessage("Could not load plan data. The plan structure is not as expected.");
          return;
        }
        
        // Handle both direct and nested data structures
        const plan = planData.plan || planData;
        
        console.log("Processing plan structure:", plan);
        console.log("Plan properties:", Object.keys(plan));
        
        // Safety check for proper plan structure
        if (!plan || typeof plan !== 'object') {
          console.error("Valid plan data is missing or not in expected format");
          setHasError(true);
          setErrorMessage("Could not parse plan data. The format is unexpected or corrupt.");
          return;
        }
        
        // Check for existence of workoutPlan or preferences property
        if (!plan.workoutPlan && !plan.preferences) {
          console.error("Plan data is missing both workoutPlan and preferences, trying to access using property names");
          console.log("Available properties:", Object.keys(plan));
          
          // Try to find alternative property names
          const possibleWorkoutPlanKeys = Object.keys(plan).filter(key => 
            key.toLowerCase().includes('workout') || key.toLowerCase().includes('exercise'));
          
          if (possibleWorkoutPlanKeys.length > 0) {
            console.log("Found possible workout plan keys:", possibleWorkoutPlanKeys);
          }
          
          if (plan.userId && plan.id && !plan.workoutPlan) {
            // Try to handle malformed plan data by checking for properties we know should exist
            console.log("Attempting to recover from missing workoutPlan structure");
            
            // Try to extract plan data from the preferences field if it exists
            if (plan.preferences) {
              console.log("Found preferences data:", plan.preferences);
              
              // If plan data is nested in preferences, try to use it
              if (typeof plan.preferences === 'object' && plan.preferences.goal) {
                console.log("Using preferences for plan data");
                plan.goal = plan.preferences.goal;
                plan.level = plan.preferences.level;
                plan.durationWeeks = plan.preferences.durationWeeks;
              }
            }
          }
        }
        
        // Extract workout plan data with safety checks (or set defaults)
        const workoutPlan = plan.workoutPlan || {};
        const mealPlan = plan.mealPlan || {};
        const weeklySchedule = workoutPlan.weeklySchedule || {};
        
        // Debug meal plan data
        console.log("Loading meal plan data:", mealPlan);
        console.log("Loading workout plan data:", workoutPlan);
        console.log("Weekly schedule:", weeklySchedule);
      
        // Prepare days array with existing workout data
        const updatedDays = [...form.getValues('days')];
        
        weekDays.forEach((day, index) => {
          if (weeklySchedule[day]) {
            updatedDays[index] = {
              day,
              enabled: true,
              name: weeklySchedule[day].name || `${day.charAt(0).toUpperCase() + day.slice(1)} Workout`,
              exercises: weeklySchedule[day].exercises || [],
              notes: weeklySchedule[day].notes || ''
            };
          } else {
            updatedDays[index] = {
              ...updatedDays[index],
              enabled: false
            };
          }
        });
        
        replaceDays(updatedDays);
        
        // Set form values
        form.reset({
          clientId: clientId ? String(clientId) : '0',
          name: plan.name || '',
          description: plan.description || '',
          workoutNotes: workoutPlan.notes || '',
          mealNotes: mealPlan.notes || '',
          goal: plan.goal || 'weight_loss',
          durationWeeks: String(plan.durationWeeks) || '4',
          level: plan.level || 'beginner',
          days: updatedDays,
          dailyMeals: mealPlan.dailyMeals || form.getValues('dailyMeals'),
          calculateNutritionGoals: true
        });
        
        // Set meal plan type based on goal
        if (plan.goal) {
          setMealPlanType(plan.goal);
        }
      }
    } catch (error) {
      console.error("Error loading plan data:", error);
      setHasError(true);
      setErrorMessage(error instanceof Error 
        ? `Failed to load plan data: ${error.message}` 
        : "Failed to load plan data. Please try again or contact support.");
    }
  }, [planData, isEdit, form, replaceDays, clientId]);

  // Add exercise to a day
  const handleAddExercise = (dayIndex: number) => {
    setCurrentDayIndex(dayIndex);
    setIsAddingExercise(true);
  };
  
  // Add selected template exercises to a day
  const handleAddExerciseTemplate = (dayIndex: number, type: string) => {
    const level = form.getValues('level') as 'beginner' | 'intermediate' | 'advanced';
    const currentExercises = form.getValues(`days.${dayIndex}.exercises`);
    
    // Get exercises for the selected template and level
    const templateExercises = exerciseTemplates[level][type as keyof typeof exerciseTemplates.beginner] || [];
    
    // Update the form
    const days = form.getValues('days');
    days[dayIndex].exercises = [...currentExercises, ...templateExercises];
    
    form.setValue('days', days);
  };
  
  // Save new exercise to a day
  const handleSaveExercise = () => {
    if (currentDayIndex === null) return;
    
    // Create a processed exercise object that maintains the proper structure
    // based on whether advanced sets are being used
    const exerciseToAdd = {
      ...newExercise,
      // If using advanced sets, ensure we use the proper number of sets based on setsData length
      sets: newExercise.useAdvancedSets && newExercise.setsData 
        ? newExercise.setsData.length 
        : newExercise.sets
    };
    
    const days = form.getValues('days');
    days[currentDayIndex].exercises = [...days[currentDayIndex].exercises, exerciseToAdd];
    
    form.setValue('days', days);
    
    // Reset form
    setNewExercise({
      name: '',
      sets: 3,
      reps: 10,
      weight: 0,
      unit: 'kg',
      rest: '60 sec',
      useAdvancedSets: false,
      setType: undefined,
      setsData: undefined,
      supersetWith: undefined
    });
    setIsAddingExercise(false);
    setCurrentDayIndex(null);
    
    toast({
      title: "Exercise Added",
      description: newExercise.useAdvancedSets 
        ? "Exercise with advanced set configuration has been added." 
        : "Exercise has been added to the workout."
    });
  };
  
  // Remove exercise from a day
  const handleRemoveExercise = (dayIndex: number, exerciseIndex: number) => {
    const days = form.getValues('days');
    days[dayIndex].exercises.splice(exerciseIndex, 1);
    form.setValue('days', days);
  };
  
  // Handle meal template selection
  const handleApplyMealTemplate = (type: string) => {
    if (mealTemplates[type as keyof typeof mealTemplates]) {
      const template = mealTemplates[type as keyof typeof mealTemplates];
      
      // Update form values
      form.setValue('dailyMeals.breakfast', template.breakfast);
      form.setValue('dailyMeals.lunch', template.lunch);
      form.setValue('dailyMeals.dinner', template.dinner);
      
      // Replace snacks
      const newSnacks = [...template.snacks];
      form.setValue('dailyMeals.snacks', newSnacks);
      
      // Apply custom meals if they exist in the template
      if (template.customMeals && template.customMeals.length > 0) {
        form.setValue('dailyMeals.customMeals', [...template.customMeals]);
        
        toast({
          title: "Custom meals added",
          description: `Added ${template.customMeals.length} custom meals from the ${type.replace('_', ' ')} template.`
        });
      } else {
        // Clear custom meals if none in template
        form.setValue('dailyMeals.customMeals', []);
      }
      
      setMealPlanType(type);
      
      toast({
        title: "Meal template applied",
        description: `Applied the ${type.replace('_', ' ')} meal template to your plan.`
      });
    }
  };
  
  // Add a new snack
  const handleAddSnack = () => {
    appendSnack(newSnack);
    setNewSnack({
      name: '',
      calories: 100,
      protein: 5,
      carbs: 15,
      fat: 3,
      servingSize: 1,
      servingUnit: 'serving'
    });
    setIsAddingSnack(false);
  };
  
  // Add a new custom meal
  const handleAddCustomMeal = () => {
    appendCustomMeal(newCustomMeal);
    setNewCustomMeal({
      name: '',
      calories: 150,
      protein: 10,
      carbs: 15, 
      fat: 5,
      servingSize: 1,
      servingUnit: 'serving',
      type: 'custom',
      order: customMealFields.length + 2 // Set order dynamically
    });
    setIsAddingCustomMeal(false);
  };
  
  // Calculate total daily nutrition
  const calculateDailyNutrition = () => {
    const meals = form.getValues('dailyMeals');
    
    // Handle potential undefined values for safety
    const breakfast = meals.breakfast || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const lunch = meals.lunch || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const dinner = meals.dinner || { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const snacks = meals.snacks || [];
    
    // Calculate base meal totals
    let totalCalories = 
      breakfast.calories + 
      lunch.calories + 
      dinner.calories + 
      snacks.reduce((sum, snack) => sum + (snack?.calories || 0), 0);
      
    let totalProtein = 
      breakfast.protein + 
      lunch.protein + 
      dinner.protein + 
      snacks.reduce((sum, snack) => sum + (snack?.protein || 0), 0);
      
    let totalCarbs = 
      breakfast.carbs + 
      lunch.carbs + 
      dinner.carbs + 
      snacks.reduce((sum, snack) => sum + (snack?.carbs || 0), 0);
      
    let totalFat = 
      breakfast.fat + 
      lunch.fat + 
      dinner.fat + 
      snacks.reduce((sum, snack) => sum + (snack?.fat || 0), 0);
    
    // Add nutrition from custom meals if they exist
    if (meals.customMeals && meals.customMeals.length > 0) {
      totalCalories += meals.customMeals.reduce((sum, meal) => sum + (meal?.calories || 0), 0);
      totalProtein += meals.customMeals.reduce((sum, meal) => sum + (meal?.protein || 0), 0);
      totalCarbs += meals.customMeals.reduce((sum, meal) => sum + (meal?.carbs || 0), 0);
      totalFat += meals.customMeals.reduce((sum, meal) => sum + (meal?.fat || 0), 0);
    }
    
    console.log('Daily nutrition calculated:', { totalCalories, totalProtein, totalCarbs, totalFat });
      
    return {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat
    };
  };
  
  // Submit form
  const onSubmit = (data: FitnessPlanFormValues) => {
    if (isEdit && planIdParam) {
      updatePlanMutation.mutate(data);
    } else {
      createPlanMutation.mutate(data);
    }
  };
  
  // Loading states
  const isLoading = clientLoading || planLoading;
  const isSaving = createPlanMutation.isPending || updatePlanMutation.isPending;
  
  // Enhanced error handling for mutations
  const createPlanError = createPlanMutation.error;
  const updatePlanError = updatePlanMutation.error;
  
  // Log errors for debugging if they exist
  useEffect(() => {
    if (createPlanError) {
      console.error('Create plan error:', createPlanError);
    }
    if (updatePlanError) {
      console.error('Update plan error:', updatePlanError);
    }
  }, [createPlanError, updatePlanError]);
  
  // Calculate daily nutrition totals
  const dailyNutrition = calculateDailyNutrition();

  // Show error state if there is an error
  if (hasError) {
    return <ErrorDisplay error={errorMessage} resetError={resetError} />;
  }
  
  // Wrap the component render in a try-catch block
  try {
    return (
      <div className="container max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-6 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => setConfirmCancel(true)}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Trainer
          </Button>
          
          <Button 
            size="sm"
            disabled={isSaving}
            onClick={form.handleSubmit(onSubmit)}
            className="bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                {isEdit ? 'Update Plan' : 'Save Plan'}
              </>
            )}
          </Button>
        </div>
        
        {/* Client info */}
        {clientData && (
          <div className="flex items-center mb-6">
            <User className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Client: <span className="font-medium text-foreground">{clientData.client.username}</span>
            </span>
          </div>
        )}

      {/* Confirm Cancel Dialog */}
      <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Cancel Plan Creation</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Are you sure you want to cancel? Any unsaved changes will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmCancel(false)}>
              Continue Editing
            </Button>
            <Button 
              variant="destructive"
              onClick={() => navigate(clientId ? `/trainer/clients/${clientId}` : '/trainer')}
            >
              Discard Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs 
            defaultValue="details" 
            className="w-full" 
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid grid-cols-3 w-full mb-6">
              <TabsTrigger value="details">Plan Details</TabsTrigger>
              <TabsTrigger value="workout">Workout Plan</TabsTrigger>
              <TabsTrigger value="meal">Meal Plan</TabsTrigger>
            </TabsList>
            
            {/* Plan Details Tab */}
            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <ClipboardList className="mr-2 h-5 w-5" />
                    Plan Details
                  </CardTitle>
                  <CardDescription>
                    Enter the basic information for this fitness plan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plan Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter a name for this plan" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Client</FormLabel>
                          <FormControl>
                            <Input 
                              disabled 
                              value={clientData ? clientData.client.username : 'Loading client...'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="goal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Goal</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a goal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="weight_loss">Weight Loss</SelectItem>
                              <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="strength">Strength</SelectItem>
                              <SelectItem value="endurance">Endurance</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fitness Level</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="beginner">Beginner</SelectItem>
                              <SelectItem value="intermediate">Intermediate</SelectItem>
                              <SelectItem value="advanced">Advanced</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="durationWeeks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (Weeks)</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select duration" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="2">2 Weeks</SelectItem>
                              <SelectItem value="4">4 Weeks</SelectItem>
                              <SelectItem value="6">6 Weeks</SelectItem>
                              <SelectItem value="8">8 Weeks</SelectItem>
                              <SelectItem value="12">12 Weeks</SelectItem>
                              <SelectItem value="16">16 Weeks</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter a description for this fitness plan" 
                            className="min-h-[100px]" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Provide an overview of what this plan aims to achieve
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => setActiveTab("workout")}
                >
                  Next: Workout Plan
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            
            {/* Workout Plan Tab */}
            <TabsContent value="workout" className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Dumbbell className="mr-2 h-5 w-5" />
                    Workout Plan
                  </CardTitle>
                  <CardDescription>
                    Design the weekly workout schedule for your client
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Weekly Schedule */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium">Weekly Schedule</h3>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">
                              Enable days when your client should work out. For each enabled day, add exercises
                              to build their workout routine.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    
                    <Accordion type="multiple" className="w-full">
                      {dayFields.map((day, dayIndex) => (
                        <AccordionItem key={day.id} value={dayIndex.toString()}>
                          <AccordionTrigger className="py-3">
                            <div className="flex items-center w-full">
                              <FormField
                                control={form.control}
                                name={`days.${dayIndex}.enabled`}
                                render={({ field }) => (
                                  <FormItem className="flex items-center space-x-2 space-y-0 mr-4" onClick={e => e.stopPropagation()}>
                                    <FormControl>
                                      <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <span className="flex-1 font-medium capitalize">{day.day}</span>
                              
                              {form.getValues(`days.${dayIndex}.enabled`) && (
                                <Badge variant="outline" className="mr-4">
                                  {form.getValues(`days.${dayIndex}.exercises`).length} exercises
                                </Badge>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            {form.getValues(`days.${dayIndex}.enabled`) ? (
                              <div className="space-y-4 pt-2">
                                <FormField
                                  control={form.control}
                                  name={`days.${dayIndex}.name`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Workout Name</FormLabel>
                                      <FormControl>
                                        <Input {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <h4 className="text-sm font-medium">Exercises</h4>
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" onClick={() => handleAddExercise(dayIndex)}>
                                          <Plus className="mr-1 h-4 w-4" />
                                          Add Exercise
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg overflow-y-auto max-h-[90vh]">
                                        <DialogHeader>
                                          <DialogTitle className="text-base sm:text-lg">Add Exercise</DialogTitle>
                                          <DialogDescription className="text-xs sm:text-sm">
                                            Add a new exercise or select from templates.
                                          </DialogDescription>
                                        </DialogHeader>
                                        
                                        <Tabs defaultValue="custom">
                                          <TabsList className="grid grid-cols-2 w-full mb-4">
                                            <TabsTrigger value="custom">Custom Exercise</TabsTrigger>
                                            <TabsTrigger value="template">Templates</TabsTrigger>
                                          </TabsList>
                                          
                                          <TabsContent value="custom" className="space-y-4">
                                            <div className="space-y-3">
                                              <div>
                                                <label className="text-sm font-medium">Name</label>
                                                <Input 
                                                  value={newExercise.name} 
                                                  onChange={e => setNewExercise({...newExercise, name: e.target.value})}
                                                  placeholder="Exercise name" 
                                                />
                                              </div>
                                              
                                              <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                  <label className="text-sm font-medium">Sets</label>
                                                  <Input 
                                                    type="number"
                                                    value={newExercise.sets} 
                                                    onChange={e => setNewExercise({...newExercise, sets: parseInt(e.target.value) || 1})}
                                                    min="1"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-sm font-medium">Reps</label>
                                                  <Input 
                                                    type="number"
                                                    value={newExercise.reps} 
                                                    onChange={e => setNewExercise({...newExercise, reps: parseInt(e.target.value) || 1})}
                                                    min="1"
                                                  />
                                                </div>
                                              </div>
                                              
                                              <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                  <label className="text-sm font-medium">Weight</label>
                                                  <Input 
                                                    type="number"
                                                    value={newExercise.weight} 
                                                    onChange={e => setNewExercise({...newExercise, weight: parseFloat(e.target.value) || 0})}
                                                    min="0"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-sm font-medium">Unit</label>
                                                  <Select
                                                    value={newExercise.unit}
                                                    onValueChange={value => setNewExercise({...newExercise, unit: value})}
                                                  >
                                                    <SelectTrigger>
                                                      <SelectValue placeholder="Select unit" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="kg">kg</SelectItem>
                                                      <SelectItem value="lb">lb</SelectItem>
                                                      <SelectItem value="bodyweight">Bodyweight</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                </div>
                                              </div>
                                              
                                              <div>
                                                <label className="text-sm font-medium">Rest Time</label>
                                                <Input 
                                                  value={newExercise.rest} 
                                                  onChange={e => setNewExercise({...newExercise, rest: e.target.value})}
                                                  placeholder="e.g. 60 sec" 
                                                />
                                              </div>
                                              
                                              <div className="flex items-center space-x-2 mt-3">
                                                <Switch
                                                  id="advanced-sets"
                                                  checked={newExercise.useAdvancedSets}
                                                  onCheckedChange={(checked) => {
                                                    setNewExercise({
                                                      ...newExercise,
                                                      useAdvancedSets: checked,
                                                      setType: checked ? (newExercise.setType || 'regular') : undefined,
                                                      // Initialize setsData if enabling advanced sets
                                                      setsData: checked ? Array(newExercise.sets).fill(null).map(() => ({
                                                        reps: newExercise.reps,
                                                        weight: newExercise.weight || 0,
                                                        completed: false,
                                                        targetRPE: 7,
                                                        restAfter: 60,
                                                      })) : undefined
                                                    });
                                                  }}
                                                />
                                                <Label htmlFor="advanced-sets" className="text-sm font-medium">
                                                  Use advanced set configuration
                                                </Label>
                                              </div>
                                              
                                              {newExercise.useAdvancedSets && (
                                                <div className="border rounded-md p-3 mt-3 space-y-3">
                                                  <div>
                                                    <label className="text-sm font-medium">Set Type</label>
                                                    <Select
                                                      value={newExercise.setType}
                                                      onValueChange={value => setNewExercise({...newExercise, setType: value})}
                                                    >
                                                      <SelectTrigger>
                                                        <SelectValue placeholder="Select set type" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                        <SelectItem value="regular">Regular Sets</SelectItem>
                                                        <SelectItem value="dropset">Drop Sets</SelectItem>
                                                        <SelectItem value="superset">Super Sets</SelectItem>
                                                        <SelectItem value="giantset">Giant Sets</SelectItem>
                                                        <SelectItem value="pyramid">Pyramid Sets</SelectItem>
                                                        <SelectItem value="emom">EMOM</SelectItem>
                                                        <SelectItem value="amrap">AMRAP</SelectItem>
                                                      </SelectContent>
                                                    </Select>
                                                  </div>
                                                  
                                                  {newExercise.setType === 'superset' && (
                                                    <div>
                                                      <label className="text-sm font-medium">Superset With</label>
                                                      <Input 
                                                        value={newExercise.supersetWith || ''} 
                                                        onChange={e => setNewExercise({...newExercise, supersetWith: e.target.value})}
                                                        placeholder="Name of exercise to superset with" 
                                                      />
                                                    </div>
                                                  )}
                                                  
                                                  <div className="space-y-2">
                                                    <div className="flex justify-between items-center">
                                                      <label className="text-sm font-medium">Individual Set Configuration</label>
                                                    </div>
                                                    
                                                    {newExercise.setsData?.map((set, setIndex) => (
                                                      <div key={setIndex} className="border rounded-md p-3 space-y-2">
                                                        <div className="flex justify-between items-center">
                                                          <span className="text-sm font-medium">Set {setIndex + 1}</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                          <div>
                                                            <label className="text-xs text-muted-foreground">Reps</label>
                                                            <Input 
                                                              type="number"
                                                              min="1"
                                                              className="mt-1 h-8"
                                                              value={set.reps} 
                                                              onChange={e => {
                                                                const updatedSetsData = [...newExercise.setsData || []];
                                                                updatedSetsData[setIndex] = {
                                                                  ...updatedSetsData[setIndex],
                                                                  reps: parseInt(e.target.value) || 1
                                                                };
                                                                setNewExercise({...newExercise, setsData: updatedSetsData});
                                                              }}
                                                            />
                                                          </div>
                                                          <div>
                                                            <label className="text-xs text-muted-foreground">Weight ({newExercise.unit})</label>
                                                            <Input 
                                                              type="number"
                                                              min="0"
                                                              step="0.5"
                                                              className="mt-1 h-8"
                                                              value={set.weight} 
                                                              onChange={e => {
                                                                const updatedSetsData = [...newExercise.setsData || []];
                                                                updatedSetsData[setIndex] = {
                                                                  ...updatedSetsData[setIndex],
                                                                  weight: parseFloat(e.target.value) || 0
                                                                };
                                                                setNewExercise({...newExercise, setsData: updatedSetsData});
                                                              }}
                                                            />
                                                          </div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-2">
                                                          <div>
                                                            <label className="text-xs text-muted-foreground">Rest Time (sec)</label>
                                                            <Input 
                                                              type="number"
                                                              min="0"
                                                              className="mt-1 h-8"
                                                              value={set.restAfter || 60} 
                                                              onChange={e => {
                                                                const updatedSetsData = [...newExercise.setsData || []];
                                                                updatedSetsData[setIndex] = {
                                                                  ...updatedSetsData[setIndex],
                                                                  restAfter: parseInt(e.target.value) || 0
                                                                };
                                                                setNewExercise({...newExercise, setsData: updatedSetsData});
                                                              }}
                                                            />
                                                          </div>
                                                          <div>
                                                            <label className="text-xs text-muted-foreground">Target RPE (1-10)</label>
                                                            <Input 
                                                              type="number"
                                                              min="1"
                                                              max="10"
                                                              className="mt-1 h-8"
                                                              value={set.targetRPE || 7} 
                                                              onChange={e => {
                                                                const updatedSetsData = [...newExercise.setsData || []];
                                                                updatedSetsData[setIndex] = {
                                                                  ...updatedSetsData[setIndex],
                                                                  targetRPE: parseInt(e.target.value) || 7
                                                                };
                                                                setNewExercise({...newExercise, setsData: updatedSetsData});
                                                              }}
                                                            />
                                                          </div>
                                                        </div>
                                                        
                                                        <div>
                                                          <label className="text-xs text-muted-foreground">Tempo (e.g., "3-1-3")</label>
                                                          <Input 
                                                            className="mt-1 h-8"
                                                            value={set.tempo || ''} 
                                                            placeholder="e.g., 3-1-3"
                                                            onChange={e => {
                                                              const updatedSetsData = [...newExercise.setsData || []];
                                                              updatedSetsData[setIndex] = {
                                                                ...updatedSetsData[setIndex],
                                                                tempo: e.target.value
                                                              };
                                                              setNewExercise({...newExercise, setsData: updatedSetsData});
                                                            }}
                                                          />
                                                        </div>
                                                        
                                                        <div>
                                                          <label className="text-xs text-muted-foreground">Notes</label>
                                                          <Input 
                                                            className="mt-1 h-8"
                                                            value={set.notes || ''} 
                                                            placeholder="Any notes for this set"
                                                            onChange={e => {
                                                              const updatedSetsData = [...newExercise.setsData || []];
                                                              updatedSetsData[setIndex] = {
                                                                ...updatedSetsData[setIndex],
                                                                notes: e.target.value
                                                              };
                                                              setNewExercise({...newExercise, setsData: updatedSetsData});
                                                            }}
                                                          />
                                                        </div>
                                                      </div>
                                                    ))}
                                                    
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      onClick={() => {
                                                        // Add a new set with default values matching the last set
                                                        const lastSet = newExercise.setsData?.[newExercise.setsData.length - 1];
                                                        const newSet = lastSet ? {...lastSet} : {
                                                          reps: newExercise.reps,
                                                          weight: newExercise.weight || 0,
                                                          completed: false,
                                                          targetRPE: 7,
                                                          restAfter: 60
                                                        };
                                                        
                                                        setNewExercise({
                                                          ...newExercise,
                                                          sets: (newExercise.setsData?.length || 0) + 1,
                                                          setsData: [...(newExercise.setsData || []), newSet]
                                                        });
                                                      }}
                                                      className="w-full mt-2"
                                                      size="sm"
                                                    >
                                                      <Plus className="h-3.5 w-3.5 mr-1" />
                                                      Add Another Set
                                                    </Button>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                            
                                            <Button 
                                              onClick={handleSaveExercise}
                                              disabled={!newExercise.name || newExercise.sets < 1 || newExercise.reps < 1}
                                              className="w-full mt-4"
                                            >
                                              Add Exercise
                                            </Button>
                                          </TabsContent>
                                          
                                          <TabsContent value="template" className="space-y-4">
                                            <div className="space-y-3">
                                              <Select
                                                value={exerciseType}
                                                onValueChange={setExerciseType}
                                              >
                                                <SelectTrigger>
                                                  <SelectValue placeholder="Select exercise type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="chest">Chest</SelectItem>
                                                  <SelectItem value="back">Back</SelectItem>
                                                  <SelectItem value="legs">Legs</SelectItem>
                                                  <SelectItem value="shoulders">Shoulders</SelectItem>
                                                  <SelectItem value="arms">Arms</SelectItem>
                                                  <SelectItem value="core">Core</SelectItem>
                                                </SelectContent>
                                              </Select>
                                              
                                              {exerciseType && (
                                                <div className="border rounded-md p-3 mt-2">
                                                  <h4 className="text-sm font-medium mb-2 capitalize">{exerciseType} Exercises</h4>
                                                  <ul className="space-y-2">
                                                    {exerciseTemplates[form.getValues('level') as 'beginner' | 'intermediate' | 'advanced'][exerciseType as keyof typeof exerciseTemplates.beginner].map((exercise, i) => (
                                                      <li key={i} className="text-sm">
                                                        {exercise.name} - {exercise.sets} sets of {exercise.reps} reps
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              )}
                                            </div>
                                            
                                            <Button 
                                              onClick={() => {
                                                handleAddExerciseTemplate(dayIndex, exerciseType);
                                                setIsAddingExercise(false);
                                              }}
                                              disabled={!exerciseType}
                                              className="w-full"
                                            >
                                              Add Template Exercises
                                            </Button>
                                          </TabsContent>
                                        </Tabs>
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                  
                                  {form.getValues(`days.${dayIndex}.exercises`).length === 0 ? (
                                    <div className="text-center py-4 border border-dashed rounded-md">
                                      <p className="text-sm text-muted-foreground">No exercises added yet</p>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {form.getValues(`days.${dayIndex}.exercises`).map((exercise, exerciseIndex) => (
                                        <div 
                                          key={exerciseIndex} 
                                          className="border rounded-md bg-muted/30 overflow-hidden"
                                        >
                                          <div className="flex items-center justify-between p-3">
                                            <div>
                                              <p className="font-medium text-sm">{exercise.name}</p>
                                              
                                              {/* Standard set display for simple exercises */}
                                              {!exercise.useAdvancedSets && (
                                                <p className="text-xs text-muted-foreground">
                                                  {exercise.sets} sets × {exercise.reps} reps 
                                                  {exercise.weight ? ` @ ${exercise.weight} ${exercise.unit}` : ''}
                                                  {exercise.rest ? ` | Rest: ${exercise.rest}` : ''}
                                                </p>
                                              )}
                                              
                                              {/* Advanced set type badge */}
                                              {exercise.useAdvancedSets && exercise.setType && (
                                                <div className="flex items-center gap-1 mt-1">
                                                  <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                                                    {exercise.setType.charAt(0).toUpperCase() + exercise.setType.slice(1)} Sets
                                                  </Badge>
                                                  <span className="text-xs text-muted-foreground">
                                                    {exercise.setsData?.length || exercise.sets} sets
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            
                                            <div className="flex gap-1">
                                              {/* Edit button for advanced configuration */}
                                              {exercise.useAdvancedSets && (
                                                <Dialog>
                                                  <DialogTrigger asChild>
                                                    <Button
                                                      variant="ghost" 
                                                      size="sm"
                                                      className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                                                    >
                                                      <Settings className="h-4 w-4" />
                                                    </Button>
                                                  </DialogTrigger>
                                                  <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-lg overflow-y-auto max-h-[90vh]">
                                                    <DialogHeader>
                                                      <DialogTitle className="text-base sm:text-lg">Edit Advanced Set Configuration</DialogTitle>
                                                      <DialogDescription className="text-xs sm:text-sm">
                                                        Customize the individual sets for {exercise.name}
                                                      </DialogDescription>
                                                    </DialogHeader>
                                                    
                                                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                                                      {(exercise.setsData || []).map((set: any, setIndex: number) => (
                                                        <div key={setIndex} className="p-3 border rounded-md mb-2 bg-muted/30">
                                                          <div className="flex justify-between items-center mb-2">
                                                            <span className="font-medium text-sm">Set {setIndex + 1}</span>
                                                          </div>
                                                          <div className="grid grid-cols-2 gap-2 text-sm">
                                                            <div>
                                                              <p className="text-muted-foreground text-xs">Reps:</p>
                                                              <p className="font-medium">{set.reps}</p>
                                                            </div>
                                                            <div>
                                                              <p className="text-muted-foreground text-xs">Weight:</p>
                                                              <p className="font-medium">{set.weight} {exercise.unit}</p>
                                                            </div>
                                                            <div>
                                                              <p className="text-muted-foreground text-xs">RPE:</p>
                                                              <p className="font-medium">{set.targetRPE || '-'}</p>
                                                            </div>
                                                            <div>
                                                              <p className="text-muted-foreground text-xs">Tempo:</p>
                                                              <p className="font-medium">{set.tempo || '-'}</p>
                                                            </div>
                                                            <div>
                                                              <p className="text-muted-foreground text-xs">Rest:</p>
                                                              <p className="font-medium">{set.restAfter}s</p>
                                                            </div>
                                                            <div>
                                                              <p className="text-muted-foreground text-xs">Type:</p>
                                                              <p className="font-medium">{set.setType || 'Regular'}</p>
                                                            </div>
                                                          </div>
                                                          
                                                          {set.notes && (
                                                            <div className="mt-2 text-xs bg-background/80 p-2 rounded-sm">
                                                              <p className="text-muted-foreground mb-1">Notes:</p>
                                                              <p>{set.notes}</p>
                                                            </div>
                                                          )}
                                                        </div>
                                                      ))}
                                                    </div>
                                                    
                                                    <DialogFooter>
                                                      <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                          // Switch to editing mode in the main form
                                                          setValue(`days.${dayIndex}.exercises.${exerciseIndex}.useAdvancedSets`, true);
                                                        }}
                                                      >
                                                        Edit All Sets
                                                      </Button>
                                                    </DialogFooter>
                                                  </DialogContent>
                                                </Dialog>
                                              )}
                                              
                                              <Button 
                                                variant="ghost" 
                                                size="sm"
                                                onClick={() => handleRemoveExercise(dayIndex, exerciseIndex)}
                                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </div>
                                          
                                          {/* Advanced set details summary */}
                                          {exercise.useAdvancedSets && exercise.setsData && exercise.setsData.length > 0 && (
                                            <Collapsible>
                                              <CollapsibleTrigger asChild>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="w-full flex items-center justify-center p-1 text-xs border-t rounded-none hover:bg-muted"
                                                >
                                                  <ChevronRight className="h-3 w-3 mr-1" />
                                                  View Set Details
                                                </Button>
                                              </CollapsibleTrigger>
                                              <CollapsibleContent>
                                                <div className="px-3 pb-3 text-xs">
                                                  <div className="grid grid-cols-8 gap-1 font-medium text-muted-foreground mb-1 border-b pb-1">
                                                    <div className="col-span-1">Set</div>
                                                    <div className="col-span-1">Reps</div>
                                                    <div className="col-span-2">Weight</div>
                                                    <div className="col-span-1">RPE</div>
                                                    <div className="col-span-2">Tempo</div>
                                                    <div className="col-span-1">Rest</div>
                                                  </div>
                                                  
                                                  {exercise.setsData.map((set: any, i: number) => (
                                                    <div key={i} className="grid grid-cols-8 gap-1 py-1">
                                                      <div className="col-span-1">{i + 1}</div>
                                                      <div className="col-span-1">{set.reps}</div>
                                                      <div className="col-span-2">{set.weight} {exercise.unit}</div>
                                                      <div className="col-span-1">{set.targetRPE || '-'}</div>
                                                      <div className="col-span-2">{set.tempo || '-'}</div>
                                                      <div className="col-span-1">{set.restAfter}s</div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </CollapsibleContent>
                                            </Collapsible>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                <FormField
                                  control={form.control}
                                  name={`days.${dayIndex}.notes`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Notes</FormLabel>
                                      <FormControl>
                                        <Textarea 
                                          {...field} 
                                          placeholder="Add any notes for this workout day"
                                          rows={3}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            ) : (
                              <div className="py-4 text-center text-muted-foreground">
                                <p className="text-sm">This day is disabled</p>
                                <p className="text-xs">Enable it to create a workout</p>
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                  
                  <Separator />
                  
                  {/* Workout Notes */}
                  <FormField
                    control={form.control}
                    name="workoutNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overall Workout Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Add any overall notes about the workout plan"
                            rows={4}
                          />
                        </FormControl>
                        <FormDescription>
                          These notes will be visible to your client
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => setActiveTab("meal")}
                >
                  Next: Meal Plan
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>
            
            {/* Meal Plan Tab */}
            <TabsContent value="meal" className="space-y-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Utensils className="mr-2 h-5 w-5" />
                    Meal Plan
                  </CardTitle>
                  <CardDescription>
                    Create a daily meal plan for your client
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Template Selector */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
                    <div>
                      <h3 className="text-base font-medium">Meal Plan Template</h3>
                      <p className="text-sm text-muted-foreground">
                        Start with a template based on your client's goals
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant={mealPlanType === 'weight_loss' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => handleApplyMealTemplate('weight_loss')}
                      >
                        Weight Loss
                      </Button>
                      <Button 
                        variant={mealPlanType === 'muscle_gain' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => handleApplyMealTemplate('muscle_gain')}
                      >
                        Muscle Gain
                      </Button>
                      <Button 
                        variant={mealPlanType === 'maintenance' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => handleApplyMealTemplate('maintenance')}
                      >
                        Maintenance
                      </Button>
                    </div>
                  </div>
                  
                  {/* Daily Meals */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-medium">Daily Meals</h3>
                      
                      <FormField
                        control={form.control}
                        name="calculateNutritionGoals"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-0.5">
                              <FormLabel className="text-xs">
                                Set client nutrition goals from this plan
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Tabs defaultValue="breakfast" className="w-full">
                      <TabsList className="grid grid-cols-4 mb-4">
                        <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
                        <TabsTrigger value="lunch">Lunch</TabsTrigger>
                        <TabsTrigger value="dinner">Dinner</TabsTrigger>
                        <TabsTrigger value="snacks">Snacks</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="breakfast" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dailyMeals.breakfast.name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Meal Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Breakfast name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="dailyMeals.breakfast.servingSize"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Serving Size</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      step="0.1"
                                      {...field}
                                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="dailyMeals.breakfast.servingUnit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select unit" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="g">g</SelectItem>
                                      <SelectItem value="oz">oz</SelectItem>
                                      <SelectItem value="cup">cup</SelectItem>
                                      <SelectItem value="tbsp">tbsp</SelectItem>
                                      <SelectItem value="serving">serving</SelectItem>
                                      <SelectItem value="bowl">bowl</SelectItem>
                                      <SelectItem value="plate">plate</SelectItem>
                                      <SelectItem value="piece">piece</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <FormField
                            control={form.control}
                            name="dailyMeals.breakfast.calories"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Calories</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="dailyMeals.breakfast.protein"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Protein (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.1"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="dailyMeals.breakfast.carbs"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Carbs (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.1"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="dailyMeals.breakfast.fat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fat (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.1"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="lunch" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dailyMeals.lunch.name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Meal Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Lunch name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="dailyMeals.lunch.servingSize"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Serving Size</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      step="0.1"
                                      {...field}
                                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="dailyMeals.lunch.servingUnit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select unit" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="g">g</SelectItem>
                                      <SelectItem value="oz">oz</SelectItem>
                                      <SelectItem value="cup">cup</SelectItem>
                                      <SelectItem value="tbsp">tbsp</SelectItem>
                                      <SelectItem value="serving">serving</SelectItem>
                                      <SelectItem value="bowl">bowl</SelectItem>
                                      <SelectItem value="plate">plate</SelectItem>
                                      <SelectItem value="piece">piece</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <FormField
                            control={form.control}
                            name="dailyMeals.lunch.calories"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Calories</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="dailyMeals.lunch.protein"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Protein (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.1"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="dailyMeals.lunch.carbs"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Carbs (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.1"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="dailyMeals.lunch.fat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fat (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.1"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="dinner" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="dailyMeals.dinner.name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Meal Name</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Dinner name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="dailyMeals.dinner.servingSize"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Serving Size</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      min="0" 
                                      step="0.1"
                                      {...field}
                                      onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="dailyMeals.dinner.servingUnit"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit</FormLabel>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select unit" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="g">g</SelectItem>
                                      <SelectItem value="oz">oz</SelectItem>
                                      <SelectItem value="cup">cup</SelectItem>
                                      <SelectItem value="tbsp">tbsp</SelectItem>
                                      <SelectItem value="serving">serving</SelectItem>
                                      <SelectItem value="bowl">bowl</SelectItem>
                                      <SelectItem value="plate">plate</SelectItem>
                                      <SelectItem value="piece">piece</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <FormField
                            control={form.control}
                            name="dailyMeals.dinner.calories"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Calories</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    {...field}
                                    onChange={e => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="dailyMeals.dinner.protein"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Protein (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.1"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="dailyMeals.dinner.carbs"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Carbs (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.1"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="dailyMeals.dinner.fat"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Fat (g)</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.1"
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="snacks" className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Snacks</h4>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setIsAddingSnack(true)}
                              >
                                <Plus className="mr-1 h-4 w-4" />
                                Add Snack
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Snack</DialogTitle>
                                <DialogDescription>
                                  Add a new snack to the meal plan
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Name</label>
                                  <Input 
                                    value={newSnack.name} 
                                    onChange={e => setNewSnack({...newSnack, name: e.target.value})}
                                    placeholder="Snack name" 
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm font-medium">Serving Size</label>
                                    <Input 
                                      type="number"
                                      value={newSnack.servingSize} 
                                      onChange={e => setNewSnack({...newSnack, servingSize: parseFloat(e.target.value) || 0})}
                                      min="0"
                                      step="0.1"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Unit</label>
                                    <Select
                                      value={newSnack.servingUnit}
                                      onValueChange={value => setNewSnack({...newSnack, servingUnit: value})}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select unit" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="g">g</SelectItem>
                                        <SelectItem value="oz">oz</SelectItem>
                                        <SelectItem value="cup">cup</SelectItem>
                                        <SelectItem value="tbsp">tbsp</SelectItem>
                                        <SelectItem value="serving">serving</SelectItem>
                                        <SelectItem value="piece">piece</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm font-medium">Calories</label>
                                    <Input 
                                      type="number"
                                      value={newSnack.calories} 
                                      onChange={e => setNewSnack({...newSnack, calories: parseInt(e.target.value) || 0})}
                                      min="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Protein (g)</label>
                                    <Input 
                                      type="number"
                                      value={newSnack.protein} 
                                      onChange={e => setNewSnack({...newSnack, protein: parseFloat(e.target.value) || 0})}
                                      min="0"
                                      step="0.1"
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm font-medium">Carbs (g)</label>
                                    <Input 
                                      type="number"
                                      value={newSnack.carbs} 
                                      onChange={e => setNewSnack({...newSnack, carbs: parseFloat(e.target.value) || 0})}
                                      min="0"
                                      step="0.1"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Fat (g)</label>
                                    <Input 
                                      type="number"
                                      value={newSnack.fat} 
                                      onChange={e => setNewSnack({...newSnack, fat: parseFloat(e.target.value) || 0})}
                                      min="0"
                                      step="0.1"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <DialogFooter>
                                <Button
                                  onClick={handleAddSnack}
                                  disabled={!newSnack.name}
                                >
                                  Add Snack
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          {/* Add Custom Meal Dialog */}
                          <Dialog open={isAddingCustomMeal} onOpenChange={setIsAddingCustomMeal}>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Custom Meal</DialogTitle>
                                <DialogDescription>
                                  Add a custom meal to supplement the core nutrition plan
                                </DialogDescription>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Meal Name</label>
                                  <Input 
                                    placeholder="Enter meal name"
                                    value={newCustomMeal.name} 
                                    onChange={e => setNewCustomMeal({...newCustomMeal, name: e.target.value})}
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm font-medium">Type</label>
                                    <Select
                                      value={newCustomMeal.type}
                                      onValueChange={value => setNewCustomMeal({...newCustomMeal, type: value})}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pre-workout">Pre-Workout</SelectItem>
                                        <SelectItem value="post-workout">Post-Workout</SelectItem>
                                        <SelectItem value="mid-morning">Mid-Morning</SelectItem>
                                        <SelectItem value="afternoon">Afternoon</SelectItem>
                                        <SelectItem value="evening">Evening</SelectItem>
                                        <SelectItem value="bedtime">Bedtime</SelectItem>
                                        <SelectItem value="custom">Custom</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div>
                                    <label className="text-sm font-medium">Order</label>
                                    <Select
                                      value={String(newCustomMeal.order)}
                                      onValueChange={value => setNewCustomMeal({...newCustomMeal, order: parseInt(value)})}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="When to consume" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="1">Before Breakfast</SelectItem>
                                        <SelectItem value="2">Between Breakfast and Lunch</SelectItem>
                                        <SelectItem value="3">Between Lunch and Dinner</SelectItem>
                                        <SelectItem value="4">After Dinner</SelectItem>
                                        <SelectItem value="5">Before Bed</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm font-medium">Serving Size</label>
                                    <Input 
                                      type="number"
                                      value={newCustomMeal.servingSize} 
                                      onChange={e => setNewCustomMeal({...newCustomMeal, servingSize: parseFloat(e.target.value) || 0})}
                                      min="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Serving Unit</label>
                                    <Input 
                                      value={newCustomMeal.servingUnit} 
                                      onChange={e => setNewCustomMeal({...newCustomMeal, servingUnit: e.target.value})}
                                      placeholder="g, oz, scoop, etc."
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm font-medium">Calories</label>
                                    <Input 
                                      type="number"
                                      value={newCustomMeal.calories} 
                                      onChange={e => setNewCustomMeal({...newCustomMeal, calories: parseInt(e.target.value) || 0})}
                                      min="0"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Protein (g)</label>
                                    <Input 
                                      type="number"
                                      value={newCustomMeal.protein} 
                                      onChange={e => setNewCustomMeal({...newCustomMeal, protein: parseFloat(e.target.value) || 0})}
                                      min="0"
                                      step="0.1"
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm font-medium">Carbs (g)</label>
                                    <Input 
                                      type="number"
                                      value={newCustomMeal.carbs} 
                                      onChange={e => setNewCustomMeal({...newCustomMeal, carbs: parseFloat(e.target.value) || 0})}
                                      min="0"
                                      step="0.1"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium">Fat (g)</label>
                                    <Input 
                                      type="number"
                                      value={newCustomMeal.fat} 
                                      onChange={e => setNewCustomMeal({...newCustomMeal, fat: parseFloat(e.target.value) || 0})}
                                      min="0"
                                      step="0.1"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <DialogFooter>
                                <Button
                                  onClick={handleAddCustomMeal}
                                  disabled={!newCustomMeal.name}
                                >
                                  Add Custom Meal
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                        
                        {snackFields.length === 0 ? (
                          <div className="text-center py-4 border border-dashed rounded-md">
                            <p className="text-sm text-muted-foreground">No snacks added yet</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {snackFields.map((field, index) => {
                              const snack = form.getValues(`dailyMeals.snacks.${index}`);
                              return (
                                <div 
                                  key={field.id} 
                                  className="flex items-center justify-between p-3 border rounded-md bg-muted/30"
                                >
                                  <div>
                                    <p className="font-medium text-sm">{snack.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {snack.servingSize} {snack.servingUnit} · {snack.calories} kcal
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      P: {snack.protein}g | C: {snack.carbs}g | F: {snack.fat}g
                                    </p>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => removeSnack(index)}
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Custom Meals Section - Display */}
                        <div className="mt-8 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-medium flex items-center">
                              <Coffee className="h-4 w-4 mr-2 text-purple-500" />
                              Custom Meals
                            </h3>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => setIsAddingCustomMeal(true)}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Custom Meal
                            </Button>
                          </div>
                          
                          {!customMealFields || customMealFields.length === 0 ? (
                            <div className="text-center py-4 border border-dashed rounded-md">
                              <p className="text-sm text-muted-foreground">No custom meals added yet</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Custom meals like pre-workout, post-workout, or specific timed nutrition can be added here
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {customMealFields.map((field, index) => {
                                const customMeal = form.getValues(`dailyMeals.customMeals.${index}`);
                                const mealTypeLabel = {
                                  'pre-workout': 'Pre-Workout',
                                  'post-workout': 'Post-Workout',
                                  'mid-morning': 'Mid-Morning',
                                  'afternoon': 'Afternoon',
                                  'evening': 'Evening',
                                  'bedtime': 'Bedtime',
                                  'custom': 'Custom'
                                }[customMeal.type] || 'Custom';
                                
                                const mealOrderLabel = {
                                  1: 'Before Breakfast',
                                  2: 'Between Breakfast and Lunch',
                                  3: 'Between Lunch and Dinner',
                                  4: 'After Dinner',
                                  5: 'Before Bed'
                                }[customMeal.order] || '';
                                
                                return (
                                  <div 
                                    key={field.id} 
                                    className="flex items-center justify-between p-3 border rounded-md bg-purple-50 dark:bg-purple-900/20"
                                  >
                                    <div>
                                      <div className="flex items-center">
                                        <p className="font-medium text-sm">{customMeal.name}</p>
                                        <Badge variant="outline" className="ml-2 text-xs">{mealTypeLabel}</Badge>
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {mealOrderLabel} · {customMeal.servingSize} {customMeal.servingUnit} · {customMeal.calories} kcal
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        P: {customMeal.protein}g | C: {customMeal.carbs}g | F: {customMeal.fat}g
                                      </p>
                                    </div>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => removeCustomMeal(index)}
                                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                    
                    <Separator />
                    
                    {/* Daily Nutrition Summary */}
                    <div className="space-y-3">
                      <h3 className="text-base font-medium">Daily Nutrition Summary</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3 text-center">
                          <p className="text-xs text-muted-foreground">Total Calories</p>
                          <p className="text-lg font-semibold">{dailyNutrition.calories}</p>
                          <p className="text-xs text-muted-foreground">kcal/day</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
                          <p className="text-xs text-muted-foreground">Total Protein</p>
                          <p className="text-lg font-semibold">{dailyNutrition.protein}</p>
                          <p className="text-xs text-muted-foreground">g/day</p>
                        </div>
                        <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-3 text-center">
                          <p className="text-xs text-muted-foreground">Total Carbs</p>
                          <p className="text-lg font-semibold">{dailyNutrition.carbs}</p>
                          <p className="text-xs text-muted-foreground">g/day</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3 text-center">
                          <p className="text-xs text-muted-foreground">Total Fat</p>
                          <p className="text-lg font-semibold">{dailyNutrition.fat}</p>
                          <p className="text-xs text-muted-foreground">g/day</p>
                        </div>
                      </div>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="mealNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meal Plan Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Add any notes about the meal plan"
                              rows={4}
                            />
                          </FormControl>
                          <FormDescription>
                            These notes will be visible to your client
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-between pt-4">
                <Button variant="outline" type="button" onClick={() => setActiveTab("workout")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Workout Plan
                </Button>
                
                <Button 
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {isEdit ? 'Update Plan' : 'Save Plan'}
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
      </div>
    );
  } catch (error: any) {
    console.error('Error rendering EnhancedTrainerPlanCreation component:', error);
    setHasError(true);
    setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    return <ErrorDisplay error={error instanceof Error ? error.message : 'An unknown error occurred'} resetError={resetError} />;
  }
}