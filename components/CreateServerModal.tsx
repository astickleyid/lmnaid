import React, { useState, useEffect, useRef } from 'react';
import { X, Server, Gamepad2, GraduationCap, Coffee, ChevronRight, Upload, Plus, Link as LinkIcon, Check, Sparkles, Box, Layout, Music, ArrowRight, ArrowLeft, Video } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PRESET_ICONS } from './IconAssets';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, type: string, iconUrl?: string, customIconId?: string, features?: any) => void;
}

const TEMPLATES = [
    { id: 'custom', label: 'Create My Own', icon: <Server size={22} />, color: 'bg-indigo-500', description: 'Start fresh with a clean slate.' },
    { id: 'gaming', label: 'Gaming', icon: <Gamepad2 size={22} />, color: 'bg-green-500', description: 'Jump into the action with friends.' },
    { id: 'school', label: 'School Club', icon: <GraduationCap size={22} />, color: 'bg-orange-500', description: 'Collaborate and plan together.' },
    { id: 'study', label: 'Study Group', icon: <Coffee size={22} />, color: 'bg-blue-500', description: 'Focus and share resources.' }
];

const MODULES = [
    { id: 'ai', label: 'Fresh Squeeze AI', description: 'GemBot chat assistant & tools.', icon: <Sparkles size={18} /> },
    { id: 'kanban', label: 'Project Board', description: 'Task tracking channels.', icon: <Layout size={18} /> },
    { id: 'voice', label: 'Voice Lounge', description: 'High-quality audio channels.', icon: <Music size={18} /> },
    { id: 'streaming', label: 'Native Streaming', description: 'RTMP server & streaming channels.', icon: <Video size={18} /> },
    { id: 'dev', label: 'Dev Tools', description: 'Code sandbox & Github link.', icon: <Box size={18} /> }
];

