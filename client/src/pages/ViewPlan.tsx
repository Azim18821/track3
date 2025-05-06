import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { format, parseISO } from "date-fns";
import { sortDaysOfWeek, formatMealType } from "@/utils/format";

// Helper function to determine default unit for common grocery items
const getDefaultUnit = (itemName: string): string => {
  const itemNameLower = itemName.toLowerCase();
  
  // Meat and protein
  if (itemNameLower.includes('beef') || 
      itemNameLower.includes('chicken') || 
      itemNameLower.includes('turkey') || 
      itemNameLower.includes('fish') || 
      itemNameLower.includes('salmon') || 
      itemNameLower.includes('tofu')) {
    return 'g';
  }
  
  // Fruits and vegetables
  if (itemNameLower.includes('apple') || 
      itemNameLower.includes('orange') || 
      itemNameLower.includes('banana') || 
      itemNameLower.includes('onion') || 
      itemNameLower.includes('potato')) {
    return itemNameLower.includes('juice') ? 'ml' : 'pcs';
  }
  
  // Grains and pasta
  if (itemNameLower.includes('rice') || 
      itemNameLower.includes('oats') || 
      itemNameLower.includes('flour') || 
      itemNameLower.includes('pasta') || 
      itemNameLower.includes('quinoa')) {
    return 'g';
  }
  
  // Liquids
  if (itemNameLower.includes('milk') || 
      itemNameLower.includes('oil') || 
      itemNameLower.includes('juice') || 
      itemNameLower.includes('water') || 
      itemNameLower.includes('vinegar')) {
    return 'ml';
  }
  
  // Default to g for most items
  return 'g';
};

// Using formatMealType imported from utils/format.ts
// with additional specific case handling
const getMealDisplayName = (mealType: string): string => {
  if (mealType.startsWith("meal")) {
    const mealNumber = mealType.replace("meal", "");
    return `Meal ${mealNumber}`;
  }
  return formatMealType(mealType);
};

// Using sortDaysOfWeek imported from utils/format.ts

// UI Components
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

// Icons
import {
  Activity,
  AlertCircle,
  Apple,
  BarChart,
  Beef,
  Brain,
  Calendar,
  Check,
  CheckCheck,
  ChefHat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  FlaskConical,
  Milk,
  MessageSquare,
  Package,
  Package2,
  Salad,
  ShoppingBag,
  Snowflake,
  UserRound,
  Wheat,
  Wine,
  Dumbbell,
  Info,
  Loader2,
  ShoppingCart,
  Trash2,
  Utensils,
  PieChart,
  Cookie,
  Flower2,
  Gauge,
  Timer as TimerIcon,
  Receipt,
  Store,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Store as ShopIcon
} from "lucide-react";

// MealDetailCard Component
interface MealDetailCardProps {
  meal: any;
  mealType: string;
  index?: number;
  displayTitle?: string;
}

