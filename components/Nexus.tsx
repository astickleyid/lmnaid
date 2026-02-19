import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { 
    Gamepad2, Code, Briefcase, Star, Users, Zap, ExternalLink, Clock, Trophy,
    GitBranch, Sparkles, Check, Edit3, Plus, Settings, LayoutGrid, Citrus,
    MoreHorizontal, MapPin, X, GripVertical, PlusCircle, Trash2
} from 'lucide-react';
import { StandItem, User } from '../types';

interface LemonadeStandProps {
    user: User;
    isOwnProfile?: boolean;
    isEditing?: boolean;
}

const INITIAL_ITEMS: StandItem[] = [
    {
        id: 'l1',
        type: 'lobby',
        title: 'Valorant Ranked',
        description: 'Grinding to Ascendant. Need a smoker and a healer.',
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop',
        meta: { rank: 'Diamond 2', slots: '1/5' },
        status: 'open'
    },
    {
        id: 'p1',
        type: 'project',
        title: 'lmnaid-core',
        description: 'The open-source core of the lmnaid platform. Written in Typescript.',
        meta: { language: 'TypeScript', stars: 1240 },
        status: 'active'
    },
    {
        id: 's1',
        type: 'service',
        title: 'Bot Development',
        description: 'Custom Discord/Nexus bots built to spec.',
        meta: { price: '$50/hr' },
        status: 'active'
    }
];

