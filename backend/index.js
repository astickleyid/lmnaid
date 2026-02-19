#!/usr/bin/env node

/**
 * nXcor Backend Server
 * 
 * Runs:
 * - REST API (Express)
 * - Socket.IO (realtime messaging)
 * - WebRTC Streaming Service
 * - Internal WebSocket Streaming
 */

const { initAPIServer, startAPIServer } = require('./api/server');

const PORT = process.env.PORT || 3001;

console.log('🚀 Starting nXcor backend...\n');

// Initialize and start
initAPIServer();
startAPIServer(PORT);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
