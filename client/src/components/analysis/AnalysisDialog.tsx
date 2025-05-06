import { useState, useEffect } from "react";
import { 
  AdaptiveDialog, 
  AdaptiveDialogContent, 
  AdaptiveDialogHeader, 
  AdaptiveDialogTitle, 
  AdaptiveDialogDescription, 
  AdaptiveDialogFooter 
} from "@/components/ui/adaptive-dialog";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, X, Check, Zap, ThumbsUp } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

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

interface AnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: AIAnalysis | null;
  username?: string;
  /** 
   * If true, the dialog cannot be closed by clicking outside or X, 
   * only by clicking the "Noted" button 
   */
  persistent?: boolean;
  /** Callback when the user acknowledges the analysis */
  onAcknowledge?: () => void;
}

export default function AnalysisDialog({ 
  open, 
  onOpenChange, 
  analysis, 
  username,
  persistent = false,
  onAcknowledge
}: AnalysisDialogProps) {
  const [, setLocation] = useLocation();

  if (!analysis) {
    return null;
  }

  const handleCreatePlan = () => {
    if (onAcknowledge) onAcknowledge();
    onOpenChange(false);
    setLocation('/coach');
  };
  
  const handleAcknowledge = () => {
    if (onAcknowledge) onAcknowledge();
    onOpenChange(false);
  };

  // Prevent closing if persistent is true
  const handleOpenChange = (newOpen: boolean) => {
    if (persistent && !newOpen) {
      // Do not allow closing
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <AdaptiveDialog open={open} onOpenChange={handleOpenChange}>
      <AdaptiveDialogContent className="sm:max-w-[600px] max-h-[80vh] md:max-h-[85vh] overflow-y-auto">
        <AdaptiveDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-full">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <AdaptiveDialogTitle className="text-xl">AI Fitness Analysis</AdaptiveDialogTitle>
          </div>
          <AdaptiveDialogDescription>
            Your personalized fitness assessment based on your profile data
          </AdaptiveDialogDescription>
        </AdaptiveDialogHeader>

        <div className="space-y-4 my-4">
          {/* Summary section */}
          {analysis.summary && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-semibold text-blue-800 mb-2">Summary</h3>
              <p className="text-blue-700 text-sm">{analysis.summary}</p>
            </div>
          )}

          {/* Strengths */}
          <Card className="border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-green-100 p-1.5 rounded-full">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="font-semibold text-green-800">Strengths</h3>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {analysis.strengths.map((strength, index) => (
                  <li key={index} className="text-sm text-green-700">{strength}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card className="border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-amber-100 p-1.5 rounded-full">
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                <h3 className="font-semibold text-amber-800">Areas for Improvement</h3>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {analysis.weaknesses.map((weakness, index) => (
                  <li key={index} className="text-sm text-amber-700">{weakness}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-indigo-100 p-1.5 rounded-full">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-indigo-800">Recommendations</h3>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {analysis.recommendations.map((recommendation, index) => (
                  <li key={index} className="text-sm text-indigo-700">{recommendation}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Nutrition Suggestions if available */}
          {analysis.nutritionSuggestions && analysis.nutritionSuggestions.length > 0 && (
            <Card className="border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-purple-100 p-1.5 rounded-full">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-purple-800">Nutrition Suggestions</h3>
                </div>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.nutritionSuggestions.map((suggestion, index) => (
                    <li key={index} className="text-sm text-purple-700">{suggestion}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Additional metadata in a grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {analysis.bodyComposition && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h4 className="text-xs font-medium text-gray-500 mb-1">Body Composition</h4>
                <p className="text-sm font-medium">{analysis.bodyComposition}</p>
              </div>
            )}
            {analysis.fitnessLevel && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h4 className="text-xs font-medium text-gray-500 mb-1">Fitness Level</h4>
                <p className="text-sm font-medium">{analysis.fitnessLevel}</p>
              </div>
            )}
            {analysis.metabolicProfile && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h4 className="text-xs font-medium text-gray-500 mb-1">Metabolic Profile</h4>
                <p className="text-sm font-medium">{analysis.metabolicProfile}</p>
              </div>
            )}
          </div>
        </div>

        <AdaptiveDialogFooter className="flex flex-col sm:flex-row gap-3">
          {persistent ? (
            // In persistent mode, show only Noted button
            <Button 
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
              onClick={handleAcknowledge}
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Noted
            </Button>
          ) : (
            // In normal mode, show Close and Get Personalized Plan buttons
            <>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="w-full sm:w-auto"
              >
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
              <Button 
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                onClick={handleCreatePlan}
              >
                <Brain className="h-4 w-4 mr-2" />
                Get Personalized Plan
              </Button>
            </>
          )}
        </AdaptiveDialogFooter>
      </AdaptiveDialogContent>
    </AdaptiveDialog>
  );
}