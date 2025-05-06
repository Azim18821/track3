# WebSocket Implementation Guide

This document describes the WebSocket implementation in the fitness tracking application, providing an overview of real-time messaging features.

## Overview

The application uses WebSockets to provide real-time communication between clients and trainers. This enables instant messaging, notifications, and real-time updates.

## Architecture

1. **Server-side**: WebSocket server initialized in `server/routes.ts`
2. **Client-side**: WebSocket client connection managed in `client/src/lib/websocket.ts`
3. **UI Components**: Message interface in `client/src/components/MessagingInterface.tsx`

## Server Implementation

The WebSocket server is initialized in `server/routes.ts`:

```typescript
// Import the WebSocketServer
import { WebSocketServer, WebSocket } from 'ws';

// Initialize WebSocket server
const wss = new WebSocketServer({ 
  server: httpServer, 
  path: '/ws' 
});

// Handle connections
wss.on('connection', (ws) => {
  // Connection handling logic
  ws.on('message', (message) => {
    // Message handling logic
  });
  
  ws.on('close', () => {
    // Connection close handling
  });
});
```

## Client Implementation

The client connects to the WebSocket server in `client/src/lib/websocket.ts`:

```typescript
// Determine WebSocket protocol based on current protocol
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${protocol}//${window.location.host}/ws`;

// Create WebSocket connection
const socket = new WebSocket(wsUrl);
```

## Message Format

Messages are sent in JSON format:

```typescript
interface WebSocketMessage {
  type: 'chat' | 'notification' | 'status';
  content: string;
  senderId: number;
  recipientId: number;
  timestamp: string;
  messageId?: string;
}
```

## Events

### Server Events

- `connection`: New client connected
- `message`: Incoming message from client
- `close`: Client disconnected

### Client Events

- `open`: Connection established
- `message`: Incoming message from server
- `close`: Connection closed
- `error`: Connection error

## Custom Events

The application uses custom events to handle WebSocket messages:

```typescript
// Dispatch a custom event when a message is received
const event = new CustomEvent('ws-message', { 
  detail: { 
    message: parsedData 
  } 
});
document.dispatchEvent(event);
```

## Testing

A test script is available to test WebSocket functionality:

```bash
node utils/test-websocket.js
```

## Error Handling

- Connection failures fallback to HTTP requests
- Automatic reconnection on lost connections
- Message delivery confirmation

## Debugging

Set the `WS_DEBUG` flag to true in `client/src/lib/websocket.ts` to enable detailed logging for WebSocket operations.

## Best Practices

1. Always check connection state before sending messages
2. Use a unique client ID for each connection
3. Implement message acknowledgments for critical messages
4. Clean up event listeners when components unmount
5. Include error handling for all WebSocket operations

## Common Issues

- **Connection refused**: Verify server is running and WebSocket path is correct
- **Failed to authenticate**: Check if user is logged in and session is valid
- **Message not delivered**: Verify recipient is connected and message format is correct