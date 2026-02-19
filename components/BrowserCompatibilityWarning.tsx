import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Download, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BrowserInfo {
  name: string;
  isCompatible: boolean;
  hasWebRTC: boolean;
  hasGetDisplayMedia: boolean;
  hasMediaRecorder: boolean;
}

function detectBrowser(): BrowserInfo {
  const ua = navigator.userAgent;
  const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
  const isSafari = /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isBrave = !!(navigator as any).brave;

  let name = 'Unknown';
  if (isBrave) name = 'Brave';
  else if (isEdge) name = 'Edge';
  else if (isChrome) name = 'Chrome';
  else if (isFirefox) name = 'Firefox';
  else if (isSafari) name = 'Safari';

  const hasWebRTC = !!(
    window.RTCPeerConnection ||
    (window as any).webkitRTCPeerConnection ||
    (window as any).mozRTCPeerConnection
  );

  const hasGetDisplayMedia = !!(
    navigator.mediaDevices?.getDisplayMedia
  );

  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

  // Safari has limited WebRTC support
  const isCompatible = (isChrome || isFirefox || isEdge || isBrave) && 
                       hasWebRTC && 
                       hasGetDisplayMedia;

  return {
    name,
    isCompatible,
    hasWebRTC,
    hasGetDisplayMedia,
    hasMediaRecorder,
  };
}

const getChromeUrl = () => {
  return window.location.href;
};

interface BrowserCompatibilityWarningProps {
  forceShow?: boolean;
  compact?: boolean;
}

export const BrowserCompatibilityWarning: React.FC<BrowserCompatibilityWarningProps> = ({
  forceShow = false,
  compact = false,
}) => {
  const [browser, setBrowser] = useState<BrowserInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const info = detectBrowser();
    setBrowser(info);

    // Check if user previously dismissed
    const wasDismissed = localStorage.getItem('nxcor_browser_warning_dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('nxcor_browser_warning_dismissed', 'true');
  };

  if (!browser || (browser.isCompatible && !forceShow) || (dismissed && !forceShow)) {
    return null;
  }

  if (compact) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 flex items-center gap-2 text-amber-400 text-xs">
        <AlertTriangle size={14} />
        <span>
          Limited browser support.{' '}
          <button
            onClick={(e) => {
              e.preventDefault();
              const url = window.location.href;
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(() => {
                  alert('✓ URL copied! Paste it into Chrome.');
                }).catch(() => {
                  prompt('Copy this URL:', url);
                });
              } else {
                prompt('Copy this URL and open in Chrome:', url);
              }
            }}
            className="underline hover:text-amber-300"
          >
            Copy URL for Chrome
          </button>
        </span>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 mb-4"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-400" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-sm">
                {browser.name} may have limited streaming support
              </h3>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-zinc-400 text-xs mb-3">
              {!browser.hasWebRTC && 'WebRTC not supported. '}
              {!browser.hasGetDisplayMedia && 'Screen sharing not available. '}
              {browser.name === 'Safari' && 'Safari has limited WebRTC features. '}
              For full streaming support, open this page in Chrome.
            </p>

            <button
              onClick={(e) => {
                e.preventDefault();
                const url = window.location.href;
                
                // Try modern clipboard API first
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(url).then(() => {
                    alert('✓ URL copied to clipboard!\n\nOpen Chrome and paste (Cmd/Ctrl+V) to continue.');
                  }).catch(() => {
                    // Fallback: show URL in prompt
                    prompt('Copy this URL and paste it into Chrome:', url);
                  });
                } else {
                  // Fallback for older browsers
                  prompt('Copy this URL and paste it into Chrome:', url);
                }
              }}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 text-sm font-bold text-white transition-all"
            >
              Copy URL for Chrome
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Hook to check browser compatibility
 */
export const useBrowserCompatibility = () => {
  const [browser, setBrowser] = useState<BrowserInfo | null>(null);

  useEffect(() => {
    setBrowser(detectBrowser());
  }, []);

  return browser;
};

/**
 * Inline compact warning for forms/modals
 */
export const InlineBrowserWarning: React.FC = () => {
  const browser = useBrowserCompatibility();

  if (!browser || browser.isCompatible) return null;

  return (
    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs">
      <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
      <span className="text-amber-400">
        Limited browser support.{' '}
        <button
          onClick={(e) => {
            e.preventDefault();
            const url = window.location.href;
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(url).then(() => {
                alert('✓ URL copied! Open Chrome and paste to continue.');
              }).catch(() => {
                prompt('Copy this URL:', url);
              });
            } else {
              prompt('Copy this URL and open in Chrome:', url);
            }
          }}
          className="text-white underline hover:text-amber-300 cursor-pointer"
        >
          Copy URL for Chrome
        </button>
      </span>
    </div>
  );
};
