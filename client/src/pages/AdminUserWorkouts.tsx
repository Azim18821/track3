import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useParams, useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Loader2, ArrowLeft, Edit, Trash2, Dumbbell, Calendar, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Exercise {
  id: number;
  workoutId: number;
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  unit: string;
}

interface Workout {
  id: number;
  userId: number;
  name: string;
  date: string;
  notes: string | null;
  isCompleted: boolean;
  exercises: Exercise[];
}

interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
}

export default function AdminUserWorkouts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { userId } = useParams();
  const [workoutToDelete, setWorkoutToDelete] = useState<number | null>(null);
  
  // Redirect if not admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch user details
  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['/api/admin/users', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/users/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user details');
      return await res.json();
    },
    enabled: !!user?.isAdmin && !!userId
  });

  // Fetch user workouts
  const { 
    data: workouts, 
    isLoading: workoutsLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['/api/admin/users', userId, 'workouts'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/users/${userId}/workouts`);
      if (!res.ok) throw new Error('Failed to fetch user workouts');
      return await res.json();
    },
    enabled: !!user?.isAdmin && !!userId
  });

  // Delete workout mutation
  const deleteWorkoutMutation = useMutation({
    mutationFn: async (workoutId: number) => {
      const res = await apiRequest('DELETE', `/api/admin/workouts/${workoutId}`);
      if (!res.ok) throw new Error('Failed to delete workout');
      return workoutId;
    },
    onSuccess: () => {
      toast({
        title: "Workout deleted",
        description: "The workout has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', userId, 'workouts'] });
      setWorkoutToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting workout",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle workout deletion
  const handleDeleteWorkout = (workoutId: number) => {
    deleteWorkoutMutation.mutate(workoutId);
  };

  // Check if not admin
  if (!user || !user.isAdmin) {
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
  if (userLoading || workoutsLoading) {
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
            {error instanceof Error ? error.message : "An error occurred while fetching workouts"}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>
    );
  }

  const completedWorkouts = workouts?.filter((workout: Workout) => workout.isCompleted) || [];
  const pendingWorkouts = workouts?.filter((workout: Workout) => !workout.isCompleted) || [];

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          {userData?.username}'s Workouts
        </h1>
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/users')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl">
              <Dumbbell className="inline mr-2" size={20} />
              Workout Management
            </CardTitle>
            <div className="flex gap-2">
              <Badge className="bg-blue-500 hover:bg-blue-600">{workouts?.length || 0} Total</Badge>
              <Badge variant="outline" className="border-green-500 text-green-600">{completedWorkouts.length} Completed</Badge>
              <Badge variant="outline" className="border-amber-500 text-amber-600">{pendingWorkouts.length} Planned</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Workouts</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="planned">Planned</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <WorkoutTable 
                workouts={workouts || []} 
                onEdit={(id) => navigate(`/admin/workouts/${id}/edit`)}
                onDelete={(id) => setWorkoutToDelete(id)}
              />
            </TabsContent>
            
            <TabsContent value="completed">
              <WorkoutTable 
                workouts={completedWorkouts} 
                onEdit={(id) => navigate(`/admin/workouts/${id}/edit`)}
                onDelete={(id) => setWorkoutToDelete(id)}
              />
            </TabsContent>
            
            <TabsContent value="planned">
              <WorkoutTable 
                workouts={pendingWorkouts} 
                onEdit={(id) => navigate(`/admin/workouts/${id}/edit`)}
                onDelete={(id) => setWorkoutToDelete(id)}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={workoutToDelete !== null} onOpenChange={(open) => !open && setWorkoutToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workout? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={() => workoutToDelete && handleDeleteWorkout(workoutToDelete)}
              disabled={deleteWorkoutMutation.isPending}
            >
              {deleteWorkoutMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WorkoutTable({ 
  workouts, 
  onEdit, 
  onDelete 
}: { 
  workouts: Workout[]; 
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const [expandedWorkout, setExpandedWorkout] = useState<number | null>(null);

  const toggleExpand = (workoutId: number) => {
    setExpandedWorkout(expandedWorkout === workoutId ? null : workoutId);
  };

  if (workouts.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted-foreground">No workouts found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workout Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Exercises</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workouts.map((workout) => (
            <>
              <TableRow 
                key={workout.id} 
                className={`cursor-pointer ${expandedWorkout === workout.id ? 'bg-muted/50' : ''}`}
                onClick={() => toggleExpand(workout.id)}
              >
                <TableCell className="font-medium">
                  {workout.name}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Calendar className="mr-2" size={16} />
                    {format(new Date(workout.date), 'MMM d, yyyy')}
                  </div>
                </TableCell>
                <TableCell>
                  {workout.isCompleted ? (
                    <Badge className="bg-green-500 hover:bg-green-600 text-white">Completed</Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">Planned</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {workout.exercises?.length || 0} exercises
                </TableCell>
                <TableCell className="space-x-2" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEdit(workout.id)}
                  >
                    <Edit className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => onDelete(workout.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
              {expandedWorkout === workout.id && (
                <TableRow>
                  <TableCell colSpan={5} className="bg-muted/30 p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">Exercise Details</h4>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setExpandedWorkout(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {workout.exercises && workout.exercises.length > 0 ? (
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {workout.exercises.map((exercise) => (
                          <Card key={exercise.id} className="overflow-hidden">
                            <CardHeader className="p-4 pb-2">
                              <CardTitle className="text-md">{exercise.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                              <p className="text-sm text-muted-foreground">Sets: {exercise.sets}</p>
                              <p className="text-sm text-muted-foreground">Reps: {exercise.reps}</p>
                              {exercise.weight && (
                                <p className="text-sm text-muted-foreground">
                                  Weight: {exercise.weight} {exercise.unit}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No exercises defined for this workout</p>
                    )}
                    {workout.notes && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <h4 className="font-medium mb-2">Notes</h4>
                          <p className="text-sm text-muted-foreground">{workout.notes}</p>
                        </div>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}