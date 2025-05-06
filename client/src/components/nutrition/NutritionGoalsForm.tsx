import React from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

// Form schema
const nutritionGoalSchema = z.object({
  caloriesTarget: z.coerce.number().min(500, 'Must be at least 500 calories').max(10000, 'Cannot exceed 10000 calories'),
  proteinTarget: z.coerce.number().min(20, 'Must be at least 20g').max(500, 'Cannot exceed 500g'),
  carbsTarget: z.coerce.number().min(20, 'Must be at least 20g').max(1000, 'Cannot exceed 1000g'),
  fatTarget: z.coerce.number().min(10, 'Must be at least 10g').max(500, 'Cannot exceed 500g')
});

type NutritionGoalFormValues = z.infer<typeof nutritionGoalSchema>;

interface NutritionGoalsFormProps {
  currentGoals?: {
    caloriesTarget: number;
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
  };
}

const NutritionGoalsForm: React.FC<NutritionGoalsFormProps> = ({ currentGoals }) => {
  const { toast } = useToast();

  // Default values
  const defaultValues = {
    caloriesTarget: currentGoals?.caloriesTarget || 2000,
    proteinTarget: currentGoals?.proteinTarget || 150,
    carbsTarget: currentGoals?.carbsTarget || 225,
    fatTarget: currentGoals?.fatTarget || 65
  };

  // Form setup
  const form = useForm<NutritionGoalFormValues>({
    resolver: zodResolver(nutritionGoalSchema),
    defaultValues
  });

  // Mutation for saving goals
  const saveGoalsMutation = useMutation({
    mutationFn: async (values: NutritionGoalFormValues) => {
      const response = await fetch('/api/nutrition/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save nutrition goals');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Goals Updated',
        description: 'Your nutrition goals have been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition/goals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update nutrition goals',
        variant: 'destructive',
      });
    }
  });

  const onSubmit = (values: NutritionGoalFormValues) => {
    saveGoalsMutation.mutate(values);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Nutrition Goals</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="caloriesTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Calories Target</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 2000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="proteinTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Protein Target (grams)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 150" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="carbsTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Carbs Target (grams)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 225" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fatTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Daily Fat Target (grams)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g. 65" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={saveGoalsMutation.isPending}>
              {saveGoalsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : 'Save Goals'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default NutritionGoalsForm;