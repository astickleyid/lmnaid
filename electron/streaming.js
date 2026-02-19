const { desktopCapturer } = require('electron');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { spawn } = require('child_process');
const audioDevices = require('./audioDevices');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

class StreamingService {
  constructor() {
    this.initialized = false;
    this.streaming = false;
    this.ffmpegProcess = null;
    this.screenIndex = null;
    this.audioConfig = {
      micEnabled: false,
      micDeviceId: null,
      micVolume: 1.0,
      systemAudioEnabled: false,
      systemAudioDeviceId: null,
      systemAudioVolume: 1.0,
    };
  }

  async initialize() {
    if (this.initialized) return;

    await this.detectScreens();
    this.initialized = true;
    console.log('✅ Streaming service initialized with FFmpeg');
    console.log('📺 Available screens:', this.screenIndex);
  }

  async detectScreens() {
    const platform = process.platform;

    if (platform === 'darwin') {
      this.screenIndex = '1'; // avfoundation video device index for main screen
    } else if (platform === 'win32') {
      this.screenIndex = 'desktop';
    } else if (platform === 'linux') {
      this.screenIndex = ':0.0+0,0';
    } else {
      console.warn(`⚠️  Unsupported platform: ${platform}. Streaming may not work.`);
      this.screenIndex = 'desktop';
    }

    return this.screenIndex;
  }

  /**
   * Get available audio devices for the UI
   */
  async getAudioDevices() {
    return audioDevices.getDevices();
  }

  /**
   * Update audio configuration
   */
  setAudioConfig(config) {
    Object.assign(this.audioConfig, config);
    console.log('🔊 Audio config updated:', this.audioConfig);
  }

