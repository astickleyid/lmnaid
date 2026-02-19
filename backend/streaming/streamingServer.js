const NodeMediaServer = require('node-media-server');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const config = require('../config/config');
const Stream = require('../models/Stream');
const { getDatabase } = require('../database/schema');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegPath);

class StreamingServer {
  constructor() {
    this.nms = null;
    this.activeStreams = new Map();
    this.viewerCounts = new Map();
    this.mediaRoot = config.streaming.http.mediaRoot;

    // Ensure media directory exists
    if (!fs.existsSync(this.mediaRoot)) {
      fs.mkdirSync(this.mediaRoot, { recursive: true });
    }
  }

  init() {
    const nmsConfig = {
      rtmp: {
        port: config.streaming.rtmp.port,
        chunk_size: config.streaming.rtmp.chunkSize,
        gop_cache: config.streaming.rtmp.gopCache,
        ping: config.streaming.rtmp.ping,
        ping_timeout: config.streaming.rtmp.pingTimeout
      },
      http: {
        port: config.streaming.http.port,
        allow_origin: '*',
        mediaroot: this.mediaRoot
      },
      trans: {
        ffmpeg: ffmpegPath,
        tasks: [
          {
            app: 'live',
            hls: config.streaming.hls.enabled,
            hlsFlags: `[hls_time=${config.streaming.hls.time}:hls_list_size=${config.streaming.hls.listSize}:hls_flags=${config.streaming.hls.flags}]`,
            dash: config.streaming.dash.enabled,
            dashFlags: `[f=dash:window_size=${config.streaming.dash.windowSize}:extra_window_size=${config.streaming.dash.extraWindowSize}]`,
            // Transcoding profiles for adaptive bitrate
            ...(config.streaming.quality.profiles.length > 0 && {
              vc: 'copy',
              ac: 'copy'
            })
          }
        ]
      },
      auth: {
        api: true,
        api_user: 'admin',
        api_pass: process.env.NMS_API_PASS || 'admin',
        play: false,
        publish: true,
        secret: process.env.NMS_SECRET || 'defaultsecret'
      }
    };

    this.nms = new NodeMediaServer(nmsConfig);
    this.setupEventHandlers();

    return this.nms;
  }

  setupEventHandlers() {
    // Pre-connect: Client attempting to connect
    this.nms.on('preConnect', (id, args) => {
      console.log('[StreamingServer] Client connecting:', id, args);
    });

    // Post-connect: Client connected
    this.nms.on('postConnect', (id, args) => {
      console.log('[StreamingServer] Client connected:', id);
    });

    // Done-connect: Client disconnected
    this.nms.on('doneConnect', (id, args) => {
      console.log('[StreamingServer] Client disconnected:', id);
    });

    // Pre-publish: Stream starting
    this.nms.on('prePublish', async (id, StreamPath, args) => {
      console.log('[StreamingServer] Publish started:', StreamPath);
      
      try {
        const streamKey = StreamPath.split('/').pop();
        const db = getDatabase();
        const streamModel = new Stream(db);

        // Validate stream key
        const stream = streamModel.findByStreamKey(streamKey);
        
        if (!stream) {
          console.log('[StreamingServer] Invalid stream key:', streamKey);
          const session = this.nms.getSession(id);
          session.reject();
          return;
        }

        // Update stream status
        streamModel.updateStatus(stream.id, 'live');
        
        // Store active stream info
        this.activeStreams.set(streamKey, {
          id,
          streamId: stream.id,
          userId: stream.user_id,
          path: StreamPath,
          startTime: Date.now(),
          viewers: new Set()
        });

        console.log(`[StreamingServer] Stream ${stream.id} is now live`);
      } catch (error) {
        console.error('[StreamingServer] Error in prePublish:', error);
      }
    });

    // Post-publish: Stream is live
    this.nms.on('postPublish', (id, StreamPath, args) => {
      console.log('[StreamingServer] Stream is now live:', StreamPath);
    });

    // Done-publish: Stream ended
    this.nms.on('donePublish', async (id, StreamPath, args) => {
      console.log('[StreamingServer] Stream ended:', StreamPath);
      
      try {
        const streamKey = StreamPath.split('/').pop();
        const streamInfo = this.activeStreams.get(streamKey);
        
        if (streamInfo) {
          const db = getDatabase();
          const streamModel = new Stream(db);

          // Update stream status
          streamModel.updateStatus(streamInfo.streamId, 'ended');
          
          // Cleanup
          this.activeStreams.delete(streamKey);
          this.viewerCounts.delete(streamInfo.streamId);
          
          console.log(`[StreamingServer] Stream ${streamInfo.streamId} ended`);
        }
      } catch (error) {
        console.error('[StreamingServer] Error in donePublish:', error);
      }
    });

    // Pre-play: Viewer connecting
    this.nms.on('prePlay', async (id, StreamPath, args) => {
      console.log('[StreamingServer] Viewer connecting:', StreamPath);
      
      try {
        const streamKey = StreamPath.split('/').pop();
        const streamInfo = this.activeStreams.get(streamKey);
        
        if (streamInfo) {
          streamInfo.viewers.add(id);
          this.updateViewerCount(streamInfo.streamId, streamInfo.viewers.size);
        }
      } catch (error) {
        console.error('[StreamingServer] Error in prePlay:', error);
      }
    });

    // Done-play: Viewer disconnected
    this.nms.on('donePlay', async (id, StreamPath, args) => {
      console.log('[StreamingServer] Viewer disconnected:', StreamPath);
      
      try {
        const streamKey = StreamPath.split('/').pop();
        const streamInfo = this.activeStreams.get(streamKey);
        
        if (streamInfo) {
          streamInfo.viewers.delete(id);
          this.updateViewerCount(streamInfo.streamId, streamInfo.viewers.size);
        }
      } catch (error) {
        console.error('[StreamingServer] Error in donePlay:', error);
      }
    });
  }

