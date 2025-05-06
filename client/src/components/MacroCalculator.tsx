import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface MacroCalculatorProps {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  className?: string;
}

export default function MacroCalculator({ calories, protein, carbs, fat, className = '' }: MacroCalculatorProps) {
  // Calculate the percentages
  const proteinCalories = protein * 4;
  const carbsCalories = carbs * 4;
  const fatCalories = fat * 9;
  const totalCalories = proteinCalories + carbsCalories + fatCalories;
  
  const proteinPercentage = Math.round((proteinCalories / totalCalories) * 100) || 0;
  const carbsPercentage = Math.round((carbsCalories / totalCalories) * 100) || 0;
  const fatPercentage = Math.round((fatCalories / totalCalories) * 100) || 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle>Daily Macros</CardTitle>
        <CardDescription>
          Your recommended daily macronutrient intake
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="font-medium">Calories</span>
              </div>
              <span className="font-medium">{calories} kcal</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Protein</span>
              </div>
              <div className="text-right">
                <span>{protein}g</span>
                <span className="text-xs text-muted-foreground ml-1">({proteinPercentage}%)</span>
              </div>
            </div>
            <Progress className="h-2" value={proteinPercentage} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span>Carbs</span>
              </div>
              <div className="text-right">
                <span>{carbs}g</span>
                <span className="text-xs text-muted-foreground ml-1">({carbsPercentage}%)</span>
              </div>
            </div>
            <Progress 
              value={carbsPercentage}
              className="h-2 bg-amber-500" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Fat</span>
              </div>
              <div className="text-right">
                <span>{fat}g</span>
                <span className="text-xs text-muted-foreground ml-1">({fatPercentage}%)</span>
              </div>
            </div>
            <Progress
              value={fatPercentage}
              className="h-2 bg-red-500" />
          </div>

          <div className="pt-2 text-xs text-muted-foreground">
            <p>Protein: 4 calories per gram</p>
            <p>Carbs: 4 calories per gram</p>
            <p>Fat: 9 calories per gram</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}