  async getDesktopSources() {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window', 'screen'],
        thumbnailSize: { width: 320, height: 180 },
      });

      return sources.map((source) => ({
        id: source.id,
        name: source.name,
        thumbnail: source.thumbnail.toDataURL(),
        type: source.id.startsWith('screen:') ? 'screen' : 'window',
      }));
    } catch (error) {
      console.error('Failed to get desktop sources:', error);
      return [];
    }
  }

  /**
   * Build FFmpeg args with audio inputs for the current platform
   */
  _buildFFmpegArgs(rtmpUrl) {
    const platform = process.platform;
    const { micEnabled, micDeviceId, micVolume, systemAudioEnabled, systemAudioDeviceId, systemAudioVolume } = this.audioConfig;

    const args = [];
    let inputCount = 0;
    let hasAudio = false;
    const audioFilterParts = [];

    // ── Video input (always first) ──
    if (platform === 'darwin') {
      args.push('-f', 'avfoundation', '-capture_cursor', '1', '-capture_mouse_clicks', '1', '-framerate', '30');
      args.push('-i', `${this.screenIndex}:none`); // video only from screen
    } else if (platform === 'win32') {
      args.push('-f', 'gdigrab', '-framerate', '30', '-i', 'desktop');
    } else if (platform === 'linux') {
      args.push('-f', 'x11grab', '-framerate', '30', '-i', this.screenIndex);
    }
    const videoInputIdx = inputCount++;

    // ── Microphone input ──
    let micInputIdx = -1;
    if (micEnabled && micDeviceId) {
      if (platform === 'darwin') {
        args.push('-f', 'avfoundation', '-i', `:${micDeviceId}`);
      } else if (platform === 'win32') {
        args.push('-f', 'dshow', '-audio_buffer_size', '50', '-i', `audio=${micDeviceId}`);
      } else if (platform === 'linux') {
        // auto-detect pulse vs alsa by device name
        const fmt = micDeviceId.startsWith('hw:') ? 'alsa' : 'pulse';
        args.push('-f', fmt, '-i', micDeviceId);
      }
      micInputIdx = inputCount++;
      hasAudio = true;
      audioFilterParts.push(`[${micInputIdx}:a]volume=${micVolume.toFixed(2)}[mic]`);
    }

    // ── System audio input ──
    let sysInputIdx = -1;
    if (systemAudioEnabled && systemAudioDeviceId) {
      if (platform === 'darwin') {
        args.push('-f', 'avfoundation', '-i', `:${systemAudioDeviceId}`);
      } else if (platform === 'win32') {
        if (systemAudioDeviceId === 'wasapi-loopback') {
          // Attempt dshow with Stereo Mix; user may need virtual cable
          args.push('-f', 'dshow', '-audio_buffer_size', '50', '-i', 'audio=Stereo Mix');
        } else {
          args.push('-f', 'dshow', '-audio_buffer_size', '50', '-i', `audio=${systemAudioDeviceId}`);
        }
      } else if (platform === 'linux') {
        const fmt = systemAudioDeviceId.startsWith('hw:') ? 'alsa' : 'pulse';
        args.push('-f', fmt, '-i', systemAudioDeviceId);
      }
      sysInputIdx = inputCount++;
      hasAudio = true;
      audioFilterParts.push(`[${sysInputIdx}:a]volume=${systemAudioVolume.toFixed(2)}[sys]`);
    }

    // ── Build audio filter_complex to mix streams ──
    let audioMapArgs = [];
    if (micInputIdx >= 0 && sysInputIdx >= 0) {
      // Mix both
      const filter = audioFilterParts.join(';') + `;[mic][sys]amix=inputs=2:duration=longest:dropout_transition=3[aout]`;
      args.push('-filter_complex', filter);
      audioMapArgs = ['-map', `${videoInputIdx}:v`, '-map', '[aout]'];
    } else if (micInputIdx >= 0) {
      const filter = audioFilterParts[0];
      args.push('-filter_complex', filter);
      audioMapArgs = ['-map', `${videoInputIdx}:v`, '-map', '[mic]'];
    } else if (sysInputIdx >= 0) {
      const filter = audioFilterParts[0];
      args.push('-filter_complex', filter);
      audioMapArgs = ['-map', `${videoInputIdx}:v`, '-map', '[sys]'];
    }

    // ── Video encoding ──
    args.push(
      ...audioMapArgs,
      '-vf', 'scale=1920:1080',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-tune', 'zerolatency',
      '-b:v', '2500k',
      '-maxrate', '2500k',
      '-bufsize', '5000k',
      '-g', '60',
      '-pix_fmt', 'yuv420p'
    );

    // ── Audio encoding (if any audio) ──
    if (hasAudio) {
      args.push('-c:a', 'aac', '-b:a', '160k', '-ar', '44100');
    }

    // ── Output ──
    args.push('-f', 'flv', rtmpUrl);

    return args;
  }

  async startStreaming(config) {
    if (this.streaming) {
      throw new Error('Already streaming');
    }

    try {
      const { streamKey, source, mic, camera, micDevice, systemAudio, systemAudioDevice, micVolume, systemAudioVolume } = config;
      const rtmpUrl = `rtmp://live.twitch.tv/app/${streamKey}`;
      const platform = process.platform;

      // Apply audio config from UI
      this.setAudioConfig({
        micEnabled: !!mic,
        micDeviceId: micDevice || null,
        micVolume: micVolume ?? 1.0,
        systemAudioEnabled: !!systemAudio,
        systemAudioDeviceId: systemAudioDevice || null,
        systemAudioVolume: systemAudioVolume ?? 1.0,
      });

      // Auto-select default devices if enabled but no specific device chosen
      if (this.audioConfig.micEnabled && !this.audioConfig.micDeviceId) {
        const devices = await this.getAudioDevices();
        if (devices.defaultMic) {
          this.audioConfig.micDeviceId = devices.defaultMic;
          console.log('🎤 Auto-selected default mic:', devices.defaultMic);
        } else {
          console.warn('🎤 Mic enabled but no microphone found');
          this.audioConfig.micEnabled = false;
        }
      }

      if (this.audioConfig.systemAudioEnabled && !this.audioConfig.systemAudioDeviceId) {
        const devices = await this.getAudioDevices();
        if (devices.defaultSystemAudio) {
          this.audioConfig.systemAudioDeviceId = devices.defaultSystemAudio;
          console.log('🔊 Auto-selected system audio:', devices.defaultSystemAudio);
        } else {
          console.warn('🔊 System audio enabled but no device found');
          this.audioConfig.systemAudioEnabled = false;
        }
      }

      console.log('🎬 Starting stream to Twitch...');
      console.log('🖥️  Platform:', platform);
      console.log('📺 Capture source:', source);
      console.log('🎤 Mic:', this.audioConfig.micEnabled ? this.audioConfig.micDeviceId : 'disabled');
      console.log('🔊 System Audio:', this.audioConfig.systemAudioEnabled ? this.audioConfig.systemAudioDeviceId : 'disabled');
      console.log('📷 Camera:', camera);

      if (!this.initialized) {
        await this.initialize();
      }

      const args = this._buildFFmpegArgs(rtmpUrl);
      console.log('🚀 FFmpeg command:', ffmpegPath, args.join(' '));

      // Spawn FFmpeg process
      this.ffmpegProcess = spawn(ffmpegPath, args);

      this.ffmpegProcess.stdout.on('data', (data) => {
        console.log('FFmpeg stdout:', data.toString());
      });

      this.ffmpegProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        if (msg.includes('frame=') || msg.includes('fps=')) {
          process.stdout.write('.');
        } else {
          console.log('FFmpeg:', msg);
        }
      });

      this.ffmpegProcess.on('error', (err) => {
        console.error('❌ FFmpeg process error:', err);
        this.streaming = false;
      });

      this.ffmpegProcess.on('close', (code) => {
        console.log(`🛑 Stream ended with code ${code}`);
        this.streaming = false;
        this.ffmpegProcess = null;
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (this.ffmpegProcess && !this.ffmpegProcess.killed) {
        this.streaming = true;
        console.log('✅ Streaming started to Twitch!');
        return { success: true };
      } else {
        throw new Error('FFmpeg failed to start');
      }
    } catch (error) {
      console.error('❌ Failed to start streaming:', error);
      this.streaming = false;
      if (this.ffmpegProcess) {
        this.ffmpegProcess.kill();
        this.ffmpegProcess = null;
      }
      throw error;
    }
  }

  async stopStreaming() {
    if (!this.streaming) {
      return { success: true };
    }

    try {
      if (this.ffmpegProcess) {
        console.log('🛑 Stopping stream...');
        this.ffmpegProcess.kill('SIGTERM');

        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!this.ffmpegProcess.killed) {
          this.ffmpegProcess.kill('SIGKILL');
        }

        this.ffmpegProcess = null;
      }

      this.streaming = false;
      console.log('✅ Streaming stopped');

      return { success: true };
    } catch (error) {
      console.error('Failed to stop streaming:', error);
      throw error;
    }
  }

  getStreamStatus() {
    return {
      streaming: this.streaming,
      initialized: this.initialized,
      outputActive: this.streaming,
      recording: false,
      bytesPerSec: 0,
      kbitsPerSec: this.streaming ? 2500 : 0,
      droppedFrames: 0,
      totalFrames: 0,
      screenIndex: this.screenIndex,
      audioConfig: this.audioConfig,
    };
  }

  shutdown() {
    if (this.streaming) {
      this.stopStreaming();
    }
    this.initialized = false;
    console.log('🔌 Streaming service shutdown');
  }
}

module.exports = new StreamingService();
