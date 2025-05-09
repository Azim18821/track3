import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { 
  Loader2, Send, MessageSquare, WifiOff, 
  Video, Image as ImageIcon, FileText as FileIcon, X, Upload, Camera, 
  Plus, ChevronDown, ChevronUp, Paperclip, Film
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isWebSocketConnected, sendWebSocketMessage, MESSAGE_RECEIVED_EVENT } from "@/lib/websocket";

interface Message {
  id: number;
  trainerId: number;
  clientId: number;
  senderId: number;
  content: string;
  messageType?: 'text' | 'video' | 'image' | 'file';
  mediaUrl?: string;
  thumbnailUrl?: string;
  sentAt: string;
  isRead: boolean;
}

interface MessagingInterfaceProps {
  trainerId: number;
  clientId: number;
  currentUserId: number;
  trainerName?: string;
  clientName?: string;
}

const MessagingInterface = ({
  trainerId,
  clientId,
  currentUserId,
  trainerName = "Trainer",
  clientName = "Client",
}: MessagingInterfaceProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // State for media attachments
  const [mediaType, setMediaType] = useState<'text' | 'video' | 'image' | 'file'>('text');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Determine if the current user is the trainer or client
  const isTrainer = currentUserId === trainerId;
  
  // Get the name of the other party
  const otherPartyName = isTrainer ? clientName : trainerName;
  
  // State for WebSocket status and pending messages
  const [wsConnected, setWsConnected] = useState<boolean>(isWebSocketConnected());
  const [pendingMessages, setPendingMessages] = useState<Message[]>([]);

  // Fetch messages between trainer and client
  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery<Message[]>({
    queryKey: ["/api/messages", trainerId, clientId],
    queryFn: async () => {
      try {
        const res = await apiRequest(
          "GET",
          `/api/messages/${trainerId}/${clientId}`
        );
        
        if (!res.ok) {
          // Try to parse error message from response
          try {
            const errorData = await res.json();
            throw new Error(errorData.message || "Failed to fetch messages");
          } catch (jsonError) {
            // If we can't parse JSON, use the status text
            throw new Error(`Failed to fetch messages: ${res.status} ${res.statusText}`);
          }
        }
        
        return res.json();
      } catch (err: any) {
        // Don't rethrow - return empty array instead to avoid breaking the UI
        return [];
      }
    },
    refetchInterval: 10000, // Refetch every 10 seconds to get new messages
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Exponential backoff
  });

  // Mutation to send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async (data: {
      content: string;
      messageType?: 'text' | 'video' | 'image' | 'file';
      mediaUrl?: string;
      thumbnailUrl?: string;
    }) => {
      try {
        const res = await apiRequest("POST", "/api/messages", {
          trainerId,
          clientId,
          ...data
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Failed to send message");
        }
        
        return res.json();
      } catch (err: any) {
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages", trainerId, clientId] });
      // Also invalidate unread count to update badge in sidebar
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread/count"] });
      setNewMessage("");
      setMediaFile(null);
      setMediaType('text');
      setUploadProgress(0);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "There was an error sending your message",
        variant: "destructive",
      });
    },
  });
  
  // Mutation to upload media files
  const uploadMediaMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        setIsUploading(true);
        
        // Create a FormData object to send the file
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', mediaType);
        formData.append('trainerId', trainerId.toString());
        formData.append('clientId', clientId.toString());
        
        // Use XMLHttpRequest to track upload progress
        return new Promise<{ mediaUrl: string; thumbnailUrl?: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentage = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(percentage);
            }
          });
          
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                reject(new Error('Failed to parse server response'));
              }
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });
          
          xhr.addEventListener('error', () => {
            reject(new Error('Network error occurred during upload'));
          });
          
          xhr.addEventListener('abort', () => {
            reject(new Error('Upload was aborted'));
          });
          
          xhr.open('POST', '/api/messages/upload');
          xhr.send(formData);
        });
      } catch (err: any) {
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: (result) => {
      // Send the message with the media URL
      sendMessageMutation.mutate({
        content: newMessage || `Shared a ${mediaType}`, // Use message text or default
        messageType: mediaType,
        mediaUrl: result.mediaUrl,
        thumbnailUrl: result.thumbnailUrl
      });
    },
    onError: (error: any) => {
      toast({
        title: `Failed to upload ${mediaType}`,
        description: error.message || `There was an error uploading your ${mediaType}`,
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  // Listen for WebSocket events
  useEffect(() => {
    // Function to handle custom message received events
    const handleMessageReceived = (event: CustomEvent) => {
      try {
        const data = event.detail;
        
        // Check if this message is relevant to this conversation
        if (data && 
            ((data.trainerId === trainerId && data.clientId === clientId) ||
             (data.senderId === currentUserId && 
              (data.recipientId === trainerId || data.recipientId === clientId)))) {
          
          // Create a temporary pending message to show immediately
          const tempMessage: Message = {
            id: Date.now(), // Temporary ID that will be replaced when we refresh
            trainerId: data.trainerId,
            clientId: data.clientId,
            senderId: data.senderId,
            content: data.content,
            messageType: data.messageType || 'text',
            mediaUrl: data.mediaUrl,
            thumbnailUrl: data.thumbnailUrl,
            sentAt: data.timestamp || new Date().toISOString(),
            isRead: false
          };
          
          // Message received and will be displayed via the pending messages state
          
          // Add to pending messages
          setPendingMessages(prev => [...prev, tempMessage]);
          
          // Play notification sound if the message is from the other person
          if (data.senderId !== currentUserId) {
            // Simple browser notification
            const notificationText = `New message from ${isTrainer ? clientName : trainerName}`;
            toast({
              title: notificationText,
              description: data.content.length > 50 ? data.content.substring(0, 50) + '...' : data.content,
              variant: 'default',
            });
          }
          
          // Trigger a refetch to get the actual persisted message
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["/api/messages", trainerId, clientId] });
          }, 1000);
        }
      } catch (error) {
        // Silent error handling for websocket events
      }
    };
    
    // Add event listener for custom message events
    window.addEventListener(MESSAGE_RECEIVED_EVENT, handleMessageReceived as EventListener);
    
    return () => {
      // Clean up event listener when component unmounts
      window.removeEventListener(MESSAGE_RECEIVED_EVENT, handleMessageReceived as EventListener);
    };
  }, [trainerId, clientId, currentUserId, queryClient, clientName, trainerName, isTrainer, toast]);
  
  // Check WebSocket status periodically
  useEffect(() => {
    const checkWebSocketStatus = () => {
      const isConnected = isWebSocketConnected();
      setWsConnected(isConnected);
    };
    
    // Check immediately
    checkWebSocketStatus();
    
    // Set up interval to check WebSocket status
    const wsCheckInterval = setInterval(checkWebSocketStatus, 5000);
    
    return () => {
      clearInterval(wsCheckInterval);
    };
  }, []);
  
  // Scroll to bottom of messages when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, pendingMessages]);

  // Handle file input change
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'image' | 'file') => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file size (limit to 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 50MB",
          variant: "destructive",
        });
        return;
      }
      
      // Set the media type and file
      setMediaType(type);
      setMediaFile(file);
      
      // Set a descriptive message if none exists
      if (!newMessage.trim()) {
        setNewMessage(`Shared a ${type.toLowerCase()}`);
      }
      
      // Close the attachment menu
      setShowAttachMenu(false);
    }
  };
  
  // Handle sending a message
  const handleSendMessage = () => {
    // If there's a media file to upload
    if (mediaFile && mediaType !== 'text') {
      uploadMediaMutation.mutate(mediaFile);
      return;
    }
    
    // For text-only messages
    if (newMessage.trim()) {
      // Send with regular HTTP API
      sendMessageMutation.mutate({
        content: newMessage,
        messageType: 'text'
      });
      
      // If WebSocket is connected, also send via WebSocket for immediate delivery
      if (wsConnected) {
        try {
          // Send a message notification through WebSocket
          sendWebSocketMessage('message_sent', {
            trainerId,
            clientId,
            content: newMessage,
            messageType: 'text',
            senderId: currentUserId,
            recipientId: isTrainer ? clientId : trainerId,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          // Silent error handling since HTTP fallback is already happening
        }
      }
    }
  };
  
  // Cancel media upload
  const handleCancelMedia = () => {
    setMediaFile(null);
    setMediaType('text');
    setUploadProgress(0);
  };

  // Handle keyboard input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  function formatMessageTime(dateString: string) {
    const date = new Date(dateString);
    return format(date, "MMM d, h:mm a");
  }

  // File change handlers for the hidden file inputs
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'image' | 'video') => {
    // Delegate to the main file handler function
    handleFileInputChange(event, type);
  };
  
  return (
    <Card className="h-full flex flex-col border-2 border-indigo-100 dark:border-indigo-900/40 shadow-md">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'file')}
        accept="*/*"
      />
      <input
        type="file"
        ref={imageInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'image')}
        accept="image/*"
      />
      <input
        type="file"
        ref={videoInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleFileChange(e, 'video')}
        accept="video/*"
      />
      
      <CardHeader className="py-2 px-3 md:px-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60">
        <CardTitle className="flex justify-between items-center text-blue-700 dark:text-blue-400 text-sm md:text-base">
          <span className="flex items-center">
            <MessageSquare className="mr-1 md:mr-2 h-4 w-4 md:h-5 md:w-5 text-blue-600 dark:text-blue-400" />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent truncate">
              {otherPartyName}
            </span>
          </span>
          <div className="flex items-center text-[10px] md:text-xs">
            {wsConnected ? (
              <span className="flex items-center text-green-600 dark:text-green-400">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 dark:bg-green-400 mr-1 animate-pulse"></div>
                Live
              </span>
            ) : (
              <span className="flex items-center text-gray-400 dark:text-gray-500">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <Separator className="bg-indigo-100 dark:bg-indigo-900/40" />
      <CardContent className="flex-grow overflow-y-auto p-2 md:p-4 space-y-2 md:space-y-3 h-[calc(100%-100px)] md:h-[400px] bg-gradient-to-b from-white dark:from-gray-800 to-indigo-50/30 dark:to-indigo-900/30">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 dark:text-indigo-400 mb-2" />
            <p className="text-sm text-indigo-600 dark:text-indigo-400">Loading messages...</p>
          </div>
        ) : error ? (
          <div className="text-center py-6 px-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-900/40 max-w-md mx-auto">
              <p className="mb-3 text-sm text-red-600 dark:text-red-400">Failed to load messages. Please try again.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.reload()}
                className="mx-auto border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <Loader2 className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-6 md:py-10 px-2 md:px-4">
            <div className="rounded-full bg-blue-50 dark:bg-blue-900/40 p-3 md:p-4 mx-auto w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-3 md:mb-4">
              <MessageSquare className="h-6 w-6 md:h-8 md:w-8 text-blue-500 dark:text-blue-400" />
            </div>
            <h3 className="text-base md:text-lg font-medium mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Start Your Conversation
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4 max-w-md mx-auto">
              Send a message to begin your fitness journey with {otherPartyName}.
              Get personalized advice, workout tips, and track your progress together!
            </p>
            <div className="flex justify-center">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-2 md:p-3 border border-blue-100 dark:border-blue-900 max-w-md text-left">
                <p className="text-xs md:text-sm italic text-blue-700 dark:text-blue-300">
                  "Hi {otherPartyName}! I'm excited to start working with you on my fitness goals."
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNewMessage("Hi " + otherPartyName + "! I'm excited to start working with you on my fitness goals.");
                    // Focus on the textarea
                    const textarea = document.querySelector('textarea');
                    if (textarea) textarea.focus();
                  }}
                  className="mt-1 md:mt-2 text-xs w-full justify-start text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:bg-blue-100/50 dark:hover:bg-blue-800/30 p-1"
                >
                  Use this message →
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Combine regular messages and pending messages for display
          [...messages, ...pendingMessages]
            // Sort by sent time
            .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
            // Remove duplicates (WebSocket messages that have been persisted)
            .filter((message, index, self) => 
              index === self.findIndex(m => m.content === message.content && m.senderId === message.senderId && 
                new Date(m.sentAt).getTime() - new Date(message.sentAt).getTime() < 5000)
            )
            .map((message) => {
              const isCurrentUserSender = message.senderId === currentUserId;
              const isPending = !message.id || message.id > 9999999999; // Check if it's a temporary pending message
              
              return (
                <div
                  key={message.id}
                  className={`flex ${isCurrentUserSender ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[80%] p-2.5 md:p-3.5 rounded-lg break-words shadow-sm ${
                      isCurrentUserSender
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        : "bg-white/95 dark:bg-gray-800/95 border border-indigo-100/70 dark:border-indigo-900/50"
                    } ${isPending ? "opacity-70" : ""}`}
                  >
                    {message.mediaUrl && message.messageType === 'video' && (
                      <div className="mb-2">
                        <video 
                          controls 
                          src={message.mediaUrl} 
                          className="rounded max-w-full max-h-[250px] mb-2"
                          poster={message.thumbnailUrl}
                        />
                      </div>
                    )}
                    
                    {message.mediaUrl && message.messageType === 'image' && (
                      <div className="mb-2">
                        <img 
                          src={message.mediaUrl} 
                          alt="Shared image" 
                          className="rounded max-w-full max-h-[250px] mb-2 object-contain"
                          onClick={() => window.open(message.mediaUrl, '_blank')}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    )}
                    
                    {message.mediaUrl && message.messageType === 'file' && (
                      <div className="flex items-center mb-2 p-1.5 bg-white/20 dark:bg-black/20 rounded">
                        <FileIcon className="h-4 w-4 mr-2" />
                        <a 
                          href={message.mediaUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`text-xs underline ${isCurrentUserSender ? "text-blue-100" : "text-blue-600 dark:text-blue-400"}`}
                        >
                          {message.mediaUrl.split('/').pop()}
                        </a>
                      </div>
                    )}
                    
                    <div className={`text-xs md:text-sm leading-relaxed ${isCurrentUserSender ? "text-white" : "text-gray-800 dark:text-gray-200"}`}>
                      {message.content}
                    </div>
                    <div className={`text-[10px] md:text-xs mt-1.5 flex items-center ${
                      isCurrentUserSender 
                        ? "text-white/70" 
                        : "text-gray-500 dark:text-gray-400"
                    }`}>
                      {formatMessageTime(message.sentAt)}
                      {isPending && (
                        <span className="ml-1 md:ml-2 flex items-center">
                          <Loader2 className="h-2 w-2 mr-0.5 md:mr-1 animate-spin" />
                          <span className="text-[8px] md:text-[10px]">Sending...</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="pt-2 pb-2 md:pt-3 md:pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60">
        {/* File input elements now at the top of the component */}
        
        <div className="flex w-full flex-col space-y-2">
          {/* Media preview and upload progress */}
          {mediaFile && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-2 flex items-center justify-between">
              <div className="flex items-center">
                {mediaType === 'video' && <Film className="h-4 w-4 mr-2 text-blue-600" />}
                {mediaType === 'image' && <ImageIcon className="h-4 w-4 mr-2 text-blue-600" />}
                {mediaType === 'file' && <FileIcon className="h-4 w-4 mr-2 text-blue-600" />}
                <span className="text-xs text-blue-700 dark:text-blue-300 truncate max-w-[150px]">
                  {mediaFile.name}
                </span>
              </div>
              
              {isUploading ? (
                <div className="flex items-center">
                  <div className="h-1.5 w-24 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden mr-2">
                    <div 
                      className="h-full bg-blue-600 dark:bg-blue-400 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-blue-700 dark:text-blue-300">{uploadProgress}%</span>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancelMedia}
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3 text-blue-700 dark:text-blue-300" />
                </Button>
              )}
            </div>
          )}
          
          {/* Message input area */}
          <div className="flex w-full space-x-2 md:space-x-3">
            <div className="relative flex-grow">
              <Textarea
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-grow resize-none text-sm rounded-lg border border-indigo-200 dark:border-indigo-900/50 focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-600 min-h-[60px] md:min-h-[80px] bg-white dark:bg-gray-800 dark:text-gray-200 shadow-sm pr-10"
                maxLength={1000}
                rows={2}
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 bottom-2 h-8 w-8 rounded-full opacity-70 hover:opacity-100 text-blue-600 dark:text-blue-400"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => videoInputRef.current?.click()}>
                    <Film className="mr-2 h-4 w-4" />
                    <span>Video</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => imageInputRef.current?.click()}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    <span>Image</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                    <FileIcon className="mr-2 h-4 w-4" />
                    <span>File</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <Button
              onClick={handleSendMessage}
              disabled={(mediaType === 'text' && !newMessage.trim()) || sendMessageMutation.isPending || isUploading}
              type="submit"
              size="icon"
              className="h-auto w-10 md:w-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg shadow-sm transition-colors duration-200 disabled:opacity-50 disabled:shadow-none"
            >
              {sendMessageMutation.isPending || isUploading ? (
                <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
};

export default MessagingInterface;