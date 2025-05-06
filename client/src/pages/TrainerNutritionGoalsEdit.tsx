import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

// Nutrition goals form schema
const nutritionGoalsSchema = z.object({
  caloriesPerDay: z.coerce.number().min(1, "Calories must be a positive number"),
  proteinPerDay: z.coerce.number().min(0, "Protein must be a non-negative number"),
  carbsPerDay: z.coerce.number().min(0, "Carbs must be a non-negative number"),
  fatPerDay: z.coerce.number().min(0, "Fat must be a non-negative number"),
});

type NutritionGoalsFormValues = z.infer<typeof nutritionGoalsSchema>;

export default function TrainerNutritionGoalsEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { clientId } = useParams();
  
  // Redirect if not trainer
  useEffect(() => {
    if (user && !user.isTrainer && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch client details to get current nutrition goals
  const { 
    data: clientData, 
    isLoading: clientLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['/api/trainer/clients', clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/clients/${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch client details');
      return await res.json();
    },
    enabled: !!(user?.isTrainer || user?.isAdmin) && !!clientId
  });

  // Form setup
  const form = useForm<NutritionGoalsFormValues>({
    resolver: zodResolver(nutritionGoalsSchema),
    defaultValues: {
      caloriesPerDay: 0,
      proteinPerDay: 0,
      carbsPerDay: 0,
      fatPerDay: 0,
    },
  });
  
  // Update form with client data
  useEffect(() => {
    if (clientData?.nutritionGoal) {
      form.reset({
        caloriesPerDay: clientData.nutritionGoal.caloriesPerDay,
        proteinPerDay: clientData.nutritionGoal.proteinPerDay,
        carbsPerDay: clientData.nutritionGoal.carbsPerDay,
        fatPerDay: clientData.nutritionGoal.fatPerDay,
      });
    }
  }, [clientData, form]);

  // Update nutrition goals mutation
  const updateNutritionGoalsMutation = useMutation({
    mutationFn: async (data: NutritionGoalsFormValues) => {
      // Choose PUT if goals already exist, otherwise POST
      const method = clientData?.nutritionGoal ? 'PUT' : 'POST';
      const res = await apiRequest(method, `/api/trainer/clients/${clientId}/nutrition-goals`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update nutrition goals');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Nutrition goals updated",
        description: "Client nutrition goals have been updated successfully.",
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/clients', clientId] });
      // Navigate back to client details
      navigate(`/trainer/clients/${clientId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating nutrition goals",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: NutritionGoalsFormValues) => {
    updateNutritionGoalsMutation.mutate(data);
  };

  // Check if not trainer or admin
  if (!user || (!user.isTrainer && !user.isAdmin)) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Show loading state
  if (clientLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Show error state
  if (isError) {
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "An error occurred while fetching client data"}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate(`/trainer/clients/${clientId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Client
        </Button>
      </div>
    );
  }

  return (
    <div className="container px-3 py-4 md:px-6 md:py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
          <div>
            <Button 
              variant="ghost" 
              size="sm"
              className="mb-2 -ml-3 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(`/trainer/clients/${clientId}`)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Nutrition Goals
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              Set daily targets for {clientData?.client?.username}
            </p>
          </div>
        </div>

        <Card className="shadow-sm border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Daily Nutritional Targets</CardTitle>
            <CardDescription>
              Set nutrition targets to help your client achieve their fitness goals.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="caloriesPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Calories (kcal)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 2000" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="proteinPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Protein (g)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="e.g. 150" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="carbsPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Carbohydrates (g)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 200" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="fatPerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Fat (g)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 65" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="pt-4 col-span-full">
                  <Button 
                    type="submit"
                    disabled={updateNutritionGoalsMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                  >
                    {updateNutritionGoalsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Nutrition Goals
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}