import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Loader2, ArrowLeft, Save, User, Scale, CalendarRange, 
  Dumbbell, Notebook, UserMinus, AlertTriangle, Plus, 
  MessageSquare, Calendar, PlusCircle, Clipboard, CheckCircle,
  Clock
} from 'lucide-react';
import TrainerNavbar from '@/components/TrainerNavbar';
import TrainerPageHeader from '@/components/TrainerPageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import WeeklyWorkoutView from "@/components/workout/WeeklyWorkoutView";
import WeeklyNutritionView from "@/components/nutrition/WeeklyNutritionView";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const clientNotesSchema = z.object({
  notes: z.string().optional(),
});

type ClientNotesFormValues = z.infer<typeof clientNotesSchema>;

export default function TrainerClientDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const clientId = params?.clientId;
  
  // Log params to debug routing issues
  useEffect(() => {
    console.log("TrainerClientDetail params:", { clientId, rawParams: params });
  }, [clientId, params]);
  
  // Redirect if not trainer
  useEffect(() => {
    if (user && !user.isTrainer && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch client details
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
  const form = useForm<ClientNotesFormValues>({
    resolver: zodResolver(clientNotesSchema),
    defaultValues: {
      notes: "",
    },
  });
  
  // Update form with client data
  useEffect(() => {
    if (clientData?.relationship) {
      form.reset({
        notes: clientData.relationship.notes,
      });
    }
  }, [clientData, form]);

  // Update client notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (data: ClientNotesFormValues) => {
      const res = await apiRequest('PUT', `/api/trainer/clients/${clientId}/notes`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update notes');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Notes updated",
        description: "Client notes have been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/clients', clientId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating notes",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // End client relationship mutation
  const [confirmEndRelationship, setConfirmEndRelationship] = useState(false);
  
  const endRelationshipMutation = useMutation({
    mutationFn: async () => {
      const relationshipId = clientData?.relationship?.id;
      
      if (!relationshipId) {
        throw new Error("No active relationship found");
      }
      
      const res = await apiRequest('DELETE', `/api/trainer/clients/${relationshipId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to end client relationship');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Client relationship ended",
        description: "You are no longer the trainer for this client.",
      });
      // Navigate back to trainer dashboard
      navigate('/trainer');
    },
    onError: (error: Error) => {
      toast({
        title: "Error ending relationship",
        description: error.message,
        variant: "destructive",
      });
      setConfirmEndRelationship(false);
    }
  });

  // Handle form submission
  const onSubmit = (data: ClientNotesFormValues) => {
    updateNotesMutation.mutate(data);
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
        <Button className="mt-4" onClick={() => navigate('/trainer')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TrainerNavbar />
      
      <div className="flex-1 md:pl-64 pt-16 md:pt-2 bg-background pb-16">
        <div className="max-w-6xl mx-auto py-2 md:py-4 px-3 md:px-6">
          <TrainerPageHeader 
            title={`Client: ${clientData?.client?.username || ''}`}
            subtitle={`Client since ${format(new Date(clientData?.relationship?.startedAt || new Date()), 'MMM d, yyyy')}`}
            backUrl="/trainer"
            backLabel="Back to Clients"
            action={
              <Dialog open={confirmEndRelationship} onOpenChange={setConfirmEndRelationship}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 border-red-200 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950 dark:border-red-800"
                  >
                    <UserMinus className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">End Relationship</span>
                    <span className="inline sm:hidden">End</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[90vw] sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center">
                      <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                      End Client Relationship
                    </DialogTitle>
                    <DialogDescription>
                      Are you sure you want to end your trainer-client relationship with {clientData?.client?.username}?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-2">
                    <p className="font-medium text-sm">What happens when you end a relationship:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-xs text-muted-foreground">
                      <li>You will no longer be able to access this client's data</li>
                      <li>The client will not be able to message you</li>
                      <li>The client's plans remain but they will be unassigned from you</li>
                    </ul>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmEndRelationship(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive"
                      size="sm"
                      disabled={endRelationshipMutation.isPending}
                      onClick={() => endRelationshipMutation.mutate()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {endRelationshipMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Confirm
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            }
          />

      {/* Client Profile Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        {/* Client Profile */}
        <Card className="overflow-hidden border border-blue-100 dark:border-blue-900 shadow-sm bg-white/95 dark:bg-card/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-3 pb-2">
            <CardTitle className="flex items-center text-base">
              <User className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-medium text-muted-foreground">Username:</h3>
                <p className="text-sm font-medium">{clientData?.client?.username}</p>
              </div>
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-medium text-muted-foreground">Email:</h3>
                <p className="text-xs overflow-hidden text-ellipsis max-w-[150px]">{clientData?.client?.email}</p>
              </div>
              {clientData?.latestWeight && (
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-muted-foreground">Latest Weight:</h3>
                  <p className="text-sm font-medium">{clientData.latestWeight.weight} {clientData.latestWeight.unit}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Nutrition Goals */}
        <Card className="overflow-hidden border border-green-100 dark:border-green-900 shadow-sm bg-white/95 dark:bg-card/90 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950 p-3 pb-2">
            <CardTitle className="flex items-center text-base">
              <CalendarRange className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
              Nutrition Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {clientData?.nutritionGoal ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-2 text-center">
                    <p className="text-xs text-muted-foreground">Calories</p>
                    <p className="text-sm font-semibold">{clientData.nutritionGoal.caloriesPerDay} <span className="text-xs">kcal</span></p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-2 text-center">
                    <p className="text-xs text-muted-foreground">Protein</p>
                    <p className="text-sm font-semibold">{clientData.nutritionGoal.proteinPerDay} <span className="text-xs">g</span></p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-2 text-center">
                    <p className="text-xs text-muted-foreground">Carbs</p>
                    <p className="text-sm font-semibold">{clientData.nutritionGoal.carbsPerDay} <span className="text-xs">g</span></p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-2 text-center">
                    <p className="text-xs text-muted-foreground">Fat</p>
                    <p className="text-sm font-semibold">{clientData.nutritionGoal.fatPerDay} <span className="text-xs">g</span></p>
                  </div>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-3 rounded-lg"
                    onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals`)}
                  >
                    Edit Goals
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-[100px] flex flex-col items-center justify-center text-muted-foreground">
                <p className="text-xs mb-2">No nutrition goals set</p>
                <Button 
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3 rounded-lg"
                  onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals`)}
                >
                  Set Goals
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fitness Plan */}
        <Card className="overflow-hidden border border-purple-100 dark:border-purple-900 shadow-sm bg-white/95 dark:bg-card/90 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 p-3 pb-2">
            <CardTitle className="flex items-center text-base">
              <Dumbbell className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
              Active Fitness Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {clientData?.fitnessPlan ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-muted-foreground">Plan:</h3>
                  <p className="text-sm font-medium">{clientData.fitnessPlan.preferences?.name || "Untitled Plan"}</p>
                </div>
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-muted-foreground">Goal:</h3>
                  <p className="text-sm">{clientData.fitnessPlan.preferences?.goal || "Not specified"}</p>
                </div>
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-medium text-muted-foreground">Duration:</h3>
                  <p className="text-sm">{clientData.fitnessPlan.preferences?.durationWeeks || "4"} weeks</p>
                </div>
                <div className="pt-2 flex justify-end">
                  <Button 
                    variant="default"
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs h-8 px-3 rounded-lg"
                    onClick={() => {
                      navigate(`/trainer/clients/${clientId}/plans/${clientData.fitnessPlan.id}`);
                    }}
                  >
                    Manage Plan
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-[100px] flex flex-col items-center justify-center text-muted-foreground">
                <p className="text-xs mb-2">No active fitness plan</p>
                <Button 
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 px-3 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 hover:bg-blue-50 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300 dark:border-blue-800"
                  onClick={() => navigate(`/enhanced-trainer-plan-creation?clientId=${clientId}`)}
                >
                  Create Plan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Client History and Notes Tabs */}
      <Tabs defaultValue="notes" className="mt-3">
        <TabsList className="grid w-full grid-cols-4 h-auto pb-safe">
          <TabsTrigger value="notes" className="text-xs py-1.5 px-0.5 h-auto rounded-lg">
            <Notebook className="h-3 w-3 mb-0.5 mr-1 sm:mr-1.5" />
            <span className="truncate">Notes</span>
          </TabsTrigger>
          <TabsTrigger value="workouts" className="text-xs py-1.5 px-0.5 h-auto rounded-lg">
            <Dumbbell className="h-3 w-3 mb-0.5 mr-1 sm:mr-1.5" />
            <span className="truncate">Workouts</span>
          </TabsTrigger>
          <TabsTrigger value="nutrition" className="text-xs py-1.5 px-0.5 h-auto rounded-lg">
            <CalendarRange className="h-3 w-3 mb-0.5 mr-1 sm:mr-1.5" />
            <span className="truncate">Nutrition</span>
          </TabsTrigger>
          <TabsTrigger value="weights" className="text-xs py-1.5 px-0.5 h-auto rounded-lg">
            <Scale className="h-3 w-3 mb-0.5 mr-1 sm:mr-1.5" />
            <span className="truncate">Weight</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notes" className="pt-3">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white/95 dark:bg-card/90 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center text-base">
                <Notebook className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                Client Notes
              </CardTitle>
              <CardDescription className="text-xs">
                Record notes about this client for your reference
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter notes about this client's progress, goals, or special considerations..." 
                            className="min-h-[120px] text-sm" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          These notes are only visible to you as this client's trainer.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit"
                      size="sm"
                      disabled={updateNotesMutation.isPending}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white h-8 px-3 rounded-lg"
                    >
                      {updateNotesMutation.isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
                      <Save className="mr-1.5 h-3 w-3" />
                      Save Notes
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="workouts" className="pt-3">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white/95 dark:bg-card/90 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start">
              <div>
                <CardTitle className="flex items-center text-base">
                  <Dumbbell className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                  Workout History
                </CardTitle>
                <CardDescription className="text-xs">
                  Review and manage your client's workouts
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 px-3 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-200 hover:bg-blue-50 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-300 dark:border-blue-800"
                onClick={() => navigate(`/enhanced-trainer-plan-creation?clientId=${clientId}`)}
              >
                <PlusCircle className="mr-1 h-3.5 w-3.5" />
                New Workout
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {clientData?.workouts && clientData.workouts.length > 0 ? (
                <div className="space-y-4">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-3">
                      {clientData.workouts.sort((a, b) => 
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                      ).map((workout) => (
                        <Card key={workout.id} className="border border-slate-200 dark:border-slate-800">
                          <CardHeader className="p-3 pb-2">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-sm font-medium">
                                {workout.name}
                              </CardTitle>
                              <Badge variant="outline" className="text-xs font-normal">
                                {format(new Date(workout.date), 'MMM d, yyyy')}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs flex items-center">
                              <Clock className="h-3 w-3 mr-1 inline-block" />
                              {workout.duration} minutes
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="text-xs text-muted-foreground mt-1 mb-2">
                              {workout.exercises ? workout.exercises.length : 0} exercises
                            </div>
                            {workout.exercises && workout.exercises.length > 0 && (
                              <ul className="text-xs space-y-1.5">
                                {workout.exercises.slice(0, 3).map((exercise, idx) => (
                                  <li key={idx} className="flex items-center">
                                    <CheckCircle className="h-3 w-3 mr-1.5 text-green-500" />
                                    <span className="font-medium">{exercise.name}</span>
                                    <span className="ml-auto text-muted-foreground">
                                      {exercise.sets} × {exercise.reps}
                                      {exercise.weight ? ` @ ${exercise.weight}${exercise.unit || 'kg'}` : ''}
                                    </span>
                                  </li>
                                ))}
                                {workout.exercises.length > 3 && (
                                  <li className="text-muted-foreground text-center">
                                    + {workout.exercises.length - 3} more
                                  </li>
                                )}
                              </ul>
                            )}
                          </CardContent>
                          <CardFooter className="p-3 pt-0 flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                window.alert(`View workout details for: ${workout.name}`);
                              }}
                            >
                              <Clipboard className="h-3 w-3 mr-1" />
                              Details
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No workouts found</p>
                  <p className="text-xs mt-1">Your client hasn't logged any workouts yet.</p>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="mt-4 h-8"
                    onClick={() => navigate(`/enhanced-trainer-plan-creation?clientId=${clientId}`)}
                  >
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                    Add First Workout
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="nutrition" className="pt-3">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white/95 dark:bg-card/90 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start">
              <div>
                <CardTitle className="flex items-center text-base">
                  <CalendarRange className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                  Nutrition Goals & Tracking
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage nutrition goals and view meal logs
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 px-3 rounded-lg bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200 hover:bg-green-50 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-300 dark:border-green-800"
                onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals/edit`)}
              >
                <PlusCircle className="mr-1 h-3.5 w-3.5" />
                Update Goals
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {/* Nutrition Goals Summary */}
              {clientData?.nutritionGoal ? (
                <div className="mb-6">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <Clipboard className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                    Current Nutrition Goals
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Card className="border-green-100 dark:border-green-900 bg-green-50/50 dark:bg-green-900/20">
                      <CardContent className="p-3 flex flex-col items-center justify-center">
                        <p className="text-xs text-green-800 dark:text-green-300 mb-1">Calories</p>
                        <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                          {clientData.nutritionGoal.caloriesPerDay}
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-500">kcal/day</p>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/20">
                      <CardContent className="p-3 flex flex-col items-center justify-center">
                        <p className="text-xs text-blue-800 dark:text-blue-300 mb-1">Protein</p>
                        <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                          {clientData.nutritionGoal.proteinPerDay}g
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-500">
                          {clientData.nutritionGoal.proteinPercentage}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-amber-100 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-900/20">
                      <CardContent className="p-3 flex flex-col items-center justify-center">
                        <p className="text-xs text-amber-800 dark:text-amber-300 mb-1">Carbs</p>
                        <p className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                          {clientData.nutritionGoal.carbsPerDay}g
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                          {clientData.nutritionGoal.carbsPercentage}%
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-red-100 dark:border-red-900 bg-red-50/50 dark:bg-red-900/20">
                      <CardContent className="p-3 flex flex-col items-center justify-center">
                        <p className="text-xs text-red-800 dark:text-red-300 mb-1">Fat</p>
                        <p className="text-lg font-semibold text-red-700 dark:text-red-400">
                          {clientData.nutritionGoal.fatPerDay}g
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-500">
                          {clientData.nutritionGoal.fatPercentage}%
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4 mb-4 border border-dashed rounded-lg border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
                  <CalendarRange className="h-10 w-10 text-green-400 mb-2" />
                  <h3 className="text-sm font-medium">No nutrition goals set</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Set nutrition goals to help your client track their daily intake
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-green-100 hover:bg-green-200 text-green-800 border-green-300"
                    onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals/edit`)}
                  >
                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                    Set Nutrition Goals
                  </Button>
                </div>
              )}
              
              {/* Display meal logs if available */}
              {clientData?.meals && clientData.meals.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2 flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                    Recent Meal Logs
                  </h3>
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-3">
                      {clientData.meals.sort((a, b) => 
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                      ).slice(0, 5).map((meal, index) => (
                        <Card key={index} className="border border-slate-200 dark:border-slate-800">
                          <CardHeader className="p-3 pb-2">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-sm font-medium">
                                {meal.name || meal.type || 'Meal'}
                              </CardTitle>
                              <Badge variant="outline" className="text-xs font-normal">
                                {format(new Date(meal.date), 'MMM d, yyyy')}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs flex items-center">
                              {meal.time && (
                                <span className="flex items-center mr-2">
                                  <Clock className="h-3 w-3 mr-1 inline-block" />
                                  {meal.time}
                                </span>
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            <div className="grid grid-cols-4 gap-2 mt-2">
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Calories</p>
                                <p className="text-sm font-medium">{meal.calories || 0} kcal</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Protein</p>
                                <p className="text-sm font-medium">{meal.protein || 0}g</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Carbs</p>
                                <p className="text-sm font-medium">{meal.carbs || 0}g</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground">Fat</p>
                                <p className="text-sm font-medium">{meal.fat || 0}g</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No nutrition data found</p>
                  <p className="text-xs mt-1">
                    {clientData?.nutritionGoal 
                      ? "Your client hasn't logged any meals yet." 
                      : "Set nutrition goals for your client first."}
                  </p>
                  {!clientData?.nutritionGoal && (
                    <Button 
                      variant="outline"
                      size="sm"
                      className="mt-3 text-xs h-8 px-3 rounded-lg"
                      onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals`)}
                    >
                      Set Nutrition Goals
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="weights" className="pt-3">
          <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white/95 dark:bg-card/90 backdrop-blur-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="flex items-center text-base">
                <Scale className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                Weight History
              </CardTitle>
              <CardDescription className="text-xs">
                Track your client's weight progress over time
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {clientData?.weights && clientData.weights.length > 0 ? (
                <div className="overflow-x-auto -mx-4 px-4">
                  <Table className="w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-1/3">Date</TableHead>
                        <TableHead className="text-xs w-1/4">Weight</TableHead>
                        <TableHead className="text-xs w-1/4">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientData.weights
                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((weight: any, index: number, entries: any[]) => {
                          // Calculate change from previous entry if it exists
                          const prevEntry = entries[index + 1];
                          const change = prevEntry 
                            ? weight.weight - prevEntry.weight
                            : 0;
                          
                          return (
                            <TableRow key={weight.id}>
                              <TableCell className="text-xs py-2">{format(new Date(weight.date), 'MMM d, yyyy')}</TableCell>
                              <TableCell className="text-xs font-medium py-2">{weight.weight} {weight.unit}</TableCell>
                              <TableCell className="text-xs py-2">
                                {index === entries.length - 1 ? (
                                  <span className="text-muted-foreground">-</span>
                                ) : change === 0 ? (
                                  <span className="text-muted-foreground">No change</span>
                                ) : (
                                  <span className={change > 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}>
                                    {change > 0 ? '+' : ''}{change.toFixed(1)} {weight.unit}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No weight records found</p>
                  <p className="text-xs mt-1">Your client hasn't logged any weight measurements yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
    </div>
  </div>
  );
}