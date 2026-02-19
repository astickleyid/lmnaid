import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Camera, Image as ImageIcon, User as UserIcon, Save } from 'lucide-react';
import { User } from '../types';
import { generateBio } from '../services/geminiService';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSave: (updatedUser: User) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, currentUser, onSave }) => {
  const [name, setName] = useState(currentUser.name);
  const [handle, setHandle] = useState(currentUser.handle);
  const [bio, setBio] = useState(currentUser.bio);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState(currentUser.bannerUrl);
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setName(currentUser.name);
        setHandle(currentUser.handle);
        setBio(currentUser.bio);
        setAvatarUrl(currentUser.avatarUrl);
        setBannerUrl(currentUser.bannerUrl);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setUrl: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateBio = async () => {
      setIsGeneratingBio(true);
      const newBio = await generateBio("high-fidelity designer, nexus enthusiast, vanguard developer"); 
      setBio(newBio);
      setIsGeneratingBio(false);
  };

  const handleSave = () => {
      onSave({ ...currentUser, name, handle, bio, avatarUrl, bannerUrl });
      onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center bg-black/40 backdrop-blur-md md:p-4 animate-fade-in">
        <div className="nebula-glass rounded-t-[2rem] md:rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative safe-bottom">
            
            <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Persona Editor</h2>
                    <p className="text-zinc-500 text-sm font-medium">Define your presence in the nexus.</p>
                </div>
                <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="relative h-44 bg-white/5 group overflow-hidden">
                    {bannerUrl ? (
                        <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-all duration-500" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                            <ImageIcon size={48} />
                        </div>
                    )}
                    
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-sm">
                         <button onClick={() => bannerInputRef.current?.click()} className="bg-white text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl flex items-center gap-2">
                             <Camera size={14} /> Update Banner
                         </button>
                    </div>
                </div>

                <div className="px-10 relative -mt-16 mb-8 flex items-end justify-between">
                     <div className="relative group">
                          <div className="w-32 h-32 rounded-[2.5rem] border-[6px] border-white/5 bg-zinc-900 overflow-hidden shadow-2xl transition-transform group-hover:scale-105 duration-500">
                              {avatarUrl ? (
                                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                      <UserIcon size={40} />
                                  </div>
                              )}
                          </div>
                          <button 
                              onClick={() => avatarInputRef.current?.click()}
                              className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-all cursor-pointer border-[6px] border-transparent"
                          >
                              <Camera size={24} className="text-white" />
                          </button>
                     </div>
                     
                     <div className="hidden sm:block text-right mb-4">
                         <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-1">Recommended</p>
                         <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">1920x1080 Aspect Ratio</p>
                     </div>
                </div>

                <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setBannerUrl)} />
                <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, setAvatarUrl)} />

                <div className="px-10 pb-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Signature Name</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-primary transition-all placeholder-zinc-700"
                                placeholder="Public Name"
                            />
                        </div>
                        
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Nexus Handle</label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600 font-bold">@</span>
                                <input 
                                    type="text" 
                                    value={handle.replace('@', '')}
                                    onChange={(e) => setHandle(e.target.value.startsWith('@') ? e.target.value : '@' + e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-2xl pl-10 pr-5 py-4 text-white font-bold focus:outline-none focus:border-primary transition-all placeholder-zinc-700"
                                    placeholder="handle"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                         <div className="flex justify-between items-center mb-1">
                             <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Manifesto</label>
                             <button onClick={handleGenerateBio} disabled={isGeneratingBio} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline flex items-center gap-2">
                                 {isGeneratingBio ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <Sparkles size={12} />}
                                 AI Synthesis
                             </button>
                         </div>
                         <div className="relative">
                              <textarea 
                                  value={bio}
                                  onChange={(e) => setBio(e.target.value)}
                                  maxLength={190}
                                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:border-primary transition-all h-32 resize-none leading-relaxed font-medium"
                                  placeholder="Broadcast your essence..."
                              />
                              <div className="absolute bottom-4 right-4 text-[9px] text-zinc-700 font-black uppercase tracking-widest">
                                  {bio.length}/190
                              </div>
                         </div>
                    </div>
                </div>
            </div>

            <div className="p-8 border-t border-white/5 bg-white/5 flex justify-end gap-4 shrink-0">
                <button onClick={onClose} className="btn text-zinc-500 hover:text-white text-xs font-black uppercase tracking-widest">Abort</button>
                <button onClick={handleSave} className="btn btn-primary px-10 py-4 text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
                    <Save size={16} /> Update Persona
                </button>
            </div>
        </div>
    </div>
  );
};