const { execSync, exec } = require('child_process');

/**
 * Cross-platform audio device detection for nXcor
 * Detects microphones and system audio devices on macOS, Windows, and Linux
 */
class AudioDeviceManager {
  constructor() {
    this.platform = process.platform;
    this.cachedDevices = null;
    this.cacheTimestamp = 0;
    this.CACHE_TTL = 5000; // 5 seconds
  }

  /**
   * Get all available audio devices (mic + system)
   * Returns { microphones: [], systemAudio: [], defaultMic: string|null, defaultSystemAudio: string|null }
   */
  async getDevices() {
    const now = Date.now();
    if (this.cachedDevices && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedDevices;
    }

    let result;
    switch (this.platform) {
      case 'darwin':
        result = await this._getMacDevices();
        break;
      case 'win32':
        result = await this._getWindowsDevices();
        break;
      case 'linux':
        result = await this._getLinuxDevices();
        break;
      default:
        result = { microphones: [], systemAudio: [], defaultMic: null, defaultSystemAudio: null };
    }

    this.cachedDevices = result;
    this.cacheTimestamp = now;
    return result;
  }

  async _getMacDevices() {
    const microphones = [];
    const systemAudio = [];
    let defaultMic = null;
    let defaultSystemAudio = null;

    try {
      // Use ffmpeg to list avfoundation devices
      const output = await this._execAsync('ffmpeg -f avfoundation -list_devices true -i "" 2>&1 || true');
      
      let inAudio = false;
      const lines = output.split('\n');
      let audioIndex = 0;

      for (const line of lines) {
        if (line.includes('AVFoundation audio devices:')) {
          inAudio = true;
          continue;
        }
        if (inAudio) {
          const match = line.match(/\[(\d+)\]\s+(.+)/);
          if (match) {
            const idx = match[1];
            const name = match[2].trim();
            const device = { id: idx, name, type: 'avfoundation' };

            // Check for virtual audio devices (system audio capture)
            const isSystemAudio = /blackhole|soundflower|loopback|virtual|aggregate/i.test(name);
            
            if (isSystemAudio) {
              systemAudio.push(device);
              if (!defaultSystemAudio) defaultSystemAudio = idx;
            } else {
              microphones.push(device);
              if (!defaultMic) defaultMic = idx;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to enumerate macOS audio devices:', e.message);
    }

    return { microphones, systemAudio, defaultMic, defaultSystemAudio };
  }

  async _getWindowsDevices() {
    const microphones = [];
    const systemAudio = [];
    let defaultMic = null;
    let defaultSystemAudio = null;

    try {
      // Use ffmpeg to list DirectShow devices
      const output = await this._execAsync('ffmpeg -f dshow -list_devices true -i dummy 2>&1 || true');
      
      let inAudio = false;
      const lines = output.split('\n');

      for (const line of lines) {
        if (line.includes('DirectShow audio devices')) {
          inAudio = true;
          continue;
        }
        if (line.includes('DirectShow video devices')) {
          inAudio = false;
          continue;
        }
        if (inAudio) {
          const match = line.match(/"(.+?)"/);
          if (match) {
            const name = match[1];
            const device = { id: name, name, type: 'dshow' };

            // Stereo Mix / WASAPI loopback = system audio
            const isSystemAudio = /stereo mix|what u hear|loopback|wasapi/i.test(name);

            if (isSystemAudio) {
              systemAudio.push(device);
              if (!defaultSystemAudio) defaultSystemAudio = name;
            } else {
              microphones.push(device);
              if (!defaultMic) defaultMic = name;
            }
          }
        }
      }

      // Always add virtual WASAPI desktop audio option
      systemAudio.push({
        id: 'wasapi-loopback',
        name: 'Desktop Audio (WASAPI Loopback)',
        type: 'wasapi-loopback'
      });
      if (!defaultSystemAudio) defaultSystemAudio = 'wasapi-loopback';

    } catch (e) {
      console.warn('Failed to enumerate Windows audio devices:', e.message);
    }

    return { microphones, systemAudio, defaultMic, defaultSystemAudio };
  }

  async _getLinuxDevices() {
    const microphones = [];
    const systemAudio = [];
    let defaultMic = null;
    let defaultSystemAudio = null;

    try {
      // Try PulseAudio first
      const paOutput = await this._execAsync('pactl list sources short 2>/dev/null || true');
      
      if (paOutput.trim()) {
        const lines = paOutput.trim().split('\n');
        for (const line of lines) {
          const parts = line.split('\t');
          if (parts.length >= 2) {
            const id = parts[1]; // PulseAudio source name
            const name = parts[1];
            const device = { id, name, type: 'pulse' };

            if (/\.monitor$/.test(name)) {
              // Monitor sources capture system audio output
              systemAudio.push({ ...device, name: name.replace('.monitor', ' (System Audio)') });
              if (!defaultSystemAudio) defaultSystemAudio = id;
            } else {
              microphones.push(device);
              if (!defaultMic) defaultMic = id;
            }
          }
        }
      }

      // Fallback: try ALSA
      if (microphones.length === 0) {
        const alsaOutput = await this._execAsync('arecord -l 2>/dev/null || true');
        const lines = alsaOutput.split('\n');
        for (const line of lines) {
          const match = line.match(/card (\d+):.+device (\d+):\s+(.+)/);
          if (match) {
            const id = `hw:${match[1]},${match[2]}`;
            const name = match[3].trim();
            microphones.push({ id, name, type: 'alsa' });
            if (!defaultMic) defaultMic = id;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to enumerate Linux audio devices:', e.message);
    }

    return { microphones, systemAudio, defaultMic, defaultSystemAudio };
  }

  /**
   * Get FFmpeg input args for a specific audio device
   */
  getFFmpegAudioArgs(device) {
    if (!device) return [];

    switch (this.platform) {
      case 'darwin':
        return ['-f', 'avfoundation', '-i', `:${device.id}`];

      case 'win32':
        if (device.type === 'wasapi-loopback') {
          // Use dshow with virtual audio cable or audclnt loopback
          return ['-f', 'dshow', '-audio_buffer_size', '50', '-i', `audio=${device.id}`];
        }
        return ['-f', 'dshow', '-i', `audio=${device.id}`];

      case 'linux':
        if (device.type === 'pulse') {
          return ['-f', 'pulse', '-i', device.id];
        }
        return ['-f', 'alsa', '-i', device.id];

      default:
        return [];
    }
  }

  _execAsync(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, { timeout: 10000, encoding: 'utf8' }, (err, stdout, stderr) => {
        // ffmpeg list commands output to stderr and "fail" — that's expected
        resolve((stdout || '') + (stderr || ''));
      });
    });
  }
}

module.exports = new AudioDeviceManager();
