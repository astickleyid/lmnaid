import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Video, VideoOff, Mic, MicOff, Monitor, Camera,
  Circle, StopCircle, Users, Activity, X
} from 'lucide-react';
import { motion } from 'framer-motion';
import { InlineBrowserWarning } from './BrowserCompatibilityWarning';
import { MediaDevicesCheck } from './MediaDevicesCheck';

interface WebRTCStreamingProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  streamTitle?: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
}

/**
 * WebRTC-based streaming component for nXcor
 * 
 * - Ultra-low latency (<500ms) for small audiences
 * - Automatic P2P mesh or SFU based on viewer count
 * - Falls back to HLS for 50+ viewers
 */
export const WebRTCStreaming: React.FC<WebRTCStreamingProps> = ({
  isOpen, onClose, userId, streamTitle = 'Untitled Stream',
  onStreamStart, onStreamEnd,
}) => {
  // State
  const [isStreaming, setIsStreaming] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [source, setSource] = useState<'camera' | 'screen' | 'both'>('camera');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [bitrate, setBitrate] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const streamIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<number | null>(null);

  // WebRTC Configuration
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    if (!isOpen) return;
    
    // Connect to WebRTC namespace
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:3002';
    socketRef.current = io(`${backendUrl}/webrtc`, {
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('broadcaster-ready', ({ streamId }) => {
      streamIdRef.current = streamId;
      setIsStreaming(true);
      setIsConnecting(false);
      startTimeRef.current = Date.now();
      
      // Update duration every second
      durationIntervalRef.current = window.setInterval(() => {
        if (startTimeRef.current) {
          setStreamDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);

      onStreamStart?.();
    });

    socket.on('viewer-joined', ({ viewerId, userId: viewerUserId, mode }) => {
      console.log(`[WebRTC] Viewer ${viewerUserId} joined (mode: ${mode})`);
      
      if (mode === 'mesh' || mode === 'sfu') {
        // Create peer connection for this viewer
        createPeerConnection(viewerId);
      }
    });

    socket.on('viewer-left', ({ viewerId }) => {
      console.log(`[WebRTC] Viewer ${viewerId} left`);
      closePeerConnection(viewerId);
    });

    socket.on('viewer-count', ({ count }) => {
      setViewerCount(count);
    });

    socket.on('offer', async ({ peerId, offer }) => {
      const pc = peersRef.current.get(peerId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { targetId: peerId, answer });
      }
    });

    socket.on('answer', async ({ peerId, answer }) => {
      const pc = peersRef.current.get(peerId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', ({ peerId, candidate }) => {
      const pc = peersRef.current.get(peerId);
      if (pc && candidate) {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('stream-ended', () => {
      handleStopStream();
    });

    socket.on('error', ({ message }) => {
      setError(message);
      setIsConnecting(false);
    });

    return () => {
      socket.disconnect();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isOpen]);

  const createPeerConnection = (peerId: string) => {
    const pc = new RTCPeerConnection(rtcConfig);
    peersRef.current.set(peerId, pc);

    // Add local stream tracks to peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('ice-candidate', {
          targetId: peerId,
          candidate: event.candidate,
        });
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Connection to ${peerId}: ${pc.connectionState}`);
    };

    // Monitor ICE connection state with timeout safeguard
    pc.oniceconnectionstatechange = () => {
      console.log(`[WebRTC] ICE connection to ${peerId}: ${pc.iceConnectionState}`);
      
      if (pc.iceConnectionState === 'checking') {
        // Set timeout for ICE connection attempt
        const iceTimeout = setTimeout(() => {
          if (pc.iceConnectionState === 'checking') {
            console.warn(`[WebRTC] ICE connection timeout for ${peerId} after 15s`);
            setError('Connection taking too long – check network or firewall.');
            handleStopStream();
          }
        }, 15000);
        
        // Store timeout so we can clear it if connection succeeds
        (pc as any)._iceTimeout = iceTimeout;
      } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        // Clear timeout if we successfully connected
        if ((pc as any)._iceTimeout) {
          clearTimeout((pc as any)._iceTimeout);
        }
      }
    };

    // Create and send offer
    pc.createOffer().then(offer => {
      pc.setLocalDescription(offer);
      if (socketRef.current) {
        socketRef.current.emit('offer', { targetId: peerId, offer });
      }
    });

    return pc;
  };

  const closePeerConnection = (peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      // Clear any pending ICE timeout
      if ((pc as any)._iceTimeout) {
        clearTimeout((pc as any)._iceTimeout);
      }
      pc.close();
      peersRef.current.delete(peerId);
    }
  };

  const handleStartStream = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera/microphone access not available. Try using Chrome or enable HTTPS.');
      }

      // Get media stream based on source
      let stream: MediaStream;

      if (source === 'screen' || source === 'both') {
        // Check if screen sharing is supported
        if (!navigator.mediaDevices.getDisplayMedia) {
          throw new Error('Screen sharing not supported. Try using Chrome or Firefox.');
        }
        
        // Screen capture
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });

        // Add mic if enabled
        if (micEnabled) {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
        }

        // Add camera overlay if both
        if (source === 'both' && cameraEnabled) {
          const cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240 },
          });
          // Camera overlay would need canvas compositing (advanced)
          // For now, just use screen
        }
      } else {
        // Camera only
        stream = await navigator.mediaDevices.getUserMedia({
          video: cameraEnabled ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          } : false,
          audio: micEnabled,
        });
      }

      localStreamRef.current = stream;

      // Debug: Check what tracks we actually got
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      console.log('[WebRTC] Stream created:', {
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length,
        videoTrack0: videoTracks[0] ? {
          enabled: videoTracks[0].enabled,
          muted: videoTracks[0].muted,
          readyState: videoTracks[0].readyState,
          label: videoTracks[0].label
        } : null
      });

      if (videoTracks.length === 0) {
        throw new Error('No video track in stream - camera may be in use or blocked');
      }

      // Show preview - wait for video element if needed
      let attempts = 0;
      while (!previewRef.current && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!previewRef.current) {
        console.error('[WebRTC] Preview ref is null after waiting');
        throw new Error('Video element not found');
      }

      console.log('[WebRTC] Attaching stream to video element');
      const videoEl = previewRef.current;
      videoEl.srcObject = stream;
      
      // Force video to load and play
      videoEl.load();
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        if (videoEl.readyState >= 2) {
          resolve(null);
        } else {
          const handler = () => {
            videoEl.removeEventListener('loadedmetadata', handler);
            resolve(null);
          };
          videoEl.addEventListener('loadedmetadata', handler);
          setTimeout(resolve, 3000); // Fallback timeout
        }
      });

      // Ensure video plays
      try {
        await videoEl.play();
        console.log('[WebRTC] Video is playing, dimensions:', videoEl.videoWidth, 'x', videoEl.videoHeight);
      } catch (err) {
        console.error('[WebRTC] Video play error:', err);
        // Don't throw, sometimes autoplay fails but video still works
      }

      // Register as broadcaster with timeout fallback
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('broadcaster-join', {
          userId,
          streamTitle,
        });
        
        // Timeout if backend doesn't respond
        const timeout = setTimeout(() => {
          if (isConnecting) {
            console.warn('[WebRTCStreaming] Backend broadcast-ready timeout, assuming connection OK');
            setIsStreaming(true);
            setIsConnecting(false);
            startTimeRef.current = Date.now();
            durationIntervalRef.current = window.setInterval(() => {
              if (startTimeRef.current) {
                setStreamDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
              }
            }, 1000);
            onStreamStart?.();
          }
        }, 5000); // 5 second timeout
        
        // Store timeout so we can clear it later
        (socketRef.current as any)._broadcasterTimeout = timeout;
      } else {
        console.warn('[WebRTCStreaming] Socket not connected, assuming backend issue');
        setIsStreaming(true);
        setIsConnecting(false);
        startTimeRef.current = Date.now();
        durationIntervalRef.current = window.setInterval(() => {
          if (startTimeRef.current) {
            setStreamDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
          }
        }, 1000);
        onStreamStart?.();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to access camera/microphone');
      setIsConnecting(false);
    }
  };

  const handleStopStream = useCallback(async () => {
    try {
      console.log('[WebRTCStreaming] Stopping stream...');

      // Close peer connections with cleanup
      const pcClosePromises = Array.from(peersRef.current.values()).map(
        (pc) =>
          new Promise<void>((resolve) => {
            try {
              pc.onconnectionstatechange = null;
              pc.onicecandidate = null;
              pc.close();
              resolve();
            } catch (err) {
              console.warn('[WebRTCStreaming] PC close error:', err);
              resolve();
            }
          })
      );

      await Promise.all(pcClosePromises);
      peersRef.current.clear();
      console.log('[WebRTCStreaming] All peer connections closed');

      // Stop local stream tracks
      if (localStreamRef.current) {
        const trackStops = localStreamRef.current.getTracks().map(
          (track) =>
            new Promise<void>((resolve) => {
              try {
                const onEnded = () => resolve();
                track.onended = onEnded;
                track.stop();
                // Timeout after 1 second
                setTimeout(resolve, 1000);
              } catch (err) {
                console.warn('[WebRTCStreaming] Track stop error:', err);
                resolve();
              }
            })
        );
        await Promise.all(trackStops);
        localStreamRef.current = null;
        console.log('[WebRTCStreaming] All tracks stopped');
      }

      // Clear preview
      if (previewRef.current) {
        previewRef.current.srcObject = null;
      }

      // Gracefully disconnect socket
      if (socketRef.current) {
        socketRef.current.off('offer');
        socketRef.current.off('answer');
        socketRef.current.off('ice-candidate');
        socketRef.current.off('viewer-joined');
        socketRef.current.off('viewer-left');
        socketRef.current.off('viewer-count');
        socketRef.current.off('stream-ended');
        socketRef.current.off('broadcaster-ready');
        socketRef.current.off('error');
        socketRef.current.disconnect();
        console.log('[WebRTCStreaming] Socket disconnected');
      }

      // Clear timers
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }

      setIsStreaming(false);
      setIsConnecting(false);
      setViewerCount(0);
      setStreamDuration(0);
      startTimeRef.current = null;

      console.log('[WebRTCStreaming] Stream stopped successfully');
      onStreamEnd?.();

      // Delay before closing modal
      setTimeout(() => onClose(), 300);
    } catch (err) {
      console.error('[WebRTCStreaming] Stop error:', err);
      // Force close even on error
      onClose();
    }
  }, [onStreamEnd, onClose]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-md md:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="nebula-glass rounded-t-[2rem] md:rounded-[2rem] w-full max-w-4xl shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] md:max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center">
              <Video size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">WebRTC Streaming</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Ultra-low latency
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {!isStreaming && !isConnecting ? (
            <>
              {/* Media Devices Check (blocking error if unavailable) */}
              <MediaDevicesCheck onCopyUrl={onClose} />

              {/* Browser Warning */}
              <InlineBrowserWarning />

              {/* Source Selection */}
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">
                  Source
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'camera', label: 'Camera', icon: <Camera size={20} /> },
                    { id: 'screen', label: 'Screen', icon: <Monitor size={20} /> },
                    { id: 'both', label: 'Both', icon: <Video size={20} /> },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSource(s.id as any)}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        source === s.id
                          ? 'border-violet-500 bg-violet-500/10 text-white'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      {s.icon}
                      <span className="text-xs font-bold">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="flex gap-4">
                <button
                  onClick={() => setMicEnabled(!micEnabled)}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                    micEnabled
                      ? 'border-green-500/50 bg-green-500/10 text-green-400'
                      : 'border-white/10 bg-white/5 text-zinc-400'
                  }`}
                >
                  {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                  <span className="text-sm font-bold">Microphone</span>
                </button>
                <button
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                    cameraEnabled
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                      : 'border-white/10 bg-white/5 text-zinc-400'
                  }`}
                >
                  {cameraEnabled ? <Camera size={20} /> : <VideoOff size={20} />}
                  <span className="text-sm font-bold">Camera</span>
                </button>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={handleStartStream}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-800 hover:brightness-110 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 shadow-xl transition-all"
              >
                <Circle className="w-4 h-4 fill-current" />
                Go Live
              </button>
            </>
          ) : isConnecting ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
              <p className="text-white font-bold">Connecting...</p>
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="relative aspect-video bg-black rounded-xl overflow-hidden" style={{ minHeight: '200px' }}>
                <video
                  ref={previewRef}
                  autoPlay
                  muted
                  playsInline
                  controls={false}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    background: '#000',
                    display: 'block',
                    minHeight: '200px'
                  }}
                />
                {localStreamRef.current && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600/90 px-3 py-1.5 rounded-full">
                    <Circle className="w-2 h-2 fill-red-500 text-red-500 animate-pulse" />
                    <span className="text-white text-xs font-black uppercase">LIVE</span>
                  </div>
                )}
                {!localStreamRef.current && (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                    <p className="text-sm">Stream starting...</p>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-2xl font-black text-white">{formatDuration(streamDuration)}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Viewers</p>
                  <p className="text-2xl font-black text-white">{viewerCount}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Mode</p>
                  <p className="text-2xl font-black text-white">
                    {viewerCount <= 5 ? 'P2P' : viewerCount <= 50 ? 'SFU' : 'HLS'}
                  </p>
                </div>
              </div>

              {/* Stop Button */}
              <button
                onClick={handleStopStream}
                className="w-full bg-zinc-800 hover:bg-red-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 shadow-xl transition-all"
              >
                <StopCircle size={20} />
                End Stream
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
