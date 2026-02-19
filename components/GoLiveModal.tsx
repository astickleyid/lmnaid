import React, { useState, useEffect, useRef } from 'react';
import { Video, Monitor, Camera, Mic, MicOff, Settings, X, Circle, StopCircle, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AudioMixer, AudioMixerConfig } from './AudioMixer';
import { WebStreaming } from './WebStreaming';
import { WebRTCStreaming } from './WebRTCStreaming';
import { InlineBrowserWarning } from './BrowserCompatibilityWarning';
import { useUserStore } from '../src/stores';

type StreamPlatform = 'twitch' | 'youtube' | 'kick' | 'facebook' | 'nxcor';

interface PlatformInfo {
  id: StreamPlatform;
  name: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  keyLabel: string;
  keyHelp: string;
  keyHelpUrl: string;
}

const PLATFORMS: PlatformInfo[] = [
  {
    id: 'nxcor',
    name: 'nXcor',
    color: '#8B5CF6',
    gradientFrom: 'from-violet-600',
    gradientTo: 'to-purple-800',
    keyLabel: 'Stream to nXcor',
    keyHelp: 'Stream directly to the nXcor platform. No stream key needed!',
    keyHelpUrl: '#',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    color: '#9146FF',
    gradientFrom: 'from-purple-600',
    gradientTo: 'to-purple-800',
    keyLabel: 'Twitch Stream Key',
    keyHelp: 'Find your stream key at',
    keyHelpUrl: 'https://dashboard.twitch.tv/settings/stream',
  },
  {
    id: 'youtube',
    name: 'YouTube Live',
    color: '#FF0000',
    gradientFrom: 'from-red-600',
    gradientTo: 'to-red-800',
    keyLabel: 'YouTube Stream Key',
    keyHelp: 'Find your stream key at',
    keyHelpUrl: 'https://studio.youtube.com',
  },
  {
    id: 'kick',
    name: 'Kick',
    color: '#53FC18',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-green-700',
    keyLabel: 'Kick Stream Key',
    keyHelp: 'Find your stream key in',
    keyHelpUrl: 'https://kick.com/dashboard/settings/stream',
  },
  {
    id: 'facebook',
    name: 'Facebook Live',
    color: '#1877F2',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-800',
    keyLabel: 'Facebook Stream Key',
    keyHelp: 'Find your stream key at',
    keyHelpUrl: 'https://www.facebook.com/live/producer',
  },
];

interface GoLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoLiveModal: React.FC<GoLiveModalProps> = ({ isOpen, onClose }) => {
  const user = useUserStore(state => state.user);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'screen' | 'window' | 'camera'>('screen');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [streamKey, setStreamKey] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<StreamPlatform>(() => {
    try {
      return (localStorage.getItem('nxcor_stream_platform') as StreamPlatform) || 'twitch';
    } catch { return 'twitch'; }
  });
  const [platformDropdownOpen, setPlatformDropdownOpen] = useState(false);
  const [showWebStreaming, setShowWebStreaming] = useState(false);
  const [showInternalStreaming, setShowInternalStreaming] = useState(false);
  const [streamMode, setStreamMode] = useState<'basic' | 'enhanced'>('basic');
  const audioConfigRef = useRef<AudioMixerConfig>({
    micEnabled: true,
    micDevice: null,
    micVolume: 0.8,
    systemAudioEnabled: false,
    systemAudioDevice: null,
    systemAudioVolume: 0.8,
  });

  const platform = PLATFORMS.find(p => p.id === selectedPlatform) || PLATFORMS[0];

  useEffect(() => {
    if (isOpen) {
      // Check browser compatibility
      if (!window.electron && !navigator.mediaDevices) {
        console.warn('[GoLiveModal] Media devices not available - likely Safari on HTTP or incompatible browser');
      }
      
      if (window.electron) {
        window.electron.getDesktopSources?.().then((sources: any) => {
          setSources(sources || []);
        });
      }
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('nxcor_stream_platform', selectedPlatform);
    } catch {}
  }, [selectedPlatform]);

