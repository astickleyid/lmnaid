import React from 'react';
import { AlertTriangle, Chrome } from 'lucide-react';

interface MediaDevicesCheckProps {
  onCopyUrl?: () => void;
}

/**
 * Check if browser supports media devices (camera/microphone)
 * Shows blocking error if not available
 */
export const MediaDevicesCheck: React.FC<MediaDevicesCheckProps> = ({ onCopyUrl }) => {
  const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const isHttps = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // If everything is fine, don't show anything
  if (hasMediaDevices) return null;

  const handleCopyUrl = () => {
    const url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        alert('✓ URL copied to clipboard!\n\nPaste it into Chrome to stream.');
      }).catch(() => {
        prompt('Copy this URL and open it in Chrome:', url);
      });
    } else {
      prompt('Copy this URL and open it in Chrome:', url);
    }
    
    onCopyUrl?.();
  };

  return (
    <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-white font-bold text-base mb-2">
            Camera/Microphone Access Unavailable
          </h3>
          
          <div className="text-zinc-400 text-sm space-y-2 mb-4">
            {!isHttps && !isLocalhost && (
              <p>
                <strong className="text-red-400">HTTPS Required:</strong> Your browser blocks camera/microphone access on non-HTTPS sites.
              </p>
            )}
            <p>
              <strong className="text-amber-400">Browser Issue:</strong> Your current browser doesn't support the required media APIs.
            </p>
            <p>
              Streaming requires a modern browser with camera/microphone support (Chrome, Firefox, or Edge).
            </p>
          </div>

          <button
            onClick={handleCopyUrl}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition-all"
          >
            <Chrome size={18} />
            Copy URL for Chrome
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to check if media devices are available
 */
export const useMediaDevicesAvailable = () => {
  const [available, setAvailable] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const hasMediaDevices = !!(
      navigator.mediaDevices && 
      navigator.mediaDevices.getUserMedia
    );
    setAvailable(hasMediaDevices);
  }, []);

  return available;
};
