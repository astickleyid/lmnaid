/**
 * WebRTC Streaming Service
 * 
 * Scalable live streaming using WebRTC with selective forwarding:
 * - Broadcasters connect via WebRTC (no upload to server for transcoding)
 * - Viewers get direct P2P when possible (mesh for <5 viewers)
 * - SFU (Selective Forwarding Unit) for 5+ viewers (server relays without transcoding)
 * - Falls back to HLS/DASH for very large audiences (1000+ viewers)
 * 
 * This approach reduces server load and latency significantly.
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

class WebRTCStreamingService extends EventEmitter {
  constructor(io, options = {}) {
    super();
    this.io = io;
    this.maxMeshViewers = options.maxMeshViewers || 5;
    this.maxSFUViewers = options.maxSFUViewers || 50;
    
    // Active streams: streamId → StreamSession
    this.streams = new Map();
    // User → stream mapping
    this.userStreams = new Map();
    // Peer connections: peerId → connection metadata
    this.peers = new Map();
    
    this.namespace = null;
  }

  init() {
    this.namespace = this.io.of('/webrtc');
    
    this.namespace.on('connection', (socket) => {
      console.log(`[WebRTC] Peer connected: ${socket.id}`);
      
      socket.on('broadcaster-join', (data) => this._handleBroadcasterJoin(socket, data));
      socket.on('viewer-join', (data) => this._handleViewerJoin(socket, data));
      socket.on('offer', (data) => this._handleOffer(socket, data));
      socket.on('answer', (data) => this._handleAnswer(socket, data));
      socket.on('ice-candidate', (data) => this._handleIceCandidate(socket, data));
      socket.on('disconnect', () => this._handleDisconnect(socket));
    });
    
    console.log('[WebRTC] Service initialized');
    return this;
  }

  /**
   * Broadcaster starts a stream
   */
  _handleBroadcasterJoin(socket, { streamId, userId, streamTitle }) {
    if (!streamId) streamId = crypto.randomBytes(16).toString('hex');
    
    const stream = {
      id: streamId,
      userId,
      title: streamTitle || 'Untitled Stream',
      broadcasterId: socket.id,
      broadcasterSocket: socket,
      viewers: new Map(), // viewerId → socket
      startTime: Date.now(),
      mode: 'mesh', // mesh | sfu | hls
    };
    
    this.streams.set(streamId, stream);
    this.userStreams.set(userId, streamId);
    this.peers.set(socket.id, { type: 'broadcaster', streamId, userId });
    
    socket.join(`stream-${streamId}`);
    socket.emit('broadcaster-ready', { streamId });
    
    // Broadcast to lobby that new stream is live
    this.io.emit('stream-started', {
      streamId,
      userId,
      title: stream.title,
      viewerCount: 0,
    });
    
    console.log(`[WebRTC] Broadcaster ${userId} started stream ${streamId}`);
  }

  /**
   * Viewer joins a stream
   */
  _handleViewerJoin(socket, { streamId, userId }) {
    const stream = this.streams.get(streamId);
    if (!stream) {
      socket.emit('error', { message: 'Stream not found' });
      return;
    }
    
    const viewerId = socket.id;
    stream.viewers.set(viewerId, socket);
    this.peers.set(viewerId, { type: 'viewer', streamId, userId });
    
    socket.join(`stream-${streamId}`);
    
    const viewerCount = stream.viewers.size;
    
    // Choose streaming mode based on viewer count
    if (viewerCount <= this.maxMeshViewers) {
      // Mesh: Connect viewer directly to broadcaster
      stream.mode = 'mesh';
      socket.emit('viewer-ready', { mode: 'mesh', broadcasterId: stream.broadcasterId });
      stream.broadcasterSocket.emit('viewer-joined', { viewerId, userId, mode: 'mesh' });
    } else if (viewerCount <= this.maxSFUViewers) {
      // SFU: Server forwards streams
      stream.mode = 'sfu';
      socket.emit('viewer-ready', { mode: 'sfu', broadcasterId: stream.broadcasterId });
      stream.broadcasterSocket.emit('viewer-joined', { viewerId, userId, mode: 'sfu' });
    } else {
      // HLS fallback for large audiences
      stream.mode = 'hls';
      socket.emit('viewer-ready', { mode: 'hls', hlsUrl: `/hls/${streamId}/index.m3u8` });
      // Trigger HLS transcoding if not already running
      this._ensureHLSTranscoding(stream);
    }
    
    // Update viewer count for all
    this.namespace.to(`stream-${streamId}`).emit('viewer-count', { count: viewerCount });
    this.io.emit('stream-updated', { streamId, viewerCount });
    
    console.log(`[WebRTC] Viewer ${userId} joined stream ${streamId} (mode: ${stream.mode}, viewers: ${viewerCount})`);
  }

  /**
   * Handle WebRTC offer
   */
  _handleOffer(socket, { targetId, offer }) {
    const target = this.namespace.sockets.get(targetId);
    if (target) {
      target.emit('offer', { peerId: socket.id, offer });
    }
  }

  /**
   * Handle WebRTC answer
   */
  _handleAnswer(socket, { targetId, answer }) {
    const target = this.namespace.sockets.get(targetId);
    if (target) {
      target.emit('answer', { peerId: socket.id, answer });
    }
  }

  /**
   * Handle ICE candidate
   */
  _handleIceCandidate(socket, { targetId, candidate }) {
    const target = this.namespace.sockets.get(targetId);
    if (target) {
      target.emit('ice-candidate', { peerId: socket.id, candidate });
    }
  }

  /**
   * Handle peer disconnect
   */
  _handleDisconnect(socket) {
    const peer = this.peers.get(socket.id);
    if (!peer) return;
    
    const stream = this.streams.get(peer.streamId);
    if (!stream) return;
    
    if (peer.type === 'broadcaster') {
      // Broadcaster left - end stream
      this.namespace.to(`stream-${peer.streamId}`).emit('stream-ended');
      this.streams.delete(peer.streamId);
      this.userStreams.delete(peer.userId);
      this.io.emit('stream-ended', { streamId: peer.streamId });
      console.log(`[WebRTC] Stream ${peer.streamId} ended (broadcaster left)`);
    } else {
      // Viewer left
      stream.viewers.delete(socket.id);
      const viewerCount = stream.viewers.size;
      this.namespace.to(`stream-${peer.streamId}`).emit('viewer-count', { count: viewerCount });
      this.io.emit('stream-updated', { streamId: peer.streamId, viewerCount });
      stream.broadcasterSocket.emit('viewer-left', { viewerId: socket.id });
      console.log(`[WebRTC] Viewer left stream ${peer.streamId} (${viewerCount} remaining)`);
    }
    
    this.peers.delete(socket.id);
  }

  /**
   * Ensure HLS transcoding for large audiences
   * (Delegates to existing HLS pipeline)
   */
  _ensureHLSTranscoding(stream) {
    // Signal to existing streaming service to start HLS if not already
    this.emit('transcode-to-hls', {
      streamId: stream.id,
      broadcasterId: stream.broadcasterId,
    });
  }

  /**
   * Get all live streams
   */
  getLiveStreams() {
    return Array.from(this.streams.values()).map(s => ({
      id: s.id,
      userId: s.userId,
      title: s.title,
      viewerCount: s.viewers.size,
      startTime: s.startTime,
      uptime: Date.now() - s.startTime,
    }));
  }

  /**
   * Get stream info
   */
  getStreamInfo(streamId) {
    const stream = this.streams.get(streamId);
    if (!stream) return null;
    
    return {
      id: stream.id,
      userId: stream.userId,
      title: stream.title,
      viewerCount: stream.viewers.size,
      startTime: stream.startTime,
      uptime: Date.now() - stream.startTime,
      mode: stream.mode,
    };
  }
}

module.exports = WebRTCStreamingService;
