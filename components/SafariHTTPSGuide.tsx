import React, { useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Guide for Safari users to accept self-signed HTTPS certificate
 * Shows when on Safari and HTTPS but likely hasn't accepted cert yet
 */
export const SafariHTTPSGuide: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);
  
  // Detect Safari
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isHttps = window.location.protocol === 'https:';
  
  // Don't show if not Safari or not HTTPS
  if (!isSafari || !isHttps || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Shield size={20} className="text-blue-400" />
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-sm">
                Safari Security Notice
              </h3>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-zinc-400 text-xs space-y-2 mb-3">
              <p>
                <strong className="text-blue-400">Good news!</strong> This site now uses HTTPS for full streaming support in Safari.
              </p>
              <p>
                If you see a security warning, it's because we're using a development certificate. This is normal and safe for testing.
              </p>
              
              <div className="bg-black/30 rounded-lg p-3 mt-2 space-y-2">
                <p className="font-bold text-white">To enable streaming:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>If you see a security warning, click <strong className="text-white">"Show Details"</strong></li>
                  <li>Click <strong className="text-white">"Visit this website"</strong> or <strong className="text-white">"Proceed"</strong></li>
                  <li>Safari will remember your choice - you only need to do this once!</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center gap-2 text-green-400 text-xs">
              <CheckCircle size={14} />
              <span>After accepting, camera and microphone will work in Safari</span>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Inline compact version for modals
 */
export const SafariHTTPSBadge: React.FC = () => {
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isHttps = window.location.protocol === 'https:';
  
  if (!isSafari || !isHttps) return null;

  return (
    <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-xs">
      <Shield size={14} className="text-blue-400 flex-shrink-0" />
      <span className="text-blue-400">
        ✓ HTTPS enabled for Safari streaming support
      </span>
    </div>
  );
};
