import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useAnalysis } from "@/components/analysis/AnalysisProvider";
import Layout from "@/components/Layout";
import NoPlanRedirect from "@/components/coach/NoPlanRedirect";
import AICoachPage from "@/pages/AICoachPage";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, ListChecks } from "lucide-react";

export default function AICoachHome() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [hasPlan, setHasPlan] = useState<boolean | null>(null);
  const { showAnalysis, analysis } = useAnalysis();
  
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

  // Get user profile data to check if there's analysis available
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/user/profile'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/user/profile', {
          credentials: "include"
        });
        if (!res.ok) throw new Error('Failed to fetch user profile');
        return await res.json();
      } catch (err) {
        console.error('Error fetching user profile:', err);
        return null;
      }
    },
  });
  
  // Update plan status
  useEffect(() => {
    if (!isLoading) {
      setHasPlan(!!activePlan);
    }
  }, [activePlan, isLoading]);
  
  // If loading, show a loading spinner
  if (isLoading || profileLoading || hasPlan === null) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[50vh]">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }
  
  // If no plan, show the plan creation screen with analysis option if available
  if (!hasPlan) {
    const hasAnalysis = userProfile?.aiAnalysis && Object.keys(userProfile.aiAnalysis).length > 0;
    
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h1 className="text-2xl font-bold mb-4">AI Coach</h1>
            <p className="mb-6">You don't have an active fitness plan yet. Let's create one!</p>
            
            {hasAnalysis && (
              <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h2 className="text-lg font-semibold mb-2 flex items-center">
                  <Brain className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Personalized Analysis Available
                </h2>
                <p className="mb-4">
                  You have a personalized fitness analysis based on your onboarding data. 
                  This can help you create a more targeted fitness plan.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={showAnalysis}
                    variant="outline"
                    className="flex items-center"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    View Analysis
                  </Button>
                  <Button 
                    onClick={() => setLocation("/coach")}
                    className="flex items-center bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"
                  >
                    <ListChecks className="w-4 h-4 mr-2" />
                    Create Personalized Plan
                  </Button>
                </div>
              </div>
            )}
            
            <Button 
              onClick={() => setLocation("/coach")}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"
            >
              Start Creating Your Plan
            </Button>
          </div>
        </div>
      </Layout>
    );
  }
  
  // If there's an active plan, show the AI Coach interface
  return <AICoachPage planData={activePlan} />;
}