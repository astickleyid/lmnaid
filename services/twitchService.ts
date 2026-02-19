// Twitch Service - stub implementation

export interface TwitchChatMessage {
  id: string;
  username: string;
  displayName: string;
  message: string;
  color: string;
  badges: string[];
  timestamp: number;
  emotes: Array<{ id: string; positions: string }>;
}

export interface TwitchVOD {
  id: string;
  title: string;
  duration: string;
  views: number;
  createdAt: string;
  thumbnailUrl: string;
  url: string;
}

export interface TwitchClip {
  id: string;
  title: string;
  creator: string;
  views: number;
  duration: number;
  thumbnailUrl: string;
  url: string;
  createdAt: string;
}

export async function getStreamData(_channel: string) {
  return {
    isLive: false,
    title: 'Offline',
    viewerCount: 0,
    startedAt: null,
    gameName: '',
    thumbnailUrl: '',
  };
}

export async function getChatMessages(_channel: string): Promise<TwitchChatMessage[]> {
  return [];
}

export async function getVODs(_channel: string): Promise<TwitchVOD[]> {
  return [];
}

export async function getClips(_channel: string): Promise<TwitchClip[]> {
  return [];
}

export async function sendChatMessage(_channel: string, _message: string): Promise<boolean> {
  console.warn('Twitch chat not connected');
  return false;
}

export function getTwitchEmbedUrl(channel: string, type: 'stream' | 'chat' = 'stream'): string {
  const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  if (type === 'chat') {
    return `https://www.twitch.tv/embed/${channel}/chat?parent=${parent}&darkpopout`;
  }
  return `https://player.twitch.tv/?channel=${channel}&parent=${parent}`;
}
