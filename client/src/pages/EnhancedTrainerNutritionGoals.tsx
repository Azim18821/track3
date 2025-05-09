import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Loader2, ArrowLeft, Save, User, Calculator, Utensils,
  Flame, AlertTriangle, PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// Form schema for nutrition goals
const nutritionGoalsSchema = z.object({
  caloriesPerDay: z.number().min(1200, { message: "Minimum daily calories should be at least 1200" }),
  proteinPerDay: z.number().min(30, { message: "Minimum daily protein should be at least 30g" }),
  carbsPerDay: z.number().min(30, { message: "Minimum daily carbs should be at least 30g" }),
  fatPerDay: z.number().min(20, { message: "Minimum daily fat should be at least 20g" }),
  proteinPercentage: z.number().min(10).max(60),
  carbsPercentage: z.number().min(10).max(70),
  fatPercentage: z.number().min(10).max(60),
  clientWeight: z.number().optional(),
  activityLevel: z.string().optional(),
  goal: z.string().optional(),
});

type NutritionGoalsFormValues = z.infer<typeof nutritionGoalsSchema>;

// TDEE formula constants
const activityMultipliers = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9
};

const activityLabels = {
  sedentary: "Sedentary (little or no exercise)",
  lightly_active: "Lightly Active (light exercise 1-3 days/week)",
  moderately_active: "Moderately Active (moderate exercise 3-5 days/week)",
  very_active: "Very Active (hard exercise 6-7 days/week)",
  extra_active: "Extra Active (very hard exercise, physical job or training twice a day)"
};

const goalCalorieAdjustments = {
  weight_loss: -500,    // 500 calorie deficit
  moderate_loss: -250,  // 250 calorie deficit
  maintenance: 0,       // No adjustment
  moderate_gain: 250,   // 250 calorie surplus
  muscle_gain: 500      // 500 calorie surplus
};

const goalLabels = {
  weight_loss: "Weight Loss (500 calorie deficit)",
  moderate_loss: "Moderate Weight Loss (250 calorie deficit)",
  maintenance: "Maintenance (no deficit or surplus)",
  moderate_gain: "Moderate Weight Gain (250 calorie surplus)",
  muscle_gain: "Muscle Gain (500 calorie surplus)"
};

export default function EnhancedTrainerNutritionGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const clientId = params?.clientId;
  
  // UI State
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [caloricSplit, setCaloricSplit] = useState({
    protein: 30,
    carbs: 40,
    fat: 30
  });
  
  // Initialize form
  const form = useForm<NutritionGoalsFormValues>({
    resolver: zodResolver(nutritionGoalsSchema),
    defaultValues: {
      caloriesPerDay: 2000,
      proteinPerDay: 150,
      carbsPerDay: 200,
      fatPerDay: 67,
      proteinPercentage: 30,
      carbsPercentage: 40,
      fatPercentage: 30,
      clientWeight: 70,
      activityLevel: 'moderately_active',
      goal: 'maintenance'
    }
  });
  
  // Watch calories and macro percentages to calculate grams
  const watchCalories = form.watch('caloriesPerDay');
  const watchProteinPct = form.watch('proteinPercentage');
  const watchCarbsPct = form.watch('carbsPercentage');
  const watchFatPct = form.watch('fatPercentage');
  
  // Fetch client details
  const { 
    data: clientData, 
    isLoading: clientLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['/api/trainer/clients', clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/clients/${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch client details');
      return await res.json();
    },
    enabled: !!(user?.isTrainer || user?.isAdmin) && !!clientId
  });
  
  // Update nutrition goals mutation
  const updateNutritionGoalsMutation = useMutation({
    mutationFn: async (data: NutritionGoalsFormValues) => {
      // Convert to the backend field names
      const payload = {
        caloriesTarget: data.caloriesPerDay,
        proteinTarget: data.proteinPerDay,
        carbsTarget: data.carbsPerDay,
        fatTarget: data.fatPerDay
      };
      
      const res = await apiRequest('PUT', `/api/trainer/clients/${clientId}/nutrition-goals`, payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update nutrition goals');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Nutrition goals updated",
        description: "The client's nutrition goals have been updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/clients', clientId] });
      navigate(`/trainer/clients/${clientId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating nutrition goals",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Create nutrition goals mutation (for first time setup)
  const createNutritionGoalsMutation = useMutation({
    mutationFn: async (data: NutritionGoalsFormValues) => {
      // Convert to the backend field names
      const payload = {
        caloriesTarget: data.caloriesPerDay,
        proteinTarget: data.proteinPerDay,
        carbsTarget: data.carbsPerDay,
        fatTarget: data.fatPerDay
      };
      
      const res = await apiRequest('POST', `/api/trainer/clients/${clientId}/nutrition-goals`, payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to create nutrition goals');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Nutrition goals created",
        description: "The client's nutrition goals have been set successfully."
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/clients', clientId] });
      navigate(`/trainer/clients/${clientId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error setting nutrition goals",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Set initial form values from client data
  useEffect(() => {
    if (clientData) {
      const nutritionGoal = clientData.nutritionGoal;
      
      if (nutritionGoal) {
        // Map backend field names to frontend field names
        const caloriesPerDay = nutritionGoal.caloriesTarget;
        const proteinPerDay = nutritionGoal.proteinTarget;
        const carbsPerDay = nutritionGoal.carbsTarget;
        const fatPerDay = nutritionGoal.fatTarget;
        
        // Calculate percentages based on current macros
        const proteinCalories = proteinPerDay * 4;
        const carbsCalories = carbsPerDay * 4;
        const fatCalories = fatPerDay * 9;
        
        const proteinPercentage = Math.round((proteinCalories / caloriesPerDay) * 100);
        const carbsPercentage = Math.round((carbsCalories / caloriesPerDay) * 100);
        const fatPercentage = Math.round((fatCalories / caloriesPerDay) * 100);
        
        // Update form values
        form.reset({
          caloriesPerDay: caloriesPerDay,
          proteinPerDay: proteinPerDay,
          carbsPerDay: carbsPerDay,
          fatPerDay: fatPerDay,
          proteinPercentage: proteinPercentage,
          carbsPercentage: carbsPercentage,
          fatPercentage: fatPercentage,
          clientWeight: clientData.client?.weight || 70,
          activityLevel: clientData.client?.activityLevel || 'moderately_active',
          goal: clientData.client?.fitnessGoal === 'weightLoss' ? 'weight_loss' : 
                clientData.client?.fitnessGoal === 'muscleBuild' ? 'muscle_gain' : 'maintenance'
        });
        
        // Update caloric split state
        setCaloricSplit({
          protein: proteinPercentage,
          carbs: carbsPercentage,
          fat: fatPercentage
        });
      } else {
        // Set defaults based on client data
        form.setValue('clientWeight', clientData.client?.weight || 70);
        form.setValue('activityLevel', clientData.client?.activityLevel || 'moderately_active');
        form.setValue('goal', clientData.client?.fitnessGoal === 'weightLoss' ? 'weight_loss' : 
                           clientData.client?.fitnessGoal === 'muscleBuild' ? 'muscle_gain' : 'maintenance');
      }
    }
  }, [clientData, form]);
  
  // Update macros whenever calories or percentages change
  useEffect(() => {
    const totalCalories = form.getValues('caloriesPerDay');
    const proteinPct = form.getValues('proteinPercentage');
    const carbsPct = form.getValues('carbsPercentage');
    const fatPct = form.getValues('fatPercentage');
    
    // Calculate macros in grams
    const proteinGrams = Math.round((totalCalories * (proteinPct / 100)) / 4); // 4 calories per gram
    const carbsGrams = Math.round((totalCalories * (carbsPct / 100)) / 4); // 4 calories per gram
    const fatGrams = Math.round((totalCalories * (fatPct / 100)) / 9); // 9 calories per gram
    
    form.setValue('proteinPerDay', proteinGrams);
    form.setValue('carbsPerDay', carbsGrams);
    form.setValue('fatPerDay', fatGrams);
    
    // Update caloric split state for visualization
    setCaloricSplit({
      protein: proteinPct,
      carbs: carbsPct,
      fat: fatPct
    });
  }, [watchCalories, watchProteinPct, watchCarbsPct, watchFatPct, form]);
  
  // Handle form submission
  const onSubmit = (data: NutritionGoalsFormValues) => {
    if (clientData?.nutritionGoal) {
      updateNutritionGoalsMutation.mutate(data);
    } else {
      createNutritionGoalsMutation.mutate(data);
    }
  };
  
  // Handle macro split adjustment
  const adjustMacroSplit = (type: 'balanced' | 'high_protein' | 'low_carb' | 'high_carb') => {
    let newSplit;
    
    switch (type) {
      case 'balanced':
        newSplit = { protein: 30, carbs: 40, fat: 30 };
        break;
      case 'high_protein':
        newSplit = { protein: 40, carbs: 30, fat: 30 };
        break;
      case 'low_carb':
        newSplit = { protein: 35, carbs: 25, fat: 40 };
        break;
      case 'high_carb':
        newSplit = { protein: 25, carbs: 55, fat: 20 };
        break;
    }
    
    form.setValue('proteinPercentage', newSplit.protein);
    form.setValue('carbsPercentage', newSplit.carbs);
    form.setValue('fatPercentage', newSplit.fat);
  };
  
  // Calculate TDEE (Total Daily Energy Expenditure)
  const calculateTDEE = () => {
    const weight = form.getValues('clientWeight');
    const activityLevel = form.getValues('activityLevel') as keyof typeof activityMultipliers;
    const goal = form.getValues('goal') as keyof typeof goalCalorieAdjustments;
    
    if (!weight || !activityLevel) {
      toast({
        title: "Missing information",
        description: "Please enter the client's weight and activity level to calculate TDEE.",
        variant: "destructive"
      });
      return;
    }
    
    // Simple TDEE calculation
    // Using weight in kg, multiply by 24 for BMR, then by activity multiplier
    const bmr = weight * 24;
    const tdee = Math.round(bmr * activityMultipliers[activityLevel]);
    
    // Apply goal adjustment
    const adjustedTDEE = tdee + goalCalorieAdjustments[goal];
    
    // Update form
    form.setValue('caloriesPerDay', adjustedTDEE);
    setCalculatorOpen(false);
    
    toast({
      title: "TDEE Calculated",
      description: `Estimated daily calories: ${adjustedTDEE} kcal (${goal.replace('_', ' ')})`,
    });
  };
  
  // Loading and error states
  const isLoading = clientLoading;
  const isSaving = updateNutritionGoalsMutation.isPending || createNutritionGoalsMutation.isPending;
  
  if (!user || (!user.isTrainer && !user.isAdmin)) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "An error occurred while fetching client data"}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate('/trainer')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/trainer/clients/${clientId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Client
        </Button>
        
        <Button 
          disabled={isSaving}
          onClick={form.handleSubmit(onSubmit)}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Goals
            </>
          )}
        </Button>
      </div>
      
      {/* Client info */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">
            <User className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
            Client Information
          </CardTitle>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge className="font-semibold">{clientData?.client?.username}</Badge>
            
            {clientData?.latestWeight && (
              <Badge variant="outline" className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Weight:</span>
                {clientData.latestWeight.weight} {clientData.latestWeight.unit}
              </Badge>
            )}
            
            {clientData?.client?.fitnessGoal && (
              <Badge variant="outline" className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Goal:</span>
                {clientData.client.fitnessGoal}
              </Badge>
            )}
            
            {clientData?.client?.activityLevel && (
              <Badge variant="outline" className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Activity:</span>
                {clientData.client.activityLevel.replace('_', ' ')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center">
                  <Flame className="mr-2 h-5 w-5 text-green-600 dark:text-green-400" />
                  Daily Calories
                </CardTitle>
                
                <Dialog open={calculatorOpen} onOpenChange={setCalculatorOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Calculator className="mr-2 h-4 w-4" />
                      Calculate TDEE
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Calculate Daily Calories</DialogTitle>
                      <DialogDescription>
                        Estimate your client's total daily energy expenditure (TDEE) based on their weight,
                        activity level, and goals.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-2">
                      <div className="space-y-2">
                        <Label>Client Weight (kg)</Label>
                        <Input
                          type="number"
                          min="30"
                          max="200"
                          value={form.getValues('clientWeight')}
                          onChange={e => form.setValue('clientWeight', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Activity Level</Label>
                        <Select 
                          value={form.getValues('activityLevel')}
                          onValueChange={value => form.setValue('activityLevel', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select activity level" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(activityLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Goal</Label>
                        <Select 
                          value={form.getValues('goal')}
                          onValueChange={value => form.setValue('goal', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select goal" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(goalLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCalculatorOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={calculateTDEE}>
                        Calculate
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <CardDescription>
                Set the client's daily caloric target
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              <FormField
                control={form.control}
                name="caloriesPerDay"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-base">Daily Calories</FormLabel>
                      <span className="text-2xl font-bold">{field.value} kcal</span>
                    </div>
                    <FormControl>
                      <Slider
                        min={1200}
                        max={5000}
                        step={50}
                        value={[field.value]}
                        onValueChange={(values) => field.onChange(values[0])}
                        className="py-4"
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1200 kcal</span>
                      <span>5000 kcal</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg flex items-center">
                  <PieChart className="mr-2 h-5 w-5 text-green-600 dark:text-green-400" />
                  Macronutrient Split
                </CardTitle>
                
                <div className="flex space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => adjustMacroSplit('balanced')}
                        >
                          Balanced
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">30% Protein, 40% Carbs, 30% Fat</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => adjustMacroSplit('high_protein')}
                        >
                          High Protein
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">40% Protein, 30% Carbs, 30% Fat</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => adjustMacroSplit('low_carb')}
                        >
                          Low Carb
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">35% Protein, 25% Carbs, 40% Fat</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => adjustMacroSplit('high_carb')}
                        >
                          High Carb
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">25% Protein, 55% Carbs, 20% Fat</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              <CardDescription>
                Adjust the percentage of calories from each macronutrient
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-2 space-y-6">
              {/* Visual representation of the macronutrient split */}
              <div className="w-full h-8 rounded-full overflow-hidden flex">
                <div 
                  className="bg-blue-500 h-full flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${caloricSplit.protein}%` }}
                >
                  {caloricSplit.protein}%
                </div>
                <div 
                  className="bg-amber-500 h-full flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${caloricSplit.carbs}%` }}
                >
                  {caloricSplit.carbs}%
                </div>
                <div 
                  className="bg-red-500 h-full flex items-center justify-center text-xs text-white font-medium"
                  style={{ width: `${caloricSplit.fat}%` }}
                >
                  {caloricSplit.fat}%
                </div>
              </div>
              
              <div className="flex justify-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-1"></div>
                  <span className="text-xs">Protein</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-amber-500 rounded-full mr-1"></div>
                  <span className="text-xs">Carbs</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                  <span className="text-xs">Fat</span>
                </div>
              </div>
              
              <div className="space-y-5">
                {/* Protein slider */}
                <FormField
                  control={form.control}
                  name="proteinPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                          Protein
                        </FormLabel>
                        <div className="space-x-2 text-sm">
                          <span className="font-semibold">{field.value}%</span>
                          <span>({form.getValues('proteinPerDay')}g)</span>
                        </div>
                      </div>
                      <FormControl>
                        <Slider
                          min={10}
                          max={60}
                          step={5}
                          value={[field.value]}
                          onValueChange={(values) => {
                            // Ensure percentages add up to 100%
                            const newProtein = values[0];
                            const currentTotal = newProtein + form.getValues('carbsPercentage') + form.getValues('fatPercentage');
                            const diff = currentTotal - 100;
                            
                            if (diff > 0) {
                              // Need to reduce other macros
                              const carbsPct = form.getValues('carbsPercentage');
                              const fatPct = form.getValues('fatPercentage');
                              
                              if (carbsPct > fatPct) {
                                // Reduce carbs first
                                const newCarbs = Math.max(10, carbsPct - diff);
                                form.setValue('carbsPercentage', newCarbs);
                                
                                // If we couldn't reduce carbs enough, reduce fat too
                                if (newCarbs === 10) {
                                  form.setValue('fatPercentage', 100 - newProtein - newCarbs);
                                }
                              } else {
                                // Reduce fat first
                                const newFat = Math.max(10, fatPct - diff);
                                form.setValue('fatPercentage', newFat);
                                
                                // If we couldn't reduce fat enough, reduce carbs too
                                if (newFat === 10) {
                                  form.setValue('carbsPercentage', 100 - newProtein - newFat);
                                }
                              }
                            }
                            
                            field.onChange(newProtein);
                          }}
                          className="py-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Carbs slider */}
                <FormField
                  control={form.control}
                  name="carbsPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center">
                          <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
                          Carbs
                        </FormLabel>
                        <div className="space-x-2 text-sm">
                          <span className="font-semibold">{field.value}%</span>
                          <span>({form.getValues('carbsPerDay')}g)</span>
                        </div>
                      </div>
                      <FormControl>
                        <Slider
                          min={10}
                          max={70}
                          step={5}
                          value={[field.value]}
                          onValueChange={(values) => {
                            // Ensure percentages add up to 100%
                            const newCarbs = values[0];
                            const currentTotal = form.getValues('proteinPercentage') + newCarbs + form.getValues('fatPercentage');
                            const diff = currentTotal - 100;
                            
                            if (diff > 0) {
                              // Need to reduce other macros
                              const proteinPct = form.getValues('proteinPercentage');
                              const fatPct = form.getValues('fatPercentage');
                              
                              if (proteinPct > fatPct) {
                                // Reduce protein first
                                const newProtein = Math.max(10, proteinPct - diff);
                                form.setValue('proteinPercentage', newProtein);
                                
                                // If we couldn't reduce protein enough, reduce fat too
                                if (newProtein === 10) {
                                  form.setValue('fatPercentage', 100 - newProtein - newCarbs);
                                }
                              } else {
                                // Reduce fat first
                                const newFat = Math.max(10, fatPct - diff);
                                form.setValue('fatPercentage', newFat);
                                
                                // If we couldn't reduce fat enough, reduce protein too
                                if (newFat === 10) {
                                  form.setValue('proteinPercentage', 100 - newCarbs - newFat);
                                }
                              }
                            }
                            
                            field.onChange(newCarbs);
                          }}
                          className="py-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Fat slider */}
                <FormField
                  control={form.control}
                  name="fatPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          Fat
                        </FormLabel>
                        <div className="space-x-2 text-sm">
                          <span className="font-semibold">{field.value}%</span>
                          <span>({form.getValues('fatPerDay')}g)</span>
                        </div>
                      </div>
                      <FormControl>
                        <Slider
                          min={10}
                          max={60}
                          step={5}
                          value={[field.value]}
                          onValueChange={(values) => {
                            // Ensure percentages add up to 100%
                            const newFat = values[0];
                            const currentTotal = form.getValues('proteinPercentage') + form.getValues('carbsPercentage') + newFat;
                            const diff = currentTotal - 100;
                            
                            if (diff > 0) {
                              // Need to reduce other macros
                              const proteinPct = form.getValues('proteinPercentage');
                              const carbsPct = form.getValues('carbsPercentage');
                              
                              if (proteinPct > carbsPct) {
                                // Reduce protein first
                                const newProtein = Math.max(10, proteinPct - diff);
                                form.setValue('proteinPercentage', newProtein);
                                
                                // If we couldn't reduce protein enough, reduce carbs too
                                if (newProtein === 10) {
                                  form.setValue('carbsPercentage', 100 - newProtein - newFat);
                                }
                              } else {
                                // Reduce carbs first
                                const newCarbs = Math.max(10, carbsPct - diff);
                                form.setValue('carbsPercentage', newCarbs);
                                
                                // If we couldn't reduce carbs enough, reduce protein too
                                if (newCarbs === 10) {
                                  form.setValue('proteinPercentage', 100 - newCarbs - newFat);
                                }
                              }
                            }
                            
                            field.onChange(newFat);
                          }}
                          className="py-2"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Check that percentages add up to 100 */}
              {Math.abs((form.getValues('proteinPercentage') + form.getValues('carbsPercentage') + form.getValues('fatPercentage')) - 100) > 1 && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Invalid macro split</AlertTitle>
                  <AlertDescription>
                    The sum of protein, carbs, and fat percentages should equal 100%.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Utensils className="mr-2 h-5 w-5 text-green-600 dark:text-green-400" />
                Daily Nutrients Summary
              </CardTitle>
              <CardDescription>
                Daily macronutrient targets based on your settings
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl">
                  <div className="text-sm text-muted-foreground">Calories</div>
                  <div className="text-2xl font-bold mt-1">{form.getValues('caloriesPerDay')}</div>
                  <div className="text-xs text-muted-foreground">kcal/day</div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl">
                  <div className="text-sm text-muted-foreground">Protein</div>
                  <div className="text-2xl font-bold mt-1">{form.getValues('proteinPerDay')}</div>
                  <div className="text-xs text-muted-foreground">g/day</div>
                </div>
                
                <div className="bg-amber-50 dark:bg-amber-900/30 p-4 rounded-xl">
                  <div className="text-sm text-muted-foreground">Carbs</div>
                  <div className="text-2xl font-bold mt-1">{form.getValues('carbsPerDay')}</div>
                  <div className="text-xs text-muted-foreground">g/day</div>
                </div>
                
                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-xl">
                  <div className="text-sm text-muted-foreground">Fat</div>
                  <div className="text-2xl font-bold mt-1">{form.getValues('fatPerDay')}</div>
                  <div className="text-xs text-muted-foreground">g/day</div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center pt-2 pb-4">
              <Button 
                type="submit"
                className="w-full sm:w-auto"
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
                    {clientData?.nutritionGoal ? 'Update Nutrition Goals' : 'Set Nutrition Goals'}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}