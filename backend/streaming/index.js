/**
 * Unified Streaming Service Manager
 * 
 * Manages all streaming backends:
 * - WebRTC (primary, for low-latency P2P/SFU streaming)
 * - Internal WebSocket (browser WebM streaming)
 * - RTMP + Node Media Server (traditional HLS/DASH output)
 * 
 * Routes traffic intelligently based on viewer count and capabilities.
 */

const WebRTCStreamingService = require('./webrtcStreaming');
const { InternalStreamingService } = require('./internalStreaming');

class StreamingManager {
  constructor(httpServer, io, options = {}) {
    this.httpServer = httpServer;
    this.io = io;
    this.options = options;
    
    this.webrtc = null;
    this.internal = null;
    this.nms = null; // Node Media Server (RTMP)
  }

  async init() {
    console.log('[StreamingManager] Initializing...');
    
    // 1. WebRTC Service (primary, low-latency)
    try {
      this.webrtc = new WebRTCStreamingService(this.io, {
        maxMeshViewers: 5,     // Direct P2P for small audiences
        maxSFUViewers: 50,     // SFU for medium audiences
      });
      this.webrtc.init();
      console.log('[StreamingManager] ✓ WebRTC service ready');
    } catch (err) {
      console.error('[StreamingManager] ✗ WebRTC service failed:', err.message);
    }

    // 2. Internal WebSocket Streaming (browser → WebSocket → HLS)
    try {
      const InternalModule = require('./internalStreaming');
      const InternalStreamingServiceClass = InternalModule?.InternalStreamingService;
      
      if (!InternalStreamingServiceClass) {
        console.error('[StreamingManager] InternalStreamingService not exported from internalStreaming.js');
        console.error('[StreamingManager] Available exports:', Object.keys(InternalModule || {}));
        throw new Error('InternalStreamingService not found in module exports');
      }
      
      this.internal = new InternalStreamingServiceClass(this.httpServer, this.io, {
        mediaRoot: this.options.mediaRoot || './media/internal',
      });
      this.internal.init();
      console.log('[StreamingManager] ✓ Internal WebSocket streaming ready');
    } catch (err) {
      console.error('[StreamingManager] ✗ Internal streaming failed:', err.message);
      console.error('[StreamingManager] Stack:', err.stack);
    }

    // 3. RTMP/Node Media Server (optional, for external tools like OBS)
    if (this.options.enableRTMP) {
      try {
        const { StreamingServer } = require('./streamingServer');
        const streamingServer = new StreamingServer();
        this.nms = streamingServer.init();
        this.nms.run();
        console.log('[StreamingManager] ✓ RTMP/HLS service ready (port 1935)');
      } catch (err) {
        console.error('[StreamingManager] ✗ RTMP service failed:', err.message);
        console.error('[StreamingManager] Stack:', err.stack);
      }
    } else {
      console.log('[StreamingManager] ⊘ RTMP disabled (set enableRTMP: true to enable)');
    }

    // Wire up cross-service events
    if (this.webrtc && this.internal) {
      // When WebRTC needs HLS fallback, delegate to internal service
      this.webrtc.on('transcode-to-hls', (data) => {
        console.log(`[StreamingManager] Delegating stream ${data.streamId} to HLS transcode`);
        // Internal service will handle WebSocket → HLS pipeline
      });
    }

    console.log('[StreamingManager] All streaming services initialized');
    return this;
  }

  /**
   * Get unified list of live streams across all services
   */
  getAllLiveStreams() {
    const streams = [];
    
    if (this.webrtc) {
      streams.push(...this.webrtc.getLiveStreams().map(s => ({ ...s, source: 'webrtc' })));
    }
    
    if (this.internal) {
      streams.push(...this.internal.getLiveStreams().map(s => ({ ...s, source: 'internal' })));
    }
    
    return streams;
  }

  /**
   * Get stream info by ID (checks all services)
   */
  getStreamInfo(streamId) {
    if (this.webrtc) {
      const info = this.webrtc.getStreamInfo(streamId);
      if (info) return { ...info, source: 'webrtc' };
    }
    
    if (this.internal) {
      const info = this.internal.getStreamInfo(streamId);
      if (info) return { ...info, source: 'internal' };
    }
    
    return null;
  }

  /**
   * Stop all streaming services gracefully
   */
  async shutdown() {
    console.log('[StreamingManager] Shutting down...');
    
    if (this.nms) {
      this.nms.stop();
    }
    
    // WebRTC and Internal services will clean up on socket disconnect
    console.log('[StreamingManager] Shutdown complete');
  }
}

module.exports = StreamingManager;
