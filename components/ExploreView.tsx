import React, { useEffect } from 'react';
import { Search, Compass, Users, Gamepad2, Code, Music, Palette, Globe, Trophy, Star, ArrowRight, TrendingUp } from 'lucide-react';
import { HeaderConfig } from '../types';

interface ExploreViewProps {
  onToggleMobileNav: () => void;
  onJoinServer: (name: string, type: string) => void;
  setHeader: (config: HeaderConfig) => void;
}

const CATEGORIES = [
  { id: 'gaming', label: 'Gaming', icon: <Gamepad2 size={24} />, color: 'from-purple-500 to-indigo-500' },
  { id: 'tech', label: 'Technology', icon: <Code size={24} />, color: 'from-blue-500 to-cyan-500' },
  { id: 'music', label: 'Music', icon: <Music size={24} />, color: 'from-pink-500 to-rose-500' },
  { id: 'art', label: 'Creative', icon: <Palette size={24} />, color: 'from-orange-500 to-amber-500' },
  { id: 'community', label: 'Community', icon: <Globe size={24} />, color: 'from-green-500 to-emerald-500' },
];

const FEATURED_SERVERS = [
  { 
    id: 'f1', 
    name: 'Cyberpunk 2077', 
    description: 'Official community for Cyberpunk 2077. Wake up samurai, we have a city to burn.', 
    members: '450k', 
    banner: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?q=80&w=1974&auto=format&fit=crop',
    icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=Cyberpunk'
  },
  { 
    id: 'f2', 
    name: 'React Developers', 
    description: 'A community for React.js developers to share knowledge and projects.', 
    members: '120k', 
    banner: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=2070&auto=format&fit=crop',
    icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=React'
  },
  {
    id: 'f3',
    name: 'Midjourney',
    description: 'Official server for Midjourney. Create beautiful AI art.',
    members: '12M',
    banner: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2070&auto=format&fit=crop',
    icon: 'https://api.dicebear.com/7.x/identicon/svg?seed=Midjourney'
  }
];

