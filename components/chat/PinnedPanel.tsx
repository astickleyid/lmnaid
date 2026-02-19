import React from 'react';
import { X, Pin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Message } from '../../types';
import { useChatStore } from './chatStore';

interface PinnedPanelProps {
  channelId: string;
  channelName: string;
  onClose: () => void;
}

export const PinnedPanel: React.FC<PinnedPanelProps> = ({ channelId, channelName, onClose }) => {
  const { getPinnedMessages, togglePin } = useChatStore();
  const pinned = getPinnedMessages(channelId);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="absolute top-0 right-0 w-[420px] bg-[#1e1f22] border border-white/10 rounded-lg shadow-2xl z-50 max-h-[80vh] flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Pin size={16} className="text-yellow-500" />
          <span className="font-bold text-white text-sm">Pinned Messages</span>
          <span className="text-xs text-zinc-500">#{channelName}</span>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={16} /></button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {pinned.length === 0 && (
          <div className="p-8 text-center">
            <Pin size={32} className="text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No pinned messages yet</p>
            <p className="text-zinc-600 text-xs mt-1">Pin important messages to find them later</p>
          </div>
        )}
        {pinned.map(msg => (
          <div key={msg.id} className="px-4 py-3 border-b border-white/[0.03] hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <img src={msg.senderAvatar} className="w-5 h-5 rounded-full" />
              <span className="text-sm font-medium text-white">{msg.senderName}</span>
              <span className="text-[10px] text-zinc-500 ml-auto">{msg.timestamp}</span>
            </div>
            <p className="text-sm text-zinc-300 line-clamp-3">{msg.content}</p>
            <button onClick={() => togglePin(channelId, msg.id, '')} className="text-[10px] text-zinc-500 hover:text-red-400 mt-1.5">Unpin</button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
