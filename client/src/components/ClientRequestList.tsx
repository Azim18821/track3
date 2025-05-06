import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Clock, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow } from 'date-fns';

interface ClientRequest {
  id: number;
  trainerId: number;
  clientId: number;
  requestedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  responseAt?: string;
  // Joined data
  client?: {
    id: number;
    username: string;
    email: string;
  };
}

export default function ClientRequestList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteRequestId, setDeleteRequestId] = useState<number | null>(null);

  // Fetch trainer client requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['/api/trainer/requests'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/trainer/requests');
      if (!res.ok) throw new Error('Failed to fetch client requests');
      return await res.json();
    }
  });

  // Delete request mutation
  const deleteRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const res = await apiRequest('DELETE', `/api/trainer/requests/${requestId}`);
      if (!res.ok) throw new Error('Failed to delete request');
      return requestId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/requests'] });
      toast({
        title: "Request deleted",
        description: "Client request has been removed successfully.",
      });
      setDeleteRequestId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete request",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Separate requests by status
  const pendingRequests = requests?.filter((req: ClientRequest) => req.status === 'pending') || [];
  const completedRequests = requests?.filter((req: ClientRequest) => req.status !== 'pending') || [];

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Clock size={20} className="text-amber-500" />
            Pending Client Requests
          </CardTitle>
          <CardDescription>
            Requests you've sent to potential clients that are awaiting a response.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request: ClientRequest) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.clientId}</TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="max-w-md truncate">{request.message || 'No message'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                          Pending
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteRequestId(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>No pending requests</p>
              <p className="text-sm mt-1">Your sent requests that are awaiting response will appear here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Requests */}
      {completedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              Responded Requests
            </CardTitle>
            <CardDescription>
              Client requests that have been accepted or rejected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Response Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedRequests.map((request: ClientRequest) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium">{request.clientId}</TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {request.status === 'accepted' ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                            Accepted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">
                            Rejected
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {request.responseAt && formatDistanceToNow(new Date(request.responseAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteRequestId(request.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteRequestId} onOpenChange={() => setDeleteRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this client request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteRequestId) {
                  deleteRequestMutation.mutate(deleteRequestId);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteRequestMutation.isPending}
            >
              {deleteRequestMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}