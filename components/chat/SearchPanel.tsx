import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, Calendar, User as UserIcon, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '../../types';
import { useChatStore } from './chatStore';

interface SearchPanelProps {
  channelId: string;
  allMessages: Message[];
  onClose: () => void;
  onJumpToMessage: (msgId: string) => void;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ channelId, allMessages, onClose, onJumpToMessage }) => {
  const [query, setQuery] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = allMessages.filter(m => {
    if (!query && !filterUser) return false;
    const matchQuery = !query || m.content.toLowerCase().includes(query.toLowerCase());
    const matchUser = !filterUser || m.senderName.toLowerCase().includes(filterUser.toLowerCase());
    return matchQuery && matchUser;
  }).slice(0, 25);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="absolute top-0 right-0 w-[420px] bg-[#1e1f22] border border-white/10 rounded-lg shadow-2xl z-50 max-h-[80vh] flex flex-col overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
        <Search size={16} className="text-zinc-500 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search messages..."
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder-zinc-500"
        />
        <button onClick={() => setShowFilters(!showFilters)} className={`p-1 rounded transition-colors ${showFilters ? 'bg-[#5865f2] text-white' : 'text-zinc-400 hover:text-white'}`}>
          <Filter size={14} />
        </button>
        <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={16} /></button>
      </div>

      {showFilters && (
        <div className="px-3 py-2 border-b border-white/5 flex gap-2">
          <div className="flex items-center gap-1.5 bg-[#2b2d31] rounded px-2 py-1 flex-1">
            <UserIcon size={12} className="text-zinc-500" />
            <input value={filterUser} onChange={e => setFilterUser(e.target.value)} placeholder="from: user" className="bg-transparent text-xs text-white outline-none w-full" />
          </div>
          <div className="flex items-center gap-1.5 bg-[#2b2d31] rounded px-2 py-1 flex-1">
            <Calendar size={12} className="text-zinc-500" />
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-transparent text-xs text-white outline-none w-full" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {results.length === 0 && query && (
          <div className="p-8 text-center text-zinc-500 text-sm">No results found</div>
        )}
        {results.map(msg => (
          <button
            key={msg.id}
            onClick={() => { onJumpToMessage(msg.id); onClose(); }}
            className="w-full text-left px-3 py-2.5 hover:bg-white/5 border-b border-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <img src={msg.senderAvatar} className="w-5 h-5 rounded-full" />
              <span className="text-sm font-medium text-white">{msg.senderName}</span>
              <span className="text-[10px] text-zinc-500 ml-auto">{msg.timestamp}</span>
            </div>
            <p className="text-xs text-zinc-400 line-clamp-2">{msg.content}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
};
