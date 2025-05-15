import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { 
  Loader2, 
  Edit, 
  BookUser, 
  Utensils, 
  Plus, 
  Camera, 
  Trash2, 
  Search,
  Calculator
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Form schema for a single food item
const foodItemSchema = z.object({
  name: z.string().min(1, "Food item is required"),
  servingSize: z.coerce.number().positive("Serving size must be positive"),
  servingUnit: z.string().min(1, "Serving unit is required"),
  calories: z.coerce.number().nonnegative("Calories cannot be negative"),
  protein: z.coerce.number().nonnegative("Protein cannot be negative"),
  carbs: z.coerce.number().nonnegative("Carbs cannot be negative"),
  fat: z.coerce.number().nonnegative("Fat cannot be negative"),
});

// Form schema for the complete meal
const formSchema = z.object({
  mealType: z.string().min(1, "Meal type is required"),
  mealName: z.string().min(1, "Meal name is required"),
  date: z.union([z.string(), z.date(), z.undefined()]).optional(),
  foodItems: z.array(foodItemSchema).min(1, "At least one food item is required"),
});

interface AddMultiItemMealDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
}

const AddMultiItemMealDialog: React.FC<AddMultiItemMealDialogProps> = ({
  isOpen,
  onClose,
  initialData
}) => {
  const { toast } = useToast();
  const [foodLookupLoading, setFoodLookupLoading] = useState(false);
  const [imageRecognitionLoading, setImageRecognitionLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // Initialize form with default values
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      mealType: "breakfast",
      mealName: "",
      date: new Date().toISOString(),
      foodItems: [
        {
          name: "",
          servingSize: 1,
          servingUnit: "serving",
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }
      ],
    },
  });

  // Setup field array for dynamic food items
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "foodItems",
  });

  // Calculate total nutrition values
  const calculateTotals = () => {
    const values = form.getValues();
    return values.foodItems.reduce((totals, item) => {
      return {
        calories: totals.calories + (Number(item.calories) || 0),
        protein: totals.protein + (Number(item.protein) || 0),
        carbs: totals.carbs + (Number(item.carbs) || 0),
        fat: totals.fat + (Number(item.fat) || 0),
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  // Mutation for adding a meal with multiple items
  const addMealMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      try {
        console.log("Sending meal data to server:", data);
        const response = await apiRequest("POST", "/api/nutrition/multi-item-meal", data);
        const responseData = await response.json();
        console.log("Server response:", responseData);
        return responseData;
      } catch (error) {
        console.error("Error in meal mutation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
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

  // Lookup nutrition info for the selected food item
  const lookupNutritionInfo = async (index: number) => {
    const itemValue = form.getValues(`foodItems.${index}.name`);
    
    if (!itemValue || !itemValue.trim()) {
      toast({
        title: "Food item required",
        description: "Please enter a food item to lookup",
        variant: "destructive"
      });
      return;
    }
    
    setFoodLookupLoading(true);
    try {
      const servingSize = form.getValues(`foodItems.${index}.servingSize`) || 1;
      const servingUnit = form.getValues(`foodItems.${index}.servingUnit`) || "serving";
      
      const query = new URLSearchParams({
        foodItem: itemValue.trim(),
        servingSize: String(servingSize),
        servingUnit: servingUnit
      }).toString();
      
      const response = await fetch(`/api/nutrition/lookup?${query}`);
      if (!response.ok) throw new Error("Failed to lookup nutrition info");
      
      const data = await response.json();
      
      // Update form with nutrition values for the specific item
      form.setValue(`foodItems.${index}.calories`, Math.round(data.calories || 0));
      form.setValue(`foodItems.${index}.protein`, parseFloat((data.protein || 0).toFixed(1)));
      form.setValue(`foodItems.${index}.carbs`, parseFloat((data.carbs || 0).toFixed(1)));
      form.setValue(`foodItems.${index}.fat`, parseFloat((data.fat || 0).toFixed(1)));
      
      // Set serving size/unit if they're provided in the response
      if (data.servingSize) {
        form.setValue(`foodItems.${index}.servingSize`, data.servingSize);
      }
      
      if (data.servingUnit) {
        form.setValue(`foodItems.${index}.servingUnit`, data.servingUnit);
      }
      
      toast({
        title: "Nutrition info updated",
        description: `Found nutritional information for ${itemValue}`,
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

  // Handle file upload and image recognition for the active food item
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || selectedItemIndex === null) return;

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
        form.setValue(`foodItems.${selectedItemIndex}.name`, data.name);
      }
      
      // Update nutrition values
      form.setValue(`foodItems.${selectedItemIndex}.calories`, Math.round(data.calories || 0));
      form.setValue(`foodItems.${selectedItemIndex}.protein`, parseFloat((data.protein || 0).toFixed(1)));
      form.setValue(`foodItems.${selectedItemIndex}.carbs`, parseFloat((data.carbs || 0).toFixed(1)));
      form.setValue(`foodItems.${selectedItemIndex}.fat`, parseFloat((data.fat || 0).toFixed(1)));
      
      // Set serving size/unit if they're provided in the response
      if (data.servingSize) {
        form.setValue(`foodItems.${selectedItemIndex}.servingSize`, data.servingSize);
      }
      
      if (data.servingUnit) {
        form.setValue(`foodItems.${selectedItemIndex}.servingUnit`, data.servingUnit);
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

  // Form submission handler
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Create a copy of the data to avoid mutating the original
    const submissionData = { ...data };
    
    // Handle date with better error checking
    try {
      // Always use the current date for meal logging
      const currentDate = new Date();
      submissionData.date = currentDate.toISOString();
      console.log(`Using meal date: ${submissionData.date}`);
    } catch (e) {
      console.error("Error formatting date:", e);
      // Fallback to a simple date string if ISO conversion fails
      submissionData.date = new Date().toString();
    }
    
    // Format the data for submission
    const processedData = {
      mealName: submissionData.mealName,
      mealType: submissionData.mealType,
      date: submissionData.date,
      foodItems: submissionData.foodItems.map(item => ({
        name: item.name,
        servingSize: item.servingSize,
        servingUnit: item.servingUnit,
        calories: Math.round(item.calories), // Round to nearest integer
        protein: parseFloat(item.protein.toFixed(1)), // Limit to 1 decimal place
        carbs: parseFloat(item.carbs.toFixed(1)), // Limit to 1 decimal place
        fat: parseFloat(item.fat.toFixed(1)) // Limit to 1 decimal place
      }))
    };
    
    // Log the data being sent to the API
    console.log("Submitting meal data to API:", processedData);
    
    // Use the already formatted data for the API call
    addMealMutation.mutate(processedData);
  };

  // State to track the selected tab
  const [selectedTab, setSelectedTab] = useState("manual");

  // Get nutrition totals for display
  const totals = calculateTotals();

  return (
    <AdaptiveDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AdaptiveDialogContent className="max-w-full sm:max-w-[700px] p-3 sm:p-6 max-h-[90vh] md:max-h-[90vh] overflow-y-auto overscroll-contain">
        <AdaptiveDialogHeader className="pb-2">
          <AdaptiveDialogTitle>Log a Complete Meal</AdaptiveDialogTitle>
          <AdaptiveDialogDescription className="text-sm">
            Add multiple food items to a single meal entry to track your complete nutrition.
          </AdaptiveDialogDescription>
        </AdaptiveDialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Meal Type Selection */}
              <div className="w-full sm:w-1/2">
                <FormField
                  control={form.control}
                  name="mealType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select meal type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="breakfast">Breakfast</SelectItem>
                          <SelectItem value="lunch">Lunch</SelectItem>
                          <SelectItem value="dinner">Dinner</SelectItem>
                          <SelectItem value="snack">Snack</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Meal Name */}
              <div className="w-full sm:w-1/2">
                <FormField
                  control={form.control}
                  name="mealName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meal Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter meal name (e.g., Chicken Salad Lunch)" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Food Items Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Food Items</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({
                    name: "",
                    servingSize: 1,
                    servingUnit: "serving",
                    calories: 0,
                    protein: 0,
                    carbs: 0,
                    fat: 0,
                  })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Food Item
                </Button>
              </div>
              
              {/* List of food items */}
              <Accordion type="multiple" className="w-full">
                {fields.map((field, index) => (
                  <AccordionItem value={`item-${index}`} key={field.id}>
                    <AccordionTrigger className="py-2 px-3 bg-muted/50 rounded-t-md">
                      <span className="text-sm font-medium">
                        {form.watch(`foodItems.${index}.name`) || `Food Item ${index + 1}`}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({form.watch(`foodItems.${index}.calories`) || 0} cal)
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 py-3 border-x border-b rounded-b-md space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* Food Item Name */}
                        <div className="w-full sm:w-2/3">
                          <FormField
                            control={form.control}
                            name={`foodItems.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Food Item</FormLabel>
                                <div className="flex">
                                  <FormControl>
                                    <Input 
                                      placeholder="E.g., Apple, Chicken Breast" 
                                      {...field} 
                                    />
                                  </FormControl>
                                  <Button 
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="ml-2"
                                    disabled={foodLookupLoading}
                                    onClick={() => lookupNutritionInfo(index)}
                                  >
                                    {foodLookupLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Search className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button 
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="ml-1"
                                    disabled={imageRecognitionLoading}
                                    onClick={() => {
                                      setSelectedItemIndex(index);
                                      triggerFileInput();
                                    }}
                                  >
                                    {imageRecognitionLoading && selectedItemIndex === index ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Camera className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        {/* Serving Information */}
                        <div className="w-full sm:w-1/3 flex gap-2">
                          {/* Serving Size */}
                          <FormField
                            control={form.control}
                            name={`foodItems.${index}.servingSize`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Serving Size</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    min="0"
                                    step="0.1"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Serving Unit */}
                          <FormField
                            control={form.control}
                            name={`foodItems.${index}.servingUnit`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel>Unit</FormLabel>
                                <Select 
                                  onValueChange={field.onChange}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
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
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                      
                      {/* Nutrition Information Row */}
                      <div className="grid grid-cols-4 gap-2">
                        {/* Calories */}
                        <FormField
                          control={form.control}
                          name={`foodItems.${index}.calories`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Calories</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Protein */}
                        <FormField
                          control={form.control}
                          name={`foodItems.${index}.protein`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Protein (g)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0"
                                  step="0.1"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Carbs */}
                        <FormField
                          control={form.control}
                          name={`foodItems.${index}.carbs`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Carbs (g)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0"
                                  step="0.1"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Fat */}
                        <FormField
                          control={form.control}
                          name={`foodItems.${index}.fat`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fat (g)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0"
                                  step="0.1"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* Remove Button */}
                      {fields.length > 1 && (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove Item
                          </Button>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              
              {/* Hidden file input for image upload */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
                capture="environment"
              />
            </div>
            
            {/* Total Nutrition Information */}
            <Card className="bg-muted/30">
              <CardHeader className="py-3">
                <CardTitle className="text-md flex items-center">
                  <Calculator className="h-4 w-4 mr-2" />
                  Meal Nutrition Totals
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-lg font-semibold">{totals.calories}</div>
                    <div className="text-xs text-muted-foreground">Calories</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{totals.protein.toFixed(1)}g</div>
                    <div className="text-xs text-muted-foreground">Protein</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{totals.carbs.toFixed(1)}g</div>
                    <div className="text-xs text-muted-foreground">Carbs</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{totals.fat.toFixed(1)}g</div>
                    <div className="text-xs text-muted-foreground">Fat</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Form Actions */}
            <AdaptiveDialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={addMealMutation.isPending}
                className="gap-1"
              >
                {addMealMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Save Meal
              </Button>
            </AdaptiveDialogFooter>
          </form>
        </Form>
      </AdaptiveDialogContent>
    </AdaptiveDialog>
  );
};

export default AddMultiItemMealDialog;