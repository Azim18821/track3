import React, { useState, useMemo } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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

// Types for trainer clients and plans
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
    return clientsData.map((item: ClientData) => item.client);
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
      
      {/* Empty state */}
      {!isLoading && clients.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
            <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-lg font-medium mb-1">No Clients Yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            You don't have any clients yet. Search for users and send connection requests to add clients.
          </p>
        </div>
      )}
      
      {/* Client list */}
      {!isLoading && clients.length > 0 && (
        <div>
          <h3 className="font-medium text-base md:text-lg mb-2 text-blue-700 dark:text-blue-400">Your Clients</h3>
          <div className="space-y-3">
            {clients.map((client: TrainerClient) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow border-muted/80 dark:border-muted/30">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white dark:from-blue-500 dark:to-indigo-500">
                        {client?.username ? client.username.substring(0, 2).toUpperCase() : 'US'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                      <CardTitle className="text-base truncate">{client.username}</CardTitle>
                      <CardDescription className="text-xs truncate">{client.email}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="py-2 px-4 flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => handleCreatePlan(client.id)}
                  >
                    <PlusCircle size={14} className="mr-1" />
                    Create Plan
                  </Button>
                  <Link to={`/client/${client.id}`} className="flex-1 md:flex-none">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      className="h-8 text-xs w-full"
                    >
                      <ChevronRight size={14} className="mr-1" />
                      View Details
                    </Button>
                  </Link>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => client && setLocation(`/messages?clientId=${client.id}`)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    Message
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TrainerPage: React.FC = () => {
  const [showClientSelectModal, setShowClientSelectModal] = useState(false);
  const [location, setLocation] = useLocation();
  
  // Function to handle client selection and navigation to create plan
  const handleClientSelect = (clientId: number | string) => {
    // Ensure clientId is a number
    const numericClientId = typeof clientId === 'string' ? parseInt(clientId, 10) : clientId;
    
    // Validate that the clientId is valid
    if (isNaN(numericClientId)) {
      toast({
        title: 'Invalid Selection',
        description: 'Please select a valid client.',
        variant: 'destructive'
      });
      return;
    }
    
    // Navigate to the create plan page with the client ID
    setLocation(`/enhanced-trainer-plan-creation?clientId=${numericClientId}`);
    
    // Close the modal
    setShowClientSelectModal(false);
  };
  
  return (
    <div className="container max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-2 -ml-3"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft size={16} className="mr-1" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold">Trainer Dashboard</h1>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <Link to="/plan-templates" className="flex-1 md:flex-none">
            <Button 
              variant="outline" 
              size="sm"
              className="w-full md:w-auto"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg>
              Plan Templates
            </Button>
          </Link>
          <Button 
            variant="default" 
            size="sm"
            className="flex-1 md:flex-none"
            onClick={() => setShowClientSelectModal(true)}
          >
            <PlusCircle size={14} className="mr-1.5" />
            New Plan
          </Button>
        </div>
        
        {/* Main content - Only showing the Client List */}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Client</DialogTitle>
            <DialogDescription>
              Choose a client to create a new plan for.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="space-y-2 max-h-[50vh] overflow-auto">
              {/* Client selection will go here */}
              <p className="text-center text-muted-foreground py-4">
                Loading clients...
              </p>
            </div>
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