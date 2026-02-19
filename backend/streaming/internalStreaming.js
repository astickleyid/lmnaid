/**
 * Internal Platform Streaming
 *
 * Allows users to stream directly TO the nXcor platform.
 * - Generates unique stream keys per user
 * - Receives WebM/H264 from browser via WebSocket
 * - Pipes to internal RTMP server for HLS/DASH output
 * - Manages viewer counts and chat via Socket.IO
 * - Provides stream health monitoring
 */

const { WebSocketServer, WebSocket } = require('ws');
const { spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

class InternalStreamingService {
  constructor(httpServer, io, options = {}) {
    this.httpServer = httpServer;
    this.io = io; // Socket.IO instance for chat
    this.mediaRoot = options.mediaRoot || path.join(__dirname, '../../media/internal');
    this.ffmpegPath = options.ffmpegPath || 'ffmpeg';

    // Active streams: streamKey → StreamSession
    this.activeStreams = new Map();
    // User stream keys: userId → streamKey
    this.userStreamKeys = new Map();
    // Chat messages buffer per stream
    this.chatHistory = new Map();

    // Ensure media directory
    if (!fs.existsSync(this.mediaRoot)) {
      fs.mkdirSync(this.mediaRoot, { recursive: true });
    }

    this.wss = null;
  }

  /**
   * Initialize WebSocket server for receiving streams
   */
  init() {
    this.wss = new WebSocketServer({ noServer: true });

    // Handle upgrade for internal streaming path
    this.httpServer.on('upgrade', (req, socket, head) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname === '/ws/internal-stream') {
        this.wss.handleUpgrade(req, socket, head, (ws) => {
          this.wss.emit('connection', ws, req);
        });
      }
    });

    this.wss.on('connection', (ws, req) => {
      console.log('[InternalStreaming] New streamer connecting');
      this._handleStreamerConnection(ws, req);
    });

    // Setup Socket.IO namespace for stream chat
    this._setupChatNamespace();

    console.log('[InternalStreaming] Initialized');
    return this;
  }

  /**
   * Generate a unique stream key for a user
   */
  generateStreamKey(userId) {
    // Revoke old key if exists
    const oldKey = this.userStreamKeys.get(userId);
    if (oldKey) {
      this.activeStreams.delete(oldKey);
    }

    const key = `nxcor_${userId}_${crypto.randomBytes(16).toString('hex')}`;
    this.userStreamKeys.set(userId, key);
    return key;
  }

  /**
   * Get existing stream key for user (or generate new)
   */
  getOrCreateStreamKey(userId) {
    const existing = this.userStreamKeys.get(userId);
    if (existing) return existing;
    return this.generateStreamKey(userId);
  }

  /**
   * Get HLS playback URL for a stream
   */
  getPlaybackUrl(streamKey) {
    return `/media/internal/${streamKey}/index.m3u8`;
  }

  /**
   * Get all currently live streams
   */
  getLiveStreams() {
    const streams = [];
    for (const [key, session] of this.activeStreams) {
      if (session.isLive) {
        streams.push({
          streamKey: key,
          userId: session.userId,
          title: session.title,
          startedAt: session.startedAt,
          viewerCount: session.viewers.size,
          health: session.getHealth(),
        });
      }
    }
    return streams;
  }

  /**
   * Get viewer count for a stream
   */
  getViewerCount(streamKey) {
    const session = this.activeStreams.get(streamKey);
    return session ? session.viewers.size : 0;
  }

  // ── Private: Handle streamer WebSocket connection ───────────────────────

  _handleStreamerConnection(ws, req) {
    let session = null;

    ws.on('message', (data, isBinary) => {
      if (!isBinary) {
        // JSON control message
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'config') {
            session = this._createStreamSession(ws, msg);
            if (!session) {
              ws.send(JSON.stringify({ type: 'error', message: 'Failed to create stream session' }));
              ws.close();
            }
          }
        } catch (err) {
          console.error('[InternalStreaming] Bad JSON:', err.message);
        }
      } else if (session) {
        // Binary media data
        session.handleData(data);
      }
    });

    ws.on('close', () => {
      if (session) {
        console.log(`[InternalStreaming] Stream ended: ${session.streamKey}`);
        session.cleanup();
        this.activeStreams.delete(session.streamKey);
        // Notify viewers
        this.io.to(`stream:${session.streamKey}`).emit('stream-ended');
      }
    });

    ws.on('error', (err) => {
      console.error('[InternalStreaming] WS error:', err.message);
      if (session) {
        session.cleanup();
        this.activeStreams.delete(session.streamKey);
      }
    });
  }

  _createStreamSession(ws, config) {
    const streamKey = config.streamKey || this.generateStreamKey(config.userId || 'anonymous');
    const outputDir = path.join(this.mediaRoot, streamKey);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const session = new InternalStreamSession(ws, {
      streamKey,
      userId: config.userId,
      title: config.title || 'Untitled Stream',
      outputDir,
      ffmpegPath: this.ffmpegPath,
      videoBitrate: config.videoBitrate || 2500,
      audioBitrate: config.audioBitrate || 128,
      io: this.io,
    });

    if (session.start()) {
      this.activeStreams.set(streamKey, session);

      // Send stream key back to streamer
      ws.send(JSON.stringify({
        type: 'stream-key',
        key: streamKey,
        playbackUrl: this.getPlaybackUrl(streamKey),
      }));

      // Initialize chat history for this stream
      this.chatHistory.set(streamKey, []);

      return session;
    }

    return null;
  }

  // ── Socket.IO Chat ──────────────────────────────────────────────────────

  _setupChatNamespace() {
    this.io.on('connection', (socket) => {
      socket.on('join-stream', ({ streamId, userId }) => {
        if (!streamId) return;
        socket.join(`stream:${streamId}`);

        // Update viewer count
        const session = this.activeStreams.get(streamId);
        if (session) {
          session.viewers.add(socket.id);
          this.io.to(`stream:${streamId}`).emit('viewer-count', session.viewers.size);
          // Also notify streamer via WebSocket
          session.sendJSON({ type: 'viewers', count: session.viewers.size });
        }

        // Send recent chat history
        const history = this.chatHistory.get(streamId) || [];
        socket.emit('chat-history', history.slice(-50));
      });

      socket.on('leave-stream', ({ streamId }) => {
        if (!streamId) return;
        socket.leave(`stream:${streamId}`);

        const session = this.activeStreams.get(streamId);
        if (session) {
          session.viewers.delete(socket.id);
          this.io.to(`stream:${streamId}`).emit('viewer-count', session.viewers.size);
          session.sendJSON({ type: 'viewers', count: session.viewers.size });
        }
      });

      socket.on('chat-message', ({ streamId, userId, username, avatar, message }) => {
        if (!streamId || !message || !username) return;
        if (message.length > 500) return; // Max length

        const session = this.activeStreams.get(streamId);
        const chatMsg = {
          id: crypto.randomUUID(),
          userId,
          username,
          avatar,
          message: message.trim(),
          timestamp: Date.now(),
          isStreamer: session?.userId === userId,
          isMod: false,
        };

        // Store in history
        const history = this.chatHistory.get(streamId) || [];
        history.push(chatMsg);
        if (history.length > 500) history.shift();
        this.chatHistory.set(streamId, history);

        // Broadcast to all viewers
        this.io.to(`stream:${streamId}`).emit('chat-message', chatMsg);
      });

      socket.on('disconnect', () => {
        // Remove from all stream viewer counts
        for (const [key, session] of this.activeStreams) {
          if (session.viewers.has(socket.id)) {
            session.viewers.delete(socket.id);
            this.io.to(`stream:${key}`).emit('viewer-count', session.viewers.size);
            session.sendJSON({ type: 'viewers', count: session.viewers.size });
          }
        }
      });
    });
  }

  /**
   * Cleanup
   */
  shutdown() {
    for (const [key, session] of this.activeStreams) {
      session.cleanup();
    }
    this.activeStreams.clear();
    this.chatHistory.clear();
    if (this.wss) this.wss.close();
    console.log('[InternalStreaming] Shutdown complete');
  }
}

