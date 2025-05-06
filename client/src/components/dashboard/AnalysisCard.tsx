import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AIAnalysis } from '@/types/onboarding';
import { User } from '@shared/schema';
import { Clock, CheckCircle, ListChecks } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalysisCardProps {
  user: User;
}

export default function AnalysisCard({ user }: AnalysisCardProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Parse the AI analysis from the user profile
    if (user && user.aiAnalysis) {
      try {
        console.log('Parsing AI analysis from user profile');
        const parsedAnalysis = JSON.parse(user.aiAnalysis) as AIAnalysis;
        setAnalysis(parsedAnalysis);
      } catch (error) {
        console.error('Error parsing AI analysis:', error);
      }
    } else {
      console.log('No AI analysis found in user profile');
    }
    setLoading(false);
  }, [user]);

  if (loading) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <Skeleton className="h-8 w-[250px] mb-2" />
          <Skeleton className="h-4 w-[300px]" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null; // Don't render anything if there's no analysis
  }

  return (
    <Card className="w-full mb-6">
      <CardHeader>
        <CardTitle>Your Fitness Analysis</CardTitle>
        <CardDescription>
          Personalized insights based on your profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeframe */}
        <div className="flex items-start gap-4">
          <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-medium mb-2">Expected Timeframe</h3>
            <div className="flex items-center">
              <div className="h-2.5 bg-primary-foreground rounded-full w-full max-w-xs">
                <div className="h-2.5 bg-primary rounded-full w-4/5" />
              </div>
              <span className="ml-4 font-semibold text-lg text-primary">{analysis.timeframe}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Results vary based on consistency, nutrition, and recovery quality
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="flex items-start gap-4">
          <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-medium mb-2">Your Fitness Journey</h3>
            <div className="prose">
              {analysis.description.split('\n').map((paragraph, idx) => (
                paragraph.trim() ? (
                  <p key={idx} className="mb-3 text-base sm:text-lg leading-relaxed">
                    {paragraph}
                  </p>
                ) : null
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="flex items-start gap-4">
          <ListChecks className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
          <div className="w-full">
            <h3 className="text-lg font-medium mb-2">Personalized Recommendations</h3>
            <ul className="list-disc pl-5 space-y-3">
              {analysis.recommendations.map((rec, i) => (
                <li key={i} className="text-base sm:text-lg leading-relaxed">
                  <div className="flex items-start">
                    <div className="mr-2 mt-1 text-primary">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="flex-1">{rec}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}