export const ExploreView: React.FC<ExploreViewProps> = ({ onToggleMobileNav, onJoinServer, setHeader }) => {
  useEffect(() => {
    setHeader({
      title: 'Explore',
      subtitle: 'Discover Communities',
      variant: 'default',
      showSearch: true
    });
  }, [setHeader]);

  return (
    <div className="h-full flex flex-col bg-transparent overflow-hidden view-transition">
       <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 md:p-8 lg:p-12">
          <div className="max-w-7xl mx-auto space-y-10 md:space-y-14 pb-20 animate-fade-in">
              
              {/* Hero Section */}
              <div className="relative rounded-2xl md:rounded-[2.5rem] overflow-hidden bg-zinc-950 border border-white/5 h-[220px] sm:h-[280px] md:h-[400px] flex items-center justify-center text-center px-4 sm:px-6 md:px-12">
                 <div className="absolute inset-0 bg-gradient-to-r from-violet-900/40 via-black/90 to-violet-900/40 z-0"></div>
                 <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-30 z-0 mix-blend-overlay"></div>
                 
                 <div className="relative z-10 max-w-3xl animate-fade-in-up">
                     <h1 className="text-2xl sm:text-4xl md:text-7xl font-black text-white mb-3 md:mb-6 tracking-tighter leading-none">Find your <span className="text-primary">community</span></h1>
                     <p className="text-xs sm:text-sm md:text-xl text-zinc-300 mb-6 md:mb-10 leading-relaxed max-w-xl mx-auto opacity-80">Explore hubs for gaming, art, music, and learning. There's a dedicated place for you on lmnaid.</p>
                     <div className="relative max-w-lg mx-auto group">
                        <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={18} />
                        <input 
                          type="text" 
                          placeholder="Explore communities..." 
                          className="w-full bg-black/60 backdrop-blur-2xl border border-white/10 rounded-full py-3 md:py-5 pl-11 md:pl-14 pr-6 md:pr-8 text-white placeholder-zinc-500 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all shadow-2xl text-sm md:text-lg"
                        />
                     </div>
                 </div>
              </div>

              {/* Categories */}
              <section>
                 <div className="flex items-center gap-3 mb-8 ml-1">
                    <Compass className="text-primary" size={28} />
                    <h2 className="text-3xl font-black text-white tracking-tight">Browse Categories</h2>
                 </div>
                 <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-5">
                    {CATEGORIES.map(cat => (
                       <button key={cat.id} className="group relative overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl h-20 sm:h-24 md:h-36 flex flex-col items-center justify-center bg-black/30 border border-white/5 hover:border-primary/40 hover:bg-black/50 transition-all duration-300 haptic touch-target">
                           <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-0 group-hover:opacity-[0.15] active:opacity-[0.2] transition-opacity duration-500`}></div>
                           <div className="mb-2 sm:mb-4 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-zinc-900 border border-white/5 group-hover:scale-110 group-hover:text-primary transition-all duration-300 text-zinc-500">
                               {cat.icon}
                           </div>
                           <span className="font-black text-[9px] sm:text-xs text-zinc-400 tracking-widest uppercase group-hover:text-white transition-colors">{cat.label}</span>
                       </button>
                    ))}
                 </div>
              </section>

              {/* Featured Servers */}
              <section>
                 <div className="flex items-center gap-3 mb-8 ml-1">
                    <Star className="text-accent fill-accent" size={28} />
                    <h2 className="text-3xl font-black text-white tracking-tight">Featured Hubs</h2>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                    {FEATURED_SERVERS.map(server => (
                       <div key={server.id} className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl md:rounded-[2rem] overflow-hidden hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 group flex flex-col h-full">
                           <div className="h-24 sm:h-28 md:h-40 bg-zinc-800 relative">
                               <img src={server.banner} alt={server.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-700" loading="lazy" />
                               <div className="absolute -bottom-6 sm:-bottom-8 left-4 sm:left-8 w-14 h-14 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl p-1 bg-[#0c051a] shadow-2xl">
                                   <img src={server.icon} alt={server.name} className="w-full h-full rounded-xl sm:rounded-2xl object-cover bg-black border border-white/10" />
                               </div>
                           </div>
                           <div className="pt-8 sm:pt-12 px-4 sm:px-8 pb-4 sm:pb-8 flex-1 flex flex-col">
                               <h3 className="text-lg sm:text-2xl font-black text-white mb-2 group-hover:text-primary transition-colors">{server.name}</h3>
                               <div className="text-[10px] text-zinc-500 font-black uppercase mb-5 flex items-center gap-2 tracking-[0.2em]">
                                  <Users size={14} className="text-zinc-600" /> {server.members} MEMBERS
                               </div>
                               <p className="text-zinc-400 text-sm leading-relaxed mb-8 flex-1 opacity-80">
                                   {server.description}
                               </p>
                               <button 
                                  onClick={() => onJoinServer(server.name, 'custom')}
                                  className="w-full bg-zinc-900/50 hover:bg-primary active:bg-primary/80 text-zinc-300 hover:text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 border border-white/10 haptic touch-target"
                               >
                                   Join This Hub
                               </button>
                           </div>
                       </div>
                    ))}
                 </div>
              </section>

              {/* Trending Footer */}
              <section className="bg-primary/5 rounded-2xl sm:rounded-[3rem] p-5 sm:p-10 md:p-14 border border-primary/10 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full"></div>
                  
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12 relative z-10">
                      <div>
                          <h2 className="text-xl sm:text-3xl font-black text-white mb-2 sm:mb-3 flex items-center gap-3 sm:gap-4"><Trophy className="text-accent" size={24}/> Top Growing</h2>
                          <p className="text-zinc-500 font-bold text-sm sm:text-lg">Fastest growing hubs this week on lmnaid.</p>
                      </div>
                      <button className="btn btn-secondary py-4 px-10 text-xs font-black uppercase tracking-widest bg-zinc-900 hover:bg-zinc-800 transition-all">
                          Full Leaderboard
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
                      {[1, 2, 3, 4].map(i => (
                          <div key={i} className="flex items-center gap-5 p-6 bg-black/50 backdrop-blur-xl rounded-[2rem] border border-white/5 hover:border-primary/40 cursor-pointer transition-all duration-300 group/item">
                              <div className="font-black text-zinc-800 text-3xl italic group-hover/item:text-primary/40 transition-colors">#{i}</div>
                              <div className="w-14 h-14 rounded-2xl bg-zinc-900 shrink-0 border border-white/10 overflow-hidden shadow-xl">
                                 <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=Rising${i}`} alt="" className="w-full h-full object-cover group-hover/item:scale-110 transition-transform duration-500" />
                              </div>
                              <div className="min-w-0">
                                  <div className="font-black text-white truncate text-sm tracking-tight">Hub {String.fromCharCode(64+i)}</div>
                                  <div className="text-[10px] text-green-500 font-black tracking-widest uppercase mt-1 flex items-center gap-1">
                                      <TrendingUp size={10}/> +{(12-i)*11}%
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </section>

          </div>
       </div>
    </div>
  );
};