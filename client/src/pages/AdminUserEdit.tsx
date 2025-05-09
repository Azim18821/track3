import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useParams, useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Loader2, ArrowLeft, Save, User, Mail, Shield, Dumbbell, 
  UserX, Link, Link2Off, Calendar, Users, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { format } from 'date-fns';
import { Switch } from "@/components/ui/switch";
import { 
  Table, TableBody, TableCell, 
  TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Tabs, TabsContent, TabsList, TabsTrigger 
} from "@/components/ui/tabs";

const userFormSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  isAdmin: z.boolean().default(false),
  isTrainer: z.boolean().default(false),
});

type UserFormValues = z.infer<typeof userFormSchema>;

interface TrainerClient {
  id: number;
  trainerId: number;
  clientId: number;
  assignedAt: string;
  notes?: string;
  trainer?: {
    id: number;
    username: string;
    email: string;
  };
  client?: {
    id: number;
    username: string;
    email: string;
  };
}

export default function AdminUserEdit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { userId } = useParams();
  const [selectedTab, setSelectedTab] = useState<'info' | 'relationships'>('info');
  
  // Redirect if not admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch user details
  const { 
    data: userData, 
    isLoading: userLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['/api/admin/users', userId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/users/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch user details');
      return await res.json();
    },
    enabled: !!user?.isAdmin && !!userId
  });
  
  // Fetch trainer relationships where user is a trainer
  const { 
    data: trainerRelationships,
    isLoading: trainerRelationshipsLoading,
  } = useQuery({
    queryKey: ['/api/admin/trainer-relationships', userId, 'trainer'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/trainers/${userId}/clients`);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch trainer relationships');
      }
      return await res.json();
    },
    enabled: !!user?.isAdmin && !!userId && !!userData?.isTrainer
  });

  // Fetch trainer relationships where user is a client
  const { 
    data: clientRelationships,
    isLoading: clientRelationshipsLoading,
  } = useQuery({
    queryKey: ['/api/admin/trainer-relationships', userId, 'client'],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/admin/clients/${userId}/trainers`);
      if (!res.ok) {
        if (res.status === 404) return [];
        throw new Error('Failed to fetch client relationships');
      }
      return await res.json();
    },
    enabled: !!user?.isAdmin && !!userId
  });

  // Form setup
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      isAdmin: false,
      isTrainer: false,
    },
  });
  
  // Update form with user data
  useEffect(() => {
    if (userData) {
      form.reset({
        username: userData.username,
        email: userData.email,
        isAdmin: userData.isAdmin,
        isTrainer: userData.isTrainer || false,
      });
    }
  }, [userData, form]);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const res = await apiRequest('PUT', `/api/admin/users/${userId}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update user');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "The user has been updated successfully.",
      });
      // Invalidate user data cache
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      
      // Navigate back
      navigate('/admin/users');
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Remove trainer-client relationship mutation
  const removeRelationshipMutation = useMutation({
    mutationFn: async (relationshipId: number) => {
      const res = await apiRequest('DELETE', `/api/trainer/clients/${relationshipId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to remove trainer-client relationship');
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Relationship removed",
        description: "The trainer-client relationship has been removed successfully.",
      });
      // Invalidate relationships cache
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-relationships', userId, 'trainer'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/trainer-relationships', userId, 'client'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error removing relationship",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle relationship removal
  const handleRemoveRelationship = (relationshipId: number) => {
    if (window.confirm("Are you sure you want to remove this trainer-client relationship? This action cannot be undone.")) {
      removeRelationshipMutation.mutate(relationshipId);
    }
  };

  // Handle form submission
  const onSubmit = (data: UserFormValues) => {
    updateUserMutation.mutate(data);
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
  if (userLoading) {
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
            {error instanceof Error ? error.message : "An error occurred while fetching user"}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Edit User
        </h1>
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/users')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            {userData?.username}'s Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input className="pl-9" placeholder="Username" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      The user's login name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input className="pl-9" placeholder="Email address" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>
                      The user's email address
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isAdmin"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin privileges
                      </FormLabel>
                      <FormDescription>
                        Grant this user administrator access to the application
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isTrainer"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center">
                        <Dumbbell className="mr-2 h-4 w-4" />
                        Personal Trainer
                      </FormLabel>
                      <FormDescription>
                        Designate this user as a personal trainer who can manage assigned clients
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/users')}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                >
                  {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}