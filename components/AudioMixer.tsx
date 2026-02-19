import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Activity, RefreshCw } from 'lucide-react';

interface AudioDevice {
  id: string;
  name: string;
  type: string;
}

interface AudioDevices {
  microphones: AudioDevice[];
  systemAudio: AudioDevice[];
  defaultMic: string | null;
  defaultSystemAudio: string | null;
}

interface AudioMixerProps {
  onConfigChange: (config: AudioMixerConfig) => void;
  compact?: boolean;
}

export interface AudioMixerConfig {
  micEnabled: boolean;
  micDevice: string | null;
  micVolume: number;
  systemAudioEnabled: boolean;
  systemAudioDevice: string | null;
  systemAudioVolume: number;
}

export const AudioMixer: React.FC<AudioMixerProps> = ({ onConfigChange, compact = false }) => {
  const [devices, setDevices] = useState<AudioDevices | null>(null);
  const [loading, setLoading] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [micDevice, setMicDevice] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState(0.8);
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false);
  const [systemAudioDevice, setSystemAudioDevice] = useState<string | null>(null);
  const [systemAudioVolume, setSystemAudioVolume] = useState(0.8);
  const [micLevel, setMicLevel] = useState(0);
  const [sysLevel, setSysLevel] = useState(0);
  const animFrameRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Emit config changes
  useEffect(() => {
    onConfigChange({
      micEnabled,
      micDevice,
      micVolume,
      systemAudioEnabled,
      systemAudioDevice,
      systemAudioVolume,
    });
  }, [micEnabled, micDevice, micVolume, systemAudioEnabled, systemAudioDevice, systemAudioVolume]);

  // Load devices
  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      if (window.electron?.getAudioDevices) {
        const d = await window.electron.getAudioDevices();
        setDevices(d);
        if (d.defaultMic && !micDevice) setMicDevice(d.defaultMic);
        if (d.defaultSystemAudio && !systemAudioDevice) setSystemAudioDevice(d.defaultSystemAudio);
      } else {
        // Web fallback: use getUserMedia to enumerate
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          const mediaDevices = await navigator.mediaDevices.enumerateDevices();
          const mics = mediaDevices
            .filter((d) => d.kind === 'audioinput')
            .map((d) => ({ id: d.deviceId, name: d.label || `Microphone ${d.deviceId.slice(0, 8)}`, type: 'webrtc' }));
          setDevices({
            microphones: mics,
            systemAudio: [],
            defaultMic: mics[0]?.id || null,
            defaultSystemAudio: null,
          });
          if (mics[0] && !micDevice) setMicDevice(mics[0].id);
        } catch {
          setDevices({ microphones: [], systemAudio: [], defaultMic: null, defaultSystemAudio: null });
        }
      }
    } catch (e) {
      console.error('Failed to load audio devices:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDevices();
    return () => {
      stopMicPreview();
    };
  }, []);

  // Mic preview (web) — shows live level meter
  const startMicPreview = useCallback(async () => {
    stopMicPreview();
    if (!micEnabled || !micDevice) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: micDevice ? { exact: micDevice } : undefined },
      });
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;

      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        setMicLevel(Math.min(1, rms * 3));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn('Mic preview unavailable:', e);
    }
  }, [micEnabled, micDevice]);

  const stopMicPreview = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    audioContextRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    setMicLevel(0);
  }, []);

  useEffect(() => {
    if (micEnabled && micDevice) {
      startMicPreview();
    } else {
      stopMicPreview();
    }
  }, [micEnabled, micDevice]);

  // Simulated system audio level (actual level only available during stream)
  useEffect(() => {
    if (!systemAudioEnabled) {
      setSysLevel(0);
      return;
    }
    const id = setInterval(() => {
      setSysLevel(Math.random() * 0.3 + 0.1); // placeholder animation
    }, 150);
    return () => clearInterval(id);
  }, [systemAudioEnabled]);

  const LevelMeter: React.FC<{ level: number; color: string }> = ({ level, color }) => (
    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-75"
        style={{
          width: `${Math.max(2, level * 100)}%`,
          background: level > 0.8 ? '#ef4444' : level > 0.5 ? '#eab308' : color,
        }}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs py-4">
        <RefreshCw size={14} className="animate-spin" />
        Detecting audio devices...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
          Audio Mixer
        </label>
        <button
          onClick={loadDevices}
          className="p-1 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Refresh devices"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Microphone */}
      <div
        className={`rounded-xl border-2 transition-all p-4 ${
          micEnabled ? 'border-green-500/30 bg-green-500/5' : 'border-white/10 bg-white/5'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setMicEnabled(!micEnabled)}
            className="flex items-center gap-2 text-sm font-bold"
          >
            {micEnabled ? (
              <Mic size={16} className="text-green-400" />
            ) : (
              <MicOff size={16} className="text-zinc-500" />
            )}
            <span className={micEnabled ? 'text-green-400' : 'text-zinc-500'}>Microphone</span>
          </button>
          {micEnabled && <Activity size={12} className="text-green-400 animate-pulse" />}
        </div>

        {micEnabled && (
          <>
            {/* Device selector */}
            {devices && devices.microphones.length > 0 && (
              <select
                value={micDevice || ''}
                onChange={(e) => setMicDevice(e.target.value || null)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white mb-3 focus:outline-none focus:border-green-500/50"
              >
                {devices.microphones.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {/* Volume slider */}
            <div className="flex items-center gap-3 mb-2">
              <Mic size={12} className="text-zinc-500 shrink-0" />
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.01"
                value={micVolume}
                onChange={(e) => setMicVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 accent-green-500 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500 w-8 text-right font-mono">
                {Math.round(micVolume * 100)}%
              </span>
            </div>

            {/* Level meter */}
            <LevelMeter level={micLevel * micVolume} color="#22c55e" />
          </>
        )}
      </div>

      {/* System Audio */}
      <div
        className={`rounded-xl border-2 transition-all p-4 ${
          systemAudioEnabled ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/10 bg-white/5'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setSystemAudioEnabled(!systemAudioEnabled)}
            className="flex items-center gap-2 text-sm font-bold"
          >
            {systemAudioEnabled ? (
              <Volume2 size={16} className="text-blue-400" />
            ) : (
              <VolumeX size={16} className="text-zinc-500" />
            )}
            <span className={systemAudioEnabled ? 'text-blue-400' : 'text-zinc-500'}>
              System Audio
            </span>
          </button>
          {systemAudioEnabled && <Activity size={12} className="text-blue-400 animate-pulse" />}
        </div>

        {systemAudioEnabled && (
          <>
            {devices && devices.systemAudio.length > 0 ? (
              <select
                value={systemAudioDevice || ''}
                onChange={(e) => setSystemAudioDevice(e.target.value || null)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white mb-3 focus:outline-none focus:border-blue-500/50"
              >
                {devices.systemAudio.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[10px] text-zinc-600 mb-3">
                {process.env.NODE_ENV === 'production' || typeof window.electron !== 'undefined'
                  ? 'No system audio device found. macOS: Install BlackHole. Windows: Enable Stereo Mix. Linux: PulseAudio monitor auto-detected.'
                  : 'System audio capture not available in browser.'}
              </p>
            )}

            <div className="flex items-center gap-3 mb-2">
              <Volume2 size={12} className="text-zinc-500 shrink-0" />
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.01"
                value={systemAudioVolume}
                onChange={(e) => setSystemAudioVolume(parseFloat(e.target.value))}
                className="flex-1 h-1 accent-blue-500 cursor-pointer"
              />
              <span className="text-[10px] text-zinc-500 w-8 text-right font-mono">
                {Math.round(systemAudioVolume * 100)}%
              </span>
            </div>

            <LevelMeter level={sysLevel * systemAudioVolume} color="#3b82f6" />
          </>
        )}
      </div>

      {!compact && (
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          💡 Tip: On macOS, install{' '}
          <a href="https://existential.audio/blackhole/" target="_blank" className="text-primary hover:underline">
            BlackHole
          </a>{' '}
          for system audio capture. On Windows, enable Stereo Mix in Sound settings.
        </p>
      )}
    </div>
  );
};
