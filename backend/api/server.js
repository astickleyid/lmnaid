const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const StreamingManager = require('../streaming');
const { initDatabase } = require('../database/db');

let app;
let httpServer;
let io;
let streamingManager;

function initAPIServer() {
  // Initialize Express
  app = express();
  
  // Middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Static files for HLS/DASH output
  const mediaRoot = path.join(__dirname, '../../media');
  if (!fs.existsSync(mediaRoot)) {
    fs.mkdirSync(mediaRoot, { recursive: true });
  }
  app.use('/media', express.static(mediaRoot));
  
  // HTTP Server
  httpServer = http.createServer(app);
  
  // Socket.IO
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });
  
  // Initialize database
  try {
    initDatabase();
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('❌ Database init failed:', err.message);
  }
  
  // Initialize streaming services
  streamingManager = new StreamingManager(httpServer, io, {
    mediaRoot,
    enableRTMP: process.env.ENABLE_RTMP === 'true',
  });
  
  streamingManager.init().catch(err => {
    console.error('❌ Streaming manager init failed:', err.message);
  });
  
  // API Routes
  const authRoutes = require('../routes/authRoutes');
  const chatRoutes = require('../routes/chatRoutes');
  const memoryRoutes = require('../routes/memoryRoutes');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/memory', memoryRoutes);
  
  // Streaming API endpoints
  app.get('/api/streams/live', (req, res) => {
    const streams = streamingManager.getAllLiveStreams();
    res.json({ streams });
  });
  
  app.get('/api/streams/:streamId', (req, res) => {
    const streamInfo = streamingManager.getStreamInfo(req.params.streamId);
    if (!streamInfo) {
      return res.status(404).json({ error: 'Stream not found' });
    }
    res.json(streamInfo);
  });
  
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      services: {
        webrtc: !!streamingManager.webrtc,
        internal: !!streamingManager.internal,
        rtmp: !!streamingManager.nms,
      }
    });
  });
  
  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('[API Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  });
  
  console.log('✅ API Server initialized');
}

function startAPIServer(port) {
  if (!httpServer) {
    throw new Error('Server not initialized. Call initAPIServer() first.');
  }
  
  httpServer.listen(port, () => {
    console.log(`\n✅ nXcor Backend running on port ${port}`);
    console.log(`   API: http://localhost:${port}/api`);
    console.log(`   WebSocket: ws://localhost:${port}`);
    console.log(`   Media: http://localhost:${port}/media\n`);
  });
  
  return httpServer;
}

function getServer() {
  return { app, httpServer, io, streamingManager };
}

module.exports = {
  initAPIServer,
  startAPIServer,
  getServer,
};
