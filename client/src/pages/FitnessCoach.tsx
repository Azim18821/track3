import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
// Import shopping types and utilities from the central type definitions
import { 
  processShoppingItems,
  groupShoppingItemsByDay,
  type ShoppingItem,
  type DailyShoppingGroup
} from '@/utils/shopping/shoppingUtils';
import { ShoppingList, StoreRecommendationCard } from '@/components/shopping/ShoppingList';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

// Using lucide-react icons instead of custom SVG declarations
// Custom icon component replaced with lucide-react import
// Import both dialog types to support migration
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";

// Import the adaptive dialog that provides better PWA support
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogFooter,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
  AdaptiveDialogTrigger
} from "@/components/ui/adaptive-dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel,
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowRight, 
  Calendar, 
  CalendarDays,
  Check, 
  Clock, 
  Dumbbell, 
  Filter, 
  Info,
  Key, 
  Loader2,
  Lock,
  LockIcon, 
  Settings, 
  ShoppingCart as ShoppingCartIcon, 
  Sparkles, 
  Unlock,
  Utensils, 
  UserPlus, 
  UserRound, 
  X 
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useUser } from '@/hooks/use-user';
import ProgressTracker from '@/components/progress/ProgressTracker';
import useMobileDetect from '@/hooks/use-mobile-detect';
import WorkoutPlanView from '@/components/fitness/WorkoutPlanView';
import MealPlanView from '@/components/fitness/MealPlanView';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { getPlanCardGradient } from '@/lib/gradients';
import { CustomNumberInput } from '@/components/fitness/CustomNumberInput';
import MacroCalculator from '@/components/MacroCalculator';
import { generatePreferredWorkoutDays } from '@/utils/workoutDays';
import { Switch } from '@/components/ui/switch';
import { PlanGenerationStep } from '@/types/plan-generation';

// Simple utility to log when the generation status changes
function logStatusChange(message: string): void {
  console.log(`[Plan Generation Status] ${message}`);
}

// Plan generation global state
const isPlanGeneratingKey = 'fitness_plan_generating';
let isPlanGenerating = false;

// Utility function to check if a plan is currently being generated
export async function checkIfPlanGeneratingAsync(): Promise<boolean> {
  try {
    logStatusChange('Checking plan generation status with server');
    
    // Always prioritize server-side status over localStorage
    // If server says no generation is running, we clear localStorage
    const response = await fetch('/api/fitness-plans/generation-progress', { credentials: 'include' });
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const serverSideGenerating = data && data.isGenerating;
    
    logStatusChange('Server status: ' + JSON.stringify(data));
    console.log(`[Plan Debug] Generation status: isGenerating=${serverSideGenerating}, step=${data.currentStep}, time=${new Date().toISOString()}`);
    
    // Local storage status check
    const startTimeStr = localStorage.getItem(isPlanGeneratingKey);
    let clientSideGenerating = false;
    
    if (startTimeStr) {
      const startTime = parseInt(startTimeStr, 10);
      if (!isNaN(startTime)) {
        const now = Date.now();
        const elapsedMinutes = (now - startTime) / (1000 * 60);
        
        // Immediate timeout for stale generations
        if (elapsedMinutes > 10) {
          logStatusChange(`Plan generation appears stale (${elapsedMinutes.toFixed(2)} minutes old). Clearing local state.`);
          localStorage.removeItem(isPlanGeneratingKey);
          clientSideGenerating = false;
        } else {
          clientSideGenerating = true;
        }
      }
    }
    
    // Handle state inconsistencies - server is the source of truth
    if (clientSideGenerating && !serverSideGenerating) {
      logStatusChange('Server reports generation completed or not started, but client thinks it\'s generating. Updating state.');
      localStorage.removeItem(isPlanGeneratingKey);
      return false;
    } else if (!clientSideGenerating && serverSideGenerating) {
      logStatusChange('Server reports active generation but client has no record. Updating local state.');
      localStorage.setItem(isPlanGeneratingKey, Date.now().toString());
      return true;
    }
    
    // Server status is the source of truth
    return serverSideGenerating;
  } catch (error) {
    console.error('Error checking plan status:', error);
    
    // On error, check if the plan has been running for too long
    const startTimeStr = localStorage.getItem(isPlanGeneratingKey);
    if (startTimeStr) {
      const startTime = parseInt(startTimeStr, 10);
      if (!isNaN(startTime)) {
        const now = Date.now();
        const elapsedMinutes = (now - startTime) / (1000 * 60);
        
        if (elapsedMinutes > 10) {
          logStatusChange(`Plan generation appears stale (${elapsedMinutes.toFixed(2)} minutes old). Clearing local state.`);
          localStorage.removeItem(isPlanGeneratingKey);
          return false;
        }
      }
    }
    
    // Fall back to client-side state if server check fails
    return startTimeStr !== null;
  }
}

// Synchronous version of checkIfPlanGenerating for initial state setting
export function checkIfPlanGenerating(): boolean {
  try {
    // Always initiate a background check with server - don't just trust localStorage
    checkIfPlanGeneratingAsync().then(isGenerating => {
      // Trust the server's response
      if (isGenerating) {
        if (!localStorage.getItem(isPlanGeneratingKey)) {
          logStatusChange('Server reports plan is generating but local storage had no record. Updating state.');
          localStorage.setItem(isPlanGeneratingKey, Date.now().toString());
        }
        isPlanGenerating = true;
      } else {
        if (localStorage.getItem(isPlanGeneratingKey)) {
          logStatusChange('Server reports no plan is generating but local storage had a record. Clearing state.');
          localStorage.removeItem(isPlanGeneratingKey);
        }
        isPlanGenerating = false;
      }
    }).catch(err => {
      // Only log the error, don't change state based on server errors
      console.error("Background plan status check error:", err);
    });
  
    // For immediate response: check if the localStorage entry is stale
    const startTimeStr = localStorage.getItem(isPlanGeneratingKey);
    if (startTimeStr) {
      const startTime = parseInt(startTimeStr, 10);
      if (!isNaN(startTime)) {
        const now = Date.now();
        const elapsedMinutes = (now - startTime) / (1000 * 60);
        
        // If more than 10 minutes have passed, we assume the generation timed out
        if (elapsedMinutes > 10) {
          logStatusChange(`Plan generation appears stale (${elapsedMinutes.toFixed(2)} minutes old). Clearing local state.`);
          localStorage.removeItem(isPlanGeneratingKey);
          return false;
        }
        
        // If not stale, return true but let the async check possibly update later
        return true;
      }
    }
  } catch (e) {
    console.error("Error in checkIfPlanGenerating:", e);
  }
  
  // If no valid local storage item or any errors, default to not generating
  return false;
}

// Set global state when a plan starts generating
export function setPlanGenerating(isGenerating: boolean): void {
  logStatusChange(`Setting plan generating state to: ${isGenerating}`);
  isPlanGenerating = isGenerating;
  if (isGenerating) {
    localStorage.setItem(isPlanGeneratingKey, Date.now().toString());
  } else {
    localStorage.removeItem(isPlanGeneratingKey);
    // Also verify with server
    fetch('/api/fitness-plans/generation-progress', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data && data.isGenerating) {
          logStatusChange(`Warning: Server still shows plan is generating (${data.currentStep || 'unknown'} step) despite local state being cleared.`);
          // Note: Components will need to check server status and show appropriate UI
        }
      })
      .catch(err => {
        console.error('[Plan Status] Failed to verify server-side generation status:', err);
      });
  }
}

