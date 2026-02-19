import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // For iOS, show manual install prompt after a delay
    if (isIOSDevice) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => setShowPrompt(true), 5000);
        return () => clearTimeout(timer);
      }
      return;
    }

    // For Chrome/Android, capture the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-[200] bg-[#1e1f22] border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl"
        >
          <button onClick={handleDismiss} className="absolute top-3 right-3 text-zinc-500 hover:text-white">
            <X size={16} />
          </button>
          
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shrink-0">
              <Download size={20} className="text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-sm mb-1">Install lmnaid</h3>
              {isIOS ? (
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Tap <Share size={12} className="inline text-blue-400" /> then <strong>"Add to Home Screen"</strong> for the best experience.
                </p>
              ) : (
                <>
                  <p className="text-zinc-400 text-xs mb-3">Get quick access from your home screen.</p>
                  <button
                    onClick={handleInstall}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors w-full"
                  >
                    Install App
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
