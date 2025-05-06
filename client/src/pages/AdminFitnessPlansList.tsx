import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Search, FileEdit } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLocation } from 'wouter';

interface FitnessPlanSummary {
  id: number;
  userId: number;
  isActive: boolean;
  createdAt: string;
  preferences: {
    goal: string;
    fitnessLevel: string;
  };
}

export default function AdminFitnessPlansList() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Redirect if not admin
  useEffect(() => {
    if (user && !user.isAdmin) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Fetch all fitness plans
  const { data: fitnessPlans, isLoading } = useQuery({
    queryKey: ['/api/admin/fitness-plans'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/fitness-plans');
      if (!res.ok) throw new Error('Failed to fetch fitness plans');
      return await res.json();
    },
    enabled: !!user?.isAdmin
  });
  
  // Get usernames for plans
  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      return await res.json();
    },
    enabled: !!user?.isAdmin
  });

  // Create a map of userId to username
  const userMap = users?.reduce((acc: Record<number, string>, user: any) => {
    acc[user.id] = user.username;
    return acc;
  }, {}) || {};

  // Filter plans by search query
  const filteredPlans = fitnessPlans?.filter((plan: FitnessPlanSummary) => {
    const username = userMap[plan.userId] || `User #${plan.userId}`;
    return (
      username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plan.preferences?.goal?.toLowerCase()?.includes(searchQuery.toLowerCase()) || false) ||
      (plan.preferences?.fitnessLevel?.toLowerCase()?.includes(searchQuery.toLowerCase()) || false)
    );
  }) || [];
  
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
  
  if (isLoading) {
    return (
      <div className="container py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
        Manage Fitness Plans
      </h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Fitness Plans Overview</CardTitle>
          <CardDescription>
            View and manage all user fitness plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center mb-4">
            <Search className="mr-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username, goal, or fitness level"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
          
          {filteredPlans.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No fitness plans found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Fitness Level</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.map((plan: FitnessPlanSummary) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <span className="inline-flex h-8 w-8 rounded-full bg-muted justify-center items-center mr-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </span>
                          {userMap[plan.userId] || `User #${plan.userId}`}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {plan.preferences?.goal?.replace('_', ' ') || 'Not specified'}
                      </TableCell>
                      <TableCell className="capitalize">
                        {plan.preferences?.fitnessLevel || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        {new Date(plan.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={plan.isActive ? "default" : "secondary"}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/fitness-plans/${plan.id}`)}
                        >
                          <FileEdit className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}