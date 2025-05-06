// WebSocket client connection for real-time data updates
import { queryClient } from './queryClient';
import { isNative } from './capacitor';
import { toast } from '@/hooks/use-toast';

// Debug flag for WebSocket operations - turn on for debugging
const WS_DEBUG = true;

// Helper function for logging when debug is enabled
function wsLog(...args: any[]) {
  if (WS_DEBUG) {
    console.log('[WebSocket]', ...args);
  }
}

interface WebSocketMessage {
  type: string;
  data: any;
}

let socket: WebSocket | null = null;
let isConnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000; // 3 seconds
let pendingAuthentication: number | null = null;

// Initialize WebSocket connection
export function initWebSocket(userId?: number) {
  if (socket?.readyState === WebSocket.OPEN) {
    // If we have an active connection and a userId to authenticate
    if (userId && pendingAuthentication !== userId) {
      authenticateWebSocket(userId);
    }
    return;
  }

  // If we're in the process of connecting, just save userId for later authentication
  if (isConnecting && userId) {
    pendingAuthentication = userId;
    return;
  }

  isConnecting = true;
  // Save userId for authentication after connection
  if (userId) {
    pendingAuthentication = userId;
  }

  try {
    let wsUrl = '';

    // Handle different environments (web browser vs native app)
    if (isNative()) {
      // For native apps, we need to use the server URL from the configuration
      // This will be the deployed server URL for production
      const serverUrl = import.meta.env.VITE_SERVER_URL || window.location.origin;
      const protocol = serverUrl.startsWith('https') ? 'wss:' : 'ws:';
      const serverHost = serverUrl.replace(/^https?:\/\//, '');
      wsUrl = `${protocol}//${serverHost}/ws`;
      wsLog(`Native app: connecting to WebSocket at ${wsUrl}`, { userId });
    } else {
      // For web browser, use relative path
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws`;
      wsLog(`Web browser: connecting to WebSocket at ${wsUrl}`, { userId });
    }

    wsLog(`Connecting to WebSocket at ${wsUrl}`, { userId });

    // Create new WebSocket connection
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (import.meta.env.DEV) {
        console.info("WebSocket: connection opened");
      }
      wsLog('Connection established successfully');
      isConnecting = false;
      reconnectAttempts = 0;

      // Send authentication if userId is available
      if (pendingAuthentication) {
        wsLog('Authenticating with user ID:', pendingAuthentication);
        authenticateWebSocket(pendingAuthentication);
      } else {
        wsLog('No user ID provided for authentication');
      }
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        wsLog('Message received:', message);
        handleWebSocketMessage(message);
      } catch (error) {
        wsLog('Error processing message:', error);
      }
    };

    socket.onclose = (event) => {
      if (import.meta.env.DEV) {
        console.info("WebSocket: connection closed", event);
      }
      wsLog(`Connection closed. Code: ${event.code}, Reason: ${event.reason}`);
      socket = null;
      isConnecting = false;

      // Try to reconnect if not a normal closure
      if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        wsLog(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
        setTimeout(() => initWebSocket(pendingAuthentication || undefined), reconnectDelay);
      }
    };

    socket.onerror = (error) => {
      if (import.meta.env.DEV) {
        console.info("WebSocket: error", error);
      }
      wsLog('Connection error:', error);
      isConnecting = false;
    };
  } catch (error) {
    wsLog('Error initializing WebSocket:', error);
    isConnecting = false;
  }
}

// Send authentication message to WebSocket server
export function authenticateWebSocket(userId: number) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    wsLog('Cannot authenticate - WebSocket not connected');
    return;
  }

  // Send authentication message with user ID as token
  // In a production app, you'd use a proper auth token
  wsLog('Sending authentication message with user ID:', userId);
  socket.send(JSON.stringify({ 
    type: 'auth', 
    token: userId.toString() 
  }));
}

// Custom event for message received
export const MESSAGE_RECEIVED_EVENT = 'ws_message_received';

// Show toast notifications for trainer-related events
function showToastForTrainerEvent(eventType: string, data: any) {
  let title = '';
  let description = '';
  let variant: 'default' | 'destructive' | null = null;

  switch(eventType) {
    case 'trainer_request_created':
      if (data.client) {
        title = 'New Trainer Request';
        description = `${data.trainer?.username || 'A trainer'} has sent you a request`;
      } else {
        title = 'Request Sent';
        description = `Request sent to ${data.client?.username || 'client'}`;
      }
      break;

    case 'trainer_request_updated':
      if (data.status === 'accepted') {
        title = data.isTrainer ? 'Client Accepted' : 'Trainer Request Accepted';
        description = data.isTrainer 
          ? `${data.client?.username || 'A client'} has accepted your request` 
          : `You are now working with ${data.trainer?.username || 'a trainer'}`;
      }
      break;

    case 'trainer_request_declined':
      title = data.isTrainer ? 'Request Declined' : 'Trainer Request Declined';
      description = data.isTrainer 
        ? `${data.client?.username || 'A client'} has declined your request` 
        : `You have declined ${data.trainer?.username || 'a trainer'}'s request`;
      variant = 'destructive';
      break;

    case 'fitness_plan_updated':
      title = 'Fitness Plan Updated';
      description = 'Your trainer has updated your fitness plan';
      break;
  }

  if (title) {
    toast({
      title,
      description,
      variant: variant || 'default',
      duration: 5000, // Show for 5 seconds
    });
  }
}

// Handle incoming WebSocket messages
function handleWebSocketMessage(message: WebSocketMessage) {
  wsLog('Handling message of type:', message.type);

  switch (message.type) {
    case 'auth_success':
      wsLog('Authentication successful');
      break;

    case 'auth_error':
      wsLog('Authentication failed:', message.data?.message);
      break;

    case 'workout_created':
    case 'workout_updated':
      wsLog('Workout updated, invalidating queries');
      // Invalidate workouts query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      break;

    case 'workout_deleted':
      wsLog('Workout deleted, invalidating queries');
      // Invalidate workouts query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      break;

    case 'meal_created':
    case 'meal_updated':
      wsLog('Meal updated, invalidating queries');
      // Invalidate meals query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition/meals'] });
      break;

    case 'meal_deleted':
      wsLog('Meal deleted, invalidating queries');
      // Invalidate meals query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/nutrition/meals'] });
      break;

    case 'message_received':
      wsLog('Message received, dispatching event with data:', message.data);
      // Dispatch custom event for real-time message
      const messageEvent = new CustomEvent(MESSAGE_RECEIVED_EVENT, { 
        detail: message.data 
      });
      window.dispatchEvent(messageEvent);

      // Also invalidate relevant message queries if possible
      if (message.data?.trainerId && message.data?.clientId) {
        wsLog('Invalidating message queries for conversation:', {
          trainerId: message.data.trainerId,
          clientId: message.data.clientId
        });

        queryClient.invalidateQueries({ 
          queryKey: ['/api/messages', message.data.trainerId, message.data.clientId] 
        });
        // Also invalidate unread count
        queryClient.invalidateQueries({ queryKey: ['/api/messages/unread/count'] });
      }
      break;

    // Handle trainer-client relationship updates
    case 'trainer_request_created':
    case 'trainer_request_updated':
    case 'trainer_request_declined':
      wsLog('Trainer request updated, invalidating relevant queries');
      // Invalidate trainer requests and clients queries
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trainer/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/trainers'] });

      // Show toast notification for the event
      showToastForTrainerEvent(message.type, message.data);
      break;

    // Handle fitness plan updates by trainer
    case 'fitness_plan_updated':
      wsLog('Fitness plan updated, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['/api/fitness-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/fitness-plans/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workouts'] });
      // Show toast notification for the fitness plan update
      showToastForTrainerEvent(message.type, message.data);
      break;

    default:
      wsLog('Unhandled message type:', message.type);
  }
}

// Close WebSocket connection
export function closeWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    wsLog('Closing connection (user logged out)');
    socket.close(1000, 'User logged out');
    socket = null;
  } else {
    wsLog('No active connection to close');
  }
}

// Check if WebSocket is connected
export function isWebSocketConnected(): boolean {
  const isConnected = socket !== null && socket.readyState === WebSocket.OPEN;
  wsLog('Connection status check:', isConnected ? 'CONNECTED' : 'DISCONNECTED');
  return isConnected;
}

// Send a message through the WebSocket
export function sendWebSocketMessage(type: string, data: any = {}) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    wsLog('Cannot send message - WebSocket not connected');
    return false;
  }

  try {
    wsLog('Sending message:', { type, data });
    socket.send(JSON.stringify({ type, data }));
    return true;
  } catch (error) {
    wsLog('Error sending message:', error);
    return false;
  }
}