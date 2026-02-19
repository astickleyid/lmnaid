import React, { useState, useEffect, useRef } from 'react';
import { 
    X, Terminal, Key, Webhook, Settings, Activity, List, Upload, AlertTriangle, 
    User, Copy, Plus, Check, Layout, Shield, RefreshCw, Eye, EyeOff, Trash2, 
    Zap, BarChart2, Server, Globe, Box, Layers, Code, Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DevApp, HeaderConfig, MCPServerConfig, UiComponent, ApiKey } from '../types';

interface DeveloperPortalProps {
  onClose: () => void;
  setHeader: (config: HeaderConfig) => void;
}

interface WebhookItem {
    id: string;
    url: string;
    events: string[];
    active: boolean;
}

// --- Mock Data with Advanced Features ---
const MOCK_UI_LAYOUT: UiComponent[] = [
    {
        id: 'row_1',
        type: 'row',
        props: { gap: 4 },
        children: [
            { id: 'stat_1', type: 'stat-card', props: { label: 'Active Users', value: '1,240', trend: '+12%' } },
            { id: 'stat_2', type: 'stat-card', props: { label: 'Revenue', value: '$42k', trend: '+5%' } }
        ]
    },
    {
        id: 'chart_1',
        type: 'chart',
        props: { title: 'Traffic Over Time', type: 'line', height: 300 }
    }
];

const MOCK_APPS: DevApp[] = [
    {
        id: 'app_1',
        name: 'Hub Core',
        description: 'Primary moderation and utility bot for the main network.',
        appId: '123456789',
        publicKey: 'pub_key_xyz_live_v1',
        clientId: 'client_id_abc',
        clientSecret: 'sec_8f9299a8b...',
        botToken: 'bot_tkn_77a8...',
        interactionsEndpoint: 'https://api.hubcore.io/interactions',
        verificationToken: 'ver_998877',
        isPublic: false,
        ownerId: 'u1',
        created: '2023-01-01',
        mcpServers: [
            { id: 'mcp_1', name: 'Knowledge Base', endpoint: 'https://mcp.hubcore.io/docs', transport: 'sse', status: 'active' },
            { id: 'mcp_2', name: 'Local Tools', endpoint: 'stdio://tools.py', transport: 'stdio', status: 'inactive' }
        ],
        uiLayout: MOCK_UI_LAYOUT,
        apiKeys: [
            { id: 'key_1', name: 'Read Only', prefix: 'pk_live_r', scopes: ['read:users', 'read:channels'], lastUsed: '2 mins ago', created: '2023-05-20' },
            { id: 'key_2', name: 'Admin Key', prefix: 'sk_live_a', scopes: ['*'], lastUsed: '1 day ago', created: '2023-01-02' }
        ]
    },
    {
        id: 'app_2',
        name: 'Analytics API',
        description: 'Real-time telemetry and user metrics aggregator.',
        appId: '987654321',
        publicKey: 'pub_key_123_test_v2',
        clientId: 'client_id_456',
        clientSecret: 'sec_1a2b3c4d...',
        botToken: 'bot_tkn_99x1...',
        isPublic: true,
        ownerId: 'u1',
        created: '2023-02-15'
    }
];

// --- Sub-components ---

const UiComponentRenderer = ({ component }: { component: UiComponent }) => {
    switch (component.type) {
        case 'row':
            return (
                <div className="flex gap-4 mb-4">
                    {component.children?.map(c => <UiComponentRenderer key={c.id} component={c} />)}
                </div>
            );
        case 'stat-card':
            return (
                <div className="bg-zinc-800 p-4 rounded-xl border border-white/5 flex-1 min-w-[200px]">
                    <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">{component.props.label}</div>
                    <div className="flex items-end justify-between">
                        <div className="text-2xl font-black text-white">{component.props.value}</div>
                        <div className="text-green-400 text-xs font-bold bg-green-400/10 px-2 py-1 rounded">{component.props.trend}</div>
                    </div>
                </div>
            );
        case 'chart':
            return (
                <div className="bg-zinc-800 p-4 rounded-xl border border-white/5 w-full h-48 flex flex-col items-center justify-center text-zinc-600">
                    <BarChart2 size={32} className="mb-2 opacity-50" />
                    <span className="text-xs font-bold uppercase">{component.props.title} Preview</span>
                </div>
            );
        default:
            return <div className="p-2 border border-dashed border-zinc-700 rounded text-zinc-500 text-xs">Unknown Component</div>;
    }
};

