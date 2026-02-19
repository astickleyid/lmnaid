import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, MoreHorizontal, Image as ImageIcon, Search, TrendingUp, Loader2, BadgeCheck, Globe, Users, LogIn, Diamond, Store, LayoutGrid, Check, Citrus } from 'lucide-react';
import { User, Post, TabOption, TrendingTopic, SuggestedUser, HeaderConfig } from '../types';
import { PostCard } from './PostCard';
import { LemonadeStand } from './Nexus'; 

interface ProfileViewProps {
    user: User;
    posts: Post[];
    activeTab: TabOption;
    setActiveTab: (tab: TabOption) => void;
    onEditProfile: () => void;
    onCreatePost: () => void;
    onToggleMobileNav: () => void;
    onLoadMore: () => Promise<void>;
    setHeader: (config: HeaderConfig) => void;
}

const MOCK_TRENDING: TrendingTopic[] = [
    { id: '1', category: 'Technology', tag: '#OpenAI', postsCount: '24.5k' },
    { id: '2', category: 'Gaming', tag: 'Starfield', postsCount: '18.2k' },
    { id: '3', category: 'Development', tag: '#ReactJS', postsCount: '12.1k' },
];

const MOCK_SUGGESTIONS: SuggestedUser[] = [
    { id: 's1', name: 'Vercel', handle: '@vercel', avatarUrl: 'https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png', reason: 'Popular' },
    { id: 's2', name: 'OpenAI', handle: '@openai', avatarUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/OpenAI_Logo.svg/1024px-OpenAI_Logo.svg.png', reason: 'Trending' },
];

export const ProfileView: React.FC<ProfileViewProps> = ({ 
    user, 
    posts, 
    activeTab, 
    setActiveTab, 
    onEditProfile, 
    onCreatePost, 
    onToggleMobileNav,
    onLoadMore,
    setHeader
}) => {
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [isEditingStand, setIsEditingStand] = useState(false);
    const observerTarget = useRef<HTMLDivElement>(null);

    // Default to Stand tab if not already set
    useEffect(() => {
        if (activeTab === TabOption.POSTS && !posts.length) {
             // Optional logic
        }
    }, []);

    // Reset editing state when changing tabs
    useEffect(() => {
        if (activeTab !== TabOption.STAND) {
            setIsEditingStand(false);
        }
    }, [activeTab]);

    useEffect(() => {
        setHeader({
            title: user.name,
            subtitle: user.handle,
            variant: 'default',
            showSearch: false
        });
    }, [user, setHeader]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !isLoadingMore && activeTab === TabOption.POSTS && posts.length > 0) {
                    setIsLoadingMore(true);
                    onLoadMore().finally(() => {
                        setIsLoadingMore(false);
                    });
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [observerTarget, isLoadingMore, activeTab, posts.length, onLoadMore]);

    return (
        <div className="h-full overflow-y-auto bg-black custom-scrollbar scroll-smooth scroll-smooth-ios view-transition">
            <div className="min-h-[calc(100dvh-48px)] pb-24 md:pb-10">
                {/* Profile Banner */}
                <div className="relative w-full h-36 sm:h-52 md:h-64 bg-zinc-900 group overflow-hidden">
                    {user.bannerUrl ? (
                        <img 
                            src={user.bannerUrl} 
                            alt="Profile Banner" 
                            className="w-full h-full object-cover object-center opacity-80"
                            loading="eager"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-violet-900 to-indigo-900" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                </div>

                {/* Content Container */}
                <div className="w-full max-w-7xl mx-auto px-4 md:px-6 flex flex-col lg:flex-row gap-8">
                    
                    {/* Main Feed Column */}
                    <div className="flex-1 min-w-0">
                        {/* Profile Header Info */}
                        <div className="relative -mt-12 sm:-mt-16 md:-mt-20 mb-4 md:mb-6 flex flex-col md:flex-row items-center md:items-end justify-between z-20">
                            <div className="flex flex-col md:flex-row items-center md:items-end gap-3 md:gap-5 w-full md:w-auto">
                                {/* Avatar */}
                                <div className="relative group cursor-pointer shrink-0" onClick={onEditProfile}>
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full border-4 md:border-[6px] border-black bg-zinc-800 overflow-hidden relative z-10 shadow-xl">
                                        {user.avatarUrl ? (
                                            <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-3xl text-zinc-500">
                                                {user.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute bottom-1 right-1 bg-zinc-800 rounded-full p-2 border-4 border-black z-20 hover:bg-zinc-700 transition-colors">
                                        <Pencil size={14} className="text-white" />
                                    </div>
                                </div>

                                {/* Names */}
                                <div className="mb-2 text-center md:text-left">
                                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center justify-center md:justify-start gap-1">
                                        {user.name} 
                                        {user.isVerified && <BadgeCheck size={20} className="text-blue-500 fill-blue-500/10 ml-1" />}
                                    </h2>
                                    <p className="text-zinc-400 font-medium text-base">{user.handle}</p>
                                </div>
                            </div>

                            {/* Action Buttons - Dynamic based on Tab */}
                            <div className="flex items-center gap-2 sm:gap-3 mt-4 md:mt-0 mb-3 w-full md:w-auto justify-center md:justify-end">
                                <button 
                                    onClick={onCreatePost}
                                    className="bg-white text-black hover:bg-zinc-200 px-4 py-2 sm:py-1.5 rounded-full font-bold text-sm transition-colors haptic touch-target"
                                >
                                    Create Post
                                </button>
                                
                                {activeTab === TabOption.STAND ? (
                                    <button 
                                        onClick={() => setIsEditingStand(!isEditingStand)}
                                        className={`px-4 py-2 sm:py-1.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 border haptic touch-target
                                            ${isEditingStand 
                                                ? 'bg-green-500 text-black border-green-500 hover:bg-green-400' 
                                                : 'bg-transparent text-white border-zinc-600 hover:bg-zinc-900'
                                            }
                                        `}
                                    >
                                        {isEditingStand ? <Check size={14} /> : <Citrus size={14} />}
                                        {isEditingStand ? 'Save Hub' : 'Manage Hub'}
                                    </button>
                                ) : (
                                    <button 
                                        onClick={onEditProfile}
                                        className="bg-transparent border border-zinc-600 text-white hover:bg-zinc-900 px-4 py-2 sm:py-1.5 rounded-full font-bold text-sm transition-colors haptic touch-target"
                                    >
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Bio & Stats */}
                        <div className="w-full mb-6 pr-0 lg:pr-10">
                            <p className="text-zinc-300 text-sm leading-relaxed mb-4 whitespace-pre-line max-w-2xl">
                                {user.bio}
                            </p>
                            
                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                                <span className="hover:text-white cursor-pointer hover:underline decoration-white">
                                    <strong className="text-white">{user.following}</strong> Following
                                </span>
                                <span className="hover:text-white cursor-pointer hover:underline decoration-white">
                                    <strong className="text-white">{user.followers}</strong> Followers
                                </span>
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="border-b border-zinc-800 mb-4 sticky top-0 bg-black/95 backdrop-blur-xl z-30 pt-2 px-1">
                            <div className="flex items-center gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
                                {/* Special "Lemon Hub" Tab */}
                                <button
                                    onClick={() => setActiveTab(TabOption.STAND)}
                                    className={`
                                        pb-3 transition-colors relative flex items-center justify-center px-2
                                        ${activeTab === TabOption.STAND ? 'opacity-100 scale-110' : 'opacity-40 hover:opacity-70 grayscale hover:grayscale-0'}
                                    `}
                                    title="Lemon Hub"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.25)]">
                                        <LayoutGrid size={18} className="text-yellow-300" />
                                    </div>
                                    
                                    {activeTab === TabOption.STAND && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-yellow-400 rounded-t-full shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                                    )}
                                </button>

                                {Object.values(TabOption).filter(t => t !== TabOption.STAND).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`
                                            pb-3 text-sm font-bold transition-colors relative whitespace-nowrap
                                            ${activeTab === tab ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}
                                        `}
                                    >
                                        {tab}
                                        {activeTab === tab && (
                                            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white rounded-t-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Feed / Content Area */}
                        <div className="min-h-[200px] animate-fade-in pb-10">
                            {activeTab === TabOption.STAND && (
                                <LemonadeStand 
                                    user={user} 
                                    isOwnProfile={true} 
                                    isEditing={isEditingStand}
                                />
                            )}

                            {activeTab === TabOption.POSTS && (
                                <div className="space-y-0">
                                    {posts.length === 0 ? (
                                        <div className="text-center py-12 text-zinc-500">
                                            <p>No posts yet.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {posts.map(post => (
                                                <div key={post.id} className="border-b border-zinc-800 py-4 first:pt-0">
                                                    <PostCard post={post} currentUser={user} />
                                                </div>
                                            ))}
                                            
                                            <div ref={observerTarget} className="h-20 flex items-center justify-center p-4">
                                                {isLoadingMore && (
                                                    <Loader2 size={24} className="animate-spin text-primary" />
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            
                            {activeTab === TabOption.LIKES && (
                                <div className="text-center py-20 text-zinc-500 text-sm font-bold">
                                    @username hasn't liked any posts yet
                                </div>
                            )}

                            {activeTab === TabOption.MEDIA && (
                                <div className="grid grid-cols-3 gap-1">
                                    {[1,2,3,4,5,6].map(i => (
                                        <div key={i} className="aspect-square bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer flex items-center justify-center">
                                            <ImageIcon size={24} className="text-zinc-700" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Sidebar (Desktop) */}
                    <div className="hidden lg:block w-80 shrink-0 space-y-4 pt-4">
                         {/* Search */}
                         <div className="bg-[#202327] rounded-full px-4 py-2.5 flex items-center gap-3 focus-within:ring-1 focus-within:ring-primary focus-within:bg-black border border-transparent focus-within:border-primary">
                             <Search size={18} className="text-zinc-500" />
                             <input type="text" placeholder="Search" className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-zinc-500" />
                         </div>

                         {/* Trends */}
                         <div className="bg-[#16181c] rounded-2xl overflow-hidden border border-zinc-800">
                             <div className="p-3 px-4 font-black text-white text-lg">What's happening</div>
                             <div className="">
                                 {MOCK_TRENDING.map(topic => (
                                     <div key={topic.id} className="px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors">
                                         <div className="flex justify-between text-xs text-zinc-500 mb-0.5">
                                             <span>{topic.category} · Trending</span>
                                             <MoreHorizontal size={14} />
                                         </div>
                                         <div className="font-bold text-white text-sm mb-0.5">{topic.tag}</div>
                                         <div className="text-xs text-zinc-500">{topic.postsCount} posts</div>
                                     </div>
                                 ))}
                             </div>
                             <div className="p-4 text-primary text-sm font-medium hover:bg-white/5 cursor-pointer transition-colors">Show more</div>
                         </div>

                         {/* Who to follow */}
                         <div className="bg-[#16181c] rounded-2xl overflow-hidden border border-zinc-800">
                             <div className="p-3 px-4 font-black text-white text-lg">Who to follow</div>
                             <div className="">
                                 {MOCK_SUGGESTIONS.map(suggestion => (
                                     <div key={suggestion.id} className="px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors flex items-center gap-3">
                                         <img src={suggestion.avatarUrl} alt="" className="w-10 h-10 rounded-full bg-white" />
                                         <div className="flex-1 min-w-0">
                                             <div className="font-bold text-white text-sm truncate hover:underline">{suggestion.name}</div>
                                             <div className="text-zinc-500 text-sm truncate">{suggestion.handle}</div>
                                         </div>
                                         <button className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold hover:bg-zinc-200 transition-colors">
                                             Follow
                                         </button>
                                     </div>
                                 ))}
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};