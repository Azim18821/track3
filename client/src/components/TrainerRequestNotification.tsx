import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { BellRing, X, Check } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface TrainerRequest {
  id: number;
  trainerId: number;
  clientId: number;
  requestedAt: string;
  status: 'pending' | 'accepted' | 'rejected';
  message?: string;
  responseAt?: string;
  // Joined trainer data if available
  trainer?: {
    id: number;
    username: string;
    email: string;
  };
}

export default function TrainerRequestNotification() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [shouldShowNotification, setShouldShowNotification] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TrainerRequest | null>(null);
  
  // Only fetch requests if the user is logged in and not a trainer
  const enabled = !!(user && !user.isTrainer && !user.isAdmin);
  
  // Fetch client trainer requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ['/api/client/requests'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/client/requests');
      if (!res.ok) throw new Error('Failed to fetch trainer requests');
      return await res.json();
    },
    enabled,
    refetchOnWindowFocus: true,
  });
  
  // Count pending requests
  const pendingRequestCount = requests?.filter(
    (request: TrainerRequest) => request.status === 'pending'
  ).length || 0;
  
  // Show notification toast when there are pending requests (but only once)
  useEffect(() => {
    if (pendingRequestCount > 0 && !shouldShowNotification) {
      setShouldShowNotification(true);
      toast({
        title: `You have ${pendingRequestCount} trainer ${pendingRequestCount === 1 ? 'request' : 'requests'} pending`,
        description: "A trainer would like to connect with you. Click the notification bell to view.",
        duration: 5000,
      });
    } else if (pendingRequestCount === 0) {
      setShouldShowNotification(false);
    }
  }, [pendingRequestCount, toast, shouldShowNotification]);

  // Respond to request mutation
  const respondToRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: string }) => {
      const res = await apiRequest('PUT', `/api/client/requests/${requestId}`, { status });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to respond to request');
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/client/requests'] });
      toast({
        title: "Response sent",
        description: "Your response has been sent to the trainer.",
      });
      setIsDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to request",
        variant: "destructive"
      });
    }
  });

  // Handle accepting a request
  const handleAccept = (request: TrainerRequest) => {
    respondToRequestMutation.mutate({ 
      requestId: request.id, 
      status: 'accepted' 
    });
  };

  // Handle rejecting a request
  const handleReject = (request: TrainerRequest) => {
    respondToRequestMutation.mutate({ 
      requestId: request.id, 
      status: 'rejected' 
    });
  };

  // Show request details when clicked
  const handleRequestClick = (request: TrainerRequest) => {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  };

  // Don't render anything if there are no pending requests or user is a trainer
  if (!enabled || pendingRequestCount === 0) {
    return null;
  }

  return (
    <>
      {/* Notification Bell */}
      <Button 
        variant="outline" 
        size="icon" 
        className="relative"
        onClick={() => setIsDialogOpen(true)}
      >
        <BellRing className="h-5 w-5" />
        {pendingRequestCount > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 flex items-center justify-center h-5 w-5 p-0 bg-red-500 hover:bg-red-600"
          >
            {pendingRequestCount}
          </Badge>
        )}
      </Button>

      {/* Request Dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Trainer Requests
              {pendingRequestCount > 0 && (
                <Badge 
                  className="ml-2 bg-red-500 hover:bg-red-600"
                >
                  {pendingRequestCount} pending
                </Badge>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              The following trainers would like to connect with you:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4">
              {requests?.filter((request: TrainerRequest) => request.status === 'pending')
                .map((request: TrainerRequest) => (
                <div key={request.id} className="p-4 border border-border rounded-md bg-card">
                  <div className="font-medium">{request.trainer?.username || `Trainer #${request.trainerId}`}</div>
                  <div className="text-muted-foreground text-sm mb-3">
                    {new Date(request.requestedAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm mb-4">
                    {request.message || "Would like to be your trainer."}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-200 hover:bg-red-100 hover:text-red-700"
                      onClick={() => handleReject(request)}
                      disabled={respondToRequestMutation.isPending}
                    >
                      {respondToRequestMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <X className="h-4 w-4 mr-1" />
                      )}
                      Decline
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleAccept(request)}
                      disabled={respondToRequestMutation.isPending}
                    >
                      {respondToRequestMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}