import React, { useState, useEffect } from 'react';
import { Book, ChevronRight, ChevronDown, Copy, Code, Zap, Database, Globe, Shield, PanelLeftClose, PanelLeft, Lock, Webhook, Play, Gamepad2, Layout, CreditCard, Box, X } from 'lucide-react';
import { HeaderConfig } from '../types';

interface DocSection {
  id: string;
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  subSections?: DocSection[];
}

interface DocViewerProps {
    onClose: () => void;
    setHeader: (config: HeaderConfig) => void;
}

const CodeBlock = ({ code, language = 'typescript' }: { code: string, language?: string }) => (
  <div className="my-4 rounded-lg overflow-hidden border border-zinc-800 bg-[#0d0d0d]">
    <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-800">
      <span className="text-[10px] text-zinc-500 font-mono uppercase">{language}</span>
      <button className="text-zinc-500 hover:text-white"><Copy size={12} /></button>
    </div>
    <div className="p-3 overflow-x-auto">
      <pre className="font-mono text-xs text-zinc-300 leading-relaxed">
        {code}
      </pre>
    </div>
  </div>
);

// --- API Playground Component ---
const ApiPlayground = () => {
    const [method, setMethod] = useState('GET');
    const [endpoint, setEndpoint] = useState('/users/me');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);

    const handleRun = () => {
        setIsLoading(true);
        setResponse(null);
        
        // Simulate network request
        setTimeout(() => {
            let mockResponse = {};
            if (endpoint.includes('users/me')) {
                mockResponse = { id: 'u_123', username: 'dev_user', roles: ['admin'] };
            } else if (endpoint.includes('messages') && method === 'POST') {
                mockResponse = { id: 'msg_999', content: 'Hello World', timestamp: new Date().toISOString() };
            } else {
                 mockResponse = { status: 200, message: 'OK' };
            }
            setResponse(JSON.stringify(mockResponse, null, 2));
            setIsLoading(false);
        }, 800);
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-8">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Zap size={16} className="text-yellow-500" /> API Playground
            </h3>
            
            <div className="flex gap-2 mb-4">
                <select 
                    value={method} 
                    onChange={e => setMethod(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:border-violet-600 focus:outline-none font-mono font-bold"
                >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                </select>
                <input 
                    type="text" 
                    value={endpoint}
                    onChange={e => setEndpoint(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:border-violet-600 focus:outline-none font-mono"
                />
                <button 
                    onClick={handleRun}
                    disabled={isLoading}
                    className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {isLoading ? '...' : <Play size={14} fill="currentColor" />}
                    Run
                </button>
            </div>

            {method === 'POST' && (
                <div className="mb-4">
                    <div className="text-xs text-zinc-500 mb-1 font-bold">REQUEST BODY</div>
                    <textarea 
                        className="w-full h-24 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-300 font-mono text-xs focus:border-violet-600 focus:outline-none resize-none"
                        defaultValue={`{\n  "content": "Hello World"\n}`}
                    />
                </div>
            )}

            {response && (
                <div className="animate-fade-in">
                    <div className="text-xs text-green-500 mb-1 font-bold flex justify-between">
                        <span>RESPONSE 200 OK</span>
                        <span className="text-zinc-600">800ms</span>
                    </div>
                    <div className="bg-black/50 border border-zinc-800 rounded-lg p-3 overflow-x-auto">
                        <pre className="text-xs text-green-400 font-mono">
                            {response}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export const DocViewer: React.FC<DocViewerProps> = ({ onClose, setHeader }) => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'api-ref': true,
    'guides': true,
    'advanced': true,
    'platform': true
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
      setHeader({
          title: 'Documentation',
          variant: 'glass',
          showSearch: true
      });
  }, [setHeader]);

  const toggleMenu = (id: string) => {
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const DOCS_DATA: DocSection[] = [
    {
      id: 'getting-started',
      title: 'Introduction',
      icon: <Globe size={16} />,
      content: (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">nXcor Developer Platform</h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Build powerful social apps, automated agents, games, and workflow integrations directly on top of the nXcor Server architecture.
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="w-8 h-8 rounded bg-violet-500/10 text-violet-400 flex items-center justify-center mb-3"><Gamepad2 size={18} /></div>
              <h3 className="text-white font-bold mb-1">Activities</h3>
              <p className="text-sm text-zinc-500">Embed HTML5 games directly into voice channels.</p>
            </div>
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="w-8 h-8 rounded bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3"><Layout size={18} /></div>
              <h3 className="text-white font-bold mb-1">UI Kit</h3>
              <p className="text-sm text-zinc-500">Build rich interactive interfaces with buttons & forms.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'activities',
      title: 'Activities SDK',
      icon: <Gamepad2 size={16} />,
      content: (
        <div className="space-y-6">
           <h1 className="text-2xl font-bold text-white">Activities SDK</h1>
           <p className="text-zinc-400">Build multiplayer games and apps that run natively inside nXcor voice channels using HTML5 Canvas or WebGL.</p>

           <h3 className="text-lg font-bold text-white mt-4">Initialization</h3>
           <CodeBlock code={`import { nXcorActivity } from '@nxcor/activities';

const activity = new nXcorActivity();

await activity.ready();
console.log('User:', activity.user);`} />

            <h3 className="text-lg font-bold text-white mt-4">Networking (RPC)</h3>
            <p className="text-zinc-400 text-sm">Send data between participants in the same activity session.</p>
            <CodeBlock code={`// Send payload
activity.dispatch({ type: 'MOVE', x: 100, y: 200 });

// Listen for payloads
activity.on('dispatch', (payload) => {
  if (payload.type === 'MOVE') {
      updatePlayerPosition(payload.userId, payload.x, payload.y);
  }
});`} />
        </div>
      )
    },
    {
      id: 'ui-kit',
      title: 'UI Kit',
      icon: <Layout size={16} />,
      content: (
        <div className="space-y-6">
           <h1 className="text-2xl font-bold text-white">UI Builder Engine</h1>
           <p className="text-zinc-400">Create complex dashboards and interactive forms without writing frontend code. Our layout engine handles responsiveness and theming automatically.</p>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
               <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
                   <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Database size={16} className="text-violet-500"/> Data Binding</h3>
                   <p className="text-sm text-zinc-400 mb-3">Connect your UI components directly to your API response data using mustache syntax.</p>
                   <code className="bg-black px-2 py-1 rounded text-violet-400 text-xs font-mono">{"{{ api.users.total_count }}"}</code>
               </div>
               <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
                   <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Box size={16} className="text-blue-500"/> JSON Schema</h3>
                   <p className="text-sm text-zinc-400 mb-3">Export your layout as a declarative JSON object to store on your server or version control.</p>
                   <code className="bg-black px-2 py-1 rounded text-blue-400 text-xs font-mono">{"[ { \"type\": \"chart\", ... } ]"}</code>
               </div>
           </div>

           <h3 className="text-lg font-bold text-white mt-4">Supported Components</h3>
           <ul className="list-disc list-inside text-zinc-400 space-y-2">
               <li><strong>Charts:</strong> Line and Bar charts for visualizing analytics.</li>
               <li><strong>Data Tables:</strong> Render rows of data from arrays.</li>
               <li><strong>Stat Cards:</strong> Highlight key performance indicators (KPIs).</li>
               <li><strong>Forms:</strong> Inputs, Toggles, Select Menus, and Buttons.</li>
           </ul>

           <h3 className="text-lg font-bold text-white mt-4">Schema Example</h3>
           <CodeBlock language="json" code={`[
  {
    "id": "row_1",
    "type": "row",
    "children": [
      {
        "type": "stat-card",
        "props": { "label": "Revenue", "value": "$50k" },
        "dataBinding": "{{ api.revenue.current }}"
      },
      {
        "type": "chart",
        "props": { "type": "line", "title": "Growth" }
      }
    ]
  }
]`} />
        </div>
      )
    },
    {
        id: 'monetization',
        title: 'Monetization',
        icon: <CreditCard size={16} />,
        content: (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-white">App Subscriptions</h1>
                <p className="text-zinc-400">Monetize your premium bot features with native subscriptions.</p>

                <h3 className="text-lg font-bold text-white mt-4">Checking Entitlements</h3>
                <CodeBlock code={`const entitlements = await client.rest.get(\`/applications/\${appId}/entitlements\`);

const hasPremium = entitlements.some(e => 
  e.user_id === userId && e.sku_id === PREMIUM_SKU_ID
);

if (!hasPremium) {
  return message.reply("This command requires a Premium Subscription.");
}`} />
            </div>
        )
    },
    {
      id: 'client-api',
      title: 'Client API',
      icon: <Code size={16} />,
      content: (
        <div className="space-y-8">
           <div>
              <h1 className="text-2xl font-bold text-white mb-2">Client Interface</h1>
              <p className="text-zinc-400 mb-6">The main entry point for interacting with the nXcor API.</p>

              <ApiPlayground />
           </div>
        </div>
      )
    }
  ];

  const activeContent = DOCS_DATA.find(d => d.id === activeSection)?.content;

  return (
    <div className="flex h-full bg-zinc-950 w-full transition-all duration-300">
      {/* Collapsible Sidebar */}
      <div className={`${isSidebarOpen ? 'w-48' : 'w-12'} hidden md:flex bg-zinc-950 border-r border-zinc-800 flex-col transition-all duration-300 ease-in-out`}>
         <div className="h-12 flex items-center justify-between px-3 border-b border-zinc-800">
            {isSidebarOpen && <span className="text-xs font-bold text-white uppercase tracking-wider">Docs</span>}
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-zinc-500 hover:text-white ml-auto">
               {isSidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeft size={14} className="mx-auto" />}
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-2">
            {/* Guides Section */}
             <div className="mb-4">
                {isSidebarOpen ? (
                    <div 
                        onClick={() => toggleMenu('guides')}
                        className="flex items-center justify-between px-2 py-1.5 text-xs font-bold text-zinc-400 uppercase cursor-pointer hover:text-zinc-200"
                    >
                        Guides
                        <ChevronDown size={12} className={`transform transition-transform ${expandedMenus['guides'] ? '' : '-rotate-90'}`} />
                    </div>
                ) : (
                    <div className="flex justify-center mb-2 text-zinc-500"><Book size={14} /></div>
                )}
                
                {isSidebarOpen && expandedMenus['guides'] && (
                    <div className="space-y-0.5 mt-1 ml-1 border-l border-zinc-800 pl-1">
                        <button 
                            onClick={() => setActiveSection('getting-started')}
                            className={`w-full text-left px-2 py-1.5 text-sm rounded ${activeSection === 'getting-started' ? 'bg-violet-600/10 text-violet-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
                        >
                            Getting Started
                        </button>
                    </div>
                )}
            </div>

            {/* Platform Section */}
            <div className="mb-4">
                {isSidebarOpen ? (
                     <div 
                        onClick={() => toggleMenu('platform')}
                        className="flex items-center justify-between px-2 py-1.5 text-xs font-bold text-zinc-400 uppercase cursor-pointer hover:text-zinc-200"
                    >
                        Platform
                        <ChevronDown size={12} className={`transform transition-transform ${expandedMenus['platform'] ? '' : '-rotate-90'}`} />
                    </div>
                 ) : (
                    <div className="flex justify-center mb-2 text-zinc-500"><Gamepad2 size={14} /></div>
                 )}

                 {isSidebarOpen && expandedMenus['platform'] && (
                    <div className="space-y-0.5 mt-1 ml-1 border-l border-zinc-800 pl-1">
                        <button 
                             onClick={() => setActiveSection('activities')}
                             className={`w-full text-left px-2 py-1.5 text-sm rounded ${activeSection === 'activities' ? 'bg-violet-600/10 text-violet-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
                        >
                            Activities SDK
                        </button>
                        <button 
                             onClick={() => setActiveSection('ui-kit')}
                             className={`w-full text-left px-2 py-1.5 text-sm rounded ${activeSection === 'ui-kit' ? 'bg-violet-600/10 text-violet-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
                        >
                            UI Builder Engine
                        </button>
                        <button 
                             onClick={() => setActiveSection('monetization')}
                             className={`w-full text-left px-2 py-1.5 text-sm rounded ${activeSection === 'monetization' ? 'bg-violet-600/10 text-violet-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
                        >
                            Monetization
                        </button>
                    </div>
                )}
            </div>

            {/* API Ref Section */}
            <div className="mb-4">
                 {isSidebarOpen ? (
                     <div 
                        onClick={() => toggleMenu('api-ref')}
                        className="flex items-center justify-between px-2 py-1.5 text-xs font-bold text-zinc-400 uppercase cursor-pointer hover:text-zinc-200"
                    >
                        API Reference
                        <ChevronDown size={12} className={`transform transition-transform ${expandedMenus['api-ref'] ? '' : '-rotate-90'}`} />
                    </div>
                 ) : (
                    <div className="flex justify-center mb-2 text-zinc-500"><Code size={14} /></div>
                 )}
                
                {isSidebarOpen && expandedMenus['api-ref'] && (
                    <div className="space-y-0.5 mt-1 ml-1 border-l border-zinc-800 pl-1">
                        <button 
                             onClick={() => setActiveSection('client-api')}
                             className={`w-full text-left px-2 py-1.5 text-sm rounded ${activeSection === 'client-api' ? 'bg-violet-600/10 text-violet-400' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'}`}
                        >
                            Client API
                        </button>
                    </div>
                )}
            </div>
         </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
         <div className="flex-1 overflow-y-auto p-6 bg-zinc-900 custom-scrollbar">
             {activeContent}
         </div>
      </div>
    </div>
  );
};