export const DeveloperPortal: React.FC<DeveloperPortalProps> = ({ onClose, setHeader }) => {
    const [apps, setApps] = useState<DevApp[]>(MOCK_APPS);
    const [selectedAppId, setSelectedAppId] = useState<string>(MOCK_APPS[0].id);
    const [activeTab, setActiveTab] = useState<'overview' | 'auth' | 'keys' | 'mcp' | 'ui' | 'webhooks' | 'settings'>('overview');
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
    
    // Webhook State
    const [webhooks, setWebhooks] = useState<WebhookItem[]>([
        { id: 'wh_1', url: 'https://api.mysite.com/events', events: ['message.create', 'interaction.create'], active: true }
    ]);
    const [newWebhookUrl, setNewWebhookUrl] = useState('');

    // Live Logs State
    const [logs, setLogs] = useState<{id: string, method: string, path: string, status: number, time: string}[]>([]);
    const logIntervalRef = useRef<any>(null);

    const selectedApp = apps.find(a => a.id === selectedAppId) || apps[0];

    useEffect(() => {
        setHeader({
            title: 'Developer Console',
            subtitle: selectedApp.name,
            variant: 'glass',
            showSearch: false
        });
    }, [selectedApp, setHeader]);

    // Simulate Live Logs
    useEffect(() => {
        if (activeTab === 'overview') {
            logIntervalRef.current = setInterval(() => {
                const methods = ['GET', 'POST', 'PUT', 'DELETE'];
                const paths = ['/api/v1/users', '/gateway/events', '/api/v1/guilds', '/auth/callback', '/interactions'];
                const statuses = [200, 200, 200, 201, 204, 400, 401, 404, 500];
                const newLog = {
                    id: Math.random().toString(36),
                    method: methods[Math.floor(Math.random() * methods.length)],
                    path: paths[Math.floor(Math.random() * paths.length)],
                    status: statuses[Math.floor(Math.random() * statuses.length)],
                    time: new Date().toLocaleTimeString([], { hour12: false })
                };
                setLogs(prev => [newLog, ...prev].slice(0, 15));
            }, 1500);
        } else {
            if (logIntervalRef.current) clearInterval(logIntervalRef.current);
        }
        return () => { if (logIntervalRef.current) clearInterval(logIntervalRef.current); };
    }, [activeTab]);

    const handleCopy = (text: string, fieldId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const toggleSecret = (field: string) => {
        setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const regenerateToken = (field: 'clientSecret' | 'botToken') => {
        const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const prefix = field === 'clientSecret' ? 'sec_' : 'bot_tkn_';
        const newValue = `${prefix}${randomString}`;
        setApps(prev => prev.map(a => a.id === selectedAppId ? { ...a, [field]: newValue } : a));
    };

    const handleUpdateApp = (field: keyof DevApp, value: any) => {
        setApps(prev => prev.map(a => a.id === selectedAppId ? { ...a, [field]: value } : a));
    };

    return (
        <div className="flex flex-col h-full bg-transparent text-zinc-100 animate-fade-in relative">
            <div className="flex flex-1 overflow-hidden">
                {/* Navigation Sidebar */}
                <div className="w-60 bg-white/5 backdrop-blur-3xl border-r border-white/5 flex flex-col p-4 shrink-0 z-0">
                     <div className="flex items-center justify-between mb-4 px-2">
                         <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Applications</span>
                         <Plus size={14} className="text-zinc-500 hover:text-white cursor-pointer" />
                     </div>
                     <div className="space-y-1 mb-8">
                         {apps.map(app => (
                             <button
                                key={app.id}
                                onClick={() => setSelectedAppId(app.id)}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-3 ${selectedAppId === app.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
                             >
                                 <div className={`w-2 h-2 rounded-full ${selectedAppId === app.id ? 'bg-white' : 'bg-zinc-600'}`}></div>
                                 {app.name}
                             </button>
                         ))}
                     </div>

                     <div className="flex items-center mb-4 px-2">
                         <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Configure</span>
                     </div>
                     <div className="space-y-1">
                         {[
                             { id: 'overview', label: 'Dashboard', icon: <Activity size={16} /> },
                             { id: 'auth', label: 'Auth & Tokens', icon: <Key size={16} /> },
                             { id: 'keys', label: 'API Keys', icon: <Shield size={16} /> },
                             { id: 'mcp', label: 'MCP Servers', icon: <Server size={16} /> },
                             { id: 'ui', label: 'UI Builder', icon: <Layout size={16} /> },
                             { id: 'webhooks', label: 'Webhooks', icon: <Webhook size={16} /> },
                             { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
                         ].map(item => (
                             <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all flex items-center gap-3 ${activeTab === item.id ? 'bg-white/10 text-white border border-white/5' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
                             >
                                 {item.icon}
                                 {item.label}
                             </button>
                         ))}
                     </div>
                </div>

                {/* Main Content Pane */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/40">
                     <AnimatePresence mode='wait'>
                     {activeTab === 'overview' && (
                         <motion.div 
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-5xl mx-auto space-y-6"
                         >
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="nebula-glass rounded-2xl p-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="p-2.5 bg-green-500/10 text-green-500 rounded-xl border border-green-500/10"><Activity size={18} /></div>
                                        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Requests</span>
                                    </div>
                                    <div className="text-3xl font-black text-white">4.2M <span className="text-[10px] font-medium text-zinc-500 ml-1">/ 24h</span></div>
                                </div>
                                {/* ... (Stats repeated from previous implementation) ... */}
                            </div>

                            {/* Live Logs */}
                            <div className="nebula-glass rounded-[2rem] p-8 min-h-[400px]">
                                <div className="flex items-center justify-between mb-6">
                                   <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-3"><List size={18} className="text-primary"/> Live Log Stream</h3>
                                   <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                                       <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                       <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Listening</span>
                                   </div>
                                </div>
                                <div className="space-y-1 font-mono text-xs">
                                    <div className="flex text-zinc-500 border-b border-white/5 pb-2 mb-2 px-2 uppercase font-bold text-[10px] tracking-wider">
                                        <div className="w-24">Timestamp</div>
                                        <div className="w-20">Method</div>
                                        <div className="w-20">Status</div>
                                        <div className="flex-1">Path</div>
                                    </div>
                                    <AnimatePresence>
                                        {logs.map((log) => (
                                            <motion.div 
                                                key={log.id} 
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0 }}
                                                className="flex items-center hover:bg-white/5 py-2 px-2 rounded-lg transition-colors border-l-2 border-transparent hover:border-primary"
                                            >
                                                <div className="w-24 text-zinc-600">{log.time}</div>
                                                <div className={`w-20 font-bold ${
                                                    log.method === 'GET' ? 'text-blue-400' : 
                                                    log.method === 'POST' ? 'text-green-400' : 
                                                    log.method === 'DELETE' ? 'text-red-400' : 'text-yellow-400'
                                                }`}>{log.method}</div>
                                                <div className={`w-20 font-bold ${log.status >= 500 ? 'text-red-500' : log.status >= 400 ? 'text-orange-400' : 'text-green-500'}`}>{log.status}</div>
                                                <div className="flex-1 text-zinc-300 truncate">{log.path}</div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                         </motion.div>
                     )}

                     {activeTab === 'auth' && (
                         <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-8">
                             {/* Standard Credentials UI */}
                             <div className="nebula-glass p-8 rounded-2xl space-y-6">
                                 <h3 className="text-lg font-bold text-white mb-4">Core Credentials</h3>
                                 <div>
                                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Public Key</label>
                                     <div className="flex gap-3">
                                         <div className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-zinc-300 font-mono text-xs truncate">
                                             {selectedApp.publicKey}
                                         </div>
                                         <button onClick={() => handleCopy(selectedApp.publicKey, 'pubkey')} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white"><Copy size={18} /></button>
                                     </div>
                                 </div>
                                 {/* Client Secret */}
                                 <div>
                                     <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Client Secret</label>
                                        <button onClick={() => regenerateToken('clientSecret')} className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase flex items-center gap-1 border border-red-500/20 px-2 py-1 rounded bg-red-500/10">
                                            <RefreshCw size={12} /> Regenerate
                                        </button>
                                     </div>
                                     <div className="flex gap-3">
                                         <div className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-zinc-300 font-mono text-xs truncate relative flex items-center">
                                             {showSecrets['secret'] ? selectedApp.clientSecret : '•'.repeat(45)}
                                             <button onClick={() => toggleSecret('secret')} className="absolute right-3 text-zinc-500 hover:text-white">
                                                 {showSecrets['secret'] ? <EyeOff size={16} /> : <Eye size={16} />}
                                             </button>
                                         </div>
                                         <button onClick={() => handleCopy(selectedApp.clientSecret, 'secret')} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white"><Copy size={18} /></button>
                                     </div>
                                 </div>
                             </div>
                         </motion.div>
                     )}

                     {activeTab === 'keys' && (
                         <motion.div key="keys" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
                             <div className="flex justify-between items-center mb-6">
                                 <div>
                                     <h3 className="text-2xl font-black text-white">API Keys</h3>
                                     <p className="text-zinc-400 text-sm">Manage granular access tokens for your application.</p>
                                 </div>
                                 <button className="btn btn-primary px-6 py-2 text-xs font-black uppercase tracking-widest">Generate New Key</button>
                             </div>

                             <div className="space-y-4">
                                 {selectedApp.apiKeys?.map(key => (
                                     <div key={key.id} className="nebula-glass p-6 rounded-2xl flex items-center justify-between border border-white/5 hover:border-primary/30 transition-all">
                                         <div>
                                             <div className="flex items-center gap-3 mb-2">
                                                 <span className="font-bold text-white">{key.name}</span>
                                                 <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded font-mono">{key.prefix}••••</span>
                                             </div>
                                             <div className="flex gap-2">
                                                 {key.scopes.map(scope => (
                                                     <span key={scope} className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded border border-blue-500/20 font-bold uppercase tracking-wider">{scope}</span>
                                                 ))}
                                             </div>
                                         </div>
                                         <div className="text-right">
                                             <div className="text-xs text-zinc-500 mb-1">Last used: <span className="text-white">{key.lastUsed}</span></div>
                                             <div className="text-[10px] text-zinc-600">Created: {key.created}</div>
                                         </div>
                                         <button className="ml-4 p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                                             <Trash2 size={18} />
                                         </button>
                                     </div>
                                 ))}
                             </div>
                         </motion.div>
                     )}

                     {activeTab === 'mcp' && (
                         <motion.div key="mcp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
                             <div className="bg-gradient-to-r from-violet-600/20 to-indigo-600/20 border border-violet-500/20 rounded-2xl p-6 flex items-start gap-4">
                                 <Server className="text-violet-400 shrink-0" size={24} />
                                 <div>
                                     <h3 className="text-violet-400 font-bold mb-1 text-sm uppercase tracking-wide">Model Context Protocol</h3>
                                     <p className="text-xs text-zinc-400 leading-relaxed">Connect your app to external data and tools using MCP. These servers will be available to the AI context.</p>
                                 </div>
                             </div>

                             <div className="grid grid-cols-1 gap-4">
                                 {selectedApp.mcpServers?.map(server => (
                                     <div key={server.id} className="nebula-glass p-6 rounded-2xl flex items-center justify-between group">
                                         <div className="flex items-center gap-4">
                                             <div className={`w-3 h-3 rounded-full ${server.status === 'active' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-600'}`}></div>
                                             <div>
                                                 <h4 className="font-bold text-white text-sm mb-1">{server.name}</h4>
                                                 <div className="flex items-center gap-2">
                                                     <span className="text-xs font-mono text-zinc-500 bg-black/30 px-2 py-0.5 rounded border border-white/5">{server.endpoint}</span>
                                                     <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 bg-white/5 px-2 py-0.5 rounded">{server.transport}</span>
                                                 </div>
                                             </div>
                                         </div>
                                         <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                             <button className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white"><RefreshCw size={16}/></button>
                                             <button className="p-2 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-red-400"><Trash2 size={16}/></button>
                                         </div>
                                     </div>
                                 ))}
                                 
                                 <button className="border border-dashed border-zinc-700 hover:border-zinc-500 rounded-2xl p-6 flex items-center justify-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors">
                                     <Plus size={20} /> Add MCP Server
                                 </button>
                             </div>
                         </motion.div>
                     )}

                     {activeTab === 'ui' && (
                         <motion.div key="ui" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                             <div className="flex items-center justify-between mb-6">
                                 <div>
                                     <h3 className="text-2xl font-black text-white">UI Builder</h3>
                                     <p className="text-zinc-400 text-sm">Design visual interfaces for your app.</p>
                                 </div>
                                 <div className="flex gap-2">
                                     <button className="bg-zinc-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-zinc-700 flex items-center gap-2"><Code size={14}/> JSON</button>
                                     <button className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-primary-hover flex items-center gap-2"><Play size={14}/> Preview</button>
                                 </div>
                             </div>

                             <div className="flex-1 flex gap-6 min-h-0">
                                 {/* Tree View */}
                                 <div className="w-64 bg-black/20 border border-white/5 rounded-2xl p-4 overflow-y-auto">
                                     <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Component Tree</div>
                                     <div className="space-y-2">
                                         {selectedApp.uiLayout?.map(comp => (
                                             <div key={comp.id} className="pl-2">
                                                 <div className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white cursor-pointer py-1">
                                                     <Box size={14} className="text-zinc-500"/> {comp.type}
                                                 </div>
                                                 {comp.children && (
                                                     <div className="pl-4 border-l border-white/10 ml-1.5 mt-1 space-y-1">
                                                         {comp.children.map(child => (
                                                             <div key={child.id} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white cursor-pointer py-0.5">
                                                                 <Box size={12} className="text-zinc-600"/> {child.type}
                                                             </div>
                                                         ))}
                                                     </div>
                                                 )}
                                             </div>
                                         ))}
                                     </div>
                                 </div>

                                 {/* Canvas */}
                                 <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl p-8 overflow-y-auto relative">
                                     <div className="absolute top-0 left-0 right-0 h-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                                     <div className="space-y-4">
                                         {selectedApp.uiLayout?.map(comp => (
                                             <UiComponentRenderer key={comp.id} component={comp} />
                                         ))}
                                     </div>
                                 </div>
                             </div>
                         </motion.div>
                     )}

                     {activeTab === 'settings' && (
                         <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-8">
                             <div className="space-y-6">
                                 <div>
                                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Interactions Endpoint URL</label>
                                     <input 
                                        type="text" 
                                        value={selectedApp.interactionsEndpoint || ''}
                                        onChange={(e) => handleUpdateApp('interactionsEndpoint', e.target.value)}
                                        placeholder="https://api.myapp.com/interactions"
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-all font-mono text-sm"
                                     />
                                 </div>
                                 <div>
                                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 block">Verification Token</label>
                                     <input 
                                        type="text" 
                                        value={selectedApp.verificationToken || ''}
                                        onChange={(e) => handleUpdateApp('verificationToken', e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-primary transition-all font-mono text-sm"
                                     />
                                 </div>
                             </div>
                             <div className="pt-8 border-t border-white/5">
                                 <h3 className="text-red-400 font-bold mb-4 uppercase text-xs tracking-widest">Danger Zone</h3>
                                 <button className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                     Delete App
                                 </button>
                             </div>
                         </motion.div>
                     )}
                     </AnimatePresence>
                </div>
            </div>
        </div>
    );
};