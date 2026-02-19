import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  NativeModules,
  NativeEventEmitter,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';

const { NXStreamingModule } = NativeModules;
const streamingEmitter = NXStreamingModule
  ? new NativeEventEmitter(NXStreamingModule)
  : null;

// ─── Types ──────────────────────────────────────────────────────────

type StreamSource = 'camera_front' | 'camera_back' | 'screen';
type StreamStatus = 'idle' | 'connecting' | 'connected' | 'publishing' | 'disconnected' | 'error';

interface StreamOptions {
  source?: StreamSource;
  width?: number;
  height?: number;
  bitrate?: number;
  fps?: number;
}

interface StreamStats {
  duration: number;
  rtmpState: string;
  source: StreamSource;
}

interface IOSStreamingProps {
  platform: string;
  streamKey: string;
  options?: StreamOptions;
  onStatusChange?: (status: StreamStatus) => void;
  onError?: (error: string) => void;
  onStats?: (stats: StreamStats) => void;
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useStreaming() {
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [stats, setStats] = useState<StreamStats | null>(null);
  const [source, setSource] = useState<StreamSource>('camera_front');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!streamingEmitter) return;

    const statusSub = streamingEmitter.addListener('onStreamStatusChange', (event) => {
      setStatus(event.status as StreamStatus);
    });
    const errorSub = streamingEmitter.addListener('onStreamError', (event) => {
      console.error('[NXStreaming] Error:', event.message);
      setStatus('error');
    });
    const statsSub = streamingEmitter.addListener('onStreamStats', (event) => {
      setStats(event as StreamStats);
    });

    return () => {
      statusSub.remove();
      errorSub.remove();
      statsSub.remove();
    };
  }, []);

  const checkPermissions = useCallback(async () => {
    if (!NXStreamingModule) return {};
    const result = await NXStreamingModule.checkPermissions();
    setPermissions(result);
    return result;
  }, []);

  const requestPermissions = useCallback(async () => {
    if (!NXStreamingModule) return {};
    const result = await NXStreamingModule.requestPermissions();
    setPermissions(result);
    return result;
  }, []);

  const startStream = useCallback(
    async (platform: string, streamKey: string, options?: StreamOptions) => {
      if (!NXStreamingModule) throw new Error('NXStreamingModule not available');
      const opts = { source, ...options };
      return NXStreamingModule.startStream(platform, streamKey, opts);
    },
    [source],
  );

  const stopStream = useCallback(async () => {
    if (!NXStreamingModule) return;
    return NXStreamingModule.stopStream();
  }, []);

  const switchSource = useCallback(async (newSource: StreamSource) => {
    if (!NXStreamingModule) return;
    const result = await NXStreamingModule.switchSource(newSource);
    setSource(newSource);
    return result;
  }, []);

  return {
    status,
    stats,
    source,
    permissions,
    checkPermissions,
    requestPermissions,
    startStream,
    stopStream,
    switchSource,
    setSource,
  };
}

// ─── Component ──────────────────────────────────────────────────────

export default function IOSStreaming({
  platform,
  streamKey,
  options,
  onStatusChange,
  onError,
  onStats,
}: IOSStreamingProps) {
  const {
    status,
    stats,
    source,
    permissions,
    checkPermissions,
    requestPermissions,
    startStream,
    stopStream,
    switchSource,
  } = useStreaming();

  const prevStatus = useRef(status);

  // Forward callbacks
  useEffect(() => {
    if (status !== prevStatus.current) {
      prevStatus.current = status;
      onStatusChange?.(status);
    }
  }, [status, onStatusChange]);

  useEffect(() => {
    if (stats) onStats?.(stats);
  }, [stats, onStats]);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>iOS streaming is only available on iOS devices</Text>
      </View>
    );
  }

  if (!NXStreamingModule) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Streaming module not loaded</Text>
      </View>
    );
  }

  const isLive = status === 'publishing';
  const isConnecting = status === 'connecting' || status === 'connected';

  const handleToggleStream = async () => {
    try {
      if (isLive || isConnecting) {
        await stopStream();
      } else {
        // Ensure permissions
        const perms = await requestPermissions();
        if (!perms.camera || !perms.microphone) {
          Alert.alert('Permissions Required', 'Camera and microphone access are needed to stream.');
          return;
        }
        await startStream(platform, streamKey, options);
      }
    } catch (err: any) {
      onError?.(err.message ?? 'Unknown error');
      Alert.alert('Stream Error', err.message ?? 'Failed to start stream');
    }
  };

  const handleSwitchSource = async (newSource: StreamSource) => {
    try {
      await switchSource(newSource);
    } catch (err: any) {
      Alert.alert('Source Error', err.message ?? 'Failed to switch source');
    }
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={[styles.statusDot, isLive && styles.statusDotLive]} />
        <Text style={styles.statusText}>
          {isLive ? 'LIVE' : status.toUpperCase()}
        </Text>
        {stats && isLive && (
          <Text style={styles.durationText}>{formatDuration(stats.duration)}</Text>
        )}
      </View>

      {/* Preview Area */}
      <View style={styles.previewArea}>
        <Text style={styles.previewPlaceholder}>
          {source === 'screen' ? '📱 Screen Capture' : source === 'camera_back' ? '📷 Rear Camera' : '🤳 Front Camera'}
        </Text>
        {/* Native preview layer would be injected here via a native UI component */}
      </View>

      {/* Source Picker */}
      <View style={styles.sourcePicker}>
        <SourceButton
          label="Front"
          icon="🤳"
          active={source === 'camera_front'}
          onPress={() => handleSwitchSource('camera_front')}
        />
        <SourceButton
          label="Back"
          icon="📷"
          active={source === 'camera_back'}
          onPress={() => handleSwitchSource('camera_back')}
        />
        <SourceButton
          label="Screen"
          icon="📱"
          active={source === 'screen'}
          onPress={() => handleSwitchSource('screen')}
        />
      </View>

      {/* Stream Control */}
      <TouchableOpacity
        style={[styles.streamButton, isLive && styles.streamButtonLive]}
        onPress={handleToggleStream}
        disabled={isConnecting}
      >
        {isConnecting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.streamButtonText}>
            {isLive ? 'STOP STREAM' : 'GO LIVE'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Platform Info */}
      <Text style={styles.platformText}>
        {platform.charAt(0).toUpperCase() + platform.slice(1)} • {source.replace('_', ' ')}
      </Text>
    </View>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function SourceButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.sourceButton, active && styles.sourceButtonActive]}
      onPress={onPress}
    >
      <Text style={styles.sourceIcon}>{icon}</Text>
      <Text style={[styles.sourceLabel, active && styles.sourceLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 16,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#555',
  },
  statusDotLive: {
    backgroundColor: '#ff3b30',
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  durationText: {
    color: '#aaa',
    fontSize: 14,
    fontFamily: 'Courier',
    marginLeft: 'auto',
  },
  previewArea: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
    overflow: 'hidden',
  },
  previewPlaceholder: {
    color: '#666',
    fontSize: 18,
  },
  sourcePicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sourceButton: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    minWidth: 80,
  },
  sourceButtonActive: {
    backgroundColor: '#2a2a4a',
    borderWidth: 1,
    borderColor: '#6c5ce7',
  },
  sourceIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  sourceLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  sourceLabelActive: {
    color: '#6c5ce7',
  },
  streamButton: {
    backgroundColor: '#6c5ce7',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  streamButtonLive: {
    backgroundColor: '#ff3b30',
  },
  streamButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  platformText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
