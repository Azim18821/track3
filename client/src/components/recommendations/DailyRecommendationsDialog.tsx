import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Recommendation {
  workoutRecommendations: {
    suggestedWorkouts: Array<{
      name: string;
      muscleGroups: string[];
      exercises: Array<{
        name: string;
        sets: number;
        reps: number;
        restSeconds?: number;
      }>;
      notes?: string;
    }>;
    recoveryNeeds?: string;
    focusAreas?: string[];
  };
  nutritionRecommendations: {
    dailyMeals: {
      breakfast: {
        name: string;
        description: string;
        nutritionInfo?: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
      };
      lunch: {
        name: string;
        description: string;
        nutritionInfo?: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
      };
      dinner: {
        name: string;
        description: string;
        nutritionInfo?: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
      };
      snacks: Array<{
        name: string;
        description: string;
        nutritionInfo?: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
      }>;
    };
    waterIntake: number; // in ml
    tips: string[];
    macroGoals?: {
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  overallTips: string[];
  progressInsights?: string;
}

interface DailyRecommendationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional external recommendations that can be passed directly
  externalRecommendations?: Recommendation;
}

export default function DailyRecommendationsDialog({
  open,
  onOpenChange,
}: DailyRecommendationsDialogProps) {
  const [activeTab, setActiveTab] = useState("workout");
  
  // Query to fetch recommendations
  const { data, isLoading, isError, error } = useQuery<{
    show: boolean;
    recommendations?: Recommendation;
    message?: string;
  }>({
    queryKey: ['/api/recommendations/daily'],
    enabled: open, // Only fetch when dialog is open
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
  
  // Handle error case
  if (isError) {
    toast({
      title: "Error loading recommendations",
      description: error instanceof Error ? error.message : "Failed to load daily recommendations",
      variant: "destructive",
    });
    
    // Close dialog on error to prevent infinite loops
    setTimeout(() => onOpenChange(false), 0);
    return null;
  }
  
  const recommendations = data?.recommendations;
  const noRecommendationsMessage = data?.message;
  
  // Handle dialog close when no recommendations available
  const handleDialogOpenChange = (newOpenState: boolean) => {
    // If closing or if no data yet, just pass through the event
    if (!newOpenState || !data) {
      onOpenChange(newOpenState);
      return;
    }
    
    // If opening but no recommendations available, close automatically
    if (newOpenState && !data.show && !data.recommendations) {
      // Store the dismissal in localStorage to prevent showing again today
      localStorage.setItem('recommendations_dismissed_date', new Date().toISOString());
      
      // Show a toast with the explanation message
      if (data.message) {
        toast({
          title: "Recommendations not available",
          description: data.message,
        });
      }
      
      // Keep dialog closed
      onOpenChange(false);
    } else {
      // Normal case - pass through the open state change
      onOpenChange(newOpenState);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Your Daily AI Recommendations
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Building your personalized recommendations...</span>
          </div>
        ) : recommendations ? (
          <>
            {recommendations.progressInsights && (
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Progress Insights</h3>
                <p className="text-sm">{recommendations.progressInsights}</p>
              </div>
            )}
            
            <Tabs defaultValue="workout" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="workout">Workout</TabsTrigger>
                <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
              </TabsList>
              
              <TabsContent value="workout" className="space-y-4">
                {recommendations.workoutRecommendations.suggestedWorkouts.map((workout, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle>{workout.name}</CardTitle>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {workout.muscleGroups.map((group, idx) => (
                          <Badge key={idx} variant="outline">{group}</Badge>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <h4 className="font-medium mb-2">Exercises:</h4>
                      <ul className="space-y-2">
                        {workout.exercises.map((exercise, idx) => (
                          <li key={idx} className="text-sm">
                            <span className="font-medium">{exercise.name}</span> - {exercise.sets} sets x {exercise.reps} reps
                            {exercise.restSeconds && <span className="text-muted-foreground"> (Rest: {exercise.restSeconds}s)</span>}
                          </li>
                        ))}
                      </ul>
                      
                      {workout.notes && (
                        <div className="mt-3 text-sm">
                          <span className="font-medium">Notes:</span> {workout.notes}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                
                {recommendations.workoutRecommendations.focusAreas && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Focus Areas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside">
                        {recommendations.workoutRecommendations.focusAreas.map((area, index) => (
                          <li key={index} className="text-sm">{area}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {recommendations.workoutRecommendations.recoveryNeeds && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recovery Needs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{recommendations.workoutRecommendations.recoveryNeeds}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="nutrition" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Today's Meal Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-1">Breakfast</h4>
                      <p className="text-sm font-medium">{recommendations.nutritionRecommendations.dailyMeals.breakfast.name}</p>
                      <p className="text-sm">{recommendations.nutritionRecommendations.dailyMeals.breakfast.description}</p>
                      {recommendations.nutritionRecommendations.dailyMeals.breakfast.nutritionInfo && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {recommendations.nutritionRecommendations.dailyMeals.breakfast.nutritionInfo.calories} cal | 
                          P: {recommendations.nutritionRecommendations.dailyMeals.breakfast.nutritionInfo.protein}g | 
                          C: {recommendations.nutritionRecommendations.dailyMeals.breakfast.nutritionInfo.carbs}g | 
                          F: {recommendations.nutritionRecommendations.dailyMeals.breakfast.nutritionInfo.fat}g
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-1">Lunch</h4>
                      <p className="text-sm font-medium">{recommendations.nutritionRecommendations.dailyMeals.lunch.name}</p>
                      <p className="text-sm">{recommendations.nutritionRecommendations.dailyMeals.lunch.description}</p>
                      {recommendations.nutritionRecommendations.dailyMeals.lunch.nutritionInfo && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {recommendations.nutritionRecommendations.dailyMeals.lunch.nutritionInfo.calories} cal | 
                          P: {recommendations.nutritionRecommendations.dailyMeals.lunch.nutritionInfo.protein}g | 
                          C: {recommendations.nutritionRecommendations.dailyMeals.lunch.nutritionInfo.carbs}g | 
                          F: {recommendations.nutritionRecommendations.dailyMeals.lunch.nutritionInfo.fat}g
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-1">Dinner</h4>
                      <p className="text-sm font-medium">{recommendations.nutritionRecommendations.dailyMeals.dinner.name}</p>
                      <p className="text-sm">{recommendations.nutritionRecommendations.dailyMeals.dinner.description}</p>
                      {recommendations.nutritionRecommendations.dailyMeals.dinner.nutritionInfo && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {recommendations.nutritionRecommendations.dailyMeals.dinner.nutritionInfo.calories} cal | 
                          P: {recommendations.nutritionRecommendations.dailyMeals.dinner.nutritionInfo.protein}g | 
                          C: {recommendations.nutritionRecommendations.dailyMeals.dinner.nutritionInfo.carbs}g | 
                          F: {recommendations.nutritionRecommendations.dailyMeals.dinner.nutritionInfo.fat}g
                        </div>
                      )}
                    </div>
                    
                    {recommendations.nutritionRecommendations.dailyMeals.snacks.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-1">Suggested Snacks</h4>
                        <ul className="space-y-2">
                          {recommendations.nutritionRecommendations.dailyMeals.snacks.map((snack, index) => (
                            <li key={index}>
                              <p className="text-sm font-medium">{snack.name}</p>
                              <p className="text-sm">{snack.description}</p>
                              {snack.nutritionInfo && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {snack.nutritionInfo.calories} cal | 
                                  P: {snack.nutritionInfo.protein}g | 
                                  C: {snack.nutritionInfo.carbs}g | 
                                  F: {snack.nutritionInfo.fat}g
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Hydration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-2">Daily water goal: {recommendations.nutritionRecommendations.waterIntake}ml</p>
                    <Progress value={50} className="w-full h-2" />
                  </CardContent>
                </Card>
                
                {recommendations.nutritionRecommendations.tips.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Nutrition Tips</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside">
                        {recommendations.nutritionRecommendations.tips.map((tip, index) => (
                          <li key={index} className="text-sm">{tip}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {recommendations.nutritionRecommendations.macroGoals && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Today's Macro Goals</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Protein</span>
                          <span>{recommendations.nutritionRecommendations.macroGoals.protein}g</span>
                        </div>
                        <Progress value={40} className="w-full h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Carbs</span>
                          <span>{recommendations.nutritionRecommendations.macroGoals.carbs}g</span>
                        </div>
                        <Progress value={60} className="w-full h-2" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Fat</span>
                          <span>{recommendations.nutritionRecommendations.macroGoals.fat}g</span>
                        </div>
                        <Progress value={30} className="w-full h-2" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
            
            {recommendations.overallTips.length > 0 && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>General Tips</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside">
                    {recommendations.overallTips.map((tip, index) => (
                      <li key={index} className="text-sm">{tip}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        ) : noRecommendationsMessage ? (
          <div className="text-center py-6 space-y-4">
            <div className="rounded-full bg-muted p-4 mx-auto w-fit">
              <Loader2 className="h-8 w-8 text-primary/50" />
            </div>
            <h3 className="text-lg font-semibold">Not Enough Data Yet</h3>
            <p className="text-muted-foreground px-6 max-w-md mx-auto">{noRecommendationsMessage}</p>
            <p className="text-sm text-muted-foreground">Your personalized AI recommendations will be available once you've logged enough fitness and nutrition data.</p>
          </div>
        ) : (
          <div className="text-center py-6">
            <p>No recommendations available for today.</p>
          </div>
        )}
        
        <DialogFooter className="sm:justify-between mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Dismiss
          </Button>
          <Button 
            variant="default"
            className="flex items-center gap-2"
            onClick={() => onOpenChange(false)}
          >
            <CheckCircle2 className="h-4 w-4" />
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}