import { create } from 'zustand';
import { Message } from '../../types';

interface ChatState {
  // Messages per channel
  messages: Record<string, Message[]>;
  // UI state
  editingMessageId: string | null;
  replyingTo: Message | null;
  activeThreadId: string | null;
  searchQuery: string;
  searchOpen: boolean;
  commandPaletteOpen: boolean;
  mentionQuery: string | null;
  pinnedPanelOpen: boolean;
  starredMessages: Set<string>;
  bookmarkedMessages: Set<string>;
  typingUsers: Record<string, string[]>; // channelId -> usernames
  // Actions
  addMessage: (channelId: string, message: Message) => void;
  updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (channelId: string, messageId: string) => void;
  setEditingMessage: (id: string | null) => void;
  setReplyingTo: (msg: Message | null) => void;
  setActiveThread: (id: string | null) => void;
  toggleReaction: (channelId: string, messageId: string, emoji: string, userId: string) => void;
  togglePin: (channelId: string, messageId: string, userId: string) => void;
  toggleStar: (messageId: string) => void;
  toggleBookmark: (messageId: string) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setMentionQuery: (q: string | null) => void;
  setPinnedPanelOpen: (open: boolean) => void;
  setTypingUsers: (channelId: string, users: string[]) => void;
  getThreadMessages: (channelId: string, parentId: string) => Message[];
  getFilteredMessages: (channelId: string) => Message[];
  getPinnedMessages: (channelId: string) => Message[];
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: {},
  editingMessageId: null,
  replyingTo: null,
  activeThreadId: null,
  searchQuery: '',
  searchOpen: false,
  commandPaletteOpen: false,
  mentionQuery: null,
  pinnedPanelOpen: false,
  starredMessages: new Set(),
  bookmarkedMessages: new Set(),
  typingUsers: {},

  addMessage: (channelId, message) => set(state => {
    const channelMsgs = [...(state.messages[channelId] || []), message];
    // If replying to a thread, update parent's threadCount
    if (message.threadId) {
      const parentIdx = channelMsgs.findIndex(m => m.id === message.threadId);
      if (parentIdx >= 0) {
        const parent = { ...channelMsgs[parentIdx] };
        parent.threadCount = (parent.threadCount || 0) + 1;
        parent.threadLastReply = message.timestamp;
        const participants = new Set(parent.threadParticipants || []);
        participants.add(message.senderAvatar);
        parent.threadParticipants = Array.from(participants).slice(0, 5);
        channelMsgs[parentIdx] = parent;
      }
    }
    return { messages: { ...state.messages, [channelId]: channelMsgs } };
  }),

  updateMessage: (channelId, messageId, updates) => set(state => ({
    messages: {
      ...state.messages,
      [channelId]: (state.messages[channelId] || []).map(m =>
        m.id === messageId ? { ...m, ...updates } : m
      )
    }
  })),

  deleteMessage: (channelId, messageId) => set(state => ({
    messages: {
      ...state.messages,
      [channelId]: (state.messages[channelId] || []).filter(m => m.id !== messageId)
    }
  })),

  setEditingMessage: (id) => set({ editingMessageId: id }),
  setReplyingTo: (msg) => set({ replyingTo: msg }),
  setActiveThread: (id) => set({ activeThreadId: id }),
  setSearchOpen: (open) => set({ searchOpen: open, searchQuery: open ? '' : '' }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setMentionQuery: (q) => set({ mentionQuery: q }),
  setPinnedPanelOpen: (open) => set({ pinnedPanelOpen: open }),
  setTypingUsers: (channelId, users) => set(state => ({
    typingUsers: { ...state.typingUsers, [channelId]: users }
  })),

  toggleReaction: (channelId, messageId, emoji, userId) => set(state => {
    const msgs = (state.messages[channelId] || []).map(m => {
      if (m.id !== messageId) return m;
      const reactions = [...(m.reactions || [])];
      const idx = reactions.findIndex(r => r.emoji === emoji);
      if (idx >= 0) {
        const r = { ...reactions[idx] };
        if (r.users.includes(userId)) {
          r.users = r.users.filter(u => u !== userId);
          r.count--;
          if (r.count <= 0) reactions.splice(idx, 1);
          else reactions[idx] = r;
        } else {
          r.users = [...r.users, userId];
          r.count++;
          reactions[idx] = r;
        }
      } else {
        reactions.push({ emoji, users: [userId], count: 1 });
      }
      return { ...m, reactions };
    });
    return { messages: { ...state.messages, [channelId]: msgs } };
  }),

  togglePin: (channelId, messageId, userId) => set(state => ({
    messages: {
      ...state.messages,
      [channelId]: (state.messages[channelId] || []).map(m =>
        m.id === messageId ? { ...m, pinned: !m.pinned, pinnedBy: !m.pinned ? userId : undefined } : m
      )
    }
  })),

  toggleStar: (messageId) => set(state => {
    const s = new Set(state.starredMessages);
    s.has(messageId) ? s.delete(messageId) : s.add(messageId);
    return { starredMessages: s };
  }),

  toggleBookmark: (messageId) => set(state => {
    const b = new Set(state.bookmarkedMessages);
    b.has(messageId) ? b.delete(messageId) : b.add(messageId);
    return { bookmarkedMessages: b };
  }),

  getThreadMessages: (channelId, parentId) => {
    return (get().messages[channelId] || []).filter(m => m.threadId === parentId);
  },

  getFilteredMessages: (channelId) => {
    const { messages, searchQuery } = get();
    const msgs = messages[channelId] || [];
    if (!searchQuery) return msgs.filter(m => !m.threadId); // main messages only
    const q = searchQuery.toLowerCase();
    return msgs.filter(m => 
      m.content.toLowerCase().includes(q) || 
      m.senderName.toLowerCase().includes(q)
    );
  },

  getPinnedMessages: (channelId) => {
    return (get().messages[channelId] || []).filter(m => m.pinned);
  },
}));
