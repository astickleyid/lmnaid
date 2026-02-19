import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Info, Bell, Sparkles } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning' | 'magic';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isPanelOpen: boolean;
  addNotification: (type: NotificationType, title: string, message: string) => void;
  togglePanel: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within a NotificationProvider');
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toasts are transient (popups)
  const [toasts, setToasts] = useState<Notification[]>([]);
  // Notifications are persistent (history)
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const addNotification = useCallback((type: NotificationType, title: string, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      id,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false
    };

    // Add to persistent history
    setNotifications(prev => [newNotification, ...prev]);

    // Add to transient toasts
    setToasts(prev => [...prev, newNotification]);

    // Auto-dismiss toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(n => n.id !== id));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const togglePanel = () => {
    setIsPanelOpen(prev => !prev);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      isPanelOpen, 
      addNotification, 
      togglePanel, 
      markAsRead, 
      markAllAsRead, 
      removeNotification, 
      clearAll 
    }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 left-4 md:left-auto z-[100] flex flex-col gap-3 pointer-events-none" aria-live="polite" role="status">
        <AnimatePresence mode='popLayout'>
          {toasts.map(toast => (
            <NotificationToast key={toast.id} notification={toast} onClose={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="text-green-400" size={20} />,
    error: <AlertCircle className="text-red-400" size={20} />,
    info: <Info className="text-blue-400" size={20} />,
    warning: <Bell className="text-yellow-400" size={20} />,
    magic: <Sparkles className="text-violet-400" size={20} />
  };

  const styles = {
    success: 'from-green-500/10 to-emerald-500/5 border-green-500/20 shadow-green-500/10',
    error: 'from-red-500/10 to-pink-500/5 border-red-500/20 shadow-red-500/10',
    info: 'from-blue-500/10 to-indigo-500/5 border-blue-500/20 shadow-blue-500/10',
    warning: 'from-yellow-500/10 to-orange-500/5 border-yellow-500/20 shadow-yellow-500/10',
    magic: 'from-violet-500/20 to-fuchsia-500/10 border-violet-500/30 shadow-violet-500/20'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
      exit={{ opacity: 0, x: 20, scale: 0.95, filter: 'blur(10px)' }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`pointer-events-auto w-full md:w-80 p-4 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border flex items-start gap-4 shadow-2xl bg-gradient-to-br ${styles[notification.type]}`}
    >
        <div className="shrink-0 mt-0.5 p-1.5 rounded-full bg-white/5 border border-white/5 shadow-inner">
            {icons[notification.type]}
        </div>
        <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-sm font-bold text-white leading-tight mb-1">{notification.title}</h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-medium opacity-90">{notification.message}</p>
        </div>
        <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg -mr-1 -mt-1"
        >
            <X size={14} />
        </button>
    </motion.div>
  );
};