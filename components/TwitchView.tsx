import React, { useState, useEffect, useRef } from 'react';
import { 
  Video, Users, Clock, Play, Eye, MessageSquare, Film, Scissors, X,
  ExternalLink, Send, Settings, Maximize2, Volume2, VolumeX,
  Circle, TrendingUp, Radio, Grid3x3, ChevronDown, Search, Filter,
  Star, Share2, Download, MoreVertical, Sparkles, Crown, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Channel } from '../types';
import { 
  getStreamData, 
  getChatMessages, 
  getVODs, 
  getClips,
  sendChatMessage,
  getTwitchEmbedUrl,
  TwitchChatMessage,
  TwitchVOD,
  TwitchClip
} from '../services/twitchService';

interface TwitchViewProps {
  channel: Channel;
  onOpenGoLive?: () => void;
}

// Official Twitch Logo SVG Component
const TwitchIcon = ({ size = 24, className = '' }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
  </svg>
);

export const TwitchView: React.FC<TwitchViewProps> = ({ channel, onOpenGoLive }) => {
  const [activeTab, setActiveTab] = useState<'live' | 'vods' | 'clips'>('live');
  const [streamData, setStreamData] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<TwitchChatMessage[]>([]);
  const [vods, setVods] = useState<TwitchVOD[]>([]);
  const [clips, setClips] = useState<TwitchClip[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const channelName = channel.twitchChannel || 'demo_streamer';

  useEffect(() => {
    loadStreamData();
    loadChatMessages();
    loadVODs();
    loadClips();

    // Simulate live chat updates
    const chatInterval = setInterval(() => {
      addMockChatMessage();
    }, 8000);

    // Simulate viewer count updates
    const viewerInterval = setInterval(() => {
      loadStreamData();
    }, 15000);

    return () => {
      clearInterval(chatInterval);
      clearInterval(viewerInterval);
    };
  }, [channelName]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadStreamData = async () => {
    const data = await getStreamData(channelName);
    setStreamData(data);
  };

  const loadChatMessages = async () => {
    const messages = await getChatMessages(channelName);
    setChatMessages(messages);
  };

  const loadVODs = async () => {
    const vodList = await getVODs(channelName);
    setVods(vodList);
  };

  const loadClips = async () => {
    const clipList = await getClips(channelName);
    setClips(clipList);
  };

  const addMockChatMessage = () => {
    const mockMessages = [
      'This integration is sick!',
      'PogChamp',
      'Love this stream',
      'Kappa',
      'Can we get some hype in chat?',
      'This is better than Discord ngl',
      'LUL'
    ];
    const mockUsers = ['viewer123', 'gamer_pro', 'chat_lurker', 'hype_beast', 'cool_user'];
    const mockColors = ['#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3'];

    const newMessage: TwitchChatMessage = {
      id: Date.now().toString(),
      username: mockUsers[Math.floor(Math.random() * mockUsers.length)],
      displayName: mockUsers[Math.floor(Math.random() * mockUsers.length)],
      message: mockMessages[Math.floor(Math.random() * mockMessages.length)],
      color: mockColors[Math.floor(Math.random() * mockColors.length)],
      badges: Math.random() > 0.7 ? ['subscriber/6'] : [],
      timestamp: Date.now()
    };

    setChatMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const success = await sendChatMessage(channelName, chatInput);
    if (success) {
      // Add user's message to chat
      const userMessage: TwitchChatMessage = {
        id: Date.now().toString(),
        username: 'you',
        displayName: 'You',
        message: chatInput,
        color: '#9147FF',
        badges: [],
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, userMessage]);
      setChatInput('');
    }
  };

  const getBadgeIcon = (badge: string) => {
    if (badge.startsWith('subscriber')) return <Crown size={14} className="text-purple-400" />;
    if (badge.startsWith('moderator')) return <Shield size={14} className="text-green-400" />;
    return null;
  };

  const formatUptime = () => {
    if (!streamData?.startedAt) return '0:00';
    const diff = Date.now() - new Date(streamData.startedAt).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col bg-[#0e0e10]">
      {/* Stream Header */}
      <div className="h-12 md:h-14 border-b border-white/5 bg-[#18181b] flex items-center justify-between px-3 md:px-6 shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <TwitchIcon size={16} className="text-white md:hidden" />
              <TwitchIcon size={20} className="text-white hidden md:block" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-black text-white text-xs md:text-sm uppercase tracking-wider truncate">{channelName}</h2>
                {streamData?.isLive && (
                  <div className="flex items-center gap-1 bg-red-600 text-white px-1.5 md:px-2 py-0.5 rounded text-[8px] md:text-[10px] font-black uppercase tracking-wider shrink-0">
                    <Circle className="w-1.5 h-1.5 md:w-2 md:h-2 fill-current animate-pulse" />
                    LIVE
                  </div>
                )}
              </div>
              <p className="text-[8px] md:text-[10px] text-zinc-500 font-bold uppercase tracking-widest hidden md:block">Twitch Integration</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-6 shrink-0">
          {streamData?.isLive && (
            <>
              <div className="flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-bold text-zinc-400">
                <Eye size={12} className="text-red-500" />
                <span className="text-white">{streamData.viewers.toLocaleString()}</span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs font-bold text-zinc-400">
                <Clock size={14} className="text-blue-500" />
                <span className="text-white">{formatUptime()}</span>
              </div>
            </>
          )}
          {window.electron && onOpenGoLive && (
            <>
              <div className="w-px h-6 bg-white/10 hidden md:block"></div>
              <button
                onClick={onOpenGoLive}
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-red-600/20 transition-all"
              >
                <Video size={16} />
                Go Live
              </button>
            </>
          )}
          <button 
            onClick={() => setShowChat(!showChat)}
            className="text-zinc-400 hover:text-white transition-colors p-2 touch-target"
          >
            <MessageSquare size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <div className="h-10 md:h-12 bg-[#18181b] border-b border-white/5 flex items-center px-3 md:px-6 gap-1 overflow-x-auto no-scrollbar">
            {[
              { id: 'live', label: 'Live', labelFull: 'Live Stream', icon: <Radio size={14} /> },
              { id: 'vods', label: 'VODs', labelFull: 'VODs', icon: <Film size={14} /> },
              { id: 'clips', label: 'Clips', labelFull: 'Clips', icon: <Scissors size={14} /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 md:gap-2 whitespace-nowrap touch-target ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span className="md:hidden">{tab.label}</span>
                <span className="hidden md:inline">{tab.labelFull}</span>
              </button>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0e0e10]">
            <AnimatePresence mode="wait">
              {activeTab === 'live' && (
                <motion.div
                  key="live"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col"
                >
                  {/* Video Player */}
                  <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                    {streamData?.isLive ? (
                      <iframe
                        src={getTwitchEmbedUrl(channelName, window.location.hostname)}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black">
                        <div className="text-center">
                          <div className="w-24 h-24 rounded-full bg-purple-600/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                            <Video size={40} className="text-purple-500" />
                          </div>
                          <h3 className="text-white font-bold text-xl mb-2">{channelName} is Offline</h3>
                          <p className="text-zinc-500 text-sm">Check back later or watch past broadcasts below</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stream Info */}
                  {streamData && (
                    <div className="p-6 border-b border-white/5 bg-[#18181b]">
                      <h3 className="text-white font-bold text-lg mb-2">{streamData.title}</h3>
                      <div className="flex items-center gap-4">
                        <span className="text-purple-400 text-sm font-bold">{streamData.game}</span>
                        {streamData.tags.map((tag: string) => (
                          <span key={tag} className="text-[10px] bg-white/5 text-zinc-400 px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'vods' && (
                <motion.div
                  key="vods"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 md:p-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {vods.map(vod => (
                      <div key={vod.id} className="bg-[#18181b] rounded-xl overflow-hidden border border-white/5 hover:border-purple-500/50 transition-all cursor-pointer group">
                        <div className="relative">
                          <img src={vod.thumbnailUrl} alt={vod.title} className="w-full aspect-video object-cover" />
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
                            {vod.duration}
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play size={40} className="text-white" />
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="text-white font-bold text-sm mb-2 line-clamp-2">{vod.title}</h4>
                          <div className="flex items-center gap-3 text-xs text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Eye size={12} />
                              {vod.viewCount.toLocaleString()}
                            </span>
                            <span>{vod.createdAt}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'clips' && (
                <motion.div
                  key="clips"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 md:p-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                    {clips.map(clip => (
                      <div key={clip.id} className="bg-[#18181b] rounded-xl overflow-hidden border border-white/5 hover:border-purple-500/50 transition-all cursor-pointer group">
                        <div className="relative">
                          <img src={clip.thumbnailUrl} alt={clip.title} className="w-full aspect-video object-cover" />
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-bold px-2 py-1 rounded">
                            {clip.duration}s
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play size={40} className="text-white" />
                          </div>
                        </div>
                        <div className="p-4">
                          <h4 className="text-white font-bold text-sm mb-2 line-clamp-2">{clip.title}</h4>
                          <div className="flex items-center justify-between text-xs text-zinc-400">
                            <span className="text-purple-400 font-bold">Clipped by {clip.creator}</span>
                            <span className="flex items-center gap-1">
                              <Eye size={12} />
                              {clip.viewCount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Chat Sidebar - full overlay on mobile, side panel on desktop */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-0 md:static md:inset-auto md:w-[340px] border-l border-white/5 bg-[#18181b] flex flex-col overflow-hidden z-50 md:z-auto"
            >
              {/* Chat Header */}
              <div className="h-12 border-b border-white/5 flex items-center justify-between px-4 shrink-0">
                <span className="text-xs font-black text-white uppercase tracking-widest">Stream Chat</span>
                <div className="flex items-center gap-2">
                  <button className="text-zinc-400 hover:text-white">
                    <Settings size={16} />
                  </button>
                  <button onClick={() => setShowChat(false)} className="md:hidden text-zinc-400 hover:text-white p-1">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                {chatMessages.map(msg => (
                  <div key={msg.id} className="group">
                    <div className="flex items-start gap-2">
                      <div className="flex items-center gap-1 shrink-0">
                        {msg.badges.map((badge, i) => (
                          <div key={i}>{getBadgeIcon(badge)}</div>
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span 
                          className="font-bold text-sm mr-2" 
                          style={{ color: msg.color }}
                        >
                          {msg.displayName}
                        </span>
                        <span className="text-zinc-300 text-sm break-words">{msg.message}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-white/5 shrink-0">
                <div className="bg-[#0e0e10] rounded-xl flex items-center p-2 border border-white/10 focus-within:border-purple-500/50 transition-all">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Send a message..."
                    className="flex-1 bg-transparent text-sm text-white px-2 focus:outline-none placeholder-zinc-600"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim()}
                    className="bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white p-2 rounded-lg transition-colors"
                  >
                    <Send size={16} />
                  </button>
                </div>
                <p className="text-[10px] text-zinc-600 mt-2 text-center font-medium">
                  Connect Twitch account to chat
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
