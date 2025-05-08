/**
 * Generate Plan Page
 * Page component for generating a new fitness plan
 */

import React, { useState } from "react";
import { useNavigate } from "wouter";
import { PlanGenerationForm } from "@/components/plan-generation/PlanGenerationForm";
import { PlanGenerationProgress } from "@/components/plan-generation/PlanGenerationProgress";
import { useAuth } from "@/hooks/use-auth";
import { usePlanGeneration } from "@/hooks/use-plan-generation";

/**
 * Plan generation page states
 */
type PageState = "form" | "progress" | "complete";

/**
 * GeneratePlanPage component
 */
export default function GeneratePlanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>("form");
  const { progressQuery, activePlanQuery, checkProgress } = usePlanGeneration();

  // Check if there's an active generation in progress when the page loads
  React.useEffect(() => {
    checkProgress();
  }, [checkProgress]);

  // Update the page state based on the progress
  React.useEffect(() => {
    if (progressQuery.data && progressQuery.data.isGenerating) {
      setPageState("progress");
    }
  }, [progressQuery.data]);

  // Handle form submission success
  const handleFormSuccess = () => {
    setPageState("progress");
  };

  // Handle generation completion
  const handleGenerationComplete = () => {
    setPageState("complete");
    // Navigate to the plan view page
    navigate("/plan");
  };

  // Handle generation cancellation
  const handleGenerationCancel = () => {
    setPageState("form");
  };

  // If not logged in, show message
  if (!user) {
    return (
      <div className="container max-w-6xl py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Generate Fitness Plan</h1>
          <p className="mb-6">Please log in to generate a personalized fitness plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Generate Your Fitness Plan</h1>
        <p className="text-gray-500 mt-2">
          Create a personalized workout and meal plan tailored to your goals
        </p>
      </div>

      <div className="flex justify-center">
        {pageState === "form" && (
          <PlanGenerationForm onSuccess={handleFormSuccess} />
        )}

        {pageState === "progress" && (
          <PlanGenerationProgress
            onComplete={handleGenerationComplete}
            onCancel={handleGenerationCancel}
          />
        )}
      </div>

      {pageState === "form" && (
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card p-4 rounded-lg">
              <div className="text-2xl font-bold mb-2">1</div>
              <h3 className="font-medium mb-2">Input Your Preferences</h3>
              <p className="text-sm text-muted-foreground">
                Tell us about your fitness goals, diet preferences, and budget constraints.
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg">
              <div className="text-2xl font-bold mb-2">2</div>
              <h3 className="font-medium mb-2">AI Plan Generation</h3>
              <p className="text-sm text-muted-foreground">
                Our AI creates a personalized workout and meal plan optimized for your needs.
              </p>
            </div>
            <div className="bg-card p-4 rounded-lg">
              <div className="text-2xl font-bold mb-2">3</div>
              <h3 className="font-medium mb-2">Start Your Journey</h3>
              <p className="text-sm text-muted-foreground">
                Get a complete plan with workouts, meals, and a budget-friendly grocery list.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}