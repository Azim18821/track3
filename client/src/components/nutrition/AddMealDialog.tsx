import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
  AdaptiveDialogDescription,
  AdaptiveDialogFooter,
} from "@/components/ui/adaptive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Edit, BookUser, Utensils, Plus, Camera } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";

interface AddMealDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}

// Form schema
const formSchema = z.object({
  mealType: z.string().min(1, "Meal type is required"),
  name: z.string().min(1, "Food item is required"),
  servingSize: z.coerce.number().positive("Serving size must be positive"),
  servingUnit: z.string().min(1, "Serving unit is required"),
  calories: z.coerce.number().nonnegative("Calories cannot be negative"),
  protein: z.coerce.number().nonnegative("Protein cannot be negative"),
  carbs: z.coerce.number().nonnegative("Carbs cannot be negative"),
  fat: z.coerce.number().nonnegative("Fat cannot be negative"),
  // Accept date as string, Date object, or undefined (will use current date)
  date: z.union([z.string(), z.date(), z.undefined()]).optional(),
});

const AddMealDialog: React.FC<AddMealDialogProps> = ({
  isOpen,
  onClose,
  initialData
}) => {
  const { toast } = useToast();
  const [foodLookupLoading, setFoodLookupLoading] = useState(false);
  const [imageRecognitionLoading, setImageRecognitionLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      mealType: "breakfast",
      name: "",
      servingSize: 1,
      servingUnit: "serving",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      date: new Date().toISOString(),
    },
  });
  
  // Form tracks its own state, no need for separate watchers

  // Mutation for adding a meal
  const addMealMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const response = await apiRequest("POST", "/api/nutrition/meals", data);
      return await response.json();
    },
    onSuccess: (data) => {
      console.log("Meal added successfully:", data);
      toast({
        title: "Meal added",
        description: "Your meal has been successfully saved",
      });
      onClose();
      // Invalidate all meal-related queries to ensure data is refreshed
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition/meals'] });
      // Also invalidate specific date-based queries
      const mealDate = new Date(data.date);
      const dateString = mealDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      queryClient.invalidateQueries({ 
        queryKey: [`/api/nutrition/meals?date=${dateString}`] 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
    onError: (error) => {
      console.error("Error adding meal:", error);
      toast({
        title: "Error adding meal",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Let's completely disable automatic lookups to simplify the code and prevent errors
  // Users will use the dedicated Lookup button instead

  // This is a manual lookup function now - automatic debounce was removed for mobile optimization
  const lookupNutritionInfo = async () => {
    const formValues = form.getValues();
    const foodItemValue = formValues.name;
    
    if (!foodItemValue || !foodItemValue.trim()) {
      toast({
        title: "Food item required",
        description: "Please enter a food item to lookup",
        variant: "destructive"
      });
      return;
    }
    
    setFoodLookupLoading(true);
    try {
      const query = new URLSearchParams({
        foodItem: foodItemValue.trim(),
        servingSize: String(formValues.servingSize || 1),
        servingUnit: formValues.servingUnit || "serving"
      }).toString();
      
      const response = await fetch(`/api/nutrition/lookup?${query}`);
      if (!response.ok) throw new Error("Failed to lookup nutrition info");
      
      const data = await response.json();
      
      // Update form with nutrition values all at once to prevent "glitching"
      form.setValue("calories", Math.round(data.calories || 0));
      form.setValue("protein", parseFloat((data.protein || 0).toFixed(1)));
      form.setValue("carbs", parseFloat((data.carbs || 0).toFixed(1)));
      form.setValue("fat", parseFloat((data.fat || 0).toFixed(1)));
      
      // Set serving size/unit if they're provided in the response
      if (data.servingSize) {
        form.setValue("servingSize", data.servingSize);
      }
      
      if (data.servingUnit) {
        form.setValue("servingUnit", data.servingUnit);
      }
      
      toast({
        title: "Nutrition info updated",
        description: `Found nutritional information for ${foodItemValue}`,
        duration: 2000
      });
    } catch (error) {
      console.error("Error looking up nutrition info:", error);
      toast({
        title: "Lookup failed",
        description: "Unable to find nutritional information for this food item",
        variant: "destructive"
      });
    } finally {
      setFoodLookupLoading(false);
    }
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Create a copy of the data to avoid mutating the original
    const submissionData = { ...data };
    
    // Convert numeric strings to numbers if needed
    if (typeof submissionData.calories === 'string') submissionData.calories = Number(submissionData.calories);
    if (typeof submissionData.protein === 'string') submissionData.protein = Number(submissionData.protein);
    if (typeof submissionData.carbs === 'string') submissionData.carbs = Number(submissionData.carbs);
    if (typeof submissionData.fat === 'string') submissionData.fat = Number(submissionData.fat);
    if (typeof submissionData.servingSize === 'string') submissionData.servingSize = Number(submissionData.servingSize);
    
    // Convert date to proper format if it's a string representation of a date
    if (submissionData.date && typeof submissionData.date === 'string') {
      try {
        // Ensure date is in ISO format
        const date = new Date(submissionData.date);
        submissionData.date = date.toISOString();
      } catch (e) {
        console.error("Error formatting date:", e);
      }
    } else if (submissionData.date instanceof Date) {
      // Convert Date object to ISO string
      submissionData.date = submissionData.date.toISOString();
    }
    
    // Add current date if missing
    if (!submissionData.date) {
      submissionData.date = new Date().toISOString();
    }
    
    // Log the data being sent for debugging
    console.log("Submitting meal data:", submissionData);
    
    addMealMutation.mutate(submissionData);
  };

  // State to track the selected tab
  const [selectedTab, setSelectedTab] = useState("manual");

  // Interfaces for saved meals and meal recipes
  interface SavedMeal {
    id: number;
    name: string;
    description: string;
    mealType: string;
    servingSize: number;
    servingUnit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }

  interface MealRecipe {
    id: number;
    name: string;
    description: string;
    mealType: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    ingredients: string;
    instructions: string;
    budget: string;
  }

  // Fetch personal meal library
  const { data: personalMeals = [], isLoading: isPersonalMealsLoading } = useQuery<SavedMeal[]>({
    queryKey: ['/api/saved-meals'],
    enabled: isOpen, // Only fetch when dialog is open
  });

  // Fetch meal recipes (public library)
  const { data: mealRecipes = [], isLoading: isMealRecipesLoading } = useQuery<MealRecipe[]>({
    queryKey: ['/api/meal-recipes'],
    enabled: isOpen, // Only fetch when dialog is open
  });

  // Filter personal meals by type if a meal type is selected
  const filteredPersonalMeals = form.watch("mealType") 
    ? personalMeals.filter(meal => meal.mealType === form.watch("mealType")) 
    : personalMeals;

  // Filter public recipes by type if a meal type is selected
  const filteredPublicMeals = form.watch("mealType")
    ? mealRecipes.filter(recipe => recipe.mealType === form.watch("mealType"))
    : mealRecipes;

  // Handle selecting a saved meal
  const handleSelectSavedMeal = (meal: SavedMeal) => {
    form.setValue("mealType", meal.mealType);
    form.setValue("name", meal.name);
    form.setValue("servingSize", meal.servingSize);
    form.setValue("servingUnit", meal.servingUnit);
    form.setValue("calories", meal.calories);
    form.setValue("protein", meal.protein);
    form.setValue("carbs", meal.carbs);
    form.setValue("fat", meal.fat);
    
    // Switch back to manual tab to let user adjust if needed
    setSelectedTab("manual");
    
    toast({
      title: "Meal selected",
      description: `${meal.name} has been selected from your personal meal library.`
    });
  };

  // Handle selecting a public recipe
  const handleSelectPublicRecipe = (recipe: MealRecipe) => {
    form.setValue("mealType", recipe.mealType);
    form.setValue("name", recipe.name);
    form.setValue("servingSize", 1);
    form.setValue("servingUnit", "serving");
    form.setValue("calories", recipe.calories);
    form.setValue("protein", recipe.protein);
    form.setValue("carbs", recipe.carbs);
    form.setValue("fat", recipe.fat);
    
    // Switch back to manual tab to let user adjust if needed
    setSelectedTab("manual");
    
    toast({
      title: "Recipe selected",
      description: `${recipe.name} has been selected from the public meal library.`
    });
  };

  // Save current meal to personal library
  // Handle file upload and image recognition
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageRecognitionLoading(true);
    
    try {
      // Create a FormData object to send the image
      const formData = new FormData();
      formData.append('image', file);
      
      // Send the image to the server for food recognition
      const response = await fetch('/api/nutrition/recognize-food', {
        method: 'POST',
        body: formData,
        credentials: 'include' // Include cookies for authentication
      });
      
      if (!response.ok) {
        // Try to get more detailed error message from the response
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || 
          `Failed to recognize food from image (HTTP ${response.status})`
        );
      }
      
      const data = await response.json();
      
      // Update the form with the recognized food information
      if (data.name) {
        form.setValue("name", data.name);
      }
      
      // Update nutrition values
      form.setValue("calories", Math.round(data.calories || 0));
      form.setValue("protein", parseFloat((data.protein || 0).toFixed(1)));
      form.setValue("carbs", parseFloat((data.carbs || 0).toFixed(1)));
      form.setValue("fat", parseFloat((data.fat || 0).toFixed(1)));
      
      // Set serving size/unit if they're provided in the response
      if (data.servingSize) {
        form.setValue("servingSize", data.servingSize);
      }
      
      if (data.servingUnit) {
        form.setValue("servingUnit", data.servingUnit);
      }
      
      toast({
        title: "Food recognized",
        description: `Identified ${data.name} from your image`,
        duration: 3000
      });
    } catch (error) {
      console.error("Error recognizing food from image:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast({
        title: "Food recognition failed",
        description: `Unable to identify food: ${errorMessage}. Please try again or enter details manually.`,
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setImageRecognitionLoading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const saveToPersonalLibrary = async () => {
    const formData = form.getValues();
    
    // Validate form data
    try {
      formSchema.parse(formData);
    } catch (error) {
      toast({
        title: "Invalid form data",
        description: "Please fill out all required fields before saving to your library",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await apiRequest("POST", "/api/saved-meals", {
        name: formData.name,
        description: `${formData.name} - ${formData.servingSize} ${formData.servingUnit}`,
        mealType: formData.mealType,
        servingSize: formData.servingSize,
        servingUnit: formData.servingUnit,
        calories: formData.calories,
        protein: formData.protein,
        carbs: formData.carbs,
        fat: formData.fat
      });
      
      if (!response.ok) throw new Error("Failed to save meal to library");
      
      const savedMeal = await response.json();
      
      toast({
        title: "Saved to library",
        description: `${formData.name} has been saved to your personal meal library for future use.`
      });
      
      // Refresh personal meals list
      queryClient.invalidateQueries({ queryKey: ['/api/saved-meals'] });
      
    } catch (error) {
      console.error("Error saving to personal library:", error);
      toast({
        title: "Error saving meal",
        description: error instanceof Error ? error.message : "Failed to save meal to library",
        variant: "destructive"
      });
    }
  };

  return (
    <AdaptiveDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AdaptiveDialogContent className="max-w-full sm:max-w-[600px] p-3 sm:p-6 max-h-[80vh] md:max-h-[85vh] overflow-y-auto overscroll-contain">
        <AdaptiveDialogHeader className="pb-2">
          <AdaptiveDialogTitle>Add Meal</AdaptiveDialogTitle>
          <AdaptiveDialogDescription className="text-sm">
            Track your nutrition by adding details about what you've eaten.
          </AdaptiveDialogDescription>
        </AdaptiveDialogHeader>
        
        <Form {...form}>
          <div className="mb-4">
            <FormField
              control={form.control}
              name="mealType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meal Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // When meal type changes, we should refresh the filtered meals
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select meal type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="morning_snack">Morning Snack</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="afternoon_snack">Afternoon Snack</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="evening_snack">Evening Snack</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                      <SelectItem value="drink">Drink/Beverage</SelectItem>
                      <SelectItem value="snack">General Snack</SelectItem>
                      <SelectItem value="pre-workout">Pre-Workout</SelectItem>
                      <SelectItem value="post-workout">Post-Workout</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Form>
        
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Manual Entry</span>
              <span className="inline sm:hidden text-xs">Manual</span>
            </TabsTrigger>
            <TabsTrigger value="quick" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Quick-Add</span>
              <span className="inline sm:hidden text-xs">Quick</span>
            </TabsTrigger>
            <TabsTrigger value="photo" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Photo Scan</span>
              <span className="inline sm:hidden text-xs">Photo</span>
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <BookUser className="h-4 w-4" />
              <span className="hidden sm:inline">My Meals</span>
              <span className="inline sm:hidden text-xs">My Meals</span>
            </TabsTrigger>
            <TabsTrigger value="public" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              <span className="hidden sm:inline">Recipe Library</span>
              <span className="inline sm:hidden text-xs">Recipes</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="manual" className="space-y-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="mb-2">
                      <FormLabel className="text-sm">Food Item</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            {...field} 
                            className="h-9"
                            placeholder="Search for a food..." 
                          />
                        </FormControl>
                        {foodLookupLoading && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />



                <div className="grid grid-cols-2 sm:flex sm:items-stretch gap-2 mb-2">
                  <FormField
                    control={form.control}
                    name="servingSize"
                    render={({ field }) => (
                      <FormItem className="w-full sm:w-28">
                        <FormLabel className="text-sm">Amount</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            className="h-9" 
                            {...field} 
                            min="0" 
                            step="0.1" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="servingUnit"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel className="text-sm">Unit</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Unit" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="serving">serving</SelectItem>
                            <SelectItem value="g">g</SelectItem>
                            <SelectItem value="oz">oz</SelectItem>
                            <SelectItem value="ml">ml</SelectItem>
                            <SelectItem value="cup">cup</SelectItem>
                            <SelectItem value="tbsp">tbsp</SelectItem>
                            <SelectItem value="tsp">tsp</SelectItem>
                            <SelectItem value="piece">piece</SelectItem>
                            <SelectItem value="slice">slice</SelectItem>
                            <SelectItem value="unit">unit</SelectItem>
                            <SelectItem value="scoop">scoop</SelectItem>
                            <SelectItem value="bottle">bottle</SelectItem>
                            <SelectItem value="can">can</SelectItem>
                            <SelectItem value="plate">plate</SelectItem>
                            <SelectItem value="bowl">bowl</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="self-end mb-1.5">
                    <Button 
                      type="button" 
                      size="sm"
                      variant="secondary" 
                      className="h-9 px-2 text-xs"
                      onClick={lookupNutritionInfo}
                      disabled={foodLookupLoading || !form.getValues().name.trim()}
                    >
                      {foodLookupLoading ? 
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : 
                        <span className="mr-1">🔍</span>
                      }
                      Lookup
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="calories"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calories</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min="0" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="protein"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Protein (g)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min="0" step="0.1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="carbs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carbs (g)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min="0" step="0.1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fat (g)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} min="0" step="0.1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={saveToPersonalLibrary}
                    className="flex gap-2 items-center justify-center"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Save to My Meals</span>
                    <span className="inline sm:hidden">Save to Library</span>
                  </Button>
                  
                  <div className="flex justify-between sm:justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={onClose} 
                      type="button"
                      className="flex-1 sm:flex-initial"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addMealMutation.isPending}
                      className="flex-1 sm:flex-initial"
                    >
                      {addMealMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Add to Log
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="photo" className="space-y-4">
            <div className="bg-primary-50 dark:bg-primary-950/50 p-6 rounded-lg flex flex-col items-center">
              <div className="mb-4 text-center">
                <h3 className="text-lg font-semibold mb-1">Food Recognition</h3>
                <p className="text-sm text-muted-foreground">
                  Take a photo of your food to automatically identify and calculate nutrition information
                </p>
              </div>
              
              {/* Hidden file input for camera functionality */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                capture="environment"
              />
              
              <div className="w-full max-w-[300px] aspect-square bg-muted/30 rounded-lg mb-4 flex flex-col items-center justify-center border-2 border-dashed border-primary/30">
                {imageRecognitionLoading ? (
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm font-medium">Analyzing your food...</p>
                    <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Camera className="h-12 w-12 mx-auto mb-2 text-primary/60" />
                    <p className="text-sm text-muted-foreground">Tap the button below to take a photo of your food</p>
                  </div>
                )}
              </div>
              
              <Button
                type="button"
                variant="default"
                size="lg"
                className="flex items-center gap-2 w-full max-w-[300px]"
                onClick={triggerFileInput}
                disabled={imageRecognitionLoading}
              >
                {imageRecognitionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Camera className="h-4 w-4 mr-1" />
                )}
                {imageRecognitionLoading ? "Analyzing..." : "Take Photo"}
              </Button>
              
              <div className="mt-6 text-sm text-muted-foreground text-center">
                <p>After taking a photo, we'll automatically detect the food and calculate nutrition information.</p>
                <p className="mt-2">You can then edit the details on the Manual Entry tab if needed.</p>
              </div>
              
              {/* If food is recognized, show a button to edit in manual tab */}
              {form.watch("name") && (
                <div className="w-full max-w-[300px] mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border">
                  <h4 className="font-medium mb-2">Detected Food</h4>
                  <div className="space-y-1 mb-3">
                    <p className="text-sm"><strong>Name:</strong> {form.watch("name")}</p>
                    <p className="text-sm"><strong>Calories:</strong> {form.watch("calories")}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <p><strong>Protein:</strong> {form.watch("protein")}g</p>
                      <p><strong>Carbs:</strong> {form.watch("carbs")}g</p>
                      <p><strong>Fat:</strong> {form.watch("fat")}g</p>
                    </div>
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedTab("manual")}
                  >
                    <Edit className="h-3 w-3 mr-1" /> Edit Details
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="personal">
            {isPersonalMealsLoading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPersonalMeals.length === 0 ? (
              <div className="text-center p-6">
                <p className="text-muted-foreground mb-4">
                  You don't have any saved meals{form.watch("mealType") ? ` for ${form.watch("mealType")}` : ""}.
                </p>
                <Button 
                  onClick={() => setSelectedTab("manual")} 
                  variant="outline"
                  className="flex items-center gap-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  Create a new saved meal
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto p-1">
                {filteredPersonalMeals.map((meal) => (
                  <Card key={meal.id} className="overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      <div className="flex-1">
                        <CardHeader className="p-3 pb-1">
                          <CardTitle className="text-sm sm:text-base">{meal.name}</CardTitle>
                          <CardDescription className="text-xs line-clamp-1">
                            {meal.servingSize} {meal.servingUnit}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 pt-1">
                          <div className="grid grid-cols-4 gap-1 text-xs sm:text-sm">
                            <div className="text-center">
                              <div className="font-medium">{meal.calories}</div>
                              <div className="text-muted-foreground">cal</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{meal.protein}g</div>
                              <div className="text-muted-foreground">prot</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{meal.carbs}g</div>
                              <div className="text-muted-foreground">carbs</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium">{meal.fat}g</div>
                              <div className="text-muted-foreground">fat</div>
                            </div>
                          </div>
                        </CardContent>
                      </div>
                      <div className="flex items-center justify-end p-2 sm:p-3">
                        <Button 
                          size="sm"
                          onClick={() => handleSelectSavedMeal(meal)}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            <div className="flex justify-center sm:justify-end pt-3">
              <Button 
                variant="outline" 
                onClick={onClose} 
                type="button"
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="public">
            {isMealRecipesLoading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredPublicMeals.length === 0 ? (
              <div className="text-center p-6">
                <p className="text-muted-foreground">
                  No recipes found{form.watch("mealType") ? ` for ${form.watch("mealType")}` : ""}.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto p-1">
                {filteredPublicMeals.map((recipe) => (
                  <Card key={recipe.id} className="overflow-hidden">
                    <div className="flex flex-col">
                      <CardHeader className="p-3 pb-1">
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-sm sm:text-base">{recipe.name}</CardTitle>
                          {recipe.budget && (
                            <span className="text-xs px-2 py-1 bg-slate-100 rounded-full shrink-0">
                              {recipe.budget === "budget-friendly" ? "£ Budget" : 
                              recipe.budget === "mid-range" ? "££ Mid" : 
                              recipe.budget === "premium" ? "£££ Premium" : 
                              recipe.budget}
                            </span>
                          )}
                        </div>
                        <CardDescription className="text-xs line-clamp-1">
                          {recipe.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent className="p-3 pt-1">
                        <div className="grid grid-cols-4 gap-1 text-xs sm:text-sm">
                          <div className="text-center">
                            <div className="font-medium">{recipe.calories}</div>
                            <div className="text-muted-foreground">cal</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{recipe.protein}g</div>
                            <div className="text-muted-foreground">prot</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{recipe.carbs}g</div>
                            <div className="text-muted-foreground">carbs</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{recipe.fat}g</div>
                            <div className="text-muted-foreground">fat</div>
                          </div>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="p-2 flex gap-2 flex-wrap justify-end">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs h-8"
                          onClick={async () => {
                            try {
                              const response = await apiRequest("POST", `/api/saved-meals/from-recipe/${recipe.id}`);
                              if (!response.ok) throw new Error("Failed to save recipe to library");
                              
                              toast({
                                title: "Saved to library",
                                description: `${recipe.name} has been saved to your personal meal library.`
                              });
                              
                              // Refresh personal meals
                              queryClient.invalidateQueries({ queryKey: ['/api/saved-meals'] });
                            } catch (error) {
                              console.error("Error saving recipe to library:", error);
                              toast({
                                title: "Error saving recipe",
                                description: error instanceof Error ? error.message : "Failed to save recipe",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button 
                          size="sm"
                          className="text-xs h-8"
                          onClick={() => handleSelectPublicRecipe(recipe)}
                        >
                          Select
                        </Button>
                      </CardFooter>
                    </div>
                  </Card>
                ))}
              </div>
            )}
            
            <div className="flex justify-center sm:justify-end pt-3">
              <Button 
                variant="outline" 
                onClick={onClose} 
                type="button"
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </AdaptiveDialogContent>
    </AdaptiveDialog>
  );
};

export default AddMealDialog;
