import React from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, Save } from 'lucide-react';

// Form schema
const nutritionPlanSchema = z.object({
  clientId: z.string().transform(val => parseInt(val, 10)),
  name: z.string().min(3, { message: 'Plan name must be at least 3 characters' }),
  description: z.string().optional(),
  caloriesTarget: z.string().transform(val => parseInt(val, 10)),
  proteinTarget: z.string().transform(val => parseInt(val, 10)),
  carbsTarget: z.string().transform(val => parseInt(val, 10)),
  fatTarget: z.string().transform(val => parseInt(val, 10)),
});

type NutritionPlanFormData = z.infer<typeof nutritionPlanSchema>;

const CreateNutritionPlan: React.FC = () => {
  const [, navigate] = useLocation();
  
  // Get clients for the dropdown
  const { data: clients, isLoading: clientsLoading, error: clientsError } = useQuery({
    queryKey: ['/api/trainer/clients'],
    retry: 1,
  });

  // Form setup
  const form = useForm<NutritionPlanFormData>({
    resolver: zodResolver(nutritionPlanSchema),
    defaultValues: {
      name: '',
      description: '',
      caloriesTarget: '2000',
      proteinTarget: '150',
      carbsTarget: '200',
      fatTarget: '70',
    },
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: (data: NutritionPlanFormData) => 
      apiRequest('/api/trainer/nutrition-plans', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      navigate('/trainer');
    },
  });

  // Form submission
  function onSubmit(data: NutritionPlanFormData) {
    createPlanMutation.mutate(data);
  }

  if (clientsLoading) {
    return (
      <div className="container max-w-3xl mx-auto py-6 px-4 md:px-6">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  if (clientsError || !clients) {
    return (
      <div className="container max-w-3xl mx-auto py-6 px-4 md:px-6">
        <Button variant="ghost" onClick={() => navigate('/trainer')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load clients. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="container max-w-3xl mx-auto py-6 px-4 md:px-6">
        <Button variant="ghost" onClick={() => navigate('/trainer')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <Alert className="mt-4">
          <AlertTitle>No clients</AlertTitle>
          <AlertDescription>
            You don't have any clients yet. You need at least one client to create a nutrition plan.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/trainer')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create Nutrition Plan</CardTitle>
          <CardDescription>
            Set nutrition goals for your client based on their fitness goals and body composition.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients.map((client: any) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select which client this nutrition plan is for
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Weight Loss Nutrition Plan" {...field} />
                    </FormControl>
                    <FormDescription>
                      Give your nutrition plan a descriptive name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="A balanced nutrition plan focused on weight loss with adequate protein to maintain muscle mass."
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Provide details about the nutrition plan and its goals
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="caloriesTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Daily Calories (kcal)</FormLabel>
                      <FormControl>
                        <Input type="number" min="1000" max="5000" {...field} />
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
                      <FormLabel>Protein (g)</FormLabel>
                      <FormControl>
                        <Input type="number" min="50" max="300" {...field} />
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
                      <FormLabel>Carbohydrates (g)</FormLabel>
                      <FormControl>
                        <Input type="number" min="50" max="500" {...field} />
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
                      <FormLabel>Fat (g)</FormLabel>
                      <FormControl>
                        <Input type="number" min="20" max="200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/trainer')}
                  disabled={createPlanMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createPlanMutation.isPending}
                >
                  {createPlanMutation.isPending ? 'Saving...' : 'Save Nutrition Plan'}
                  {!createPlanMutation.isPending && <Save className="ml-2 h-4 w-4" />}
                </Button>
              </div>

              {createPlanMutation.isError && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to create nutrition plan. Please try again.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateNutritionPlan;