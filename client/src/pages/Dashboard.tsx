import { useQuery } from "@tanstack/react-query";
import SummaryCard from "@/components/dashboard/SummaryCard";
import NutritionChart from "@/components/dashboard/NutritionChart";
import WorkoutChart from "@/components/dashboard/WorkoutChart";
import DashboardWeeklyMealPlan from "@/components/dashboard/DashboardWeeklyMealPlan";
import DailyRecommendationsDialog from "@/components/recommendations/DailyRecommendationsDialog";
import { format } from "date-fns";
import { useState } from "react";
import { Loader2, RefreshCw, Calendar, Dumbbell, BarChart3, Utensils, Activity, Scale, Brain, Sparkles, CheckCircle2, Play, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRecommendations } from "@/hooks/use-recommendations";

// Define the dashboard data structure
interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DashboardData {
  nutrition: {
    current: NutritionInfo;
    goals: {
      caloriesTarget: number;
      proteinTarget: number;
      carbsTarget: number;
      fatTarget: number;
    };
  };
  weight: {
    current?: {
      weight: number;
      unit: string;
    };
    change: number;
  };
  workouts: {
    thisWeek: number;
    target: number;
    recent: any[];
  };
  activeFitnessPlan?: any;
  hasAccess?: {
    aiCoach: boolean;
  };
}

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  
  // Use recommendations hook to check for and display daily recommendations
  const { showRecommendations, setShowRecommendations, openRecommendations, recommendations } = useRecommendations();

  // Add refetchOnWindowFocus to ensure updated data appears when coming back to dashboard
  const { data, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard?date=${format(selectedDate, 'yyyy-MM-dd')}`],
    refetchOnWindowFocus: true, // Re-fetch when window gets focus
    staleTime: 0 // Always consider data stale to re-fetch when needed
  });

  // Query to check if user has an active fitness plan
  const { data: activePlan, isLoading: isLoadingPlan } = useQuery({
    queryKey: ['/api/fitness-plans/active'],
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  const handleDateChange = () => {
    setSelectedDate(new Date());
  };

  const handleRefresh = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary dark:text-blue-400 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center max-w-md p-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <Activity className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2 text-red-700 dark:text-red-300">Unable to load dashboard</h3>
          <p className="text-red-600 dark:text-red-400 mb-4">There was an error loading your fitness data.</p>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const dashboard: DashboardData = data || {
    nutrition: {
      current: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      goals: { caloriesTarget: 2000, proteinTarget: 150, carbsTarget: 225, fatTarget: 65 }
    },
    weight: {
      current: { weight: 0, unit: "lbs" },
      change: 0
    },
    workouts: {
      thisWeek: 0,
      target: 5,
      recent: []
    }
  };

  // Get hasTrainer value from dashboard data
  const hasTrainer = (data?.hasAccess?.aiCoach === false) || false;
  const isAdmin = user?.isAdmin || false;

  return (
    <div className={isMobile ? "mx-auto px-4 pt-3" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"}>
      {/* Welcome Header - Simplified for Mobile */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg shadow-sm">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome, {user?.username || 'Athlete'}
            </h2>
            <p className="text-muted-foreground text-xs">
              {format(selectedDate, 'EEE, MMM d')}
            </p>
          </div>
        </div>

        {/* Dashboard controls */}
        <div className="flex space-x-2">
          {!isMobile && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDateChange}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Today
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 opacity-60 cursor-not-allowed"
                disabled
                title="Temporarily unavailable"
              >
                <Sparkles className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                Recommendations
              </Button>
            </>
          )}
          <Button 
            variant={isMobile ? "ghost" : "outline"}
            size="icon"
            className={isMobile ? "h-10 w-10" : ""}
            onClick={handleRefresh}
          >
            <RefreshCw className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
          </Button>
        </div>
      </div>

      {/* AI Analysis moved to a popup dialog */}

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Button 
          variant="outline" 
          className="flex flex-col items-center justify-center h-20 bg-blue-50 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 border-blue-200 dark:border-blue-900 rounded-xl shadow-sm"
          onClick={() => setLocation('/workouts')}
        >
          <div className="bg-blue-100 dark:bg-gray-700 p-2 rounded-lg mb-2">
            <Dumbbell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Log Workout</span>
        </Button>
        <Button 
          variant="outline" 
          className="flex flex-col items-center justify-center h-20 bg-green-50 dark:bg-gray-800 hover:bg-green-100 dark:hover:bg-gray-700 border-green-200 dark:border-green-900 rounded-xl shadow-sm"
          onClick={() => setLocation('/nutrition')}
        >
          <div className="bg-green-100 dark:bg-gray-700 p-2 rounded-lg mb-2">
            <Utensils className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-sm font-medium text-green-700 dark:text-green-400">Log Meal</span>
        </Button>
        <Button 
          variant="outline" 
          className="flex flex-col items-center justify-center h-20 bg-purple-50 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-gray-700 border-purple-200 dark:border-purple-900 rounded-xl shadow-sm"
          onClick={() => setLocation('/weight-log')}
        >
          <div className="bg-purple-100 dark:bg-gray-700 p-2 rounded-lg mb-2">
            <Scale className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Weight Log</span>
        </Button>
      </div>

      {/* Summary Cards - Progress at a glance */}
      <div className={`grid grid-cols-2 gap-2 ${isMobile ? 'mb-4' : 'mb-6'}`}>
        <SummaryCard 
          title="Calories" 
          icon="fire" 
          iconColor="primary" 
          current={dashboard.nutrition.current.calories}
          target={dashboard.nutrition.goals.caloriesTarget}
          unit=""
          className="h-24"
          compact={isMobile}
        />

        <SummaryCard 
          title="Protein" 
          icon="egg" 
          iconColor="secondary" 
          current={Math.round(dashboard.nutrition.current.protein)}
          target={dashboard.nutrition.goals.proteinTarget}
          unit="g"
          className="h-24"
          compact={isMobile}
        />
      </div>

      {/* Today's Workout Card */}
      <div className="mb-5">
        <h3 className="text-sm font-medium mb-2 ml-1">Today's Workout</h3>
        <Card className="bg-amber-50 dark:bg-gray-800 border-amber-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden">
          <CardContent className="p-5">
            {/* Check if there's a completed workout today */}
            {dashboard.workouts.recent && dashboard.workouts.recent.length > 0 && 
             dashboard.workouts.recent.some(workout => {
               // Check if the workout is from today and is completed
               const workoutDate = new Date(workout.date).toDateString();
               const today = new Date().toDateString();
               return workoutDate === today && workout.completed;
             }) ? (
              // Workout completed today
              <div className="flex flex-col items-center py-3">
                <div className="mb-2 text-center">
                  <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full inline-block mb-2">
                    <CheckCircle2 className="h-8 w-8 text-green-500 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-green-800 dark:text-green-300 font-medium">Workout Completed Today</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mb-3">Great job! Keep up the momentum.</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs font-medium text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 rounded-full"
                    onClick={() => setLocation('/nutrition')}
                  >
                    <Utensils className="h-3 w-3 mr-1" />
                    Track Meals
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs font-medium text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full"
                    onClick={() => setLocation('/workouts')}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Plan Next Workout
                  </Button>
                </div>
              </div>
            ) : dashboard.workouts.recent && dashboard.workouts.recent.length > 0 ? (
              // Has a workout for today but not completed yet
              <div className="flex flex-col items-center py-1">
                <div className="mb-2 text-center">
                  <div className="bg-amber-100 dark:bg-amber-900 p-3 rounded-full inline-block mb-2">
                    <Dumbbell className="h-8 w-8 text-amber-500 dark:text-amber-400" />
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                    {dashboard.workouts.recent[0].name} Workout
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                    {dashboard.workouts.recent[0].duration} minutes
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs font-medium text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-full"
                    onClick={() => setLocation('/workouts')}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Start Workout
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs font-medium text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full"
                    onClick={() => setLocation('/coach')}
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    AI Coach
                  </Button>
                </div>
              </div>
            ) : (
              // No workouts for today
              <div className="flex flex-col items-center py-3">
                <div className="mb-3 text-center">
                  <div className="bg-amber-100 dark:bg-amber-900 p-3 rounded-full inline-block mb-2">
                    <Dumbbell className="h-8 w-8 text-amber-500 dark:text-amber-400" />
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">No workouts scheduled</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">Track your meals to maintain progress</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs font-medium text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 bg-green-100 dark:bg-green-900 hover:bg-green-200 dark:hover:bg-green-800 rounded-full"
                    onClick={() => setLocation('/nutrition')}
                  >
                    <Utensils className="h-3 w-3 mr-1" />
                    Track Meals
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs font-medium text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full"
                    onClick={() => setLocation(activePlan ? (hasTrainer && !isAdmin ? '/view-plan' : '/fitness-plan') : '/coach')}
                  >
                    <Brain className="h-3 w-3 mr-1" />
                    {activePlan ? 'View Plan' : 'Create Plan'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Personal Trainer Card - shown for trainers and users without assigned trainers */}
      {(user?.isTrainer || user?.isAdmin || (data?.hasAccess?.aiCoach !== false)) && (
        <div className="mb-5">
          <h3 className="text-sm font-medium mb-2 ml-1">AI Personal Trainer <span className="text-xs text-gray-500">(Temporarily Unavailable)</span></h3>
          <Card className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm overflow-hidden opacity-75">
            <CardContent className="p-5">
              <div className="flex flex-col items-center py-2">
                <div className="mb-3 text-center">
                  <div className="bg-gray-300 dark:bg-gray-700 p-3 rounded-full inline-block mb-2">
                    <Sparkles className="h-8 w-8 text-gray-500 dark:text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Your AI Fitness Coach</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">Get personalized workout and nutrition plans</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline"
                    className="mb-2 sm:mb-0 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-full opacity-60 cursor-not-allowed"
                    disabled
                    title="Temporarily unavailable"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Daily Recommendations
                  </Button>
                  <Button 
                    className="bg-gray-400 dark:bg-gray-700 text-white rounded-full opacity-60 cursor-not-allowed"
                    disabled
                    title="Temporarily unavailable"
                  >
                    {activePlan ? (
                      <>
                        <Calendar className="h-4 w-4 mr-2" />
                        View My Fitness Plan
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Generate Fitness Plan
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-full opacity-60 cursor-not-allowed"
                    disabled
                    title="Temporarily unavailable"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with AI Coach
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly Goal Progress */}
      <div className="mb-5">
        <h3 className="text-sm font-medium mb-2 ml-1">Weekly Goal Progress</h3>
        <Card className="rounded-xl shadow-sm overflow-hidden border-blue-100 dark:border-blue-800 bg-white dark:bg-gray-800">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-sm font-medium">
                  {dashboard.workouts.thisWeek} of {dashboard.workouts.target} workouts
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">This week's goal</p>
              </div>
              <span className="text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                {Math.round((dashboard.workouts.thisWeek / dashboard.workouts.target) * 100)}% complete
              </span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 dark:bg-blue-600 rounded-full"
                style={{ width: `${Math.min(100, (dashboard.workouts.thisWeek / dashboard.workouts.target) * 100)}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Only show this on desktop or larger screens */}
      {!isMobile && (
        <>
          {/* Charts Section */}
          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <NutritionChart />
            <WorkoutChart />
          </div>

          {/* Weekly Meal Plan */}
          <DashboardWeeklyMealPlan activeFitnessPlan={dashboard.activeFitnessPlan} />
        </>
      )}
      
      {/* Daily AI Recommendations Dialog - Currently disabled */}
      {/* <DailyRecommendationsDialog 
        open={showRecommendations} 
        onOpenChange={setShowRecommendations} 
      /> */}
    </div>
  );
};

export default Dashboard;