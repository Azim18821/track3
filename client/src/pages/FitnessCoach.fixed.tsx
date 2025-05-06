import React, { useState, useEffect, useRef } from 'react';
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
import { Calendar, Clock, DumbellIcon, Filter, Key, LockIcon, Settings, UserPlus, UserRound, X } from 'lucide-react';
import { CalendarDays } from 'lucide-react';
import { Info, Loader2, Lock, Unlock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useUser } from '@/hooks/use-user';
import ProgressTracker from '@/components/progress/ProgressTracker';
import { useMobileDetect } from '@/hooks/use-mobile-detect';
import WorkoutPlanView from '@/components/fitness/WorkoutPlanView';
import MealPlanView from '@/components/fitness/MealPlanView';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { getPlanCardGradient } from '@/lib/gradients';
import { CustomNumberInput } from '@/components/fitness/CustomNumberInput';
import MacroCalculator from '@/components/MacroCalculator';
import { generatePreferredWorkoutDays } from '@/utils/workoutDays';
import { Switch } from '@/components/ui/switch';
import { PlanGenerationStep } from '@/types/plan-generation';

// Plan generation global state
const isPlanGeneratingKey = 'fitness_plan_generating';
let isPlanGenerating = false;

// Utility function to check if a plan is currently being generated
export function checkIfPlanGenerating(): boolean {
  const startTimeStr = localStorage.getItem(isPlanGeneratingKey);
  if (startTimeStr) {
    const startTime = parseInt(startTimeStr, 10);
    const now = Date.now();
    const elapsedMinutes = (now - startTime) / (1000 * 60);
    
    // If more than 10 minutes have passed, we assume the generation timed out
    if (elapsedMinutes > 10) {
      localStorage.removeItem(isPlanGeneratingKey);
      return false;
    }
    return true;
  }
  return false;
}

// Set global state when a plan starts generating
export function setPlanGenerating(isGenerating: boolean): void {
  isPlanGenerating = isGenerating;
  if (isGenerating) {
    localStorage.setItem(isPlanGeneratingKey, Date.now().toString());
  } else {
    localStorage.removeItem(isPlanGeneratingKey);
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
  // Additional fields for workout preferences
  preferredWorkoutDays: z.array(z.string()).optional(),
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
    canCreate: true
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
  const progressTimerRefs = useRef<number[]>([]);
  
  // Ref to track form scroll position
  const formRef = useRef<HTMLDivElement>(null);
  
  // Reference for the dialog to ensure focus gets locked properly
  const dialogTitleRef = useRef<HTMLHeadingElement>(null);
  
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
  const { data: activePlan, isLoading: planLoading } = useQuery({
    queryKey: ['/api/fitness-plans/active'],
    retry: false
  });
  
  // Update eligibility state when data changes
  useEffect(() => {
    if (eligibility) {
      setEligibilityStatus(eligibility);
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
      
      if (user.heightCm && user.heightCm > 0) {
        formUpdates.height = user.heightCm;
        formUpdates.unit = 'kg'; // If user has heightCm, use metric units
        readOnly.height = true;
        readOnly.unit = true;
      }
      
      if (user.weightKg && user.weightKg > 0) {
        formUpdates.currentWeight = user.weightKg;
        formUpdates.unit = 'kg';
        readOnly.currentWeight = true;
        readOnly.unit = true;
      }
      
      if (user.email) {
        formUpdates.email = user.email;
      }
      
      // Additional profile fields if available
      if (user.dietaryPreferences && Array.isArray(user.dietaryPreferences)) {
        formUpdates.dietaryRestrictions = user.dietaryPreferences;
      }
      
      if (user.preferredFoods && Array.isArray(user.preferredFoods)) {
        formUpdates.preferredFoods = user.preferredFoods;
      }
      
      if (user.fitnessLevel && ['beginner', 'intermediate', 'advanced'].includes(user.fitnessLevel)) {
        formUpdates.fitnessLevel = user.fitnessLevel;
        readOnly.fitnessLevel = true;
      }
      
      if (user.healthGoals && Array.isArray(user.healthGoals)) {
        formUpdates.healthGoals = user.healthGoals;
      }
      
      if (user.trainingStyle && Array.isArray(user.trainingStyle)) {
        formUpdates.trainingStyle = user.trainingStyle;
      }
      
      if (user.existingConditions && Array.isArray(user.existingConditions)) {
        formUpdates.existingConditions = user.existingConditions;
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
      // Case 1: Check if AI coach is globally disabled
      if (eligibility && !eligibilityLoading && eligibility.globallyDisabled && 
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
      // Check if a plan is already being generated
      if (isPlanGenerating) {
        throw new Error("A plan is already being generated. Please wait for it to complete.");
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
        // Start the step-by-step plan generation process
        const startRes = await apiRequest('POST', '/api/step-coach/start', coachInput);
        
        if (!startRes.ok) {
          throw new Error('Failed to start plan generation');
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
            
            // If current step has changed, we need to call continue
            if (statusData.isGenerating && statusData.currentStep > currentStep) {
              currentStep = statusData.currentStep;
              
              // Call the continue endpoint to process the next step
              const continueRes = await apiRequest('POST', '/api/step-coach/continue', {});
              if (!continueRes.ok) {
                console.error("Error continuing to next step:", await continueRes.text());
              } else {
                console.log("Advanced to next step:", await continueRes.json());
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

  // For now, just returning a placeholder
  return <div>Loading...</div>;
}