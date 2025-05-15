import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";
import { initializeCapacitor } from "@/utils/capacitor";
import { AnalysisProvider } from "@/components/analysis/AnalysisProvider";
import SafeAreaProvider from "@/components/SafeAreaProvider";

import ProtectedLayout from "@/components/ProtectedLayout";
import Dashboard from "@/pages/Dashboard";
import NutritionTracker from "@/pages/NutritionTracker";
import WorkoutTracker from "@/pages/WorkoutTracker";
import WorkoutModePage from "@/pages/WorkoutModePage";
import EnhancedWorkoutModePage from "@/pages/EnhancedWorkoutModePage";
import FitnessCoach from "@/pages/FitnessCoach";
import AICoachPage from "@/pages/AICoachPage";
import AICoachHome from "@/pages/AICoachHome";
import ViewPlan from "@/pages/ViewPlan";
import WeightLog from "@/pages/WeightLog";
import ProfilePage from "@/pages/ProfilePage";
import ProfileCompletionPage from "@/pages/ProfileCompletionPage";
import OnboardingPage from "@/pages/OnboardingPage";
import GoalsPage from "@/pages/GoalsPage";
import ExerciseLibrary from "@/pages/ExerciseLibrary";
import MealLibrary from "@/pages/MealLibrary";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/auth-page-new";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import AdminSettings from "@/pages/AdminSettings";
import AdminFitnessPlansList from "@/pages/AdminFitnessPlansList";
import AdminFitnessPlanDetail from "@/pages/AdminFitnessPlanDetail";
import AdminUsers from "@/pages/AdminUsers";
import AdminUserEdit from "@/pages/AdminUserEdit";
import AdminUserWorkouts from "@/pages/AdminUserWorkouts";
import AdminUserWorkoutEdit from "@/pages/AdminUserWorkoutEdit";
import TrainerDashboard from "@/pages/TrainerDashboard";
import TrainerClientDetail from "@/pages/TrainerClientDetail";
import TrainerClientPlans from "@/pages/TrainerClientPlans";
import TrainerClientPlanDetail from "@/pages/TrainerClientPlanDetail";
import TrainerNutritionGoalsEdit from "@/pages/TrainerNutritionGoalsEdit";
import TrainerClientWorkouts from "@/pages/TrainerClientWorkouts";
import TrainerNewPlan from "@/pages/TrainerNewPlan";
import MessagesPage from "@/pages/MessagesPage";
// New Trainer Pages
import Trainer from "@/pages/Trainer";
import CreateNutritionPlan from "@/pages/CreateNutritionPlan";
import CreateFitnessPlan from "@/pages/CreateFitnessPlan";
import NotFound from "@/pages/not-found";
// Enhanced Trainer Pages
import EnhancedTrainerClientDetail from "@/pages/EnhancedTrainerClientDetail";
import EnhancedTrainerPlanCreation from "@/pages/EnhancedTrainerPlanCreation";
import EnhancedTrainerNutritionGoals from "@/pages/EnhancedTrainerNutritionGoals";
import EnhancedTrainerClientWorkouts from "@/pages/EnhancedTrainerClientWorkouts";
import TrainerAssignedPlanView from "@/pages/TrainerAssignedPlanView";
// Marketing components removed
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useServiceWorker } from "@/hooks/use-service-worker";
import { syncPendingItems } from "@/lib/offlineDB";
import OfflineIndicator from "@/components/OfflineIndicator";
import InstallPrompt from "@/components/pwa/InstallPrompt";

import { PlanGenerationProvider } from "./contexts/PlanGenerationContext";

// AppInitializer component to handle service worker registration, Capacitor, and offline sync features
function AppInitializer() {
  // Register service worker and set up offline mode
  const { swState } = useServiceWorker();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Set up online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [isAppInitialized, setIsAppInitialized] = useState(false);

  // Initialize Capacitor when the app loads
  useEffect(() => {
    // Initialize Capacitor for native device features
    initializeCapacitor()
      .then(() => {
        // Initialization successful
        setIsAppInitialized(true);
      })
      .catch(() => {
        // Continue even if initialization fails
        setIsAppInitialized(true);
      });
  }, []);

  // When coming back online, sync pending offline changes
  useEffect(() => {
    if (isOnline && isAppInitialized) {
      // Sync data when app comes back online
      syncPendingItems()
        .then(() => {
          // Successfully synchronized data
          // Invalidate queries to get fresh data
          queryClient.invalidateQueries();
        })
        .catch(() => {
          // Silent error handling
        });
    }
  }, [isOnline, isAppInitialized]);

  return null;
}

// Conditionally render landing page or dashboard based on auth status
function ConditionalHome() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-primary">Loading...</div>
      </div>
    );
  }
  
  // Show landing page for non-logged in users
  if (!user || !user.isApproved) {
    return <LandingPage />;
  }
  
  // Show dashboard for logged in users
  return (
    <ProtectedLayout>
      <Dashboard />
    </ProtectedLayout>
  );
}

