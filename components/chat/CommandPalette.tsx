import React, { useState, useEffect, useRef } from 'react';
import { Search, Zap, Pin, Star, Download, Trash, Settings, Volume2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface Command {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  onClose: () => void;
  commands: Command[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = commands.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => { setSelected(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && filtered[selected]) { filtered[selected].action(); onClose(); }
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-[520px] bg-[#1e1f22] rounded-xl shadow-2xl border border-white/10 overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <Zap size={16} className="text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-white outline-none text-sm"
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.length === 0 && <div className="p-6 text-center text-zinc-500 text-sm">No commands found</div>}
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => { cmd.action(); onClose(); }}
              onMouseEnter={() => setSelected(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors ${i === selected ? 'bg-[#5865f2]' : 'hover:bg-white/5'}`}
            >
              <span className={`${i === selected ? 'text-white' : 'text-zinc-400'}`}>{cmd.icon}</span>
              <div className="text-left">
                <div className={`text-sm font-medium ${i === selected ? 'text-white' : 'text-zinc-300'}`}>{cmd.name}</div>
                <div className={`text-xs ${i === selected ? 'text-white/70' : 'text-zinc-500'}`}>{cmd.description}</div>
              </div>
              <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${i === selected ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-600'}`}>{cmd.category}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
