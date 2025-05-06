import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, ArrowRight, Sparkles, MessageCircle, FastForward, Dumbbell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import CoachChatInterface from "@/components/coach/CoachChatInterface";
import { useAuth } from "@/hooks/use-auth";

export default function NoPlanRedirect() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState("create-plan");
  
  // Check if user has an active fitness plan
  const { data: activePlan, isLoading } = useQuery({
    queryKey: ['/api/fitness-plans/active'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/fitness-plans/active', {
          credentials: "include"
        });
        
        if (res.status === 404) {
          return null;  // No active plan found
        }
        if (!res.ok) throw new Error('Failed to fetch fitness plan');
        return await res.json();
      } catch (err: any) {
        if (err.message !== 'Failed to fetch fitness plan') {
          return null;
        }
        throw err;
      }
    },
  });

  // Check if user has trainers
  const { data: trainerRelationships } = useQuery({
    queryKey: ["/api/client/trainers"],
    refetchOnWindowFocus: false,
  });

  // Determine if user has a trainer
  const hasTrainer = !!(trainerRelationships && Array.isArray(trainerRelationships) && trainerRelationships.length > 0);
  
  // Check if user is an admin
  const isAdmin = user?.isAdmin === true;

  // If there's an active plan, redirect to the appropriate page
  useEffect(() => {
    if (!isLoading && activePlan) {
      if (hasTrainer && !isAdmin) {
        // Client with trainer (non-admin) - always goes to view-plan
        setLocation('/view-plan');
      } else {
        // Regular user or admin - always goes to fitness-plan
        setLocation('/fitness-plan');
      }
    } else if (!isLoading && !activePlan && hasTrainer && !isAdmin) {
      // Clients with trainers but no active plan should see the trainer's view
      setLocation('/trainer-clients');
    }
  }, [activePlan, isLoading, setLocation, hasTrainer, isAdmin]);

  // If loading, show a loading spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // If there's no active plan, show tabs for both creating a plan and quick chat
  return (
    <div className="container max-w-5xl mx-auto px-4 py-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">AI Personal Trainer</h1>
        <p className="text-muted-foreground text-sm">
          Your intelligent fitness assistant powered by AI
        </p>
      </div>
      
      <Tabs 
        value={selectedTab} 
        onValueChange={setSelectedTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create-plan" className="flex gap-1.5 items-center">
            <Dumbbell className="h-4 w-4" />
            <span>Create Plan</span>
          </TabsTrigger>
          <TabsTrigger value="quick-chat" className="flex gap-1.5 items-center">
            <MessageCircle className="h-4 w-4" />
            <span>Quick Chat</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="create-plan">
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-100">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-indigo-500" />
                <span>Create Your Personalized Fitness Plan</span>
              </CardTitle>
              <CardDescription>
                Your AI Personal Trainer will design a plan based on your goals
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <p>
                  For the best experience, let's create a personalized fitness plan to help you:
                </p>
                <ul className="space-y-2 ml-6 list-disc">
                  <li>Establish clear fitness goals with measurable targets</li>
                  <li>Get workouts tailored to your fitness level and preferences</li>
                  <li>Receive meal plans that match your dietary needs</li>
                  <li>Track your progress with personalized guidance</li>
                </ul>
                <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-2">
                      <Sparkles className="h-10 w-10 text-indigo-500" />
                    </div>
                    <p className="text-sm font-medium text-indigo-700 mb-2">
                      Benefits of a personalized fitness plan:
                    </p>
                    <ul className="text-xs text-left space-y-1 text-indigo-600">
                      <li>• Workout routines designed for your specific goals</li>
                      <li>• Nutritional guidance based on your dietary needs</li>
                      <li>• Progressive overload for consistent improvement</li>
                      <li>• Continuous AI feedback to optimize results</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-4">
              <Button 
                onClick={() => setLocation('/coach')} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 flex items-center"
              >
                <FastForward className="mr-2 h-4 w-4" />
                Create My Fitness Plan Now
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="quick-chat" className="h-[calc(100vh-200px)]">
          <Card className="h-full">
            <CardHeader className="py-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>Quick Chat with AI Coach</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ask questions while we prepare your fitness plan
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation('/coach')}
                  className="text-xs h-8"
                >
                  Create Plan
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-56px)]">
              <div className="h-full flex flex-col">
                <div className="bg-amber-50 p-4 border-b border-amber-100 flex items-center">
                  <div className="flex-1">
                    <p className="text-amber-800 text-sm font-medium">Want personalized advice?</p>
                    <p className="text-amber-700 text-xs mt-1">Create a fitness plan for AI guidance tailored to your goals</p>
                  </div>
                  <Button 
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    size="sm"
                    onClick={() => setLocation('/coach')}
                  >
                    Create Plan
                  </Button>
                </div>
                <div className="flex-1">
                  <CoachChatInterface quickMode={true} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}