export const CreateServerModal: React.FC<CreateServerModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [step, setStep] = useState<'template' | 'details' | 'modules'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState('custom');
  const [serverName, setServerName] = useState('');
  const [serverIcon, setServerIcon] = useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>(['ai', 'voice']);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setStep('template');
        setServerName('');
        setSelectedTemplate('custom');
        setServerIcon(null);
        setSelectedPresetId(null);
        setSelectedModules(['ai', 'voice']);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTemplateSelect = (id: string) => {
      setSelectedTemplate(id);
      setStep('details');
      const templateName = TEMPLATES.find(t => t.id === id)?.label;
      setServerName(`${templateName}'s Server`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setServerIcon(reader.result as string);
              setSelectedPresetId(null);
          };
          reader.readAsDataURL(file);
      }
  };

  const handlePresetSelect = (id: string) => {
      setSelectedPresetId(id);
      setServerIcon(null);
  };

  const toggleModule = (id: string) => {
      setSelectedModules(prev => 
          prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
      );
  };

  const handleCreate = () => {
      if (serverName.trim()) {
          onCreate(
              serverName, 
              selectedTemplate, 
              serverIcon || undefined, 
              selectedPresetId || undefined,
              {
                  aiEnabled: selectedModules.includes('ai'),
                  communityEnabled: selectedModules.includes('voice'),
                  lemonHubLinked: selectedModules.includes('kanban'),
                  streamingEnabled: selectedModules.includes('streaming')
              }
          );
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md md:p-4 animate-fade-in">
        <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="nebula-glass rounded-t-[2rem] md:rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh] safe-bottom"
        >
            <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-20 hover:bg-white/5 rounded-full p-1">
                <X size={20} />
            </button>

            <div className="p-8 text-center border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent shrink-0">
                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Create Your Server</h2>
                <p className="text-zinc-400 text-sm font-medium">Your new home for collaboration.</p>
                
                <div className="flex justify-center mt-6 gap-2">
                    {['template', 'details', 'modules'].map((s, i) => (
                        <div 
                            key={s}
                            className={`h-1.5 w-12 rounded-full transition-all duration-300 
                                ${(step === 'details' && i <= 1) || (step === 'modules') || (step === 'template' && i === 0) 
                                    ? 'bg-primary shadow-[0_0_10px_rgba(var(--color-primary),0.4)]' 
                                    : 'bg-white/10'
                                }`}
                        />
                    ))}
                </div>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative">
                <AnimatePresence mode='wait'>
                    {step === 'template' && (
                        <motion.div 
                            key="template"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-3"
                        >
                            {TEMPLATES.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => handleTemplateSelect(template.id)}
                                    className="w-full flex items-center p-4 rounded-2xl border border-white/5 bg-zinc-900/50 hover:bg-white/5 hover:border-white/10 transition-all group text-left gap-4 active:scale-95"
                                >
                                    <div className={`w-12 h-12 rounded-xl ${template.color} flex items-center justify-center text-white shadow-lg shrink-0`}>
                                        {template.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-white text-base mb-1">{template.label}</div>
                                        <div className="text-xs text-zinc-500 font-medium group-hover:text-zinc-400 transition-colors">{template.description}</div>
                                    </div>
                                    <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors" size={20} />
                                </button>
                            ))}
                        </motion.div>
                    )}

                    {step === 'details' && (
                        <motion.div 
                            key="details"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8"
                        >
                            <div className="flex justify-center">
                                <div className="relative group">
                                    <div className={`w-28 h-28 rounded-[2rem] bg-zinc-800 border-2 border-dashed border-zinc-600 flex items-center justify-center overflow-hidden cursor-pointer transition-all hover:border-white hover:bg-zinc-700 shadow-xl ${selectedPresetId ? 'bg-transparent border-none' : ''}`}>
                                        {serverIcon ? (
                                            <img src={serverIcon} alt="Server Icon" className="w-full h-full object-cover" />
                                        ) : selectedPresetId ? (
                                            <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${PRESET_ICONS.find(p => p.id === selectedPresetId)?.gradient} text-white`}>
                                                {PRESET_ICONS.find(p => p.id === selectedPresetId)?.icon}
                                            </div>
                                        ) : (
                                            <div className="text-zinc-500 flex flex-col items-center gap-1 group-hover:text-white transition-colors">
                                                <Upload size={24} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Upload</span>
                                            </div>
                                        )}
                                    </div>
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                                    <div 
                                        className="absolute inset-0 z-10" 
                                        onClick={() => fileInputRef.current?.click()}
                                    ></div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 block ml-1">Server Identity</label>
                                <input 
                                    type="text" 
                                    value={serverName}
                                    onChange={(e) => setServerName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-all text-sm font-bold placeholder-zinc-700"
                                    placeholder="My Awesome Server"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 block ml-1">Or Pick a Style</label>
                                <div className="grid grid-cols-6 gap-2">
                                    {PRESET_ICONS.slice(0, 12).map(preset => (
                                        <button
                                            key={preset.id}
                                            onClick={() => handlePresetSelect(preset.id)}
                                            className={`aspect-square rounded-xl flex items-center justify-center transition-all ${selectedPresetId === preset.id ? 'ring-2 ring-white scale-110 z-10 shadow-lg' : 'opacity-50 hover:opacity-100 hover:scale-105'} bg-gradient-to-br ${preset.gradient}`}
                                        >
                                            <div className="text-white scale-75">{preset.icon}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 'modules' && (
                        <motion.div 
                            key="modules"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 mb-6">
                                <h3 className="text-primary font-bold text-sm mb-1">Customize Your Experience</h3>
                                <p className="text-xs text-zinc-400 leading-relaxed">Select the feature packs you want to enable immediately. These will create dedicated channels and activate special bots.</p>
                            </div>
                            
                            {MODULES.map(mod => (
                                <button
                                    key={mod.id}
                                    onClick={() => toggleModule(mod.id)}
                                    className={`w-full flex items-center p-4 rounded-2xl border transition-all gap-4 text-left group
                                        ${selectedModules.includes(mod.id) 
                                            ? 'bg-zinc-800 border-primary shadow-[0_0_20px_rgba(var(--color-primary),0.15)]' 
                                            : 'bg-transparent border-white/5 hover:bg-white/5'
                                        }
                                    `}
                                >
                                    <div className={`p-2.5 rounded-xl transition-colors ${selectedModules.includes(mod.id) ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-500 group-hover:text-zinc-300'}`}>
                                        {mod.icon}
                                    </div>
                                    <div className="flex-1">
                                        <div className={`text-sm font-bold ${selectedModules.includes(mod.id) ? 'text-white' : 'text-zinc-400'}`}>{mod.label}</div>
                                        <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">{mod.description}</div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all
                                        ${selectedModules.includes(mod.id) ? 'bg-primary border-primary scale-110' : 'border-zinc-600'}
                                    `}>
                                        {selectedModules.includes(mod.id) && <Check size={14} className="text-white" />}
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="p-6 border-t border-white/5 bg-black/20 flex justify-between items-center shrink-0">
                {step === 'template' ? (
                    <div className="text-xs text-zinc-500 font-medium">Step 1 of 3</div>
                ) : (
                    <button onClick={() => setStep(step === 'modules' ? 'details' : 'template')} className="text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider flex items-center gap-1">
                        <ArrowLeft size={14} /> Back
                    </button>
                )}
                
                {step === 'template' ? (
                    <button className="opacity-50 cursor-not-allowed text-xs font-bold text-zinc-600 uppercase tracking-wider" disabled>Select above</button>
                ) : step === 'details' ? (
                    <button onClick={() => setStep('modules')} disabled={!serverName} className="btn btn-primary px-8 py-3 text-xs font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                        Next <ArrowRight size={14} />
                    </button>
                ) : (
                    <button onClick={handleCreate} className="btn btn-primary px-8 py-3 text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2">
                        <Rocket size={14} /> Launch Server
                    </button>
                )}
            </div>
        </motion.div>
    </div>
  );
};

function Rocket({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
    )
}