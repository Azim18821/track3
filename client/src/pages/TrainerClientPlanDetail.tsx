import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Loader2, Dumbbell, Calendar, User, ArrowLeft, Tag, ChevronsUpDown, 
  Check, PlusCircle, Utensils, Pencil as PencilIcon, Trash2, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import TrainerNavbar from '@/components/TrainerNavbar';
import TrainerPageHeader from '@/components/TrainerPageHeader';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

interface FitnessPlan {
  id: number;
  userId: number;
  preferences: {
    goal: string;
    currentWeight: number;
    targetWeight?: number;
    unit: string;
    age?: number;
    height?: number;
    gender?: string;
    workoutDaysPerWeek: number;
    dietaryRestrictions: string[];
    preferredFoods: string[];
    fitnessLevel: string;
    budget?: number | string;
  };
  workoutPlan: {
    weeklySchedule: {
      [key: string]: {
        name: string;
        exercises: Array<{
          name: string;
          sets: number;
          reps: number;
          rest: number;
          weight?: number | null;
        }>;
      };
    };
    notes: string;
  };
  mealPlan: {
    weeklyMeals: {
      [key: string]: {
        breakfast: {
          name: string;
          description: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        lunch: {
          name: string;
          description: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        dinner: {
          name: string;
          description: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        snacks: Array<{
          name: string;
          description: string;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        }>;
      };
    };
    notes: string;
  };
  isActive: boolean;
  createdAt: string;
}

interface ClientInfo {
  id: number;
  username: string;
  email: string;
}

const planNotesSchema = z.object({
  workoutNotes: z.string().optional(),
  mealNotes: z.string().optional(),
});

type PlanNotesFormValues = z.infer<typeof planNotesSchema>;

export default function TrainerClientPlanDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const clientId = params?.clientId;
  const planId = params?.planId;
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Log params to debug routing issues
  useEffect(() => {
    console.log("TrainerClientPlanDetail params:", { clientId, planId, rawParams: params });
  }, [clientId, planId, params]);
  const [tab, setTab] = useState<string>("workouts");
  
  // Define days of the week 
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  // Redirect if not trainer
  useEffect(() => {
    if (user && !user.isTrainer && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch client info from the trainer client endpoint
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['/api/trainer/clients', clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/clients/${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch client information');
      const data = await res.json();
      console.log("Client info API response:", data);
      return data;
    },
    enabled: !!(user?.isTrainer || user?.isAdmin) && !!clientId,
    retry: 3, // Retry up to 3 times in case of network issues
    staleTime: 60000 // Consider data fresh for 1 minute
  });
  
  // Extract client info from response
  const clientInfo = clientData?.client;

  // Fetch fitness plan from trainer fitness plans
  const { 
    data: plan, 
    isLoading: planLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['/api/trainer/clients', clientId, 'plans', planId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/clients/${clientId}/plans/${planId}`);
      if (!res.ok) throw new Error('Failed to fetch fitness plan');
      const data = await res.json();
      console.log("Fitness plan API response:", data);
      return data;
    },
    enabled: !!(user?.isTrainer || user?.isAdmin) && !!planId,
    retry: 3, // Retry up to 3 times in case of network issues
    staleTime: 60000 // Consider data fresh for 1 minute
  });

  // Set up form
  const form = useForm<PlanNotesFormValues>({
    resolver: zodResolver(planNotesSchema),
    defaultValues: {
      workoutNotes: "",
      mealNotes: "",
    },
  });

  // Update form values when plan data is loaded
  useEffect(() => {
    if (plan) {
      form.reset({
        workoutNotes: plan.workoutPlan?.notes || "",
        mealNotes: plan.mealPlan?.notes || "",
      });
    }
  }, [plan, form]);

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (data: PlanNotesFormValues) => {
      const payload = {
        workoutNotes: data.workoutNotes,
        mealNotes: data.mealNotes,
      };
      
      const res = await apiRequest('PATCH', `/api/fitness-plans/${planId}/notes`, payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update plan notes');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Plan notes have been updated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/fitness-plans', planId] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async () => {
      console.log(`Attempting to delete plan with ID: ${planId}`);
      const res = await apiRequest('DELETE', `/api/trainer/fitness-plans/${planId}`);
      
      // Read the response body regardless of status code
      const responseText = await res.text();
      let data;
      
      try {
        // Try to parse as JSON if possible
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        // If not valid JSON, use empty object
        data = {};
      }
      
      // If response wasn't successful, throw with server message or fallback
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete fitness plan');
      }
      
      // Success case
      return {
        success: true,
        clientId: data.clientId || clientId,
        message: data.message || 'Fitness plan deleted successfully'
      };
    },
    onSuccess: (data) => {
      // Reset all state and flags
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      isDeletingRef.current = false;
      
      console.log("Plan deleted successfully, showing success message and redirecting");
      
      // Invalidate all client-related queries to ensure lists update properly
      queryClient.invalidateQueries({ queryKey: [`/api/trainer/clients/${clientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trainer/clients/${clientId}/fitness-plans`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trainer/clients`] });
      
      // Show success toast
      toast({
        title: "Success",
        description: data.message || "Fitness plan has been deleted",
      });
      
      // Redirect to client page with a slight delay to give cache time to update
      const redirectClientId = data.clientId || clientId;
      setTimeout(() => {
        navigate(`/trainer/clients/${redirectClientId}`);
      }, 300);
    },
    onError: (error: Error) => {
      // Reset all state and flags
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      isDeletingRef.current = false;
      
      console.log("Plan deletion failed with error:", error.message);
      
      // Show error toast
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeletePlan = () => {
    setShowDeleteConfirm(true);
  };

  // Track whether a deletion is already in progress with a ref to avoid race conditions
  const isDeletingRef = useRef(false);
  
  const confirmDeletePlan = () => {
    // Only proceed if not already deleting
    if (isDeletingRef.current) {
      console.log("Delete operation already in progress, ignoring duplicate request");
      return;
    }
    
    // Set both the state for UI and the ref for logic control
    setIsDeleting(true);
    isDeletingRef.current = true;
    
    console.log("Starting plan deletion, marking as in-progress");
    deletePlanMutation.mutate();
  };

  const onSubmit = (data: PlanNotesFormValues) => {
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
  if (clientLoading || planLoading) {
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
            {error instanceof Error ? error.message : 'Failed to load fitness plan'}
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate(`/trainer/clients/${clientId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Client
        </Button>
      </div>
    );
  }

  // Ensure plan and client data exists
  if (!plan || !clientInfo) {
    console.log("Plan or client info is missing:", { plan, clientInfo });
    return (
      <div className="container py-10">
        <Alert variant="destructive">
          <AlertTitle>Not Found</AlertTitle>
          <AlertDescription>
            The requested fitness plan was not found.
          </AlertDescription>
        </Alert>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate(`/trainer/clients/${clientId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Client
        </Button>
      </div>
    );
  }
  
  // Check if fitness plan has needed structure
  const isEmptyPlan = (
    !plan.preferences || Object.keys(plan.preferences).length === 0 || 
    !plan.workoutPlan || Object.keys(plan.workoutPlan).length === 0 || 
    !plan.mealPlan || Object.keys(plan.mealPlan).length === 0
  );
  
  // Show placeholder view for empty fitness plans
  if (isEmptyPlan) {
    return (
      <div className="container py-10">
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate(`/trainer/clients/${clientId}`)}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Client
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Fitness Plan Setup Required
            </h1>
            <div className="flex items-center mt-2">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-muted-foreground">
                Client: <span className="font-medium text-foreground">{clientInfo.username}</span>
              </span>
            </div>
          </div>
        </div>
        
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Incomplete Fitness Plan</CardTitle>
            <CardDescription>
              This fitness plan exists but doesn't have any details configured yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Plan ID: {plan.id}</p>
              <p>Created: {format(new Date(plan.createdAt), 'MMM d, yyyy')}</p>
              <p>Status: {plan.isActive ? "Active" : "Inactive"}</p>
              <Alert>
                <AlertTitle>Setup Required</AlertTitle>
                <AlertDescription>
                  This plan doesn't have workout schedules or meal plans configured. 
                  Please create a new plan with complete details.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={() => navigate(`/enhanced-trainer-plan-creation?clientId=${clientId}`)}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create New Complete Plan
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Debug property availability
  console.log("Plan property check:", {
    hasWeeklySchedule: !!plan?.workoutPlan?.weeklySchedule,
    hasWeeklyMeals: !!plan?.mealPlan?.weeklyMeals,
    hasNotes: !!plan?.workoutPlan?.notes && !!plan?.mealPlan?.notes,
    createdAt: plan.createdAt,
    isActive: plan.isActive
  });

  // days array is already defined above
  
  return (
    <div className="container py-10">
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/trainer/clients/${clientId}`)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Client
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Manage Client Fitness Plan
          </h1>
          <div className="flex items-center mt-2">
            <User className="h-4 w-4 mr-2 text-muted-foreground" />
            <span className="text-muted-foreground">
              Client: <span className="font-medium text-foreground">{clientInfo.username}</span>
            </span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={() => navigate(`/trainer/clients/${clientId}`)}
            className="flex-grow sm:flex-grow-0"
          >
            View Client Profile
          </Button>
          <Button 
            size="sm"
            onClick={() => navigate(`/enhanced-trainer-plan-creation?clientId=${clientId}&planId=${planId}&edit=true`)}
            className="flex-grow sm:flex-grow-0"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Plan
          </Button>
          
          {/* Completely redesigned dialog with direct control of open state */}
          <Button 
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex-grow sm:flex-grow-0"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Delete Plan
          </Button>
          
          {/* Separate dialog component with manual open state control */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-card w-full max-w-md rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-medium mb-2">Are you sure you want to delete this plan?</h3>
                <p className="text-muted-foreground mb-4">
                  This action cannot be undone. The plan and all associated data will be permanently deleted.
                  Client's tracked workouts and meals will be preserved but will no longer be linked to this plan.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (!isDeleting && !isDeletingRef.current) {
                        // Close dialog and trigger deletion
                        setShowDeleteConfirm(false);
                        confirmDeletePlan();
                      }
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete Plan"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Tag className="mr-2 h-5 w-5" />
              Plan Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Goal</h3>
                <Badge variant="outline" className="mt-1">
                  {plan.preferences.goal}
                </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Fitness Level</h3>
                <p>{plan.preferences.fitnessLevel}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Created</h3>
                <p>{format(new Date(plan.createdAt), 'MMM d, yyyy')}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <Badge variant={plan.isActive ? "default" : "secondary"} className="mt-1">
                  {plan.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <User className="mr-2 h-5 w-5" />
              Client Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Weight</h3>
                <p>{plan.preferences.currentWeight} {plan.preferences.unit}</p>
                {plan.preferences.targetWeight && (
                  <div className="mt-1">
                    <span className="text-xs text-muted-foreground">Target: </span>
                    <span className="text-sm">{plan.preferences.targetWeight} {plan.preferences.unit}</span>
                  </div>
                )}
              </div>
              
              {plan.preferences.age && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Age</h3>
                  <p>{plan.preferences.age} years</p>
                </div>
              )}
              
              {plan.preferences.height && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Height</h3>
                  <p>{plan.preferences.height} cm</p>
                </div>
              )}
              
              {plan.preferences.gender && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Gender</h3>
                  <p>{plan.preferences.gender}</p>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Workout Frequency</h3>
                <p>{plan.preferences.workoutDaysPerWeek} days per week</p>
              </div>
              
              {plan.preferences.budget && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Budget</h3>
                  <p>{typeof plan.preferences.budget === 'number' ? `£${plan.preferences.budget}` : plan.preferences.budget}</p>
                </div>
              )}
              
              {plan.preferences.dietaryRestrictions && plan.preferences.dietaryRestrictions.length > 0 && (
                <div className="sm:col-span-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Dietary Restrictions</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {plan.preferences.dietaryRestrictions.map((restriction: string, i: number) => (
                      <Badge variant="outline" key={i}>{restriction}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="workouts">Workout Plan</TabsTrigger>
          <TabsTrigger value="meals">Meal Plan</TabsTrigger>
        </TabsList>
        
        <TabsContent value="workouts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Dumbbell className="mr-2 h-5 w-5" />
                Weekly Workout Schedule
              </CardTitle>
              <CardDescription>
                View and manage the client's weekly workout schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Message for completely empty workout plan (no days scheduled) */}
              {Object.keys(plan.workoutPlan?.weeklySchedule || {}).length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg text-center">
                  <Dumbbell className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">No workouts scheduled</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This fitness plan doesn't have any scheduled workouts yet
                  </p>
                  <Button 
                    onClick={() => navigate(`/enhanced-trainer-plan-creation?clientId=${clientId}&planId=${planId}&edit=true`)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Workouts
                  </Button>
                </div>
              )}
              
              {/* Only show day cards if we have at least one workout day scheduled */}
              {Object.keys(plan.workoutPlan?.weeklySchedule || {}).length > 0 && (
                <div className="space-y-6">
                  {days.map((day) => {
                    const workout = plan.workoutPlan?.weeklySchedule?.[day];
                    if (!workout) {
                      return (
                        <Card key={day} className="border-dashed">
                          <CardHeader className="py-3">
                            <CardTitle className="text-base capitalize">{day}</CardTitle>
                            <CardDescription>No workout scheduled</CardDescription>
                          </CardHeader>
                        </Card>
                      );
                    }
                  
                    return (
                      <Card key={day}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-base capitalize flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span>{day}</span>
                            <Badge variant="outline">{workout.name}</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-0">
                          <div className="divide-y">
                            {workout.exercises.map((exercise: any, index: number) => (
                              <div key={index} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                <div>
                                  <p className="font-medium">{exercise.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {exercise.sets} sets × {exercise.reps} reps
                                    {exercise.weight ? ` @ ${exercise.weight}kg` : ''}
                                  </p>
                                </div>
                                <span className="text-sm text-muted-foreground mt-1 sm:mt-0">
                                  {exercise.rest}s rest
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trainer Notes</CardTitle>
                  <CardDescription>
                    Add your notes about this workout plan for the client
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="workoutNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter your notes about the workout plan here..." 
                            className="min-h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateNotesMutation.isPending}
                  >
                    {updateNotesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Notes
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="meals" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                Weekly Meal Plan
              </CardTitle>
              <CardDescription>
                View and manage the client's weekly meal plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Message for completely empty meal plan (no days scheduled) */}
              {Object.keys(plan.mealPlan?.weeklyMeals || {}).length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-lg text-center">
                  <Utensils className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-1">No meals scheduled</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    This fitness plan doesn't have any scheduled meals yet
                  </p>
                  <Button 
                    onClick={() => navigate(`/enhanced-trainer-plan-creation?clientId=${clientId}&planId=${planId}&edit=true&tab=meals`)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Meal Plan
                  </Button>
                </div>
              )}
              
              {/* Only show day cards if we have at least one meal day scheduled */}
              {Object.keys(plan.mealPlan?.weeklyMeals || {}).length > 0 && (
                <div className="space-y-6">
                  {days.map((day) => {
                    const meals = plan.mealPlan?.weeklyMeals?.[day];
                    
                    if (!meals) {
                      return (
                        <Card key={day} className="border-dashed">
                          <CardHeader className="py-3">
                            <CardTitle className="text-base capitalize">{day}</CardTitle>
                            <CardDescription>No meals scheduled</CardDescription>
                          </CardHeader>
                        </Card>
                      );
                    }
                  
                    // Calculate daily totals
                    const dailyCalories = meals.breakfast.calories + meals.lunch.calories + meals.dinner.calories + 
                      meals.snacks.reduce((total: number, snack: any) => total + snack.calories, 0);
                    
                    const dailyProtein = meals.breakfast.protein + meals.lunch.protein + meals.dinner.protein + 
                      meals.snacks.reduce((total: number, snack: any) => total + snack.protein, 0);
                    
                    const dailyCarbs = meals.breakfast.carbs + meals.lunch.carbs + meals.dinner.carbs + 
                      meals.snacks.reduce((total: number, snack: any) => total + snack.carbs, 0);
                    
                    const dailyFat = meals.breakfast.fat + meals.lunch.fat + meals.dinner.fat + 
                      meals.snacks.reduce((total: number, snack: any) => total + snack.fat, 0);
                    
                    return (
                      <Card key={day}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-base capitalize flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <span>{day}</span>
                            <div className="flex flex-wrap items-center text-sm gap-2">
                              <Badge variant="outline">{dailyCalories} kcal</Badge>
                              <Badge variant="outline">{dailyProtein}g protein</Badge>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-0">
                          <div className="divide-y">
                            <div className="py-3">
                              <h3 className="font-medium mb-1">Breakfast</h3>
                              <p>{meals.breakfast.name}</p>
                              <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2">
                                <span>{meals.breakfast.calories} kcal</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{meals.breakfast.protein}g protein</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{meals.breakfast.carbs}g carbs</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{meals.breakfast.fat}g fat</span>
                              </div>
                            </div>
                            
                            <div className="py-3">
                              <h3 className="font-medium mb-1">Lunch</h3>
                              <p>{meals.lunch.name}</p>
                              <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2">
                                <span>{meals.lunch.calories} kcal</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{meals.lunch.protein}g protein</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{meals.lunch.carbs}g carbs</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{meals.lunch.fat}g fat</span>
                              </div>
                            </div>
                            
                            <div className="py-3">
                              <h3 className="font-medium mb-1">Dinner</h3>
                              <p>{meals.dinner.name}</p>
                              <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-2">
                                <span>{meals.dinner.calories} kcal</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{meals.dinner.protein}g protein</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{meals.dinner.carbs}g carbs</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{meals.dinner.fat}g fat</span>
                              </div>
                            </div>
                            
                            {meals.snacks.length > 0 && (
                              <div className="py-3">
                                <h3 className="font-medium mb-1">Snacks</h3>
                                {meals.snacks.map((snack: any, index: number) => (
                                  <div key={index} className="mt-2 first:mt-0">
                                    <p>{snack.name}</p>
                                    <div className="text-sm text-muted-foreground mt-0.5 flex flex-wrap gap-2">
                                      <span>{snack.calories} kcal</span>
                                      <span className="hidden sm:inline">•</span>
                                      <span>{snack.protein}g protein</span>
                                      <span className="hidden sm:inline">•</span>
                                      <span>{snack.carbs}g carbs</span>
                                      <span className="hidden sm:inline">•</span>
                                      <span>{snack.fat}g fat</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trainer Notes</CardTitle>
                  <CardDescription>
                    Add your notes about this meal plan for the client
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="mealNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter your notes about the meal plan here..." 
                            className="min-h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button 
                    type="submit" 
                    disabled={updateNotesMutation.isPending}
                  >
                    {updateNotesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Notes
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </TabsContent>
      </Tabs>
    </div>
  );
}