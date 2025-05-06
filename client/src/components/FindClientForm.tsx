import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, User, SendHorizontal } from 'lucide-react';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserData {
  id: number;
  username: string;
  email: string;
  isApproved: boolean;
}

const searchSchema = z.object({
  query: z.string().min(3, "Search term must be at least 3 characters"),
});

const requestSchema = z.object({
  clientId: z.number(),
  message: z.string().min(5, "Message must be at least 5 characters").max(200, "Message is too long"),
});

export default function FindClientForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [searchResults, setSearchResults] = useState<UserData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  // Form setup
  const searchForm = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: '',
    },
  });

  const requestForm = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      clientId: 0,
      message: `I'd like to connect as your personal trainer.`,
    },
  });

  // Search for users
  const searchUsers = async (query: string) => {
    setIsSearching(true);
    try {
      console.log(`Searching for clients with query: ${query}`);
      
      // Try a direct fetch call instead of using the apiRequest wrapper
      const endpoint = `/api/trainer/search-clients?search=${encodeURIComponent(query)}`;
      console.log(`Making direct fetch request to: ${endpoint}`);
      
      try {
        // First try a direct fetch to see if it works
        const directResponse = await fetch(endpoint, {
          credentials: 'include' // Important for sending cookies
        });
        
        console.log('Direct fetch response:', directResponse);
        
        if (directResponse.ok) {
          const directData = await directResponse.json();
          console.log('Direct fetch data:', directData);
          setSearchResults(directData);
          setIsSearching(false);
          return;
        } else {
          console.error('Direct fetch failed with status:', directResponse.status);
          const errorText = await directResponse.text();
          console.error('Error response:', errorText);
        }
      } catch (directError) {
        console.error('Direct fetch error:', directError);
      }
      
      // Fall back to the apiRequest method if direct fetch fails
      console.log('Falling back to apiRequest method');
      const res = await apiRequest('GET', endpoint);
      
      if (!res.ok) {
        console.error('Search response not OK:', res);
        throw new Error('Failed to search users');
      }
      
      const data = await res.json();
      console.log('Search results received from apiRequest:', data);
      setSearchResults(data);
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: error.message || "Failed to search for users",
        variant: "destructive"
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Send request mutation
  const sendRequestMutation = useMutation({
    mutationFn: async (data: z.infer<typeof requestSchema>) => {
      const res = await apiRequest('POST', '/api/trainer/requests', data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to send request');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/requests'] });
      toast({
        title: "Request sent",
        description: "Your request has been sent to the client.",
      });
      setIsRequestDialogOpen(false);
      setSelectedUser(null);
      requestForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send request",
        variant: "destructive"
      });
    }
  });

  // Handle search form submission
  const onSearchSubmit = (values: z.infer<typeof searchSchema>) => {
    console.log('Search form submitted with query:', values.query);
    searchUsers(values.query);
  };

  // Handle request form submission
  const onRequestSubmit = (values: z.infer<typeof requestSchema>) => {
    sendRequestMutation.mutate(values);
  };

  // Handle selecting a user to send request to
  const handleSelectUser = (user: UserData) => {
    setSelectedUser(user);
    requestForm.setValue('clientId', user.id);
    setIsRequestDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Search size={20} />
            Find Clients
          </CardTitle>
          <CardDescription>
            Search for users to send a trainer connection request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...searchForm}>
            <form className="space-y-4">
              <FormField
                control={searchForm.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Search Users</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Enter username or email..." {...field} />
                      </FormControl>
                      <Button 
                        type="button" 
                        className="bg-primary text-white hover:bg-primary/90"
                        disabled={isSearching}
                        onClick={() => {
                          // Add alert for debugging
                          alert('Search button clicked! Check console for logs.');
                          console.log('Search button clicked!');
                          
                          // Try to get the query value
                          const query = searchForm.getValues().query;
                          console.log('Search query value:', query);
                          
                          // Just for testing, let's try a hardcoded search
                          const testQuery = 'test';
                          console.log('Using test query for debugging:', testQuery);
                          
                          searchUsers(testQuery);
                        }}
                      >
                        {isSearching ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Search className="h-4 w-4 mr-2" />
                        )}
                        Search
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium mb-3">Search Results</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {searchResults.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          {user.isApproved ? 'Active' : 'Pending Approval'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectUser(user)}
                            disabled={!user.isApproved}
                          >
                            <SendHorizontal className="h-4 w-4 mr-2" />
                            Send Request
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {searchResults.length === 0 && !isSearching && searchForm.getValues().query && (
            <Alert className="mt-6">
              <User className="h-4 w-4" />
              <AlertDescription>
                No users found matching your search criteria.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Send request dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Trainer Request</DialogTitle>
            <DialogDescription>
              Send a connection request to {selectedUser?.username}.
            </DialogDescription>
          </DialogHeader>

          <Form {...requestForm}>
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
              <FormField
                control={requestForm.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter a message to the client..." 
                        {...field} 
                        className="h-32"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsRequestDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={sendRequestMutation.isPending}
                >
                  {sendRequestMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send Request
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}