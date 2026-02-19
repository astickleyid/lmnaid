import React, { useState, useRef, useEffect } from 'react';
import { 
  Smile, Reply, Trash, Edit2, Pin, Star, Copy, Bookmark, 
  MoreHorizontal, MessageSquare, Check, X, ChevronDown, ChevronRight,
  Loader, AlertCircle, CheckCircle2, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '../../types';
import { useChatStore } from './chatStore';
import { MarkdownRenderer, CodeBlock } from './MarkdownRenderer';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '👀', '🔥', '✅', '❌', '🚀'];

const STATUS_CONFIG = {
  'todo': { icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-700', label: 'To Do' },
  'in-progress': { icon: Loader, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'In Progress' },
  'done': { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Done' },
  'blocked': { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Blocked' },
};

interface MessageBubbleProps {
  message: Message;
  prevMessage?: Message;
  channelId: string;
  currentUserId: string;
  onOpenThread: (msg: Message) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message, prevMessage, channelId, currentUserId, onOpenThread
}) => {
  const { 
    editingMessageId, setEditingMessage, updateMessage, deleteMessage,
    toggleReaction, togglePin, toggleStar, toggleBookmark, setReplyingTo,
    starredMessages, bookmarkedMessages
  } = useChatStore();

  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [logExpanded, setLogExpanded] = useState(!message.logCollapsed);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = editingMessageId === message.id;
  const isSequence = prevMessage && 
    prevMessage.senderId === message.senderId && 
    !message.threadId &&
    (new Date(message.timestamp).getTime() - new Date(prevMessage.timestamp).getTime() < 5 * 60000);
  const isStarred = starredMessages.has(message.id);
  const isBookmarked = bookmarkedMessages.has(message.id);
  const isOwn = message.senderId === currentUserId;

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(editText.length, editText.length);
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (editText.trim() && editText !== message.content) {
      updateMessage(channelId, message.id, { 
        content: editText, 
        edited: true, 
        editedAt: new Date().toISOString() 
      });
    }
    setEditingMessage(null);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowMoreMenu(false);
  };

  const handleDelete = () => {
    deleteMessage(channelId, message.id);
    setShowMoreMenu(false);
  };

  const agentStatusDot = message.agentStatus && (
    <span className={`inline-block w-2 h-2 rounded-full ml-1 ${
      message.agentStatus === 'online' ? 'bg-green-400' :
      message.agentStatus === 'working' ? 'bg-yellow-400 animate-pulse' :
      message.agentStatus === 'idle' ? 'bg-zinc-400' : 'bg-red-400'
    }`} />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}
      className={`flex gap-4 px-4 py-0.5 hover:bg-[#2e3035]/60 group relative ${!isSequence ? 'mt-[17px] pt-0.5' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); setShowMoreMenu(false); }}
    >
      {/* Floating Action Bar */}
      <AnimatePresence>
        {showActions && !isEditing && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute right-4 -top-3.5 bg-[#2b2d31] border border-[#1e1f22] rounded-md shadow-lg flex items-center z-20 overflow-visible"
          >
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors" title="React"><Smile size={16} /></button>
            <button onClick={() => { setReplyingTo(message); }} className="p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors" title="Reply"><Reply size={16} /></button>
            <button onClick={() => onOpenThread(message)} className="p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors" title="Thread"><MessageSquare size={16} /></button>
            {isOwn && <button onClick={() => { setEditingMessage(message.id); setEditText(message.content); }} className="p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors" title="Edit"><Edit2 size={16} /></button>}
            <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-1.5 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors" title="More"><MoreHorizontal size={16} /></button>

            {/* Emoji Quick Picker */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 -top-12 bg-[#2b2d31] border border-[#1e1f22] rounded-lg shadow-xl p-1.5 flex gap-0.5 z-30"
                >
                  {QUICK_EMOJIS.map(e => (
                    <button key={e} onClick={() => { toggleReaction(channelId, message.id, e, currentUserId); setShowEmojiPicker(false); }}
                      className="hover:bg-zinc-700 rounded p-1 text-base transition-colors">{e}</button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* More Menu */}
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-full mt-1 bg-[#111214] border border-[#1e1f22] rounded-lg shadow-xl py-1.5 w-48 z-30"
                >
                  <button onClick={handleCopy} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-[#5865f2] hover:text-white transition-colors"><Copy size={14} /> Copy Text</button>
                  <button onClick={() => { togglePin(channelId, message.id, currentUserId); setShowMoreMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-[#5865f2] hover:text-white transition-colors"><Pin size={14} /> {message.pinned ? 'Unpin' : 'Pin Message'}</button>
                  <button onClick={() => { toggleStar(message.id); setShowMoreMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-[#5865f2] hover:text-white transition-colors"><Star size={14} className={isStarred ? 'fill-yellow-400 text-yellow-400' : ''} /> {isStarred ? 'Unstar' : 'Star Message'}</button>
                  <button onClick={() => { toggleBookmark(message.id); setShowMoreMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-[#5865f2] hover:text-white transition-colors"><Bookmark size={14} className={isBookmarked ? 'fill-blue-400 text-blue-400' : ''} /> {isBookmarked ? 'Remove Bookmark' : 'Bookmark'}</button>
                  <button onClick={() => { setReplyingTo(message); setShowMoreMenu(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-300 hover:bg-[#5865f2] hover:text-white transition-colors"><Reply size={14} /> Quote Reply</button>
                  {isOwn && (
                    <>
                      <div className="border-t border-zinc-800 my-1" />
                      <button onClick={handleDelete} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/20 transition-colors"><Trash size={14} /> Delete Message</button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar / Timestamp gutter */}
      {!isSequence ? (
        <img src={message.senderAvatar} className="w-10 h-10 rounded-full bg-zinc-700 mt-0.5 object-cover cursor-pointer hover:opacity-80 transition-opacity shrink-0" />
      ) : (
        <div className="w-10 text-[10px] text-zinc-500 text-center opacity-0 group-hover:opacity-100 select-none self-start mt-1 shrink-0">
          {message.timestamp.includes('at') ? message.timestamp.split('at ')[1] : ''}
        </div>
      )}

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {!isSequence && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-medium text-white text-[15px] hover:underline cursor-pointer">{message.senderName}</span>
            {message.isAi && <span className="bg-[#5865f2] text-white text-[10px] px-1.5 rounded-[4px] font-medium h-[15px] flex items-center">BOT</span>}
            {agentStatusDot}
            <span className="text-xs text-zinc-500 ml-1 font-medium">{message.timestamp}</span>
            {message.edited && <span className="text-[10px] text-zinc-600">(edited)</span>}
            {message.pinned && <Pin size={12} className="text-yellow-500" />}
            {isStarred && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
          </div>
        )}

        {/* Reply indicator */}
        {message.threadId && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1 cursor-pointer hover:text-zinc-300" onClick={() => onOpenThread(message)}>
            <Reply size={12} /> Replying to a message
          </div>
        )}

        {/* Edit mode */}
        {isEditing ? (
          <div className="bg-[#383a40] rounded-lg p-2 mt-1">
            <textarea
              ref={editInputRef}
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEdit(); } if (e.key === 'Escape') setEditingMessage(null); }}
              className="w-full bg-transparent text-[#dbdee1] text-[15px] resize-none outline-none min-h-[40px]"
              rows={Math.min(editText.split('\n').length, 8)}
            />
            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
              escape to <button onClick={() => setEditingMessage(null)} className="text-blue-400 hover:underline">cancel</button> • enter to <button onClick={handleEdit} className="text-blue-400 hover:underline">save</button>
            </div>
          </div>
        ) : (
          <>
            {/* Task Card */}
            {message.taskCard && (
              <div className="bg-[#2b2d31] border border-white/10 rounded-lg p-3 my-2 max-w-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm">{message.taskCard.title}</span>
                  {(() => {
                    const cfg = STATUS_CONFIG[message.taskCard.status];
                    const Icon = cfg.icon;
                    return (
                      <span className={`${cfg.bg} ${cfg.color} text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1`}>
                        <Icon size={11} /> {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                {message.taskCard.progress !== undefined && (
                  <div className="w-full bg-zinc-700 rounded-full h-1.5 mb-2">
                    <div className={`h-full rounded-full transition-all duration-500 ${
                      message.taskCard.status === 'done' ? 'bg-green-500' :
                      message.taskCard.status === 'blocked' ? 'bg-red-500' : 'bg-blue-500'
                    }`} style={{ width: `${message.taskCard.progress}%` }} />
                  </div>
                )}
                {message.taskCard.labels && (
                  <div className="flex gap-1.5 flex-wrap">
                    {message.taskCard.labels.map((l, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">{l}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Log stream (collapsible) */}
            {message.isLogStream ? (
              <div className="my-1">
                <button onClick={() => setLogExpanded(!logExpanded)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mb-1">
                  {logExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="font-mono">Log Output</span>
                </button>
                {logExpanded && <CodeBlock code={message.content} language="log" />}
              </div>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}

            {/* Attachments */}
            {message.attachments?.map(att => (
              <div key={att.id} className="mt-2">
                {att.type === 'image' ? (
                  <img src={att.url} alt={att.name} className="max-w-md max-h-80 rounded-lg border border-white/5 cursor-pointer hover:opacity-90" />
                ) : att.type === 'video' ? (
                  <video src={att.url} controls className="max-w-md rounded-lg border border-white/5" />
                ) : (
                  <div className="bg-[#2b2d31] border border-white/10 rounded-lg p-3 flex items-center gap-3 max-w-sm cursor-pointer hover:bg-[#32353b]">
                    <div className="w-10 h-10 bg-[#5865f2] rounded-lg flex items-center justify-center text-white text-xs font-bold">{att.name.split('.').pop()?.toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="text-blue-400 text-sm font-medium truncate hover:underline">{att.name}</div>
                      {att.size && <div className="text-xs text-zinc-500">{(att.size / 1024).toFixed(1)} KB</div>}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Link Previews */}
            {message.linkPreviews?.map((lp, i) => (
              <div key={i} className="bg-[#2b2d31] border-l-4 border-[#5865f2] rounded-r-lg p-3 mt-2 max-w-lg">
                <a href={lp.url} target="_blank" rel="noopener" className="text-blue-400 text-sm font-semibold hover:underline">{lp.title}</a>
                <p className="text-zinc-400 text-xs mt-0.5 line-clamp-2">{lp.description}</p>
                {lp.image && <img src={lp.image} className="mt-2 rounded max-h-40 object-cover" />}
              </div>
            ))}
          </>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map(r => (
              <button
                key={r.emoji}
                onClick={() => toggleReaction(channelId, message.id, r.emoji, currentUserId)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                  r.users.includes(currentUserId)
                    ? 'bg-[#5865f2]/20 border-[#5865f2]/50 text-[#dee0fc]'
                    : 'bg-[#2b2d31] border-white/5 text-zinc-400 hover:border-white/20'
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread indicator */}
        {message.threadCount && message.threadCount > 0 && !message.threadId && (
          <button
            onClick={() => onOpenThread(message)}
            className="flex items-center gap-2 mt-1.5 text-blue-400 text-xs font-medium hover:underline group/thread"
          >
            <div className="flex -space-x-1.5">
              {message.threadParticipants?.slice(0, 3).map((av, i) => (
                <img key={i} src={av} className="w-4 h-4 rounded-full border border-[#313338]" />
              ))}
            </div>
            <span>{message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}</span>
            {message.threadLastReply && <span className="text-zinc-500">Last reply {message.threadLastReply}</span>}
          </button>
        )}
      </div>
    </motion.div>
  );
};
