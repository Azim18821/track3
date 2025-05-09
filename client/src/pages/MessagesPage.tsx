import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, MessageSquare, ChevronLeft, Check, ChevronsUpDown, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import MessagingInterface from '@/components/MessagingInterface';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Trainer {
  trainer: {
    id: number;
    username: string;
    email: string;
  };
  relationship: {
    id: number;
    trainerId: number;
    clientId: number;
    notes: string;
    assignedAt: string;
  };
}

interface Client {
  client: {
    id: number;
    username: string;
    email: string;
  };
  relationship: {
    id: number;
    trainerId: number;
    clientId: number;
    notes: string;
    assignedAt: string;
  };
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null);
  const [showTrainerList, setShowTrainerList] = useState(true);
  const isMobile = useIsMobile();

  // Fetch trainers for clients or clients for trainers depending on user role
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: [user?.isTrainer ? '/api/trainer/clients' : '/api/client/trainers'],
    queryFn: async () => {
      try {
        const isUserTrainer = !!user?.isTrainer;
        const endpoint = isUserTrainer ? '/api/trainer/clients' : '/api/client/trainers';
        const res = await apiRequest('GET', endpoint);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch ${isUserTrainer ? 'clients' : 'trainers'}: ${res.status} ${res.statusText}`);
        }
        
        const data = await res.json();
        return data;
      } catch (error) {
        toast({
          title: 'Error',
          description: `Failed to load your ${user?.isTrainer ? 'clients' : 'trainers'}. Please try again later.`,
          variant: 'destructive',
        });
        return [];
      }
    },
    enabled: !!user,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Auto-select first contact or handle single contact case
  useEffect(() => {
    if (contacts.length > 0) {
      if (user?.isTrainer) {
        // If trainer, select the first client
        const firstClient = contacts[0] as Client;
        setSelectedClientId(firstClient.client.id);
      } else {
        // If client, select the first trainer
        const firstTrainer = contacts[0] as Trainer;
        setSelectedTrainerId(firstTrainer.trainer.id);

        // Auto-skip trainer selection for clients with a single trainer
        if (contacts.length === 1) {
          setShowTrainerList(false);
        }
      }
    }
  }, [contacts, user]);

  if (isLoading) {
    return (
      <div className="container py-4 md:py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Check if user has any contacts (trainers or clients)
  const hasContacts = contacts.length > 0;
  
  // Get the selected contact info (trainer or client)
  const isTrainer = !!user?.isTrainer;
  
  let selectedContact = null;
  if (isTrainer) {
    selectedContact = contacts.find((c: Client) => c.client.id === selectedClientId)?.client;
  } else {
    selectedContact = contacts.find((t: Trainer) => t.trainer.id === selectedTrainerId)?.trainer;
  }

  return (
    <div className="container px-3 py-4 md:px-6 md:py-10">
      <div className="mb-4 md:mb-8 max-w-lg">
        <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Messages
        </h1>
        <p className="text-xs md:text-base text-muted-foreground leading-tight md:leading-normal">
          {isTrainer 
            ? "Connect with your clients to provide guidance and answer their questions."
            : "Connect with your personal trainer and get personalized guidance for your fitness journey."}
        </p>
      </div>

      {!hasContacts ? (
        <Alert variant="default" className="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/50 mx-auto max-w-md shadow-md">
          <div className="flex items-start">
            <div className="bg-blue-100 dark:bg-blue-900/60 rounded-full p-2 mr-3 flex-shrink-0 shadow-sm">
              <MessageSquare className="text-blue-600 dark:text-blue-400" size={18} />
            </div>
            <div>
              {isTrainer ? (
                <>
                  <AlertTitle className="text-blue-700 dark:text-blue-300 mb-2 text-base md:text-lg">No active clients</AlertTitle>
                  <AlertDescription className="text-blue-600 dark:text-blue-400 text-sm md:text-base">
                    You don't have any active clients at the moment. When clients are assigned to you,
                    you'll be able to communicate with them here to provide personalized guidance.
                  </AlertDescription>
                </>
              ) : (
                <>
                  <AlertTitle className="text-blue-700 dark:text-blue-300 mb-2 text-base md:text-lg">No trainers assigned</AlertTitle>
                  <AlertDescription className="text-blue-600 dark:text-blue-400 text-sm md:text-base">
                    You don't have any personal trainers assigned to your account yet. Once you have a trainer,
                    you'll be able to communicate with them here to receive personalized guidance.
                  </AlertDescription>
                </>
              )}
            </div>
          </div>
        </Alert>
      ) : (
        <Card className="border-2 border-indigo-100 dark:border-indigo-900/40 shadow-md overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 py-4 px-4 md:px-6">
            <CardTitle className="text-lg md:text-xl flex items-center">
              <div className="bg-blue-100 rounded-full p-2 mr-2 md:mr-3">
                <MessageSquare className="text-blue-600" size={isMobile ? 16 : 20} />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {isTrainer ? "Client Messages" : "Your Trainer Messages"}
              </span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 md:p-6 space-y-4">
            {isTrainer ? (
              // TRAINER VIEW - Client Dropdown Selector
              <div className="flex flex-col gap-6">
                <div className="mb-2">
                  <label htmlFor="client-select" className="block text-sm font-medium mb-2 text-indigo-700 dark:text-indigo-400">
                    Select a client to message
                  </label>
                  
                  <Select
                    onValueChange={(value) => setSelectedClientId(parseInt(value))}
                    value={selectedClientId?.toString()}
                  >
                    <SelectTrigger className="w-full md:w-[350px] bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Your Clients</SelectLabel>
                        {contacts.map((contactData: Client) => {
                          const client = contactData.client;
                          return (
                            <SelectItem 
                              key={client.id} 
                              value={client.id.toString()}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                                  {client.username.charAt(0).toUpperCase()}
                                </div>
                                <span>{client.username}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Selected Client Info Card */}
                {selectedClientId && selectedContact && (
                  <div className="flex items-center p-4 border-2 rounded-lg border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 mb-4">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mr-4 shadow-sm">
                      {selectedContact.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                        {selectedContact.username}
                      </h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Client
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Messaging Interface */}
                {selectedClientId && (
                  <MessagingInterface
                    trainerId={user!.id}
                    clientId={selectedClientId}
                    currentUserId={user!.id}
                    trainerName={user?.username}
                    clientName={selectedContact?.username}
                  />
                )}
              </div>
            ) : contacts.length > 1 ? (
              // CLIENT VIEW with multiple trainers - Trainer Dropdown Selector
              <div className="flex flex-col gap-6">
                <div className="mb-2">
                  <label htmlFor="trainer-select" className="block text-sm font-medium mb-2 text-indigo-700 dark:text-indigo-400">
                    Select a trainer to message
                  </label>
                  
                  <Select
                    onValueChange={(value) => setSelectedTrainerId(parseInt(value))}
                    value={selectedTrainerId?.toString()}
                  >
                    <SelectTrigger className="w-full md:w-[350px] bg-white dark:bg-gray-800 border-2 border-indigo-100 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700">
                      <SelectValue placeholder="Select a trainer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Your Trainers</SelectLabel>
                        {contacts.map((contactData: Trainer) => {
                          const trainer = contactData.trainer;
                          return (
                            <SelectItem 
                              key={trainer.id} 
                              value={trainer.id.toString()}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center">
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-2">
                                  {trainer.username.charAt(0).toUpperCase()}
                                </div>
                                <span>{trainer.username}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Selected Trainer Info Card */}
                {selectedTrainerId && selectedContact && (
                  <div className="flex items-center p-4 border-2 rounded-lg border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 mb-4">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mr-4 shadow-sm">
                      {selectedContact.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                        {selectedContact.username}
                      </h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Personal Trainer
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Messaging Interface */}
                {selectedTrainerId && (
                  <MessagingInterface
                    trainerId={selectedTrainerId}
                    clientId={user!.id}
                    currentUserId={user!.id}
                    trainerName={selectedContact?.username}
                    clientName={user?.username}
                  />
                )}
              </div>
            ) : (
              // CLIENT VIEW with a single trainer - Direct to messaging
              <div className="flex flex-col gap-4">
                {/* Condensed trainer info in a horizontal card */}
                <div className="flex items-center p-4 border-2 rounded-lg border-indigo-100 dark:border-indigo-900/40 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 mb-4">
                  {(() => {
                    const contactInfo = (contacts[0] as Trainer).trainer;
                    
                    return (
                      <>
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mr-4 shadow-sm">
                          {contactInfo.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-blue-800 dark:text-blue-300">{contactInfo.username}</h4>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Personal Trainer</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                
                {/* Full messaging interface */}
                {selectedTrainerId && (
                  <MessagingInterface
                    trainerId={selectedTrainerId}
                    clientId={user!.id}
                    currentUserId={user!.id}
                    trainerName={selectedContact?.username}
                    clientName={user?.username}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}