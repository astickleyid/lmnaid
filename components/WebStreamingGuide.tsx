import React, { useState } from 'react';
import { Video, Copy, Check, ExternalLink, Download, Monitor, Settings, AlertCircle, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface WebStreamingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  channelName?: string;
}

export const WebStreamingGuide: React.FC<WebStreamingGuideProps> = ({ isOpen, onClose, channelName = 'your_channel' }) => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [streamKey, setStreamKey] = useState('');
  const [showStreamKey, setShowStreamKey] = useState(false);

  const streamServer = 'rtmp://live.twitch.tv/app/';
  
  const copyToClipboard = (text: string, item: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(item);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="nebula-glass rounded-[2rem] w-full max-w-4xl shadow-2xl border border-white/10 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/20">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Video size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Web Streaming Setup</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                Stream with OBS or Streamlabs
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-3">
            <Info size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-blue-300 font-semibold">Why use OBS/Streamlabs?</p>
              <p className="text-xs text-blue-200/80">
                Web browsers have limitations for streaming. OBS and Streamlabs OBS are free, professional-grade
                streaming software that give you full control over your stream quality, scenes, and sources.
              </p>
            </div>
          </div>

          {/* Step 1: Download Software */}
          <div className="space-y-4">
            <h3 className="text-white font-black text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm">1</span>
              Download Streaming Software
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://obsproject.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-purple-500/30 rounded-2xl p-6 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-bold text-base mb-1">OBS Studio</h4>
                    <p className="text-zinc-400 text-xs">Free & Open Source</p>
                  </div>
                  <Download size={20} className="text-zinc-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <p className="text-zinc-500 text-xs">
                  Most popular streaming software. Highly customizable with extensive plugin support.
                </p>
                <div className="mt-4 flex items-center text-purple-400 text-xs font-semibold">
                  Download OBS <ExternalLink size={12} className="ml-1" />
                </div>
              </a>

              <a
                href="https://streamlabs.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-zinc-900/50 hover:bg-zinc-900 border border-white/5 hover:border-purple-500/30 rounded-2xl p-6 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="text-white font-bold text-base mb-1">Streamlabs Desktop</h4>
                    <p className="text-zinc-400 text-xs">Free with Premium Options</p>
                  </div>
                  <Download size={20} className="text-zinc-500 group-hover:text-purple-400 transition-colors" />
                </div>
                <p className="text-zinc-500 text-xs">
                  User-friendly with built-in overlays, alerts, and widgets. Great for beginners.
                </p>
                <div className="mt-4 flex items-center text-purple-400 text-xs font-semibold">
                  Download Streamlabs <ExternalLink size={12} className="ml-1" />
                </div>
              </a>
            </div>
          </div>

          {/* Step 2: Get Stream Key */}
          <div className="space-y-4">
            <h3 className="text-white font-black text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm">2</span>
              Get Your Twitch Stream Key
            </h3>
            
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-white font-semibold mb-1">Keep Your Stream Key Secret!</p>
                  <p className="text-xs text-zinc-400">
                    Never share your stream key publicly. Anyone with your key can stream to your channel.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Enter Your Twitch Stream Key
                </label>
                <div className="flex gap-2">
                  <input
                    type={showStreamKey ? 'text' : 'password'}
                    value={streamKey}
                    onChange={(e) => setStreamKey(e.target.value)}
                    placeholder="live_123456789_abcdefghijklmnopqrstuvwxyz"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    onClick={() => setShowStreamKey(!showStreamKey)}
                    className="px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-all"
                  >
                    {showStreamKey ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <a
                href="https://dashboard.twitch.tv/settings/stream"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 font-semibold"
              >
                Get Stream Key from Twitch Dashboard <ExternalLink size={14} />
              </a>
            </div>
          </div>

          {/* Step 3: Configure OBS */}
          <div className="space-y-4">
            <h3 className="text-white font-black text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm">3</span>
              Configure Your Streaming Software
            </h3>
            
            <div className="space-y-3">
              {/* Stream Server */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    Server URL
                  </label>
                  <button
                    onClick={() => copyToClipboard(streamServer, 'server')}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                  >
                    {copiedItem === 'server' ? (
                      <><Check size={12} /> Copied!</>
                    ) : (
                      <><Copy size={12} /> Copy</>
                    )}
                  </button>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                  <code className="text-sm text-white font-mono">{streamServer}</code>
                </div>
              </div>

              {/* Stream Key */}
              {streamKey && (
                <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                      Your Stream Key
                    </label>
                    <button
                      onClick={() => copyToClipboard(streamKey, 'key')}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                    >
                      {copiedItem === 'key' ? (
                        <><Check size={12} /> Copied!</>
                      ) : (
                        <><Copy size={12} /> Copy</>
                      )}
                    </button>
                  </div>
                  <div className="bg-black/40 border border-white/10 rounded-xl px-4 py-3">
                    <code className="text-sm text-white font-mono">{streamKey}</code>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4">
                <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                  <Settings size={16} />
                  OBS Configuration Steps
                </h4>
                <ol className="space-y-2 text-sm text-zinc-300">
                  <li className="flex gap-2">
                    <span className="text-purple-400 font-bold">1.</span>
                    <span>Open OBS and go to <strong>Settings → Stream</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 font-bold">2.</span>
                    <span>Select <strong>Service: Twitch</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 font-bold">3.</span>
                    <span>Paste your <strong>Stream Key</strong> (server URL is auto-filled)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 font-bold">4.</span>
                    <span>Go to <strong>Settings → Output</strong> and set your bitrate (2500-6000 recommended)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 font-bold">5.</span>
                    <span>Add sources (Display Capture, Game Capture, Window Capture, etc.)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-purple-400 font-bold">6.</span>
                    <span>Click <strong>"Start Streaming"</strong> to go live!</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>

          {/* Step 4: Recommended Settings */}
          <div className="space-y-4">
            <h3 className="text-white font-black text-lg flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm">4</span>
              Recommended Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4">
                <h4 className="text-white font-bold text-sm mb-3">Video Settings</h4>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Output Resolution:</span>
                    <span className="font-mono">1920x1080</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">FPS:</span>
                    <span className="font-mono">30 or 60</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Encoder:</span>
                    <span className="font-mono">x264</span>
                  </li>
                </ul>
              </div>

              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4">
                <h4 className="text-white font-bold text-sm mb-3">Audio Settings</h4>
                <ul className="space-y-2 text-xs text-zinc-300">
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Sample Rate:</span>
                    <span className="font-mono">48kHz</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Audio Bitrate:</span>
                    <span className="font-mono">160</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-zinc-400">Channels:</span>
                    <span className="font-mono">Stereo</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Help Links */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4">
            <h4 className="text-white font-bold text-sm mb-3">Need Help?</h4>
            <div className="space-y-2">
              <a
                href="https://obsproject.com/wiki/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-purple-400 hover:text-purple-300 flex items-center gap-2"
              >
                OBS Documentation <ExternalLink size={12} />
              </a>
              <a
                href="https://help.twitch.tv/s/article/guide-to-broadcast-health-and-using-twitch-inspector"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-purple-400 hover:text-purple-300 flex items-center gap-2"
              >
                Twitch Streaming Guide <ExternalLink size={12} />
              </a>
              <a
                href="https://www.speedtest.net/"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-purple-400 hover:text-purple-300 flex items-center gap-2"
              >
                Test Your Internet Speed <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 border-t border-white/5 flex items-center justify-end px-8 bg-black/20">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all"
          >
            Got It!
          </button>
        </div>
      </motion.div>
    </div>
  );
};
