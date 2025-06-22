import dotenv from 'dotenv';
import app from './app.js';
import { fetchAndQueueJobs } from './Jobs/jobFetcher.js';
import cron from 'node-cron';
import { WebSocketServer } from 'ws';

// Load environment variables first
dotenv.config();

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

const wss = new WebSocketServer({ server });

// Make WebSocket server globally available for broadcasting
global.wss = wss;

wss.on('connection', ws => {
  console.log('WebSocket client connected');
  
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection_established',
    data: { message: 'Connected to job import server' }
  }));
  
  ws.on('message', message => {
    try {
      const data = JSON.parse(message);
      console.log('Received WebSocket message:', data);
      // Handle different message types if needed
    } catch (error) {
      // Invalid JSON, send echo response
      ws.send(`You said: ${message}`);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  
  ws.on('error', error => {
    // Only log actual WebSocket errors, not connection issues
    if (error.code !== 'ECONNRESET') {
      console.error('WebSocket error:', error);
    }
  });
});

cron.schedule('0 * * * *', fetchAndQueueJobs);

fetchAndQueueJobs();