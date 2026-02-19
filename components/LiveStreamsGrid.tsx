import React, { useState, useEffect } from 'react';
import { Eye, Circle, Users, Radio, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LiveStream {
  id: string;
  title: string;
  username: string;
  displayName: string;
  avatar?: string;
  thumbnailUrl?: string;
  viewerCount: number;
  category?: string;
  startedAt: string;
  isLive: boolean;
}

interface LiveStreamsGridProps {
  streams: LiveStream[];
  onStreamClick: (stream: LiveStream) => void;
  loading?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export const LiveStreamsGrid: React.FC<LiveStreamsGridProps> = ({
  streams, onStreamClick, loading = false,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(streams.filter(s => s.category).map(s => s.category!))];

  const filtered = streams.filter(s => {
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) &&
        !s.username.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCategory && s.category !== selectedCategory) return false;
    return true;
  });

  const formatViewers = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const formatUptime = (startedAt: string) => {
    const diff = Date.now() - new Date(startedAt).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-400" />
          <h2 className="text-lg font-bold text-white">Live Now</h2>
          <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
            {streams.length}
          </span>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search streams..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                !selectedCategory ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white/5 rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-video bg-white/10" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Radio className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No live streams right now</p>
          <p className="text-xs mt-1 text-gray-600">Be the first to go live!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((stream, i) => (
              <motion.button
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onStreamClick(stream)}
                className="bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-all text-left group border border-transparent hover:border-purple-500/30"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-black">
                  {stream.thumbnailUrl ? (
                    <img src={stream.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-black flex items-center justify-center">
                      <Radio className="w-8 h-8 text-purple-500/30" />
                    </div>
                  )}
                  {/* Live badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    <Circle className="w-1.5 h-1.5 fill-white" />
                    LIVE
                  </div>
                  {/* Viewer count */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                    <Eye className="w-3 h-3" />
                    {formatViewers(stream.viewerCount)}
                  </div>
                  {/* Uptime */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-gray-300 text-xs px-1.5 py-0.5 rounded font-mono">
                    {formatUptime(stream.startedAt)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 flex items-start gap-2.5">
                  {stream.avatar ? (
                    <img src={stream.avatar} className="w-8 h-8 rounded-full flex-shrink-0" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate group-hover:text-purple-300 transition-colors">
                      {stream.title}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">{stream.displayName || stream.username}</p>
                    {stream.category && (
                      <span className="inline-block mt-1 text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded">
                        {stream.category}
                      </span>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default LiveStreamsGrid;
