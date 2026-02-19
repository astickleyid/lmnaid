import { ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  handle: string;
  bio: string;
  following: number;
  followers: number;
  avatarUrl: string;
  bannerUrl: string;
  isVerified?: boolean;
  isAdmin?: boolean;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  image?: string;
}

export enum TabOption {
  STAND = 'Lemon Hub', // Renamed string value for UI consistency
  POSTS = 'Posts',
  LIKES = 'Likes',
  MEDIA = 'Media',
  SERVERS = 'Servers'
}

export interface ServerFeatures {
    aiEnabled: boolean;
    communityEnabled: boolean;
    lemonHubLinked: boolean;
}

export interface Server {
  id: string;
  name: string;
  iconUrl?: string;
  customIconId?: string;
  channels: Channel[];
  features: ServerFeatures; // Added features config
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'dm' | 'system' | 'app';
  // Expanded app types for the new marketplace
  appType?: 'code' | 'board' | 'ai' | 'whiteboard' | 'workflow' | 'game' | 'store' | 'calendar' | 'music' | 'file' | 'learning' | 'social' | 'twitch';
  unread?: number;
  avatar?: string;
  status?: 'online' | 'offline' | 'idle' | 'dnd';
  // Twitch-specific fields
  twitchChannel?: string;
  twitchUserId?: string;
  isLive?: boolean;
  viewerCount?: number;
  streamTitle?: string;
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // user IDs
  count: number;
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'file' | 'audio';
  mime: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface TaskCard {
  title: string;
  status: 'todo' | 'in-progress' | 'done' | 'blocked';
  progress?: number; // 0-100
  assignee?: string;
  labels?: string[];
  dueDate?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  isAi?: boolean;
  // Thread support
  threadId?: string;        // parent message ID if this is a reply
  threadCount?: number;     // number of replies (on parent)
  threadLastReply?: string; // timestamp of last reply
  threadParticipants?: string[]; // avatar URLs of thread participants
  // Message actions
  edited?: boolean;
  editedAt?: string;
  pinned?: boolean;
  pinnedBy?: string;
  starred?: boolean;
  bookmarked?: boolean;
  reactions?: MessageReaction[];
  // Rich content
  attachments?: MessageAttachment[];
  mentions?: string[];      // user IDs mentioned
  isCodeBlock?: boolean;
  codeLanguage?: string;
  linkPreviews?: { url: string; title: string; description: string; image?: string }[];
  // Agent features
  agentStatus?: 'online' | 'working' | 'idle' | 'error';
  taskCard?: TaskCard;
  isLogStream?: boolean;
  logCollapsed?: boolean;
  isCommand?: boolean;
  commandName?: string;
}

export type AgentStatus = 'online' | 'working' | 'idle' | 'error' | 'offline';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
}

export interface ApiKey {
  id: string;
  prefix: string;
  name: string;
  scopes: string[];
  lastUsed: string;
  created: string;
}

export interface MCPServerConfig {
  id: string;
  name: string;
  endpoint: string;
  transport: 'sse' | 'stdio';
  status: 'active' | 'inactive' | 'error';
  env?: Record<string, string>;
}

export interface UiComponent {
  id: string;
  type: 'button' | 'input' | 'text' | 'image' | 'row' | 'card' | 'select' | 'toggle' | 'avatar' | 'badge' | 'chart' | 'table' | 'stat-card' | 'video' | 'map' | 'code' | 'alert' | 'divider' | 'tabs' | 'progress';
  props: Record<string, any>;
  layout?: { x: number; y: number; w: number; h: number }; 
  events?: Record<string, string>; // e.g. { onClick: 'submitForm' }
  dataBinding?: string; // e.g., "{{api.users.count}}"
  children?: UiComponent[];
}

export interface DevApp {
  id: string;
  name: string;
  icon?: string;
  description: string;
  appId: string;
  publicKey: string;
  clientId: string;
  clientSecret: string;
  botToken: string;
  interactionsEndpoint?: string;
  verificationToken?: string;
  isPublic: boolean;
  ownerId: string;
  created: string;
  webhooks?: Webhook[];
  apiKeys?: ApiKey[];
  mcpServers?: MCPServerConfig[];
  uiLayout?: UiComponent[];
}

export interface TrendingTopic {
  id: string;
  category: string;
  tag: string;
  postsCount: string;
}

export interface SuggestedUser {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  reason: string;
  features?: { lemonHubLinked: boolean };
}

export type IconStyle = 'standard' | 'thin' | 'bold' | 'glow' | 'outline' | 'cyber' | 'glass' | 'gradient' | 'gaming';

export interface ThemeConfig {
  primaryColor: string; // CSS RGB value e.g. "124 58 237"
  backgroundColor: string;
  surfaceColor: string;
  iconStyle: IconStyle;
  presetName: string;
}

export interface HeaderConfig {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  variant?: 'default' | 'transparent' | 'glass' | 'solid';
  actionIcon?: ReactNode;
  onAction?: () => void;
}

// Lemon Hub Types
export type StandItemType = 'lobby' | 'service' | 'project' | 'stack';

export interface StandItem {
    id: string;
    type: StandItemType;
    title: string;
    description?: string;
    image?: string;
    meta: {
        price?: string;
        rank?: string;
        slots?: string;
        language?: string;
        stars?: number;
    };
    status: 'active' | 'closed' | 'open';
}
