import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, MessageCircle, Send, X, Heart, Share2, Flag,
  Volume2, VolumeX, Maximize, Minimize, Eye, Circle,
  ChevronDown, Settings, Play, Pause
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  message: string;
  timestamp: number;
  isStreamer?: boolean;
  isMod?: boolean;
}

interface StreamInfo {
  id: string;
  title: string;
  streamerName: string;
  streamerAvatar?: string;
  viewerCount: number;
  startedAt: number;
  category?: string;
  streamKey: string;
  isLive: boolean;
}

interface StreamViewerProps {
  streamId: string;
  /** HLS playback URL */
  hlsUrl?: string;
  /** Fallback: direct stream URL */
  streamUrl?: string;
  /** Socket.IO instance for chat */
  socket?: any;
  streamInfo?: StreamInfo;
  currentUser?: { id: string; username: string; avatar?: string };
  onClose?: () => void;
  isFullPage?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const StreamViewer: React.FC<StreamViewerProps> = ({
  streamId, hlsUrl, streamUrl, socket, streamInfo, currentUser, onClose, isFullPage = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [muted, setMuted] = useState(true);
  const [viewerCount, setViewerCount] = useState(streamInfo?.viewerCount || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Setup HLS playback ──────────────────────────────────────────────────

  useEffect(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const playUrl = hlsUrl || streamUrl;
    if (!playUrl) return;

    // Try native HLS (Safari)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
        setIsPlaying(true);
      });
      return;
    }

    // Use hls.js for other browsers
    const loadHls = async () => {
      try {
        const Hls = (await import('hls.js')).default;
        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 30,
          });
          hls.loadSource(playUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => {});
            setIsPlaying(true);
          });
          hls.on(Hls.Events.ERROR, (_: any, data: any) => {
            if (data.fatal) {
              console.error('[StreamViewer] HLS fatal error:', data);
              hls.destroy();
            }
          });
          return () => hls.destroy();
        }
      } catch {
        // hls.js not available, try direct playback
        video.src = playUrl;
        video.play().catch(() => {});
      }
    };

    loadHls();
  }, [hlsUrl, streamUrl]);

  // ── Socket.IO chat ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    socket.emit('join-stream', { streamId, userId: currentUser?.id });

    socket.on('chat-message', (msg: ChatMessage) => {
      setMessages(prev => [...prev.slice(-200), msg]);
    });

    socket.on('viewer-count', (count: number) => {
      setViewerCount(count);
    });

    socket.on('stream-ended', () => {
      setIsPlaying(false);
    });

    return () => {
      socket.emit('leave-stream', { streamId });
      socket.off('chat-message');
      socket.off('viewer-count');
      socket.off('stream-ended');
    };
  }, [socket, streamId, currentUser?.id]);

  // ── Auto-scroll chat ───────────────────────────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Duration timer ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!streamInfo?.startedAt || !streamInfo.isLive) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - streamInfo.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [streamInfo?.startedAt, streamInfo?.isLive]);

  // ── Chat send ───────────────────────────────────────────────────────────

  const sendMessage = () => {
    if (!chatInput.trim() || !socket || !currentUser) return;
    socket.emit('chat-message', {
      streamId,
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      message: chatInput.trim(),
    });
    setChatInput('');
  };

  // ── Video controls ──────────────────────────────────────────────────────

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${m}:${String(sec).padStart(2, '0')}`;
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={`flex ${isFullPage ? 'h-screen' : 'h-[80vh]'} bg-[#0a0a1a] ${
        isFullPage ? '' : 'rounded-2xl overflow-hidden border border-white/10'
      }`}
    >
      {/* Video + Controls */}
      <div className={`flex-1 relative flex flex-col ${chatOpen ? 'min-w-0' : 'w-full'}`}>
        {/* Stream info bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0">
            {streamInfo?.streamerAvatar && (
              <img src={streamInfo.streamerAvatar} className="w-8 h-8 rounded-full" alt="" />
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white truncate">
                {streamInfo?.title || 'Untitled Stream'}
              </h3>
              <p className="text-xs text-gray-500 truncate">
                {streamInfo?.streamerName || 'Unknown'}
                {streamInfo?.category && ` · ${streamInfo.category}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {streamInfo?.isLive && (
              <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">
                <Circle className="w-2 h-2 fill-red-500" />
                LIVE
              </div>
            )}
            <div className="flex items-center gap-1 text-gray-400 text-xs">
              <Eye className="w-3.5 h-3.5" />
              {viewerCount}
            </div>
            {elapsed > 0 && (
              <span className="text-xs text-gray-500 font-mono">{formatTime(elapsed)}</span>
            )}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 sm:hidden"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            {onClose && (
              <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Video */}
        <div
          className="flex-1 relative bg-black cursor-pointer"
          onMouseMove={handleMouseMove}
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            muted={muted}
            playsInline
            autoPlay
            className="w-full h-full object-contain"
          />

          {/* Overlay controls */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex items-center gap-3"
                onClick={e => e.stopPropagation()}
              >
                <button onClick={togglePlay} className="text-white hover:text-purple-400 transition-colors">
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <button onClick={toggleMute} className="text-white hover:text-purple-400 transition-colors">
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                {!muted && (
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      setVolume(v);
                      if (videoRef.current) videoRef.current.volume = v;
                    }}
                    className="w-20 accent-purple-500"
                  />
                )}
                <div className="flex-1" />
                <button
                  onClick={() => setChatOpen(!chatOpen)}
                  className="text-white hover:text-purple-400 transition-colors hidden sm:block"
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button onClick={toggleFullscreen} className="text-white hover:text-purple-400 transition-colors">
                  {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Not playing overlay */}
          {!isPlaying && !hlsUrl && !streamUrl && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Eye className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Stream is offline</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-l border-white/10 flex flex-col bg-[#12122a] overflow-hidden"
            style={{ minWidth: 0 }}
          >
            {/* Chat header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">Stream Chat</span>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-1 hover:bg-white/10 rounded text-gray-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
              {messages.length === 0 && (
                <div className="text-center text-gray-600 text-xs py-8">
                  No messages yet. Say hi! 👋
                </div>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-2 group">
                  {msg.avatar ? (
                    <img src={msg.avatar} className="w-5 h-5 rounded-full mt-0.5 flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-purple-500/30 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <span className={`text-xs font-bold ${
                      msg.isStreamer ? 'text-red-400' :
                      msg.isMod ? 'text-green-400' : 'text-purple-300'
                    }`}>
                      {msg.username}
                    </span>
                    {msg.isStreamer && (
                      <span className="ml-1 text-[10px] bg-red-500/20 text-red-400 px-1 rounded">STREAMER</span>
                    )}
                    {msg.isMod && (
                      <span className="ml-1 text-[10px] bg-green-500/20 text-green-400 px-1 rounded">MOD</span>
                    )}
                    <span className="text-xs text-gray-300 ml-1.5 break-words">{msg.message}</span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            {currentUser ? (
              <div className="px-3 py-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Send a message..."
                    maxLength={500}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatInput.trim()}
                    className="p-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-3 py-3 border-t border-white/5 text-center">
                <p className="text-xs text-gray-500">Sign in to chat</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StreamViewer;