export const LemonadeStand: React.FC<LemonadeStandProps> = ({ user, isOwnProfile = false, isEditing = false }) => {
    const [items, setItems] = useState<StandItem[]>(INITIAL_ITEMS);

    // Mock function to add a new item
    const handleAddItem = () => {
        const newItem: StandItem = {
            id: `new-${Date.now()}`,
            type: 'project',
            title: 'New Project',
            description: 'A new venture starts here.',
            meta: { language: 'Rust', stars: 0 },
            status: 'active'
        };
        setItems([...items, newItem]);
    };

    const handleDeleteItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    return (
        <div className="w-full space-y-8 my-8 animate-fade-in px-2">
            
            {/* Hero Identity Block */}
            <div className="relative rounded-[2.5rem] overflow-hidden border border-white/5 bg-zinc-900 shadow-2xl group">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-700">
                     <Citrus size={200} className="text-yellow-400" />
                </div>
                
                <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                             <span className="bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.3)] flex items-center gap-2">
                                <Citrus size={12} fill="black" /> Lemon Hub
                             </span>
                             <span className="text-zinc-500 text-xs font-bold flex items-center gap-1 bg-black/30 px-3 py-1.5 rounded-lg border border-white/5">
                                <MapPin size={12}/> Cyber-Tokyo
                             </span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-white leading-[1.1] tracking-tight mb-4">
                            Building the digital future,<br/>one pixel at a time.
                        </h2>
                        <p className="text-zinc-400 text-base max-w-xl leading-relaxed">
                            Full-stack architect & visual designer. Currently looking for <span className="text-white font-bold">Valorant</span> teammates and <span className="text-white font-bold">Open Source</span> contributors.
                        </p>
                    </div>
                    
                    {!isOwnProfile && (
                        <div className="flex flex-col gap-3 shrink-0">
                            <button className="bg-white hover:bg-zinc-200 text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 transform hover:scale-105 active:scale-95">
                                <Zap size={18} fill="black" /> Connect
                            </button>
                            <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all border border-white/5 active:scale-95">
                                View Resume
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Editor Bar */}
            <AnimatePresence>
                {isEditing && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0, y: -20 }}
                        animate={{ height: 'auto', opacity: 1, y: 0 }}
                        exit={{ height: 0, opacity: 0, y: -20 }}
                        className="sticky top-20 z-40 overflow-hidden"
                    >
                        <div className="flex items-center gap-4 p-3 bg-zinc-800/90 backdrop-blur-xl border border-yellow-500/30 rounded-2xl shadow-2xl mb-4">
                            <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center text-black shadow-lg shadow-yellow-500/20 shrink-0">
                                <Edit3 size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-white font-bold text-sm">Design Mode Active</h4>
                                <p className="text-zinc-400 text-[10px] truncate">Drag items to reorder. Add new widgets to your hub.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleAddItem} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition-colors">
                                    <PlusCircle size={14} /> Add Widget
                                </button>
                                <button className="p-2 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors">
                                    <Settings size={20} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Content Grid */}
            {isEditing ? (
                 <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-6">
                    {items.map(item => (
                        <Reorder.Item key={item.id} value={item}>
                             <div className="relative group rounded-[2rem] bg-zinc-900 border border-zinc-800 p-2 flex gap-4 cursor-grab active:cursor-grabbing hover:border-yellow-500/50 transition-colors">
                                 <div className="w-8 flex items-center justify-center text-zinc-600 group-hover:text-zinc-400">
                                     <GripVertical size={20} />
                                 </div>
                                 <div className="flex-1 pointer-events-none">
                                     <GridItemContent item={item} />
                                 </div>
                                 <button 
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="absolute top-4 right-4 p-2 bg-zinc-800 hover:bg-red-500/20 text-zinc-500 hover:text-red-500 rounded-xl transition-colors pointer-events-auto"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                             </div>
                        </Reorder.Item>
                    ))}
                 </Reorder.Group>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items.map(item => (
                        <div key={item.id} className="h-full">
                            <GridItemContent item={item} />
                        </div>
                    ))}

                    {/* Static Tech Stack Widget */}
                    <div className="relative group rounded-[2rem] bg-zinc-900 border border-zinc-800 p-6 h-full flex flex-col hover:border-zinc-700 transition-colors">
                        <div className="flex items-center gap-3 mb-6">
                            <Code size={24} className="text-zinc-500"/>
                            <h3 className="text-lg font-bold text-white">Tech Stack</h3>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {['React', 'Next', 'Node', 'Rust', 'Go', 'AWS', 'Docker', 'Figma'].map(t => (
                                <div key={t} className="aspect-square rounded-xl bg-black border border-white/5 flex flex-col items-center justify-center gap-1 text-[9px] font-bold text-zinc-500 hover:text-white hover:border-zinc-600 transition-all cursor-default">
                                    <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full mb-1"></div>
                                    {t}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Static Availability Widget */}
                    <div className="md:col-span-2 relative group rounded-[2rem] bg-gradient-to-r from-zinc-900 to-black border border-zinc-800 p-8 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
                                <Clock size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-1">Availability</h3>
                                <p className="text-zinc-400 text-sm">Usually active between <span className="text-white font-bold">6PM - 2AM EST</span>.</p>
                            </div>
                        </div>
                        <div className="px-6 py-3 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Online Now
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const GridItemContent: React.FC<{ item: StandItem }> = ({ item }) => {
    switch (item.type) {
        case 'lobby':
            return (
                <div className="relative group rounded-[2rem] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 overflow-hidden transition-all duration-300 hover:shadow-2xl h-full flex flex-col">
                    <div className="h-48 relative shrink-0">
                        {item.image && <img src={item.image} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500"/>}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent"></div>
                        <div className="absolute top-4 left-4 bg-green-500 text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-black rounded-full animate-pulse"></span> Open
                        </div>
                    </div>
                    <div className="p-6 pt-2 relative flex-1 flex flex-col">
                        <div className="absolute -top-8 right-6 w-16 h-16 bg-zinc-800 rounded-2xl border-4 border-zinc-900 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                            <Gamepad2 size={32} className="text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{item.title}</h3>
                        <p className="text-zinc-400 text-sm mb-6 leading-relaxed flex-1">{item.description}</p>
                        <div className="flex gap-2 mt-auto">
                            <div className="bg-black/30 px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 border border-white/5 flex-1 text-center">
                                {item.meta.rank}
                            </div>
                            <div className="bg-black/30 px-3 py-2 rounded-xl text-xs font-bold text-zinc-300 border border-white/5 flex-1 text-center">
                                {item.meta.slots} Slots
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'project':
            return (
                <div className="relative group rounded-[2rem] bg-zinc-900 border border-zinc-800 hover:border-blue-500/30 overflow-hidden transition-all duration-300 p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                            <GitBranch size={24} />
                        </div>
                        <button className="text-zinc-500 hover:text-white"><MoreHorizontal size={20}/></button>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{item.title}</h3>
                    <p className="text-zinc-400 text-sm mb-8 flex-1">{item.description}</p>
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div> {item.meta.language}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-yellow-500">
                            <Star size={12} fill="currentColor"/> {item.meta.stars}
                        </div>
                    </div>
                </div>
            );
        case 'service':
            return (
                <div className="relative group rounded-[2rem] bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 overflow-hidden transition-all duration-300 p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors duration-300">
                            <Briefcase size={24} />
                        </div>
                        <button className="text-zinc-500 hover:text-white"><MoreHorizontal size={20}/></button>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{item.title}</h3>
                    <p className="text-zinc-400 text-sm mb-8 flex-1">{item.description}</p>
                    <div className="mt-auto pt-4 border-t border-white/5">
                         <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Starting at</span>
                            <span className="text-lg font-black text-white">{item.meta.price}</span>
                         </div>
                    </div>
                </div>
            );
        default:
            return null;
    }
};