  const handleStartStream = async () => {
    // nXcor internal streaming: use basic WebRTC only
    if (selectedPlatform === 'nxcor') {
      setShowInternalStreaming(true);
      return;
    }

    // Web-based streaming (no Electron): open WebStreaming
    if (!window.electron) {
      setShowWebStreaming(true);
      return;
    }

    try {
      const ac = audioConfigRef.current;
      const config = {
        source: selectedSource,
        mic: ac.micEnabled,
        micDevice: ac.micDevice,
        micVolume: ac.micVolume,
        systemAudio: ac.systemAudioEnabled,
        systemAudioDevice: ac.systemAudioDevice,
        systemAudioVolume: ac.systemAudioVolume,
        camera: cameraEnabled,
        streamKey: streamKey,
        platform: selectedPlatform,
      };

      await window.electron.startStream(config);
      setIsStreaming(true);
      window.electron.showNotification('Stream Started', `You are now live on ${platform.name}!`);
    } catch (error) {
      console.error('Failed to start stream:', error);
      alert(`Failed to start stream. Make sure you have entered your ${platform.name} stream key.`);
    }
  };

  const handleStopStream = async () => {
    if (window.electron) {
      await window.electron.stopStream();
      setIsStreaming(false);
      window.electron.showNotification('Stream Stopped', 'You are now offline');
    }
  };

  if (!isOpen) return null;

  // Show WebRTC streaming modal for nXcor (basic)
  if (showInternalStreaming) {
    return (
      <WebRTCStreaming
        isOpen={true}
        onClose={() => {
          setShowInternalStreaming(false);
          setIsStreaming(false);
        }}
        userId={user.id}
        streamTitle="Live on nXcor"
        onStreamStart={() => setIsStreaming(true)}
        onStreamEnd={() => {
          setIsStreaming(false);
          setShowInternalStreaming(false);
        }}
      />
    );
  }