// Reset plan generation state on both client and server
export async function resetPlanGeneration(): Promise<boolean> {
  try {
    logStatusChange('Attempting to reset plan generation state');
    
    // Reset client-side state
    localStorage.removeItem(isPlanGeneratingKey);
    isPlanGenerating = false;
    
    // Reset server-side state
    const response = await fetch('/api/fitness-plans/reset-generation', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    logStatusChange(`Server reset result: ${JSON.stringify(result)}`);
    return true;
  } catch (error) {
    console.error('[Plan Reset] Failed to reset plan generation state:', error);
    return false;
  }
}

// Check if a plan is generating on load
isPlanGenerating = checkIfPlanGenerating();

// Define the fitness preferences schema for the form
const fitnessPrefsSchema = z.object({
  goal: z.string({
    required_error: "Please select a fitness goal",
  }),
  currentWeight: z.number({
    required_error: "Please enter your current weight",
  }),
  targetWeight: z.number().optional(),
  unit: z.string({
    required_error: "Please select a unit",
  }),
  age: z.number({
    required_error: "Please enter your age",
  }).min(16, "You must be at least 16 years old").max(100, "Please enter a valid age"),
  height: z.number({
    required_error: "Please enter your height",
  }),
  gender: z.string({
    required_error: "Please select your gender",
  }),
  workoutDaysPerWeek: z.number({
    required_error: "Please select how many days per week you want to workout",
  }).min(1, "You must work out at least 1 day per week").max(7, "You can't work out more than 7 days per week"),
  dietaryRestrictions: z.array(z.string()).default([]),
  preferredFoods: z.array(z.string()).default([]),
  fitnessLevel: z.string({
    required_error: "Please select your fitness level",
  }),
  budget: z.union([z.number(), z.string()]).optional(),
  budgetType: z.string().optional(),
  preferredStore: z.string().optional(),
  // Additional fields for workout preferences
  preferredWorkoutDays: z.array(z.string()),
  workoutDuration: z.number().min(15, "Workouts should be at least 15 minutes").max(120, "Workouts should be at most 120 minutes").optional(),
  // Email notification preferences
  notifyByEmail: z.boolean().default(true),
  email: z.string().email("Please enter a valid email address").optional(),
  // Extended fields from profile
  healthGoals: z.array(z.string()).optional(),
  trainingStyle: z.array(z.string()).optional(),
  existingConditions: z.array(z.string()).optional(),
  useAdaptiveAI: z.boolean().default(true),
});

// Derived type for the form
type FitnessPrefs = z.infer<typeof fitnessPrefsSchema>;

// Interface for the coach API input
interface CoachInput {
  age: number;
  sex: 'male' | 'female';
  height: number; // in cm
  weight: number; // in kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
  fitnessGoal: 'weight_loss' | 'muscle_gain' | 'strength' | 'stamina' | 'endurance';
  dietaryPreferences: string[]; // e.g., ['vegetarian', 'halal', 'no seafood']
  weeklyBudget: number | string; // numeric value or budget type like 'economy', 'standard', 'premium'
  preferredStore?: string; // e.g., 'tesco', 'sainsburys', 'asda', etc.
  location?: string; // optional postcode or city
  // Workout schedule preferences
  workoutDaysPerWeek: number; // Number of days to work out (1-7)
  preferredWorkoutDays?: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']
  workoutDuration?: number; // Preferred workout duration in minutes
  workoutNames?: Record<string, string>; // e.g., { "Monday": "Chest Day", "Tuesday": "Leg Day" }
  // Email notification preferences
  notifyByEmail?: boolean; // Whether to send email notifications
  email?: string; // User's email address for notifications
}

export default function FitnessCoach() {
  const { user } = useUser();
  const { toast } = useToast();
  const isMobile = useMobileDetect();
  const [step, setStep] = useState<number>(1);
  
  // Additional form state
  const [dietaryRestrictionInput, setDietaryRestrictionInput] = useState<string>('');
  const [preferredFoodInput, setPreferredFoodInput] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [eligibilityStatus, setEligibilityStatus] = useState<{
    canCreate: boolean;
    daysRemaining?: number;
    message?: string;
    hasTrainer?: boolean;
    globallyDisabled?: boolean;
  }>({
    canCreate: true,
    daysRemaining: undefined,
    message: undefined,
    hasTrainer: undefined,
    globallyDisabled: undefined
  });
  const [redirecting, setRedirecting] = useState<boolean>(false);
  
  // State to track which fields should be read-only (from onboarding)
  const [readOnlyFields, setReadOnlyFields] = useState<{
    [key: string]: boolean;
  }>({});
  
  // State to track whether form is locked or editable - default to locked
  const [isFormLocked, setIsFormLocked] = useState<boolean>(true);
  
  // State to track plan generation progress with enhanced details
  const [generationProgress, setGenerationProgress] = useState<{
    isGenerating: boolean;
    step: number;
    statusMessage: string;
    estimatedTimeRemaining: number;
    errorMessage?: string | null;
    totalSteps?: number;
    elapsedTime?: number;
    isComplete?: boolean;
  }>({
    isGenerating: false,
    step: 0,
    statusMessage: '',
    estimatedTimeRemaining: 0,
    errorMessage: null,
    totalSteps: 5
  });
  
  // Timer refs for progress updates
  const progressTimerRefs = useRef<any[]>([]);
  
  // Ref to track form scroll position
  const formRef = useRef<HTMLFormElement>(null);
  
  // Reference for the dialog to ensure focus gets locked properly
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  
  // Reference for the scroll area to scroll to top when changing steps
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // Navigation hooks
  const [, setLocation] = useLocation();
  
  // Define form with validation schema
  const form = useForm<FitnessPrefs>({
    resolver: zodResolver(fitnessPrefsSchema),
    defaultValues: {
      goal: "",
      currentWeight: undefined,
      targetWeight: undefined,
      unit: "kg",
      age: undefined,
      height: undefined,
      gender: "",
      workoutDaysPerWeek: 4,
      dietaryRestrictions: [],
      preferredFoods: [],
      fitnessLevel: "",
      budget: "medium",
      budgetType: "medium",
      preferredStore: "tesco",
      preferredWorkoutDays: [],
      workoutDuration: 60,
      notifyByEmail: true,
      email: "",
      healthGoals: [],
      trainingStyle: [],
      existingConditions: [],
      useAdaptiveAI: true
    }
  });
  
  // Query to check if a user is eligible to generate a new plan
  const { data: eligibility, isLoading: eligibilityLoading } = useQuery({
    queryKey: ['/api/fitness-plans/eligibility'],
    retry: false
  });
  
  // Query to fetch the active fitness plan
  const { data: activePlan, isLoading: planLoading } = useQuery<Record<string, any> | null>({
    queryKey: ['/api/fitness-plans/active'],
    retry: false,
    // Make sure we don't get a stale plan after deactivation
    staleTime: 0
  });
  
  // Function to check generation progress with the server
  const checkGenerationProgressWithServer = useCallback(async () => {
    try {
      logStatusChange("Checking plan generation status with server");
      
      const response = await fetch('/api/fitness-plans/generation-progress', { 
        credentials: 'include',
        cache: 'no-cache' // Ensure we always get fresh data
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      
      const serverStatus = await response.json();
      logStatusChange(`Server status: ${JSON.stringify(serverStatus)}`);
      
      // Add more detailed debug logging for plan generation
      console.log(`[Plan Debug] Generation status: isGenerating=${serverStatus.isGenerating}, step=${serverStatus.currentStep}, time=${new Date().toISOString()}`);
      
      // Update local state based on server status
      if (serverStatus) {
        if (serverStatus.isGenerating) {
          // Update local generation flag if needed
          if (!isPlanGenerating) {
            setPlanGenerating(true);
          }
          
          // Update progress state with server data
          setGenerationProgress(prev => ({
            ...prev,
            isGenerating: true,
            step: serverStatus.currentStep || prev.step,
            statusMessage: serverStatus.statusMessage || "Plan generation in progress...",
            estimatedTimeRemaining: serverStatus.estimatedTimeRemaining || prev.estimatedTimeRemaining,
            totalSteps: serverStatus.totalSteps || prev.totalSteps
          }));
        } else if (!serverStatus.isGenerating && isPlanGenerating) {
          // Server says not generating but client thinks it is - resolve the inconsistency
          logStatusChange("Server reports generation completed or not started, but client thinks it's generating. Updating state.");
          setPlanGenerating(false);
          setGenerationProgress(prev => ({
            ...prev,
            isGenerating: false,
            statusMessage: "Plan generation not active",
            step: 0
          }));
        }
      }
      
      return serverStatus;
    } catch (error) {
      console.error("Error checking generation progress with server:", error);
      return null;
    }
  }, [isPlanGenerating]);
  
  // Function to check plan generation progress 
  const checkGenerationProgress = useCallback(async () => {
    try {
      // Check with the server for current status
      const serverStatus = await checkGenerationProgressWithServer();
      
      if (!serverStatus) {
        // If server check failed, use client side fallback with timeout logic
        const startTimeStr = localStorage.getItem(isPlanGeneratingKey);
        if (startTimeStr) {
          const startTime = parseInt(startTimeStr, 10);
          const now = Date.now();
          const elapsedMinutes = (now - startTime) / (1000 * 60);
          
          // If more than 10 minutes have passed, we assume the generation timed out
          if (elapsedMinutes > 10) {
            logStatusChange('Plan generation appears stale (timeout). Clearing generation state.');
            setPlanGenerating(false);
            localStorage.removeItem(isPlanGeneratingKey);
            
            setGenerationProgress({
              isGenerating: false,
              step: 0,
              statusMessage: 'Plan generation timed out',
              estimatedTimeRemaining: 0,
              errorMessage: 'Generation took too long and timed out. Please try again.',
              totalSteps: 5
            });
          }
        }
      }
    } catch (error) {
      console.error('Error in checkGenerationProgress:', error);
    }
  }, [checkGenerationProgressWithServer]);
  
  // Check current generation status on component mount
  useEffect(() => {
    const checkInitialStatus = async () => {
      // First, check with the server for the true status
      const serverStatus = await checkGenerationProgressWithServer();
      
      // If client thinks a plan is generating or server confirms it
      if (isPlanGenerating || (serverStatus && serverStatus.isGenerating)) {
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: true,
          statusMessage: "Checking plan generation status..."
        }));
        
        // Start a timer to check progress
        const timerId = setInterval(() => {
          checkGenerationProgress();
          
          // Also verify with server periodically to keep in sync
          if (progressTimerRefs.current.length % 5 === 0) { // Every ~15 seconds
            checkGenerationProgressWithServer();
          }
        }, 3000); // Check every 3 seconds
        
        progressTimerRefs.current.push(timerId);
        
        // Clear timer on unmount
        return () => {
          clearInterval(timerId);
        };
      }
    };
    
    checkInitialStatus();
    
    // Also set up recurring verification with server every 30 seconds
    const serverSyncTimerId = setInterval(() => {
      checkGenerationProgressWithServer();
    }, 30000);
    
    progressTimerRefs.current.push(serverSyncTimerId);
    
    return () => {
      // Clean up all timers
      progressTimerRefs.current.forEach(timerId => clearInterval(timerId));
      progressTimerRefs.current = [];
    };
  }, [checkGenerationProgress, checkGenerationProgressWithServer]);

  // Function to reset plan generation state
  const resetPlanGeneration = async () => {
    // Show loading state
    setGenerationProgress(prev => ({
      ...prev,
      statusMessage: 'Resetting plan generation...',
      errorMessage: null
    }));
    
    // Reset server-side plan generation state via API using direct fetch with credentials
    try {
      const resetRes = await fetch('/api/step-coach/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include'
      });
      
      if (resetRes.ok) {
        console.log("Server-side plan generation state reset successfully");
        
        // Clear local state after successful server reset
        setPlanGenerating(false);
        setGenerationProgress({
          isGenerating: false,
          step: 0,
          statusMessage: '',
          estimatedTimeRemaining: 0,
          errorMessage: null,
          totalSteps: 5
        });
        
        // Clear localStorage flags
        localStorage.removeItem('fitness_plan_generating');
        
        // Re-fetch eligibility to ensure UI is up to date
        queryClient.invalidateQueries({ queryKey: ['/api/fitness-plans/eligibility'] });
        queryClient.invalidateQueries({ queryKey: ['/api/fitness-plans/active'] });
        
        // Show success message
        toast({
          title: "Reset Successful",
          description: "Plan generation state has been reset successfully. You can now create a new plan.",
          variant: "default",
        });
      } else {
        // Show error message for failed reset
        const errorText = await resetRes.text();
        console.error("Failed to reset server-side plan generation state:", errorText);
        
        setGenerationProgress(prev => ({
          ...prev,
          errorMessage: "Failed to reset plan generation. Please try again or contact support."
        }));
        
        toast({
          title: "Reset Failed",
          description: "Failed to reset plan generation state. Please try again or contact support.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error resetting plan generation state:", error);
      
      // Update UI to show error
      setGenerationProgress(prev => ({
        ...prev,
        errorMessage: "Error resetting plan generation. Please try again or contact support."
      }));
      
      toast({
        title: "Reset Error",
        description: "An error occurred while resetting plan generation state.",
        variant: "destructive",
      });
    }
  };

  // Function to handle starting plan generation
  const handleStartPlanGeneration = async () => {
    try {
      // Get form values
      const values = form.getValues();
      console.log("Form values:", values);
      
      // Validate the form before proceeding
      const isValid = await form.trigger();
      if (!isValid) {
        console.log("Form validation errors:", form.formState.errors);
        toast({
          title: "Form Error",
          description: "Please complete all required fields correctly.",
          variant: "destructive",
        });
        return;
      }
      
      // Additional validation for preferred workout days
      const workoutDaysPerWeek = values.workoutDaysPerWeek || 0;
      const preferredWorkoutDays = values.preferredWorkoutDays || [];
      
      if (preferredWorkoutDays.length !== workoutDaysPerWeek) {
        toast({
          title: "Workout Days Error",
          description: `You must select exactly ${workoutDaysPerWeek} workout days. You've selected ${preferredWorkoutDays.length}. Please go back to Step 3 and select the correct number of workout days.`,
          variant: "destructive",
        });
        
        // Set the form step back to the workout days selection
        setStep(3);
        return;
      }
      
      // Set the generation flag in local storage
      setPlanGenerating(true);
      localStorage.setItem('fitness_plan_generating', Date.now().toString());
      
      // Update the progress state
      setGenerationProgress({
        isGenerating: true,
        step: 0,
        statusMessage: "Starting plan generation...",
        estimatedTimeRemaining: 60, // Initial estimate of 60 seconds
        totalSteps: 5,
      });
      
      // Prepare input data for the API
      const fitnessPreferences: FitnessPrefs = {
        // Form values with proper defaults
        goal: values.goal || "weight_loss",
        currentWeight: values.currentWeight || 70,
        targetWeight: values.targetWeight || values.currentWeight || 70,
        unit: values.unit || "kg",
        age: values.age || 30,
        height: values.height || 170,
        gender: values.gender || "male",
        workoutDaysPerWeek: values.workoutDaysPerWeek || 3,
        dietaryRestrictions: values.dietaryRestrictions || [],
        preferredFoods: values.preferredFoods || [],
        fitnessLevel: values.fitnessLevel || "beginner",
        budget: values.budget || "medium",
        budgetType: values.budgetType || "medium",
        preferredStore: values.preferredStore || "tesco",
        preferredWorkoutDays: values.preferredWorkoutDays || [],
        workoutDuration: values.workoutDuration || 60,
        notifyByEmail: values.notifyByEmail || false,
        email: values.email || "",
        healthGoals: values.healthGoals || [],
        trainingStyle: values.trainingStyle || [],
        existingConditions: values.existingConditions || [],
        useAdaptiveAI: values.useAdaptiveAI || true
      };
      
      // Generate fitness plan
      generatePlanMutation.mutate(fitnessPreferences);
      
      // Close the dialog
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error starting plan generation:", error);
      toast({
        title: "Error",
        description: "Failed to start plan generation. Please try again.",
        variant: "destructive",
      });
      
      // Reset the generation state
      setPlanGenerating(false);
      localStorage.removeItem('fitness_plan_generating');
    }
  };
  
  // Update eligibility state when data changes
  useEffect(() => {
    if (eligibility) {
      // Cast to the correct type
      const eligibilityData = eligibility as {
        canCreate: boolean;
        daysRemaining?: number;
        message?: string;
        hasTrainer?: boolean;
        globallyDisabled?: boolean;
      };
      setEligibilityStatus(eligibilityData);
    }
  }, [eligibility]);
  
  // Update form with user profile data if available
  useEffect(() => {
    if (user) {
      const formUpdates: Partial<FitnessPrefs> = {};
      const readOnly: { [key: string]: boolean } = {};
      
      // If user has weight, height, gender etc set in profile, use those
      if (user.gender && ['male', 'female', 'other'].includes(user.gender)) {
        formUpdates.gender = user.gender;
        readOnly.gender = true;
      }
      
      if (user.dateOfBirth) {
        const dob = new Date(user.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        
        if (age >= 16 && age <= 100) {
          formUpdates.age = age;
          readOnly.age = true;
        }
      }
      
      if (user.height && user.height > 0) {
        formUpdates.height = user.height;
        formUpdates.unit = 'kg'; // If user has height, use metric units
        readOnly.height = true;
        readOnly.unit = true;
      }
      
      if (user.weight && user.weight > 0) {
        formUpdates.currentWeight = user.weight;
        formUpdates.unit = 'kg';
        readOnly.currentWeight = true;
        readOnly.unit = true;
      }
      
      if (user.email) {
        formUpdates.email = user.email;
      }
      
      // Additional profile fields if available
      // Check if user has dietary preferences set (cast to any to avoid TypeScript errors)
      const userAny = user as any;
      
      if (userAny.dietaryPreferences && Array.isArray(userAny.dietaryPreferences)) {
        formUpdates.dietaryRestrictions = userAny.dietaryPreferences;
      }
      
      if (userAny.preferredFoods && Array.isArray(userAny.preferredFoods)) {
        formUpdates.preferredFoods = userAny.preferredFoods;
      }
      
      if (userAny.fitnessLevel && ['beginner', 'intermediate', 'advanced'].includes(userAny.fitnessLevel)) {
        formUpdates.fitnessLevel = userAny.fitnessLevel;
        // Removed readOnly setting for fitnessLevel to allow editing
      }
      
      if (userAny.healthGoals && Array.isArray(userAny.healthGoals)) {
        formUpdates.healthGoals = userAny.healthGoals;
      }
      
      if (userAny.trainingStyle && Array.isArray(userAny.trainingStyle)) {
        formUpdates.trainingStyle = userAny.trainingStyle;
      }
      
      if (userAny.existingConditions && Array.isArray(userAny.existingConditions)) {
        formUpdates.existingConditions = userAny.existingConditions;
      }
      
      if (Object.keys(formUpdates).length > 0) {
        console.log("Setting form defaults from user profile:", formUpdates);
        form.reset(formUpdates);
      }
      
      // Store which fields should be read-only
      setReadOnlyFields(readOnly);
    }
  }, [user, form]);
  
  // Check URL parameters for auto-starting plan generation
  useEffect(() => {
    // Only check if we have the user, not generating a plan already, and no active plan
    if (user && !isPlanGenerating && !planLoading && !activePlan) {
      const params = new URLSearchParams(window.location.search);
      const shouldGenerate = params.get('generate') === 'true';
      const goal = params.get('goal');
      
      if (shouldGenerate && goal) {
        // Auto-populate the goal field if provided
        form.setValue('goal', goal);
        
        // Open the dialog automatically
        setIsDialogOpen(true);
        
        // Set initial step based on what data is missing
        let startStep = 1;
        
        // Check if user has core data filled out
        const hasBasicInfo = form.getValues('gender') && 
                           form.getValues('age') && 
                           form.getValues('height') && 
                           form.getValues('currentWeight');
        
        if (hasBasicInfo) {
          startStep = 2; // Skip to workout preferences
          
          // Check if workout preferences are set
          const hasWorkoutPrefs = form.getValues('workoutDaysPerWeek') && 
                                form.getValues('fitnessLevel');
          
          if (hasWorkoutPrefs) {
            startStep = 3; // Skip to dietary preferences
            
            // Check if dietary preferences are set
            const hasDietaryPrefs = form.getValues('dietaryRestrictions') && 
                                  form.getValues('preferredFoods');
            
            if (hasDietaryPrefs) {
              startStep = 4; // Skip to workout schedule
            }
          }
        }
        
        setStep(startStep);
        
        // Clear URL parameters to prevent re-triggering on page refresh
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user, form, isPlanGenerating, planLoading, activePlan]);
  
  // Look for URL parameters for an auto-redirect to fitness plan view
  useEffect(() => {
    // If not loading and no active plan, check eligibility
    if (!planLoading && !activePlan && !redirecting) {
      // Case 1: Check if AI coach is globally disabled (using type assertion)
      const eligibilityData = eligibility as any;
      if (eligibility && !eligibilityLoading && eligibilityData.globallyDisabled && 
          user && !user.hasOwnProperty('isAdmin') && !user.hasOwnProperty('isTrainer')) {
        setRedirecting(true);
        toast({
          title: "AI Coach Disabled",
          description: "The AI Coach feature is currently disabled. Redirecting to coach page...",
          variant: "default",
        });
        
        // Redirect to coach page
        setTimeout(() => {
          setLocation("/coach");
        }, 1500);
      }
      // Case 2: No active plan (just redirect to coach page as requested)
      else if (!isPlanGenerating && !eligibilityLoading) {
        setRedirecting(true);
        toast({
          title: "No Active Plan",
          description: "You don't have an active fitness plan. Redirecting to coach page...",
          variant: "default",
        });
        
        // Redirect to coach page
        setTimeout(() => {
          setLocation("/coach");
        }, 1500);
      }
    }
  }, [planLoading, activePlan, eligibility, eligibilityLoading, user, setLocation, toast, redirecting, isPlanGenerating]);
  
  // Mutation to generate a new fitness plan using the coach endpoint
  const generatePlanMutation = useMutation({
    mutationFn: async (preferences: FitnessPrefs) => {
      // First, check eligibility before even starting generation
      const eligibilityResponse = await fetch('/api/fitness-plans/eligibility', {
        credentials: "include"
      });
      
      if (!eligibilityResponse.ok) {
        const errorData = await eligibilityResponse.json();
        
        // Special handling for time restrictions (429 Too Many Requests)
        if (eligibilityResponse.status === 429 && errorData.daysRemaining) {
          // Update the eligibility status directly
          setEligibilityStatus({
            canCreate: false,
            daysRemaining: errorData.daysRemaining,
            message: errorData.message || `You can only generate a fitness plan every ${errorData.daysRemaining} days.`
          });
          
          // Return early with a special object to signal we can't proceed
          return { limitReached: true, message: errorData.message };
        }
        
        // Other restrictions (like having a trainer)
        if (eligibilityResponse.status === 403) {
          throw new Error(errorData.message || 'You are not eligible to create a fitness plan');
        }
        
        throw new Error(errorData.message || 'Failed to check plan eligibility');
      }
      
      // If we get here, we're eligible to create a plan
      // Before claiming a plan is already generating, double-check with the server
      const planStatusResponse = await fetch('/api/fitness-plans/generation-progress', {
        credentials: "include"
      });
      
      const planStatusData = await planStatusResponse.json();
      console.log("[Plan Generation Status] Double-checking server status:", planStatusData);
      
      // If the server says no plan is generating but client thinks otherwise, reset the client state
      if (isPlanGenerating && !planStatusData.isGenerating) {
        console.log("[Plan Generation Status] Server reports no active generation but client thinks one is running. Fixing state.");
        setPlanGenerating(false);
        localStorage.removeItem('fitness_plan_generating');
      }
      // Only if both client and server agree there's a generation in progress
      else if (isPlanGenerating && planStatusData.isGenerating) {
        // Return an object to signal we're already generating
        return { 
          alreadyGenerating: true, 
          message: "A plan is already being generated. Please wait for it to complete." 
        };
      }
      
      // Set the global flag to indicate a plan is generating
      setPlanGenerating(true);
      
      // Save the start time to localStorage for timeout tracking
      localStorage.setItem('fitness_plan_generating', Date.now().toString());
      
      // Clear any existing timers
      progressTimerRefs.current.forEach(timer => clearTimeout(timer));
      progressTimerRefs.current = [];
      
      // Initialize progress tracking
      setGenerationProgress({
        isGenerating: true,
        step: 1,
        statusMessage: "Analyzing your preferences...",
        estimatedTimeRemaining: 60
      });
      
      // Define progress steps
      const progressSteps = [
        { step: 2, message: "Calculating nutrition requirements...", time: 45, delay: 8000 },
        { step: 3, message: "Creating personalized workout plan...", time: 30, delay: 20000 },
        { step: 4, message: "Designing your meal plan...", time: 15, delay: 35000 },
        { step: 5, message: "Finalizing your plan...", time: 5, delay: 50000 }
      ];
      
      // Schedule all progress updates
      progressSteps.forEach(({ step, message, time, delay }) => {
        const timer = setTimeout(() => {
          setGenerationProgress({
            isGenerating: true,
            step,
            statusMessage: message,
            estimatedTimeRemaining: time
          });
        }, delay);
        progressTimerRefs.current.push(timer);
      });
      
      // Convert budget value from form to numeric value or budget type
      let budgetValue: number | string = "medium"; // Default
      if (typeof preferences.budget === 'number' && !isNaN(preferences.budget)) {
        budgetValue = preferences.budget;
      } else if (typeof preferences.budget === 'string' && 
                ['economy', 'low', 'medium', 'standard', 'high', 'premium'].includes(preferences.budget)) {
        budgetValue = preferences.budget;
      } else if (preferences.budgetType && 
                ['economy', 'low', 'medium', 'standard', 'high', 'premium'].includes(preferences.budgetType)) {
        budgetValue = preferences.budgetType;
      }
      
      // Map activity level from fitnessLevel to activityLevel values
      let activityLevel: 'sedentary' | 'light' | 'moderate' | 'very_active' | 'extra_active';
      switch (preferences.fitnessLevel) {
        case 'beginner':
          activityLevel = 'light';
          break;
        case 'intermediate':
          activityLevel = 'moderate';
          break;
        case 'advanced':
          activityLevel = 'very_active';
          break;
        default:
          activityLevel = 'moderate';
      }
      
      // Map fitness goal
      const fitnessGoal = preferences.goal as 'weight_loss' | 'muscle_gain' | 'strength' | 'stamina' | 'endurance';
      
      // Combine dietary restrictions and preferred foods
      const dietaryPreferences = [
        ...preferences.dietaryRestrictions,
        ...preferences.preferredFoods
      ];
      
      // Convert height to cm if in lbs (which implies inches for height)
      const height = preferences.unit === 'lbs' && preferences.height 
        ? Math.round(preferences.height * 2.54) 
        : preferences.height || 175;
      
      // Convert weight to kg if in pounds
      const weight = preferences.unit === 'lbs' && preferences.currentWeight 
        ? Math.round(preferences.currentWeight / 2.2) 
        : preferences.currentWeight;
      
      // Create coach input
      const coachInput: CoachInput = {
        age: preferences.age || 30,
        sex: (preferences.gender === 'male' || preferences.gender === 'female') 
          ? preferences.gender 
          : 'male',
        height,
        weight,
        activityLevel,
        fitnessGoal,
        dietaryPreferences,
        weeklyBudget: budgetValue,
        // Include preferred grocery store for more accurate shopping list pricing
        preferredStore: preferences.preferredStore || 'aldi', // Default to Aldi if not specified
        // Include workout schedule preferences
        workoutDaysPerWeek: preferences.workoutDaysPerWeek,
        // Use the user-selected workout days from the form (fallback to generated ones if empty)
        preferredWorkoutDays: preferences.preferredWorkoutDays && preferences.preferredWorkoutDays.length > 0 
            ? preferences.preferredWorkoutDays 
            : generatePreferredWorkoutDays(preferences.workoutDaysPerWeek),
        workoutDuration: preferences.workoutDuration || 60, 
        // Let the AI generate workout names
        // No workout names are sent - AI will generate them
        // Include email notification preferences
        notifyByEmail: preferences.notifyByEmail,
        email: preferences.email,
      };
      
      console.log("Sending coach input:", coachInput);
      
      // Progress updates already scheduled above
      
      try {
        console.log("Starting step-by-step plan generation process...");
        // Start the step-by-step plan generation process using direct fetch with credentials
        const startRes = await fetch('/api/step-coach/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(coachInput),
          credentials: 'include'
        });
        
        console.log("Response from /api/step-coach/start:", {
          status: startRes.status,
          statusText: startRes.statusText,
          ok: startRes.ok
        });
        
        if (!startRes.ok) {
          const errorText = await startRes.text();
          console.error("Error response from /api/step-coach/start:", errorText);
          throw new Error(`Failed to start plan generation: ${errorText}`);
        }
        
        const startData = await startRes.json();
        console.log("Started step-by-step plan generation:", startData);
        
        // Now we'll set up the polling mechanism to check status
        let isComplete = false;
        let currentStep = startData.step || 1;
        const statusCheckInterval = setInterval(async () => {
          try {
            // Check current plan generation status
            const statusRes = await fetch('/api/step-coach/status', {
              credentials: "include"
            });
            
            if (!statusRes.ok) {
              console.error("Error checking plan status:", await statusRes.text());
              return;
            }
            
            // Debug authentication status
            console.log("[Plan Debug] Fetching status with credentials:", { withCredentials: true });
            
            const statusData = await statusRes.json();
            console.log("Plan generation status update:", statusData);
            
            // Update local progress state from status data
            setGenerationProgress({
              isGenerating: statusData.isGenerating,
              step: statusData.currentStep || 0,
              statusMessage: statusData.stepMessage || "Processing your request...",
              estimatedTimeRemaining: statusData.estimatedTimeRemaining || 30,
              totalSteps: statusData.totalSteps || 5,
              elapsedTime: Math.floor((Date.now() - new Date(statusData.startedAt).getTime()) / 1000),
              errorMessage: statusData.errorMessage || null
            });
            
            // Debug the comparison values
            console.log(`[Plan Debug] Comparison: currentStep=${currentStep}, statusData.currentStep=${statusData.currentStep}, PlanGenerationStep.INITIALIZE=${PlanGenerationStep.INITIALIZE}, isInitialize=${statusData.currentStep === PlanGenerationStep.INITIALIZE}`);
            
            // ALWAYS call continue if we're in initialization or nutrition calculation step
            if (statusData.isGenerating && (statusData.currentStep === 0 || statusData.currentStep === 1)) {
                console.log(`[Plan Debug] We're in step ${statusData.currentStep} - calling continue unconditionally`);
                
                // Call continue immediately for these steps
                try {
                    const initContinueRes = await fetch('/api/step-coach/continue', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({}),
                        credentials: 'include'
                    });
                    
                    if (initContinueRes.ok) {
                        console.log(`[Plan Debug] Successfully called continue for step ${statusData.currentStep}`);
                        const continueData = await initContinueRes.json();
                        console.log("[Plan Debug] Continue response:", continueData);
                    } else {
                        console.error(`[Plan Debug] Failed to call continue for step ${statusData.currentStep}:`, 
                          await initContinueRes.text());
                    }
                } catch (err) {
                    console.error(`[Plan Debug] Error calling continue for step ${statusData.currentStep}:`, err);
                }
            }
            
            // We need to call continue for certain steps (even without a step change)
            // This breaks the deadlock where server waits for client, but client waits for step change
            if (statusData.isGenerating && 
                (statusData.currentStep === 0 || statusData.currentStep === 1 || statusData.currentStep > currentStep)) {
              
              // Update our tracking of current step
              currentStep = statusData.currentStep;
              
              console.log(`[Plan Debug] Calling continue endpoint for step ${currentStep}`);
              
              // Call the continue endpoint to process the next step
              // Use direct fetch with credentials instead of apiRequest to ensure authentication
              const continueRes = await fetch('/api/step-coach/continue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                credentials: 'include'
              });
              
              if (!continueRes.ok) {
                console.error("Error continuing to next step:", await continueRes.text());
              } else {
                const continueData = await continueRes.json();
                console.log("Advanced to next step:", continueData);
                
                // If the continue response shows we've moved to a new step, update our progress immediately
                if (continueData.step !== undefined && continueData.step !== currentStep) {
                  currentStep = continueData.step;
                  setGenerationProgress(prev => ({
                    ...prev,
                    step: continueData.step,
                    statusMessage: continueData.stepMessage || prev.statusMessage,
                    estimatedTimeRemaining: continueData.estimatedTimeRemaining || prev.estimatedTimeRemaining
                  }));
                }
              }
            }
            
            // Check if we're done or encountered an error
            if (!statusData.isGenerating || statusData.currentStep === PlanGenerationStep.COMPLETE) {
              isComplete = true;
              clearInterval(statusCheckInterval);
              
              // Clear progress tracking on completion
              progressTimerRefs.current.forEach(timer => clearTimeout(timer));
              progressTimerRefs.current = [];
              setGenerationProgress({
                isGenerating: false,
                step: 0,
                statusMessage: '',
                estimatedTimeRemaining: 0,
                errorMessage: null,
                totalSteps: 5,
                elapsedTime: 0,
                isComplete: true // Show completion state briefly
              });
              
              // Fetch the final plan data
              const finalPlanRes = await fetch('/api/step-coach/result', {
                credentials: "include"
              });
              
              if (!finalPlanRes.ok) {
                throw new Error('Failed to retrieve final plan data');
              }
              
              // Process the coach response
              const coachResponse = await finalPlanRes.json();
              
              // Reset the global plan generation flag
              setPlanGenerating(false);
              // Clear generation tracking from localStorage
              localStorage.removeItem('fitness_plan_generating');
              
              // Redirect to fitness plan page after plan is successfully generated
              setTimeout(() => {
                setLocation('/fitness-plan');
              }, 1500);
              
              // Log the complete response to inspect its structure
              console.log("Received coach response:", JSON.stringify(coachResponse, null, 2));
              
              // Create a compatibility layer with the old fitness plan API
              // This allows us to continue using the existing UI without major changes
              const adaptedResponse = {
                ...coachResponse,
                id: Date.now(), // Generate a temporary ID
                nutritionGoal: {
                  caloriesTarget: coachResponse.nutritionData?.calorieTarget || 0,
                  proteinTarget: coachResponse.nutritionData?.proteinTarget || 0,
                  carbsTarget: coachResponse.nutritionData?.carbsTarget || 0,
                  fatTarget: coachResponse.nutritionData?.fatTarget || 0
                },
                preferences: {
                  goal: coachInput.fitnessGoal,
                  currentWeight: coachInput.weight,
                  unit: 'kg',
                  age: coachInput.age,
                  gender: coachInput.sex,
                  dietaryRestrictions: coachInput.dietaryPreferences,
                  // Include the preferred store for shopping lists
                  preferredStore: coachInput.preferredStore || 'aldi',
                  // Add workout preferences to maintain consistency
                  workoutDaysPerWeek: coachInput.workoutDaysPerWeek || 4,
                  preferredWorkoutDays: coachInput.preferredWorkoutDays || [],
                  workoutDuration: coachInput.workoutDuration || 60,
                  workoutNames: coachInput.workoutNames || {},
                },
                mealPlan: {
                  weeklySchedule: coachResponse.mealPlan || {}
                },
                workoutPlan: {
                  weeklySchedule: coachResponse.workoutPlan || {}
                },
                shoppingList: coachResponse.shoppingList || [],
                createdAt: new Date().toISOString(),
                active: true
              };
              
              // Log the adapted response before returning
              console.log("Adapted response structure:", {
                nutritionGoal: adaptedResponse.nutritionGoal,
                hasWorkoutPlan: !!adaptedResponse.workoutPlan?.weeklySchedule && 
                              Object.keys(adaptedResponse.workoutPlan.weeklySchedule || {}).length > 0,
                workoutPlanDays: Object.keys(adaptedResponse.workoutPlan?.weeklySchedule || {}),
                hasMealPlan: !!adaptedResponse.mealPlan?.weeklySchedule && 
                           Object.keys(adaptedResponse.mealPlan.weeklySchedule || {}).length > 0,
                mealPlanDays: Object.keys(adaptedResponse.mealPlan?.weeklySchedule || {}),
                hasShoppingList: Array.isArray(adaptedResponse.shoppingList) && adaptedResponse.shoppingList.length > 0,
                shoppingListCount: Array.isArray(adaptedResponse.shoppingList) ? adaptedResponse.shoppingList.length : 0
              });
              
              return adaptedResponse;
            }
          } catch (err) {
            console.error("Error in status check interval:", err);
          }
        }, 5000); // Check every 5 seconds
        
        // Return a placeholder - the real data will come from the final poll
        return { pending: true };
      } catch (error) {
        // Clear progress tracking in case of error
        progressTimerRefs.current.forEach(timer => clearTimeout(timer));
        progressTimerRefs.current = [];
        setGenerationProgress({
          isGenerating: false,
          step: 0,
          statusMessage: '',
          estimatedTimeRemaining: 0,
        });
        
        // Reset the global plan generation flag
        setPlanGenerating(false);
        // Clear generation tracking from localStorage
        localStorage.removeItem('fitness_plan_generating');
        
        // Re-throw the error to be handled by onError
        throw error;
      }
    },
    onSuccess: (data) => {
      // If we returned early due to limit reached, don't show success message
      if (data && 'limitReached' in data) {
        return;
      }
      
      // If a plan is already being generated, show a proper message with reset option
      if (data && 'alreadyGenerating' in data) {
        toast({
          title: "Plan Generation In Progress",
          description: "A plan is already being generated. You can reset it by clicking 'Reset Generation' below.",
          variant: "default",
          duration: 5000,
        });
        
        // Show a reset button in the UI
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: true,
          step: 1,
          statusMessage: "Plan generation in progress...",
          errorMessage: "A plan is already being generated. Please wait or reset to start over.",
          estimatedTimeRemaining: 30
        }));
        
        return;
      }
      
      // If we got a pending response, the real data will come from the polling mechanism
      if (data && 'pending' in data) {
        return;
      }
      
      toast({
        title: "Success!",
        description: "Your personalized fitness and nutrition plan has been created!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fitness-plans/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      setIsDialogOpen(false);
      
      // Redirect to the fitness plan page after a short delay to allow toast to be seen
      setTimeout(() => {
        setLocation('/fitness-plan');
      }, 1500);
    },
    onError: (error: Error) => {
      // Reset progress tracking in case of error if it's still showing
      if (generationProgress.isGenerating) {
        progressTimerRefs.current.forEach(timer => clearTimeout(timer));
        progressTimerRefs.current = [];
        setGenerationProgress({
          isGenerating: false,
          step: 0,
          statusMessage: '',
          estimatedTimeRemaining: 0,
        });
      }
      
      // Reset the global plan generation flag if it's still set
      if (isPlanGenerating) {
        setPlanGenerating(false);
        localStorage.removeItem('fitness_plan_generating');
      }
      
      // Show a user-friendly error message
      toast({
        title: "Error generating plan",
        description: error.message,
        variant: "destructive",
      });
      
      // Re-fetch eligibility to ensure UI is up to date
      queryClient.invalidateQueries({ queryKey: ['/api/fitness-plans/eligibility'] });
    },
  });

  // Rest of the component...

  // Render the Fitness Coach UI
  return (
    <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 max-w-7xl">
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Fitness Coach</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Generate personalized workout and meal plans tailored to your goals
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Only show the View Plan button in the header when appropriate */}
            {!isPlanGenerating && activePlan ? (
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => setLocation('/view-plan')}
              >
                <Calendar className="mr-2 h-5 w-5" />
                View Current Plan
              </Button>
            ) : null}
          </div>
        </div>
        
        {eligibilityLoading ? (
          <Card className="p-4 sm:p-8 flex justify-center items-center min-h-[200px] sm:min-h-[300px]">
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" />
              <p className="text-sm sm:text-base text-muted-foreground">Checking eligibility...</p>
            </div>
          </Card>
        ) : !eligibilityStatus.canCreate ? (
          <Card className="p-4 sm:p-8">
            <div className="flex flex-col items-center gap-3 sm:gap-4 text-center max-w-2xl mx-auto">
              <LockIcon className="h-8 w-8 sm:h-10 sm:w-10 text-amber-500" />
              <h2 className="text-xl sm:text-2xl font-bold">Plan Generation Unavailable</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {eligibilityStatus.message || "You cannot create a new fitness plan at this time."}
                {eligibilityStatus.daysRemaining && eligibilityStatus.daysRemaining > 0 && (
                  <> You can create a new plan in <strong>{eligibilityStatus.daysRemaining}</strong> days.</>
                )}
              </p>
              {eligibilityStatus.globallyDisabled && (
                <div className="mt-2 p-3 sm:p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                  <p className="text-amber-700 dark:text-amber-300 text-xs sm:text-sm">
                    The AI Coach feature is currently disabled system-wide. 
                    Please try again later or contact support if you have questions.
                  </p>
                </div>
              )}
            </div>
          </Card>
        ) : isPlanGenerating || generationProgress.isGenerating ? (
          <Card className="p-4 sm:p-8">
            <ProgressTracker 
              isGenerating={generationProgress.isGenerating}
              currentStep={generationProgress.step} 
              totalSteps={generationProgress.totalSteps || 5}
              stepMessage={generationProgress.statusMessage || "Initializing..."}
              estimatedTimeRemaining={generationProgress.estimatedTimeRemaining}
              errorMessage={generationProgress.errorMessage}
              isComplete={generationProgress.isComplete || false}
              onCancel={() => resetPlanGeneration()}
              onContinue={() => {/* No-op for now */}}
              onReset={resetPlanGeneration}
              isAdmin={user?.isAdmin || false}
            />
          </Card>
        ) : activePlan ? (
          <Card className="p-4 sm:p-8">
            <div className="flex flex-col items-center gap-3 sm:gap-4 text-center max-w-2xl mx-auto">
              <Check className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
              <h2 className="text-xl sm:text-2xl font-bold">You Have an Active Plan</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                You already have an active fitness plan. You can view your current plan using the "View Current Plan" button above or create a new one when it expires.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-4 sm:p-8">
            <div className="flex flex-col items-center gap-3 sm:gap-4 text-center max-w-2xl mx-auto">
              <Dumbbell className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              <h2 className="text-xl sm:text-2xl font-bold">Create Your Personalized Fitness Plan</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Our AI Coach will generate a customized workout and nutrition plan based on your goals, preferences, and fitness level.
              </p>
              <Button 
                onClick={() => setIsDialogOpen(true)} 
                size="default"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 mt-2 w-full sm:w-auto"
              >
                <Dumbbell className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Create Fitness Plan
              </Button>
            </div>
          </Card>
        )}
        
        {/* Features section to explain what the AI coach can do */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-8">
          <Card className="h-full">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Dumbbell className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary shrink-0" />
                <span>Personalized Workouts</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <p className="text-muted-foreground text-sm sm:text-base">
                Get a complete weekly workout schedule tailored to your fitness level, goals, and available equipment.
              </p>
            </CardContent>
          </Card>
          
          <Card className="h-full">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Utensils className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary shrink-0" />
                <span>Nutrition Planning</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <p className="text-muted-foreground text-sm sm:text-base">
                Receive meal plans that support your fitness goals, respect dietary restrictions, and fit your budget.
              </p>
            </CardContent>
          </Card>
          
          <Card className="h-full sm:col-span-2 lg:col-span-1">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <ShoppingCartIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-primary shrink-0" />
                <span>Shopping Lists</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <p className="text-muted-foreground text-sm sm:text-base">
                Get an organized shopping list with all ingredients from your meal plan, optimized for your weekly budget.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Create Plan Dialog */}
      <AdaptiveDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AdaptiveDialogContent className="max-w-3xl w-full h-[90vh] sm:h-[85vh] p-0 sm:p-0 overflow-hidden">
          <AdaptiveDialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6 pb-3 sm:pb-4 border-b">
            <AdaptiveDialogTitle ref={dialogTitleRef} className="text-xl sm:text-2xl font-bold">
              Create Your Fitness Plan
            </AdaptiveDialogTitle>
            <AdaptiveDialogDescription className="text-sm sm:text-base mt-1">
              Fill out this form to generate a personalized fitness and nutrition plan
            </AdaptiveDialogDescription>
          </AdaptiveDialogHeader>
          
          <div className="px-4 sm:px-6 py-3 bg-muted/30 border-b flex justify-between items-center">
            <div className="flex">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div 
                  key={stepNumber} 
                  className="flex items-center"
                >
                  <div 
                    className={cn(
                      "flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full text-sm transition-all",
                      step === stepNumber 
                        ? "bg-primary text-primary-foreground font-medium" 
                        : step > stepNumber 
                          ? "bg-primary/20 text-primary border border-primary/30" 
                          : "bg-muted border text-muted-foreground"
                    )}
                  >
                    {step > stepNumber ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      stepNumber
                    )}
                  </div>
                  {stepNumber < 4 && (
                    <div 
                      className={cn(
                        "h-[2px] w-4 sm:w-6", 
                        step > stepNumber ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    ></div>
                  )}
                </div>
              ))}
            </div>
            
            {isFormLocked ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsFormLocked(false)}
                className="flex items-center gap-1.5 h-8 px-2 sm:px-3 text-xs"
              >
                <Unlock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Edit Fields</span>
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsFormLocked(true)}
                className="flex items-center gap-1.5 h-8 px-2 sm:px-3 text-xs"
              >
                <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Lock Fields</span>
              </Button>
            )}
          </div>
          
          <ScrollArea className="flex-1 h-[calc(85vh-180px)] sm:h-[calc(85vh-200px)]" ref={scrollAreaRef as any}>
            <div className="px-4 sm:px-6 py-4 sm:py-6">
              <Form {...form}>
                <form ref={formRef} className="space-y-5 sm:space-y-7">
                  {/* Step 1: Basic Information */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Basic Information</h3>
                      
                      {/* Fitness Goal */}
                      <FormField
                        control={form.control}
                        name="goal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fitness Goal</FormLabel>
                            <Select
                              disabled={isFormLocked && readOnlyFields.goal}
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your primary goal" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="weight_loss">Weight Loss</SelectItem>
                                <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                                <SelectItem value="strength">Strength</SelectItem>
                                <SelectItem value="stamina">Stamina</SelectItem>
                                <SelectItem value="endurance">Endurance</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Gender */}
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gender</FormLabel>
                            <Select
                              disabled={isFormLocked && readOnlyFields.gender}
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your gender" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Age */}
                      <FormField
                        control={form.control}
                        name="age"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                disabled={isFormLocked && readOnlyFields.age}
                                placeholder="Enter your age"
                                {...field}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  field.onChange(isNaN(val) ? undefined : val);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Height */}
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height (cm)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                disabled={isFormLocked && readOnlyFields.height}
                                placeholder="Enter your height in cm"
                                {...field}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  field.onChange(isNaN(val) ? undefined : val);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Current Weight */}
                      <FormField
                        control={form.control}
                        name="currentWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Weight (kg)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                disabled={isFormLocked && readOnlyFields.currentWeight}
                                placeholder="Enter your current weight"
                                {...field}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  field.onChange(isNaN(val) ? undefined : val);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Target Weight (only shown for weight loss/gain goals) */}
                      {(form.getValues('goal') === 'weight_loss' || form.getValues('goal') === 'muscle_gain') && (
                        <FormField
                          control={form.control}
                          name="targetWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Weight (kg)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  disabled={isFormLocked && readOnlyFields.targetWeight}
                                  placeholder="Enter your target weight"
                                  {...field}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    field.onChange(isNaN(val) ? undefined : val);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                  
                  {/* Step 2: Workout Preferences */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Workout Preferences</h3>
                      
                      {/* Fitness Level */}
                      <FormField
                        control={form.control}
                        name="fitnessLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fitness Level</FormLabel>
                            <Select
                              disabled={isFormLocked && readOnlyFields.fitnessLevel}
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your fitness level" />
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
                      
                      {/* Workout Days Per Week */}
                      <FormField
                        control={form.control}
                        name="workoutDaysPerWeek"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Workout Days Per Week</FormLabel>
                            <Select
                              disabled={isFormLocked && readOnlyFields.workoutDaysPerWeek}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select days per week" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                  <SelectItem key={day} value={day.toString()}>
                                    {day} {day === 1 ? 'day' : 'days'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Preferred Workout Days - Improved UI */}
                      <FormField
                        control={form.control}
                        name="preferredWorkoutDays"
                        render={({ field }) => (
                          <FormItem className="space-y-4">
                            <div>
                              <FormLabel className="text-base font-medium">Preferred Workout Days</FormLabel>
                              <FormDescription>
                                Select which days you prefer to work out ({form.watch('workoutDaysPerWeek')} days required)
                              </FormDescription>
                            </div>
                            
                            <div className="grid grid-cols-7 gap-1 sm:gap-2 max-w-md mx-auto">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                                const isSelected = field.value?.includes(day);
                                const dayAbbr = day.substring(0, 3);
                                
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    disabled={isFormLocked && readOnlyFields.preferredWorkoutDays}
                                    className={cn(
                                      "relative flex flex-col items-center justify-center h-12 w-full sm:h-16 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                                      isSelected 
                                        ? "bg-primary/10 border-primary text-primary font-medium" 
                                        : "bg-background border-muted-foreground/20 hover:border-muted-foreground/40",
                                      (isFormLocked && readOnlyFields.preferredWorkoutDays) && "opacity-60 cursor-not-allowed"
                                    )}
                                    onClick={() => {
                                      const currentValues = field.value || [];
                                      if (currentValues.includes(day)) {
                                        field.onChange(currentValues.filter(val => val !== day));
                                      } else {
                                        // Check if we're already at the max days
                                        if (currentValues.length < form.watch('workoutDaysPerWeek')) {
                                          field.onChange([...currentValues, day]);
                                        } else {
                                          // Show a toast if user tries to select more days than allowed
                                          toast({
                                            title: "Maximum days selected",
                                            description: `You can only select ${form.watch('workoutDaysPerWeek')} workout days. Deselect a day first.`,
                                            variant: "default"
                                          });
                                        }
                                      }
                                    }}
                                    aria-pressed={isSelected}
                                    aria-label={`Select ${day} as workout day`}
                                  >
                                    <span className="text-xs uppercase mb-1 opacity-80">{dayAbbr}</span>
                                    {isSelected && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="absolute h-full w-full bg-primary/5 rounded-lg"></div>
                                        <Check className="h-4 w-4 text-primary absolute top-1 right-1" />
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex justify-center mt-2">
                              <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                                Selected: {field.value?.length || 0} of {form.watch('workoutDaysPerWeek')} days
                              </div>
                            </div>
                            <FormMessage className="text-sm font-medium mt-2" />
                          </FormItem>
                        )}
                      />
                      
                      {/* Workout Duration */}
                      <FormField
                        control={form.control}
                        name="workoutDuration"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Workout Duration (minutes)</FormLabel>
                            <Select
                              disabled={isFormLocked && readOnlyFields.workoutDuration}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select workout duration" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[15, 30, 45, 60, 75, 90].map((duration) => (
                                  <SelectItem key={duration} value={duration.toString()}>
                                    {duration} minutes
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  {/* Step 3: Dietary Preferences and Budget */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Dietary Preferences & Shopping</h3>
                      
                      {/* Weekly Budget - Explicit field for user's maximum budget */}
                      <FormField
                        control={form.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Weekly Grocery Budget (£)
                              <span className="text-destructive ml-1">*</span>
                            </FormLabel>
                            <FormDescription>
                              Enter your maximum weekly budget for groceries
                            </FormDescription>
                            <FormControl>
                              <Input
                                type="number"
                                min="30"
                                disabled={isFormLocked && readOnlyFields.budget}
                                placeholder="Enter your weekly budget (min £30)"
                                {...field}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value);
                                  field.onChange(isNaN(val) ? undefined : val);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Preferred Grocery Store */}
                      <FormField
                        control={form.control}
                        name="preferredStore"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Preferred Grocery Store
                              <span className="text-destructive ml-1">*</span>
                            </FormLabel>
                            <FormDescription>
                              Select your preferred grocery store for shopping recommendations
                            </FormDescription>
                            <Select
                              disabled={isFormLocked && readOnlyFields.preferredStore}
                              onValueChange={field.onChange}
                              defaultValue={field.value || "aldi"}
                              value={field.value || "aldi"}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your preferred store" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="aldi">Aldi</SelectItem>
                                <SelectItem value="asda">Asda</SelectItem>
                                <SelectItem value="lidl">Lidl</SelectItem>
                                <SelectItem value="morrisons">Morrisons</SelectItem>
                                <SelectItem value="sainsburys">Sainsbury's</SelectItem>
                                <SelectItem value="tesco">Tesco</SelectItem>
                                <SelectItem value="waitrose">Waitrose</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Dietary Restrictions */}
                      <FormField
                        control={form.control}
                        name="dietaryRestrictions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dietary Restrictions</FormLabel>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {field.value?.map((item, index) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary"
                                  className="px-3 py-1 text-xs"
                                >
                                  {item}
                                  {!isFormLocked && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 ml-1"
                                      onClick={() => {
                                        const newValues = [...field.value];
                                        newValues.splice(index, 1);
                                        field.onChange(newValues);
                                      }}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="flex-1 relative">
                                <Input
                                  disabled={isFormLocked && readOnlyFields.dietaryRestrictions}
                                  placeholder="Add dietary restriction (e.g., vegetarian, no nuts)"
                                  value={dietaryRestrictionInput}
                                  onChange={(e) => setDietaryRestrictionInput(e.target.value)}
                                  className="pr-20"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && dietaryRestrictionInput.trim()) {
                                      e.preventDefault();
                                      const newValues = [...(field.value || []), dietaryRestrictionInput.trim()];
                                      field.onChange(newValues);
                                      setDietaryRestrictionInput('');
                                    }
                                  }}
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={!dietaryRestrictionInput.trim() || (isFormLocked && readOnlyFields.dietaryRestrictions)}
                                  onClick={() => {
                                    if (dietaryRestrictionInput.trim()) {
                                      const newValues = [...(field.value || []), dietaryRestrictionInput.trim()];
                                      field.onChange(newValues);
                                      setDietaryRestrictionInput('');
                                    }
                                  }}
                                  className="absolute right-0.5 top-0.5 bottom-0.5 px-3"
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                            {field.value?.length === 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {["Vegetarian", "Vegan", "Gluten-free", "Dairy-free", "No nuts"].map(suggestion => (
                                  <Badge 
                                    key={suggestion}
                                    variant="outline"
                                    className="px-2 py-1 text-xs cursor-pointer hover:bg-muted"
                                    onClick={() => {
                                      if (!isFormLocked || !readOnlyFields.dietaryRestrictions) {
                                        field.onChange([...(field.value || []), suggestion]);
                                      }
                                    }}
                                  >
                                    + {suggestion}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* No additional fields here - we already have budget and store above */}
                    </div>
                  )}
                  
                  {/* Step 4: Additional Options */}
                  {step === 4 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Additional Options</h3>
                      
                      {/* Email Notifications */}
                      <FormField
                        control={form.control}
                        name="notifyByEmail"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Email Notifications</FormLabel>
                              <FormDescription>
                                Receive updates about your fitness plan via email
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isFormLocked && readOnlyFields.notifyByEmail}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      {/* Email Address (shown only if notifications enabled) */}
                      {form.getValues('notifyByEmail') && (
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  disabled={isFormLocked && readOnlyFields.email}
                                  placeholder="Enter your email address"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      {/* Use AI for adaptive plan */}
                      <FormField
                        control={form.control}
                        name="useAdaptiveAI"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:p-4">
                            <div className="space-y-0.5">
                              <FormLabel>Use AI for Adaptive Planning</FormLabel>
                              <FormDescription>
                                Let AI adjust your plan as you progress
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isFormLocked && readOnlyFields.useAdaptiveAI}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  
                  {/* Navigation Controls */}
                  <div className="flex justify-between items-center mt-8 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setStep(Math.max(1, step - 1));
                        // Scroll to top when navigating
                        if (scrollAreaRef.current) {
                          scrollAreaRef.current.scrollTop = 0;
                        }
                      }}
                      disabled={step === 1}
                      className="min-w-[100px] sm:min-w-[120px] h-10 sm:h-11"
                    >
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    
                    <Button
                      type="button"
                      onClick={async () => {
                        if (step < 4) {
                          // Validate current step before proceeding
                          let canProceed = true;
                          
                          // Validate fields based on the current step
                          if (step === 1) {
                            const result = await form.trigger(['goal', 'gender', 'age', 'height', 'currentWeight']);
                            canProceed = result;
                            
                            // Also validate targetWeight if goal is weight_loss or muscle_gain
                            if (canProceed && (form.getValues('goal') === 'weight_loss' || form.getValues('goal') === 'muscle_gain')) {
                              const targetResult = await form.trigger('targetWeight');
                              canProceed = targetResult;
                            }
                          } 
                          else if (step === 2) {
                            const result = await form.trigger(['fitnessLevel', 'workoutDaysPerWeek', 'preferredWorkoutDays']);
                            canProceed = result;
                          }
                          else if (step === 3) {
                            // Step 3 validation (diet preferences are optional)
                            canProceed = true;
                          }
                          
                          if (canProceed) {
                            setStep(step + 1);
                            // Scroll to top when navigating
                            if (scrollAreaRef.current) {
                              scrollAreaRef.current.scrollTop = 0;
                            }
                          }
                        } else {
                          // Final step validation before plan generation
                          if (form.getValues('budgetType') === 'custom' && !form.getValues('budget')) {
                            form.setError('budget', { 
                              type: 'required', 
                              message: 'Please enter your weekly grocery budget' 
                            });
                          } else {
                            handleStartPlanGeneration();
                          }
                        }
                      }}
                      size="default"
                      disabled={generationProgress.isGenerating}
                      className={cn(
                        "min-w-[100px] sm:min-w-[120px] h-10 sm:h-11",
                        step === 4 ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" : ""
                      )}
                    >
                      {step === 4 ? (
                        generationProgress.isGenerating ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            Generate
                            <Sparkles className="ml-1 h-4 w-4" />
                          </>
                        )
                      ) : (
                        <>
                          Next
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </ScrollArea>
        </AdaptiveDialogContent>
      </AdaptiveDialog>
    </div>
  );
}