import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, ClipboardList, FileText, Search, Info, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ClientPlan {
  id: number;
  clientId: number;
  client: {
    id: number;
    username: string;
    email: string;
  };
  fitnessPlan: {
    id: number;
    name: string;
    goal: string;
    durationWeeks: number;
    createdAt: string;
  };
}

export default function TrainerClientPlans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Redirect if not trainer
  useEffect(() => {
    if (user && !user.isTrainer && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Fetch all client plans for the trainer
  const { data: clientPlans, isLoading } = useQuery({
    queryKey: ['/api/trainer/client-plans'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/trainer/client-plans');
        if (!res.ok) throw new Error('Failed to fetch client plans');
        return await res.json();
      } catch (error) {
        console.error('Error fetching client plans:', error);
        toast({
          title: 'Error',
          description: 'Failed to load client plans. Please try again.',
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!(user?.isTrainer || user?.isAdmin)
  });
  
  // Filter plans based on search query
  const filteredPlans = clientPlans?.filter((plan: ClientPlan) => {
    const query = searchQuery.toLowerCase();
    return (
      plan.client.username.toLowerCase().includes(query) ||
      plan.client.email.toLowerCase().includes(query) ||
      plan.fitnessPlan.name.toLowerCase().includes(query) ||
      plan.fitnessPlan.goal.toLowerCase().includes(query)
    );
  });
  
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
  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
        Client Fitness Plans
      </h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <ClipboardList className="mr-2 h-5 w-5" />
            All Client Plans
          </CardTitle>
          <CardDescription>
            View and manage fitness plans for all your clients
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search by client name, email, or plan details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Goal</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans && filteredPlans.length > 0 ? (
                  filteredPlans.map((plan: ClientPlan) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        {plan.client.username}
                      </TableCell>
                      <TableCell>
                        {plan.fitnessPlan.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {plan.fitnessPlan.goal}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {plan.fitnessPlan.durationWeeks} weeks
                      </TableCell>
                      <TableCell>
                        {format(new Date(plan.fitnessPlan.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center"
                            onClick={() => navigate(`/trainer/clients/${plan.clientId}`)}
                          >
                            <Info className="mr-2 h-3 w-3" />
                            View Details
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="flex items-center"
                            onClick={() => navigate(`/trainer/clients/${plan.clientId}/plan/${plan.fitnessPlan.id}`)}
                          >
                            <FileText className="mr-2 h-3 w-3" />
                            Manage Plan
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      {searchQuery ? (
                        <div className="text-muted-foreground">
                          <p>No plans found matching "{searchQuery}"</p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          <p>No client fitness plans found</p>
                          <p className="mt-2 text-sm">
                            Go to individual client pages to create fitness plans for them.
                          </p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => navigate('/trainer')}
                          >
                            View Clients
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}