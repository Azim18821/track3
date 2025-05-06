import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import {
  Loader2,
  UserCheck,
  Calendar,
  Target,
  Activity,
  Dumbbell,
  ClipboardList,
  PlusCircle,
  Trash2,
  Utensils,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


// Form schema using zod
const planSchema = z.object({
  clientId: z.string().min(1, "Please select a client"),
  name: z.string().min(3, "Plan name must be at least 3 characters"),
  goal: z.string().min(3, "Goal description is required"),
  durationWeeks: z.coerce.number().min(1, "Duration must be at least 1 week"),
  type: z.string().min(1, "Plan type is required"),
  level: z.string().min(1, "Difficulty level is required"),
  description: z.string().optional(),
  // Workout plan fields
  workoutPlan: z.object({
    notes: z.string().optional(),
    weeklySchedule: z.record(z.object({
      name: z.string(),
      exercises: z.array(z.object({
        name: z.string(),
        sets: z.coerce.number(),
        reps: z.coerce.number(),
        rest: z.coerce.number(),
        weight: z.coerce.number().optional().nullable(),
      }))
    })).optional()
  }).optional().default({}),
  // Meal plan fields
  mealPlan: z.object({
    notes: z.string().optional(),
    weeklyMeals: z.record(z.object({
      breakfast: z.object({
        name: z.string(),
        description: z.string(),
        calories: z.coerce.number(),
        protein: z.coerce.number(),
        carbs: z.coerce.number(),
        fat: z.coerce.number()
      }),
      lunch: z.object({
        name: z.string(),
        description: z.string(),
        calories: z.coerce.number(),
        protein: z.coerce.number(),
        carbs: z.coerce.number(),
        fat: z.coerce.number()
      }),
      dinner: z.object({
        name: z.string(),
        description: z.string(),
        calories: z.coerce.number(),
        protein: z.coerce.number(),
        carbs: z.coerce.number(),
        fat: z.coerce.number()
      }),
      snacks: z.array(z.object({
        name: z.string(),
        description: z.string(),
        calories: z.coerce.number(),
        protein: z.coerce.number(),
        carbs: z.coerce.number(),
        fat: z.coerce.number()
      }))
    })).optional()
  }).optional().default({}),
});

type PlanFormValues = z.infer<typeof planSchema>;

export default function TrainerNewPlan() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get URL parameters
  const urlParams = new URLSearchParams(location.split('?')[1]);
  const preselectedClientId = urlParams.get('clientId');
  const editPlanId = urlParams.get('planId');
  const editParam = urlParams.get('edit');
  const isEditMode = !!editPlanId && (editParam === 'true' || editParam === '1');

  // Redirect if not a trainer
  useEffect(() => {
    if (user && !user.isTrainer) {
      navigate("/");
    }
  }, [user, navigate]);

  // Fetch clients for this trainer
  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["/api/trainer/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/trainer/clients");
      if (!res.ok) throw new Error("Failed to fetch clients");
      return await res.json();
    },
    enabled: !!user?.isTrainer,
  });
  
  // Fetch existing plan data when in edit mode
  const { data: existingPlan, isLoading: isLoadingPlan } = useQuery({
    queryKey: ["/api/trainer/client-plans", editPlanId],
    queryFn: async () => {
      // First try the trainer-specific endpoint if available
      let res = await apiRequest("GET", `/api/trainer/client-plans/${editPlanId}`);
      
      // If that fails, try the regular fitness plans endpoint
      if (!res.ok) {
        res = await apiRequest("GET", `/api/fitness-plans/${editPlanId}`);
      }
      
      if (!res.ok) throw new Error("Failed to fetch fitness plan");
      return await res.json();
    },
    enabled: !!editPlanId && !!user?.isTrainer,
  });

  // Initialize form with default values
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      clientId: preselectedClientId || "",
      name: "",
      goal: "",
      durationWeeks: 4,
      type: "strength",
      level: "intermediate",
      description: "",
      workoutPlan: {
        notes: "",
        weeklySchedule: {}
      },
      mealPlan: {
        notes: "",
        weeklyMeals: {}
      }
    },
  });
  
  // Set client ID from URL parameter if present
  useEffect(() => {
    if (preselectedClientId && clients?.length > 0) {
      const clientExists = clients.some((clientData: any) => 
        clientData.client.id.toString() === preselectedClientId
      );
      
      if (clientExists) {
        form.setValue('clientId', preselectedClientId);
      }
    }
  }, [preselectedClientId, clients, form]);
  
  // Pre-populate form with existing plan data when in edit mode
  useEffect(() => {
    if (isEditMode && existingPlan && !isLoadingPlan) {
      console.log("Loading existing plan data for editing:", existingPlan);
      
      // Set client ID
      if (existingPlan.userId) {
        form.setValue('clientId', existingPlan.userId.toString());
      }
      
      // Set plan details if preferences exist
      if (existingPlan.preferences) {
        // Basic plan info
        if (existingPlan.preferences.name) form.setValue('name', existingPlan.preferences.name);
        if (existingPlan.preferences.goal) form.setValue('goal', existingPlan.preferences.goal);
        if (existingPlan.preferences.type) form.setValue('type', existingPlan.preferences.type);
        if (existingPlan.preferences.level) form.setValue('level', existingPlan.preferences.level);
        if (existingPlan.preferences.description) form.setValue('description', existingPlan.preferences.description);
        if (existingPlan.preferences.durationWeeks) form.setValue('durationWeeks', existingPlan.preferences.durationWeeks);
      }
      
      // Set workout plan data
      if (existingPlan.workoutPlan) {
        form.setValue('workoutPlan', existingPlan.workoutPlan);
      }
      
      // Set meal plan data
      if (existingPlan.mealPlan) {
        form.setValue('mealPlan', existingPlan.mealPlan);
      }
    }
  }, [isEditMode, existingPlan, isLoadingPlan, form]);

  // Submit handler for both create and update operations
  const onSubmit = async (data: PlanFormValues) => {
    try {
      setIsSubmitting(true);
      
      const planData = {
        // Preferences data
        preferences: {
          name: data.name,
          goal: data.goal,
          durationWeeks: data.durationWeeks,
          type: data.type,
          level: data.level,
          description: data.description || "",
        },
        // Workout plan data
        workoutPlan: data.workoutPlan,
        // Meal plan data
        mealPlan: data.mealPlan
      };

      let response;
      
      if (isEditMode && editPlanId) {
        // Update existing plan
        response = await apiRequest(
          "PUT",
          `/api/fitness-plans/${editPlanId}`,
          planData
        );
        
        if (!response.ok) {
          throw new Error("Failed to update fitness plan");
        }
        
        const updatedPlan = await response.json();
        
        toast({
          title: "Success!",
          description: "Fitness plan updated successfully.",
        });
        
        // Navigate to plan details using the correct URL format with "plans" (plural)
        navigate(`/trainer/clients/${data.clientId}/plans/${updatedPlan.id}`);
      } else {
        // Create new plan
        response = await apiRequest(
          "POST",
          `/api/trainer/clients/${data.clientId}/fitness-plan`,
          planData
        );
        
        if (!response.ok) {
          throw new Error("Failed to create fitness plan");
        }
        
        const newPlan = await response.json();
        
        toast({
          title: "Success!",
          description: "Fitness plan created successfully.",
        });
        
        // Navigate to plan details using the correct URL format with "plans" (plural)
        navigate(`/trainer/clients/${data.clientId}/plans/${newPlan.id}`);
      }

      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trainer/client-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fitness-plans", editPlanId] });
      
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} plan:`, error);
      toast({
        title: `Failed to ${isEditMode ? 'update' : 'create'} plan`,
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingClients) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Also show loading state for plan data when in edit mode
  if (isEditMode && isLoadingPlan) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container py-6 md:py-10">
      <div className="mb-6">
        <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {isEditMode ? "Edit Fitness Plan" : "Create New Fitness Plan"}
        </h1>
        <p className="text-xs md:text-base text-muted-foreground">
          {isEditMode 
            ? "Update your client's fitness plan" 
            : "Create a personalized fitness plan for your client"
          }
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg md:text-xl">
                <ClipboardList className="mr-2 h-5 w-5 text-indigo-500" />
                Plan Details
              </CardTitle>
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
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a client" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients && clients.length > 0 ? (
                              clients.map((clientData: any) => (
                                <SelectItem
                                  key={clientData.client.id}
                                  value={clientData.client.id.toString()}
                                >
                                  {clientData.client.username}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-clients" disabled>
                                No clients available
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="details">
                        <div className="flex items-center">
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Plan Details
                        </div>
                      </TabsTrigger>
                      <TabsTrigger value="workout">
                        <div className="flex items-center">
                          <Dumbbell className="mr-2 h-4 w-4" />
                          Workout Plan
                        </div>
                      </TabsTrigger>
                      <TabsTrigger value="meals">
                        <div className="flex items-center">
                          <Utensils className="mr-2 h-4 w-4" />
                          Meal Plan
                        </div>
                      </TabsTrigger>
                    </TabsList>

                    {/* Plan Details Tab */}
                    <TabsContent value="details" className="space-y-6 pt-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 4-Week Strength Program" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Plan Type</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="strength">Strength</SelectItem>
                                  <SelectItem value="cardio">Cardio</SelectItem>
                                  <SelectItem value="hypertrophy">Hypertrophy</SelectItem>
                                  <SelectItem value="weight-loss">Weight Loss</SelectItem>
                                  <SelectItem value="maintenance">Maintenance</SelectItem>
                                  <SelectItem value="functional">Functional</SelectItem>
                                  <SelectItem value="recovery">Recovery</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="level"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Difficulty Level</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select level" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="beginner">Beginner</SelectItem>
                                  <SelectItem value="intermediate">Intermediate</SelectItem>
                                  <SelectItem value="advanced">Advanced</SelectItem>
                                  <SelectItem value="elite">Elite</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="durationWeeks"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration (weeks)</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(parseInt(value, 10))}
                                defaultValue={field.value.toString()}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select duration" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="1">1 week</SelectItem>
                                  <SelectItem value="2">2 weeks</SelectItem>
                                  <SelectItem value="4">4 weeks</SelectItem>
                                  <SelectItem value="6">6 weeks</SelectItem>
                                  <SelectItem value="8">8 weeks</SelectItem>
                                  <SelectItem value="12">12 weeks</SelectItem>
                                  <SelectItem value="16">16 weeks</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="goal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Primary Goal</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Increase strength by 15%" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Plan Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Detailed description of the plan..."
                                className="min-h-32"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    {/* Workout Plan Tab */}
                    <TabsContent value="workout" className="space-y-6 pt-4">
                      <div className="flex flex-col gap-2">
                        <h3 className="font-medium text-base flex items-center">
                          <Dumbbell className="h-5 w-5 mr-2 text-blue-600" />
                          Weekly Workout Schedule
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Define your client's workout schedule for the week
                        </p>

                        <FormField
                          control={form.control}
                          name="workoutPlan.notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Workout Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Additional notes about the workout plan..."
                                  className="min-h-24"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="mt-6">
                          <Accordion type="single" collapsible className="border rounded-md">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
                              <AccordionItem key={day} value={day.toLowerCase()}>
                                <AccordionTrigger className="px-4 py-2">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                                    <span>{day}</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 py-2">
                                  <div className="space-y-4">
                                    {/* Add workout exercises for this day */}
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-medium">Workout Name</h4>
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-8 px-2 text-xs"
                                          onClick={() => {
                                            // Initialize workout for this day
                                            const key = day.toLowerCase();
                                            const currentSchedule = form.getValues('workoutPlan.weeklySchedule') || {};
                                            
                                            // Add an initial exercise to make it visible
                                            form.setValue(`workoutPlan.weeklySchedule.${key}`, {
                                              name: `${day} Workout`,
                                              exercises: [{
                                                name: "Exercise 1",
                                                sets: 3,
                                                reps: 10,
                                                rest: 60,
                                                weight: null
                                              }]
                                            });
                                            
                                            // This is essential to trigger re-render
                                            form.trigger("workoutPlan");
                                            
                                            // Force React to re-render
                                            const updatedValue = form.getValues();
                                            form.setValue('workoutPlan', {...updatedValue.workoutPlan});
                                          }}
                                        >
                                          <PlusCircle className="h-3.5 w-3.5 mr-1" />
                                          Add Workout
                                        </Button>
                                      </div>
                                      
                                      {/* List exercises */}
                                      {form.watch(`workoutPlan.weeklySchedule.${day.toLowerCase()}.exercises`)?.length > 0 && (
                                        <div className="mt-4 space-y-3">
                                          <h5 className="text-xs font-medium text-muted-foreground">Exercises</h5>
                                          {form.watch(`workoutPlan.weeklySchedule.${day.toLowerCase()}.exercises`)?.map((exercise, exIndex) => (
                                            <div key={exIndex} className="border rounded-md p-3">
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                                                <FormField
                                                  control={form.control}
                                                  name={`workoutPlan.weeklySchedule.${day.toLowerCase()}.exercises.${exIndex}.name`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Exercise Name</FormLabel>
                                                      <FormControl>
                                                        <Input placeholder="Exercise name" {...field} />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                                <div className="grid grid-cols-3 gap-2">
                                                  <FormField
                                                    control={form.control}
                                                    name={`workoutPlan.weeklySchedule.${day.toLowerCase()}.exercises.${exIndex}.sets`}
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel className="text-xs">Sets</FormLabel>
                                                        <FormControl>
                                                          <Input type="number" min="1" step="1" {...field} />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                  <FormField
                                                    control={form.control}
                                                    name={`workoutPlan.weeklySchedule.${day.toLowerCase()}.exercises.${exIndex}.reps`}
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel className="text-xs">Reps</FormLabel>
                                                        <FormControl>
                                                          <Input type="number" min="1" step="1" {...field} />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                  <FormField
                                                    control={form.control}
                                                    name={`workoutPlan.weeklySchedule.${day.toLowerCase()}.exercises.${exIndex}.rest`}
                                                    render={({ field }) => (
                                                      <FormItem>
                                                        <FormLabel className="text-xs">Rest (sec)</FormLabel>
                                                        <FormControl>
                                                          <Input type="number" min="0" step="5" {...field} />
                                                        </FormControl>
                                                      </FormItem>
                                                    )}
                                                  />
                                                </div>
                                              </div>
                                              <div className="flex justify-end">
                                                <Button
                                                  type="button"
                                                  variant="outline"
                                                  size="sm"
                                                  className="text-xs"
                                                  onClick={() => {
                                                    const exercises = form.getValues(`workoutPlan.weeklySchedule.${day.toLowerCase()}.exercises`) || [];
                                                    const updated = exercises.filter((_, i) => i !== exIndex);
                                                    form.setValue(`workoutPlan.weeklySchedule.${day.toLowerCase()}.exercises`, updated);
                                                    form.trigger("workoutPlan");
                                                  }}
                                                >
                                                  <Trash2 className="h-3 w-3 mr-1" />
                                                  Remove
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full mt-2"
                                            onClick={() => {
                                              const exercises = form.getValues(`workoutPlan.weeklySchedule.${day.toLowerCase()}.exercises`) || [];
                                              form.setValue(`workoutPlan.weeklySchedule.${day.toLowerCase()}.exercises`, [
                                                ...exercises,
                                                {
                                                  name: `Exercise ${exercises.length + 1}`,
                                                  sets: 3,
                                                  reps: 10,
                                                  rest: 60,
                                                  weight: null
                                                }
                                              ]);
                                              form.trigger("workoutPlan");
                                            }}
                                          >
                                            <PlusCircle className="h-3.5 w-3.5 mr-1" />
                                            Add Exercise
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      </div>
                    </TabsContent>

                    {/* Meal Plan Tab */}
                    <TabsContent value="meals" className="space-y-6 pt-4">
                      <div className="flex flex-col gap-2">
                        <h3 className="font-medium text-base flex items-center">
                          <Utensils className="h-5 w-5 mr-2 text-green-600" />
                          Weekly Meal Schedule
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Define your client's meal plan for the week
                        </p>

                        <FormField
                          control={form.control}
                          name="mealPlan.notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Meal Plan Notes</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Additional notes about the meal plan..."
                                  className="min-h-24"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="mt-6">
                          <Accordion type="single" collapsible className="border rounded-md">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => (
                              <AccordionItem key={day} value={day.toLowerCase()}>
                                <AccordionTrigger className="px-4 py-2">
                                  <div className="flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 text-green-500" />
                                    <span>{day}</span>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-4 py-2">
                                  <div className="space-y-4">
                                    {/* Add meal plan details */}
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-medium">Daily Meals</h4>
                                        <Button 
                                          type="button" 
                                          variant="ghost" 
                                          size="sm"
                                          className="h-8 px-2 text-xs"
                                          onClick={() => {
                                            // Initialize meals for this day
                                            const key = day.toLowerCase();
                                            const currentMeals = form.getValues('mealPlan.weeklyMeals') || {};
                                            
                                            form.setValue(`mealPlan.weeklyMeals.${key}`, {
                                              breakfast: { name: 'Breakfast', description: 'Morning meal', calories: 400, protein: 20, carbs: 40, fat: 15 },
                                              lunch: { name: 'Lunch', description: 'Midday meal', calories: 600, protein: 30, carbs: 60, fat: 20 },
                                              dinner: { name: 'Dinner', description: 'Evening meal', calories: 500, protein: 25, carbs: 50, fat: 15 },
                                              snacks: [{
                                                name: 'Snack', 
                                                description: 'Afternoon snack', 
                                                calories: 200, 
                                                protein: 10, 
                                                carbs: 20, 
                                                fat: 5
                                              }]
                                            });
                                            
                                            // This is essential to trigger re-render
                                            form.trigger("mealPlan");
                                            
                                            // Force React to re-render
                                            const updatedValue = form.getValues();
                                            form.setValue('mealPlan', {...updatedValue.mealPlan});
                                          }}
                                        >
                                          <PlusCircle className="h-3.5 w-3.5 mr-1" />
                                          Add Meals
                                        </Button>
                                      </div>
                                      
                                      {/* Meal inputs would go here */}
                                      {form.watch(`mealPlan.weeklyMeals.${day.toLowerCase()}`) && (
                                        <div className="mt-4 space-y-5">
                                          {/* Breakfast */}
                                          <div className="border rounded-md p-3">
                                            <h5 className="text-xs font-medium text-muted-foreground mb-2">Breakfast</h5>
                                            <div className="space-y-3">
                                              <FormField
                                                control={form.control}
                                                name={`mealPlan.weeklyMeals.${day.toLowerCase()}.breakfast.name`}
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel className="text-xs">Meal Name</FormLabel>
                                                    <FormControl>
                                                      <Input placeholder="Breakfast name" {...field} />
                                                    </FormControl>
                                                  </FormItem>
                                                )}
                                              />
                                              <FormField
                                                control={form.control}
                                                name={`mealPlan.weeklyMeals.${day.toLowerCase()}.breakfast.description`}
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel className="text-xs">Description</FormLabel>
                                                    <FormControl>
                                                      <Textarea 
                                                        placeholder="Breakfast description" 
                                                        className="min-h-[60px]"
                                                        {...field} 
                                                      />
                                                    </FormControl>
                                                  </FormItem>
                                                )}
                                              />
                                              <div className="grid grid-cols-4 gap-2">
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.breakfast.calories`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Calories</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.breakfast.protein`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Protein (g)</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.breakfast.carbs`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Carbs (g)</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.breakfast.fat`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Fat (g)</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Lunch */}
                                          <div className="border rounded-md p-3">
                                            <h5 className="text-xs font-medium text-muted-foreground mb-2">Lunch</h5>
                                            <div className="space-y-3">
                                              <FormField
                                                control={form.control}
                                                name={`mealPlan.weeklyMeals.${day.toLowerCase()}.lunch.name`}
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel className="text-xs">Meal Name</FormLabel>
                                                    <FormControl>
                                                      <Input placeholder="Lunch name" {...field} />
                                                    </FormControl>
                                                  </FormItem>
                                                )}
                                              />
                                              <FormField
                                                control={form.control}
                                                name={`mealPlan.weeklyMeals.${day.toLowerCase()}.lunch.description`}
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel className="text-xs">Description</FormLabel>
                                                    <FormControl>
                                                      <Textarea 
                                                        placeholder="Lunch description" 
                                                        className="min-h-[60px]"
                                                        {...field} 
                                                      />
                                                    </FormControl>
                                                  </FormItem>
                                                )}
                                              />
                                              <div className="grid grid-cols-4 gap-2">
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.lunch.calories`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Calories</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.lunch.protein`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Protein (g)</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.lunch.carbs`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Carbs (g)</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.lunch.fat`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Fat (g)</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Dinner */}
                                          <div className="border rounded-md p-3">
                                            <h5 className="text-xs font-medium text-muted-foreground mb-2">Dinner</h5>
                                            <div className="space-y-3">
                                              <FormField
                                                control={form.control}
                                                name={`mealPlan.weeklyMeals.${day.toLowerCase()}.dinner.name`}
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel className="text-xs">Meal Name</FormLabel>
                                                    <FormControl>
                                                      <Input placeholder="Dinner name" {...field} />
                                                    </FormControl>
                                                  </FormItem>
                                                )}
                                              />
                                              <FormField
                                                control={form.control}
                                                name={`mealPlan.weeklyMeals.${day.toLowerCase()}.dinner.description`}
                                                render={({ field }) => (
                                                  <FormItem>
                                                    <FormLabel className="text-xs">Description</FormLabel>
                                                    <FormControl>
                                                      <Textarea 
                                                        placeholder="Dinner description" 
                                                        className="min-h-[60px]"
                                                        {...field} 
                                                      />
                                                    </FormControl>
                                                  </FormItem>
                                                )}
                                              />
                                              <div className="grid grid-cols-4 gap-2">
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.dinner.calories`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Calories</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.dinner.protein`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Protein (g)</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.dinner.carbs`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Carbs (g)</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                                <FormField
                                                  control={form.control}
                                                  name={`mealPlan.weeklyMeals.${day.toLowerCase()}.dinner.fat`}
                                                  render={({ field }) => (
                                                    <FormItem>
                                                      <FormLabel className="text-xs">Fat (g)</FormLabel>
                                                      <FormControl>
                                                        <Input 
                                                          type="number" 
                                                          min="0"
                                                          {...field} 
                                                        />
                                                      </FormControl>
                                                    </FormItem>
                                                  )}
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                          </Accordion>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/trainer")}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditMode ? "Update Plan" : "Create Plan"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center mb-3">
                  <Target className="h-5 w-5 mr-2 text-orange-500" />
                  <h3 className="font-medium">Plan Components</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start">
                    <Dumbbell className="h-4 w-4 mr-2 mt-0.5 text-indigo-500" />
                    <span>Workout schedules with specific exercises</span>
                  </li>
                  <li className="flex items-start">
                    <Activity className="h-4 w-4 mr-2 mt-0.5 text-indigo-500" />
                    <span>Progress tracking and performance metrics</span>
                  </li>
                  <li className="flex items-start">
                    <Calendar className="h-4 w-4 mr-2 mt-0.5 text-indigo-500" />
                    <span>Weekly structure with rest days</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center mb-3">
                  <UserCheck className="h-5 w-5 mr-2 text-green-500" />
                  <h3 className="font-medium">Client Selection</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Choose a client from your accepted client list. Each plan is tailored specifically to an individual client.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}