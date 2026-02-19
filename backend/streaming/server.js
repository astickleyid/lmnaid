const NodeMediaServer = require('node-media-server');
const crypto = require('crypto');

let nms;
let activeStreams = new Map();

const config = {
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot: './media'
  },
  trans: {
    ffmpeg: require('@ffmpeg-installer/ffmpeg').path,
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=3:hls_flags=delete_segments]',
        dash: true,
        dashFlags: '[f=dash:window_size=3:extra_window_size=5]'
      }
    ]
  }
};

function initStreamingServer() {
  nms = new NodeMediaServer(config);
  
  nms.on('preConnect', (id, args) => {
    console.log('[NodeMediaServer] Client connecting:', id);
  });

  nms.on('postConnect', (id, args) => {
    console.log('[NodeMediaServer] Client connected:', id);
  });

  nms.on('doneConnect', (id, args) => {
    console.log('[NodeMediaServer] Client disconnected:', id);
  });

  nms.on('prePublish', (id, StreamPath, args) => {
    console.log('[NodeMediaServer] Publish stream:', StreamPath);
    
    // Extract stream key from path
    const streamKey = StreamPath.split('/').pop();
    
    // Validate stream key (you should check against database)
    // For now, store in memory
    activeStreams.set(streamKey, {
      id,
      path: StreamPath,
      startTime: Date.now(),
      viewers: 0
    });
  });

  nms.on('donePublish', (id, StreamPath, args) => {
    console.log('[NodeMediaServer] Stream ended:', StreamPath);
    const streamKey = StreamPath.split('/').pop();
    activeStreams.delete(streamKey);
  });

  nms.on('prePlay', (id, StreamPath, args) => {
    console.log('[NodeMediaServer] Client watching:', StreamPath);
    const streamKey = StreamPath.split('/').pop();
    const stream = activeStreams.get(streamKey);
    if (stream) {
      stream.viewers++;
    }
  });

  nms.on('donePlay', (id, StreamPath, args) => {
    console.log('[NodeMediaServer] Client stopped watching:', StreamPath);
    const streamKey = StreamPath.split('/').pop();
    const stream = activeStreams.get(streamKey);
    if (stream && stream.viewers > 0) {
      stream.viewers--;
    }
  });

  return nms;
}

function startStreamingServer() {
  if (nms) {
    nms.run();
    console.log('✅ Native streaming server running on:');
    console.log('   RTMP: rtmp://localhost:1935/live');
    console.log('   HTTP: http://localhost:8000');
    return true;
  }
  return false;
}

function stopStreamingServer() {
  if (nms) {
    nms.stop();
    activeStreams.clear();
    console.log('✅ Streaming server stopped');
  }
}

function generateStreamKey(userId, serverId) {
  return crypto
    .createHash('sha256')
    .update(`${userId}-${serverId}-${Date.now()}`)
    .digest('hex')
    .substring(0, 32);
}

function getActiveStreams() {
  return Array.from(activeStreams.entries()).map(([key, data]) => ({
    streamKey: key,
    ...data
  }));
}

function getStreamInfo(streamKey) {
  return activeStreams.get(streamKey);
}

module.exports = {
  initStreamingServer,
  startStreamingServer,
  stopStreamingServer,
  generateStreamKey,
  getActiveStreams,
  getStreamInfo
};