function App() {
  // Use system preference for theme with light as fallback
  const defaultTheme = "system";
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlanGenerationProvider>
          <AnalysisProvider>
            <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem={true}>
              <TooltipProvider>
                <SafeAreaProvider>
                  <AppInitializer />
                  <div className="fixed inset-0 overflow-hidden ios-fixed-container h-[100svh] w-screen max-w-screen">
                    <div className="h-full w-full overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling-touch">
                      <Switch>
                        {/* Public Routes */}
                        <Route path="/" component={ConditionalHome} />
                        <Route path="/auth" component={AuthPage} />
                        <Route path="/forgot-password" component={ForgotPassword} />
                        <Route path="/reset-password" component={ResetPassword} />
                        {/* Marketing routes removed */}
                        
                        {/* Protected Routes - All wrapped in ProtectedLayout */}
                        <Route path="/dashboard">
                          <ProtectedLayout>
                            <Dashboard />
                          </ProtectedLayout>
                        </Route>
                        <Route path="/nutrition">
                          <ProtectedLayout>
                            <NutritionTracker />
                          </ProtectedLayout>
                        </Route>
                        <Route path="/workouts">
                          <ProtectedLayout>
                            <WorkoutTracker />
                          </ProtectedLayout>
                        </Route>
                        <Route path="/workout-mode/:id">
                          <ProtectedLayout>
                            <WorkoutModePage />
                          </ProtectedLayout>
                        </Route>
                        <Route path="/enhanced-workout-mode/:id">
                          <ProtectedLayout>
                            <EnhancedWorkoutModePage />
                          </ProtectedLayout>
                        </Route>
                    <Route path="/coach">
                      <ProtectedLayout aiCoachPath>
                        <FitnessCoach />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/ai-coach">
                      <ProtectedLayout aiCoachPath>
                        <AICoachHome />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/view-plan">
                      <ProtectedLayout>
                        <TrainerAssignedPlanView />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/fitness-plan">
                      <ProtectedLayout>
                        <ViewPlan />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/fitness-plans">
                      <ProtectedLayout>
                        <ViewPlan />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/view-plan-legacy">
                      <ProtectedLayout>
                        <ViewPlan />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/weight-log">
                      <ProtectedLayout>
                        <WeightLog />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/goals">
                      <ProtectedLayout>
                        <GoalsPage />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/exercises">
                      <ProtectedLayout>
                        <ExerciseLibrary />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/meals">
                      <ProtectedLayout>
                        <MealLibrary />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/profile">
                      <ProtectedLayout>
                        <ProfilePage />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/profile-completion">
                      <ProfileCompletionPage />
                    </Route>
                    <Route path="/onboarding">
                      <OnboardingPage />
                    </Route>
                    <Route path="/messages">
                      <ProtectedLayout>
                        <MessagesPage />
                      </ProtectedLayout>
                    </Route>

                    {/* Admin routes */}
                    <Route path="/admin/users">
                      <ProtectedLayout adminOnly>
                        <AdminUsers />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/admin/users/:userId">
                      <ProtectedLayout adminOnly>
                        <AdminUserEdit />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/admin/users/:userId/workouts">
                      <ProtectedLayout adminOnly>
                        <AdminUserWorkouts />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/admin/workouts/:workoutId/edit">
                      <ProtectedLayout adminOnly>
                        <AdminUserWorkoutEdit />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/admin/settings">
                      <ProtectedLayout adminOnly>
                        <AdminSettings />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/admin/fitness-plans">
                      <ProtectedLayout adminOnly>
                        <AdminFitnessPlansList />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/admin/fitness-plans/:id">
                      <ProtectedLayout adminOnly>
                        <AdminFitnessPlanDetail />
                      </ProtectedLayout>
                    </Route>

                    {/* Trainer routes */}
                    <Route path="/trainer">
                      <ProtectedLayout>
                        <Trainer />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/trainer/nutrition-plans/new">
                      <ProtectedLayout>
                        <CreateNutritionPlan />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/trainer/fitness-plans/new">
                      <ProtectedLayout>
                        <CreateFitnessPlan />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/trainer/plans">
                      <ProtectedLayout>
                        <TrainerClientPlans />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/trainer/clients/:clientId">
                      <ProtectedLayout>
                        <EnhancedTrainerClientDetail />
                      </ProtectedLayout>
                    </Route>
                    {/* Support both "/plans/" and "/plan/" to handle both URL patterns */}
                    <Route path="/trainer/clients/:clientId/plans/:planId">
                      <ProtectedLayout>
                        <TrainerClientPlanDetail />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/trainer/clients/:clientId/plan/:planId">
                      <ProtectedLayout>
                        <TrainerClientPlanDetail />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/trainer/clients/:clientId/nutrition-goals/edit">
                      <ProtectedLayout>
                        <EnhancedTrainerNutritionGoals />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/trainer/clients/:clientId/nutrition-goals">
                      <ProtectedLayout>
                        <EnhancedTrainerNutritionGoals />
                      </ProtectedLayout>
                    </Route>
                    <Route path="/trainer/clients/:clientId/workouts">
                      <ProtectedLayout>
                        <EnhancedTrainerClientWorkouts />
                      </ProtectedLayout>
                    </Route>
                    {/* Keeping old route for backward compatibility, but showing a console warning */}
                    <Route path="/trainer/new-plan">
                      <ProtectedLayout>
                        <EnhancedTrainerPlanCreation showDeprecationWarning={true} />
                      </ProtectedLayout>
                    </Route>
                    
                    <Route path="/enhanced-trainer-plan-creation">
                      <ProtectedLayout>
                        <div className="w-full h-full">
                          <div className="container py-8 px-4">
                            <div className="bg-card p-4 rounded-lg shadow">
                              <EnhancedTrainerPlanCreation />
                            </div>
                          </div>
                        </div>
                      </ProtectedLayout>
                    </Route>

                        {/* Fallback route */}
                        <Route>
                          <NotFound />
                        </Route>
                      </Switch>
                    </div>
                  </div>
                <OfflineIndicator />
                <InstallPrompt />
                <Toaster />
                </SafeAreaProvider>
              </TooltipProvider>
            </ThemeProvider>
          </AnalysisProvider>
        </PlanGenerationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;