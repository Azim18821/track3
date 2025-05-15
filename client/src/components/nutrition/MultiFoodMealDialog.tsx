import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, Trash2, Save, Plus, Camera } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useCreateMealEntry, MealItem, type MealEntry as MealEntryType, useSavedMeals, SavedMeal } from "@/hooks/use-meal-entries";
import { useQueryClient } from "@tanstack/react-query";

// Define interfaces for our component
interface FoodItem {
  id?: number;
  foodName: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sourceFoodId?: number;
}

// We now use MealEntryType from the hook instead of this interface

interface SavedFood {
  id: number;
  name: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MultiFoodMealDialogProps {
  trigger?: React.ReactNode;
  defaultDate?: Date;
  defaultMeal?: MealEntryType;
  isOpen?: boolean;
  setOpen?: (open: boolean) => void;
  onSaveMeal: (meal: MealEntryType) => void;
}

export default function MultiFoodMealDialog({ 
  trigger, 
  defaultDate, 
  defaultMeal, 
  isOpen, 
  setOpen: setOpenProp, 
  onSaveMeal 
}: MultiFoodMealDialogProps) {
  // Use provided open state or local state
  const [openState, setOpenState] = useState(false);
  const open = isOpen !== undefined ? isOpen : openState;
  const setOpen = setOpenProp || setOpenState;
  
  // Initialize meal entry with default values or provided meal
  const [mealEntry, setMealEntry] = useState<MealEntryType>({
    name: defaultMeal?.name || "",
    mealType: defaultMeal?.mealType || "breakfast",
    date: defaultMeal?.date || defaultDate || new Date(),
    notes: defaultMeal?.notes || "",
    isPlanned: defaultMeal?.isPlanned || false,
    items: defaultMeal?.items || []
  });
  
  const [selectedFoodId, setSelectedFoodId] = useState<number | null>(null);
  const [customFood, setCustomFood] = useState<FoodItem>({
    foodName: "",
    servingSize: 1,
    servingUnit: "serving",
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  });
  
  // Fetch saved meals
  const { data: savedFoods = [], isLoading: savedFoodsLoading } = useSavedMeals();
  
  // Calculate meal totals
  const totalCalories = mealEntry.items.reduce((sum: number, item: FoodItem) => sum + item.calories, 0);
  const totalProtein = mealEntry.items.reduce((sum: number, item: FoodItem) => sum + item.protein, 0);
  const totalCarbs = mealEntry.items.reduce((sum: number, item: FoodItem) => sum + item.carbs, 0);
  const totalFat = mealEntry.items.reduce((sum: number, item: FoodItem) => sum + item.fat, 0);
  
  const handleAddSavedFood = () => {
    if (!selectedFoodId) return;
    
    const savedFood = savedFoods.find((food: SavedMeal) => food.id === selectedFoodId);
    if (savedFood) {
      const newItem: FoodItem = {
        foodName: savedFood.name,
        servingSize: savedFood.servingSize,
        servingUnit: "serving", // Default unit for saved meals
        calories: savedFood.calories,
        protein: savedFood.protein,
        carbs: savedFood.carbs,
        fat: savedFood.fat,
        sourceFoodId: savedFood.id
      };
      
      setMealEntry({
        ...mealEntry,
        items: [...mealEntry.items, newItem]
      });
      
      setSelectedFoodId(null);
    }
  };
  
  const handleAddCustomFood = () => {
    if (!customFood.foodName || customFood.calories <= 0) {
      toast({
        title: "Required fields missing",
        description: "Please enter at least a food name and calories",
        variant: "destructive"
      });
      return;
    }
    
    setMealEntry({
      ...mealEntry,
      items: [...mealEntry.items, {...customFood}]
    });
    
    // Reset custom food form
    setCustomFood({
      foodName: "",
      servingSize: 1,
      servingUnit: "serving",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    });
  };
  
  const handleRemoveFood = (index: number) => {
    const updatedItems = [...mealEntry.items];
    updatedItems.splice(index, 1);
    setMealEntry({
      ...mealEntry,
      items: updatedItems
    });
  };
  
  const createMealEntry = useCreateMealEntry();
  
  const handleSaveMeal = () => {
    // Validate meal entry data
    if (!mealEntry.name) {
      toast({
        title: "Meal name required",
        description: "Please enter a name for this meal",
        variant: "destructive"
      });
      return;
    }
    
    if (mealEntry.items.length === 0) {
      toast({
        title: "No food items added",
        description: "Please add at least one food item to your meal",
        variant: "destructive"
      });
      return;
    }
    
    // Format date for API submission
    const formattedDate = format(mealEntry.date, "yyyy-MM-dd'T'HH:mm:ss");
    
    // Create payload for API
    const mealEntryPayload = {
      ...mealEntry,
      date: formattedDate
    };
    
    // Submit to API
    createMealEntry.mutate(mealEntryPayload, {
      onSuccess: () => {
        // Call the save callback
        onSaveMeal(mealEntry);
        
        // Close dialog and reset form
        setOpen(false);
        setMealEntry({
          name: "",
          mealType: "breakfast",
          date: new Date(),
          notes: "",
          isPlanned: false,
          items: []
        });
        
        toast({
          title: "Meal saved",
          description: "Your meal has been successfully logged"
        });
      },
      onError: (error) => {
        toast({
          title: "Error saving meal",
          description: error.message || "There was an error saving your meal",
          variant: "destructive"
        });
      }
    });
  };
  
  const openFoodCamera = () => {
    // This would be implemented to use the camera functionality
    toast({
      title: "Camera feature",
      description: "Food recognition camera would open here"
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Log Multi-Food Meal
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Log a Meal with Multiple Foods</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col overflow-hidden">
          {/* Meal details section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3">
            <div className="space-y-2">
              <Label htmlFor="mealName">Meal Name</Label>
              <Input 
                id="mealName" 
                value={mealEntry.name} 
                onChange={(e) => setMealEntry({...mealEntry, name: e.target.value})}
                placeholder="e.g., Post-Workout Lunch"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mealType">Meal Type</Label>
              <Select 
                value={mealEntry.mealType} 
                onValueChange={(value: 'breakfast' | 'lunch' | 'dinner' | 'snack') => 
                  setMealEntry({...mealEntry, mealType: value})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mealNotes">Notes (optional)</Label>
              <Textarea 
                id="mealNotes" 
                value={mealEntry.notes || ''} 
                onChange={(e) => setMealEntry({...mealEntry, notes: e.target.value})}
                placeholder="Any notes about this meal"
                className="h-20"
              />
            </div>
            
            <div className="flex items-center justify-start space-x-2 mt-8">
              <Switch 
                id="isPlanned" 
                checked={mealEntry.isPlanned}
                onCheckedChange={(checked) => setMealEntry({...mealEntry, isPlanned: checked})}  
              />
              <Label htmlFor="isPlanned">Planned meal from program</Label>
            </div>
          </div>
          
          <Separator className="my-3" />
          
          {/* Food item summary */}
          <div className="mb-3">
            <h3 className="text-sm font-medium mb-2">Foods in this meal:</h3>
            
            {mealEntry.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No foods added yet</p>
            ) : (
              <ScrollArea className="h-[150px] rounded-md border">
                {mealEntry.items.map((item: FoodItem, index: number) => (
                  <Card key={index} className="mb-2 mx-2 mt-2">
                    <CardContent className="p-3 flex justify-between items-center">
                      <div>
                        <h4 className="font-medium">{item.foodName}</h4>
                        <p className="text-xs text-muted-foreground">
                          {item.servingSize} {item.servingUnit} • {item.calories} cal • 
                          P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveFood(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </ScrollArea>
            )}
            
            <div className="mt-2 text-sm">
              <p><strong>Meal Totals:</strong> {totalCalories} cal • P: {totalProtein.toFixed(1)}g • C: {totalCarbs.toFixed(1)}g • F: {totalFat.toFixed(1)}g</p>
            </div>
          </div>
          
          <Separator className="my-3" />
          
          {/* Add food section */}
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Add Saved Food</h3>
                <Button variant="ghost" size="sm" onClick={openFoodCamera}>
                  <Camera className="h-4 w-4 mr-1" />
                  Scan Food
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Select value={selectedFoodId?.toString()} onValueChange={(value) => setSelectedFoodId(parseInt(value))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a saved food" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedFoods.map(food => (
                      <SelectItem key={food.id} value={food.id.toString()}>
                        {food.name} ({food.calories} cal)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddSavedFood} disabled={!selectedFoodId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Add Custom Food</h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <Label htmlFor="foodName">Food Name</Label>
                  <Input 
                    id="foodName" 
                    value={customFood.foodName} 
                    onChange={(e) => setCustomFood({...customFood, foodName: e.target.value})}
                    placeholder="e.g., Grilled Chicken Breast"
                  />
                </div>
                
                <div>
                  <Label htmlFor="servingSize">Serving Size</Label>
                  <Input 
                    id="servingSize"
                    type="number"
                    min="0"
                    step="0.1"
                    value={customFood.servingSize} 
                    onChange={(e) => setCustomFood({...customFood, servingSize: parseFloat(e.target.value) || 0})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="servingUnit">Unit</Label>
                  <Input 
                    id="servingUnit" 
                    value={customFood.servingUnit} 
                    onChange={(e) => setCustomFood({...customFood, servingUnit: e.target.value})}
                    placeholder="g, oz, cup, etc."
                  />
                </div>
                
                <div>
                  <Label htmlFor="calories">Calories</Label>
                  <Input 
                    id="calories"
                    type="number"
                    min="0"
                    value={customFood.calories} 
                    onChange={(e) => setCustomFood({...customFood, calories: parseInt(e.target.value) || 0})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input 
                    id="protein"
                    type="number"
                    min="0"
                    step="0.1"
                    value={customFood.protein} 
                    onChange={(e) => setCustomFood({...customFood, protein: parseFloat(e.target.value) || 0})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input 
                    id="carbs"
                    type="number"
                    min="0"
                    step="0.1"
                    value={customFood.carbs} 
                    onChange={(e) => setCustomFood({...customFood, carbs: parseFloat(e.target.value) || 0})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input 
                    id="fat"
                    type="number"
                    min="0"
                    step="0.1"
                    value={customFood.fat} 
                    onChange={(e) => setCustomFood({...customFood, fat: parseFloat(e.target.value) || 0})}
                  />
                </div>
                
                <div className="col-span-2 flex justify-end">
                  <Button onClick={handleAddCustomFood}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Food
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveMeal} disabled={mealEntry.items.length === 0}>
            <Save className="h-4 w-4 mr-2" />
            Save Meal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}