import React from 'react';
import { Search, HelpCircle, Bell, Command } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { motion } from 'framer-motion';
import { SidebarLemon } from './Sidebar';
import { HeaderConfig } from '../types';

interface HeaderProps {
  onToggleMobileNav?: () => void;
  isOpen?: boolean;
  config: HeaderConfig;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileNav, isOpen, config }) => {
  const { unreadCount, togglePanel } = useNotification();
  const { title, subtitle, showSearch = true, variant = 'default', actionIcon, onAction } = config;

  const bgClasses = {
    default: 'bg-[rgb(var(--color-bg-main))]/90 backdrop-blur-xl border-b border-white/[0.04]',
    transparent: 'bg-transparent border-b border-transparent',
    glass: 'bg-black/20 backdrop-blur-3xl border-b border-white/[0.04]',
    solid: 'bg-[#1b1c20] border-b border-[#2a2c33]'
  };

  return (
    <header 
      className={`sticky top-0 h-12 md:h-14 flex items-center justify-between z-[80] transition-all duration-200 w-full ${bgClasses[variant]}`}
      role="banner"
    >
      {/* Left: Mobile Toggle & Title */}
      <div className="flex items-center gap-3 pl-3 md:pl-4 shrink-0 min-w-0">
        <div className="md:hidden shrink-0">
          <SidebarLemon onClick={onToggleMobileNav} isOpen={isOpen} className="!w-9 !h-9 !rounded-[12px]" />
        </div>

        <div className="flex flex-col justify-center min-w-0">
          {title && (
            <div className="flex items-center gap-1.5 text-white font-bold text-sm md:text-base leading-none min-w-0">
              {variant === 'solid' && subtitle && <span className="text-zinc-400 font-normal text-xs md:text-sm hidden sm:inline">{subtitle}</span>}
              {variant === 'solid' && subtitle && <span className="text-zinc-600 hidden sm:inline">/</span>}
              <span className="truncate">{title}</span>
            </div>
          )}
          {subtitle && variant !== 'solid' && (
            <span className="text-[10px] text-zinc-500 font-medium truncate">{subtitle}</span>
          )}
        </div>
      </div>

      {/* Center: Search */}
      {showSearch && (
        <div className="flex-1 max-w-md mx-4 md:mx-6 relative group hidden md:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-zinc-500 group-focus-within:text-primary transition-colors duration-200" />
          </div>
          <input 
            type="text" 
            placeholder="Search..." 
            aria-label="Search"
            className="w-full bg-black/20 border border-white/5 hover:border-white/10 text-zinc-300 text-xs font-medium rounded-full pl-9 pr-12 py-2 focus:outline-none focus:border-primary/30 focus:bg-black/40 transition-all placeholder-zinc-600 shadow-inner"
          />
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <kbd className="hidden lg:inline-flex h-4 items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 font-sans text-[9px] font-bold text-zinc-500">
              <Command size={8} /> K
            </kbd>
          </div>
        </div>
      )}

      {/* Right: Actions */}
      <div className="flex items-center gap-2 pr-3 md:pr-5 shrink-0 ml-auto md:ml-0">
        <span className="text-[10px] text-zinc-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full hidden sm:inline">
          build: 2026-02-10a
        </span>
        {actionIcon && (
          <button 
            onClick={onAction}
            aria-label="Action"
            className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all touch-target"
          >
            {actionIcon}
          </button>
        )}
        <button 
          aria-label="Help"
          className="w-9 h-9 items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all hidden md:flex"
        >
          <HelpCircle size={18} />
        </button>
        <button 
          onClick={togglePanel}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          className="w-9 h-9 flex items-center justify-center relative text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl transition-all touch-target"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-black shadow-sm"
            />
          )}
        </button>
      </div>
    </header>
  );
};
