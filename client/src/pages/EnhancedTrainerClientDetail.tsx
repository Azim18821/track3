import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Loader2, ArrowLeft, Save, User, Scale, CalendarRange, 
  Dumbbell, Utensils, ClipboardList, Send, UserMinus, AlertTriangle,
  PenSquare, CheckSquare, Plus, ListPlus, MessageCircle, ChevronRight,
  BarChart, Activity, Calendar, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const clientNotesSchema = z.object({
  notes: z.string().optional(),
});

type ClientNotesFormValues = z.infer<typeof clientNotesSchema>;

// Quick Message Form Schema
const quickMessageSchema = z.object({
  message: z.string().min(1, "Please enter a message"),
});

type QuickMessageFormValues = z.infer<typeof quickMessageSchema>;

export default function EnhancedTrainerClientDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const params = useParams();
  const clientId = params?.clientId;
  const queryClient = useQueryClient();
  
  // State for UI
  const [activeTab, setActiveTab] = useState("overview");
  const [showQuickMessageDialog, setShowQuickMessageDialog] = useState(false);
  const [confirmEndRelationship, setConfirmEndRelationship] = useState(false);
  
  // Log params to debug routing issues
  useEffect(() => {
    console.log("EnhancedTrainerClientDetail params:", { clientId, rawParams: params });
  }, [clientId, params]);
  
  // Set active tab based on current URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('/workouts')) {
      setActiveTab('workout');
    } else if (path.includes('/nutrition-goals')) {
      setActiveTab('nutrition');
    } else if (path.includes('/messages')) {
      setActiveTab('messages');
    } else {
      setActiveTab('overview');
    }
  }, []);

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
    error,
    refetch: refetchClientData
  } = useQuery({
    queryKey: ['/api/trainer/clients', clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/clients/${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch client details');
      return await res.json();
    },
    enabled: !!(user?.isTrainer || user?.isAdmin) && !!clientId
  });

  // Client messages  
  const { 
    data: messages = [], 
    isLoading: messagesLoading,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['/api/trainer/messages', clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/trainer/messages/${clientId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return await res.json();
    },
    enabled: !!(user?.isTrainer || user?.isAdmin) && !!clientId
  });

  // Form setup for client notes
  const notesForm = useForm<ClientNotesFormValues>({
    resolver: zodResolver(clientNotesSchema),
    defaultValues: {
      notes: "",
    },
  });
  
  // Quick message form
  const quickMessageForm = useForm<QuickMessageFormValues>({
    resolver: zodResolver(quickMessageSchema),
    defaultValues: {
      message: "",
    },
  });
  
  // Update form with client data
  useEffect(() => {
    if (clientData?.relationship) {
      notesForm.reset({
        notes: clientData.relationship.notes,
      });
    }
  }, [clientData, notesForm]);

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
  
  // Send quick message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: QuickMessageFormValues) => {
      const payload = {
        trainerId: user?.id,
        clientId: Number(clientId),
        content: data.message
      };

      const res = await apiRequest('POST', `/api/messages`, payload);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to send message');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent to the client.",
      });
      quickMessageForm.reset({ message: '' });
      setShowQuickMessageDialog(false);
      refetchMessages();
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // End client relationship mutation
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
        description: "You are no longer the trainer for this client. Any active fitness plan for this client has been deactivated.",
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

  // Handle notes form submission
  const onSubmitNotes = (data: ClientNotesFormValues) => {
    updateNotesMutation.mutate(data);
  };
  
  // Handle quick message submission
  const onSubmitQuickMessage = (data: QuickMessageFormValues) => {
    sendMessageMutation.mutate(data);
  };

  // Helper to navigate to assign workout page
  const handleAddWorkout = (date: string) => {
    navigate(`/trainer/clients/${clientId}/workouts`);
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
    <div className="container px-2 sm:px-4 py-3 sm:py-4 max-w-full md:max-w-3xl lg:max-w-5xl">
      {/* Header section with client info and actions */}
      <div className="flex flex-col md:flex-row justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 sm:mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/trainer')}
              className="text-muted-foreground hover:text-primary p-1 sm:p-2 h-8"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span>Back</span>
            </Button>
            
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-indigo-400">
              {clientData?.client?.username}
            </h1>
          </div>
          
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-1 sm:mt-2">
            {clientData?.latestWeight && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs h-5 sm:h-6">
                <Scale className="h-3 w-3" />
                {clientData.latestWeight.weight} {clientData.latestWeight.unit}
              </Badge>
            )}
            
            {clientData?.client?.fitnessGoal && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs h-5 sm:h-6">
                <Activity className="h-3 w-3" />
                {clientData.client.fitnessGoal}
              </Badge>
            )}
            
            {clientData?.client?.fitnessLevel && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs h-5 sm:h-6">
                <BarChart className="h-3 w-3" />
                {clientData.client.fitnessLevel}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-1 sm:mt-0">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="flex-1 md:flex-auto h-8 sm:h-9 px-2 sm:px-3"
              >
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                Add
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="flex flex-col">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start px-3 sm:px-4 py-2 h-auto text-sm"
                  onClick={() => navigate(`/trainer/clients/${clientId}/workouts`)}
                >
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Add Workout
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start px-3 sm:px-4 py-2 h-auto text-sm"
                  onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals`)}
                >
                  <Utensils className="mr-2 h-4 w-4" />
                  Set Nutrition Goals
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start px-3 sm:px-4 py-2 h-auto text-sm"
                  onClick={() => navigate(`/enhanced-trainer-plan-creation?clientId=${clientId}`)}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Create Fitness Plan
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start px-3 sm:px-4 py-2 h-auto text-sm"
                  onClick={() => setShowQuickMessageDialog(true)}
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Dialog open={confirmEndRelationship} onOpenChange={setConfirmEndRelationship}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="text-red-600 border-red-200 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950 dark:border-red-800 flex-1 md:flex-auto h-8 sm:h-9 px-2 sm:px-3"
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
                  <li>The client's active fitness plan will be deactivated</li>
                  <li>Other workout history and records will remain in their account</li>
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
        </div>
      </div>
      
      {/* Quick message dialog */}
      <Dialog open={showQuickMessageDialog} onOpenChange={setShowQuickMessageDialog}>
        <DialogContent className="w-[90vw] max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a quick message to {clientData?.client?.username}
            </DialogDescription>
          </DialogHeader>
          <Form {...quickMessageForm}>
            <form onSubmit={quickMessageForm.handleSubmit(onSubmitQuickMessage)} className="space-y-4">
              <FormField
                control={quickMessageForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Type your message here..." 
                        {...field} 
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowQuickMessageDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={sendMessageMutation.isPending}
                >
                  {sendMessageMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Main content */}
      <Tabs 
        defaultValue="overview" 
        className="mt-3 sm:mt-4"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-5 mb-3 sm:mb-4 h-10 overflow-x-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-1 sm:px-2 py-1.5">Overview</TabsTrigger>
          <TabsTrigger value="workout" onClick={() => navigate(`/trainer/clients/${clientId}/workouts`)} className="text-xs sm:text-sm px-0 sm:px-2 py-1.5">
            <Dumbbell className="h-3.5 w-3.5 mr-1 sm:hidden" />
            <span className="hidden sm:inline">Workout</span>
            <span className="sm:hidden">Work</span>
          </TabsTrigger>
          <TabsTrigger value="nutrition" onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals`)} className="text-xs sm:text-sm px-0 sm:px-2 py-1.5">
            <Utensils className="h-3.5 w-3.5 mr-1 sm:hidden" />
            <span className="hidden sm:inline">Nutrition</span>
            <span className="sm:hidden">Nutri</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="text-xs sm:text-sm px-0 sm:px-2 py-1.5">
            <MessageCircle className="h-3.5 w-3.5 mr-1 sm:hidden" />
            <span className="hidden sm:inline">Messages</span>
            <span className="sm:hidden">Msgs</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs sm:text-sm px-0 sm:px-2 py-1.5">
            <ClipboardList className="h-3.5 w-3.5 mr-1 sm:hidden" />
            <span className="hidden sm:inline">Notes</span>
            <span className="sm:hidden">Notes</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Stats Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Client Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm font-medium">{clientData?.client?.email}</span>
                </div>
                
                {clientData?.client?.age && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Age:</span>
                    <span className="text-sm font-medium">{clientData.client.age} years</span>
                  </div>
                )}
                
                {clientData?.client?.gender && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Gender:</span>
                    <span className="text-sm font-medium">{clientData.client.gender}</span>
                  </div>
                )}
                
                {clientData?.client?.height && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Height:</span>
                    <span className="text-sm font-medium">
                      {clientData.client.height} {clientData.client.heightUnit || 'cm'}
                    </span>
                  </div>
                )}
                
                {clientData?.client?.activityLevel && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Activity Level:</span>
                    <span className="text-sm font-medium">
                      {clientData.client.activityLevel.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setActiveTab("notes")}
                >
                  View Notes
                </Button>
              </CardFooter>
            </Card>
            
            {/* Fitness Goals Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Activity className="mr-2 h-4 w-4" />
                  Fitness Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3 space-y-2">
                {clientData?.client?.fitnessGoal && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Goal:</span>
                    <span className="text-sm font-medium">{clientData.client.fitnessGoal}</span>
                  </div>
                )}
                
                {clientData?.client?.fitnessLevel && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Fitness Level:</span>
                    <span className="text-sm font-medium">{clientData.client.fitnessLevel}</span>
                  </div>
                )}
                
                {clientData?.client?.workoutDaysPerWeek && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Workout Days:</span>
                    <span className="text-sm font-medium">{clientData.client.workoutDaysPerWeek} days/week</span>
                  </div>
                )}
                
                {clientData?.client?.workoutDuration && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Workout Duration:</span>
                    <span className="text-sm font-medium">{clientData.client.workoutDuration} min</span>
                  </div>
                )}
                
                {clientData?.client?.targetWeight && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Target Weight:</span>
                    <span className="text-sm font-medium">
                      {clientData.client.targetWeight} {clientData.client.weightUnit || 'kg'}
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => navigate(`/enhanced-trainer-plan-creation?clientId=${clientId}`)}
                >
                  Create Fitness Plan
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Nutrition Goals Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Utensils className="mr-2 h-4 w-4" />
                Nutrition Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientData?.nutritionGoal ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-2 sm:p-4 text-center h-20 sm:h-auto flex flex-col justify-between">
                    <p className="text-xs text-muted-foreground">Calories</p>
                    <p className="text-base sm:text-lg font-semibold">{clientData.nutritionGoal.caloriesPerDay}</p>
                    <p className="text-xs text-muted-foreground">kcal/day</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-2 sm:p-4 text-center h-20 sm:h-auto flex flex-col justify-between">
                    <p className="text-xs text-muted-foreground">Protein</p>
                    <p className="text-base sm:text-lg font-semibold">{clientData.nutritionGoal.proteinPerDay}</p>
                    <p className="text-xs text-muted-foreground">g/day</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-2 sm:p-4 text-center h-20 sm:h-auto flex flex-col justify-between">
                    <p className="text-xs text-muted-foreground">Carbs</p>
                    <p className="text-base sm:text-lg font-semibold">{clientData.nutritionGoal.carbsPerDay}</p>
                    <p className="text-xs text-muted-foreground">g/day</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-2 sm:p-4 text-center h-20 sm:h-auto flex flex-col justify-between">
                    <p className="text-xs text-muted-foreground">Fat</p>
                    <p className="text-base sm:text-lg font-semibold">{clientData.nutritionGoal.fatPerDay}</p>
                    <p className="text-xs text-muted-foreground">g/day</p>
                  </div>
                </div>
              ) : (
                <div className="h-[100px] flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-sm mb-2">No nutrition goals set</p>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals`)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Set Nutrition Goals
                  </Button>
                </div>
              )}
            </CardContent>
            {clientData?.nutritionGoal && (
              <CardFooter className="pt-0 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals`)}
                >
                  Update Goals
                </Button>
              </CardFooter>
            )}
          </Card>
          
          {/* Active Fitness Plan Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <ClipboardList className="mr-2 h-4 w-4" />
                Active Fitness Plan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientData?.fitnessPlan ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">
                      {clientData.fitnessPlan.preferences?.name || "Untitled Plan"}
                    </span>
                    <Badge>Active</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Goal:</span>
                      <span className="text-xs">{clientData.fitnessPlan.preferences?.goal || "Not specified"}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Duration:</span>
                      <span className="text-xs">{clientData.fitnessPlan.preferences?.durationWeeks || "4"} weeks</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Workouts:</span>
                      <span className="text-xs">{Object.keys(clientData.fitnessPlan.workoutPlan.weeklySchedule || {}).length || 0} days/week</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Level:</span>
                      <span className="text-xs">{clientData.fitnessPlan.preferences?.fitnessLevel || "Beginner"}</span>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="flex flex-col space-y-1 sm:space-y-2">
                    <h4 className="text-xs font-medium">Weekly Schedule:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
                      {Object.entries(clientData.fitnessPlan.workoutPlan.weeklySchedule || {}).map(([day, workout]: [string, any]) => (
                        <div key={day} className="bg-muted/30 rounded-lg p-1.5 sm:p-2 h-12 sm:h-auto flex flex-col justify-between">
                          <p className="text-xs font-medium capitalize">{day}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {workout.name || `${day.charAt(0).toUpperCase() + day.slice(1)} Workout`}
                          </p>
                          <p className="text-[9px] text-muted-foreground/80 mt-0.5">
                            {workout.exercises?.length || 0} exercises
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-sm mb-2">No active fitness plan</p>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/enhanced-trainer-plan-creation?clientId=${clientId}`)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Plan
                  </Button>
                </div>
              )}
            </CardContent>
            {clientData?.fitnessPlan && (
              <CardFooter className="pt-0 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => navigate(`/trainer/clients/${clientId}/plans/${clientData.fitnessPlan.id}`)}
                >
                  View Plan Details
                </Button>
              </CardFooter>
            )}
          </Card>
          
          {/* Recent Workouts Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Dumbbell className="mr-2 h-4 w-4" />
                Recent Workouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientData?.workouts && clientData.workouts.length > 0 ? (
                <div className="space-y-3">
                  {clientData.workouts
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 3)
                    .map((workout: any) => (
                      <div 
                        key={workout.id} 
                        className={`p-3 rounded-lg border ${workout.completed ? 
                          'bg-green-50 border-green-100 dark:bg-green-950/20 dark:border-green-900' : 
                          'bg-muted/30 border-muted'}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">{workout.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(workout.date), 'MMM d, yyyy')} · {workout.duration} min
                            </p>
                            <div className="flex items-center mt-1">
                              <Dumbbell className="h-3 w-3 mr-1 text-muted-foreground" /> 
                              <span className="text-xs text-muted-foreground">
                                {workout.exercises?.length || 0} exercises
                              </span>
                            </div>
                          </div>
                          <div>
                            {workout.completed ? (
                              <Badge className="bg-green-500 text-white flex items-center gap-1">
                                <CheckSquare className="h-3 w-3" /> Completed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Scheduled
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-sm mb-2">No workouts recorded</p>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/trainer/clients/${clientId}/workouts`)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workout
                  </Button>
                </div>
              )}
            </CardContent>
            {clientData?.workouts && clientData.workouts.length > 0 && (
              <CardFooter className="pt-0 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => setActiveTab("workout")}
                >
                  View All Workouts
                </Button>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        {/* Workout Tab */}
        <TabsContent value="workout" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <Dumbbell className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                Workout History
              </CardTitle>
              <CardDescription className="text-xs">
                Review your client's past workouts and progress
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {clientData?.workouts && clientData.workouts.length > 0 ? (
                <WeeklyWorkoutView 
                  workouts={clientData.workouts} 
                  onViewWorkout={(workout) => {
                    window.alert(`Viewing workout detail is coming soon! Workout ID: ${workout.id}`);
                  }}
                  onAddWorkout={handleAddWorkout}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No workouts found</p>
                  <p className="text-xs mt-1">Your client hasn't logged any workouts yet.</p>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate(`/trainer/clients/${clientId}/workouts`)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Workout
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Nutrition Tab */}
        <TabsContent value="nutrition" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <Utensils className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                Nutrition Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {clientData?.nutritionGoal ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground">Calories</p>
                      <p className="text-lg font-semibold">{clientData.nutritionGoal.caloriesPerDay}</p>
                      <p className="text-xs text-muted-foreground">kcal/day</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground">Protein</p>
                      <p className="text-lg font-semibold">{clientData.nutritionGoal.proteinPerDay}</p>
                      <p className="text-xs text-muted-foreground">g/day</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground">Carbs</p>
                      <p className="text-lg font-semibold">{clientData.nutritionGoal.carbsPerDay}</p>
                      <p className="text-xs text-muted-foreground">g/day</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground">Fat</p>
                      <p className="text-lg font-semibold">{clientData.nutritionGoal.fatPerDay}</p>
                      <p className="text-xs text-muted-foreground">g/day</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-center">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals`)}
                    >
                      <PenSquare className="mr-2 h-4 w-4" />
                      Edit Nutrition Goals
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-muted-foreground">
                  <p className="text-sm mb-2">No nutrition goals set</p>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals`)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Set Nutrition Goals
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <CalendarRange className="mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
                Nutrition Tracking
              </CardTitle>
              <CardDescription className="text-xs">
                Review your client's nutrition logs
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {/* Debug information */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-muted-foreground mb-4 p-2 bg-slate-100 rounded overflow-auto max-h-24">
                  <p>Debug - Meals: {clientData?.meals ? `${clientData.meals.length} found` : 'none'}</p>
                  <p>Debug - Nutrition Goal: {clientData?.nutritionGoal ? 'exists' : 'missing'}</p>
                  {clientData?.nutritionGoal && (
                    <p>Goal values: {JSON.stringify(clientData.nutritionGoal)}</p>
                  )}
                </div>
              )}
              
              {/* Always render WeeklyNutritionView with fallback values for empty states */}
              <WeeklyNutritionView 
                meals={clientData?.meals || []} 
                nutritionGoals={{
                  calories: clientData?.nutritionGoal?.caloriesTarget || 2000,
                  protein: clientData?.nutritionGoal?.proteinTarget || 150,
                  carbs: clientData?.nutritionGoal?.carbsTarget || 200,
                  fat: clientData?.nutritionGoal?.fatTarget || 70
                }}
                onViewDay={(date) => {
                  window.alert(`Viewing detailed nutrition for ${date} coming soon!`);
                }}
              />

              {/* Show message if no nutrition data or goals */}
              {(!clientData?.meals || (clientData?.meals && clientData.meals.length === 0) || !clientData?.nutritionGoal) && (
                <div className="text-center py-6 mt-6 mx-auto max-w-md border border-dashed border-gray-200 rounded-lg p-6 bg-gray-50/50">
                  <div className="flex flex-col items-center">
                    <div className="p-3 bg-primary/10 rounded-full mb-4">
                      {!clientData?.nutritionGoal ? (
                        <Settings className="h-6 w-6 text-primary" />
                      ) : (
                        <Utensils className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <h3 className="font-medium text-base">No nutrition data found</h3>
                    <p className="text-sm mt-1 text-muted-foreground">
                      {clientData?.nutritionGoal 
                        ? "Your client hasn't logged any meals yet." 
                        : "Set nutrition goals for your client first."}
                    </p>
                    {!clientData?.nutritionGoal && (
                      <Button 
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => navigate(`/trainer/clients/${clientId}/nutrition-goals`)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Set Nutrition Goals
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center text-lg">
                  <MessageCircle className="mr-2 h-4 w-4 text-purple-600 dark:text-purple-400" />
                  Messages
                </CardTitle>
                <CardDescription className="text-xs">
                  Your conversation with {clientData?.client?.username}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setShowQuickMessageDialog(true)}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              {messagesLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length > 0 ? (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {messages.map((message: any) => {
                      const isFromTrainer = message.senderId === user?.id;
                      return (
                        <div 
                          key={message.id} 
                          className={`flex ${isFromTrainer ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex ${isFromTrainer ? 'flex-row-reverse' : 'flex-row'} gap-2 items-start max-w-[80%]`}>
                            <Avatar className="h-8 w-8">
                              <AvatarImage src="" />
                              <AvatarFallback className={isFromTrainer ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}>
                                {isFromTrainer ? 'T' : 'C'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div 
                                className={`p-3 rounded-lg ${
                                  isFromTrainer 
                                    ? 'bg-blue-500 text-white dark:bg-blue-600 rounded-tr-none' 
                                    : 'bg-muted rounded-tl-none'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                              </div>
                              <p className={`text-[10px] text-muted-foreground mt-1 ${isFromTrainer ? 'text-right' : 'text-left'}`}>
                                {format(new Date(message.sentAt), 'MMM d, h:mm a')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Start a conversation with your client</p>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowQuickMessageDialog(true)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send First Message
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-lg">
                <ClipboardList className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                Client Notes
              </CardTitle>
              <CardDescription className="text-xs">
                Keep private notes about your client's progress and goals
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <Form {...notesForm}>
                <form onSubmit={notesForm.handleSubmit(onSubmitNotes)} className="space-y-4">
                  <FormField
                    control={notesForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter notes about your client here..." 
                            className="min-h-[200px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          These notes are only visible to you and not to your client.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={updateNotesMutation.isPending}
                  >
                    {updateNotesMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Notes
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}