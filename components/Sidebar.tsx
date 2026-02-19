import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Compass,
  MessageCircle,
  Terminal,
  Palette,
  User as UserIcon,
  Video
} from 'lucide-react';
import { Server, IconStyle, User } from '../types';
import { PRESET_ICONS } from './IconAssets';

// Exporting SidebarLemon for use in Header and other mobile toggles
// Increased size to w-14 h-14 (56px) vs standard w-12 h-12 (48px) to satisfy "slightly bigger" requirement
export const SidebarLemon = ({ onClick, isOpen, className = "" }: { onClick?: () => void; isOpen?: boolean; className?: string }) => (
  <motion.button 
    onClick={onClick}
    initial={false}
    animate={{ rotate: isOpen ? 360 : 0 }} 
    whileHover={{ scale: 1.1, rotate: 5 }}
    whileTap={{ scale: 0.9 }}
    transition={{ type: "spring", stiffness: 200, damping: 20 }}
    className={`relative w-14 h-14 flex items-center justify-center focus:outline-none cursor-pointer group z-50 rounded-[20px] bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/20 transition-colors ${className}`}
  >
    <svg viewBox="0 0 100 100" className="w-9 h-9 overflow-visible drop-shadow-xl">
      <defs>
        <linearGradient id="sideLemonBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fefce8" /> 
          <stop offset="30%" stopColor="#facc15" /> 
          <stop offset="100%" stopColor="#854d0e" /> 
        </linearGradient>
        <linearGradient id="sideLeafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
           <stop offset="0%" stopColor="#86efac" />
           <stop offset="100%" stopColor="#14532d" />
        </linearGradient>
      </defs>
      <g className="origin-center">
         <path 
          d="M15,50 Q15,15 50,15 Q85,15 85,50 Q85,85 50,85 Q15,85 15,50" 
          fill="url(#sideLemonBody)" 
          transform="rotate(-45, 50, 50)"
         />
         <path 
           d="M50,20 Q75,0 95,20 Q75,45 50,20" 
           fill="url(#sideLeafGradient)" 
           className="origin-[50px_20px]"
         />
      </g>
    </svg>
  </motion.button>
);

interface SidebarProps {
  activeView: 'profile' | 'dm' | 'server' | 'dev-console' | 'explore';
  servers: Server[];
  user: User;
  activeServerId?: string;
  onNavigateProfile: () => void;
  onNavigateDMs: () => void;
  onNavigateDevPortal: () => void;
  onNavigateExplore: () => void;
  onSelectServer: (serverId: string) => void;
  onCreateServer: () => void;
  onOpenDocs: () => void;
  onOpenThemeEditor: () => void;
  onOpenGoLive: () => void;
  isOpen: boolean; 
  onToggle: () => void;
  onClose: () => void;
  iconStyle?: IconStyle;
}

const Tooltip = ({ content, top }: { content: string; top: number }) => {
  return createPortal(
    <motion.div
      initial={{ opacity: 0, x: -10, filter: 'blur(4px)', scale: 0.9 }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)', scale: 1 }}
      exit={{ opacity: 0, x: -5, filter: 'blur(4px)', scale: 0.9 }}
      transition={{ duration: 0.15 }}
      style={{ top, left: 80 }}
      className="fixed z-[10000] pointer-events-none"
    >
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 px-3 py-1.5 rounded-lg text-white text-[10px] font-black uppercase tracking-[0.2em] whitespace-nowrap shadow-2xl">
        {content}
      </div>
    </motion.div>,
    document.body
  );
};

const SidebarItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  image?: string;
  gradient?: string;
  delay?: number;
  roundedClass?: string;
}> = ({ icon, label, isActive, onClick, image, gradient, delay = 0, roundedClass = "rounded-[16px]" }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState<{ top: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setCoords({ top: rect.top + rect.height / 2 - 14 });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 20 }}
      className="relative group flex items-center justify-center w-full py-1.5" 
      ref={ref}
    >
      <AnimatePresence>
        {isActive && (
          <motion.div 
            layoutId="active-indicator"
            className="absolute left-0 w-1.5 h-10 bg-white rounded-r-full z-50 shadow-[0_0_15px_rgba(255,255,255,0.6)]"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}
      </AnimatePresence>

      <motion.button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          relative w-12 h-12 flex items-center justify-center transition-all duration-300 ${roundedClass}
          ${!image && !gradient && !isActive ? 'bg-[#1e1f22] hover:bg-primary text-zinc-400 hover:text-white' : ''}
          ${isActive ? 'z-20 bg-primary text-white' : 'z-10'}
        `}
      >
        <div className={`
          relative w-full h-full overflow-hidden flex items-center justify-center transition-all duration-300 ${roundedClass}
          ${isActive ? 'shadow-[0_0_25px_rgba(var(--color-primary),0.3)]' : ''}
          ${gradient ? `bg-gradient-to-br ${gradient} text-white` : ''}
        `}>
          {image ? (
            <img src={image} className="w-full h-full object-cover" alt={label} />
          ) : (
            <div className={`transition-colors duration-300 ${isActive ? 'text-white' : ''}`}>
              {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 24 }) : icon}
            </div>
          )}
        </div>
      </motion.button>

      <AnimatePresence>
        {isHovered && coords && <Tooltip top={coords.top} content={label} />}
      </AnimatePresence>
    </motion.div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeView, servers, user, activeServerId, onNavigateProfile, onNavigateDMs, onNavigateDevPortal, 
  onNavigateExplore, onSelectServer, onCreateServer, onOpenThemeEditor, onOpenGoLive, isOpen, onToggle, onClose
}) => {
  const sidebarRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <motion.nav 
        ref={sidebarRef}
        initial={false}
        animate={{ 
          x: isOpen ? 0 : -72,
          opacity: 1 // Keep opacity at 1 so the slide transition is clean
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 bottom-0 w-[72px] z-[100] flex flex-col items-center py-3 pb-20 bg-[#111214]/95 backdrop-blur-xl border-r border-white/[0.04] md:translate-x-0 safe-top"
      >
        {/* Fixed Top Brand Section */}
        <div className="flex flex-col items-center gap-2 w-full px-2 mb-2 shrink-0">
          <SidebarLemon onClick={onToggle} isOpen={isOpen} />
          <SidebarItem 
            icon={<UserIcon />} 
            label="My Profile" 
            isActive={activeView === 'profile'} 
            onClick={onNavigateProfile}
            image={user.avatarUrl}
            delay={0.05}
          />
          <div className="w-8 h-[2px] bg-white/10 my-1 shrink-0 rounded-full" />
        </div>

        {/* Scrollable Middle Section */}
        <div className="flex flex-col items-center gap-2 w-full flex-1 overflow-y-auto no-scrollbar px-2">
          <SidebarItem 
            icon={<MessageCircle />} 
            label="Direct Messages" 
            isActive={activeView === 'dm'} 
            onClick={onNavigateDMs}
            delay={0.1}
          />

          <div className="w-8 h-[2px] bg-white/10 my-1 shrink-0 rounded-full" />

          <div className="flex flex-col gap-2 w-full">
            {servers.map((server, idx) => {
              const preset = server.customIconId ? PRESET_ICONS.find(p => p.id === server.customIconId) : null;
              return (
                <SidebarItem
                  key={server.id}
                  icon={preset ? preset.icon : <span className="font-black text-xs">{server.name.substring(0, 1)}</span>}
                  label={server.name}
                  isActive={activeServerId === server.id}
                  onClick={() => onSelectServer(server.id)}
                  image={server.iconUrl}
                  gradient={preset?.gradient}
                  delay={0.15 + (idx * 0.05)}
                />
              );
            })}
          </div>

          <SidebarItem icon={<Plus />} label="Add a Server" onClick={onCreateServer} delay={0.25} />
          <SidebarItem icon={<Compass />} label="Explore Communities" isActive={activeView === 'explore'} onClick={onNavigateExplore} delay={0.3} />
        </div>

        {/* Fixed Bottom Section */}
        <div className="flex flex-col items-center gap-2 w-full mt-2 pb-1 px-2 shrink-0">
          <div className="w-8 h-[2px] bg-white/10 my-2 shrink-0 rounded-full" />
          <SidebarItem 
            icon={<Video />} 
            label="Go Live" 
            onClick={onOpenGoLive}
            gradient="from-red-600 to-pink-600"
            delay={0.32}
          />
          <SidebarItem icon={<Terminal />} label="Dev Console" isActive={activeView === 'dev-console'} onClick={onNavigateDevPortal} delay={0.35} />
          <SidebarItem icon={<Palette />} label="Theme Editor" onClick={onOpenThemeEditor} delay={0.4} />
        </div>
      </motion.nav>

      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] md:hidden bg-black/60 backdrop-blur-sm cursor-pointer"
          />
        )}
      </AnimatePresence>
    </>
  );
};