import React, { useState, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
// Removed tabs import as we're not using tabs anymore
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { apiRequest } from '@/lib/queryClient';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, AlertCircle, Loader2, PlusCircle, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

// Types for trainer plans
interface TrainerClient {
  id: number;
  username: string;
  email: string;
}

interface ClientData {
  client: TrainerClient;
  relationship: {
    id: number;
    trainerId: number;
    clientId: number;
    startedAt: string;
    status: string;
  };
}

interface NutritionPlan {
  id: number;
  trainerId: number;
  clientId: number;
  name: string;
  description: string | null;
  caloriesTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

interface FitnessPlan {
  id: number;
  trainerId: number;
  clientId: number;
  name: string;
  description: string | null;
  workoutPlan: any;
  mealPlan: any;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  notes: string | null;
}

interface SearchResult {
  id: number;
  username: string;
  email: string;
}

interface ClientRequest {
  id: number;
  trainerId: number;
  clientId: number;
  status: string;
  requestedAt: string;
  message: string;
  client?: {
    id: number;
    username: string;
    email: string;
  };
}

const ClientRequestList: React.FC = () => {
  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/trainer/requests'],
    retry: 1,
  });
  
  const queryClient = useQueryClient();
  
  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return await apiRequest(`/api/trainer/requests/${requestId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/requests'] });
      toast({
        title: "Request cancelled",
        description: "The client request has been cancelled successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to cancel the request. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  if (requestsLoading) return null;
  
  if (!requests || !Array.isArray(requests) || requests.length === 0) return null;
  
  const pendingRequests = requests.filter((req: ClientRequest) => req.status === 'pending');
  
  if (pendingRequests.length === 0) return null;
  
  return (
    <div className="mb-4">
      <h3 className="font-medium text-base md:text-lg mb-2 text-blue-700 dark:text-blue-400">Pending Client Requests</h3>
      <div className="space-y-2 md:space-y-3">
        {pendingRequests.map((request: ClientRequest) => (
          <Card key={request.id} className="border-muted/80 dark:border-muted/30 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="p-3 md:p-4 pb-1 md:pb-2">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2 md:space-x-3">
                  <Avatar className="h-7 w-7 md:h-8 md:w-8 shrink-0">
                    <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white dark:from-blue-500 dark:to-indigo-500 text-xs md:text-sm">
                      {request.client?.username ? request.client.username.substring(0, 2).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden">
                    <CardTitle className="text-sm md:text-base truncate">{request.client?.username}</CardTitle>
                    <CardDescription className="text-[10px] md:text-xs truncate">
                      Requested: {new Date(request.requestedAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] md:text-xs shrink-0 h-5 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                  Pending
                </Badge>
              </div>
            </CardHeader>
            <CardFooter className="p-3 md:p-4 pt-0 md:pt-1 pb-2 md:pb-3 flex justify-end">
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 md:h-8 px-2 text-[10px] md:text-xs hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400" 
                onClick={() => cancelRequestMutation.mutate(request.id)}
                disabled={cancelRequestMutation.isPending}
              >
                <X className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                Cancel Request
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

const ClientSearch: React.FC = () => {
  const [username, setUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [message, setMessage] = useState('');
  
  const queryClient = useQueryClient();
  
  const handleSearch = async () => {
    if (!username.trim()) return;
    
    setIsSearching(true);
    try {
      const endpoint = `/api/trainer/search-clients?search=${encodeURIComponent(username.trim())}`;
      
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data || []);
      } else {
        const errorText = await response.text();
        let errorMessage;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || 'Failed to search for users';
        } catch (e) {
          errorMessage = 'Could not search for users';
        }
        
        toast({
          title: 'Search failed',
          description: errorMessage,
          variant: 'destructive'
        });
        setSearchResults([]);
      }
    } catch (error) {
      toast({
        title: 'Search failed',
        description: 'Could not search for users. Please try again.',
        variant: 'destructive'
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };
  
  const sendRequestMutation = useMutation({
    mutationFn: async (data: { clientId: number, message: string }) => {
      try {
        const response = await fetch('/api/trainer/requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage;
          
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.message || 'Failed to send request';
          } catch (e) {
            errorMessage = errorText || 'Failed to send request';
          }
          
          throw new Error(errorMessage);
        }
        
        return await response.json();
      } catch (fetchError) {
        throw fetchError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/requests'] });
      toast({
        title: "Request sent",
        description: "Your client request has been sent successfully."
      });
      setShowRequestDialog(false);
      setSelectedUser(null);
      setMessage('');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send request. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const handleSendRequest = () => {
    if (!selectedUser) return;
    
    sendRequestMutation.mutate({
      clientId: selectedUser.id,
      message: message || `I would like to be your personal trainer.`
    });
  };
  
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-base md:text-lg mb-2 text-blue-700 dark:text-blue-400">Find New Clients</h3>
        {isSearching && (
          <div className="flex items-center text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Searching...
          </div>
        )}
      </div>
      
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search by username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="pr-8 h-9 md:h-10 text-sm md:text-base"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Search size={16} />
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleSearch} 
          disabled={isSearching || !username.trim()}
          className="shrink-0 h-9 md:h-10"
        >
          Search
        </Button>
      </div>
      
      {searchResults.length > 0 && (
        <div className="space-y-2 md:space-y-3">
          {searchResults.map((user) => (
            <Card key={user.id} className="hover:bg-accent/5 transition-colors shadow-sm border-muted/80 dark:border-muted/30">
              <CardHeader className="py-2 md:py-3 px-3 md:px-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white dark:from-blue-500 dark:to-indigo-500">
                        {user?.username ? user.username.substring(0, 2).toUpperCase() : 'US'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <CardTitle className="text-sm md:text-base truncate">{user.username}</CardTitle>
                      <CardDescription className="text-xs truncate">{user.email}</CardDescription>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    className="h-8 shrink-0 text-xs ml-2" 
                    onClick={() => {
                      setSelectedUser(user);
                      setShowRequestDialog(true);
                    }}
                  >
                    <UserPlus size={14} className="mr-1 md:mr-2" /> 
                    <span className="hidden xs:inline">Request</span>
                    <span className="xs:hidden">Add</span>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
      
      {username && searchResults.length === 0 && !isSearching && (
        <Alert className="bg-muted/10 border-muted/50 dark:border-muted/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-sm">No results found</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            No users matching "{username}" were found. Try a different username.
          </AlertDescription>
        </Alert>
      )}
      
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Client Connection</DialogTitle>
            <DialogDescription>
              Send a request to connect with {selectedUser?.username} as their personal trainer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-2">
            <label className="text-sm font-medium mb-1 block">Message (optional)</label>
            <Input
              placeholder="Add a personal message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full"
            />
          </div>
          
          <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-end">
            <DialogClose asChild>
              <Button 
                variant="outline" 
                disabled={sendRequestMutation.isPending}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button 
              onClick={handleSendRequest}
              disabled={sendRequestMutation.isPending}
              className={`w-full sm:w-auto ${sendRequestMutation.isPending ? 'opacity-80' : ''}`}
            >
              {sendRequestMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const ClientList: React.FC = () => {
  const { data: clientsData, isLoading, error } = useQuery<ClientData[]>({
    queryKey: ['/api/trainer/clients'],
    retry: 1,
  });
  
  // Get wouter location hooks
  const [location, setLocation] = useLocation();
  
  // Handle clients data safely with consistent structure
  const clients = useMemo(() => {
    if (!clientsData) return [];
    return clientsData.map(item => ({
      client: item.client,
      relationship: item.relationship
    }));
  }, [clientsData]);

  // Function to navigate to create plan page with a specific client
  const handleCreatePlan = (clientId: number) => {
    if (clientId) {
      // Using setLocation from wouter for navigation
      setLocation(`/enhanced-trainer-plan-creation?clientId=${clientId}`);
      console.log('Navigating to create plan with client ID:', clientId);
    }
  };

  return (
    <div>
      <ClientSearch />
      <ClientRequestList />
      
      {/* Loading state with skeleton UI */}
      {isLoading && (
        <div className="space-y-3 my-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg animate-pulse bg-muted/5 dark:bg-muted/10 shadow-sm">
              <div className="rounded-full bg-muted/20 h-10 w-10 shrink-0"></div>
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-muted/20 rounded w-1/3"></div>
                <div className="h-2 bg-muted/20 rounded w-1/4"></div>
              </div>
              <div className="space-y-2 shrink-0 flex gap-2">
                <div className="h-8 w-20 bg-muted/20 rounded"></div>
                <div className="h-8 w-20 bg-muted/20 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="my-3 shadow-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-sm">Failed to load clients</AlertTitle>
          <AlertDescription className="text-xs">
            Unable to retrieve your client list. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      {/* Empty state */}
      {!isLoading && !error && clients.length === 0 ? (
        <Alert className="my-3 bg-muted/5 border-muted/50 dark:border-muted/20 shadow-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-sm">No clients yet</AlertTitle>
          <AlertDescription className="text-xs">
            You don't have any clients yet. Use the search above to find and request users to become your clients.
          </AlertDescription>
        </Alert>
      ) : !isLoading && !error && clients.length > 0 ? (
        <div className="space-y-3 my-3">
          <h3 className="font-medium text-base md:text-lg text-blue-700 dark:text-blue-400">Your Clients</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clients.map(({client, relationship}) => (
              <Card key={client?.id} className="hover:shadow-md transition-shadow duration-200 shadow-sm border-muted/80 dark:border-muted/30">
                <CardHeader className="p-3 md:p-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white dark:from-blue-500 dark:to-indigo-500">
                        {client?.username ? client.username.substring(0, 2).toUpperCase() : 'CL'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{client?.username || 'Client'}</CardTitle>
                      <CardDescription className="text-xs">{client?.email || 'No email'}</CardDescription>
                      <div className="text-xs text-muted-foreground mt-1">
                        Client since {new Date(relationship?.startedAt || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="default" className="text-xs bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                      Active
                    </Badge>
                    
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/30"
                      onClick={() => client && handleCreatePlan(client.id)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15h6"/></svg>
                      New Plan
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 pb-4">
                  <div className="flex flex-wrap gap-2 w-full">
                    <Link href={`/trainer/clients/${client?.id}/nutrition-goals`} className="flex-1 min-w-[100px]">
                      <Button size="sm" variant="outline" className="w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M12 2v8"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0 0-8H2"/></svg>
                        Nutrition
                      </Button>
                    </Link>
                    <Link href={`/trainer/clients/${client?.id}`} className="flex-1 min-w-[100px]">
                      <Button size="sm" variant="outline" className="w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                        Details
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      variant="secondary" 
                      className="w-full flex-1 min-w-[80px]"
                      onClick={() => client && setLocation(`/messages?clientId=${client.id}`)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      Message
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

// Removed NutritionPlans component as it's no longer needed

  if (isLoading) {
    return (
      <div className="space-y-3 my-3">
        <div className="flex items-center justify-between p-3 border rounded-lg animate-pulse bg-muted/5 dark:bg-muted/10 shadow-sm">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted/20 rounded w-1/4"></div>
            <div className="h-2 bg-muted/20 rounded w-1/2 mt-2"></div>
          </div>
          <div className="w-12 h-4 bg-muted/20 rounded-full"></div>
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg animate-pulse bg-muted/5 dark:bg-muted/10 shadow-sm">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted/20 rounded w-1/3"></div>
            <div className="h-2 bg-muted/20 rounded w-2/5 mt-2"></div>
          </div>
          <div className="w-12 h-4 bg-muted/20 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-3 shadow-sm">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-sm">Failed to load nutrition plans</AlertTitle>
        <AlertDescription className="text-xs">
          Unable to retrieve nutrition plans. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (plans.length === 0) {
    return (
      <Alert className="my-3 bg-muted/5 border-muted/50 dark:border-muted/20 shadow-sm">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-sm">No nutrition plans yet</AlertTitle>
        <AlertDescription className="text-xs">
          Create a nutrition plan for your clients to help them reach their goals.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
      {plans.map((plan) => (
        <Card key={plan.id} className="hover:shadow-md transition-shadow duration-200 shadow-sm border-muted/80 dark:border-muted/30">
          <CardHeader className="p-3 md:p-4 pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base md:text-lg">{plan.name}</CardTitle>
              <Badge variant={plan.active ? "default" : "outline"} className="text-[10px] md:text-xs">
                {plan.active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <CardDescription className="text-xs md:text-sm line-clamp-1">
              {plan.description || "No description provided"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-1">
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <div className="border rounded-md p-2 md:p-3 bg-muted/5 dark:bg-muted/10 border-muted/70 dark:border-muted/30">
                <div className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-400">Calories</div>
                <div className="text-base md:text-lg font-bold">{plan.caloriesTarget} <span className="text-[10px] md:text-xs font-normal text-muted-foreground">kcal</span></div>
              </div>
              <div className="border rounded-md p-2 md:p-3 bg-muted/5 dark:bg-muted/10 border-muted/70 dark:border-muted/30">
                <div className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-400">Protein</div>
                <div className="text-base md:text-lg font-bold">{plan.proteinTarget} <span className="text-[10px] md:text-xs font-normal text-muted-foreground">g</span></div>
              </div>
              <div className="border rounded-md p-2 md:p-3 bg-muted/5 dark:bg-muted/10 border-muted/70 dark:border-muted/30">
                <div className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-400">Carbs</div>
                <div className="text-base md:text-lg font-bold">{plan.carbsTarget} <span className="text-[10px] md:text-xs font-normal text-muted-foreground">g</span></div>
              </div>
              <div className="border rounded-md p-2 md:p-3 bg-muted/5 dark:bg-muted/10 border-muted/70 dark:border-muted/30">
                <div className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-400">Fat</div>
                <div className="text-base md:text-lg font-bold">{plan.fatTarget} <span className="text-[10px] md:text-xs font-normal text-muted-foreground">g</span></div>
              </div>
            </div>
            
            <div className="mt-3 text-[10px] md:text-xs text-muted-foreground">
              Created: {new Date(plan.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
          <CardFooter className="p-3 md:p-4 pt-0">
            <Link href={`/trainer/clients/${plan.clientId}/nutrition-goals`} className="w-full">
              <Button size="sm" className="w-full text-xs md:text-sm h-8 md:h-9">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 md:mr-2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
                View Details
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

const FitnessPlans: React.FC = () => {
  const { data: fitnessPlans, isLoading, error } = useQuery<FitnessPlan[]>({
    queryKey: ['/api/trainer/fitness-plans'],
    retry: 1,
  });
  
  const plans = fitnessPlans || [];

  if (isLoading) {
    return (
      <div className="space-y-3 my-3">
        <div className="flex items-center justify-between p-3 border rounded-lg animate-pulse bg-muted/5 dark:bg-muted/10 shadow-sm">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted/20 rounded w-1/4"></div>
            <div className="h-2 bg-muted/20 rounded w-1/2 mt-2"></div>
          </div>
          <div className="w-12 h-4 bg-muted/20 rounded-full"></div>
        </div>
        <div className="flex items-center justify-between p-3 border rounded-lg animate-pulse bg-muted/5 dark:bg-muted/10 shadow-sm">
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-muted/20 rounded w-1/3"></div>
            <div className="h-2 bg-muted/20 rounded w-2/5 mt-2"></div>
          </div>
          <div className="w-12 h-4 bg-muted/20 rounded-full"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="my-3 shadow-sm">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-sm">Failed to load fitness plans</AlertTitle>
        <AlertDescription className="text-xs">
          Unable to retrieve fitness plans. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  if (plans.length === 0) {
    return (
      <Alert className="my-3 bg-muted/5 border-muted/50 dark:border-muted/20 shadow-sm">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="text-sm">No fitness plans yet</AlertTitle>
        <AlertDescription className="text-xs">
          Create a fitness plan for your clients to help them reach their fitness goals.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-3">
      {plans.map((plan) => (
        <Card key={plan.id} className="hover:shadow-md transition-shadow duration-200 shadow-sm border-muted/80 dark:border-muted/30">
          <CardHeader className="p-3 md:p-4 pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base md:text-lg">{plan.name}</CardTitle>
              <Badge variant={plan.isActive ? "default" : "outline"} className="text-[10px] md:text-xs">
                {plan.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <CardDescription className="text-xs md:text-sm line-clamp-1">
              {plan.description || "No description provided"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-1">
            <div className="border rounded-md p-3 bg-muted/5 dark:bg-muted/10 border-muted/70 dark:border-muted/30">
              {plan.notes ? (
                <div>
                  <h4 className="font-medium text-xs md:text-sm mb-1 text-blue-700 dark:text-blue-400">Plan Notes:</h4>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">{plan.notes}</p>
                </div>
              ) : (
                <p className="text-xs md:text-sm text-muted-foreground italic">No additional notes for this plan</p>
              )}
            </div>
            
            <div className="mt-3 text-[10px] md:text-xs text-muted-foreground">
              Created: {new Date(plan.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
          <CardFooter className="p-3 md:p-4 pt-0">
            <Link href={`/trainer/clients/${plan.clientId}`} className="w-full">
              <Button size="sm" className="w-full text-xs md:text-sm h-8 md:h-9">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 md:mr-2"><path d="M18 6H5c-1 0-2 .5-2 2v9c0 1.5 1 2 2 2h13c1 0 2-.5 2-2V8c0-1.5-1-2-2-2Z"/><path d="M15 2v4"/><path d="M8 2v4"/><path d="M2 10h19"/></svg>
                View Details
              </Button>
            </Link>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

const TrainerPage: React.FC = () => {
  // Removed tabs state as we're showing only clients section
  const [showClientSelectModal, setShowClientSelectModal] = useState(false);
  const [location, setLocation] = useLocation();
  
  // Function to handle client selection and navigation to create plan
  const handleClientSelect = (clientId: number | string) => {
    // Ensure clientId is a number
    const numericClientId = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;
    
    // Validate that the clientId is valid
    if (isNaN(numericClientId)) {
      toast({
        title: "Invalid client selection",
        description: "The selected client ID is not valid. Please try again.",
        variant: "destructive"
      });
      return;
    }
    
    // Navigate to plan creation
    setShowClientSelectModal(false);
    setLocation(`/enhanced-trainer-plan-creation?clientId=${numericClientId}`);
  };
  
  // Query to fetch clients for selection
  const { data: clientsData, isLoading: isClientsLoading, error: clientsError } = useQuery<ClientData[]>({
    queryKey: ['/api/trainer/clients'],
    retry: 1,
  });
  
  // Extract array of clients from nested data structure
  const clients = useMemo(() => {
    if (!clientsData || !Array.isArray(clientsData)) return [];
    return clientsData.map((item: ClientData) => item.client);
  }, [clientsData]);
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="container px-4 py-6 mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={16} className="mr-1" />
            Back to Home
          </Link>
          
          <Button 
            size="sm" 
            className="bg-primary hover:bg-primary/90"
            onClick={() => setShowClientSelectModal(true)}
          >
            <PlusCircle size={14} className="mr-1.5" />
            New Plan
          </Button>
        </div>
        
        {/* Tabs */}
        <div className="mb-6 flex justify-between">
          <h2 className="text-xl font-semibold flex items-center">
            <UserPlus size={18} className="mr-2 text-blue-600" />
            <span>My Clients</span>
          </h2>
        </div>
        
        <ClientList />
      </div>
      
      {/* Client selection modal */}
      <Dialog open={showClientSelectModal} onOpenChange={setShowClientSelectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Client</DialogTitle>
            <DialogDescription>
              Choose a client to create a fitness plan for
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto py-3">
            {isClientsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                ))}
              </div>
            ) : clientsError ? (
              <Alert variant="destructive">
                <AlertCircle size={14} />
                <AlertTitle className="text-sm ml-2">Error loading clients</AlertTitle>
                <AlertDescription className="text-xs ml-6">
                  Please try again later
                </AlertDescription>
              </Alert>
            ) : clients.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-muted-foreground">No clients available</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Use the client search to find and request new clients
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {clients.map((client: TrainerClient) => (
                  <div 
                    key={client.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleClientSelect(client.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {client?.username ? client.username.substring(0, 2).toUpperCase() : 'CL'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{client?.username || 'Client'}</p>
                        <p className="text-xs text-muted-foreground">{client?.email || 'No email'}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TrainerPage;