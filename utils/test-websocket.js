/**
 * WebSocket Test Utility
 * 
 * This is a simple test script for debugging WebSocket connections.
 * To use it, run with Node.js: node test-websocket.js
 * 
 * This script:
 * 1. Connects to the WebSocket server
 * 2. Authenticates with a test user ID
 * 3. Sends a test message
 * 4. Listens for responses
 * 5. Closes the connection after a short delay
 */

const WebSocket = require('ws');

// Simple WebSocket test function
function runWebSocketTest() {
  console.log('WebSocket test utility available.');
  console.log('Run this file directly with Node.js to test WebSocket connections.');
}

// Only run the test when this file is executed directly
if (require.main === module) {
  console.log('Starting WebSocket test...');
  
  const ws = new WebSocket('ws://localhost:5000/ws');
  
  ws.on('open', () => {
    console.log('Connection established!');
    
    ws.send(JSON.stringify({ 
      type: 'auth', 
      token: '1' // Test user ID
    }));
    
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'message',
        data: {
          content: 'Test message',
          senderId: 1,
          trainerId: 1,
          clientId: 2,
          timestamp: new Date().toISOString()
        }
      }));
      
      setTimeout(() => ws.close(), 1000);
    }, 1000);
  });
  
  ws.on('message', (data) => {
    try {
      console.log('Received:', JSON.parse(data));
    } catch (e) {
      console.log('Received raw:', data.toString());
    }
  });
  
  ws.on('error', (error) => console.error('Error:', error));
  ws.on('close', () => console.log('Connection closed'));
} else {
  runWebSocketTest();
}
