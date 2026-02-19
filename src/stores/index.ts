import { create } from 'zustand';
import { User, Post, Server, Channel, TabOption } from '../../types';

// ── User Store ──
interface UserState {
  user: User;
  updateUser: (user: User) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: {
    id: 'user-1',
    name: 'You',
    handle: '@you',
    bio: 'Welcome to nXcor Command Center',
    following: 128,
    followers: 64,
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nxcor',
    bannerUrl: 'https://picsum.photos/seed/banner/1200/400',
    isVerified: true,
    isAdmin: true,
  },
  updateUser: (user) => set({ user }),
}));

// ── Server Store ──
interface ServerState {
  servers: Server[];
  dmServer: Server;
  activeServerId: string | null;
  setActiveServer: (id: string | null) => void;
  addServer: (server: Server) => void;
}

const defaultDmServer: Server = {
  id: 'dm-home',
  name: 'Direct Messages',
  channels: [
    { id: 'dm-1', name: 'Agent Alpha', type: 'dm', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=alpha', status: 'online' },
    { id: 'dm-2', name: 'Agent Beta', type: 'dm', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=beta', status: 'idle' },
  ],
  features: { aiEnabled: false, communityEnabled: false, lemonHubLinked: false },
};

const defaultServers: Server[] = [
  {
    id: 'server-hq',
    name: 'Command HQ',
    iconUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=hq',
    channels: [
      { id: 'ch-general', name: 'general', type: 'text' },
      { id: 'ch-voice', name: 'voice-lounge', type: 'voice' },
      { id: 'ch-ai', name: 'Fresh Squeeze AI', type: 'app', appType: 'ai' },
    ],
    features: { aiEnabled: true, communityEnabled: true, lemonHubLinked: false },
  },
];

export const useServerStore = create<ServerState>((set) => ({
  servers: defaultServers,
  dmServer: defaultDmServer,
  activeServerId: null,
  setActiveServer: (id) => set({ activeServerId: id }),
  addServer: (server) => set((state) => ({ servers: [...state.servers, server] })),
}));

// ── Post Store ──
interface PostState {
  posts: Post[];
  isLoadingMore: boolean;
  addPost: (post: Post) => void;
  loadMorePosts: (newPosts: Post[]) => void;
  setLoadingMore: (loading: boolean) => void;
}

export const usePostStore = create<PostState>((set) => ({
  posts: [
    {
      id: 'post-1',
      author: {
        id: 'user-1',
        name: 'You',
        handle: '@you',
        bio: '',
        following: 0,
        followers: 0,
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nxcor',
        bannerUrl: '',
      },
      content: '🚀 nXcor Command Center is online. Multi-agent coordination starts now.',
      timestamp: 'Just now',
      likes: 12,
      comments: 3,
    },
  ],
  isLoadingMore: false,
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
  loadMorePosts: (newPosts) => set((state) => ({ posts: [...state.posts, ...newPosts] })),
  setLoadingMore: (loading) => set({ isLoadingMore: loading }),
}));

// ── UI Store ──
type ViewType = 'profile' | 'server' | 'dm' | 'explore' | 'dev-console';

interface UIState {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  activeTab: TabOption;
  setActiveTab: (tab: TabOption) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeView: 'profile',
  setActiveView: (view) => set({ activeView: view }),
  activeTab: TabOption.STAND,
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
