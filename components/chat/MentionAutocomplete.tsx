import React from 'react';
import { motion } from 'framer-motion';

interface MemberOption {
  id: string;
  name: string;
  avatar: string;
  status: string;
  isBot?: boolean;
}

interface MentionAutocompleteProps {
  query: string;
  members: MemberOption[];
  onSelect: (member: MemberOption) => void;
  position: { bottom: number; left: number };
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({ query, members, onSelect, position }) => {
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  if (filtered.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="absolute z-30 bg-[#111214] border border-white/10 rounded-lg shadow-xl py-1 w-60 overflow-hidden"
      style={{ bottom: position.bottom, left: position.left }}
    >
      <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase">Members matching @{query}</div>
      {filtered.map(m => (
        <button
          key={m.id}
          onClick={() => onSelect(m)}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#5865f2] transition-colors group"
        >
          <div className="relative">
            <img src={m.avatar} className="w-6 h-6 rounded-full" />
            <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#111214] ${
              m.status === 'online' ? 'bg-green-500' : m.status === 'idle' ? 'bg-yellow-500' : m.status === 'dnd' ? 'bg-red-500' : 'bg-zinc-500'
            }`} />
          </div>
          <span className="text-sm text-zinc-300 group-hover:text-white font-medium">{m.name}</span>
          {m.isBot && <span className="bg-[#5865f2] text-white text-[9px] px-1 rounded font-bold ml-auto">BOT</span>}
        </button>
      ))}
    </motion.div>
  );
};
