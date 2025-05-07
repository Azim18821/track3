import { useState, useRef, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Brain, Send, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface CoachChatInterfaceProps {
  planData?: any;
  quickMode?: boolean;
}

interface CoachMessageResponse {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string | Date;
  }>;
}

export default function CoachChatInterface({ planData, quickMode = false }: CoachChatInterfaceProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHistory, setIsFetchingHistory] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch conversation history from server
  const { data: messageHistory, isLoading: isLoadingHistory, error: historyError, refetch: refetchHistory } = useQuery<CoachMessageResponse>({
    queryKey: ['/api/coach/messages'],
    enabled: !!user, // Only fetch if user is logged in
  });
  
  // Process the message history data when it changes
  useEffect(() => {
    if (messageHistory?.messages && Array.isArray(messageHistory.messages) && messageHistory.messages.length > 0) {
      // Format timestamps correctly - server provides string dates
      const formattedMessages = messageHistory.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      setMessages(formattedMessages);
      setIsFetchingHistory(false);
    } else if (messageHistory) {
      // No history found, show welcome message after checking
      setIsFetchingHistory(false);
    }
  }, [messageHistory]);
  
  // Handle API errors
  useEffect(() => {
    if (historyError) {
      console.error("Error fetching coach messages:", historyError);
      setIsFetchingHistory(false);
      // Don't show error toast for permission errors - just fallback to welcome message
      if (!historyError.toString().includes("403")) {
        toast({
          title: "Could not load conversation history",
          description: "Using a new conversation instead",
          variant: "destructive"
        });
      }
    }
  }, [historyError, toast]);
  
  // Add welcome message only if we have no history and finished checking
  useEffect(() => {
    if (!isFetchingHistory && messages.length === 0) {
      // If in quick mode (no plan), provide a helpful but limited greeting
      if (quickMode) {
        setMessages([
          {
            role: "assistant",
            content: `Hi ${user?.username || "there"}! I'm your AI Fitness Coach. While we don't have a personalized plan for you yet, I'm happy to answer general fitness questions about workouts, nutrition, or exercise techniques. Feel free to ask anything, and I recommend creating a personalized fitness plan for more tailored advice.`,
            timestamp: new Date()
          }
        ]);
      }
      // If there's plan data, provide a more personalized greeting
      else if (planData) {
        const goalType = planData.preferences?.goal || '';
        const goalText = goalType === 'weight_loss' ? 'weight loss' : 
                        goalType === 'muscle_gain' ? 'muscle gain' : 
                        goalType === 'endurance' ? 'endurance training' : 
                        'fitness';
        
        setMessages([
          {
            role: "assistant",
            content: `Hi ${user?.username || "there"}! I'm your AI Fitness Coach. I've analyzed your ${goalText} plan and I'm here to help you optimize it. Would you like me to suggest ways to improve your plan or provide tips on how to follow it effectively?`,
            timestamp: new Date()
          }
        ]);
      } else {
        // Standard greeting if no plan data and not in quick mode
        setMessages([
          {
            role: "assistant",
            content: `Hi ${user?.username || "there"}! I'm your AI Fitness Coach. I can help you with workout plans, nutrition advice, and tracking your progress. How can I assist you today?`,
            timestamp: new Date()
          }
        ]);
      }
    }
  }, [user, messages.length, planData, quickMode, isFetchingHistory]);
  
  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      // Send message to API with context about whether this is quick mode
      const response = await apiRequest("POST", "/api/coach/chat", { 
        message: input,
        quickMode: quickMode || false,
        hasPlan: !!planData
      });
      const data = await response.json();
      
      if (response.ok) {
        // Add assistant response to chat
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            timestamp: new Date()
          }
        ]);
      } else {
        toast({
          title: "Communication Error",
          description: data.message || "Failed to get a response from your AI coach",
          variant: "destructive"
        });
        
        // Add error message to chat
        setMessages(prev => [
          ...prev,
          {
            role: "assistant",
            content: "I'm having trouble connecting right now. Please try again in a moment.",
            timestamp: new Date()
          }
        ]);
      }
    } catch (error) {
      console.error("Error communicating with AI coach:", error);
      toast({
        title: "Connection Error",
        description: "Failed to communicate with your AI coach",
        variant: "destructive"
      });
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  return (
    <Card className="flex flex-col h-full shadow-lg border-indigo-100 dark:border-indigo-900/50 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-2 px-4">
        <div className="flex items-center space-x-2">
          <Avatar className="h-7 w-7 bg-white">
            <AvatarFallback className="text-indigo-600">
              <Brain className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-base font-medium">AI Fitness Coach</CardTitle>
        </div>
      </CardHeader>
      
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isLoadingHistory ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mb-2 mx-auto text-indigo-500" />
              <p className="text-sm text-gray-500">Loading conversation history...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Refresh conversation button */}
            {messages.length > 1 && (
              <div className="flex justify-center my-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700 flex items-center gap-1"
                  onClick={() => {
                    refetchHistory();
                    setIsFetchingHistory(true);
                  }}
                >
                  <RotateCcw className="h-3 w-3" /> Refresh Conversation
                </Button>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    message.role === "user" 
                      ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-900 dark:text-indigo-100" 
                      : "bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center mb-1 space-x-1">
                      <Sparkles className="h-3 w-3 text-indigo-500" />
                      <span className="text-xs font-medium text-indigo-500">AI Coach</span>
                    </div>
                  )}
                  
                  <div className="whitespace-pre-wrap text-sm break-words">
                    {message.content}
                  </div>
                  
                  <div className="mt-1 text-right">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(message.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      <CardFooter className="p-2 border-t border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-gray-900">
        <div className="flex w-full items-center space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your AI coach a question..."
            className="min-h-[40px] max-h-[80px] py-1 px-3 flex-1 text-sm resize-none rounded-full border-gray-200 dark:border-gray-700 focus:border-indigo-300 dark:focus:border-indigo-700"
            disabled={isLoading}
          />
          <Button 
            size="sm"
            onClick={handleSendMessage}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600 rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-sm"
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}