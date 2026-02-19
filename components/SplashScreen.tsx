import React from 'react';
import { motion } from 'framer-motion';

export const SplashScreen: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-0 z-[9999] bg-black flex items-center justify-center flex-col"
    >
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Ambient glow */}
        <motion.div
          animate={{
            scale: [0.8, 1.3, 0.8],
            opacity: [0.08, 0.25, 0.08],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-yellow-400/20 rounded-full blur-3xl"
        />

        <svg viewBox="0 0 100 100" className="w-24 h-24 overflow-visible relative z-10">
          <defs>
            <linearGradient id="splashLemonBody" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fefce8" />
              <stop offset="30%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
            <linearGradient id="splashLeafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <motion.path
            d="M15,50 Q15,15 50,15 Q85,15 85,50 Q85,85 50,85 Q15,85 15,50"
            fill="url(#splashLemonBody)"
            stroke="#facc15"
            strokeWidth="1"
            transform="rotate(-45, 50, 50)"
            initial={{ pathLength: 0, fillOpacity: 0 }}
            animate={{ pathLength: 1, fillOpacity: 1 }}
            transition={{
              pathLength: { duration: 1.2, ease: [0.4, 0, 0.2, 1] },
              fillOpacity: { duration: 0.6, delay: 0.8, ease: "easeOut" },
            }}
            style={{ filter: "url(#glow)" }}
          />

          <motion.path
            d="M50,20 Q75,0 95,20 Q75,45 50,20"
            fill="url(#splashLeafGradient)"
            stroke="#4ade80"
            strokeWidth="0.5"
            className="origin-[50px_20px]"
            initial={{ pathLength: 0, fillOpacity: 0, scale: 0 }}
            animate={{ pathLength: 1, fillOpacity: 1, scale: 1 }}
            transition={{
              pathLength: { duration: 0.8, delay: 0.4, ease: [0.4, 0, 0.2, 1] },
              fillOpacity: { duration: 0.4, delay: 1, ease: "easeOut" },
              scale: { duration: 0.5, delay: 0.4, type: "spring", stiffness: 200 }
            }}
          />
        </svg>

        {/* Orbital rings */}
        <motion.div
          className="absolute inset-0 border-t-2 border-r-2 border-yellow-500/20 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 border-b border-l border-green-500/15 rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Brand text */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6, ease: "easeOut" }}
        className="mt-6"
      >
        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.4em]">lmnaid</span>
      </motion.div>
    </motion.div>
  );
};
