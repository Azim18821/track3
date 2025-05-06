import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOnboardingCheck } from "@/hooks/use-onboarding-check";
import AnalysisDialog from "./AnalysisDialog";

// Define the AIAnalysis type
interface AIAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  bodyComposition?: string;
  fitnessLevel?: string;
  nutritionSuggestions?: string[];
  metabolicProfile?: string;
  riskFactors?: string[];
  potentialGoals?: string[];
  summary?: string;
}

// Define the Analysis context type
interface AnalysisContextType {
  showAnalysis: () => void;
  hideAnalysis: () => void;
  analysis: AIAnalysis | null;
  isAnalysisOpen: boolean;
}

// Create the context
const AnalysisContext = createContext<AnalysisContextType | null>(null);

// Custom hook to use the Analysis context
export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error("useAnalysis must be used within an AnalysisProvider");
  }
  return context;
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isCompleted, isAnalysisAcknowledged } = useOnboardingCheck(true); // skipCheck=true to avoid redirects
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  // Track if this is just after onboarding completion
  const [isPostOnboarding, setIsPostOnboarding] = useState(false);
  // Track if the user has acknowledged the analysis
  const [hasAcknowledged, setHasAcknowledged] = useState(isAnalysisAcknowledged);

  // Parse the analysis from the user profile when the user changes or status is updated
  useEffect(() => {
    if (user?.aiAnalysis) {
      try {
        console.log("Parsing AI analysis from user profile");
        const parsedAnalysis = typeof user.aiAnalysis === 'string' 
          ? JSON.parse(user.aiAnalysis) 
          : user.aiAnalysis;
        
        // Clean up and ensure proper structure
        const cleanedAnalysis: AIAnalysis = {
          strengths: parsedAnalysis.strengths || [],
          weaknesses: parsedAnalysis.weaknesses || [],
          recommendations: parsedAnalysis.recommendations || [],
          summary: parsedAnalysis.summary || "",
          bodyComposition: parsedAnalysis.bodyComposition || "",
          fitnessLevel: parsedAnalysis.fitnessLevel || "",
          nutritionSuggestions: parsedAnalysis.nutritionSuggestions || [],
          metabolicProfile: parsedAnalysis.metabolicProfile || "",
          riskFactors: parsedAnalysis.riskFactors || [],
          potentialGoals: parsedAnalysis.potentialGoals || []
        };
        
        setAnalysis(cleanedAnalysis);
        
        // Use the server-provided acknowledgment status
        setHasAcknowledged(isAnalysisAcknowledged);
        
        // Check if this is right after onboarding completion
        const onboardingCompleted = localStorage.getItem('onboardingJustCompleted');
        if (onboardingCompleted === 'true') {
          // Just completed onboarding, so needs to see the analysis
          setIsPostOnboarding(true);
          setHasAcknowledged(false); // Override server status as this just happened
          localStorage.removeItem('onboardingJustCompleted');
          // Auto-show the dialog after onboarding in persistent mode
          setShowDialog(true);
        } else if (!isAnalysisAcknowledged && cleanedAnalysis.strengths.length > 0) {
          // User has analysis but hasn't acknowledged it yet (according to server)
          // Only auto-show if we're not already showing it from onboarding completion
          setShowDialog(true);
          setIsPostOnboarding(true); // Force persistent mode
        }
      } catch (error) {
        console.error("Error parsing AI analysis:", error);
        setAnalysis(null);
      }
    } else {
      setAnalysis(null);
    }
  }, [user, isAnalysisAcknowledged]);

  // Functions to show and hide the analysis dialog
  const showAnalysis = () => setShowDialog(true);
  const hideAnalysis = () => {
    // Only allow hiding if not in post-onboarding mode or user has acknowledged
    if (!isPostOnboarding || hasAcknowledged) {
      setShowDialog(false);
    }
  };
  
  // Handle user acknowledgment of the analysis
  const handleAcknowledge = async () => {
    try {
      // Call the server API to acknowledge the analysis
      const response = await fetch('/api/onboarding/acknowledge-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('Analysis acknowledged successfully on the server');
        // Update local state
        setHasAcknowledged(true);
        setShowDialog(false);
        
        // Also keep localStorage for backward compatibility
        if (user?.id) {
          localStorage.setItem(`analysis_acknowledged_${user.id}`, 'true');
        }
      } else {
        console.error('Failed to acknowledge analysis on the server');
        // Still update local state so user can proceed even if server update fails
        setHasAcknowledged(true);
        setShowDialog(false);
      }
    } catch (error) {
      console.error('Error acknowledging analysis:', error);
      // Still update local state so user can proceed even if server update fails
      setHasAcknowledged(true);
      setShowDialog(false);
    }
  };

  // Set up the context value
  const contextValue: AnalysisContextType = {
    showAnalysis,
    hideAnalysis,
    analysis,
    isAnalysisOpen: showDialog
  };

  return (
    <AnalysisContext.Provider value={contextValue}>
      {children}
      <AnalysisDialog 
        open={showDialog} 
        onOpenChange={setShowDialog} 
        analysis={analysis} 
        username={user?.username}
        persistent={isPostOnboarding && !hasAcknowledged}
        onAcknowledge={handleAcknowledge}
      />
    </AnalysisContext.Provider>
  );
}