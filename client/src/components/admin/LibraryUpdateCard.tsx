import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Loader2, 
  RefreshCw, 
  Dumbbell, 
  Utensils,
  CheckCircle2,
  Clock
} from "lucide-react";

export function LibraryUpdateCard() {
  const { toast } = useToast();
  const [exerciseCount, setExerciseCount] = useState<number>(5);
  const [recipeCount, setRecipeCount] = useState<number>(5);
  const [activeTab, setActiveTab] = useState<string>("both");
  const [lastUpdate, setLastUpdate] = useState<Record<string, string>>({});

  // Update Exercise Library Mutation
  const updateExercisesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/library/exercises/update", { count: exerciseCount });
      if (!res.ok) throw new Error("Failed to start exercise library update");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Exercise Library Update Started",
        description: `Adding ${exerciseCount} new exercises to the library. This may take a few minutes.`,
      });
      setLastUpdate({
        ...lastUpdate,
        exercises: new Date().toISOString()
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Starting Update",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update Meal Recipes Mutation
  const updateRecipesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/library/recipes/update", { count: recipeCount });
      if (!res.ok) throw new Error("Failed to start meal recipe library update");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Meal Recipe Library Update Started",
        description: `Adding ${recipeCount} new recipes to the library. This may take a few minutes.`,
      });
      setLastUpdate({
        ...lastUpdate,
        recipes: new Date().toISOString()
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Starting Update",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update Both Libraries Mutation
  const updateBothMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/library/update", { 
        exerciseCount, 
        recipeCount 
      });
      if (!res.ok) throw new Error("Failed to start library updates");
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Library Updates Started",
        description: `Adding ${exerciseCount} exercises and ${recipeCount} recipes to the libraries. This may take a few minutes.`,
      });
      setLastUpdate({
        exercises: new Date().toISOString(),
        recipes: new Date().toISOString(),
        both: new Date().toISOString()
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Starting Updates",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle update button click based on active tab
  const handleUpdate = () => {
    switch (activeTab) {
      case "exercises":
        updateExercisesMutation.mutate();
        break;
      case "recipes":
        updateRecipesMutation.mutate();
        break;
      case "both":
        updateBothMutation.mutate();
        break;
    }
  };

  // Format date string
  const formatUpdateTime = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  // Check if any update is in progress
  const isUpdating = updateExercisesMutation.isPending || updateRecipesMutation.isPending || updateBothMutation.isPending;

  return (
    <Card className="shadow-lg border-blue-100 dark:border-blue-900">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardTitle className="text-xl flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-600" />
          Library Content Update
        </CardTitle>
        <CardDescription>
          Generate new AI-powered content for your libraries
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Tabs defaultValue="both" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="exercises" className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4" />
              <span>Exercises</span>
            </TabsTrigger>
            <TabsTrigger value="recipes" className="flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              <span>Recipes</span>
            </TabsTrigger>
            <TabsTrigger value="both" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span>Both</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="exercises">
            <div className="space-y-4">
              <div>
                <Label htmlFor="exerciseCount">Number of new exercises to generate</Label>
                <Input
                  id="exerciseCount"
                  type="number"
                  min="1"
                  max="20"
                  value={exerciseCount}
                  onChange={(e) => setExerciseCount(parseInt(e.target.value) || 5)}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Each exercise takes approximately 20-30 seconds to generate and may consume API credits
                </p>
              </div>

              {lastUpdate.exercises && (
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertTitle>Last Update</AlertTitle>
                  <AlertDescription>
                    Exercise library was last updated at {formatUpdateTime(lastUpdate.exercises)}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="recipes">
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipeCount">Number of new recipes to generate</Label>
                <Input
                  id="recipeCount"
                  type="number"
                  min="1"
                  max="20"
                  value={recipeCount}
                  onChange={(e) => setRecipeCount(parseInt(e.target.value) || 5)}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Each recipe takes approximately 30-45 seconds to generate and may consume API credits
                </p>
              </div>

              {lastUpdate.recipes && (
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertTitle>Last Update</AlertTitle>
                  <AlertDescription>
                    Meal recipe library was last updated at {formatUpdateTime(lastUpdate.recipes)}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="both">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="exerciseCountBoth">New exercises to generate</Label>
                  <Input
                    id="exerciseCountBoth"
                    type="number"
                    min="1"
                    max="20"
                    value={exerciseCount}
                    onChange={(e) => setExerciseCount(parseInt(e.target.value) || 5)}
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="recipeCountBoth">New recipes to generate</Label>
                  <Input
                    id="recipeCountBoth"
                    type="number"
                    min="1"
                    max="20"
                    value={recipeCount}
                    onChange={(e) => setRecipeCount(parseInt(e.target.value) || 5)}
                    className="mt-2"
                  />
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Updating both libraries will run in sequence and may take several minutes to complete
              </p>

              {lastUpdate.both && (
                <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertTitle>Last Update</AlertTitle>
                  <AlertDescription>
                    Libraries were last updated at {formatUpdateTime(lastUpdate.both)}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <div className="text-sm">
          <span className="text-muted-foreground">Updates run asynchronously in the background</span>
        </div>
        <Button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Update Library
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}