const MealDetailCard = ({ meal, mealType, index, displayTitle }: MealDetailCardProps) => {
  if (!meal) return null;
  
  // Use provided display title or generate one
  const title = displayTitle || 
    (index !== undefined ? `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} ${index + 1}` : mealType);
  
  return (
    <details className="p-4 border rounded-xl bg-background shadow-sm hover:border-primary/30 hover:bg-muted/10 transition-all">
      <summary className="cursor-pointer list-none">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{meal.name}</p>
              {meal.time && <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900">{meal.time}</Badge>}
            </div>
            
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge
                variant="outline"
                className="bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-300"
              >
                {Math.round(meal.calories || meal.nutrition?.calories || 0)} kcal
              </Badge>
              <Badge
                variant="outline"
                className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300"
              >
                {Math.round(meal.protein || meal.nutrition?.protein || 0)}g P
              </Badge>
              <Badge
                variant="outline"
                className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300"
              >
                {Math.round(meal.carbs || meal.nutrition?.carbs || 0)}g C
              </Badge>
              <Badge
                variant="outline"
                className="bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-300"
              >
                {Math.round(meal.fat || meal.nutrition?.fat || 0)}g F
              </Badge>
            </div>
          </div>
        </div>
      </summary>
      
      {/* Content */}
      <div className="mt-4 space-y-4">
        {meal.description && (
          <p className="text-sm text-muted-foreground">{meal.description}</p>
        )}
        
        {/* Ingredients */}
        {meal.ingredients && meal.ingredients.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Ingredients</h4>
            <ul className="text-sm space-y-1">
              {meal.ingredients.map((ingredient: any, i: number) => (
                <li key={i}>
                  {typeof ingredient === 'string' 
                    ? ingredient 
                    : `${ingredient.quantity || ''} ${ingredient.unit || ''} ${ingredient.name || ''}`.trim()}
                  {typeof ingredient !== 'string' && ingredient.price && (
                    <span className="ml-1 text-muted-foreground">
                      (£{parseFloat(ingredient.price).toFixed(2)})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Instructions */}
        {meal.cookingInstructions && meal.cookingInstructions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Instructions</h4>
            <ol className="text-sm list-decimal list-inside space-y-1">
              {meal.cookingInstructions.map((step: string, i: number) => (
                <li key={i} className="pl-1">{step}</li>
              ))}
            </ol>
          </div>
        )}
        
        {/* Prep Time, Cook Time, Difficulty */}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {meal.prepTime && (
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>Prep: {meal.prepTime} min</span>
            </div>
          )}
          {meal.cookTime && (
            <div className="flex items-center">
              <TimerIcon className="h-4 w-4 mr-1" />
              <span>Cook: {meal.cookTime} min</span>
            </div>
          )}
          {meal.difficulty && (
            <div className="flex items-center">
              <Gauge className="h-4 w-4 mr-1" />
              <span>
                Difficulty: {meal.difficulty.charAt(0).toUpperCase() + meal.difficulty.slice(1)}
              </span>
            </div>
          )}
          {meal.price && (
            <div className="flex items-center">
              <Receipt className="h-4 w-4 mr-1" />
              <span>
                Price: £{parseFloat(meal.price).toFixed(2)}
              </span>
            </div>
          )}
          {meal.store && (
            <div className="flex items-center">
              <Store className="h-4 w-4 mr-1" />
              <span>
                Store: {meal.store.charAt(0).toUpperCase() + meal.store.slice(1)}
              </span>
            </div>
          )}
        </div>
      </div>
    </details>
  );
};

export default function ViewPlan() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const [removeFromLogs, setRemoveFromLogs] = useState(true);
  const [selectedWorkoutDay, setSelectedWorkoutDay] = useState("");
  const [selectedMealDay, setSelectedMealDay] = useState("");
  
  // Responsive UI state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Fetch active fitness plan
  const {
    data: activePlan,
    isLoading: planLoading,
    isError: planError,
    error: planErrorDetail,
  } = useQuery({
    queryKey: ["/api/fitness-plans/active"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/fitness-plans/active");
      if (!res.ok) {
        if (res.status === 404) {
          // No active plan is not an error condition
          return null;
        }
        throw new Error("Failed to fetch active fitness plan");
      }
      return await res.json();
    },
  });

  // Fetch user workouts for plan integration
  const {
    data: userWorkouts = [],
    isLoading: workoutsLoading,
  } = useQuery({
    queryKey: ["/api/workouts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/workouts");
      if (!res.ok) throw new Error("Failed to fetch workouts");
      return await res.json();
    },
  });

  // Fetch user meals for plan integration
  const {
    data: userMeals = [],
    isLoading: mealsLoading,
  } = useQuery({
    queryKey: ["/api/nutrition/meals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutrition/meals");
      if (!res.ok) throw new Error("Failed to fetch meals");
      return await res.json();
    },
  });
  
  // Check if user has a trainer
  const {
    data: userTrainers = [],
    isLoading: trainersLoading,
  } = useQuery({
    queryKey: ["/api/client/trainers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/client/trainers");
      if (!res.ok) throw new Error("Failed to fetch trainers");
      return await res.json();
    },
  });
  
  // Check for user role from auth context
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.isAdmin === true;
  
  // Redirect clients with trainers to view-plan (only if not admin)
  useEffect(() => {
    if (!trainersLoading && userTrainers.length > 0 && !isAdmin) {
      navigate('/view-plan');
    }
  }, [trainersLoading, userTrainers, isAdmin, navigate]);

  // Mutation to create workouts from plan
  const createWorkoutsMutation = useMutation({
    mutationFn: async (planId: number) => {
      const res = await apiRequest(
        "POST",
        `/api/fitness-plans/${planId}/create-workouts`
      );
      if (!res.ok) throw new Error("Failed to create workouts from plan");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts"] });
      toast({
        title: "Workouts Created",
        description: "Your workout schedule has been updated with plan workouts",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Workouts",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to create meals from plan
  const createMealsMutation = useMutation({
    mutationFn: async (planId: number) => {
      const res = await apiRequest(
        "POST",
        `/api/fitness-plans/${planId}/create-meals`
      );
      if (!res.ok) throw new Error("Failed to create meals from plan");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/meals"] });
      toast({
        title: "Meals Created",
        description: "Your meal log has been updated with plan meals",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Meals",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to deactivate the plan
  const deactivatePlanMutation = useMutation({
    mutationFn: async ({
      planId,
      removeDataFromLogs,
    }: {
      planId: number;
      removeDataFromLogs: boolean;
    }) => {
      const res = await apiRequest(
        "POST",
        `/api/fitness-plans/${planId}/deactivate`,
        { removeDataFromLogs }
      );
      if (!res.ok) throw new Error("Failed to deactivate plan");
      return await res.json();
    },
    onSuccess: () => {
      // Immediately set the active plan to null in the cache to prevent "You have an active plan" message
      queryClient.setQueryData(["/api/fitness-plans/active"], null);
      
      // Still invalidate queries to refresh data from the server
      queryClient.invalidateQueries({ queryKey: ["/api/fitness-plans/active"] });
      
      if (removeFromLogs) {
        queryClient.invalidateQueries({ queryKey: ["/api/workouts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/nutrition/meals"] });
      }
      
      setIsDeactivateDialogOpen(false);
      
      toast({
        title: "Plan Deactivated",
        description: "Your fitness plan has been deactivated",
        variant: "default",
      });
      
      // Navigate back to coach page to create a new plan
      navigate("/coach");
    },
    onError: (error) => {
      toast({
        title: "Error Deactivating Plan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Loading state
  if (planLoading || workoutsLoading || mealsLoading || trainersLoading) {
    return (
      <div className="container py-10 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your fitness plan...</p>
      </div>
    );
  }

  // Error state
  if (planError) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {planErrorDetail instanceof Error
              ? planErrorDetail.message
              : "Failed to load fitness plan"}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/")}
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }
  
  // No active plan state
  if (!activePlan) {
    // Check if user has trainers
    const hasTrainer = userTrainers && userTrainers.length > 0;
    
    return (
      <div className="container py-10 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>No Active Fitness Plan</CardTitle>
            <CardDescription>
              You don't have an active fitness plan at the moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-6">
            {/* Show different content based on whether the user has a trainer */}
            {hasTrainer ? (
              <div className="flex flex-col items-center text-center max-w-md">
                <div className="flex items-center justify-center w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-4">
                  <UserRound className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-medium mb-2">Waiting for Trainer Plan</h3>
                <p className="text-muted-foreground mb-6">
                  You already have a personal trainer assigned. Your trainer will create a custom 
                  fitness plan for you based on your goals and fitness level.
                </p>
                
                {/* Fitness plan survey form */}
                <Card className="w-full bg-slate-50/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Complete Fitness Goals Survey</CardTitle>
                    <CardDescription>
                      Help your trainer create a plan by sharing your fitness goals
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => navigate("/messages")}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Message Your Trainer
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center max-w-md">
                <Activity className="h-16 w-16 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-xl font-medium mb-2">Create a Personalized Plan</h3>
                <p className="text-muted-foreground mb-6">
                  Generate a customized workout and meal plan tailored to your fitness goals,
                  preferences, and lifestyle.
                </p>
                <Button 
                  onClick={() => navigate("/coach")}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                >
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Create Fitness Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Extract plan details
  const { id: planId, preferences, workoutPlan, mealPlan, createdAt } = activePlan;
  
  // Extract budget & store preferences from plan data
  const weeklyBudget = preferences?.weeklyBudget || mealPlan?.shoppingList?.budget || 50;
  const preferredStore = preferences?.preferredStore || mealPlan?.shoppingList?.store || 'Tesco';
  
  // Calculate budget status
  const getBudgetStatus = () => {
    if (!mealPlan?.shoppingList) return null;
    
    const totalCost = mealPlan.shoppingList.totalCost || 0;
    const budgetStatus = mealPlan.shoppingList.budgetStatus || 
      (totalCost <= weeklyBudget * 1.1 ? "under_budget" : "over_budget");
    
    // Calculate budget usage as percentage
    const budgetPercentage = Math.min(100, Math.round((totalCost / weeklyBudget) * 100));
    
    return {
      status: budgetStatus,
      totalCost,
      budgetPercentage,
      isOverBudget: budgetStatus === "over_budget"
    };
  };
  
  const budgetInfo = getBudgetStatus();
  
  // Helper function to get proper display names for meal times
  const getMealDisplayName = (mealKey: string): string => {
    // Handle different naming formats
    if (mealKey.startsWith('meal')) {
      // For meal1, meal2, etc.
      const mealNumber = mealKey.replace('meal', '');
      if (!isNaN(parseInt(mealNumber, 10))) {
        return `Meal ${mealNumber}`;
      }
    }
    
    // Standard meal types
    const mealNameMap: Record<string, string> = {
      'breakfast': 'Breakfast',
      'lunch': 'Lunch', 
      'dinner': 'Dinner',
      'snacks': 'Snacks',
      'morningSnack': 'Morning Snack',
      'afternoonSnack': 'Afternoon Snack',
      'eveningSnack': 'Evening Snack',
      'preworkout': 'Pre-Workout Meal',
      'postworkout': 'Post-Workout Meal'
    };
    
    return mealNameMap[mealKey] || mealKey.charAt(0).toUpperCase() + mealKey.slice(1);
  };
  
  // Determine if plan data can be integrated with logs
  const hasIntegratedWorkouts = userWorkouts.some((workout: any) => workout.planId === planId);
  const hasIntegratedMeals = userMeals.some((meal: any) => meal.planId === planId);

  // Helper function to format quantity with appropriate units
  const formatQuantity = (item: any) => {
    if (!item.quantity) return "";
    
    return typeof item.quantity === 'object' 
      ? `${item.quantity.value || ''} ${item.quantity.unit || ''}`.trim() 
      : typeof item.quantity === 'number'
        ? `${item.quantity} ${item.unit || getDefaultUnit(item.name)}`.trim()
        : item.quantity;
  };
  
  // Shopping list item component for consistent display
  const ShoppingListItem = ({ item, category, idx }: { item: any, category: string, idx: number }) => {
    return (
      <div
        className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-gray-700"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Checkbox id={`item-${category}-${idx}`} className="h-5 w-5" />
            <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-md scale-0 transition-transform peer-checked:scale-110 pointer-events-none"></div>
          </div>
          <Label
            htmlFor={`item-${category}-${idx}`}
            className="cursor-pointer"
          >
            <div className="font-medium text-sm">
              {item.name}
              {item.quantity && (
                <span className="text-muted-foreground font-normal ml-1">
                  ({formatQuantity(item)})
                </span>
              )}
            </div>
            {item.store && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <ShoppingBag className="h-3 w-3" />
                {item.store}
              </span>
            )}
          </Label>
        </div>
        {item.estimated_price && (
          <Badge variant="outline" className="bg-white dark:bg-gray-900 shadow-sm font-medium">
            £{item.estimated_price.toFixed(2)}
          </Badge>
        )}
      </div>
    );
  };
  
  // Removed debug function

  return (
    <div className="container p-0 sm:p-4 pb-20 sm:pb-8 max-w-6xl mx-auto">
      <div className="flex flex-col items-start px-4 sm:px-0 mb-4 sm:mb-6 pt-4 sm:pt-0">
        <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between gap-2 sm:gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Your Fitness Plan</h1>
            <p className="text-muted-foreground">
              Created on {format(parseISO(createdAt), "MMMM d, yyyy")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Only show deactivation button for AI-generated plans (not trainer-assigned plans) */}
            {(!userTrainers || userTrainers.length === 0 || !activePlan.trainerId) && (
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 text-sm"
                onClick={() => setIsDeactivateDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Deactivate Plan
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-0">
        <div className="border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
          <TabsList className="w-full flex justify-between rounded-none border-b-0 bg-transparent mb-0 p-0 h-auto">
            <TabsTrigger 
              value="overview" 
              className="rounded-none flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent text-sm font-medium"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="workouts" 
              className="rounded-none flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent text-sm font-medium"
            >
              Workouts
            </TabsTrigger>
            <TabsTrigger 
              value="meals" 
              className="rounded-none flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent text-sm font-medium"
            >
              Meals
            </TabsTrigger>
            <TabsTrigger 
              value="shopping" 
              className="rounded-none flex-1 py-3 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent text-sm font-medium"
            >
              Shopping
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Plan Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Summary</CardTitle>
                <CardDescription>Your fitness plan details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Primary Goal</Label>
                    <p className="font-medium capitalize">
                      {preferences.fitnessGoal?.replace("_", " ")}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Workout Days Per Week
                    </Label>
                    <p className="font-medium">{preferences.workoutDaysPerWeek}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Workout Duration
                    </Label>
                    <p className="font-medium">
                      {preferences.workoutDuration} minutes
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Dietary Preference
                    </Label>
                    <p className="font-medium capitalize">
                      {preferences.dietaryPreference}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Nutrition Goals</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-gradient-to-r from-amber-50 to-amber-100/30 dark:from-amber-950/50 dark:to-amber-900/30 rounded-md">
                      <span className="text-xs text-muted-foreground block">
                        Daily Calories
                      </span>
                      <span className="font-medium text-amber-700 dark:text-amber-300">
                        {Math.round(
                          preferences?.nutritionData?.calories || 
                          preferences?.nutritionGoals?.calories || 
                          mealPlan?.nutritionData?.calories || 
                          mealPlan?.dailyNutrition?.calories || 0
                        )} kcal
                      </span>
                    </div>
                    <div className="p-2 bg-gradient-to-r from-green-50 to-green-100/30 dark:from-green-950/50 dark:to-green-900/30 rounded-md">
                      <span className="text-xs text-muted-foreground block">
                        Protein
                      </span>
                      <span className="font-medium text-green-700 dark:text-green-300">
                        {Math.round(
                          preferences?.nutritionData?.protein || 
                          preferences?.nutritionGoals?.protein || 
                          mealPlan?.nutritionData?.protein || 
                          mealPlan?.dailyNutrition?.protein || 0
                        )}g
                      </span>
                    </div>
                    <div className="p-2 bg-gradient-to-r from-blue-50 to-blue-100/30 dark:from-blue-950/50 dark:to-blue-900/30 rounded-md">
                      <span className="text-xs text-muted-foreground block">
                        Carbs
                      </span>
                      <span className="font-medium text-blue-700 dark:text-blue-300">
                        {Math.round(
                          preferences?.nutritionData?.carbs || 
                          preferences?.nutritionGoals?.carbs || 
                          mealPlan?.nutritionData?.carbs || 
                          mealPlan?.dailyNutrition?.carbs || 0
                        )}g
                      </span>
                    </div>
                    <div className="p-2 bg-gradient-to-r from-purple-50 to-purple-100/30 dark:from-purple-950/50 dark:to-purple-900/30 rounded-md">
                      <span className="text-xs text-muted-foreground block">
                        Fat
                      </span>
                      <span className="font-medium text-purple-700 dark:text-purple-300">
                        {Math.round(
                          preferences?.nutritionData?.fat || 
                          preferences?.nutritionGoals?.fat || 
                          mealPlan?.nutritionData?.fat || 
                          mealPlan?.dailyNutrition?.fat || 0
                        )}g
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Integration Card */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Integration</CardTitle>
                <CardDescription>Add plan data to your tracking logs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-5 w-5 text-indigo-500" />
                        <div>
                          <p className="font-medium">Workout Schedule</p>
                          <p className="text-xs text-muted-foreground">
                            Add workouts to your tracker
                          </p>
                        </div>
                      </div>
                      {hasIntegratedWorkouts ? (
                        <Badge variant="outline" className="border-green-400 text-green-600 bg-green-50">
                          <CheckCheck className="h-3 w-3 mr-1" />
                          Added
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => createWorkoutsMutation.mutate(planId)}
                          disabled={createWorkoutsMutation.isPending}
                        >
                          {createWorkoutsMutation.isPending ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Add
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Utensils className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">Meal Schedule</p>
                          <p className="text-xs text-muted-foreground">
                            Add meals to your nutrition log
                          </p>
                        </div>
                      </div>
                      {hasIntegratedMeals ? (
                        <Badge variant="outline" className="border-green-400 text-green-600 bg-green-50">
                          <CheckCheck className="h-3 w-3 mr-1" />
                          Added
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => createMealsMutation.mutate(planId)}
                          disabled={createMealsMutation.isPending}
                        >
                          {createMealsMutation.isPending ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <Alert variant="default" className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-500" />
                    <AlertTitle>Integration Features</AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground">
                      Adding your plan content to tracking logs makes it easier to
                      follow your plan. Workouts will appear in your workout tracker,
                      and meals will be added to your nutrition log.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Workout Plan Tab */}
        <TabsContent value="workouts" className="pt-4 px-4 sm:px-0">
          <Card className="border rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 p-4 sm:p-6">
              <CardTitle>Weekly Workout Schedule</CardTitle>
              <CardDescription>
                Your personalized workout plan based on your goals and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {workoutPlan && workoutPlan.weeklySchedule && (
                <div>
                  {/* Day selector dropdown */}
                  <div className="mb-6">
                    <div className="flex items-center mb-3">
                      <Calendar className="h-4 w-4 text-primary mr-2" />
                      <label htmlFor="workout-day-select" className="text-sm font-medium">
                        Select Workout Day
                      </label>
                    </div>
                    <div className="relative">
                      <select 
                        id="workout-day-select" 
                        className="w-full p-3 pr-10 border rounded-lg bg-background appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        defaultValue={sortDaysOfWeek(Object.keys(workoutPlan.weeklySchedule))[0]}
                        onChange={(e) => {
                          setSelectedWorkoutDay(e.target.value);
                        }}
                      >
                        {sortDaysOfWeek(Object.keys(workoutPlan.weeklySchedule)).map((day) => (
                          <option key={day} value={day}>
                            {day.charAt(0).toUpperCase() + day.slice(1)} 
                            {workoutPlan.weeklySchedule[day].isRestDay ? ' (Rest Day)' : 
                             ` - ${workoutPlan.weeklySchedule[day].name || 'Workout'}`}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[35vh] pr-2 rounded max-w-full">
                    <div className="space-y-4">
                      {/* Only show the selected day */}
                      {(() => {
                        const day = selectedWorkoutDay || sortDaysOfWeek(Object.keys(workoutPlan.weeklySchedule))[0];
                        const workout = workoutPlan.weeklySchedule[day];
                        
                        return (
                          <div key={day} className="space-y-4">
                            <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20 p-4 rounded-xl mb-4">
                              <div className="flex items-center gap-2">
                                <div className="bg-primary/10 rounded-full p-2">
                                  <Calendar className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="text-lg font-medium capitalize">
                                  {day}
                                </h3>
                              </div>
                              {workout.isRestDay ? (
                                <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-300 px-3 py-1">
                                  <Coffee className="h-3.5 w-3.5 mr-1.5" />
                                  Rest Day
                                </Badge>
                              ) : (
                                <Badge className="bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300 px-3 py-1">
                                  <Clock className="h-3.5 w-3.5 mr-1.5" />
                                  {preferences.workoutDuration || workout.duration || 60} min
                                </Badge>
                              )}
                            </div>

                            {workout.isRestDay ? (
                              <p className="text-sm text-muted-foreground">
                                Take a break today to allow your body to recover.
                              </p>
                            ) : (
                              <>
                                <p className="text-sm font-medium">{workout.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {workout.description}
                                </p>

                                <div className="space-y-4 mt-4">
                                  {workout.exercises &&
                                    workout.exercises.map((exercise: any, index: number) => (
                                      <div
                                        key={index}
                                        className="p-4 border rounded-xl bg-background shadow-sm hover:border-primary/30 hover:bg-muted/10 transition-all"
                                      >
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="bg-primary/10 rounded-full p-1">
                                            <Dumbbell className="h-4 w-4 text-primary" />
                                          </div>
                                          <p className="font-medium">{exercise.name}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                          <Badge variant="secondary" className="font-normal">
                                            {exercise.sets} sets
                                          </Badge>
                                          <Badge variant="secondary" className="font-normal">
                                            {exercise.reps} reps
                                          </Badge>
                                          {exercise.rest && (
                                            <Badge variant="secondary" className="font-normal">
                                              {exercise.rest}s rest
                                            </Badge>
                                          )}
                                          {exercise.weight && (
                                            <Badge variant="secondary" className="font-normal">
                                              {exercise.weight} weight
                                            </Badge>
                                          )}
                                        </div>
                                        {exercise.notes && (
                                          <div className="mt-3 bg-muted/30 p-3 rounded-md text-xs text-muted-foreground">
                                            <span className="font-medium">Note:</span> {exercise.notes}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between border-t p-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Tip:</span> Track your progress by logging
                each workout when completed.
              </div>
              <Button
                onClick={() => navigate("/workouts")}
                size="sm"
                className="gap-1"
              >
                <Calendar className="h-4 w-4" />
                Workout Log
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Meal Plan Tab */}
        <TabsContent value="meals" className="pt-4 px-4 sm:px-0">
          <Card className="border rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/40 dark:to-teal-950/40 p-4 sm:p-6">
              <CardTitle>Weekly Meal Plan</CardTitle>
              <CardDescription>
                Your personalized meal plan based on your nutritional goals
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {mealPlan && (mealPlan.weeklyMeals || mealPlan.weeklyMealPlan) && (
                <>
                  {/* Mobile-friendly day selector dropdown */}
                  <div className="mb-6">
                    <div className="flex items-center mb-3">
                      <Calendar className="h-4 w-4 text-primary mr-2" />
                      <label htmlFor="meal-day-select" className="text-sm font-medium">
                        Select Day
                      </label>
                    </div>
                    <div className="relative">
                      <select 
                        id="meal-day-select" 
                        className="w-full p-3 pr-10 border rounded-lg bg-background appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        defaultValue={sortDaysOfWeek(Object.keys(mealPlan.weeklyMeals || mealPlan.weeklyMealPlan))[0]}
                        onChange={(e) => {
                          setSelectedMealDay(e.target.value);
                        }}
                      >
                        {sortDaysOfWeek(Object.keys(mealPlan.weeklyMeals || mealPlan.weeklyMealPlan)).map((day) => (
                          <option key={day} value={day}>
                            {day.charAt(0).toUpperCase() + day.slice(1)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                

                </>
              )}
              
              <ScrollArea className="h-[35vh] pr-2 rounded max-w-full">
                <div className="space-y-3">
                  {mealPlan && (mealPlan.weeklyMeals || mealPlan.weeklyMealPlan) && 
                    (() => {
                      const day = selectedMealDay || Object.keys(mealPlan.weeklyMeals || mealPlan.weeklyMealPlan)[0];
                      const meals = (mealPlan.weeklyMeals || mealPlan.weeklyMealPlan)[day];
                      
                      return (
                        <div key={day} className="space-y-4">
                          <div className="flex items-center justify-between bg-gradient-to-r from-green-50/50 to-teal-50/50 dark:from-green-950/20 dark:to-teal-950/20 p-4 rounded-xl mb-4">
                            <div className="flex items-center gap-2">
                              <div className="bg-primary/10 rounded-full p-2">
                                <Calendar className="h-5 w-5 text-primary" />
                              </div>
                              <h3 className="text-lg font-medium capitalize">
                                {day}
                              </h3>
                            </div>
                            <Badge className="bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-900 dark:text-teal-300 px-3 py-1">
                              <Utensils className="h-3.5 w-3.5 mr-1.5" />
                              {Object.keys(meals).length} meals
                            </Badge>
                          </div>

                          <div className="space-y-6">
                            {/* Handle all meal types dynamically */}
                            {Object.entries(meals).map(([mealType, meal]) => {
                              if (!meal || mealType === "snacks") return null;
                              
                              // Get the display name for this meal type
                              const displayName = getMealDisplayName(mealType);
                              
                              return (
                                <div key={mealType} className="space-y-3">
                                  <div className="flex items-center">
                                    {mealType === "breakfast" && <Coffee className="h-4 w-4 mr-2 text-amber-500" />}
                                    {mealType === "pre_workout" && <Dumbbell className="h-4 w-4 mr-2 text-orange-500" />}
                                    {mealType === "lunch" && <Utensils className="h-4 w-4 mr-2 text-blue-500" />}
                                    {mealType === "post_workout" && <Activity className="h-4 w-4 mr-2 text-indigo-500" />}
                                    {mealType === "dinner" && <ChefHat className="h-4 w-4 mr-2 text-purple-500" />}
                                    {mealType.startsWith('meal') && <Utensils className="h-4 w-4 mr-2 text-cyan-500" />}
                                    {mealType === "morningSnack" && <Apple className="h-4 w-4 mr-2 text-green-500" />}
                                    {mealType === "afternoonSnack" && <Apple className="h-4 w-4 mr-2 text-green-500" />}
                                    {mealType === "eveningSnack" && <Apple className="h-4 w-4 mr-2 text-green-500" />}
                                    <h4 className="font-medium text-sm">{displayName}</h4>
                                  </div>

                                  <MealDetailCard 
                                    meal={meal}
                                    mealType={mealType}
                                    displayTitle={displayName}
                                  />
                                  
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-xs h-7 px-2"
                                      onClick={() => {
                                        // Scroll to the meal in the shopping list
                                        document.getElementById(`meal-shopping-${selectedMealDay}-${mealType}`)?.scrollIntoView({ 
                                          behavior: 'smooth', 
                                          block: 'center' 
                                        });
                                        
                                        // Switch to the shopping tab
                                        document.getElementById('tab-byMeal')?.click();
                                      }}
                                    >
                                      <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                                      Ingredients
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="text-xs h-7 px-2"
                                      onClick={() => createMealsMutation.mutate(planId)}
                                      disabled={hasIntegratedMeals}
                                    >
                                      <PieChart className="h-3.5 w-3.5 mr-1" />
                                      Log to Nutrition
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                            
                            {/* Handle snacks separately since they can be an array */}
                            {meals.snacks && (
                              <div className="space-y-3">
                                <div className="flex items-center">
                                  <Apple className="h-4 w-4 mr-2 text-green-500" />
                                  <h4 className="font-medium capitalize text-sm">
                                    Snacks
                                  </h4>
                                </div>
                                
                                {/* If snacks is an array, map through them */}
                                {Array.isArray(meals.snacks) ? (
                                  <div className="space-y-3">
                                    {meals.snacks.map((snack: any, index: number) => (
                                      <details key={index} className="p-4 border rounded-xl bg-background shadow-sm hover:border-primary/30 hover:bg-muted/10 transition-all">
                                        <summary className="cursor-pointer list-none">
                                          <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                              <p className="font-semibold">
                                                {snack.name}
                                              </p>
                                              
                                              <div className="flex flex-wrap gap-2 mt-2">
                                                <Badge
                                                  variant="outline"
                                                  className="bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-300"
                                                >
                                                  {Math.round(snack.calories || 0)} kcal
                                                </Badge>
                                                <Badge
                                                  variant="outline"
                                                  className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300"
                                                >
                                                  {Math.round(snack.protein || 0)}g P
                                                </Badge>
                                                <Badge
                                                  variant="outline"
                                                  className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300"
                                                >
                                                  {Math.round(snack.carbs || 0)}g C
                                                </Badge>
                                                <Badge
                                                  variant="outline"
                                                  className="bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-300"
                                                >
                                                  {Math.round(snack.fat || 0)}g F
                                                </Badge>
                                              </div>
                                            </div>
                                            
                                            {snack.estimatedCost && (
                                              <Badge
                                                variant="outline"
                                                className="bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900 dark:border-indigo-700 dark:text-indigo-300"
                                              >
                                                ~£{snack.estimatedCost?.toFixed(2)}
                                              </Badge>
                                            )}
                                          </div>
                                        </summary>
                                        
                                        <div className="pt-4">
                                          <p className="text-sm text-muted-foreground">
                                            {snack.description}
                                          </p>

                                          {/* Ingredients */}
                                          {snack.ingredients && snack.ingredients.length > 0 && (
                                            <div className="mt-4 border-t pt-3">
                                              <div className="flex items-center justify-between mb-2">
                                                <p className="text-sm font-medium">
                                                  Ingredients
                                                </p>
                                              </div>
                                              <ul className="text-xs space-y-1.5 mt-1">
                                                {snack.ingredients.map(
                                                  (ingredient: any, i: number) => (
                                                    <li key={i} className="flex items-center gap-2">
                                                      <div className="w-1 h-1 rounded-full bg-primary"></div>
                                                      {typeof ingredient === 'string' 
                                                        ? ingredient 
                                                        : `${ingredient.quantity || ''} ${ingredient.unit || ''} ${ingredient.name || 'ingredient'}`.trim()}
                                                    </li>
                                                  )
                                                )}
                                              </ul>
                                            </div>
                                          )}
                                          
                                          {/* Cooking Instructions */}
                                          {snack.cookingInstructions && 
                                            snack.cookingInstructions.length > 0 && (
                                              <div className="mt-4 border-t pt-3">
                                                <p className="text-sm font-medium mb-2">
                                                  Preparation
                                                </p>
                                                <ol className="text-xs space-y-1.5 list-decimal list-inside">
                                                  {snack.cookingInstructions.map(
                                                    (instruction: string, i: number) => (
                                                      <li key={i} className="pl-1">{instruction}</li>
                                                    )
                                                  )}
                                                </ol>
                                              </div>
                                          )}
                                        </div>
                                      </details>
                                    ))}
                                  </div>
                                ) : (
                                  // Handle a single snack as non-array
                                  <details className="p-4 border rounded-xl bg-background shadow-sm hover:border-primary/30 hover:bg-muted/10 transition-all">
                                    <summary className="cursor-pointer list-none">
                                      <div className="flex justify-between items-start">
                                        <div className="flex flex-col">
                                          <p className="font-semibold">
                                            {(meals.snacks as any).name}
                                          </p>
                                          
                                          <div className="flex flex-wrap gap-2 mt-2">
                                            <Badge
                                              variant="outline"
                                              className="bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-300"
                                            >
                                              {Math.round(
                                                (meals.snacks as any).calories || 
                                                (meals.snacks as any).nutrition?.calories || 0
                                              )}{" "}
                                              kcal
                                            </Badge>
                                            <Badge
                                              variant="outline"
                                              className="bg-green-50 border-green-200 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300"
                                            >
                                              {Math.round(
                                                (meals.snacks as any).protein || 
                                                (meals.snacks as any).nutrition?.protein || 0
                                              )}g
                                              P
                                            </Badge>
                                            <Badge
                                              variant="outline"
                                              className="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300"
                                            >
                                              {Math.round(
                                                (meals.snacks as any).carbs || 
                                                (meals.snacks as any).nutrition?.carbs || 0
                                              )}g
                                              C
                                            </Badge>
                                            <Badge
                                              variant="outline"
                                              className="bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900 dark:border-purple-700 dark:text-purple-300"
                                            >
                                              {Math.round(
                                                (meals.snacks as any).fat || 
                                                (meals.snacks as any).nutrition?.fat || 0
                                              )}g
                                              F
                                            </Badge>
                                          </div>
                                        </div>
                                      </div>
                                    </summary>
                                    
                                    <div className="pt-4 border-t mt-4">
                                      <div className="bg-muted/20 p-3 rounded-lg mt-2">
                                        <p className="text-sm text-muted-foreground italic">
                                          {(meals.snacks as any).description}
                                        </p>
                                      </div>

                                      {/* Handle single snack's details */}
                                      {(meals.snacks as any).ingredients && (
                                        <div className="mt-6 pt-3">
                                          <div className="flex items-center gap-2 mb-3">
                                            <Package2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                            <p className="text-sm font-medium">Ingredients</p>
                                          </div>
                                          <div className="bg-muted/30 rounded-lg p-3">
                                            <ul className="text-xs space-y-2 mt-1">
                                              {(meals.snacks as any).ingredients.map(
                                                (ingredient: any, i: number) => (
                                                  <li key={i} className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-primary/70"></div>
                                                    <span className="text-muted-foreground">
                                                      {typeof ingredient === 'string' 
                                                        ? ingredient 
                                                        : `${ingredient.quantity || ''} ${ingredient.unit || ''} ${ingredient.name || 'ingredient'}`.trim()}
                                                    </span>
                                                  </li>
                                                )
                                              )}
                                            </ul>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                )}
                              </div>
                            )}
                          </div>
                          {day !== "sunday" && <Separator className="mt-4" />}
                        </div>
                      );
                    })()}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="justify-between border-t p-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Tip:</span> Track your nutrition intake
                by logging each meal.
              </div>
              <Button
                onClick={() => navigate("/nutrition")}
                size="sm"
                className="gap-1"
              >
                <Utensils className="h-4 w-4" />
                Nutrition Log
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Shopping List Tab */}
        <TabsContent value="shopping" className="pt-4 px-4 sm:px-0">
          <Card className="border rounded-xl shadow-sm overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shopping List</CardTitle>
                  <CardDescription>
                    All the ingredients you need for your weekly meal plan
                  </CardDescription>
                </div>
                {mealPlan?.shoppingList?.totalCost && (
                  <div className="rounded-lg bg-white dark:bg-background p-2 shadow-sm border">
                    <div className="text-xs text-muted-foreground mb-1">Total Budget</div>
                    <div className="text-lg font-bold">£{mealPlan.shoppingList.totalCost.toFixed(2)}</div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">

            
              <ScrollArea className="h-[40vh] pr-4 rounded">
                <div className="space-y-6">
                  {mealPlan && (mealPlan.shoppingList || mealPlan.ingredients) && (
                    <>
                      {/* Budget Summary Card */}
                      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-100 dark:from-indigo-950 dark:to-blue-950 dark:border-indigo-800 overflow-hidden">
                        <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <CardTitle className="flex items-center gap-2 text-xl">
                                <BarChart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                Weekly Budget Analysis
                              </CardTitle>
                              <CardDescription>
                                Based on your provided budget and meal preferences
                              </CardDescription>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xl font-bold px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border">
                              <span className="text-sm text-muted-foreground mr-1">Budget</span>
                              £{(mealPlan.shoppingList?.budget || mealPlan.budget || 0).toFixed(2)}
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="p-4 sm:p-6 pt-6">
                          {/* Spending Stats */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full">
                                  <ShoppingCart className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h4 className="text-sm font-medium">Estimated Cost</h4>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-xl font-bold">
                                  £{(() => {
                                    // Calculate total cost from multiple possible data sources
                                    const totalCost = 
                                      (mealPlan.shoppingList?.estimatedCost || mealPlan.estimatedCost) || 
                                      
                                      // If we have categories, calculate from items
                                      (mealPlan.shoppingList?.categories && 
                                        Object.values(mealPlan.shoppingList.categories).reduce(
                                          (total: number, category: any) => {
                                            // Handle both array items and object with estimatedCost
                                            if (Array.isArray(category)) {
                                              return total + category.reduce((itemSum: number, item: any) => 
                                                itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                            } else if (category.estimatedCost) {
                                              return total + category.estimatedCost;
                                            } else if (category.items && Array.isArray(category.items)) {
                                              return total + category.items.reduce((itemSum: number, item: any) => 
                                                itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                            }
                                            return total;
                                          }, 0)) || 0;
                                    
                                    return totalCost.toFixed(2);
                                  })()}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`
                                    ${
                                      ((mealPlan.shoppingList as any)?.budgetStatus === "under_budget" && 
                                        "bg-green-50 border-green-200 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300") ||
                                      ((mealPlan.shoppingList as any)?.budgetStatus === "near_budget" &&
                                        "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900 dark:border-amber-700 dark:text-amber-300") ||
                                      ((mealPlan.shoppingList as any)?.budgetStatus === "over_budget" &&
                                        "bg-red-50 border-red-200 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-300") ||
                                      "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300"
                                    }
                                  `}
                                >
                                  {(mealPlan.shoppingList as any)?.budgetStatus === "under_budget" && "Under Budget"}
                                  {(mealPlan.shoppingList as any)?.budgetStatus === "near_budget" && "Near Budget"}
                                  {(mealPlan.shoppingList as any)?.budgetStatus === "over_budget" && "Over Budget"}
                                  {!(mealPlan.shoppingList as any)?.budgetStatus && "Budget Status"}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700">
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                                  <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <h4 className="text-sm font-medium">Remaining Budget</h4>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="text-xl font-bold">
                                  £{(() => {
                                    // Calculate total cost from multiple possible data sources
                                    const totalCost = 
                                      (mealPlan.shoppingList?.estimatedCost || mealPlan.estimatedCost) || 
                                      
                                      // If we have categories, calculate from items
                                      (mealPlan.shoppingList?.categories && 
                                        Object.values(mealPlan.shoppingList.categories).reduce(
                                          (total: number, category: any) => {
                                            // Handle both array items and object with estimatedCost
                                            if (Array.isArray(category)) {
                                              return total + category.reduce((itemSum: number, item: any) => 
                                                itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                            } else if (category.estimatedCost) {
                                              return total + category.estimatedCost;
                                            } else if (category.items && Array.isArray(category.items)) {
                                              return total + category.items.reduce((itemSum: number, item: any) => 
                                                itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                            }
                                            return total;
                                          }, 0)) || 0;
                                    
                                    const budget = mealPlan.shoppingList?.budget || mealPlan.budget || 0;
                                    const remainingBudget = Math.max(0, budget - totalCost);
                                    
                                    return remainingBudget.toFixed(2);
                                  })()}
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`
                                    ${(() => {
                                      // Calculate total cost from multiple possible data sources
                                      const totalCost = 
                                        (mealPlan.shoppingList?.estimatedCost || mealPlan.estimatedCost) || 
                                        
                                        // If we have categories, calculate from items
                                        (mealPlan.shoppingList?.categories && 
                                          Object.values(mealPlan.shoppingList.categories).reduce(
                                            (total: number, category: any) => {
                                              // Handle both array items and object with estimatedCost
                                              if (Array.isArray(category)) {
                                                return total + category.reduce((itemSum: number, item: any) => 
                                                  itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                              } else if (category.estimatedCost) {
                                                return total + category.estimatedCost;
                                              } else if (category.items && Array.isArray(category.items)) {
                                                return total + category.items.reduce((itemSum: number, item: any) => 
                                                  itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                              }
                                              return total;
                                            }, 0)) || 0;
                                      
                                      const budget = mealPlan.shoppingList?.budget || mealPlan.budget || 0;
                                      
                                      return budget - totalCost > 0 ? 
                                        "bg-green-50 border-green-200 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300" :
                                        "bg-red-50 border-red-200 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-300";
                                    })()}
                                  `}
                                >
                                  {(() => {
                                    // Calculate total cost from multiple possible data sources
                                    const totalCost = 
                                      (mealPlan.shoppingList?.estimatedCost || mealPlan.estimatedCost) || 
                                      
                                      // If we have categories, calculate from items
                                      (mealPlan.shoppingList?.categories && 
                                        Object.values(mealPlan.shoppingList.categories).reduce(
                                          (total: number, category: any) => {
                                            // Handle both array items and object with estimatedCost
                                            if (Array.isArray(category)) {
                                              return total + category.reduce((itemSum: number, item: any) => 
                                                itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                            } else if (category.estimatedCost) {
                                              return total + category.estimatedCost;
                                            } else if (category.items && Array.isArray(category.items)) {
                                              return total + category.items.reduce((itemSum: number, item: any) => 
                                                itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                            }
                                            return total;
                                          }, 0)) || 0;
                                    
                                    const budget = mealPlan.shoppingList?.budget || mealPlan.budget || 0;
                                    
                                    return budget - totalCost > 0 ? "Available" : "Exceeded";
                                  })()}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {/* Budget Progress Bar */}
                          {(mealPlan.shoppingList?.budget || mealPlan.budget) && (
                            <div className="space-y-3 mb-6">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Budget Progress</span>
                                <div className="flex gap-4">
                                  <span className="flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span> Under
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span> Near
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span> Over
                                  </span>
                                </div>
                              </div>
                              <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden shadow-sm">
                                <div
                                  className={`h-full rounded-full transition-all ${(() => {
                                    // Calculate total cost from multiple possible data sources
                                    const totalCost = 
                                      (mealPlan.shoppingList?.estimatedCost || mealPlan.estimatedCost) || 
                                      
                                      // If we have categories, calculate from items
                                      (mealPlan.shoppingList?.categories && 
                                        Object.values(mealPlan.shoppingList.categories).reduce(
                                          (total: number, category: any) => {
                                            // Handle both array items and object with estimatedCost
                                            if (Array.isArray(category)) {
                                              return total + category.reduce((itemSum: number, item: any) => 
                                                itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                            } else if (category.estimatedCost) {
                                              return total + category.estimatedCost;
                                            } else if (category.items && Array.isArray(category.items)) {
                                              return total + category.items.reduce((itemSum: number, item: any) => 
                                                itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                            }
                                            return total;
                                          }, 0)) || 0;
                                    
                                    const budget = mealPlan.shoppingList?.budget || mealPlan.budget || 1;
                                    const percentUsed = totalCost / budget;
                                    
                                    // First check for explicit status
                                    if (mealPlan.shoppingList?.budgetStatus === "under_budget") {
                                      return "bg-gradient-to-r from-green-400 to-green-500";
                                    } else if (mealPlan.shoppingList?.budgetStatus === "near_budget") {
                                      return "bg-gradient-to-r from-amber-400 to-amber-500";
                                    } else if (mealPlan.shoppingList?.budgetStatus === "over_budget") {
                                      return "bg-gradient-to-r from-red-400 to-red-500";
                                    }
                                    
                                    // Otherwise calculate based on percentage
                                    if (percentUsed < 0.75) {
                                      return "bg-gradient-to-r from-green-400 to-green-500";
                                    } else if (percentUsed < 0.9) {
                                      return "bg-gradient-to-r from-amber-400 to-amber-500";
                                    } else {
                                      return "bg-gradient-to-r from-red-400 to-red-500";
                                    }
                                  })()}`}
                                  style={{
                                    width: `${(() => {
                                      // Calculate total cost from multiple possible data sources
                                      const totalCost = 
                                        (mealPlan.shoppingList?.estimatedCost || mealPlan.estimatedCost) || 
                                        
                                        // If we have categories, calculate from items
                                        (mealPlan.shoppingList?.categories && 
                                          Object.values(mealPlan.shoppingList.categories).reduce(
                                            (total: number, category: any) => {
                                              // Handle both array items and object with estimatedCost
                                              if (Array.isArray(category)) {
                                                return total + category.reduce((itemSum: number, item: any) => 
                                                  itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                              } else if (category.estimatedCost) {
                                                return total + category.estimatedCost;
                                              } else if (category.items && Array.isArray(category.items)) {
                                                return total + category.items.reduce((itemSum: number, item: any) => 
                                                  itemSum + (item.estimated_price || item.estimatedPrice || 0), 0);
                                              }
                                              return total;
                                            }, 0)) || 0;
                                      
                                      const budget = mealPlan.shoppingList?.budget || mealPlan.budget || 1;
                                      // Cap at 100% for visual display, even if over budget
                                      return Math.min(100, (totalCost / budget) * 100);
                                    })()}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      {/* Category Breakdown */}
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <BarChart className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          Spending by Category
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                          {(mealPlan.shoppingList as any)?.categories && 
                            Object.entries((mealPlan.shoppingList as any).categories)
                              .filter(([_, items]: [string, any]) => items.estimatedCost)
                              .sort((a: [string, any], b: [string, any]) => (b[1].estimatedCost || 0) - (a[1].estimatedCost || 0))
                              .slice(0, 6)
                              .map(([category, items]: [string, any]) => {
                                // Calculate percentage of total budget
                                const percentOfTotal = Math.round(
                                  ((items.estimatedCost || 0) / ((mealPlan.shoppingList as any)?.estimatedCost || 1)) * 100
                                );
                                
                                // Determine category icon
                                let categoryIcon;
                                if (category === 'Produce') {
                                  categoryIcon = <Apple className="h-4 w-4 text-green-500" />;
                                } else if (category === 'Meat & Seafood') {
                                  categoryIcon = <Beef className="h-4 w-4 text-red-500" />;
                                } else if (category === 'Dairy & Eggs') {
                                  categoryIcon = <Milk className="h-4 w-4 text-blue-500" />;
                                } else if (category === 'Grains & Bread') {
                                  categoryIcon = <Wheat className="h-4 w-4 text-amber-500" />;
                                } else if (category === 'Frozen Foods' || category === 'Frozen') {
                                  categoryIcon = <Snowflake className="h-4 w-4 text-cyan-500" />;
                                } else if (category === 'Pantry') {
                                  categoryIcon = <Package className="h-4 w-4 text-yellow-500" />;
                                } else if (category === 'Spices & Herbs') {
                                  categoryIcon = <Flower2 className="h-4 w-4 text-purple-500" />;
                                } else if (category === 'Beverages') {
                                  categoryIcon = <Wine className="h-4 w-4 text-rose-500" />;
                                } else if (category === 'Oils & Condiments') {
                                  categoryIcon = <FlaskConical className="h-4 w-4 text-orange-500" />;
                                } else if (category === 'Snacks') {
                                  categoryIcon = <Coffee className="h-4 w-4 text-purple-500" />;
                                } else {
                                  categoryIcon = <ShoppingBag className="h-4 w-4 text-gray-500" />;
                                }
                                
                                return (
                                  <div 
                                    key={category} 
                                    className="bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-gray-700"
                                  >
                                    <div className="flex justify-between items-center mb-3">
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-700">
                                          {categoryIcon}
                                        </div>
                                        <span className="text-sm font-medium capitalize">{category}</span>
                                      </div>
                                      <Badge className="font-medium" variant="outline">
                                        £{items.estimatedCost?.toFixed(2) || "0.00"}
                                      </Badge>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${Math.min(
                                            100,
                                            ((items.estimatedCost || 0) /
                                              ((mealPlan.shoppingList as any)?.estimatedCost || 1)) *
                                              100
                                          )}%`,
                                          background: `linear-gradient(to right, 
                                            ${category === 'Produce' ? '#22c55e' : 
                                              category === 'Meat & Seafood' ? '#ef4444' : 
                                              category === 'Dairy & Eggs' ? '#3b82f6' : 
                                              category === 'Grains & Bread' ? '#f59e0b' : 
                                              category === 'Frozen Foods' || category === 'Frozen' ? '#06b6d4' : 
                                              category === 'Pantry' ? '#eab308' : 
                                              category === 'Spices & Herbs' ? '#a855f7' : 
                                              category === 'Beverages' ? '#f43f5e' : 
                                              category === 'Oils & Condiments' ? '#f97316' : 
                                              category === 'Snacks' ? '#a855f7' : 
                                              '#6366f1'}, 
                                            ${category === 'Produce' ? '#16a34a' : 
                                              category === 'Meat & Seafood' ? '#dc2626' : 
                                              category === 'Dairy & Eggs' ? '#2563eb' : 
                                              category === 'Grains & Bread' ? '#d97706' : 
                                              category === 'Frozen Foods' || category === 'Frozen' ? '#0891b2' : 
                                              category === 'Pantry' ? '#ca8a04' : 
                                              category === 'Spices & Herbs' ? '#9333ea' : 
                                              category === 'Beverages' ? '#e11d48' : 
                                              category === 'Oils & Condiments' ? '#ea580c' : 
                                              category === 'Snacks' ? '#9333ea' : 
                                              '#4f46e5'}
                                          )`,
                                        }}
                                      ></div>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                      <p className="text-xs text-muted-foreground">
                                        {items.items?.length || 0} items
                                      </p>
                                      <p className="text-xs font-medium">
                                        {percentOfTotal}% of total
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                          }
                        </div>
                      </div>

                      {/* Shopping List Items */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-1">Shopping List</h3>
                        <p className="text-sm text-muted-foreground mb-2">Items needed for your weekly meal plan</p>

                        
                        {/* Shopping List Tabs - by Category or by Meal */}
                        <Tabs defaultValue="byCategory" className="w-full">
                          <TabsList className="mb-2 w-full grid grid-cols-3 gap-1">
                            <TabsTrigger value="byCategory" id="tab-byCategory" className="text-xs sm:text-sm">Category</TabsTrigger>
                            <TabsTrigger value="byMeal" id="tab-byMeal" className="text-xs sm:text-sm">Meal</TabsTrigger>
                            <TabsTrigger value="byBudget" id="tab-shopping" className="text-xs sm:text-sm">Budget</TabsTrigger>
                          </TabsList>
                          
                          {/* Budget Summary */}
                          <div className="mb-4 p-4 bg-white dark:bg-gray-900 rounded-xl border shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-3">
                              <div>
                                <h3 className="text-base font-medium flex items-center gap-2">
                                  <ShopIcon className="h-5 w-5 text-blue-500" />
                                  Shopping Details
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  Your shopping list from {preferredStore} with a budget of £{weeklyBudget.toFixed(2)}
                                </p>
                              </div>
                              
                              {budgetInfo && (
                                <Badge 
                                  variant={budgetInfo.isOverBudget ? "destructive" : "default"}
                                  className={`
                                    ${budgetInfo.isOverBudget 
                                      ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" 
                                      : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"}
                                    py-1.5 px-3 text-sm
                                  `}
                                >
                                  {budgetInfo.isOverBudget 
                                    ? <TrendingUp className="h-4 w-4 mr-1 inline" /> 
                                    : <TrendingDown className="h-4 w-4 mr-1 inline" />}
                                  £{budgetInfo.totalCost.toFixed(2)} ({budgetInfo.budgetPercentage}% of budget)
                                </Badge>
                              )}
                            </div>
                            
                            {budgetInfo && (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                  <span>£0</span>
                                  <span className="font-medium">Budget Usage</span>
                                  <span>£{weeklyBudget.toFixed(2)}</span>
                                </div>
                                <div className={`h-2.5 w-full rounded-full ${
                                    budgetInfo.budgetPercentage > 100 
                                      ? "bg-red-100 dark:bg-red-900" 
                                      : budgetInfo.budgetPercentage > 90 
                                        ? "bg-amber-100 dark:bg-amber-900" 
                                        : "bg-green-100 dark:bg-green-900"
                                  } overflow-hidden`}>
                                  <div 
                                    className={`h-full ${
                                      budgetInfo.budgetPercentage > 100 
                                        ? "bg-red-500 dark:bg-red-400" 
                                        : budgetInfo.budgetPercentage > 90 
                                          ? "bg-amber-500 dark:bg-amber-400" 
                                          : "bg-green-500 dark:bg-green-400"
                                    }`}
                                    style={{ width: `${Math.min(100, budgetInfo.budgetPercentage)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground italic mt-1">
                                  {budgetInfo.isOverBudget 
                                    ? `You're £${(budgetInfo.totalCost - weeklyBudget).toFixed(2)} over your budget of £${weeklyBudget.toFixed(2)}` 
                                    : `You're £${(weeklyBudget - budgetInfo.totalCost).toFixed(2)} under your budget of £${weeklyBudget.toFixed(2)}`}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* By Category View */}
                          <TabsContent value="byCategory" className="space-y-6">
                            {/* Enhanced check for shopping list data */}
                            {!((mealPlan.shoppingList as any)?.categories || (mealPlan.ingredients?.categories)) ? (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-3">
                                  <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="font-medium">No Shopping List Available</h3>
                                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                  The shopping list for this meal plan hasn't been generated yet or contains no items.
                                </p>
                              </div>
                            ) : (
                              Object.entries((mealPlan.shoppingList as any)?.categories || (mealPlan.ingredients?.categories) || {}).map(
                                ([category, items]: [string, any]) => (
                                  <div key={category} className="mb-4">
                                    <Collapsible
                                      defaultOpen={true}
                                      className="rounded-xl border shadow-sm overflow-hidden"
                                    >
                                      <CollapsibleTrigger className="flex w-full items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/60 dark:to-gray-900/60 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                                        <div className="flex items-center gap-3">
                                          <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center
                                            ${category === 'Produce' && 'bg-green-50 dark:bg-green-900/20'} 
                                            ${category === 'Meat & Seafood' && 'bg-rose-50 dark:bg-rose-900/20'} 
                                            ${category === 'Dairy & Eggs' && 'bg-blue-50 dark:bg-blue-900/20'} 
                                            ${category === 'Grains & Bread' && 'bg-amber-50 dark:bg-amber-900/20'} 
                                            ${category === 'Frozen Foods' && 'bg-cyan-50 dark:bg-cyan-900/20'} 
                                            ${category === 'Oils & Condiments' && 'bg-orange-50 dark:bg-orange-900/20'} 
                                            ${category === 'Snacks' && 'bg-purple-50 dark:bg-purple-900/20'} 
                                            ${category === 'Beverages' && 'bg-blue-50 dark:bg-blue-900/20'} 
                                            ${category === 'Pantry' && 'bg-yellow-50 dark:bg-yellow-900/20'} 
                                            ${!['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Grains & Bread', 'Frozen Foods', 'Oils & Condiments', 'Snacks', 'Beverages', 'Pantry'].includes(category) && 'bg-gray-50 dark:bg-gray-800'}
                                          `}>
                                            {category === 'Produce' && <Salad className="h-5 w-5 text-green-500" />}
                                            {category === 'Meat & Seafood' && <Beef className="h-5 w-5 text-rose-500" />}
                                            {category === 'Dairy & Eggs' && <Milk className="h-5 w-5 text-blue-500" />}
                                            {category === 'Grains & Bread' && <Wheat className="h-5 w-5 text-amber-500" />}
                                            {category === 'Canned Goods' && <Package className="h-5 w-5 text-gray-500" />}
                                            {category === 'Frozen' && <Snowflake className="h-5 w-5 text-cyan-500" />}
                                            {category === 'Frozen Foods' && <Snowflake className="h-5 w-5 text-cyan-500" />}
                                            {category === 'Pantry' && <Package2 className="h-5 w-5 text-orange-500" />}
                                            {category === 'Spices & Herbs' && <FlaskConical className="h-5 w-5 text-purple-500" />}
                                            {category === 'Beverages' && <Wine className="h-5 w-5 text-indigo-500" />}
                                            {category === 'Other' && <ShoppingBag className="h-5 w-5 text-gray-500" />}
                                            {category === 'Oils & Condiments' && <FlaskConical className="h-5 w-5 text-orange-500" />}
                                            {category === 'Snacks' && <Coffee className="h-5 w-5 text-purple-500" />}
                                            {!['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Grains & Bread', 'Frozen Foods', 'Canned Goods', 'Frozen', 'Pantry', 'Spices & Herbs', 'Beverages', 'Other', 'Oils & Condiments', 'Snacks'].includes(category) && <ShoppingBag className="h-5 w-5 text-gray-500" />}
                                          </div>
                                          <div className="flex flex-col">
                                            <h3 className="font-medium capitalize text-sm">{category}</h3>
                                            <p className="text-xs text-muted-foreground">
                                              {Array.isArray(items) ? items.length : 
                                              (items.items ? items.items.length : 0)} items
                                            </p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {items.estimatedCost && (
                                            <Badge variant="outline" className="bg-white dark:bg-gray-900">
                                              ~£{items.estimatedCost.toFixed(2)}
                                            </Badge>
                                          )}
                                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 collapsible-indicator" />
                                        </div>
                                      </CollapsibleTrigger>
                                      <CollapsibleContent className="px-4 pb-4 pt-2 collapsible-content">
                                        <div className="space-y-2">
                                          {Array.isArray(items) ? items.map((item: any, idx: number) => (
                                            <ShoppingListItem 
                                              key={idx} 
                                              item={item}
                                              category={category}
                                              idx={idx}
                                            />
                                          )) : items.items && items.items.map((item: any, idx: number) => (
                                            <ShoppingListItem 
                                              key={idx} 
                                              item={item}
                                              category={category}
                                              idx={idx}
                                            />
                                          ))}
                                        </div>
                                      </CollapsibleContent>
                                    </Collapsible>
                                  </div>
                                )
                              )
                            )}
                          </TabsContent>
                          
                          {/* By Meal View */}
                          <TabsContent value="byMeal" className="space-y-6">
                            {mealPlan && (mealPlan.weeklyMeals || mealPlan.weeklyMealPlan) && (
                              <div className="space-y-6">
                                {Object.entries(mealPlan.weeklyMeals || mealPlan.weeklyMealPlan).map(([day, meals]: [string, any]) => (
                                  <div key={day} className="space-y-3">
                                    <h3 className="font-medium capitalize">{day}</h3>
                                    
                                    <div className="space-y-4 pl-1">
                                      {["breakfast", "lunch", "dinner", "snacks", "pre_workout", "post_workout"].map((mealType) => 
                                        meals[mealType] && meals[mealType].ingredients && meals[mealType].ingredients.length > 0 && (
                                          <div 
                                            key={`${day}-${mealType}`} 
                                            id={`meal-shopping-${day}-${mealType}`}
                                            className="p-3 bg-slate-50 dark:bg-gray-800 rounded-md"
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="flex items-start">
                                                {mealType === "breakfast" && <Coffee className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />}
                                                {mealType === "lunch" && <Utensils className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />}
                                                {mealType === "dinner" && <Utensils className="h-4 w-4 mr-2 mt-0.5 text-purple-500" />}
                                                {mealType === "snacks" && <Apple className="h-4 w-4 mr-2 mt-0.5 text-green-500" />}
                                                {mealType === "pre_workout" && <Dumbbell className="h-4 w-4 mr-2 mt-0.5 text-orange-500" />}
                                                {mealType === "post_workout" && <Activity className="h-4 w-4 mr-2 mt-0.5 text-indigo-500" />}
                                                <div>
                                                  <h4 className="text-sm font-medium">
                                                    {mealType === "pre_workout" ? "Pre-Workout" : 
                                                     mealType === "post_workout" ? "Post-Workout" : 
                                                     mealType.charAt(0).toUpperCase() + mealType.slice(1)}: {meals[mealType].name}
                                                  </h4>
                                                  <p className="text-xs text-muted-foreground">
                                                    {meals[mealType].description?.substring(0, 60)}{meals[mealType].description?.length > 60 ? '...' : ''}
                                                  </p>
                                                </div>
                                              </div>
                                              {meals[mealType].estimatedCost && (
                                                <Badge variant="outline" className="bg-white dark:bg-gray-900">
                                                  ~£{meals[mealType].estimatedCost.toFixed(2)}
                                                </Badge>
                                              )}
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                              {(mealPlan.shoppingList as any)?.itemsByMeal && 
                                               (mealPlan.shoppingList as any).itemsByMeal[`${day}-${mealType}`] ? (
                                                (mealPlan.shoppingList as any).itemsByMeal[`${day}-${mealType}`].map((item: any, i: number) => (
                                                  <div 
                                                    key={i} 
                                                    className="flex items-start gap-2 p-2 bg-white dark:bg-gray-900 rounded"
                                                  >
                                                    <Checkbox id={`meal-item-${day}-${mealType}-${i}`} className="mt-0.5" />
                                                    <div className="flex-1">
                                                      <Label
                                                        htmlFor={`meal-item-${day}-${mealType}-${i}`}
                                                        className="text-sm font-medium cursor-pointer"
                                                      >
                                                        {item.name}
                                                      </Label>
                                                      <div className="flex justify-between items-center mt-0.5">
                                                        {item.quantity && (
                                                          <span className="text-xs text-muted-foreground">
                                                            {typeof item.quantity === 'object' 
                                                              ? `${item.quantity.value || ''} ${item.quantity.unit || ''}`.trim() 
                                                              : item.quantity}
                                                          </span>
                                                        )}
                                                        {item.estimatedCost && (
                                                          <span className="text-xs text-muted-foreground">
                                                            ~£{item.estimatedCost.toFixed(2)}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </div>
                                                ))
                                              ) : (
                                                <div className="col-span-2 p-2 text-sm text-muted-foreground italic">
                                                  Using ingredients from recipe: {meals[mealType].ingredients.map((ingredient: any, i: number) => (
                                                    <span key={i} className="not-italic">
                                                      {i > 0 && ", "}
                                                      {typeof ingredient === 'string'
                                                        ? ingredient
                                                        : `${ingredient.quantity || ''} ${ingredient.unit || ''} ${ingredient.name || 'ingredient'}`.trim()}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                    <Separator className="mt-4" />
                                  </div>
                                ))}
                              </div>
                            )}
                          </TabsContent>
                          
                          {/* By Budget View */}
                          <TabsContent value="byBudget" className="space-y-6">
                            {/* Budget tiers */}
                            <div className="space-y-6">
                              {/* Value items */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-medium flex items-center">
                                    <Badge variant="outline" className="mr-2 bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700">
                                      Value
                                    </Badge>
                                    Budget-Friendly Items
                                  </h3>
                                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900">
                                    Under £3.00
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {(mealPlan.shoppingList as any)?.itemsByBudget && 
                                   (mealPlan.shoppingList as any).itemsByBudget.value?.map((item: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Checkbox id={`value-item-${idx}`} />
                                        <div>
                                          <Label
                                            htmlFor={`value-item-${idx}`}
                                            className="text-sm cursor-pointer"
                                          >
                                            {item.name}
                                            {item.quantity && (
                                              <span className="text-muted-foreground ml-1">
                                                ({typeof item.quantity === 'object' ? `${item.quantity.value || ''} ${item.quantity.unit || ''}`.trim() : item.quantity})
                                              </span>
                                            )}
                                          </Label>
                                          {item.category && (
                                            <div className="text-xs text-muted-foreground">
                                              {item.category}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-xs font-medium text-green-700 dark:text-green-300">
                                        £{item.estimatedCost?.toFixed(2) || "0.00"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Standard items */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-medium flex items-center">
                                    <Badge variant="outline" className="mr-2 bg-blue-50 dark:bg-blue-900 border-blue-200 dark:border-blue-700">
                                      Standard
                                    </Badge>
                                    Regular Items
                                  </h3>
                                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900">
                                    £3.00 - £7.00
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {(mealPlan.shoppingList as any)?.itemsByBudget && 
                                   (mealPlan.shoppingList as any).itemsByBudget.standard?.map((item: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between p-2 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Checkbox id={`standard-item-${idx}`} />
                                        <div>
                                          <Label
                                            htmlFor={`standard-item-${idx}`}
                                            className="text-sm cursor-pointer"
                                          >
                                            {item.name}
                                            {item.quantity && (
                                              <span className="text-muted-foreground ml-1">
                                                ({typeof item.quantity === 'object' ? `${item.quantity.value || ''} ${item.quantity.unit || ''}`.trim() : item.quantity})
                                              </span>
                                            )}
                                          </Label>
                                          {item.category && (
                                            <div className="text-xs text-muted-foreground">
                                              {item.category}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                        £{item.estimatedCost?.toFixed(2) || "0.00"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Premium items */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h3 className="font-medium flex items-center">
                                    <Badge variant="outline" className="mr-2 bg-purple-50 dark:bg-purple-900 border-purple-200 dark:border-purple-700">
                                      Premium
                                    </Badge>
                                    Specialty Items
                                  </h3>
                                  <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900">
                                    Over £7.00
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {(mealPlan.shoppingList as any)?.itemsByBudget && 
                                   (mealPlan.shoppingList as any).itemsByBudget.premium?.map((item: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between p-2 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Checkbox id={`premium-item-${idx}`} />
                                        <div>
                                          <Label
                                            htmlFor={`premium-item-${idx}`}
                                            className="text-sm cursor-pointer"
                                          >
                                            {item.name}
                                            {item.quantity && (
                                              <span className="text-muted-foreground ml-1">
                                                ({typeof item.quantity === 'object' ? `${item.quantity.value || ''} ${item.quantity.unit || ''}`.trim() : item.quantity})
                                              </span>
                                            )}
                                          </Label>
                                          {item.category && (
                                            <div className="text-xs text-muted-foreground">
                                              {item.category}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                                        £{item.estimatedCost?.toFixed(2) || "0.00"}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="justify-between border-t p-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Tip:</span> Check items off as you shop
                to keep track of your shopping list.
              </div>
              <Button size="sm" className="gap-1">
                <ShoppingCart className="h-4 w-4" />
                Print List
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Deactivate Plan Dialog */}
      <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deactivate Fitness Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate your current fitness plan?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="removeFromLogs"
                checked={removeFromLogs}
                onCheckedChange={(checked) => setRemoveFromLogs(checked as boolean)}
              />
              <Label
                htmlFor="removeFromLogs"
                className="text-sm cursor-pointer leading-tight"
              >
                Also remove related workout and meal entries from my logs
              </Label>
            </div>
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-900">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Warning</AlertTitle>
              <AlertDescription className="text-sm">
                This action cannot be undone. You will need to create a new fitness
                plan afterward.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setIsDeactivateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deactivatePlanMutation.mutate({
                  planId,
                  removeDataFromLogs: removeFromLogs,
                })
              }
              disabled={deactivatePlanMutation.isPending}
            >
              {deactivatePlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deactivating...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Deactivate Plan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}