import React, { useState, useRef } from 'react';
import { X, Sparkles, Wand2, Calendar, Clock, Image as ImageIcon, Link as LinkIcon, Trash2 } from 'lucide-react';
import { generatePostContent } from '../services/geminiService';

interface PostCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPost: (content: string, image?: string, scheduledDate?: Date) => void;
}

const CHAR_LIMIT = 280;
const TONE_OPTIONS = ['Casual', 'Professional', 'Funny', 'Excited', 'Cyberpunk'];

export const PostCreator: React.FC<PostCreatorProps> = ({ isOpen, onClose, onPost }) => {
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedTone, setSelectedTone] = useState('Casual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [showScheduler, setShowScheduler] = useState(false);
  const [attachment, setAttachment] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInputValue, setUrlInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    // Uses the new fast Lite model via the service wrapper
    const generated = await generatePostContent(topic, selectedTone);
    setContent(generated.slice(0, CHAR_LIMIT));
    setIsGenerating(false);
  };

  const handlePost = () => {
    if ((content.trim() || attachment) && content.length <= CHAR_LIMIT) {
      onPost(content, attachment || undefined, scheduledDate ? new Date(scheduledDate) : undefined);
      setContent('');
      setTopic('');
      setSelectedTone('Casual');
      setScheduledDate('');
      setShowScheduler(false);
      setAttachment(null);
      setShowUrlInput(false);
      setUrlInputValue('');
      onClose();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setAttachment(reader.result as string);
        };
        reader.readAsDataURL(file);
    }
  };

  const handleUrlAdd = () => {
    if (urlInputValue.trim()) {
        setAttachment(urlInputValue.trim());
        setShowUrlInput(false);
        setUrlInputValue('');
    }
  };

  const remainingChars = CHAR_LIMIT - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="nebula-glass rounded-t-[2rem] md:rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] safe-bottom">
        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
          <h3 className="text-white font-bold flex items-center gap-2 tracking-tight">
            <Wand2 size={18} className="text-primary" /> Create Content
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-black text-yellow-400 uppercase tracking-[0.2em]">
              <Sparkles size={12} /> Fresh Squeeze AI (Lite)
            </div>
            
            <div className="flex gap-2">
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Subject of synthesis..."
                className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-400/50 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !topic}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-300 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center min-w-[80px]"
              >
                {isGenerating ? <div className="animate-spin w-4 h-4 border-2 border-black/30 border-t-black rounded-full" /> : 'Draft'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {TONE_OPTIONS.map((tone) => (
                <button
                  key={tone}
                  onClick={() => setSelectedTone(tone)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                    selectedTone === tone 
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                      : 'bg-white/5 border-white/5 text-zinc-500 hover:border-white/10 hover:text-zinc-300'
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?" 
              className="w-full h-32 bg-transparent resize-none focus:outline-none text-xl text-white placeholder-zinc-700 font-medium"
            />
          </div>

          {attachment && (
              <div className="relative mt-2 rounded-2xl overflow-hidden border border-white/5 bg-black/40 group/image">
                  <img src={attachment} alt="Attachment" className="max-h-64 w-full object-contain" />
                  <button 
                      onClick={() => setAttachment(null)}
                      className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-red-500 text-white rounded-full transition-colors backdrop-blur-md"
                  >
                      <Trash2 size={16} />
                  </button>
              </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                 
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                 >
                    <ImageIcon size={20} />
                 </button>

                 <button 
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className={`p-3 rounded-xl transition-colors ${showUrlInput ? 'text-primary bg-primary/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                 >
                    <LinkIcon size={20} />
                 </button>

                 <div className="w-px h-6 bg-white/5 mx-2"></div>
                 
                 <button 
                    onClick={() => setShowScheduler(!showScheduler)}
                    className={`p-3 rounded-xl transition-colors ${showScheduler ? 'text-primary bg-primary/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                 >
                    <Calendar size={20} />
                 </button>
              </div>

              <div className="flex items-center gap-4">
                 <div className={`text-[10px] font-black tracking-widest uppercase transition-colors ${isOverLimit ? 'text-red-500' : 'text-zinc-500'}`}>
                    {content.length} / {CHAR_LIMIT}
                 </div>
                 <button 
                    onClick={handlePost}
                    disabled={(!content.trim() && !attachment) || isOverLimit}
                    className="btn btn-primary px-8 py-3 text-xs font-black uppercase tracking-[0.2em]"
                 >
                    {scheduledDate ? 'Schedule' : 'Publish'}
                 </button>
              </div>
          </div>
          
          {showUrlInput && (
              <div className="flex gap-2 animate-fade-in-up">
                  <input 
                      type="text" 
                      value={urlInputValue}
                      onChange={(e) => setUrlInputValue(e.target.value)}
                      placeholder="Paste artifact URL..."
                      className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary"
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlAdd()}
                      autoFocus
                  />
                  <button onClick={handleUrlAdd} className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Link</button>
              </div>
           )}

          {showScheduler && (
             <div className="animate-fade-in-up flex items-center gap-3 bg-black/40 border border-white/5 rounded-xl px-4 py-2">
                <Clock size={16} className="text-zinc-500" />
                <input 
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="bg-transparent text-white text-xs focus:outline-none [color-scheme:dark] flex-1 font-bold"
                />
             </div>
          )}
        </div>
      </div>
    </div>
  );
};