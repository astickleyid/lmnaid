import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Bell, Sparkles, Check, Trash2, Clock } from 'lucide-react';
import { useNotification, Notification } from './NotificationSystem';

export const NotificationPanel: React.FC = () => {
  const { 
    isPanelOpen, 
    togglePanel, 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    removeNotification, 
    clearAll 
  } = useNotification();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-green-500" />;
      case 'error': return <AlertCircle size={16} className="text-red-500" />;
      case 'info': return <Info size={16} className="text-blue-500" />;
      case 'warning': return <Bell size={16} className="text-yellow-500" />;
      case 'magic': return <Sparkles size={16} className="text-violet-500" />;
      default: return <Info size={16} className="text-zinc-500" />;
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={togglePanel}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-zinc-950/95 border-l border-white/[0.06] z-[100] shadow-2xl flex flex-col backdrop-blur-2xl safe-top"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-zinc-950">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-white" />
                <h2 className="font-bold text-white">Notifications</h2>
                <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full font-medium">
                  {notifications.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={markAllAsRead}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <Check size={18} />
                </button>
                <button 
                  onClick={clearAll}
                  className="p-2 text-zinc-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                  title="Clear all"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  onClick={togglePanel}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-8 text-center">
                  <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                    <Bell size={24} className="opacity-50" />
                  </div>
                  <h3 className="text-zinc-300 font-bold mb-1">All caught up!</h3>
                  <p className="text-sm">You have no new notifications.</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`
                      relative p-4 rounded-xl border group transition-all duration-200
                      ${notification.read 
                        ? 'bg-transparent border-transparent hover:bg-white/5' 
                        : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
                      }
                    `}
                  >
                    {!notification.read && (
                      <div className="absolute right-4 top-4 w-2 h-2 bg-primary rounded-full" />
                    )}
                    
                    <div className="flex gap-3">
                      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${notification.read ? 'bg-zinc-900' : 'bg-zinc-800'}`}>
                        {getIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-bold mb-0.5 ${notification.read ? 'text-zinc-400' : 'text-white'}`}>
                          {notification.title}
                        </h4>
                        <p className="text-xs text-zinc-500 leading-relaxed mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                            <Clock size={10} />
                            {getTimeAgo(notification.timestamp)}
                          </span>
                          {!notification.read && (
                            <button 
                              onClick={() => markAsRead(notification.id)}
                              className="text-[10px] font-medium text-primary hover:underline"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>

                      <button 
                        onClick={() => removeNotification(notification.id)}
                        className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};