  updateViewerCount(streamId, count) {
    try {
      const db = getDatabase();
      const streamModel = new Stream(db);
      
      streamModel.updateViewers(streamId, count);
      streamModel.incrementViews(streamId, 1);
      
      // Record analytics
      if (config.analytics.enabled) {
        streamModel.recordAnalytics(streamId, count);
      }
    } catch (error) {
      console.error('[StreamingServer] Error updating viewer count:', error);
    }
  }

  start() {
    if (this.nms) {
      this.nms.run();
      console.log('✅ Native streaming server running on:');
      console.log(`   RTMP: rtmp://localhost:${config.streaming.rtmp.port}/live`);
      console.log(`   HTTP: http://localhost:${config.streaming.http.port}`);
      
      // Start analytics collection
      if (config.analytics.enabled) {
        this.startAnalyticsCollection();
      }
      
      return true;
    }
    return false;
  }

  stop() {
    if (this.nms) {
      this.nms.stop();
      this.activeStreams.clear();
      this.viewerCounts.clear();
      
      if (this.analyticsInterval) {
        clearInterval(this.analyticsInterval);
      }
      
      console.log('✅ Streaming server stopped');
    }
  }

  startAnalyticsCollection() {
    this.analyticsInterval = setInterval(() => {
      for (const [streamKey, info] of this.activeStreams.entries()) {
        this.updateViewerCount(info.streamId, info.viewers.size);
      }
    }, config.analytics.aggregationInterval);
  }

  getActiveStreams() {
    return Array.from(this.activeStreams.entries()).map(([key, data]) => ({
      streamKey: key,
      streamId: data.streamId,
      userId: data.userId,
      viewers: data.viewers.size,
      uptime: Date.now() - data.startTime
    }));
  }

  getStreamInfo(streamKey) {
    const info = this.activeStreams.get(streamKey);
    if (!info) return null;
    
    return {
      streamId: info.streamId,
      userId: info.userId,
      viewers: info.viewers.size,
      uptime: Date.now() - info.startTime
    };
  }

  validateStreamKey(streamKey) {
    try {
      const db = getDatabase();
      const streamModel = new Stream(db);
      const stream = streamModel.findByStreamKey(streamKey);
      return !!stream;
    } catch (error) {
      return false;
    }
  }

  // Transcoding helpers
  async createTranscodedStream(inputPath, outputPath, profile) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          `-c:v libx264`,
          `-b:v ${profile.bitrate}`,
          `-s ${profile.width}x${profile.height}`,
          `-preset veryfast`,
          `-tune zerolatency`,
          `-c:a aac`,
          `-b:a 128k`,
          `-f flv`
        ])
        .output(outputPath)
        .on('end', resolve)
        .on('error', reject)
        .run();
    });
  }

  // Get stream statistics
  getStats() {
    return {
      activeStreams: this.activeStreams.size,
      totalViewers: Array.from(this.activeStreams.values())
        .reduce((sum, info) => sum + info.viewers.size, 0),
      uptime: process.uptime(),
      mediaDirectory: this.mediaRoot
    };
  }
}

// Singleton instance
const streamingServer = new StreamingServer();

module.exports = {
  StreamingServer,
  streamingServer
};
