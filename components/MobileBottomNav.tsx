import React from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, MessageCircle, Compass, Video, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  activeView: 'profile' | 'dm' | 'server' | 'dev-console' | 'explore';
  onNavigateProfile: () => void;
  onNavigateDMs: () => void;
  onNavigateExplore: () => void;
  onOpenGoLive: () => void;
  onToggleSidebar: () => void;
  userAvatar?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeView,
  onNavigateProfile,
  onNavigateDMs,
  onNavigateExplore,
  onOpenGoLive,
  onToggleSidebar,
  userAvatar,
}) => {
  const navItems = [
    { id: 'profile', icon: <UserIcon size={22} />, label: 'Profile', action: onNavigateProfile, active: activeView === 'profile' },
    { id: 'dm', icon: <MessageCircle size={22} />, label: 'Messages', action: onNavigateDMs, active: activeView === 'dm' },
    { id: 'live', icon: <Video size={20} />, label: 'Go Live', action: onOpenGoLive, active: false, accent: true },
    { id: 'explore', icon: <Compass size={22} />, label: 'Explore', action: onNavigateExplore, active: activeView === 'explore' },
    { id: 'more', icon: <Menu size={22} />, label: 'More', action: onToggleSidebar, active: activeView === 'server' || activeView === 'dev-console' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[80] md:hidden" role="navigation" aria-label="Main navigation">
      {/* Ultra-minimal glass background */}
      <div className="absolute inset-0 bg-[#0a0a0c]/55 backdrop-blur-lg border-t border-white/[0.03]" />
      
      <div className="relative flex items-center justify-between px-2 py-1.5 safe-bottom">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            className={`
              relative flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 haptic
              ${item.active ? 'text-white' : 'text-zinc-500 active:text-zinc-300'}
              ${item.accent && !item.active ? 'text-red-400' : ''}
            `}
          >
            {item.active && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute inset-0 rounded-lg bg-white/4"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}

            <div className={`flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200 ${item.active ? 'bg-white/5' : ''}`}>
              {item.id === 'profile' && userAvatar ? (
                <div className={`w-5 h-5 rounded-full overflow-hidden ring-2 transition-all ${item.active ? 'ring-primary/40' : 'ring-transparent'}`}>
                  <img src={userAvatar} className="w-full h-full object-cover" alt="Profile" />
                </div>
              ) : item.id === 'live' ? (
                <div className="relative">
                  {React.cloneElement(item.icon as any, { size: 18 })}
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </div>
              ) : (
                React.isValidElement(item.icon) ? React.cloneElement(item.icon as any, { size: 18 }) : item.icon
              )}
            </div>
          </button>
        ))}
      </div>
    </nav>
  );
};
