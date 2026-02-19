import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Video, VideoOff, Monitor, Camera, CameraOff, Mic, MicOff,
  Settings, X, Circle, StopCircle, Users, Radio, ScreenShare,
  ScreenShareOff, RefreshCw, ChevronDown, Wifi, WifiOff,
  Download, Scissors, Activity, AlertTriangle, Smartphone,
  Save, Play, Pause, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InlineBrowserWarning } from './BrowserCompatibilityWarning';
import { MediaDevicesCheck } from './MediaDevicesCheck';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StreamConfig {
  rtmpUrl: string;
  streamKey: string;
  videoBitrate: number;
  audioBitrate: number;
  frameRate: number;
  resolution: '720p' | '1080p' | '480p' | '360p';
}

interface StreamHealth {
  bitrate: number;        // kbps actual
  fps: number;            // actual fps
  droppedFrames: number;
  totalFrames: number;
  latency: number;        // ms
  timestamp: number;
}

interface WebStreamingProps {
  isOpen: boolean;
  onClose: () => void;
  serverUrl?: string;
  initialStreamKey?: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  /** Stream to internal nXcor platform instead of external RTMP */
  internalMode?: boolean;
  /** Pre-filled stream title for internal mode */
  streamTitle?: string;
}

type SourceType = 'camera' | 'screen' | 'both';
type StreamState = 'idle' | 'preview' | 'connecting' | 'live' | 'error';

const RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '360p':  { width: 640,  height: 360  },
  '480p':  { width: 854,  height: 480  },
  '720p':  { width: 1280, height: 720  },
  '1080p': { width: 1920, height: 1080 },
};

const DEFAULT_CONFIG: StreamConfig = {
  rtmpUrl: 'rtmp://localhost/live',
  streamKey: '',
  videoBitrate: 2500,
  audioBitrate: 128,
  frameRate: 30,
  resolution: '720p',
};

// ─── Mobile Detection ────────────────────────────────────────────────────────

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function supportsGetDisplayMedia(): boolean {
  return typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function';
}

function supportsMediaRecorder(): boolean {
  return typeof MediaRecorder !== 'undefined';
}

function getBestMimeType(): string {
  if (!supportsMediaRecorder()) return '';
  const types = [
    'video/webm;codecs=h264,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // Safari
    'video/webm',
    'video/mp4',
  ];
  return types.find(m => MediaRecorder.isTypeSupported(m)) || '';
}

