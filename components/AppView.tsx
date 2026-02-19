import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Terminal as TerminalIcon, Layout, Plus, Bot, Settings, FileCode, Box, GitBranch, X, Zap, 
  MessageSquare, ExternalLink, MousePointer2, Gamepad2, Users, Trophy, Crown, LayoutTemplate, 
  Search, Cloud, ChevronDown, Kanban, CheckSquare, MoreVertical, Sparkles, Save, DollarSign, 
  TrendingUp, CreditCard, Activity, FileText, AlertCircle, ArrowRight, Filter, Clock, CheckCircle2, 
  RefreshCw, User as UserIcon, Sliders, Cpu, Thermometer, Zap as ZapIcon
} from 'lucide-react';
import { Channel } from '../types';
import { getAgentResponse } from '../services/geminiService'; // Import new service method
import { TwitchView } from './TwitchView';

interface AppViewProps {
  channel: Channel;
  onOpenGoLive?: () => void;
}

export const AppView: React.FC<AppViewProps> = ({ channel, onOpenGoLive }) => {
  const renderApp = () => {
    switch (channel.appType) {
        case 'twitch': return <TwitchView channel={channel} onOpenGoLive={onOpenGoLive} />;
        case 'code': return <CodeSandbox name={channel.name} />;
        case 'board': return <WorkflowBoard />;
        case 'ai': return <AIAgentStudio />;
        case 'workflow': return <VisualWorkflowBuilder />;
        case 'game': return <EmbeddedGameView />;
        case 'store': return <ServerMonetizationView />;
        default: return <GenericIntegrationView appName={channel.name} />;
    }
  };

  return (
    <div className="flex h-full overflow-hidden relative group/app-view bg-[#1e1f22]">
       <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-hidden relative bg-[#313338]">
                {renderApp()}
            </div>
       </div>
    </div>
  );
};

// --- Functional AI Agent Studio ---
const AIAgentStudio = () => {
    const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string}[]>([
        { role: 'bot', content: 'Agent initialized. Waiting for input.' }
    ]);
    const [input, setInput] = useState("");
    const [temp, setTemp] = useState(0.7);
    const [model, setModel] = useState('gemini-3-pro-preview');
    const [systemPrompt, setSystemPrompt] = useState("You are a helpful assistant deployed in a high-tech environment. You are concise, professional, and knowledgeable about the nXcor platform.");
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;
        
        const userMsg = input;
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setInput("");
        setIsTyping(true);

        const history = messages.map(m => ({
            role: m.role === 'bot' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const response = await getAgentResponse(history, userMsg, {
            systemInstruction: systemPrompt,
            temperature: temp,
            model: model
        });

        setMessages(prev => [...prev, { role: 'bot', content: response }]);
        setIsTyping(false);
    };

    return (
        <div className="h-full flex bg-[#1e1f22]">
            {/* Configuration Panel */}
            <div className="w-80 border-r border-black/20 bg-[#2b2d31] flex flex-col overflow-y-auto">
                <div className="p-5 border-b border-black/20 bg-[#232428]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20 border border-white/10">
                            <Bot size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-base">Agent Config</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Live</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 p-5 space-y-8">
                    {/* Model Config */}
                    <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4 block flex items-center gap-2"><Cpu size={14}/> Model Configuration</label>
                        <div className="space-y-5">
                            <div className="bg-[#1e1f22] p-1 rounded-lg border border-black/20 flex gap-1">
                                <button onClick={() => setModel('gemini-3-pro-preview')} className={`flex-1 py-1.5 text-xs font-bold rounded shadow-sm transition-colors ${model === 'gemini-3-pro-preview' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>Pro</button>
                                <button onClick={() => setModel('gemini-3-flash-preview')} className={`flex-1 py-1.5 text-xs font-bold rounded shadow-sm transition-colors ${model === 'gemini-3-flash-preview' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white'}`}>Flash</button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-bold text-zinc-400">
                                    <span className="flex items-center gap-1"><Thermometer size={12}/> Temperature</span> 
                                    <span className="text-white">{temp}</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" max="1" step="0.1" 
                                    value={temp}
                                    onChange={(e) => setTemp(parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500" 
                                />
                                <div className="flex justify-between text-[10px] text-zinc-600 font-bold uppercase">
                                    <span>Precise</span>
                                    <span>Creative</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* System Prompt */}
                    <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block flex items-center gap-2"><FileText size={14}/> System Directive</label>
                        <div className="relative">
                            <textarea 
                                className="w-full h-64 bg-[#1e1f22] border border-black/20 rounded-xl p-4 text-xs text-zinc-300 focus:outline-none focus:border-violet-500/50 resize-none font-mono leading-relaxed custom-scrollbar shadow-inner"
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Chat */}
            <div className="flex-1 flex flex-col bg-[#313338] relative">
                <div className="h-16 border-b border-black/20 flex items-center justify-between px-8 bg-[#2b2d31]/50 backdrop-blur-sm z-10">
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Interactive Preview</span>
                    <button onClick={() => setMessages([{ role: 'bot', content: 'Reset successful. Ready.' }])} className="text-zinc-400 hover:text-white flex items-center gap-2 text-xs font-bold hover:bg-white/5 px-3 py-1.5 rounded-lg transition-colors">
                        <RefreshCw size={14} /> Reset
                    </button>
                </div>
                
                <div className="flex-1 p-8 space-y-6 overflow-y-auto custom-scrollbar">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''} group`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${m.role === 'bot' ? 'bg-violet-600 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                {m.role === 'bot' ? <Bot size={20} /> : <UserIcon size={20} />}
                            </div>
                            <div className={`max-w-[70%] space-y-1`}>
                                <div className={`flex items-center gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <span className="text-xs font-bold text-zinc-400">{m.role === 'bot' ? 'Agent' : 'User'}</span>
                                </div>
                                <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm border ${
                                    m.role === 'user' 
                                    ? 'bg-zinc-700 text-white rounded-tr-none border-zinc-600' 
                                    : 'bg-[#232428] text-zinc-200 rounded-tl-none border-black/20'
                                }`}>
                                    {m.content}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex gap-4">
                             <div className="w-10 h-10 rounded-xl bg-violet-600/50 flex items-center justify-center animate-pulse"><Bot size={20}/></div>
                             <div className="text-xs text-zinc-500 self-center">Thinking...</div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-6 pt-2 pb-8">
                    <div className="bg-[#232428] rounded-2xl flex items-center p-2 pl-4 gap-3 border border-black/20 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all shadow-lg">
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Message your agent..."
                            className="flex-1 bg-transparent text-sm text-white px-2 focus:outline-none placeholder-zinc-600 py-2 font-medium"
                        />
                        <button onClick={handleSend} className="bg-violet-600 hover:bg-violet-500 text-white p-2.5 rounded-xl transition-colors shadow-md">
                            <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... (Rest of AppView.tsx components: WorkflowBoard, VisualWorkflowBuilder, CodeSandbox, etc. remain unchanged but included for completeness)
const WorkflowBoard = () => {
    const [columns, setColumns] = useState([
        { id: 'todo', title: 'To Do', tasks: [{ id: 't1', title: 'Design System', tag: 'Design', tagColor: 'bg-pink-500', assignee: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice' }] },
        { id: 'prog', title: 'Doing', tasks: [] },
        { id: 'done', title: 'Done', tasks: [] }
    ]);
    return (
        <div className="h-full bg-[#313338] overflow-x-auto p-6 flex gap-4 custom-scrollbar">
            {columns.map(col => (
                <div key={col.id} className="w-72 shrink-0 flex flex-col h-full bg-[#2b2d31] rounded-2xl border border-[#1e1f22] shadow-sm">
                    <div className="flex items-center justify-between p-4 border-b border-[#1e1f22]">
                        <h3 className="font-bold text-zinc-300 text-xs uppercase tracking-wider">{col.title}</h3>
                        <Plus size={16} className="text-zinc-500"/>
                    </div>
                    <div className="flex-1 p-3 space-y-3">
                        {col.tasks.map(t => (
                            <div key={t.id} className="bg-[#383a40] p-4 rounded-xl shadow-sm border border-[#1e1f22]">
                                <div className="text-[9px] font-bold text-white px-2 py-1 rounded bg-pink-500/20 mb-2 inline-block">{t.tag}</div>
                                <h4 className="text-sm font-bold text-white mb-2">{t.title}</h4>
                                <img src={t.assignee} className="w-6 h-6 rounded-full"/>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const VisualWorkflowBuilder = () => (
    <div className="h-full bg-[#313338] flex items-center justify-center relative overflow-hidden bg-[radial-gradient(#444cf7_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="text-center bg-[#1e1f22]/90 backdrop-blur-xl p-10 rounded-[2rem] border border-white/10 shadow-2xl">
            <GitBranch size={48} className="mx-auto text-zinc-500 mb-4" />
            <h3 className="text-white font-black text-2xl">Workflow Builder</h3>
            <p className="text-zinc-400 mt-2">Coming Soon.</p>
        </div>
    </div>
);

const ServerMonetizationView = () => (
    <div className="h-full bg-[#313338] p-8 flex flex-col gap-8 custom-scrollbar overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Total Revenue', 'Subscribers', 'Churn Rate'].map((l, i) => (
                <div key={i} className="bg-[#2b2d31] p-8 rounded-3xl border border-black/20 shadow-sm">
                    <p className="text-zinc-500 text-[10px] font-black uppercase">{l}</p>
                    <h2 className="text-4xl font-black text-white mt-2">{i === 0 ? '$12,450' : i === 1 ? '842' : '2.1%'}</h2>
                </div>
            ))}
        </div>
    </div>
);

const CodeSandbox = ({ name }: { name: string }) => (
    <div className="h-full bg-[#1e1f22] flex flex-col items-center justify-center text-zinc-500">
        <FileCode size={48} className="mb-4 text-zinc-700"/>
        <h3 className="text-zinc-400 font-bold">Code Sandbox: {name}</h3>
    </div>
);

const GenericIntegrationView = ({ appName }: { appName: string }) => (
    <div className="h-full bg-[#313338] flex items-center justify-center text-center p-8">
        <div>
            <Box size={48} className="mx-auto text-zinc-600 mb-4"/>
            <h1 className="text-2xl font-bold text-white">{appName}</h1>
            <p className="text-zinc-400 mt-2">Integration Active.</p>
        </div>
    </div>
);

const EmbeddedGameView = () => (
    <div className="h-full bg-black flex flex-col items-center justify-center text-zinc-500">
        <Gamepad2 size={48} className="mb-4 text-zinc-700" />
        <h3 className="text-zinc-400 font-bold">Game Canvas</h3>
        <p className="text-sm">Activity loading...</p>
    </div>
);