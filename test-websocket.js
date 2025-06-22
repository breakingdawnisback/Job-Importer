// Simple WebSocket connection test
// Run this with: node test-websocket.js

const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
  ws.send('Hello Server!');
});

ws.on('message', function message(data) {
  console.log('📨 Received:', data.toString());
  ws.close();
});

ws.on('error', function error(err) {
  console.log('❌ WebSocket connection failed:', err.message);
  console.log('💡 Make sure the server is running on port 3001');
});

ws.on('close', function close() {
  console.log('🔌 WebSocket connection closed');
  process.exit(0);
});

// Timeout after 5 seconds
setTimeout(() => {
  if (ws.readyState !== WebSocket.OPEN) {
    console.log('⏰ Connection timeout - server may not be running');
    ws.close();
  }
}, 5000);