import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CoachChatInterface from "@/components/coach/CoachChatInterface";
import { Brain, ChartBar, Zap, List, InfoIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface AICoachPageProps {
  planData?: any;
}

export default function AICoachPage({ planData }: AICoachPageProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [insights, setInsights] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchInsights() {
      try {
        setIsLoading(true);
        const response = await apiRequest("GET", "/api/coach/insights?detailed=true");
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch insights");
        }
        
        const data = await response.json();
        setInsights(data);
        setError(null);
      } catch (err: any) {
        // Handle error silently
        setError(err.message || "Failed to fetch insights");
        toast({
          title: "Error",
          description: err.message || "Failed to fetch AI coach insights",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchInsights();
  }, [toast]);
  
  return (
    <Layout>
      <div className="container max-w-5xl mx-auto px-3 py-3 md:py-4">
        <div className="mb-3">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">AI Personal Trainer</h1>
          <p className="text-xs md:text-sm text-muted-foreground">
            Your adaptive AI coach powered by advanced machine learning
          </p>
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error.includes("API key") ? 
                "The AI Coach is currently unavailable. Please check again later." : 
                error}
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="chat" className="space-y-3">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="chat" className="flex items-center justify-center py-1 px-0 text-xs md:text-sm">
              <Brain className="h-3 w-3 mr-1 md:h-4 md:w-4 md:mr-2" />
              <span>Chat</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center justify-center py-1 px-0 text-xs md:text-sm">
              <ChartBar className="h-3 w-3 mr-1 md:h-4 md:w-4 md:mr-2" />
              <span>Insights</span>
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center justify-center py-1 px-0 text-xs md:text-sm">
              <InfoIcon className="h-3 w-3 mr-1 md:h-4 md:w-4 md:mr-2" />
              <span>About</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat">
            <div className="h-[calc(100vh-160px)]">
              <CoachChatInterface planData={planData} />
            </div>
          </TabsContent>
          
          <TabsContent value="insights">
            <div className="h-[calc(100vh-160px)] overflow-y-auto pb-4">
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                <Card className="shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span>Progress Insights</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      AI-powered analysis of your fitness journey
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin h-6 w-6 border-3 border-primary dark:border-blue-500 border-t-transparent dark:border-t-transparent rounded-full"></div>
                      </div>
                    ) : insights?.detailed ? (
                      <div className="space-y-3">
                        <div>
                          <h3 className="font-medium text-xs text-muted-foreground mb-1">
                            Analysis
                          </h3>
                          <p className="text-xs">{insights.detailed.insights}</p>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h3 className="font-medium text-xs text-muted-foreground mb-1">
                            Recommendations
                          </h3>
                          <ul className="list-disc list-inside space-y-1 pl-1">
                            {insights.detailed.recommendations.map((rec: string, i: number) => (
                              <li key={i} className="text-xs leading-tight">{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center text-muted-foreground">
                        <p className="text-sm">Not enough data to generate insights yet.</p>
                        <p className="text-xs mt-1">
                          Continue logging workouts and tracking your progress.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="shadow-sm">
                  <CardHeader className="py-3">
                    <CardTitle className="flex items-center space-x-2 text-base">
                      <List className="h-4 w-4 text-indigo-500" />
                      <span>Recent Activity</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Summary of your recent fitness activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-32">
                        <div className="animate-spin h-6 w-6 border-3 border-primary dark:border-blue-500 border-t-transparent dark:border-t-transparent rounded-full"></div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-indigo-50 dark:bg-indigo-950/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900">
                          <h3 className="font-medium text-indigo-800 dark:text-indigo-300 mb-1 text-sm">
                            Latest Coach Update
                          </h3>
                          <p className="text-xs text-indigo-700 dark:text-indigo-400">
                            {insights?.quickUpdate || "Keep tracking your workouts for AI insights"}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">
                            Talk to your AI coach to get personalized:
                          </p>
                          <ul className="list-disc list-inside space-y-0.5 pl-1">
                            <li className="text-xs leading-tight">Workout adjustments based on your progress</li>
                            <li className="text-xs leading-tight">Nutrition recommendations for your goals</li>
                            <li className="text-xs leading-tight">Recovery strategies to optimize results</li>
                            <li className="text-xs leading-tight">Motivation when you need it most</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="about">
            <div className="h-[calc(100vh-160px)] overflow-y-auto pb-4">
              <Card className="shadow-sm">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">About Your AI Personal Trainer</CardTitle>
                  <CardDescription className="text-xs">
                    Learn how our advanced AI coach helps you achieve your fitness goals
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  <div>
                    <h3 className="font-medium mb-1 text-sm">Adaptive Intelligence</h3>
                    <p className="text-xs text-muted-foreground">
                      Your AI coach learns from your workout patterns, progress data, and feedback to 
                      provide increasingly personalized guidance. The more you use it, the smarter it becomes about
                      your fitness journey.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1 text-sm">Evidence-Based Coaching</h3>
                    <p className="text-xs text-muted-foreground">
                      All recommendations are grounded in exercise science, nutrition research, and 
                      behavioral psychology principles. The AI draws from a comprehensive knowledge base
                      that's continuously updated with the latest fitness research.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1 text-sm">Continuous Learning</h3>
                    <p className="text-xs text-muted-foreground">
                      Unlike static workout programs, your AI coach adapts as you progress. It analyzes your 
                      performance data to identify patterns and make adjustments to your plans, helping you 
                      break through plateaus and maintain consistent progress.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1 text-sm">Privacy-Focused</h3>
                    <p className="text-xs text-muted-foreground">
                      Your fitness data is only used to improve your personal coaching experience. 
                      Conversations with your AI coach are private and secured with industry-standard encryption.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1 text-sm">Key Features</h3>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside pl-1">
                      <li>Personalized workout adjustments based on your progress</li>
                      <li>Nutrition recommendations tailored to your goals</li>
                      <li>Advanced workout adherence analytics</li>
                      <li>Performance tracking and plateau detection</li>
                      <li>Natural conversation interface for easy interaction</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}