// ─── Per-Stream Session ──────────────────────────────────────────────────────

class InternalStreamSession {
  constructor(ws, options) {
    this.ws = ws;
    this.streamKey = options.streamKey;
    this.userId = options.userId;
    this.title = options.title;
    this.outputDir = options.outputDir;
    this.ffmpegPath = options.ffmpegPath;
    this.videoBitrate = options.videoBitrate;
    this.audioBitrate = options.audioBitrate;
    this.io = options.io;

    this.ffmpeg = null;
    this.isLive = false;
    this.startedAt = null;
    this.viewers = new Set();
    this.bytesReceived = 0;
    this.healthInterval = null;
    this.lastBytesCheck = 0;
    this.lastBytesTime = Date.now();
  }

  start() {
    try {
      const hlsOutput = path.join(this.outputDir, 'index.m3u8');

      const args = [
        '-hide_banner', '-loglevel', 'warning',
        '-f', 'webm',
        '-i', 'pipe:0',
        // Video
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-tune', 'zerolatency',
        '-b:v', `${this.videoBitrate}k`,
        '-maxrate', `${this.videoBitrate}k`,
        '-bufsize', `${this.videoBitrate * 2}k`,
        '-g', '48',
        '-keyint_min', '48',
        '-sc_threshold', '0',
        // Audio
        '-c:a', 'aac',
        '-b:a', `${this.audioBitrate}k`,
        '-ar', '44100',
        // HLS output
        '-f', 'hls',
        '-hls_time', '2',
        '-hls_list_size', '5',
        '-hls_flags', 'delete_segments+append_list',
        '-hls_segment_filename', path.join(this.outputDir, 'seg_%03d.ts'),
        hlsOutput,
      ];

      console.log(`[InternalStreaming] Starting FFmpeg for ${this.streamKey}`);
      this.ffmpeg = spawn(this.ffmpegPath, args, { stdio: ['pipe', 'pipe', 'pipe'] });

      this.ffmpeg.stderr.on('data', (data) => {
        const line = data.toString().trim();
        if (line) console.log(`[ffmpeg:${this.streamKey}] ${line}`);
      });

      this.ffmpeg.on('error', (err) => {
        console.error(`[InternalStreaming] FFmpeg error: ${err.message}`);
        this.sendJSON({ type: 'error', message: 'Encoding error' });
        this.cleanup();
      });

      this.ffmpeg.on('close', (code) => {
        console.log(`[InternalStreaming] FFmpeg exited (code ${code}) for ${this.streamKey}`);
        this.isLive = false;
      });

      this.isLive = true;
      this.startedAt = Date.now();

      // Health reporting
      this.healthInterval = setInterval(() => this._reportHealth(), 3000);

      return true;
    } catch (err) {
      console.error('[InternalStreaming] Failed to start FFmpeg:', err.message);
      return false;
    }
  }

