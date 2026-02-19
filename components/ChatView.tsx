import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Hash, Volume2, Search, Bell, Pin, Users, HelpCircle, Send, Plus, 
  Gift, Smile, Mic, Phone, PhoneOff, Video, Monitor, MicOff, 
  User as UserIcon, Headphones, Settings, Code, Layout, Bot, 
  Menu, X, Zap, MoreVertical, Sticker, Sparkles, BrainCircuit, 
  Image as ImageIcon, Film, StopCircle, PlayCircle, BarChart3,
  Check, ArrowRight, ShieldCheck, Crown, Edit2, Trash, Reply,
  Bookmark, Star, Download, ArrowUp, Paperclip, Command, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Message, User, Channel, HeaderConfig } from '../types';
import { getChatResponse, analyzeMedia, transcribeAudio, generateSpeech, getLiveClient } from '../services/geminiService';
import { AppView } from './AppView';
import { useNotification } from './NotificationSystem';
import { Modality, LiveServerMessage } from "@google/genai";
import {
  useChatStore, MessageBubble, ThreadPanel, SearchPanel,
  CommandPalette, MentionAutocomplete, PinnedPanel
} from './chat';

interface ChatViewProps {
  currentUser: User;
  server: Server;
  customContent?: React.ReactNode; 
  isMobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  onOpenIntegrations?: () => void;
  onCreateChannel?: (name: string, type: 'text' | 'voice') => void;
  onOpenGoLive?: () => void;
  setHeader: (config: HeaderConfig) => void;
}