  // Show web streaming modal (for non-Electron platforms)
  if (showWebStreaming) {
    return (
      <WebStreaming
        isOpen={true}
        onClose={() => {
          setShowWebStreaming(false);
          setIsStreaming(false);
        }}
        initialStreamKey={streamKey}
        onStreamStart={() => setIsStreaming(true)}
        onStreamEnd={() => {
          setIsStreaming(false);
          setShowWebStreaming(false);
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-md md:p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="nebula-glass rounded-t-[2rem] md:rounded-[2rem] w-full max-w-2xl shadow-2xl border border-white/10 overflow-hidden max-h-[90vh] md:max-h-[85vh] overflow-y-auto safe-bottom"
      >
        {/* Header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20">
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${platform.gradientFrom} ${platform.gradientTo} flex items-center justify-center`}>
              <Video size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Go Live</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Stream to {platform.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {!isStreaming ? (
            <>
              {/* Browser Compatibility Warning */}
              <InlineBrowserWarning />
              
              {/* Platform Selector */}
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">
                  Streaming Platform
                </label>
                <div className="relative">
                  <button
                    onClick={() => setPlatformDropdownOpen(!platformDropdownOpen)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm flex items-center justify-between hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: platform.color }}
                      />
                      <span className="font-bold">{platform.name}</span>
                    </div>
                    <ChevronDown size={16} className={`text-zinc-400 transition-transform ${platformDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {platformDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute z-50 mt-2 w-full bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                      >
                        {PLATFORMS.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedPlatform(p.id);
                              setPlatformDropdownOpen(false);
                              setStreamKey('');
                            }}
                            className={`w-full px-4 py-3 flex items-center gap-3 text-sm transition-all hover:bg-white/10 ${
                              selectedPlatform === p.id ? 'bg-white/5 text-white' : 'text-zinc-400'
                            }`}
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="font-bold">{p.name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Source Selection */}
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">
                  What do you want to stream?
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'screen', label: 'Full Screen', icon: <Monitor size={20} /> },
                    { id: 'window', label: 'Window', icon: <Monitor size={20} /> },
                    { id: 'camera', label: 'Camera', icon: <Camera size={20} /> }
                  ].map((source) => (
                    <button
                      key={source.id}
                      onClick={() => setSelectedSource(source.id as any)}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        selectedSource === source.id
                          ? 'border-primary bg-primary/10 text-white'
                          : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
                      }`}
                    >
                      {source.icon}
                      <span className="text-xs font-bold">{source.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Mixer */}
              <AudioMixer
                onConfigChange={(config) => { audioConfigRef.current = config; }}
              />

              {/* Camera Toggle */}
              <div className="flex gap-4">
                <button
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all flex items-center justify-center gap-3 ${
                    cameraEnabled
                      ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                      : 'border-white/10 bg-white/5 text-zinc-400'
                  }`}
                >
                  <Camera size={20} />
                  <span className="text-sm font-bold">Camera Overlay</span>
                </button>
              </div>

              {/* Stream Key - not needed for nXcor */}
              {selectedPlatform !== 'nxcor' && (
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">
                    {platform.keyLabel}
                  </label>
                  <input
                    type="password"
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    placeholder={`Enter your ${platform.name} stream key...`}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50 transition-all placeholder-zinc-600"
                  />
                  <p className="text-xs text-zinc-600 mt-2">
                    {platform.keyHelp}{' '}
                    <a href={platform.keyHelpUrl} target="_blank" className="text-primary hover:underline">
                      {platform.name} Dashboard
                    </a>
                  </p>
                </div>
              )}
              {selectedPlatform === 'nxcor' && (
                <div className="space-y-3">
                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                    <p className="text-sm text-violet-300 font-medium">
                      🎬 Stream directly from your browser to nXcor
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      No stream key needed. Your stream will appear on the platform for others to watch and chat with you.
                    </p>
                  </div>

                  {/* Stream Mode Selector */}
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">
                      Streaming Mode
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setStreamMode('basic')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          streamMode === 'basic'
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
                        }`}
                      >
                        <div className="text-sm font-bold mb-1">Basic</div>
                        <div className="text-xs opacity-70">Standard WebRTC</div>
                      </button>
                      <button
                        onClick={() => setStreamMode('enhanced')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          streamMode === 'enhanced'
                            ? 'border-purple-500 bg-purple-500/10 text-white'
                            : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20'
                        }`}
                      >
                        <div className="text-sm font-bold mb-1">Enhanced ✨</div>
                        <div className="text-xs opacity-70">AI + Face Tracking</div>
                      </button>
                    </div>
                  </div>

                  {streamMode === 'enhanced' && (
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-xs">
                      <div className="text-purple-300 font-bold mb-1">🚀 Enhanced Features:</div>
                      <ul className="text-zinc-400 space-y-1 list-disc list-inside">
                        <li>Face tracking with AR overlays</li>
                        <li>AI co-host (runs in your browser)</li>
                        <li>WHIP protocol support</li>
                        <li>"Hype mode" detection</li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Start Button */}
              <button
                onClick={handleStartStream}
                disabled={selectedPlatform !== 'nxcor' && !streamKey}
                className={`w-full bg-gradient-to-r ${platform.gradientFrom} ${platform.gradientTo} hover:brightness-110 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white font-black text-sm uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-3 shadow-xl transition-all`}
              >
                <Circle className="w-4 h-4 fill-current" />
                Go Live on {platform.name}
              </button>
            </>
          ) : (
            <>
              {/* Streaming Status */}
              <div className="bg-red-600/10 border border-red-500/20 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Circle className="w-3 h-3 fill-red-500 text-red-500 animate-pulse" />
                  <span className="text-red-500 font-black text-lg uppercase tracking-wider">LIVE</span>
                </div>
                <p className="text-zinc-400 text-sm">You are streaming to {platform.name}</p>
              </div>

              {/* Stream Info */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-2xl font-black text-white">0:00:00</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Viewers</p>
                  <p className="text-2xl font-black text-white">0</p>
                </div>
                <div className="bg-white/5 rounded-xl p-4 text-center">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Bitrate</p>
                  <p className="text-2xl font-black text-white">0</p>
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

// TypeScript declaration for Electron API
declare global {
  interface Window {
    electron?: {
      getAppVersion: () => Promise<string>;
      getPlatform: () => Promise<string>;
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      quitApp: () => Promise<void>;
      startStream: (config: any) => Promise<void>;
      stopStream: () => Promise<void>;
      getStreamStatus: () => Promise<any>;
      getDesktopSources: () => Promise<any[]>;
      getAudioDevices: () => Promise<any>;
      showNotification: (title: string, body: string) => Promise<void>;
      onDeepLink: (callback: (url: string) => void) => void;
      onStreamStarted: (callback: () => void) => void;
      onStreamStopped: (callback: () => void) => void;
      onStreamError: (callback: (error: string) => void) => void;
    };
  }
}
