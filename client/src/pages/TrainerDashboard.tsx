import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Users, UserCheck, UserPlus, FileText, CalendarClock, Activity } from 'lucide-react';
import { useLocation } from 'wouter';

export default function TrainerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('clients');

  // If not a trainer, redirect to home
  useEffect(() => {
    if (user && !user.isTrainer) {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Fetch trainer's clients
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ['/api/trainer/clients'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/trainer/clients');
        if (!res.ok) {
          throw new Error('Failed to fetch clients');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your clients. Please try again later.',
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!user?.isTrainer,
  });

  // Fetch client requests (pending assignments)
  const { data: clientRequests, isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/trainer/requests'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/trainer/requests');
        if (!res.ok) {
          throw new Error('Failed to fetch client requests');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching client requests:', error);
        toast({
          title: 'Error',
          description: 'Failed to load client requests. Please try again later.',
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!user?.isTrainer,
  });

  // Fetch fitness plans created by this trainer
  const { data: fitnessPlans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/trainer/plans'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/trainer/plans');
        if (!res.ok) {
          throw new Error('Failed to fetch fitness plans');
        }
        return await res.json();
      } catch (error) {
        console.error('Error fetching fitness plans:', error);
        toast({
          title: 'Error',
          description: 'Failed to load fitness plans. Please try again later.',
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!user?.isTrainer,
  });

  if (!user?.isTrainer) {
    return null; // Don't render anything while redirecting
  }

  if (clientsLoading || requestsLoading || plansLoading) {
    return (
      <div className="container py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Additional debug logging to check API responses
  console.log("API response - clients:", clients);
  console.log("API response - requests:", clientRequests);
  
  // Debug the data structure
  if (clients && clients.length > 0) {
    console.log("First client structure:", JSON.stringify(clients[0], null, 2));
  }
  
  const clientCount = clients?.length || 0;
  const requestCount = clientRequests?.filter((req: any) => req.status === 'pending')?.length || 0;
  const planCount = fitnessPlans?.length || 0;

  return (
    <div className="container px-3 py-4 md:px-6 md:py-8 mx-auto max-w-7xl">
      <div className="mb-4 md:mb-6">
        <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Trainer Dashboard
        </h1>
        <p className="text-xs md:text-base text-muted-foreground leading-tight md:leading-normal">
          Manage your clients and their fitness plans
        </p>
      </div>

      {/* Summary Cards - More compact for mobile */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 md:mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100 dark:from-blue-950 dark:to-indigo-950 dark:border-blue-900">
          <CardHeader className="pb-1 pt-3 px-3 sm:px-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm md:text-lg text-blue-800 dark:text-blue-300">Clients</CardTitle>
              <Users className="text-blue-600 dark:text-blue-400 h-4 w-4 md:h-5 md:w-5" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 pt-0 px-3 sm:px-6">
            <div className="text-xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">{clientCount}</div>
            <CardDescription className="text-blue-700 dark:text-blue-400 text-xs md:text-sm">Active clients</CardDescription>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100 dark:from-emerald-950 dark:to-teal-950 dark:border-emerald-900">
          <CardHeader className="pb-1 pt-3 px-3 sm:px-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm md:text-lg text-emerald-800 dark:text-emerald-300">Plans</CardTitle>
              <FileText className="text-emerald-600 dark:text-emerald-400 h-4 w-4 md:h-5 md:w-5" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 pt-0 px-3 sm:px-6">
            <div className="text-xl md:text-3xl font-bold text-emerald-900 dark:text-emerald-100">{planCount}</div>
            <CardDescription className="text-emerald-700 dark:text-emerald-400 text-xs md:text-sm">Created plans</CardDescription>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100 dark:from-amber-950 dark:to-yellow-950 dark:border-amber-900 col-span-2 sm:col-span-1">
          <CardHeader className="pb-1 pt-3 px-3 sm:px-6">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm md:text-lg text-amber-800 dark:text-amber-300">Requests</CardTitle>
              <UserPlus className="text-amber-600 dark:text-amber-400 h-4 w-4 md:h-5 md:w-5" />
            </div>
          </CardHeader>
          <CardContent className="pb-3 pt-0 px-3 sm:px-6">
            <div className="text-xl md:text-3xl font-bold text-amber-900 dark:text-amber-100">{requestCount}</div>
            <CardDescription className="text-amber-700 dark:text-amber-400 text-xs md:text-sm">Pending requests</CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs - Full width on mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 w-full h-auto grid grid-cols-3 gap-1">
          <TabsTrigger value="clients" className="flex items-center justify-center py-1 px-2">
            <UserCheck className="w-4 h-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">Clients</span>
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center justify-center py-1 px-2 relative">
            <UserPlus className="w-4 h-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">Requests</span>
            {requestCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 text-[10px] h-4 min-w-4 flex items-center justify-center p-0">
                {requestCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center justify-center py-1 px-2">
            <FileText className="w-4 h-4 mr-1 md:mr-2" />
            <span className="text-xs md:text-sm">Plans</span>
          </TabsTrigger>
        </TabsList>

        {/* Clients Tab */}
        <TabsContent value="clients">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clientCount > 0 ? (
              clients.map((clientData: any) => {
                // Access the client object - API returns {client: User, relationship: TrainerClient}
                const client = clientData.client || clientData;
                const relationship = clientData.relationship;
                
                // For debugging
                console.log("Client data from API:", clientData);
                
                return (
                  <Card key={client.id} className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 pb-3">
                      <div className="flex items-center">
                        <Avatar className="h-10 w-10 mr-3 bg-white">
                          <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            {client.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base font-semibold text-blue-900">{client.username}</CardTitle>
                          <CardDescription className="text-blue-700 text-xs">
                            Joined: {new Date(client.registered_at || client.createdAt || Date.now()).toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-3 pb-2">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="font-medium">Active</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Plans:</span>
                          <span className="font-medium">{client.planCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last active:</span>
                          <span className="font-medium">
                            {client.lastActive 
                              ? new Date(client.lastActive).toLocaleDateString()
                              : 'Never'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2 pb-3">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        onClick={() => setLocation(`/messages?client=${client.id}`)}
                      >
                        Message
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        onClick={() => setLocation(`/trainer/clients/${client.id}`)}
                      >
                        Manage
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-10 bg-muted/20 rounded-lg border border-dashed">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-1">No clients yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  You don't have any clients assigned to you yet. Check your requests or wait for client assignments.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('requests')}
                  className="mt-2"
                >
                  View Requests
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requestCount > 0 ? (
              clientRequests.filter((request: any) => request.status === 'pending').map((request: any) => (
                <Card key={request.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 pb-3">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3 bg-white">
                        <AvatarFallback className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white">
                          {request.client.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base font-semibold text-amber-900">
                          {request.client.username}
                        </CardTitle>
                        <CardDescription className="text-amber-700 text-xs">
                          Requested: {new Date(request.createdAt).toLocaleDateString()}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-3 pb-2">
                    <div className="space-y-2 text-sm">
                      {request.message && (
                        <div className="p-2 bg-amber-50/50 rounded-md border border-amber-100 text-amber-800 italic">
                          "{request.message}"
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">
                          Pending
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2 pb-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        // Handle rejection
                        toast({
                          title: "Request rejected",
                          description: "The client request has been rejected.",
                        });
                      }}
                    >
                      Decline
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      onClick={() => {
                        // Handle acceptance
                        toast({
                          title: "Request accepted",
                          description: "The client has been added to your client list.",
                        });
                      }}
                    >
                      Accept
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-10 bg-muted/20 rounded-lg border border-dashed">
                <UserPlus className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-1">No pending requests</h3>
                <p className="text-sm text-muted-foreground text-center">
                  You don't have any pending client requests at the moment.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {planCount > 0 ? (
              fitnessPlans.map((plan: any) => (
                <Card key={plan.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-emerald-900">
                        {plan.name || `Fitness Plan #${plan.id}`}
                      </CardTitle>
                      <FileText className="text-emerald-600 h-5 w-5" />
                    </div>
                    <CardDescription className="text-emerald-700 text-xs">
                      Created: {new Date(plan.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-3 pb-2">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Client:</span>
                        <span className="font-medium">{plan.clientName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium">{plan.type || 'General'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{plan.duration || '4 weeks'}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between pt-2 pb-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      onClick={() => {
                        // Find the client for this plan
                        const clientForPlan = clients.find((c: any) => c.client.id === plan.userId);
                        if (clientForPlan) {
                          // Use "plans" (plural) to match the standard URL format
                          setLocation(`/trainer/clients/${clientForPlan.client.id}/plans/${plan.id}`);
                        } else {
                          toast({
                            title: "Client not found",
                            description: "Could not find client associated with this plan",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                      onClick={() => {
                        // Find the client for this plan
                        const clientForPlan = clients.find((c: any) => c.client.id === plan.userId);
                        if (clientForPlan) {
                          setLocation(`/enhanced-trainer-plan-creation?clientId=${clientForPlan.client.id}&planId=${plan.id}`);
                        } else {
                          toast({
                            title: "Client not found",
                            description: "Could not find client associated with this plan",
                            variant: "destructive"
                          });
                        }
                      }}
                    >
                      Edit
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-10 bg-muted/20 rounded-lg border border-dashed">
                <FileText className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-1">No fitness plans yet</h3>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  You haven't created any fitness plans for your clients yet.
                </p>
                <Button
                  onClick={() => setLocation('/enhanced-trainer-plan-creation')}
                  className="mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  Create New Plan
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}