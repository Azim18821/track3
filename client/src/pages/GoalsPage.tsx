import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdaptiveDialog, AdaptiveDialogContent, AdaptiveDialogHeader, AdaptiveDialogTitle, AdaptiveDialogTrigger } from "@/components/ui/adaptive-dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Target, Trophy, TrendingUp, CalendarDays, Edit, Trash2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";

// Goal schema
const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(["weight", "fitness", "nutrition", "health"]),
  targetDate: z.string().min(1, "Target date is required"),
  description: z.string().optional(),
  targetValue: z.number().optional(),
  unit: z.string().optional(),
});

type Goal = z.infer<typeof goalSchema> & {
  id: number;
  userId: number;
  createdAt: string;
  completed: boolean;
  progress: number;
};

const GoalsPage = () => {
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form setup
  const form = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      category: "fitness",
      targetDate: "",
      description: "",
      targetValue: undefined,
      unit: "",
    },
  });

  // Fetch goals
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
  });

  // Goal categories
  const categories = [
    { value: "weight", label: "Weight", icon: <TrendingUp className="h-4 w-4" /> },
    { value: "fitness", label: "Fitness", icon: <Trophy className="h-4 w-4" /> },
    { value: "nutrition", label: "Nutrition", icon: <Target className="h-4 w-4" /> },
    { value: "health", label: "Health", icon: <CalendarDays className="h-4 w-4" /> },
  ];

  // Filter goals by category
  const weightGoals = goals.filter(goal => goal.category === "weight");
  const fitnessGoals = goals.filter(goal => goal.category === "fitness");
  const nutritionGoals = goals.filter(goal => goal.category === "nutrition");
  const healthGoals = goals.filter(goal => goal.category === "health");

  // Add goal mutation
  const addGoalMutation = useMutation({
    mutationFn: async (data: z.infer<typeof goalSchema>) => {
      const res = await apiRequest("POST", "/api/goals", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      setIsAddGoalOpen(false);
      form.reset();
      toast({
        title: "Goal created",
        description: "Your goal has been created successfully",
      });
    },
    onError: (error) => {
      console.error("Goal creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      });
    }
  });

  // Toggle goal completion mutation
  const toggleGoalCompletionMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: number; completed: boolean }) => {
      const res = await apiRequest("PUT", `/api/goals/${id}`, { completed });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      toast({
        title: "Goal updated",
        description: "Goal status has been updated successfully",
      });
    },
    onError: (error) => {
      console.error("Goal update error:", error);
      toast({
        title: "Error",
        description: "Failed to update goal",
        variant: "destructive",
      });
    }
  });
  
  // Update goal progress mutation
  const updateGoalProgressMutation = useMutation({
    mutationFn: async ({ id, progress }: { id: number; progress: number }) => {
      console.log("Updating goal progress:", { id, progress });
      // Send only what's needed to avoid validation errors with the full schema
      const res = await apiRequest("PUT", `/api/goals/${id}`, { 
        progress: progress 
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      setIsProgressDialogOpen(false);
      setSelectedGoal(null);
      toast({
        title: "Progress updated",
        description: "Goal progress has been updated successfully",
      });
    },
    onError: (error) => {
      console.error("Goal progress update error:", error);
      toast({
        title: "Error",
        description: "Failed to update goal progress",
        variant: "destructive",
      });
    }
  });
  
  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      toast({
        title: "Goal deleted",
        description: "Goal has been deleted successfully",
      });
    },
    onError: (error) => {
      console.error("Goal deletion error:", error);
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive",
      });
    }
  });

  // Form submission
  const onSubmit = (data: z.infer<typeof goalSchema>) => {
    addGoalMutation.mutate(data);
  };

  // Handle toggling a goal's completion status
  const handleToggleCompletion = (goal: Goal) => {
    toggleGoalCompletionMutation.mutate({
      id: goal.id,
      completed: !goal.completed
    });
  };

  // Handle opening the progress update dialog
  const handleOpenProgressDialog = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsProgressDialogOpen(true);
  };

  // Handle updating goal progress
  const handleUpdateProgress = (progress: number) => {
    if (selectedGoal) {
      updateGoalProgressMutation.mutate({
        id: selectedGoal.id,
        progress: Math.round(progress),
      });
    }
  };
  
  // Handle deleting a goal
  const handleDeleteGoal = (id: number) => {
    // Confirm before deleting
    if (window.confirm("Are you sure you want to delete this goal?")) {
      deleteGoalMutation.mutate(id);
    }
  };

  // Render a goal card
  const renderGoalCard = (goal: Goal) => (
    <Card key={goal.id} className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{goal.title}</CardTitle>
            <CardDescription>{goal.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary font-medium text-xs px-2 py-1 rounded-full">
              {categories.find(cat => cat.value === goal.category)?.label}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive/80"
              onClick={() => handleDeleteGoal(goal.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex justify-between text-sm items-center">
            <span className="text-muted-foreground">Progress</span>
            <div className="flex items-center gap-2">
              <span className="font-medium">{goal.progress}%</span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                onClick={() => handleOpenProgressDialog(goal)}
              >
                <Edit className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Progress value={goal.progress} className="h-2" />
          
          {goal.targetValue && (
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Target</span>
              <span>{goal.targetValue} {goal.unit}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm mt-2">
            <span className="text-muted-foreground">Target Date</span>
            <span>{new Date(goal.targetDate).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          variant={goal.completed ? "outline" : "default"} 
          size="sm" 
          className="w-full"
          onClick={() => handleToggleCompletion(goal)}
          disabled={toggleGoalCompletionMutation.isPending}
        >
          {toggleGoalCompletionMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : goal.completed ? "Completed" : "Mark as Complete"}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="md:flex md:items-center md:justify-between mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Goals &amp; Milestones
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set and track your fitness and health goals
          </p>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <AdaptiveDialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
            <AdaptiveDialogTrigger asChild>
              <Button>
                <Target className="mr-2 h-4 w-4" />
                Add New Goal
              </Button>
            </AdaptiveDialogTrigger>
            <AdaptiveDialogContent>
              <AdaptiveDialogHeader>
                <AdaptiveDialogTitle>Create a New Goal</AdaptiveDialogTitle>
              </AdaptiveDialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Goal Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Run a 5K race" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {categories.map((category) => (
                            <Button 
                              key={category.value}
                              type="button"
                              variant={field.value === category.value ? "default" : "outline"} 
                              className="w-full justify-start"
                              onClick={() => form.setValue("category", category.value as any)}
                            >
                              <div className="mr-2">{category.icon}</div>
                              {category.label}
                            </Button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="targetValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Value (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 10"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              value={field.value === undefined ? "" : field.value}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., lbs, miles" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="targetDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Add more details about your goal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={addGoalMutation.isPending}
                  >
                    {addGoalMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : "Create Goal"}
                  </Button>
                </form>
              </Form>
            </AdaptiveDialogContent>
          </AdaptiveDialog>
        </div>
      </div>
      
      {/* Progress Update Dialog */}
      <AdaptiveDialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <AdaptiveDialogContent>
          <AdaptiveDialogHeader>
            <AdaptiveDialogTitle>Update Progress</AdaptiveDialogTitle>
          </AdaptiveDialogHeader>
          
          {selectedGoal && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <h3 className="font-medium text-lg">{selectedGoal.title}</h3>
                {selectedGoal.description && (
                  <p className="text-muted-foreground text-sm">{selectedGoal.description}</p>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Current Progress: {selectedGoal.progress}%</span>
                </div>
                
                <Slider
                  defaultValue={[selectedGoal.progress]}
                  max={100}
                  step={1}
                  className="py-4"
                  onValueChange={(value) => {
                    // This will just update the UI in real-time
                    // The actual API call happens on button click
                  }}
                  id="progress-slider"
                />
                
                <div className="pt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsProgressDialogOpen(false);
                      setSelectedGoal(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const slider = document.getElementById('progress-slider') as HTMLInputElement;
                      const progressValue = parseInt(slider.value, 10);
                      handleUpdateProgress(progressValue);
                    }}
                    disabled={updateGoalProgressMutation.isPending}
                  >
                    {updateGoalProgressMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Progress"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </AdaptiveDialogContent>
      </AdaptiveDialog>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : goals.length === 0 ? (
        <Card className="bg-muted/40 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No goals yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Setting goals helps you track your progress and stay motivated. Create your first goal to get started.
            </p>
            <Button onClick={() => setIsAddGoalOpen(true)}>
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="mt-6">
          <TabsList>
            <TabsTrigger value="all">All Goals</TabsTrigger>
            <TabsTrigger value="weight">Weight</TabsTrigger>
            <TabsTrigger value="fitness">Fitness</TabsTrigger>
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {goals.map(renderGoalCard)}
            </div>
          </TabsContent>
          
          <TabsContent value="weight" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {weightGoals.length > 0 ? (
                weightGoals.map(renderGoalCard)
              ) : (
                <div className="col-span-full flex justify-center py-12">
                  <p className="text-muted-foreground">No weight goals yet</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="fitness" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fitnessGoals.length > 0 ? (
                fitnessGoals.map(renderGoalCard)
              ) : (
                <div className="col-span-full flex justify-center py-12">
                  <p className="text-muted-foreground">No fitness goals yet</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="nutrition" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nutritionGoals.length > 0 ? (
                nutritionGoals.map(renderGoalCard)
              ) : (
                <div className="col-span-full flex justify-center py-12">
                  <p className="text-muted-foreground">No nutrition goals yet</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="health" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {healthGoals.length > 0 ? (
                healthGoals.map(renderGoalCard)
              ) : (
                <div className="col-span-full flex justify-center py-12">
                  <p className="text-muted-foreground">No health goals yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default GoalsPage;