  handleData(data) {
    if (!this.ffmpeg || this.ffmpeg.stdin.destroyed) return;
    this.bytesReceived += data.byteLength || data.length;
    try {
      this.ffmpeg.stdin.write(Buffer.from(data));
    } catch (err) {
      console.error(`[InternalStreaming] Write error: ${err.message}`);
    }
  }

  getHealth() {
    const now = Date.now();
    const elapsed = (now - this.lastBytesTime) / 1000;
    const bytesDelta = this.bytesReceived - this.lastBytesCheck;
    const kbps = elapsed > 0 ? Math.round((bytesDelta * 8) / 1000 / elapsed) : 0;

    return {
      bitrate: kbps,
      uptime: this.startedAt ? Math.floor((now - this.startedAt) / 1000) : 0,
      bytesReceived: this.bytesReceived,
    };
  }

  _reportHealth() {
    const now = Date.now();
    const elapsed = (now - this.lastBytesTime) / 1000;
    const bytesDelta = this.bytesReceived - this.lastBytesCheck;
    const kbps = elapsed > 0 ? Math.round((bytesDelta * 8) / 1000 / elapsed) : 0;

    let quality = 'good';
    if (kbps < 500) quality = 'poor';
    else if (kbps < 1500) quality = 'fair';

    this.sendJSON({ type: 'quality', quality, kbps });
    this.sendJSON({ type: 'viewers', count: this.viewers.size });

    this.lastBytesCheck = this.bytesReceived;
    this.lastBytesTime = now;
  }

  sendJSON(obj) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  cleanup() {
    clearInterval(this.healthInterval);
    if (this.ffmpeg && !this.ffmpeg.killed) {
      try {
        this.ffmpeg.stdin.end();
      } catch {}
      this.ffmpeg.kill('SIGTERM');
    }
    this.ffmpeg = null;
    this.isLive = false;

    // Clean up HLS segments after a delay
    setTimeout(() => {
      try {
        if (fs.existsSync(this.outputDir)) {
          const files = fs.readdirSync(this.outputDir);
          files.forEach(f => fs.unlinkSync(path.join(this.outputDir, f)));
          fs.rmdirSync(this.outputDir);
        }
      } catch {}
    }, 30000); // Keep files for 30s after stream ends
  }
}

module.exports = { InternalStreamingService, InternalStreamSession };
