import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, Edit, Copy, Users, Calendar, Trash2, 
  ArchiveIcon, DumbbellIcon, UtensilsIcon, LayoutTemplate, 
  AlertCircle, AlertTriangle, Loader2, Check, UserCheck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PlanTemplate {
  id: number;
  trainerId: number;
  name: string;
  description: string | null;
  type: 'fitness' | 'nutrition' | 'combined';
  category: string;
  workoutPlan?: any;
  mealPlan?: any;
  targetFitnessLevel?: string | null;
  targetBodyType?: string | null;
  tags: string[];
  duration?: number | null;
  createdAt: string;
  updatedAt: string;
  notes: string | null;
  isArchived: boolean;
}

interface Client {
  id: number;
  username: string;
  email: string;
}

interface ClientData {
  client: Client;
  relationship: {
    id: number;
    trainerId: number;
    clientId: number;
    startedAt: string;
    status: string;
  };
}

export default function ViewPlanTemplate() {
  const { id } = useParams<{ id: string }>();
  const templateId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClient, setSelectedClient] = useState<string | undefined>(undefined);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Redirect if not a trainer
  useEffect(() => {
    if (user && !user.isTrainer) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch template data
  const { data: template, isLoading, error } = useQuery<PlanTemplate>({
    queryKey: ['/api/trainer/plan-templates', templateId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/trainer/plan-templates/${templateId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch template data');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching template:', error);
        throw error;
      }
    },
    enabled: !!templateId && !!user?.isTrainer,
  });

  // Fetch trainer's clients for assignment
  const { data: clients } = useQuery<ClientData[]>({
    queryKey: ['/api/trainer/clients'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/trainer/clients');
        if (!res.ok) {
          throw new Error('Failed to fetch clients');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
      }
    },
    enabled: !!user?.isTrainer,
  });

  // Assign template mutation
  const assignTemplateMutation = useMutation({
    mutationFn: async (data: { clientId: number }) => {
      setIsAssigning(true);
      try {
        const response = await apiRequest(`/api/trainer/plan-templates/${templateId}/apply`, 'POST', data);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to assign template');
        }
        return await response.json();
      } finally {
        setIsAssigning(false);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Template assigned to client successfully',
      });
      setShowAssignDialog(false);
      setSelectedClient(undefined);
      
      // Invalidate client plans query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/plans'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign template to client',
        variant: 'destructive'
      });
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);
      try {
        const response = await apiRequest(`/api/trainer/plan-templates/${templateId}`, 'DELETE');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to delete template');
        }
        return await response.json();
      } finally {
        setIsDeleting(false);
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      navigate('/plan-templates');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete template',
        variant: 'destructive'
      });
      setShowDeleteDialog(false);
    }
  });

  // Archive/Unarchive template mutation
  const archiveTemplateMutation = useMutation({
    mutationFn: async (archive: boolean) => {
      setIsArchiving(true);
      try {
        const response = await apiRequest(`/api/trainer/plan-templates/${templateId}/archive`, 'PATCH', {
          archived: archive
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update template status');
        }
        return await response.json();
      } finally {
        setIsArchiving(false);
      }
    },
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: data.isArchived 
          ? 'Template archived successfully' 
          : 'Template restored successfully',
      });
      setShowArchiveDialog(false);
      
      // Invalidate template query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/plan-templates', templateId] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update template status',
        variant: 'destructive'
      });
      setShowArchiveDialog(false);
    }
  });

  // Function to get the template type icon
  const getTemplateTypeIcon = (type: string) => {
    switch (type) {
      case 'fitness':
        return <DumbbellIcon className="h-5 w-5 text-blue-500" />;
      case 'nutrition':
        return <UtensilsIcon className="h-5 w-5 text-green-500" />;
      case 'combined':
        return <LayoutTemplate className="h-5 w-5 text-purple-500" />;
      default:
        return null;
    }
  };

  // Function to get type badge color
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'fitness':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      case 'nutrition':
        return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400";
      case 'combined':
        return "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Function to get category badge color
  const getCategoryBadgeColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'weight_loss':
      case 'weight loss':
        return "bg-pink-100 text-pink-800 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-400";
      case 'muscle_gain':
      case 'muscle gain':
        return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400";
      case 'strength':
        return "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400";
      case 'endurance':
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400";
      case 'maintenance':
        return "bg-cyan-100 text-cyan-800 hover:bg-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400";
      default:
        return "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-900/30 dark:text-slate-400";
    }
  };

  // Handle assign template to client
  const handleAssignTemplate = () => {
    if (!selectedClient) {
      toast({
        title: 'Error',
        description: 'Please select a client',
        variant: 'destructive'
      });
      return;
    }

    assignTemplateMutation.mutate({ clientId: parseInt(selectedClient) });
  };

  // Handle delete template
  const handleDeleteTemplate = () => {
    deleteTemplateMutation.mutate();
  };

  // Handle archive/unarchive template
  const handleArchiveTemplate = (archive: boolean) => {
    archiveTemplateMutation.mutate(archive);
  };

  // If not a trainer, don't render anything
  if (user && !user.isTrainer) return null;

  // Loading state
  if (isLoading) {
    return (
      <div className="container px-3 py-4 md:px-6 md:py-8 mx-auto max-w-5xl">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => navigate('/plan-templates')}
            className="flex items-center text-sm text-muted-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Templates
          </Button>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 my-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !template) {
    return (
      <div className="container px-3 py-4 md:px-6 md:py-8 mx-auto max-w-5xl">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => navigate('/plan-templates')}
            className="flex items-center text-sm text-muted-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Templates
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load template data. Please try again later.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container px-3 py-4 md:px-6 md:py-8 mx-auto max-w-5xl">
      {/* Header with back button */}
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="ghost"
          size="sm"
          onClick={() => navigate('/plan-templates')}
          className="flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Templates
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/edit-plan-template/${templateId}`)}
            className="flex items-center"
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
          
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center">
                <UserCheck className="mr-1.5 h-3.5 w-3.5" />
                Assign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Template to Client</DialogTitle>
                <DialogDescription>
                  Select a client to assign this template to. This will create a new plan for the selected client.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <label className="text-sm font-medium mb-2 block">
                  Select Client
                </label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map(({ client }) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAssignDialog(false)}
                  disabled={isAssigning}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignTemplate}
                  disabled={!selectedClient || isAssigning}
                >
                  {isAssigning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Assign Template
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <span className="sr-only">Actions</span>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                  <path d="M8.625 2.5C8.625 3.12132 8.12132 3.625 7.5 3.625C6.87868 3.625 6.375 3.12132 6.375 2.5C6.375 1.87868 6.87868 1.375 7.5 1.375C8.12132 1.375 8.625 1.87868 8.625 2.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM7.5 13.625C8.12132 13.625 8.625 13.1213 8.625 12.5C8.625 11.8787 8.12132 11.375 7.5 11.375C6.87868 11.375 6.375 11.8787 6.375 12.5C6.375 13.1213 6.87868 13.625 7.5 13.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="flex items-center cursor-pointer"
                onClick={() => setShowArchiveDialog(true)}
              >
                <ArchiveIcon className="mr-2 h-4 w-4" />
                {template.isArchived ? 'Unarchive Template' : 'Archive Template'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="flex items-center cursor-pointer text-red-600"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Template header */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          {getTemplateTypeIcon(template.type)}
          <h1 className="text-2xl font-bold ml-2">{template.name}</h1>
          {template.isArchived && (
            <Badge variant="outline" className="ml-3 bg-amber-50 text-amber-700 border-amber-200">
              <ArchiveIcon className="h-3 w-3 mr-1" /> Archived
            </Badge>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 my-3">
          <Badge variant="outline" className={getTypeBadgeColor(template.type)}>
            {template.type.charAt(0).toUpperCase() + template.type.slice(1)}
          </Badge>
          
          <Badge variant="outline" className={getCategoryBadgeColor(template.category)}>
            {template.category.replace('_', ' ')}
          </Badge>
          
          {template.targetFitnessLevel && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {template.targetFitnessLevel}
            </Badge>
          )}
          
          {template.targetBodyType && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {template.targetBodyType}
            </Badge>
          )}
          
          {template.duration && (
            <Badge variant="outline">
              {template.duration} {template.duration === 1 ? 'week' : 'weeks'}
            </Badge>
          )}
        </div>
        
        <p className="text-muted-foreground">
          Created: {new Date(template.createdAt).toLocaleDateString()} 
          {template.updatedAt !== template.createdAt && 
            ` (Updated: ${new Date(template.updatedAt).toLocaleDateString()})`}
        </p>
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {(template.type === 'fitness' || template.type === 'combined') && (
            <TabsTrigger value="workouts">Workouts</TabsTrigger>
          )}
          {(template.type === 'nutrition' || template.type === 'combined') && (
            <TabsTrigger value="nutrition">Nutrition</TabsTrigger>
          )}
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">
                {template.description || "No description provided."}
              </p>
            </CardContent>
          </Card>
          
          {template.tags && template.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {template.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">
                  {template.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Workouts Tab */}
        {(template.type === 'fitness' || template.type === 'combined') && (
          <TabsContent value="workouts" className="space-y-4">
            {template.workoutPlan && 
             template.workoutPlan.weeklySchedule && 
             Object.keys(template.workoutPlan.weeklySchedule).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(template.workoutPlan.weeklySchedule).map(([day, workout]: [string, any]) => (
                  <Card key={day}>
                    <CardHeader>
                      <CardTitle className="text-lg capitalize">
                        {day}: {workout.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {workout.exercises && workout.exercises.length > 0 ? (
                        <div className="space-y-2">
                          {workout.exercises.map((exercise: any, index: number) => (
                            <div key={index} className="p-3 bg-muted/20 rounded-md">
                              <div className="font-medium">{exercise.name}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                {exercise.sets} {exercise.sets === 1 ? 'set' : 'sets'} × {exercise.reps} reps
                                {exercise.weight && ` @ ${exercise.weight}${exercise.unit || 'kg'}`}
                                {exercise.rest && ` | Rest: ${exercise.rest}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No exercises defined for this workout.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Workout Plan</CardTitle>
                  <CardDescription>
                    This template doesn't have a workout plan defined yet.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Template Incomplete</AlertTitle>
                    <AlertDescription>
                      You should edit this template to add a workout plan before assigning it to clients.
                    </AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => navigate(`/edit-plan-template/${templateId}`)}
                    className="w-full"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Template
                  </Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>
        )}
        
        {/* Nutrition Tab */}
        {(template.type === 'nutrition' || template.type === 'combined') && (
          <TabsContent value="nutrition" className="space-y-4">
            {template.mealPlan && 
             template.mealPlan.weeklyMeals && 
             Object.keys(template.mealPlan.weeklyMeals).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(template.mealPlan.weeklyMeals).map(([day, meals]: [string, any]) => (
                  <Card key={day}>
                    <CardHeader>
                      <CardTitle className="text-lg capitalize">{day}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.entries(meals)
                          .filter(([mealType, meal]: [string, any]) => mealType !== 'snacks')
                          .map(([mealType, meal]: [string, any]) => (
                            <div key={mealType} className="p-3 bg-muted/20 rounded-md">
                              <div className="font-medium capitalize">{mealType.replace('_', ' ')}</div>
                              <div className="text-sm mt-1">{meal.name}</div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {meal.calories} cals | {meal.protein}g protein | {meal.carbs}g carbs | {meal.fat}g fat
                              </div>
                              {meal.description && (
                                <div className="text-sm mt-1.5 italic">
                                  {meal.description}
                                </div>
                              )}
                            </div>
                          ))}
                          
                        {meals.snacks && meals.snacks.length > 0 && (
                          <div className="p-3 bg-muted/20 rounded-md">
                            <div className="font-medium">Snacks</div>
                            <div className="mt-2 space-y-2">
                              {meals.snacks.map((snack: any, index: number) => (
                                <div key={index} className="text-sm">
                                  <div>{snack.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {snack.calories} cals | {snack.protein}g protein | {snack.carbs}g carbs | {snack.fat}g fat
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>No Meal Plan</CardTitle>
                  <CardDescription>
                    This template doesn't have a meal plan defined yet.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Template Incomplete</AlertTitle>
                    <AlertDescription>
                      You should edit this template to add a meal plan before assigning it to clients.
                    </AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={() => navigate(`/edit-plan-template/${templateId}`)}
                    className="w-full"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Template
                  </Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Template
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {template.isArchived ? 'Restore Template' : 'Archive Template'}
            </DialogTitle>
            <DialogDescription>
              {template.isArchived
                ? 'Are you sure you want to restore this template and make it active again?'
                : 'Are you sure you want to archive this template? Archived templates can be restored later.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowArchiveDialog(false)}
              disabled={isArchiving}
            >
              Cancel
            </Button>
            <Button
              variant={template.isArchived ? "default" : "secondary"}
              onClick={() => handleArchiveTemplate(!template.isArchived)}
              disabled={isArchiving}
            >
              {isArchiving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {template.isArchived ? 'Restoring...' : 'Archiving...'}
                </>
              ) : (
                <>
                  <ArchiveIcon className="mr-2 h-4 w-4" />
                  {template.isArchived ? 'Restore Template' : 'Archive Template'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}