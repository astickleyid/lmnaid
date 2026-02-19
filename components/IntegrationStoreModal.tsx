import React, { useState } from 'react';
import { 
    X, Search, Download, Check, Zap, Layout, Code, Database, Palette, 
    Music, Gamepad2, Bot, Brain, Sparkles, GraduationCap, 
    MessageSquare, Box, Globe, Shield, Terminal, Star, Crown, Rocket, 
    ChevronLeft, ThumbsUp, Layers, Tag, Clock, Mic, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntegrationStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: (app: any) => void;
}

type AppCategory = 'all' | 'native' | 'ai' | 'dev' | 'design' | 'productivity' | 'entertainment' | 'games' | 'learning' | 'social';

const CATEGORIES: { id: AppCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Discover', icon: <CompassIcon /> },
    { id: 'ai', label: 'AI & Agents', icon: <Bot size={16} /> },
    { id: 'native', label: 'Stock Features', icon: <Crown size={16} /> },
    { id: 'dev', label: 'Developer', icon: <Terminal size={16} /> },
    { id: 'productivity', label: 'Productivity', icon: <Layout size={16} /> },
    { id: 'design', label: 'Creative', icon: <Palette size={16} /> },
    { id: 'social', label: 'Social', icon: <MessageSquare size={16} /> },
    { id: 'games', label: 'Activities', icon: <Gamepad2 size={16} /> },
    { id: 'entertainment', label: 'Entertainment', icon: <Music size={16} /> },
];

// Twitch Icon Component
const TwitchIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
  </svg>
);

const MARKETPLACE_APPS = [
    // --- Twitch Integration (Featured) ---
    { id: 'twitch', name: 'Twitch', description: 'Embed live streams, chat, VODs, and clips directly in your server. Full IRC integration with real-time chat.', category: 'entertainment', icon: <TwitchIcon size={24} />, color: 'bg-purple-600', verified: true, tags: ['Streaming', 'Live', 'Chat'], rating: 4.9, installs: '2.5M+' },
    
    // --- Native Stock Features (IDs mapped to AppView cases) ---
    { id: 'board', name: 'Project Board', description: 'Kanban-style task management for teams. Drag and drop tasks, assign members, and track progress.', category: 'native', icon: <Layout size={24} />, color: 'bg-zinc-800', verified: true, tags: ['Productivity', 'Native'], rating: 4.9, installs: '2M+' },
    { id: 'ai', name: 'Agent Studio', description: 'Build and deploy custom AI personalities. Configure system prompts, temperature, and knowledge bases.', category: 'native', icon: <Bot size={24} />, color: 'bg-violet-600', verified: true, tags: ['AI', 'Beta'], rating: 4.8, installs: '850k' },
    { id: 'code', name: 'Code Sandbox', description: 'Collaborative live coding environment. Supports JS, TS, Python, and more with real-time sync.', category: 'native', icon: <Code size={24} />, color: 'bg-blue-600', verified: true, tags: ['Dev', 'Editor'], rating: 4.7, installs: '1.2M' },
    
    // --- AI & Automation ---
    { id: 'ai_midjourney', name: 'Midjourney Bot', description: 'Generate images from text directly in chat. Utilize version 6 for photorealistic results.', category: 'ai', icon: <Sparkles size={24} />, color: 'bg-white text-black', verified: true, tags: ['Creative', 'Generative'], rating: 5.0, installs: '15M+' },
    { id: 'ai_modbot', name: 'Sentinel AI', description: 'Automated moderation powered by Gemini. Detects spam, toxicity, and raids in real-time.', category: 'ai', icon: <Shield size={24} />, color: 'bg-red-600', verified: true, tags: ['Safety', 'AutoMod'], rating: 4.5, installs: '300k' },
    { id: 'ai_coder', name: 'DevGPT', description: 'Autonomous coding agent. Can write, debug, and push code to your repositories.', category: 'ai', icon: <Terminal size={24} />, color: 'bg-emerald-600', verified: true, tags: ['Coding', 'Agent'], rating: 4.9, installs: '500k' },
    
    // --- Developer Tools ---
    { id: 'dev_github', name: 'GitHub', description: 'Real-time repository telemetry and PR synthesis. Link your repos to channels.', category: 'dev', icon: <Code size={24} />, color: 'bg-zinc-900', verified: true, tags: ['VCS', 'Integration'], rating: 4.9, installs: '5M+' },
    { id: 'dev_sentry', name: 'Sentry', description: 'Anomalous event monitoring and stack telemetry. Get alerts for exceptions.', category: 'dev', icon: <Shield size={24} />, color: 'bg-purple-900', verified: true, tags: ['Monitoring'], rating: 4.6, installs: '120k' },
    
    // --- Games & Social ---
    { id: 'store', name: 'Economy+', description: 'Global currency, shops, and trading system. Create a server economy in minutes.', category: 'social', icon: <Crown size={24} />, color: 'bg-yellow-500', verified: false, tags: ['Fun', 'RPG'], rating: 4.4, installs: '1.5M' },
    { id: 'game', name: 'Poker Night', description: 'Texas Hold\'em with video chat integration. Play with up to 8 friends.', category: 'games', icon: <Gamepad2 size={24} />, color: 'bg-red-600', verified: false, tags: ['Multiplayer', 'Fun'], rating: 4.2, installs: '500k' },
];

function CompassIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
    );
}

export const IntegrationStoreModal: React.FC<IntegrationStoreModalProps> = ({ isOpen, onClose, onInstall }) => {
  const [activeCategory, setActiveCategory] = useState<AppCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [installedApps, setInstalledApps] = useState<string[]>([]);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  if (!isOpen) return null;

  const handleInstall = (app: any) => {
      onInstall(app);
      setInstalledApps([...installedApps, app.id]);
  };

  const filteredApps = MARKETPLACE_APPS.filter(app => {
      const matchesCategory = activeCategory === 'all' || app.category === activeCategory;
      const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            app.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md md:p-4 animate-fade-in">
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.3 }}
            className="nebula-glass rounded-t-[2rem] md:rounded-[2rem] w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden relative border border-white/10 safe-bottom"
        >
            
            {/* Header */}
            <div className="h-18 border-b border-white/5 flex items-center justify-between px-8 py-4 shrink-0 bg-black/20 backdrop-blur-xl z-20">
                <div className="flex items-center gap-4">
                    {selectedApp && (
                        <button onClick={() => setSelectedApp(null)} className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white -ml-2 transition-colors">
                            <ChevronLeft size={22} />
                        </button>
                    )}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <Box size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-white tracking-tight uppercase leading-none">Nexus Marketplace</h2>
                        <p className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase mt-1">v2.4.0 Stable</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-6">
                     {!selectedApp && (
                        <div className="relative group w-72 hidden md:block">
                            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search apps, bots, and games..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 pl-11 pr-4 text-xs text-white focus:outline-none focus:border-primary/50 transition-all placeholder-zinc-600 font-medium"
                            />
                        </div>
                     )}
                    <div className="w-px h-8 bg-white/10"></div>
                    <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors hover:bg-white/5 rounded-full">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar Navigation */}
                {!selectedApp && (
                    <div className="w-72 bg-black/20 border-r border-white/5 flex flex-col p-6 gap-8 shrink-0 overflow-y-auto custom-scrollbar">
                        <div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 px-2">Discover</p>
                            <div className="space-y-1">
                                {CATEGORIES.slice(0, 4).map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 relative overflow-hidden group
                                            ${activeCategory === cat.id 
                                                ? 'bg-white text-black shadow-lg shadow-white/10' 
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        <span className={`relative z-10 flex items-center gap-3 ${activeCategory === cat.id ? 'text-black' : 'text-zinc-400 group-hover:text-white'}`}>
                                            {cat.icon}
                                            {cat.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 px-2">Categories</p>
                            <div className="space-y-1">
                                {CATEGORIES.slice(4).map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => setActiveCategory(cat.id)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-3 
                                            ${activeCategory === cat.id 
                                                ? 'bg-zinc-800 text-white border border-white/10 shadow-lg' 
                                                : 'text-zinc-400 hover:text-white hover:bg-white/5'
                                            }`}
                                    >
                                        {cat.icon}
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar p-8 bg-gradient-to-b from-transparent to-black/40">
                    <AnimatePresence mode="wait">
                    {selectedApp ? (
                        /* Detail View */
                        <motion.div 
                            key="detail"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="max-w-5xl mx-auto w-full"
                        >
                            <div className="flex flex-col md:flex-row gap-10 mb-12">
                                <div className={`w-40 h-40 rounded-[2rem] ${selectedApp.color} flex items-center justify-center text-white shadow-2xl shrink-0 border border-white/10`}>
                                    {React.cloneElement(selectedApp.icon, { size: 80 })}
                                </div>
                                <div className="flex-1 pt-2">
                                    <div className="flex items-center gap-3 mb-3">
                                        <h1 className="text-5xl font-black text-white tracking-tight">{selectedApp.name}</h1>
                                        {selectedApp.verified && (
                                            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-blue-500/20">
                                                <Check size={12} strokeWidth={4} /> Verified
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xl text-zinc-400 mb-8 max-w-2xl leading-relaxed">{selectedApp.description}</p>
                                    
                                    <div className="flex flex-wrap gap-4 items-center">
                                        <button 
                                            onClick={() => {
                                                if (!installedApps.includes(selectedApp.id)) {
                                                    handleInstall(selectedApp);
                                                }
                                            }}
                                            disabled={installedApps.includes(selectedApp.id)}
                                            className={`px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95
                                                ${installedApps.includes(selectedApp.id)
                                                    ? 'bg-zinc-800 text-zinc-500 cursor-default'
                                                    : 'bg-white text-black hover:bg-zinc-200'
                                                }
                                            `}
                                        >
                                            {installedApps.includes(selectedApp.id) ? 'Installed' : 'Add to Server'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        /* Listing View */
                        <motion.div
                            key="listing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                    {activeCategory === 'ai' && <Bot size={24} className="text-violet-500" />}
                                    {activeCategory === 'all' ? 'Trending Apps' : CATEGORIES.find(c => c.id === activeCategory)?.label}
                                </h3>
                                <div className="text-[10px] font-black text-zinc-500 bg-zinc-900 border border-white/5 px-3 py-1.5 rounded-lg uppercase tracking-widest">
                                    {filteredApps.length} Results
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
                                {filteredApps.map((app, i) => {
                                    const isInstalled = installedApps.includes(app.id);
                                    return (
                                        <motion.div 
                                            key={app.id} 
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            onClick={() => setSelectedApp(app)}
                                            className="bg-zinc-900/40 border border-white/5 rounded-[2rem] p-6 hover:bg-zinc-800/60 hover:border-white/10 transition-all group flex flex-col cursor-pointer hover:-translate-y-1 hover:shadow-xl"
                                        >
                                            <div className="flex items-start justify-between mb-6">
                                                <div className={`w-16 h-16 rounded-2xl ${app.color} flex items-center justify-center text-white shadow-lg shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                                                    {app.icon}
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    {app.verified && (
                                                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                            <Check size={10} strokeWidth={3} /> Official
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <h4 className="font-bold text-white text-xl mb-2 group-hover:text-primary transition-colors">{app.name}</h4>
                                            <p className="text-zinc-500 text-sm leading-relaxed mb-6 h-10 line-clamp-2 font-medium">
                                                {app.description}
                                            </p>

                                            <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-bold">
                                                    <Star size={14} className="fill-zinc-500 text-zinc-500"/> {app.rating}
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!isInstalled) handleInstall(app);
                                                    }}
                                                    disabled={isInstalled}
                                                    className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2
                                                        ${isInstalled 
                                                            ? 'bg-zinc-800/50 text-zinc-600 cursor-default' 
                                                            : 'bg-white text-black hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20'
                                                        }
                                                    `}
                                                >
                                                    {isInstalled ? <Check size={14}/> : <Download size={14}/>}
                                                    {isInstalled ? 'Added' : 'Add'}
                                                </button>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    </div>
  );
};