function getMobileOptimalConfig(): Partial<StreamConfig> {
  if (!isMobile()) return {};
  return {
    resolution: '480p',
    videoBitrate: 1500,
    frameRate: 24,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export const WebStreaming: React.FC<WebStreamingProps> = ({
  isOpen, onClose, serverUrl, initialStreamKey, onStreamStart, onStreamEnd,
  internalMode = false, streamTitle = '',
}) => {
  // State
  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [source, setSource] = useState<SourceType>('camera');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenEnabled, setScreenEnabled] = useState(false);
  const [config, setConfig] = useState<StreamConfig>(() => ({
    ...DEFAULT_CONFIG,
    ...getMobileOptimalConfig(),
    streamKey: initialStreamKey || '',
    rtmpUrl: internalMode ? `${window.location.origin}/internal/live` : DEFAULT_CONFIG.rtmpUrl,
  }));
  const [showSettings, setShowSettings] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamDuration, setStreamDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mobileWarning, setMobileWarning] = useState<string | null>(null);
  const [devices, setDevices] = useState<{ cameras: MediaDeviceInfo[]; mics: MediaDeviceInfo[] }>({
    cameras: [], mics: [],
  });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [health, setHealth] = useState<StreamHealth | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [clipSaving, setClipSaving] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');

  // Refs
  const previewRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const combinedStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const localRecorderRef = useRef<MediaRecorder | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const healthIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(0);
  const clipBufferRef = useRef<Blob[]>([]);
  const bytesSentRef = useRef<number>(0);
  const lastHealthRef = useRef<number>(0);

  const mobile = isMobile();
  const ios = isIOS();

  // ── Capability checks on mount ──────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;

    // Check capabilities and warn
    const warnings: string[] = [];

    if (ios && !supportsGetDisplayMedia()) {
      warnings.push('Screen sharing is not supported on iOS Safari.');
    }
    if (mobile && !supportsMediaRecorder()) {
      warnings.push('Your browser does not support MediaRecorder. Try Chrome or Firefox.');
    }
    if (mobile && !getBestMimeType()) {
      warnings.push('No supported video codec found for streaming.');
    }

    // On mobile, default to camera-only
    if (mobile) {
      setSource('camera');
      // Lower resolution for mobile
      setConfig(c => ({ ...c, ...getMobileOptimalConfig() }));
    }

    if (warnings.length > 0) {
      setMobileWarning(warnings.join(' '));
    }

    // Check permissions
    checkPermissions();
  }, [isOpen, mobile, ios]);

  // ── Permission check ────────────────────────────────────────────────────

  const checkPermissions = async () => {
    try {
      if (navigator.permissions) {
        const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
        const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (cam.state === 'denied' || mic.state === 'denied') {
          setPermissionState('denied');
          setError('Camera or microphone permission denied. Please allow access in your browser settings.');
        } else if (cam.state === 'granted' && mic.state === 'granted') {
          setPermissionState('granted');
        } else {
          setPermissionState('prompt');
        }
      }
    } catch {
      // permissions API not available, we'll find out when we request
      setPermissionState('unknown');
    }
  };

  // ── Device enumeration ──────────────────────────────────────────────────

  const enumerateDevices = useCallback(async () => {
    try {
      // On mobile, we need to request a stream first to get labels
      if (mobile && permissionState !== 'granted') {
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          tempStream.getTracks().forEach(t => t.stop());
        } catch {
          // Permission not granted yet
        }
      }

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        cameras: allDevices.filter(d => d.kind === 'videoinput'),
        mics: allDevices.filter(d => d.kind === 'audioinput'),
      });
    } catch (err: any) {
      console.warn('[WebStreaming] Device enumeration failed:', err.message);
    }
  }, [mobile, permissionState]);

  useEffect(() => {
    if (isOpen) enumerateDevices();
  }, [isOpen, enumerateDevices]);

  // ── Media acquisition (mobile-safe) ─────────────────────────────────────

  const getCameraStream = useCallback(async () => {
    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera/microphone not available. This site requires HTTPS or a compatible browser like Chrome.');
    }

    const res = RESOLUTIONS[config.resolution];

    // Build constraints - mobile-friendly
    const videoConstraints: MediaTrackConstraints | boolean = cameraEnabled ? {
      ...(mobile ? {
        facingMode: { ideal: facingMode },
        width: { ideal: res.width, max: res.width },
        height: { ideal: res.height, max: res.height },
        frameRate: { ideal: config.frameRate, max: 30 },
      } : {
        deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
        width: { ideal: res.width },
        height: { ideal: res.height },
        frameRate: { ideal: config.frameRate },
      }),
    } : false;

    const audioConstraints: MediaTrackConstraints | boolean = micEnabled ? {
      ...(mobile ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } : {
        deviceId: selectedMic ? { exact: selectedMic } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }),
    } : false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });
      cameraStreamRef.current = stream;
      setPermissionState('granted');
      return stream;
    } catch (err: any) {
      // Provide specific mobile error messages
      if (err.name === 'NotAllowedError') {
        throw new Error(
          mobile
            ? 'Camera/microphone access denied. Tap the lock icon in your address bar to allow access, then try again.'
            : 'Camera/microphone access denied. Please allow access in your browser settings.'
        );
      }
      if (err.name === 'NotFoundError') {
        throw new Error('No camera or microphone found. Make sure your device has a camera.');
      }
      if (err.name === 'NotReadableError' || err.name === 'AbortError') {
        throw new Error(
          'Camera is in use by another app. Close other apps using the camera and try again.'
        );
      }
      if (err.name === 'OverconstrainedError') {
        // Fallback: try with minimal constraints
        console.warn('[WebStreaming] Overconstrained, falling back to minimal constraints');
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: cameraEnabled,
          audio: micEnabled,
        });
        cameraStreamRef.current = fallbackStream;
        return fallbackStream;
      }
      throw err;
    }
  }, [cameraEnabled, micEnabled, selectedCamera, selectedMic, config.resolution, config.frameRate, mobile, facingMode]);

  const getScreenStream = useCallback(async () => {
    if (!supportsGetDisplayMedia()) {
      throw new Error(
        ios
          ? 'Screen sharing is not available on iOS. Use Camera mode instead.'
          : 'Screen sharing is not supported in this browser. Try Chrome or Edge on desktop.'
      );
    }

    const res = RESOLUTIONS[config.resolution];
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: res.width },
          height: { ideal: res.height },
          frameRate: { ideal: config.frameRate },
        },
        audio: true,
      });
      screenStreamRef.current = stream;

      stream.getVideoTracks()[0].onended = () => {
        setScreenEnabled(false);
        if (streamState === 'live') stopStream();
      };
      return stream;
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        throw new Error('Screen sharing was cancelled or denied.');
      }
      throw err;
    }
  }, [config.resolution, config.frameRate, ios, streamState]);

  // ── Canvas compositor ───────────────────────────────────────────────────

  const compositeStreams = useCallback((camera: MediaStream, screen: MediaStream): MediaStream => {
    const res = RESOLUTIONS[config.resolution];
    const canvas = document.createElement('canvas');
    canvas.width = res.width;
    canvas.height = res.height;
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d')!;

    const camVideo = document.createElement('video');
    camVideo.srcObject = camera;
    camVideo.muted = true;
    camVideo.setAttribute('playsinline', 'true');
    camVideo.play().catch(() => {});

    const scrVideo = document.createElement('video');
    scrVideo.srcObject = screen;
    scrVideo.muted = true;
    scrVideo.setAttribute('playsinline', 'true');
    scrVideo.play().catch(() => {});

    const draw = () => {
      ctx.drawImage(scrVideo, 0, 0, canvas.width, canvas.height);
      const pipW = Math.round(canvas.width * 0.25);
      const pipH = Math.round(canvas.height * 0.25);
      const margin = 16;
      // Round corners on PIP
      ctx.save();
      const x = canvas.width - pipW - margin;
      const y = canvas.height - pipH - margin;
      const r = 8;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + pipW - r, y);
      ctx.quadraticCurveTo(x + pipW, y, x + pipW, y + r);
      ctx.lineTo(x + pipW, y + pipH - r);
      ctx.quadraticCurveTo(x + pipW, y + pipH, x + pipW - r, y + pipH);
      ctx.lineTo(x + r, y + pipH);
      ctx.quadraticCurveTo(x, y + pipH, x, y + pipH - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(camVideo, x, y, pipW, pipH);
      ctx.restore();

      // PIP border
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, pipW, pipH, r);
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(draw);
    };
    draw();

    const composited = canvas.captureStream(config.frameRate);
    // Mix audio
    try {
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      [camera, screen].forEach(s => {
        s.getAudioTracks().forEach(t => {
          const src = audioCtx.createMediaStreamSource(new MediaStream([t]));
          src.connect(dest);
        });
      });
      dest.stream.getAudioTracks().forEach(t => composited.addTrack(t));
    } catch (e) {
      // If AudioContext fails, just use camera audio
      camera.getAudioTracks().forEach(t => composited.addTrack(t));
    }
    return composited;
  }, [config.resolution, config.frameRate]);

  // ── Preview ─────────────────────────────────────────────────────────────

  const startPreview = useCallback(async () => {
    setError(null);
    setMobileWarning(null);

    try {
      stopAllMedia();

      let previewStream: MediaStream;
      if (source === 'camera') {
        previewStream = await getCameraStream();
      } else if (source === 'screen') {
        previewStream = await getScreenStream();
        if (micEnabled) {
          try {
            const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
            mic.getAudioTracks().forEach(t => previewStream.addTrack(t));
            cameraStreamRef.current = mic;
          } catch {
            setMobileWarning('Could not access microphone for screen share. Streaming without mic.');
          }
        }
      } else {
        const cam = await getCameraStream();
        const scr = await getScreenStream();
        previewStream = compositeStreams(cam, scr);
      }

      combinedStreamRef.current = previewStream;
      if (previewRef.current) {
        previewRef.current.srcObject = previewStream;
        // Critical for iOS: must be muted + playsinline + autoplay
        previewRef.current.muted = true;
        previewRef.current.setAttribute('playsinline', 'true');
        previewRef.current.setAttribute('webkit-playsinline', 'true');
        await previewRef.current.play().catch(() => {
          // iOS sometimes needs user gesture
          setMobileWarning('Tap the preview to start video playback.');
        });
      }
      setStreamState('preview');
    } catch (err: any) {
      console.error('[WebStreaming] Preview error:', err);
      setError(err.message || 'Failed to access media devices');
      setStreamState('error');
    }
  }, [source, getCameraStream, getScreenStream, compositeStreams, micEnabled]);

  // ── Camera flip (mobile) ────────────────────────────────────────────────

  const flipCamera = useCallback(async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);

    if (streamState === 'preview' || streamState === 'live') {
      // Swap camera track in-place
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: newMode } },
        });
        const newTrack = newStream.getVideoTracks()[0];

        // Replace in camera stream
        const oldTrack = cameraStreamRef.current?.getVideoTracks()[0];
        if (oldTrack && cameraStreamRef.current) {
          cameraStreamRef.current.removeTrack(oldTrack);
          cameraStreamRef.current.addTrack(newTrack);
          oldTrack.stop();
        }

        // Replace in combined stream
        if (combinedStreamRef.current) {
          const oldCombinedTrack = combinedStreamRef.current.getVideoTracks()[0];
          if (oldCombinedTrack && source === 'camera') {
            combinedStreamRef.current.removeTrack(oldCombinedTrack);
            combinedStreamRef.current.addTrack(newTrack);
            oldCombinedTrack.stop();
          }
        }

        // Update preview
        if (previewRef.current && source === 'camera') {
          previewRef.current.srcObject = cameraStreamRef.current;
        }
      } catch {
        setMobileWarning('Could not switch camera. Your device may only have one camera.');
      }
    }
  }, [facingMode, streamState, source]);

  // ── WebSocket RTMP relay ────────────────────────────────────────────────

  const connectWebSocket = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const url = serverUrl ||
        (internalMode
          ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/internal-stream`
          : `ws://${window.location.hostname}:8089/ws/rtmp`);

      const ws = new WebSocket(url);
      ws.binaryType = 'arraybuffer';

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timed out. Check your network connection.'));
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.send(JSON.stringify({
          type: 'config',
          rtmpUrl: internalMode ? 'internal' : `${config.rtmpUrl}/${config.streamKey}`,
          streamKey: config.streamKey,
          videoBitrate: config.videoBitrate,
          audioBitrate: config.audioBitrate,
          title: streamTitle,
          internal: internalMode,
        }));
        resolve(ws);
      };

      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data as string);
          if (msg.type === 'viewers') setViewerCount(msg.count ?? 0);
          if (msg.type === 'quality') setConnectionQuality(msg.quality ?? 'good');
          if (msg.type === 'error') {
            setError(msg.message);
            stopStream();
          }
          if (msg.type === 'stream-key') {
            // Internal mode: server assigns stream key
            setConfig(c => ({ ...c, streamKey: msg.key }));
          }
        } catch { /* binary */ }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(
          mobile
            ? 'Connection failed. Make sure you have a stable internet connection.'
            : 'WebSocket connection failed. Is the relay server running?'
        ));
      };
      ws.onclose = (e) => {
        clearTimeout(timeout);
        if (streamState === 'live') {
          setError('Connection lost. Stream ended.');
          stopStream();
        }
      };

      wsRef.current = ws;
    });
  }, [serverUrl, config, streamState, internalMode, streamTitle, mobile]);

  // ── Stream Health Monitoring ────────────────────────────────────────────

  const startHealthMonitoring = useCallback(() => {
    bytesSentRef.current = 0;
    lastHealthRef.current = Date.now();

    healthIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastHealthRef.current) / 1000;
      if (elapsed <= 0) return;

      const bitrate = Math.round((bytesSentRef.current * 8) / 1000 / elapsed);

      // Get recorder stats if available
      let fps = config.frameRate;
      let droppedFrames = 0;
      let totalFrames = 0;

      // Try to get WebRTC stats for more accurate metrics
      if (recorderRef.current && (recorderRef.current as any).videoBitsPerSecond) {
        // MediaRecorder doesn't expose frame stats directly
        // Estimate based on duration
        totalFrames = Math.round(streamDuration * config.frameRate);
      }

      const newHealth: StreamHealth = {
        bitrate,
        fps,
        droppedFrames,
        totalFrames,
        latency: 0, // Would need RTT measurement
        timestamp: now,
      };

      setHealth(newHealth);
      bytesSentRef.current = 0;
      lastHealthRef.current = now;
    }, 2000);
  }, [config.frameRate, streamDuration]);

  // ── Go Live ─────────────────────────────────────────────────────────────

  const goLive = useCallback(async () => {
    if (!combinedStreamRef.current) return;
    if (!internalMode && !config.streamKey) {
      setError('Stream key is required');
      return;
    }

    // Validate codec support
    const mimeType = getBestMimeType();
    if (!mimeType) {
      setError(
        mobile
          ? 'Your browser does not support video recording for streaming. Try using Chrome.'
          : 'No supported video codec found. Try a different browser.'
      );
      return;
    }

    setError(null);
    setStreamState('connecting');

    try {
      const ws = await connectWebSocket();

      const recorder = new MediaRecorder(combinedStreamRef.current, {
        mimeType,
        videoBitsPerSecond: config.videoBitrate * 1000,
        audioBitsPerSecond: config.audioBitrate * 1000,
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          bytesSentRef.current += e.data.size;
          e.data.arrayBuffer().then(buf => ws.send(buf));
        }
        // Keep last 30s of chunks for clips
        clipBufferRef.current.push(e.data);
        const maxChunks = 30; // 30 x 1s chunks = 30s
        if (clipBufferRef.current.length > maxChunks) {
          clipBufferRef.current.shift();
        }
      };

      recorder.onerror = (e: any) => {
        console.error('[WebStreaming] Recorder error:', e);
        setError('Recording error: ' + (e.error?.message || 'Unknown'));
        stopStream();
      };

      // Shorter timeslice on mobile for lower latency
      recorder.start(mobile ? 500 : 1000);
      recorderRef.current = recorder;

      startTimeRef.current = Date.now();
      durationIntervalRef.current = setInterval(() => {
        setStreamDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      startHealthMonitoring();

      setStreamState('live');
      onStreamStart?.();
    } catch (err: any) {
      console.error('[WebStreaming] Go live error:', err);
      setError(err.message || 'Failed to start stream');
      setStreamState('preview');
    }
  }, [config, connectWebSocket, onStreamStart, mobile, internalMode, startHealthMonitoring]);

  // ── Local Recording ─────────────────────────────────────────────────────

  const toggleRecording = useCallback(() => {
    if (!combinedStreamRef.current) return;

    if (isRecording) {
      // Stop recording
      localRecorderRef.current?.stop();
      localRecorderRef.current = null;
      setIsRecording(false);
    } else {
      // Start recording
      const mimeType = getBestMimeType();
      if (!mimeType) return;

      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(combinedStreamRef.current, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nxcor-stream-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setRecordedChunks([]);
      };
      recorder.start(1000);
      localRecorderRef.current = recorder;
      setIsRecording(true);
    }
  }, [isRecording]);

  // ── Clip (save last 30s) ────────────────────────────────────────────────

  const saveClip = useCallback(() => {
    if (clipBufferRef.current.length === 0) return;
    setClipSaving(true);

    const mimeType = getBestMimeType() || 'video/webm';
    const blob = new Blob(clipBufferRef.current, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nxcor-clip-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    a.click();
    URL.revokeObjectURL(url);

    setTimeout(() => setClipSaving(false), 1000);
  }, []);

  // ── Stop ────────────────────────────────────────────────────────────────

  const stopAllMedia = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    [cameraStreamRef, screenStreamRef, combinedStreamRef].forEach(ref => {
      ref.current?.getTracks().forEach(t => t.stop());
      ref.current = null;
    });
  }, []);

  const stopStream = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    localRecorderRef.current?.stop();
    localRecorderRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    clearInterval(durationIntervalRef.current);
    clearInterval(healthIntervalRef.current);
    setStreamDuration(0);
    setViewerCount(0);
    setHealth(null);
    setIsRecording(false);
    clipBufferRef.current = [];
    stopAllMedia();
    if (previewRef.current) previewRef.current.srcObject = null;
    setStreamState('idle');
    onStreamEnd?.();
  }, [stopAllMedia, onStreamEnd]);

  useEffect(() => {
    if (!isOpen) stopStream();
    return () => stopStream();
  }, [isOpen]);

  // ── Toggle mic/camera while live ────────────────────────────────────────

  const toggleMic = () => {
    const tracks = [
      ...(cameraStreamRef.current?.getAudioTracks() || []),
      ...(combinedStreamRef.current?.getAudioTracks() || []),
    ];
    tracks.forEach(t => (t.enabled = !micEnabled));
    setMicEnabled(!micEnabled);
  };

  const toggleCamera = () => {
    const tracks = cameraStreamRef.current?.getVideoTracks() || [];
    tracks.forEach(t => (t.enabled = !cameraEnabled));
    setCameraEnabled(!cameraEnabled);
  };

  // ── Helpers ─────────────────────────────────────────────────────────────

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return [h, m, sec].map(v => String(v).padStart(2, '0')).join(':');
  };

  const handlePreviewTap = () => {
    // iOS needs user interaction to play video
    if (previewRef.current && previewRef.current.paused) {
      previewRef.current.play().catch(() => {});
    }
  };

  if (!isOpen) return null;

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && streamState === 'idle' && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: mobile ? 100 : 0 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: mobile ? 100 : 0 }}
          className={`bg-[#1a1a2e] w-full shadow-2xl border border-white/10 overflow-y-auto ${
            mobile
              ? 'rounded-t-2xl max-h-[95vh]'
              : 'rounded-2xl max-w-4xl max-h-[90vh] m-4'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 sticky top-0 bg-[#1a1a2e]/95 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Video className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold text-white truncate">
                {internalMode ? 'Stream to nXcor' : 'Web Streaming'}
              </h2>
              {streamState === 'live' && (
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold flex-shrink-0"
                >
                  <Circle className="w-2 h-2 fill-red-500" />
                  LIVE · {formatDuration(streamDuration)}
                </motion.div>
              )}
              {streamState === 'live' && (
                <div className="flex items-center gap-1 text-gray-400 text-xs flex-shrink-0">
                  <Users className="w-3.5 h-3.5" />
                  {viewerCount}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {streamState === 'live' && (
                <div className={`flex items-center gap-1 text-[10px] sm:text-xs ${
                  connectionQuality === 'good' ? 'text-green-400' :
                  connectionQuality === 'fair' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden sm:inline">{connectionQuality}</span>
                </div>
              )}
              <button onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400">
                <Settings className="w-4 h-4" />
              </button>
              <button onClick={streamState === 'live' ? stopStream : onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Media devices check (blocking error) */}
            <MediaDevicesCheck />

            {/* Browser compatibility warning */}
            <InlineBrowserWarning />

            {/* Mobile warning */}
            {mobileWarning && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg px-3 py-2 text-xs sm:text-sm flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{mobileWarning}</span>
              </motion.div>
            )}

            {/* Preview area */}
            <div
              className="relative aspect-video bg-black rounded-xl overflow-hidden"
              onClick={handlePreviewTap}
            >
              <video
                ref={previewRef}
                muted
                playsInline
                autoPlay
                // @ts-ignore - webkit attribute
                webkit-playsinline="true"
                className={`w-full h-full object-contain ${
                  source === 'camera' && facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />
              {streamState === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2 p-4">
                  {mobile ? (
                    <>
                      <Smartphone className="w-10 h-10 opacity-30" />
                      <p className="text-sm text-center">Tap "Start Preview" to begin</p>
                    </>
                  ) : (
                    <>
                      <Video className="w-12 h-12 opacity-30" />
                      <p className="text-sm">Select a source and start preview</p>
                    </>
                  )}
                </div>
              )}
              {streamState === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <RefreshCw className="w-8 h-8 text-purple-400" />
                  </motion.div>
                </div>
              )}

              {/* Mobile camera flip button */}
              {mobile && source === 'camera' && (streamState === 'preview' || streamState === 'live') && (
                <button
                  onClick={flipCamera}
                  className="absolute top-3 right-3 p-2.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Stream Health Bar */}
            {streamState === 'live' && health && (
              <div className="flex items-center gap-3 sm:gap-4 bg-white/5 rounded-lg px-3 py-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-gray-400">
                    <span className={`font-mono font-bold ${
                      health.bitrate > 1500 ? 'text-green-400' :
                      health.bitrate > 500 ? 'text-yellow-400' : 'text-red-400'
                    }`}>{health.bitrate}</span> kbps
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400">
                    <span className="font-mono font-bold text-gray-200">{config.frameRate}</span> fps
                  </span>
                </div>
                {health.droppedFrames > 0 && (
                  <div className="flex items-center gap-1.5 text-red-400">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{health.droppedFrames} dropped</span>
                  </div>
                )}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm">
                {error}
              </motion.div>
            )}

            {/* Source selection */}
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'camera' as SourceType, icon: Camera, label: 'Camera', mobileOk: true },
                { id: 'screen' as SourceType, icon: Monitor, label: 'Screen', mobileOk: !ios },
                { id: 'both' as SourceType, icon: ScreenShare, label: 'Both', mobileOk: !ios },
              ]).filter(s => !mobile || s.mobileOk).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => { setSource(id); if (streamState === 'preview') startPreview(); }}
                  disabled={streamState === 'live'}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    source === id
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                  } disabled:opacity-50`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Settings panel */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white/5 rounded-xl p-3 sm:p-4 space-y-3 border border-white/10">
                    <h3 className="text-sm font-semibold text-gray-300">Stream Settings</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* RTMP URL - hide in internal mode */}
                      {!internalMode && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">RTMP Server</label>
                          <input
                            value={config.rtmpUrl}
                            onChange={e => setConfig(c => ({ ...c, rtmpUrl: e.target.value }))}
                            disabled={streamState === 'live'}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                            placeholder="rtmp://localhost/live"
                          />
                        </div>
                      )}
                      {/* Stream Key - hide in internal mode */}
                      {!internalMode && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Stream Key</label>
                          <input
                            type="password"
                            value={config.streamKey}
                            onChange={e => setConfig(c => ({ ...c, streamKey: e.target.value }))}
                            disabled={streamState === 'live'}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
                            placeholder="Your stream key"
                          />
                        </div>
                      )}
                      {/* Resolution */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">Resolution</label>
                        <select
                          value={config.resolution}
                          onChange={e => setConfig(c => ({ ...c, resolution: e.target.value as any }))}
                          disabled={streamState === 'live'}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                        >
                          <option value="360p">360p {mobile ? '(Recommended)' : ''}</option>
                          <option value="480p">480p {mobile ? '' : ''}</option>
                          <option value="720p">720p {mobile ? '' : '(Recommended)'}</option>
                          {!mobile && <option value="1080p">1080p</option>}
                        </select>
                      </div>
                      {/* Bitrate */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">
                          Video Bitrate: {config.videoBitrate} kbps
                        </label>
                        <input
                          type="range"
                          min={mobile ? 300 : 500}
                          max={mobile ? 4000 : 8000}
                          step={100}
                          value={config.videoBitrate}
                          onChange={e => setConfig(c => ({ ...c, videoBitrate: +e.target.value }))}
                          disabled={streamState === 'live'}
                          className="w-full accent-purple-500"
                        />
                      </div>
                      {/* Camera selector (desktop only) */}
                      {!mobile && devices.cameras.length > 0 && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Camera</label>
                          <select
                            value={selectedCamera}
                            onChange={e => setSelectedCamera(e.target.value)}
                            disabled={streamState === 'live'}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                          >
                            <option value="">Default</option>
                            {devices.cameras.map(d => (
                              <option key={d.deviceId} value={d.deviceId}>
                                {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {/* Mic selector */}
                      {devices.mics.length > 1 && (
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Microphone</label>
                          <select
                            value={selectedMic}
                            onChange={e => setSelectedMic(e.target.value)}
                            disabled={streamState === 'live'}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                          >
                            <option value="">Default</option>
                            {devices.mics.map(d => (
                              <option key={d.deviceId} value={d.deviceId}>
                                {d.label || `Mic ${d.deviceId.slice(0, 8)}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
              {/* Left: media toggles */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button onClick={toggleMic}
                  className={`p-2 sm:p-2.5 rounded-lg transition-colors ${micEnabled ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`}>
                  {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                {source !== 'screen' && (
                  <button onClick={toggleCamera}
                    className={`p-2 sm:p-2.5 rounded-lg transition-colors ${cameraEnabled ? 'bg-white/10 text-white' : 'bg-red-500/20 text-red-400'}`}>
                    {cameraEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                  </button>
                )}

                {/* Recording toggle (when live) */}
                {(streamState === 'live' || streamState === 'preview') && (
                  <button onClick={toggleRecording}
                    title={isRecording ? 'Stop recording' : 'Record locally'}
                    className={`p-2 sm:p-2.5 rounded-lg transition-colors ${isRecording ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-gray-400 hover:text-white'}`}>
                    {isRecording ? <StopCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  </button>
                )}

                {/* Clip button (when live) */}
                {streamState === 'live' && (
                  <button onClick={saveClip}
                    disabled={clipSaving}
                    title="Save last 30s clip"
                    className="p-2 sm:p-2.5 rounded-lg transition-colors bg-white/10 text-gray-400 hover:text-white disabled:opacity-50">
                    <Scissors className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Right: main actions */}
              <div className="flex items-center gap-2">
                {streamState === 'idle' && (
                  <button onClick={startPreview}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Preview
                  </button>
                )}
                {streamState === 'preview' && (
                  <>
                    <button onClick={stopStream}
                      className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-gray-300 text-sm transition-colors">
                      Cancel
                    </button>
                    <button onClick={goLive}
                      className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors flex items-center gap-2">
                      <Radio className="w-4 h-4" />
                      Go Live
                    </button>
                  </>
                )}
                {(streamState === 'live' || streamState === 'connecting') && (
                  <button onClick={stopStream}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition-colors flex items-center gap-2">
                    <StopCircle className="w-4 h-4" />
                    End Stream
                  </button>
                )}
                {streamState === 'error' && (
                  <button onClick={() => { setStreamState('idle'); setError(null); }}
                    className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default WebStreaming;
