/**
 * WebSocket-to-RTMP Relay Service
 *
 * Receives WebM/H264 chunks from the browser via WebSocket
 * and pipes them to an RTMP server using FFmpeg.
 *
 * Usage:
 *   node webrtcRelay.js [--port 8089]
 *
 * Protocol:
 *   1. Client connects to ws://host:8089/ws/rtmp
 *   2. Client sends JSON config: { type: "config", rtmpUrl, videoBitrate, audioBitrate }
 *   3. Client sends binary WebM chunks (from MediaRecorder)
 *   4. Server pipes chunks through FFmpeg → RTMP
 *   5. Server sends back JSON messages: { type: "viewers"|"quality"|"error", ... }
 */

const { WebSocketServer, WebSocket } = require('ws');
const { spawn } = require('child_process');
const http = require('http');
const url = require('url');

const PORT = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--port') || '8089', 10);

// ─── HTTP server (health check + upgrade) ─────────────────────────────────

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', connections: wss.clients.size }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const pathname = url.parse(req.url).pathname;
  if (pathname === '/ws/rtmp') {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else {
    socket.destroy();
  }
});

// ─── Per-connection state ──────────────────────────────────────────────────

class StreamSession {
  constructor(ws) {
    this.ws = ws;
    this.ffmpeg = null;
    this.configured = false;
    this.bytesReceived = 0;
    this.startTime = null;
    this.qualityInterval = null;
  }

  configure(config) {
    const { rtmpUrl, videoBitrate = 2500, audioBitrate = 128 } = config;

    if (!rtmpUrl) {
      this.sendJSON({ type: 'error', message: 'Missing rtmpUrl' });
      return;
    }

    // FFmpeg: read WebM from stdin → remux/transcode → RTMP
    const args = [
      '-hide_banner', '-loglevel', 'warning',
      // Input from stdin
      '-f', 'webm',
      '-i', 'pipe:0',
      // Video: copy if H264, transcode if VP8/VP9
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', `${videoBitrate}k`,
      '-maxrate', `${videoBitrate}k`,
      '-bufsize', `${videoBitrate * 2}k`,
      '-g', '60',         // keyframe interval
      '-keyint_min', '60',
      // Audio
      '-c:a', 'aac',
      '-b:a', `${audioBitrate}k`,
      '-ar', '44100',
      // Output
      '-f', 'flv',
      '-flvflags', 'no_duration_filesize',
      rtmpUrl,
    ];

    console.log(`[relay] Starting FFmpeg → ${rtmpUrl}`);
    this.ffmpeg = spawn('ffmpeg', args, { stdio: ['pipe', 'pipe', 'pipe'] });

    this.ffmpeg.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line) console.log(`[ffmpeg] ${line}`);
    });

    this.ffmpeg.on('error', (err) => {
      console.error('[relay] FFmpeg error:', err.message);
      this.sendJSON({ type: 'error', message: 'FFmpeg process error' });
      this.cleanup();
    });

    this.ffmpeg.on('close', (code) => {
      console.log(`[relay] FFmpeg exited with code ${code}`);
      if (code !== 0) {
        this.sendJSON({ type: 'error', message: `FFmpeg exited (code ${code})` });
      }
      this.cleanup();
    });

    this.configured = true;
    this.startTime = Date.now();

    // Periodic quality check
    this.qualityInterval = setInterval(() => this.reportQuality(), 5000);
  }

  handleData(data) {
    if (!this.configured || !this.ffmpeg || this.ffmpeg.stdin.destroyed) return;
    this.bytesReceived += data.byteLength || data.length;
    try {
      this.ffmpeg.stdin.write(Buffer.from(data));
    } catch (err) {
      console.error('[relay] Write error:', err.message);
    }
  }

  reportQuality() {
    if (!this.startTime) return;
    const elapsed = (Date.now() - this.startTime) / 1000;
    const kbps = (this.bytesReceived * 8) / 1000 / elapsed;

    let quality = 'good';
    if (kbps < 500) quality = 'poor';
    else if (kbps < 1500) quality = 'fair';

    this.sendJSON({ type: 'quality', quality, kbps: Math.round(kbps) });
    // Mock viewer count (replace with real RTMP stats API)
    this.sendJSON({ type: 'viewers', count: Math.floor(Math.random() * 5) });
  }

  sendJSON(obj) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  cleanup() {
    clearInterval(this.qualityInterval);
    if (this.ffmpeg && !this.ffmpeg.killed) {
      this.ffmpeg.stdin.end();
      this.ffmpeg.kill('SIGTERM');
    }
    this.ffmpeg = null;
    this.configured = false;
  }
}

// ─── WebSocket handling ────────────────────────────────────────────────────

wss.on('connection', (ws) => {
  console.log('[relay] Client connected');
  const session = new StreamSession(ws);

  ws.on('message', (data, isBinary) => {
    if (!isBinary) {
      // JSON control message
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'config') session.configure(msg);
      } catch (err) {
        console.error('[relay] Bad JSON:', err.message);
      }
    } else {
      // Binary media data
      session.handleData(data);
    }
  });

  ws.on('close', () => {
    console.log('[relay] Client disconnected');
    session.cleanup();
  });

  ws.on('error', (err) => {
    console.error('[relay] WS error:', err.message);
    session.cleanup();
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`[relay] WebSocket-to-RTMP relay listening on ws://0.0.0.0:${PORT}/ws/rtmp`);
  console.log(`[relay] Health check: http://0.0.0.0:${PORT}/health`);
});

process.on('SIGTERM', () => {
  console.log('[relay] Shutting down...');
  wss.clients.forEach(ws => ws.close());
  server.close();
  process.exit(0);
});