// Mock Members Data
const MOCK_MEMBERS = [
    { id: 'ai', name: 'GemBot', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gemini', role: 'AI SYSTEM', status: 'online', color: '#A855F7', isBot: true, activity: 'Processing queries' },
    { id: 'u1', name: 'nexus_admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin', role: 'OPERATORS', status: 'dnd', color: '#EF4444', activity: 'Visual Studio Code' },
    { id: 'u2', name: 'design_guru', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', role: 'ONLINE', status: 'idle', color: '#F59E0B', activity: 'Figma' },
    { id: 'u3', name: 'code_wizard', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Code', role: 'ONLINE', status: 'online', color: '#10B981' },
    { id: 'u4', name: 'newbie_dev', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=New', role: 'OFFLINE', status: 'offline', color: '#71717A' },
    { id: 'u5', name: 'lurker_99', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lurk', role: 'OFFLINE', status: 'offline', color: '#71717A' },
];

// --- Audio Utilities for Live API ---
function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000, numChannels: number = 1): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export const ChatView: React.FC<ChatViewProps> = ({ 
    currentUser, server, customContent, isMobileNavOpen, onToggleMobileNav, 
    onOpenIntegrations, onCreateChannel, onOpenGoLive, setHeader 
}) => {
  const { addNotification } = useNotification();
  const [activeChannelId, setActiveChannelId] = useState<string>(server.channels[0]?.id || 'general');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMemberList, setShowMemberList] = useState(true);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [attachment, setAttachment] = useState<{data: string, type: 'image' | 'video', mime: string} | null>(null);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState<'text' | 'voice' | null>(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Chat store
  const {
    messages, addMessage, searchOpen, setSearchOpen, commandPaletteOpen, setCommandPaletteOpen,
    pinnedPanelOpen, setPinnedPanelOpen, replyingTo, setReplyingTo, activeThreadId, setActiveThread,
    getFilteredMessages, mentionQuery, setMentionQuery, typingUsers, editingMessageId, setEditingMessage
  } = useChatStore();

  // Thread state
  const [threadParentMessage, setThreadParentMessage] = useState<Message | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Live API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const isConnectedRef = useRef<boolean>(false);

  const activeChannel = server.channels.find(c => c.id === activeChannelId) || server.channels[0];
  const channelMessages = getFilteredMessages(activeChannelId);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+K / Ctrl+K -> search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(!searchOpen); }
      // Cmd+Shift+P -> command palette
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') { e.preventDefault(); setCommandPaletteOpen(!commandPaletteOpen); }
      // Escape -> close overlays
      if (e.key === 'Escape') {
        if (searchOpen) setSearchOpen(false);
        if (commandPaletteOpen) setCommandPaletteOpen(false);
        if (pinnedPanelOpen) setPinnedPanelOpen(false);
        if (replyingTo) setReplyingTo(null);
        if (editingMessageId) setEditingMessage(null);
      }
      // Up arrow in empty input -> edit last own message
      if (e.key === 'ArrowUp' && inputRef.current === document.activeElement && !inputText) {
        const myMsgs = (messages[activeChannelId] || []).filter(m => m.senderId === currentUser.id && !m.threadId);
        if (myMsgs.length > 0) {
          e.preventDefault();
          const last = myMsgs[myMsgs.length - 1];
          setEditingMessage(last.id);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen, commandPaletteOpen, inputText, activeChannelId, messages, pinnedPanelOpen, replyingTo, editingMessageId]);

  // --- Command definitions ---
  const commands = [
    { id: 'search', name: 'Search Messages', description: 'Search across all messages', icon: <Search size={16} />, category: 'Navigation', action: () => setSearchOpen(true) },
    { id: 'pins', name: 'View Pinned Messages', description: 'Show all pinned messages', icon: <Pin size={16} />, category: 'Navigation', action: () => setPinnedPanelOpen(true) },
    { id: 'export', name: 'Export Chat History', description: 'Download chat as JSON', icon: <Download size={16} />, category: 'Tools', action: () => exportChat() },
    { id: 'clear', name: 'Clear Chat', description: 'Clear all messages in channel', icon: <Trash size={16} />, category: 'Danger', action: () => {} },
    { id: 'thinking', name: 'Toggle AI Thinking', description: 'Enable deep thinking mode', icon: <BrainCircuit size={16} />, category: 'AI', action: () => setIsThinkingMode(!isThinkingMode) },
  ];

  const exportChat = () => {
    const data = JSON.stringify(messages[activeChannelId] || [], null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `chat-${activeChannelId}-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const channelName = activeChannel?.type === 'dm' ? `@${activeChannel.name}` : `# ${activeChannel?.name}`;
    setHeader({
      title: channelName,
      subtitle: server.id === 'dm-home' ? 'Direct Messages' : server.name,
      variant: 'solid',
      showSearch: true,
      actionIcon: <Users size={20} className={showMemberList ? 'text-white' : 'text-zinc-400'} />,
      onAction: () => setShowMemberList(prev => !prev)
    });
  }, [activeChannelId, server, setHeader, showMemberList, activeChannel]);

  useEffect(() => { return () => { disconnectLiveSession(); }; }, [activeChannelId]);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  useEffect(() => {
    if (activeChannel?.type === 'text' || activeChannel?.type === 'dm') scrollToBottom();
  }, [messages, activeChannelId, attachment]);

  // --- Drag & Drop ---
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  // --- Clipboard paste ---
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processFile(file);
        break;
      }
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const type = file.type.startsWith('image') ? 'image' as const : 'video' as const;
      setAttachment({ data: reader.result as string, type, mime: file.type });
    };
    reader.readAsDataURL(file);
  };

  // --- Voice Message Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const msg: Message = {
            id: Date.now().toString(),
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderAvatar: currentUser.avatarUrl,
            content: '🎤 Voice Message',
            timestamp: 'Today at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            attachments: [{ id: Date.now().toString(), name: 'voice.webm', url: reader.result as string, type: 'audio', mime: 'audio/webm' }],
          };
          addMessage(activeChannelId, msg);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecordingVoice(true);
    } catch { addNotification('error', 'Mic Error', 'Could not access microphone'); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecordingVoice(false);
  };

  // --- Mention detection in input ---
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    // Detect @mention
    const mentionMatch = val.match(/@(\w*)$/);
    setMentionQuery(mentionMatch ? mentionMatch[1] : null);
    // Detect /command
    if (val === '/') setCommandPaletteOpen(true);
  };

  const handleMentionSelect = (member: { id: string; name: string }) => {
    const newText = inputText.replace(/@\w*$/, `@${member.name} `);
    setInputText(newText);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  // --- Gemini Live API ---
  const connectLiveSession = async () => {
    try {
      if (isConnectedRef.current) return;
      addNotification('magic', 'Connecting...', 'Establishing neural voice link.');
      const ai = getLiveClient();
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      nextStartTimeRef.current = audioContextRef.current.currentTime;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true }});
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: "You are GemBot, a witty and helpful AI assistant in a voice chat. Keep responses concise and conversational.",
        },
        callbacks: {
          onopen: () => {
            isConnectedRef.current = true;
            setSessionActive(true); setIsVoiceConnected(true);
            addNotification('success', 'Voice Active', 'Connected to Gemini Live.');
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            inputAudioContextRef.current = ctx;
            const source = ctx.createMediaStreamSource(stream);
            const processor = ctx.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              if (isMuted || !isConnectedRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const buffer = new ArrayBuffer(inputData.length * 2);
              const view = new DataView(buffer);
              floatTo16BitPCM(view, 0, inputData);
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(buffer)));
              sessionPromise.then(session => {
                if (isConnectedRef.current) session.sendRealtimeInput({ media: { mimeType: "audio/pcm;rate=16000", data: base64Data } });
              });
            };
            source.connect(processor); processor.connect(ctx.destination);
            inputSourceRef.current = source; processorRef.current = processor;
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && audioContextRef.current && isConnectedRef.current) {
              setAiSpeaking(true);
              const bytes = base64ToUint8Array(audioData);
              const audioBuffer = await decodeAudioData(bytes, audioContextRef.current);
              const source = audioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContextRef.current.destination);
              const currentTime = audioContextRef.current.currentTime;
              if (nextStartTimeRef.current < currentTime) nextStartTimeRef.current = currentTime;
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              source.onended = () => {
                if (audioContextRef.current && audioContextRef.current.currentTime >= nextStartTimeRef.current - 0.1) setAiSpeaking(false);
              };
            }
            if (msg.serverContent?.interrupted) { nextStartTimeRef.current = 0; setAiSpeaking(false); }
          },
          onclose: () => { isConnectedRef.current = false; setSessionActive(false); setIsVoiceConnected(false); },
          onerror: (err) => {
            console.error("Live API Error:", err);
            isConnectedRef.current = false;
            if (isVoiceConnected || sessionRef.current) {
              addNotification('error', 'Voice Error', 'Connection interrupted.');
              disconnectLiveSession();
            }
          }
        }
      });
      sessionRef.current = sessionPromise;
    } catch (e) {
      console.error("Connection failed", e);
      isConnectedRef.current = false;
      addNotification('error', 'Connection Failed', 'Microphone access denied or API error.');
      setIsVoiceConnected(false);
    }
  };

  const disconnectLiveSession = async () => {
    isConnectedRef.current = false;
    if (sessionRef.current) { try { const s = await sessionRef.current; s.close(); } catch {} }
    processorRef.current?.disconnect(); inputSourceRef.current?.disconnect();
    inputAudioContextRef.current?.close(); inputAudioContextRef.current = null;
    audioContextRef.current?.close(); audioContextRef.current = null;
    processorRef.current = null; inputSourceRef.current = null; sessionRef.current = null;
    setIsVoiceConnected(false); setSessionActive(false); setAiSpeaking(false);
  };

  const handleChannelCreation = () => {
    if (newChannelName.trim() && isCreatingChannel && onCreateChannel) {
      onCreateChannel(newChannelName.trim(), isCreatingChannel);
      setIsCreatingChannel(null); setNewChannelName('');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() && !attachment) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatarUrl,
      content: inputText,
      timestamp: 'Today at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      threadId: replyingTo?.id,
      mentions: inputText.match(/@(\w+)/g)?.map(m => m.slice(1)),
    };

    if (attachment) {
      newMessage.attachments = [{
        id: Date.now().toString(),
        name: attachment.type === 'image' ? 'image.png' : 'video.mp4',
        url: attachment.data,
        type: attachment.type,
        mime: attachment.mime,
      }];
    }

    addMessage(activeChannelId, newMessage);
    const promptText = inputText;
    const attachedMedia = attachment;
    setInputText('');
    setAttachment(null);
    setReplyingTo(null);

    if (activeChannel?.type !== 'dm' && server.features?.aiEnabled) {
      setIsTyping(true);
      try {
        let aiResponseText = "";
        if (attachedMedia) {
          const base64Data = attachedMedia.data.split(',')[1];
          aiResponseText = await analyzeMedia(base64Data, attachedMedia.mime, promptText);
        } else {
          const history = (messages[activeChannelId] || []).filter(m => !m.threadId).map(m => ({
            role: m.isAi ? 'model' : 'user',
            parts: [{ text: m.content }]
          }));
          aiResponseText = await getChatResponse(history, promptText, isThinkingMode);
        }
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          senderId: 'ai',
          senderName: 'GemBot',
          senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=gemini',
          content: aiResponseText,
          timestamp: 'Today at ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAi: true,
          agentStatus: 'online',
          threadId: replyingTo?.id,
        };
        addMessage(activeChannelId, aiMessage);
      } catch (err) {
        console.error("Failed to get AI response", err);
      } finally {
        setIsTyping(false);
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleChannelSelect = (id: string) => {
    setActiveChannelId(id);
    setThreadParentMessage(null);
    setActiveThread(null);
    if (window.innerWidth < 768) onToggleMobileNav();
  };

  const handleOpenThread = (msg: Message) => {
    // Find the actual parent (if msg is a reply, find its parent)
    const parentId = msg.threadId || msg.id;
    const parent = (messages[activeChannelId] || []).find(m => m.id === parentId) || msg;
    setThreadParentMessage(parent);
    setActiveThread(parentId);
  };

  const handleJumpToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-yellow-500/10');
      setTimeout(() => el.classList.remove('bg-yellow-500/10'), 2000);
    }
  };

  // --- Sub-components ---
  const MemberList = () => {
    const groups = ['OPERATORS', 'ONLINE', 'OFFLINE'];
    return (
      <div className="w-60 bg-[#2b2d31] flex-col hidden lg:flex border-l border-white/5 overflow-y-auto custom-scrollbar p-3 shrink-0">
        {groups.map(group => {
          const members = MOCK_MEMBERS.filter(m => {
            if (group === 'OPERATORS') return m.role === 'OPERATORS';
            if (group === 'ONLINE') return m.role !== 'OPERATORS' && m.status !== 'offline';
            return m.status === 'offline';
          });
          if (members.length === 0) return null;
          return (
            <div key={group} className="mb-6">
              <div className="text-[11px] font-black text-zinc-500 uppercase tracking-wide mb-2 pl-2">
                {group === 'OPERATORS' ? 'Operators' : group === 'ONLINE' ? 'Online' : 'Offline'} — {members.length}
              </div>
              <div className="space-y-0.5">
                {members.map(member => (
                  <div key={member.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5 cursor-pointer group opacity-90 hover:opacity-100">
                    <div className="relative">
                      <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full bg-zinc-700 object-cover" />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#2b2d31] ${
                        member.status === 'online' ? 'bg-green-500' : member.status === 'idle' ? 'bg-yellow-500' : member.status === 'dnd' ? 'bg-red-500' : 'bg-zinc-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate" style={{ color: member.status === 'offline' ? '#71717a' : member.color }}>{member.name}</span>
                        {member.isBot && <span className="bg-[#5865f2] text-white text-[9px] px-1 rounded font-bold h-3.5 flex items-center">BOT</span>}
                      </div>
                      {member.activity && member.status !== 'offline' && (
                        <div className="text-[10px] text-zinc-400 truncate font-medium">{member.activity}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderChannelList = () => {
    const isDM = server.id === 'dm-home';
    return (
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 custom-scrollbar">
        {isDM && (
          <div className="mb-4 px-2 animate-fade-in">
            <div className="mb-4">
              <button className="w-full text-left px-2 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors text-sm font-medium mb-1">Friends</button>
              <button className="w-full text-left px-2 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors text-sm font-medium mb-1">Nitro</button>
              <button className="w-full text-left px-2 py-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors text-sm font-medium">Shop</button>
            </div>
            <div className="text-[11px] font-black text-zinc-500 uppercase tracking-wide mb-2 px-2 flex justify-between items-center group cursor-pointer hover:text-zinc-300">
              Direct Messages <Plus size={12} className="opacity-0 group-hover:opacity-100"/>
            </div>
            {server.channels.filter(c => c.type === 'dm').map(channel => (
              <button key={channel.id} onClick={() => handleChannelSelect(channel.id)} className={`w-full flex items-center gap-3 px-2 py-2 rounded-md transition-all group ${activeChannelId === channel.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5'}`}>
                <div className="relative">
                  <img src={channel.avatar} className="w-8 h-8 rounded-full" />
                  <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#2b2d31] ${channel.status === 'online' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                </div>
                <span className="font-medium text-sm">{channel.name}</span>
              </button>
            ))}
          </div>
        )}

        {!isDM && (
          <div className="animate-fade-in">
            {/* Apps */}
            <div className="space-y-0.5 mb-5">
              <div className="flex items-center justify-between px-2 pt-2 pb-1 text-[11px] font-bold text-zinc-500 uppercase tracking-wide group hover:text-zinc-300 cursor-pointer mb-0.5">
                <span className="flex items-center gap-1"><Zap size={10} /> Integrations</span>
                {onOpenIntegrations && (
                  <button onClick={(e) => { e.stopPropagation(); onOpenIntegrations(); }} className="hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Plus size={12}/></button>
                )}
              </div>
              {server.channels.filter(c => c.type === 'app').map(channel => (
                <button key={channel.id} onClick={() => handleChannelSelect(channel.id)} className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md transition-all ${activeChannelId === channel.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-300'}`}>
                  {channel.appType === 'ai' ? <Bot size={16}/> : <Layout size={16}/>}
                  <span className="font-medium text-sm">{channel.name}</span>
                </button>
              ))}
            </div>

            {/* Voice Channels */}
            <div className="space-y-0.5 mb-5">
              <div className="flex items-center justify-between px-2 pt-2 pb-1 text-[11px] font-bold text-zinc-500 uppercase tracking-wide group hover:text-zinc-300 cursor-pointer mb-0.5">
                <span className="flex items-center gap-1"><Volume2 size={10} /> Voice Channels</span>
                {onCreateChannel && (
                  <button onClick={(e) => { e.stopPropagation(); setIsCreatingChannel('voice'); }} className="hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Plus size={12}/></button>
                )}
              </div>
              {isCreatingChannel === 'voice' && (
                <div className="px-2 py-1">
                  <div className="flex items-center gap-2 bg-[#1e1f22] rounded p-1 border border-zinc-700">
                    <input autoFocus className="bg-transparent text-xs text-white w-full outline-none px-1" placeholder="Voice Channel Name" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChannelCreation()} />
                    <button onClick={handleChannelCreation}><Check size={12} className="text-green-500"/></button>
                    <button onClick={() => { setIsCreatingChannel(null); setNewChannelName(''); }}><X size={12} className="text-red-500"/></button>
                  </div>
                </div>
              )}
              {server.channels.filter(c => c.type === 'voice').map(channel => (
                <div key={channel.id}>
                  <button onClick={() => handleChannelSelect(channel.id)} className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all ${activeChannelId === channel.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-300'}`}>
                    <Volume2 size={18} />
                    <span className="font-medium text-sm">{channel.name}</span>
                  </button>
                  {activeChannelId === channel.id && isVoiceConnected && (
                    <div className="ml-6 mt-1 mb-1 p-1 rounded-md bg-[#1e1f22] flex items-center gap-2 animate-fade-in-up border border-white/5">
                      <img src={currentUser.avatarUrl} className="w-5 h-5 rounded-full border border-green-500"/>
                      <span className="text-xs font-bold text-white">{currentUser.name}</span>
                      <span className="text-[9px] bg-green-500 text-black px-1 rounded font-black ml-auto">LIVE</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Text Channels */}
            <div className="space-y-0.5">
              <div className="flex items-center justify-between px-2 pt-2 pb-1 text-[11px] font-bold text-zinc-500 uppercase tracking-wide group hover:text-zinc-300 cursor-pointer mb-0.5">
                <span className="flex items-center gap-1"><Hash size={10} /> Text Channels</span>
                {onCreateChannel && (
                  <button onClick={(e) => { e.stopPropagation(); setIsCreatingChannel('text'); }} className="hover:text-white transition-colors opacity-0 group-hover:opacity-100"><Plus size={12}/></button>
                )}
              </div>
              {isCreatingChannel === 'text' && (
                <div className="px-2 py-1">
                  <div className="flex items-center gap-2 bg-[#1e1f22] rounded p-1 border border-zinc-700">
                    <input autoFocus className="bg-transparent text-xs text-white w-full outline-none px-1" placeholder="new-channel" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))} onKeyDown={(e) => e.key === 'Enter' && handleChannelCreation()} />
                    <button onClick={handleChannelCreation}><Check size={12} className="text-green-500"/></button>
                    <button onClick={() => { setIsCreatingChannel(null); setNewChannelName(''); }}><X size={12} className="text-red-500"/></button>
                  </div>
                </div>
              )}
              {server.channels.filter(c => c.type === 'text').map(channel => (
                <button key={channel.id} onClick={() => handleChannelSelect(channel.id)} className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all ${activeChannelId === channel.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-300'}`}>
                  <Hash size={18} />
                  <span className="font-medium text-sm">{channel.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full bg-zinc-900 overflow-hidden relative">
      {/* Channels Sidebar */}
      <div className={`fixed inset-y-0 z-40 bg-[#2b2d31]/95 backdrop-blur-xl md:backdrop-blur-none md:bg-[#2b2d31] md:static md:w-60 md:flex flex-col shrink-0 transition-transform duration-300 ease-out w-64 md:w-60 left-0 md:left-0 md:translate-x-0 ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex-1 overflow-hidden flex flex-col pt-3 bg-[#2b2d31]">
          {renderChannelList()}
        </div>
        
        {/* User Status Bar */}
        <div className="bg-[#232428] px-2 py-2 flex items-center gap-2 mt-auto shrink-0 border-t border-black/20">
          <div className="relative group cursor-pointer hover:opacity-80 transition-opacity">
            <img src={currentUser.avatarUrl} alt="User" className="w-8 h-8 rounded-full object-cover" />
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#232428] rounded-full ${isVoiceConnected ? 'animate-pulse' : ''}`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{currentUser.name}</div>
            <div className="text-[10px] text-zinc-400 truncate">{isVoiceConnected ? 'Signal: Strong' : 'Online'}</div>
          </div>
          <div className="flex items-center">
            <button onClick={() => setIsMuted(!isMuted)} className={`p-1.5 rounded-md transition-colors ${isMuted ? 'text-red-500 bg-red-500/10' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/10'}`}>
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <button className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-zinc-200"><Headphones size={18} /></button>
            <button className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-zinc-400 hover:text-zinc-200"><Settings size={18} /></button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#313338] relative">
        {isMobileNavOpen && <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={onToggleMobileNav}></div>}

        {/* Content Area Switch */}
        {activeChannel.type === 'app' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <AppView channel={activeChannel} onOpenGoLive={onOpenGoLive || (() => {})} />
          </div>
        ) : activeChannel.type === 'voice' ? (
          /* Voice Chat UI - unchanged */
          <div className="flex-1 flex flex-col items-center justify-center bg-black/80 p-8 text-center relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary rounded-full blur-[128px] opacity-10 pointer-events-none animate-pulse-glow"></div>
            <div className="relative z-10 flex flex-col items-center w-full max-w-5xl">
              {!isVoiceConnected ? (
                <div className="flex flex-col items-center mb-8 animate-fade-in-up">
                  <div className="mb-6 relative group">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center bg-zinc-800 border-4 border-zinc-700 shadow-2xl">
                      <Volume2 size={40} className="text-zinc-500 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{activeChannel.name}</h2>
                  <p className="text-zinc-400 mb-8 max-w-md text-base text-center">Join to chat with GemBot (Gemini Live). <br/>Low latency, real-time AI conversation.</p>
                  <button onClick={connectLiveSession} className="bg-green-600 hover:bg-green-500 text-white px-10 py-3 rounded-full font-bold text-base transition-all transform hover:scale-105 shadow-lg flex items-center gap-3">
                    <Phone size={20} className="fill-current" /> Start Session
                  </button>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center animate-fade-in-up">
                  <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 mb-8 md:mb-12">
                    <div className="flex flex-col items-center gap-3 md:gap-4">
                      <div className={`relative w-20 h-20 md:w-32 md:h-32 rounded-full p-1 transition-all duration-300 ${!isMuted ? 'bg-gradient-to-tr from-green-400 to-green-600 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'bg-zinc-700'}`}>
                        <img src={currentUser.avatarUrl} className="w-full h-full rounded-full object-cover border-4 border-[#313338]" />
                        {isMuted && <div className="absolute bottom-0 right-0 bg-red-500 p-1.5 md:p-2 rounded-full border-4 border-[#313338]"><MicOff size={12} className="text-white md:hidden"/><MicOff size={16} className="text-white hidden md:block"/></div>}
                      </div>
                      <span className="text-white font-bold text-sm md:text-lg">You</span>
                    </div>
                    <div className="w-1 h-12 md:w-32 md:h-1 bg-zinc-700 rounded-full relative overflow-hidden">
                      <motion.div animate={{ x: [0, 0], y: [-50, 50] }} className="md:hidden absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent via-primary to-transparent opacity-50" transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} />
                      <motion.div animate={{ x: [-100, 100] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="hidden md:block absolute top-0 bottom-0 w-20 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                    </div>
                    <div className="flex flex-col items-center gap-3 md:gap-4">
                      <div className={`relative w-20 h-20 md:w-32 md:h-32 rounded-full p-1 transition-all duration-100 ${aiSpeaking ? 'bg-gradient-to-tr from-blue-400 to-violet-600 shadow-[0_0_40px_rgba(99,102,241,0.6)] scale-105' : 'bg-zinc-700'}`}>
                        <div className="w-full h-full rounded-full bg-black flex items-center justify-center border-4 border-[#313338] overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20"></div>
                          <Bot size={32} className="text-indigo-400 relative z-10 md:hidden" />
                          <Bot size={48} className="text-indigo-400 relative z-10 hidden md:block" />
                        </div>
                      </div>
                      <span className="text-white font-bold text-sm md:text-lg flex items-center gap-2">GemBot {aiSpeaking && <span className="flex gap-0.5 h-3 items-end"><span className="w-1 h-2 bg-indigo-400 animate-bounce"></span><span className="w-1 h-3 bg-indigo-400 animate-bounce delay-75"></span><span className="w-1 h-1 bg-indigo-400 animate-bounce delay-150"></span></span>}</span>
                    </div>
                  </div>
                  <div className="flex gap-4 md:gap-6 items-center bg-black/40 border border-white/5 p-4 md:p-6 rounded-[2rem] shadow-2xl backdrop-blur-md">
                    <button onClick={() => setIsMuted(!isMuted)} className={`p-4 md:p-5 rounded-full transition-all touch-target ${isMuted ? 'bg-white text-black hover:scale-105' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}>{isMuted ? <MicOff size={24} /> : <Mic size={24} />}</button>
                    <button onClick={disconnectLiveSession} className="bg-red-500 hover:bg-red-600 text-white px-6 md:px-10 py-4 md:py-5 rounded-full font-black text-sm md:text-lg transition-all hover:scale-105 shadow-lg shadow-red-500/20 flex items-center gap-2 md:gap-3 uppercase tracking-widest touch-target"><PhoneOff size={20} /> <span className="hidden md:inline">End Call</span><span className="md:hidden">End</span></button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 relative"
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            >
              {/* Drag overlay */}
              <AnimatePresence>
                {dragOver && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-[#5865f2]/20 border-2 border-dashed border-[#5865f2] rounded-lg z-30 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                      <Paperclip size={48} className="text-[#5865f2] mx-auto mb-2" />
                      <p className="text-white font-bold text-lg">Drop files to upload</p>
                      <p className="text-zinc-400 text-sm">to #{activeChannel.name}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search Panel */}
              <AnimatePresence>
                {searchOpen && (
                  <SearchPanel
                    channelId={activeChannelId}
                    allMessages={messages[activeChannelId] || []}
                    onClose={() => setSearchOpen(false)}
                    onJumpToMessage={handleJumpToMessage}
                  />
                )}
              </AnimatePresence>

              {/* Pinned Panel */}
              <AnimatePresence>
                {pinnedPanelOpen && (
                  <PinnedPanel
                    channelId={activeChannelId}
                    channelName={activeChannel.name}
                    onClose={() => setPinnedPanelOpen(false)}
                  />
                )}
              </AnimatePresence>

              {/* Channel toolbar */}
              <div className="flex items-center gap-2 px-3 py-1 border-b border-white/5 shrink-0 bg-[rgb(var(--color-bg-surface))]">
                <button onClick={() => setSearchOpen(true)} className="flex items-center gap-1.5 px-2 py-1 rounded bg-[rgb(var(--color-bg-secondary))] text-zinc-500 text-xs hover:text-zinc-300 transition-colors haptic">
                  <Search size={12} /> <span className="hidden md:inline">Search</span>
                  <kbd className="text-[9px] ml-1 px-1 py-0.5 rounded bg-white/5 border border-white/10 hidden md:inline">⌘K</kbd>
                </button>
                <button onClick={() => setPinnedPanelOpen(!pinnedPanelOpen)} className={`p-1.5 rounded transition-colors haptic ${pinnedPanelOpen ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  <Pin size={14} />
                </button>
                <button onClick={() => setCommandPaletteOpen(true)} className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 transition-colors haptic" title="Command Palette (⌘⇧P)">
                  <Command size={14} />
                </button>
                <div className="flex-1" />
                <button onClick={() => setShowMemberList(!showMemberList)} className={`p-1.5 rounded transition-colors haptic ${showMemberList ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  <Users size={14} />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col px-0 pt-3 pb-3 space-y-0.5 bg-[rgb(var(--color-bg-surface))]">
                {channelMessages.length === 0 && (
                  <div className="mx-4 mt-8 mb-6">
                    <div className="w-16 h-16 bg-[#2a2c33] rounded-full flex items-center justify-center mb-4">
                      <Hash size={40} className="text-white"/>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">Welcome to #{activeChannel.name}!</h3>
                    <p className="text-zinc-300">This is the start of the <span className="font-bold text-white">#{activeChannel.name}</span> channel.</p>
                    <div className="mt-4 flex gap-2">
                      <button className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1"><Edit2 size={14}/> Edit Channel</button>
                    </div>
                  </div>
                )}

                {channelMessages.map((msg, index) => (
                  <div key={msg.id} id={`msg-${msg.id}`} className="transition-colors duration-500">
                    <MessageBubble
                      message={msg}
                      prevMessage={channelMessages[index - 1]}
                      channelId={activeChannelId}
                      currentUserId={currentUser.id}
                      onOpenThread={handleOpenThread}
                    />
                  </div>
                ))}

                {isTyping && (
                  <div className="px-4 py-2 mt-2 flex items-center gap-2">
                    <div className="typing-indicator"><span></span><span></span><span></span></div>
                    <span className="text-xs text-zinc-400 font-bold">GemBot is thinking...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply indicator */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="px-3 bg-[#2b2d31] border-t border-white/5 overflow-hidden">
                    <div className="flex items-center gap-2 py-2">
                      <Reply size={14} className="text-zinc-400 shrink-0" />
                      <span className="text-xs text-zinc-400">Replying to</span>
                      <span className="text-xs text-white font-medium">{replyingTo.senderName}</span>
                      <span className="text-xs text-zinc-500 truncate flex-1">{replyingTo.content.slice(0, 80)}</span>
                      <button onClick={() => setReplyingTo(null)} className="text-zinc-400 hover:text-white shrink-0"><X size={14} /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Area */}
              <div className="px-3 md:px-3 pb-3 md:pb-4 pt-1.5 shrink-0 bg-[rgb(var(--color-bg-surface))]" onPaste={handlePaste}>
                {attachment && (
                  <div className="px-4 pb-2">
                    <div className="relative bg-[#2b2d31] p-3 rounded-lg inline-block border border-zinc-700">
                      {attachment.type === 'image' ? <img src={attachment.data} className="h-32 rounded object-contain" /> : <div className="h-20 w-32 bg-black flex items-center justify-center text-white"><Film/></div>}
                      <button onClick={() => setAttachment(null)} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white shadow-md hover:bg-red-600"><X size={12} /></button>
                    </div>
                  </div>
                )}
                <div className="bg-[rgb(var(--color-bg-secondary))] rounded-md px-2.5 md:px-3 py-1.5 md:py-2 flex items-start gap-2 md:gap-2.5 shadow-sm relative z-20">
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,.pdf,.zip,.txt,.js,.ts,.py" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="text-zinc-400 hover:text-white mt-1 group relative touch-target flex items-center justify-center">
                    <div className="bg-[#111214] text-zinc-200 text-[11px] absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold pointer-events-none shadow-lg hidden md:block">Upload File</div>
                    <Plus size={20} className="bg-zinc-400 text-[#383a40] rounded-full p-0.5 group-hover:bg-white transition-colors"/>
                  </button>
                  <form className="flex-1 relative" onSubmit={handleSendMessage}>
                    <input 
                      ref={inputRef}
                      type="text" 
                      value={inputText} 
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSendMessage(); }
                      }}
                      placeholder={replyingTo ? `Reply to ${replyingTo.senderName}...` : `Message #${activeChannel.name}`}
                      className="w-full bg-transparent text-[#dbdee1] placeholder-zinc-500 focus:outline-none py-1 md:py-1 font-normal text-[14px]"
                    />
                    {/* Mention Autocomplete */}
                    <AnimatePresence>
                      {mentionQuery !== null && (
                        <MentionAutocomplete
                          query={mentionQuery}
                          members={MOCK_MEMBERS.map(m => ({ id: m.id, name: m.name, avatar: m.avatar, status: m.status, isBot: m.isBot }))}
                          onSelect={handleMentionSelect}
                          position={{ bottom: 44, left: 0 }}
                        />
                      )}
                    </AnimatePresence>
                  </form>
                  <div className="flex items-center gap-1.5 md:gap-3 text-zinc-400 mt-1">
                    {/* Voice message */}
                    <button
                      onClick={isRecordingVoice ? stopRecording : startRecording}
                      className={`transition-colors touch-target flex items-center justify-center ${isRecordingVoice ? 'text-red-500 animate-pulse' : 'hover:text-white'}`}
                      title={isRecordingVoice ? "Stop recording" : "Record voice message"}
                    >
                      {isRecordingVoice ? <StopCircle size={20}/> : <Mic size={20}/>}
                    </button>
                    <button className="hover:text-white transition-colors hidden md:block"><Gift size={20}/></button>
                    <button className="hover:text-white transition-colors hidden md:block"><Sticker size={20}/></button>
                    <button className="hover:text-white transition-colors touch-target flex items-center justify-center"><Smile size={20}/></button>
                    {server.features?.aiEnabled && (
                      <button onClick={() => setIsThinkingMode(!isThinkingMode)} className={`transition-colors ${isThinkingMode ? 'text-primary' : 'hover:text-white'}`} title="Toggle AI Thinking">
                        <BrainCircuit size={20}/>
                      </button>
                    )}
                    {inputText.trim() && (
                      <button onClick={() => handleSendMessage()} className="text-white bg-[#5865f2] hover:bg-[#4752c4] rounded-full p-1 transition-colors">
                        <Send size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {/* Shortcut hints */}
                <div className="flex items-center gap-2 mt-0.5 px-1 opacity-20">
                  <span className="text-[8px] text-zinc-600">
                    <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 mr-1">Enter</kbd>send
                    <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 mx-1">⌘K</kbd>search
                    <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 mx-1">↑</kbd>edit
                  </span>
                </div>
              </div>
            </div>

            {/* Thread Panel */}
            <AnimatePresence>
              {threadParentMessage && (
                <ThreadPanel
                  parentMessage={threadParentMessage}
                  channelId={activeChannelId}
                  currentUser={currentUser}
                  onClose={() => { setThreadParentMessage(null); setActiveThread(null); }}
                />
              )}
            </AnimatePresence>

            {/* Member List */}
            {showMemberList && !threadParentMessage && <MemberList />}
          </div>
        )}
      </div>

      {/* Command Palette */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <CommandPalette commands={commands} onClose={() => setCommandPaletteOpen(false)} />
        )}
      </AnimatePresence>

      <style>{`
        .typing-indicator span {
          display: inline-block; width: 6px; height: 6px; background-color: #b9bbbe;
          border-radius: 50%; animation: typing 1.4s infinite ease-in-out both; margin-right: 3px;
        }
        .typing-indicator span:nth-child(1) { animation-delay: 0s; }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typing { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
      `}</style>
    </div>
  );
};
