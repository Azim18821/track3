import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LoaderCircle, BookOpen, UtensilsCrossed } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LibraryUpdateResult {
  success: boolean;
  message: string;
  exerciseResult?: {
    added: number;
    duplicatesSkipped: number;
  };
  mealResult?: {
    added: number;
    duplicatesSkipped: number;
  };
}

const exerciseCategories = [
  { value: "", label: "All Categories" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "legs", label: "Legs" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "core", label: "Core" },
  { value: "cardio", label: "Cardio" },
  { value: "compound", label: "Compound" },
  { value: "mobility", label: "Mobility" },
  { value: "olympic", label: "Olympic" }
];

const mealTypes = [
  { value: "", label: "All Meal Types" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "pre_workout", label: "Pre-Workout" },
  { value: "post_workout", label: "Post-Workout" },
];

export default function LibraryUpdateForm() {
  const { toast } = useToast();
  const [exerciseCount, setExerciseCount] = useState<number>(5);
  const [exerciseCategory, setExerciseCategory] = useState<string>("");
  const [mealCount, setMealCount] = useState<number>(5);
  const [mealType, setMealType] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("exercises");
  const [lastUpdateResult, setLastUpdateResult] = useState<LibraryUpdateResult | null>(null);

  // Update exercises mutation
  const updateExercisesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/update-libraries/exercises", { 
        count: exerciseCount,
        category: exerciseCategory || undefined 
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setLastUpdateResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-library"] });
      toast({
        title: "Exercise Library Updated",
        description: `Added ${data.added} new exercises, skipped ${data.duplicatesSkipped} duplicates.`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update meals mutation
  const updateMealsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/update-libraries/meals", { 
        count: mealCount,
        mealType: mealType || undefined
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setLastUpdateResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/meal-recipes"] });
      toast({
        title: "Meal Library Updated",
        description: `Added ${data.added} new recipes, skipped ${data.duplicatesSkipped} duplicates.`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update both libraries mutation
  const updateBothMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/update-libraries/all", { 
        exercises: { 
          count: exerciseCount,
          category: exerciseCategory || undefined
        },
        meals: {
          count: mealCount,
          mealType: mealType || undefined
        }
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setLastUpdateResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-library"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-recipes"] });
      toast({
        title: "Libraries Updated",
        description: "Exercise and meal libraries have been updated successfully.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleUpdateExercises = () => {
    updateExercisesMutation.mutate();
  };

  const handleUpdateMeals = () => {
    updateMealsMutation.mutate();
  };

  const handleUpdateBoth = () => {
    updateBothMutation.mutate();
  };

  const isPending = updateExercisesMutation.isPending || 
                    updateMealsMutation.isPending || 
                    updateBothMutation.isPending;

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Library Updates</CardTitle>
        <CardDescription>
          Add new AI-generated content to your exercise and meal libraries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="exercises" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Exercise Library</span>
            </TabsTrigger>
            <TabsTrigger value="meals" className="flex items-center gap-2">
              <UtensilsCrossed className="h-4 w-4" />
              <span>Meal Library</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="exercises" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exerciseCount">Number of Exercises</Label>
                <Input
                  id="exerciseCount"
                  type="number"
                  min={1}
                  max={20}
                  value={exerciseCount}
                  onChange={(e) => setExerciseCount(parseInt(e.target.value) || 5)}
                />
                <p className="text-xs text-muted-foreground">
                  Choose between 1-20 exercises to add
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="exerciseCategory">Muscle Group</Label>
                <Select 
                  value={exerciseCategory} 
                  onValueChange={setExerciseCategory}
                >
                  <SelectTrigger id="exerciseCategory">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {exerciseCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Optional: Filter by muscle group
                </p>
              </div>
            </div>
            
            <Button 
              className="w-full mt-4" 
              onClick={handleUpdateExercises}
              disabled={isPending}
            >
              {updateExercisesMutation.isPending ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Exercise Library"
              )}
            </Button>
            
            {lastUpdateResult && activeTab === "exercises" && lastUpdateResult.exerciseResult && (
              <Alert className="mt-4 bg-green-50 border-green-100">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Update Successful</AlertTitle>
                <AlertDescription className="text-green-700">
                  Added {lastUpdateResult.exerciseResult.added} new exercises, 
                  skipped {lastUpdateResult.exerciseResult.duplicatesSkipped} duplicates.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="meals" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mealCount">Number of Recipes</Label>
                <Input
                  id="mealCount"
                  type="number"
                  min={1}
                  max={20}
                  value={mealCount}
                  onChange={(e) => setMealCount(parseInt(e.target.value) || 5)}
                />
                <p className="text-xs text-muted-foreground">
                  Choose between 1-20 recipes to add
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mealType">Meal Type</Label>
                <Select 
                  value={mealType} 
                  onValueChange={setMealType}
                >
                  <SelectTrigger id="mealType">
                    <SelectValue placeholder="Select a meal type" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Optional: Filter by meal type
                </p>
              </div>
            </div>
            
            <Button 
              className="w-full mt-4" 
              onClick={handleUpdateMeals}
              disabled={isPending}
            >
              {updateMealsMutation.isPending ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Meal Library"
              )}
            </Button>
            
            {lastUpdateResult && activeTab === "meals" && lastUpdateResult.mealResult && (
              <Alert className="mt-4 bg-green-50 border-green-100">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Update Successful</AlertTitle>
                <AlertDescription className="text-green-700">
                  Added {lastUpdateResult.mealResult.added} new recipes, 
                  skipped {lastUpdateResult.mealResult.duplicatesSkipped} duplicates.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col">
        <Button 
          className="w-full" 
          onClick={handleUpdateBoth}
          disabled={isPending}
          variant="outline"
        >
          {updateBothMutation.isPending ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Updating Both Libraries...
            </>
          ) : (
            "Update Both Libraries"
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          This process uses OpenAI to generate new content and may take a few moments
        </p>
      </CardFooter>
    </Card>
  );
}