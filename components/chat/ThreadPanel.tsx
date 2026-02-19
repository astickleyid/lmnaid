import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { Message, User } from '../../types';
import { useChatStore } from './chatStore';
import { MessageBubble } from './MessageBubble';

interface ThreadPanelProps {
  parentMessage: Message;
  channelId: string;
  currentUser: User;
  onClose: () => void;
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({ parentMessage, channelId, currentUser, onClose }) => {
  const { getThreadMessages, addMessage } = useChatStore();
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const threadMessages = getThreadMessages(channelId, parentMessage.id);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [threadMessages.length]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    addMessage(channelId, {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      content: input,
      timestamp: 'Today at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      threadId: parentMessage.id,
    });
    setInput('');
  };

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-[400px] bg-[#2b2d31] border-l border-white/5 flex flex-col shrink-0 h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="font-bold text-white">Thread</h3>
        <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors"><X size={20} /></button>
      </div>

      {/* Parent message */}
      <div className="border-b border-white/5 pb-2">
        <MessageBubble message={parentMessage} channelId={channelId} currentUserId={currentUser.id} onOpenThread={() => {}} />
      </div>

      {/* Thread replies */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-0 py-2">
        <div className="px-4 py-2 text-xs text-zinc-500 font-medium border-b border-white/5 mb-2">
          {threadMessages.length} {threadMessages.length === 1 ? 'reply' : 'replies'}
        </div>
        {threadMessages.map((msg, i) => (
          <MessageBubble key={msg.id} message={msg} prevMessage={threadMessages[i - 1]} channelId={channelId} currentUserId={currentUser.id} onOpenThread={() => {}} />
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5">
        <form onSubmit={handleSend} className="bg-[#383a40] rounded-lg px-3 py-2 flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Reply in thread..."
            className="flex-1 bg-transparent text-[#dbdee1] placeholder-zinc-500 outline-none text-[15px]"
          />
          <button type="submit" disabled={!input.trim()} className="text-zinc-400 hover:text-white disabled:opacity-30 transition-colors">
            <Send size={18} />
          </button>
        </form>
      </div>
    </motion.div>
  );
};
