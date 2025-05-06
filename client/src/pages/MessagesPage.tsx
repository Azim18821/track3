import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, MessageSquare, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import MessagingInterface from '@/components/MessagingInterface';
import { useIsMobile } from '@/hooks/use-mobile';

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

export default function MessagesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | null>(null);
  const [showTrainerList, setShowTrainerList] = useState(true);
  const isMobile = useIsMobile();

  // Fetch trainers for clients or clients for trainers depending on user role
  const { data: contacts, isLoading } = useQuery({
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

  // Define interface for client in trainer view
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

  // Set first contact (trainer or client) as selected by default when data loads
  // and automatically go to messaging view since users typically have just one trainer/client
  useEffect(() => {
    if (contacts && contacts.length > 0 && !selectedTrainerId) {
      // If user is trainer, use client ID for messaging
      if (user?.isTrainer) {
        const firstClient = contacts[0] as Client;
        setSelectedTrainerId(user.id); // Trainer ID is current user
        // We'll use the client ID elsewhere
      } else {
        // If user is client, use trainer ID for messaging
        const firstTrainer = contacts[0] as Trainer;
        setSelectedTrainerId(firstTrainer.trainer.id);
      }
      
      // Always go directly to the messaging interface for clients with one trainer
      if (!user?.isTrainer && contacts.length === 1) {
        setShowTrainerList(false);
      }
      // For trainers or mobile users, always hide the list
      else if (isMobile) {
        setShowTrainerList(false);
      }
    }
  }, [contacts, selectedTrainerId, isMobile, user]);

  if (isLoading) {
    return (
      <div className="container py-4 md:py-10 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Check if user has any contacts (trainers or clients)
  const hasContacts = contacts && contacts.length > 0;
  
  // Get the selected contact info (trainer or client)
  let selectedContact = null;
  if (user?.isTrainer) {
    selectedContact = contacts?.find((c: Client) => c.client.id === selectedTrainerId)?.client;
  } else {
    selectedContact = contacts?.find((t: Trainer) => t.trainer.id === selectedTrainerId)?.trainer;
  }

  // Check if user is a trainer
  const isTrainer = user?.isTrainer;

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

      {hasContacts ? (
        <Card className="border-2 border-indigo-100 dark:border-indigo-900/40 shadow-md overflow-hidden">
          {/* Mobile back button when viewing chat */}
          {isMobile && !showTrainerList && selectedContact && (
            <div className="flex items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 p-3 border-b border-indigo-100 dark:border-indigo-900/40">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center text-blue-700 dark:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30"
                onClick={() => setShowTrainerList(true)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to {isTrainer ? "clients" : "trainers"}
              </Button>
              <div className="flex items-center ml-2">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-2 shadow-sm">
                  {selectedContact.username.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-blue-800 dark:text-blue-300">
                  {selectedContact.username}
                </span>
              </div>
            </div>
          )}

          {/* Regular header when not in mobile chat view */}
          {(!isMobile || showTrainerList) && (
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 py-4 px-4 md:px-6">
              <CardTitle className="text-lg md:text-xl flex items-center">
                <div className="bg-blue-100 rounded-full p-2 mr-2 md:mr-3">
                  <MessageSquare className="text-blue-600" size={isMobile ? 16 : 20} />
                </div>
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {isTrainer ? "Your Clients" : "Your Personal Trainer"}
                </span>
              </CardTitle>
            </CardHeader>
          )}

          <CardContent className={`p-0 md:p-6 ${isMobile ? 'h-[calc(100vh-220px)]' : ''}`}>
            {/* On mobile: Two-column layout with conditional rendering */}
            {isMobile ? (
              <>
                {showTrainerList ? (
                  // Mobile Trainer List View
                  <div className="p-4">
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-indigo-700">
                        {isTrainer ? "Select a client to message" : "Select a trainer to message"}
                      </h3>
                      
                      {contacts.map((contactData: any) => {
                        // Depending on trainer/client view, extract the correct data
                        const contactInfo = isTrainer 
                          ? contactData.client 
                          : contactData.trainer;
                        const relationship = contactData.relationship;
                        
                        return (
                          <div 
                            key={contactInfo.id}
                            className="border border-indigo-100 rounded-lg overflow-hidden shadow-sm"
                            onClick={() => {
                              setSelectedTrainerId(contactInfo.id);
                              setShowTrainerList(false);
                            }}
                          >
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 p-3 flex items-center">
                              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mr-3">
                                {contactInfo.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-semibold text-blue-800 dark:text-blue-300">{contactInfo.username}</h4>
                                <p className="text-xs text-blue-600 dark:text-blue-400">{isTrainer ? "Client" : "Personal Trainer"}</p>
                              </div>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3">
                              <div className="text-xs text-indigo-600 dark:text-indigo-400 p-2 rounded bg-indigo-50/50 dark:bg-indigo-900/30 border border-indigo-100/50 dark:border-indigo-900/50">
                                <p className="font-medium mb-1">{isTrainer ? "Client's Info:" : "Trainer's Note:"}</p>
                                <p className="italic text-gray-700 dark:text-gray-300">{relationship.notes || "Working together on fitness goals!"}</p>
                              </div>
                              <Button 
                                variant="outline"
                                size="sm"
                                className="w-full mt-3 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300"
                              >
                                {isTrainer ? "Message Client" : "Message Trainer"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Mobile Chat View
                  <div className="h-full">
                    {selectedTrainerId && (
                      <MessagingInterface
                        trainerId={isTrainer ? user!.id : selectedTrainerId}
                        clientId={isTrainer ? selectedTrainerId : user!.id}
                        currentUserId={user!.id}
                        trainerName={isTrainer ? user?.username : selectedContact?.username}
                        clientName={isTrainer ? selectedContact?.username : user?.username}
                      />
                    )}
                  </div>
                )}
              </>
            ) : (
              // Desktop: Simplified layout - go straight to messaging for clients with one trainer
              (!user?.isTrainer && contacts.length === 1) ? (
                // For clients with a single trainer, show only the messaging interface
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Condensed trainer info in a horizontal card for desktop */}
                  <div className="w-full border-2 border-indigo-100 dark:border-indigo-900/40 rounded-lg overflow-hidden shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 p-4 mb-4">
                    <div className="flex items-center">
                      {/* Get the appropriate object based on user role */}
                      {(() => {
                        const contactInfo = contacts[0].trainer;
                        const relationship = contacts[0].relationship;
                        
                        return (
                          <>
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-sm">
                              {contactInfo.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-4">
                              <h4 className="font-semibold text-blue-800 dark:text-blue-300">{contactInfo.username}</h4>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Personal Trainer</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {/* Full-width messaging interface */}
                  <div className="w-full">
                    <MessagingInterface
                      trainerId={selectedTrainerId}
                      clientId={user!.id}
                      currentUserId={user!.id}
                      trainerName={selectedContact?.username}
                      clientName={user?.username}
                    />
                  </div>
                </div>
              ) : (
                // Traditional two-column layout for trainers or clients with multiple trainers
                <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                  {/* Trainer selection sidebar */}
                  <div className="md:col-span-4 lg:col-span-3">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium mb-1 text-indigo-700 dark:text-indigo-400">
                        {isTrainer ? "Your Clients" : "Your Trainer"}
                      </h3>
                      
                      <div className="border-2 border-indigo-100 dark:border-indigo-900/40 rounded-lg overflow-hidden shadow-sm">
                        {contacts.length === 1 ? (
                          // Simple display for single contact
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 p-4">
                            <div className="mb-3 flex items-center justify-center">
                              {/* Get the appropriate object based on user role */}
                              {(() => {
                                const contactInfo = isTrainer 
                                  ? contacts[0].client 
                                  : contacts[0].trainer;
                                const relationship = contacts[0].relationship;
                                
                                return (
                                  <>
                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-sm">
                                      {contactInfo.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="ml-4 text-left">
                                      <h4 className="font-semibold text-blue-800 dark:text-blue-300">{contactInfo.username}</h4>
                                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{isTrainer ? "Client" : "Personal Trainer"}</p>
                                      <div className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
                                        <p className="font-medium mb-1">{isTrainer ? "Client Notes:" : "Trainer's Note:"}</p>
                                        <p className="italic text-gray-700 dark:text-gray-300">{relationship.notes || "Working together on fitness goals!"}</p>
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        ) : (
                          // List for multiple contacts
                          <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
                            {contacts.map((contactData: any) => {
                              // Get appropriate info based on user role
                              const contactInfo = isTrainer 
                                ? contactData.client 
                                : contactData.trainer;
                                
                              return (
                                <button
                                  key={contactInfo.id}
                                  className={`w-full text-left px-4 py-3 transition-colors ${
                                    selectedTrainerId === contactInfo.id
                                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white dark:from-blue-500 dark:to-indigo-500'
                                      : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-gray-700'
                                  }`}
                                  onClick={() => setSelectedTrainerId(contactInfo.id)}
                                >
                                  <div className="flex items-center">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm font-bold ${
                                      selectedTrainerId === contactInfo.id 
                                        ? 'bg-white/20 text-white' 
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                                    }`}>
                                      {contactInfo.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="font-medium">{contactInfo.username}</div>
                                      <div className={`text-xs ${
                                        selectedTrainerId === contactInfo.id 
                                          ? 'text-white/80' 
                                          : 'text-blue-600 dark:text-blue-400'
                                      }`}>
                                        {selectedTrainerId === contactInfo.id 
                                          ? 'Currently selected'
                                          : isTrainer ? 'Client' : 'Trainer'}
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messaging area */}
                  <div className="md:col-span-8 lg:col-span-9">
                    {selectedTrainerId ? (
                      <MessagingInterface
                        trainerId={isTrainer ? user!.id : selectedTrainerId}
                        clientId={isTrainer ? selectedTrainerId : user!.id}
                        currentUserId={user!.id}
                        trainerName={isTrainer ? user?.username : selectedContact?.username}
                        clientName={isTrainer ? selectedContact?.username : user?.username}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[400px] border-2 border-indigo-100 dark:border-indigo-900 rounded-lg bg-gradient-to-b from-white dark:from-gray-800 to-indigo-50/30 dark:to-indigo-900/30">
                        <div className="text-center text-indigo-600 dark:text-indigo-400">
                          <div className="bg-blue-100 dark:bg-blue-900/40 rounded-full p-4 mx-auto w-16 h-16 flex items-center justify-center mb-4">
                            <MessageSquare className="text-blue-600 dark:text-blue-400" size={24} />
                          </div>
                          <p className="font-medium">
                            {isTrainer 
                              ? "Select a client to start messaging" 
                              : "Select a trainer to start messaging"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </CardContent>
        </Card>
      ) : (
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
      )}
    </div>
  );
}