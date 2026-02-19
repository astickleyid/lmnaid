import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Briefcase,
  Activity,
  Store,
  Rocket,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Server,
  Layers,
  Zap,
} from 'lucide-react';
import { HeaderConfig } from '../types';

interface DeveloperConsoleProps {
  setHeader: (config: HeaderConfig) => void;
}

type SectionId = 'agents' | 'jobs' | 'events' | 'marketplace' | 'deployments' | 'streaming';

const sections: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'agents', label: 'Agent Registry', icon: <Bot size={16} /> },
  { id: 'jobs', label: 'Jobs', icon: <Briefcase size={16} /> },
  { id: 'events', label: 'Event Stream', icon: <Activity size={16} /> },
  { id: 'streaming', label: 'Streaming', icon: <Sparkles size={16} /> },
  { id: 'marketplace', label: 'Marketplace', icon: <Store size={16} /> },
  { id: 'deployments', label: 'Deployments', icon: <Rocket size={16} /> },
];

const cardData: Record<SectionId, { label: string; value: string; meta?: string; tone?: string }[]> = {
  agents: [
    { label: 'Active Agents', value: '14', meta: '4 idle' },
    { label: 'Models Online', value: '6', meta: 'All green' },
    { label: 'Avg Latency', value: '220ms', meta: '↓ 8%' },
    { label: 'Error Rate', value: '0.8%', meta: '24h' },
  ],
  jobs: [
    { label: 'Running Jobs', value: '8', meta: '2 critical' },
    { label: 'Queued Jobs', value: '24', meta: 'ETA 6m' },
    { label: 'Success Rate', value: '96.4%', meta: '24h' },
    { label: 'Avg Duration', value: '2m 14s', meta: 'p95' },
  ],
  events: [
    { label: 'Throughput', value: '1.2k/min', meta: 'steady' },
    { label: 'Subscribers', value: '42', meta: '+3 today' },
    { label: 'DLQ Size', value: '3', meta: 'needs review', tone: 'warn' },
    { label: 'Retry Rate', value: '1.3%', meta: 'stable' },
  ],
  marketplace: [
    { label: 'Installed Apps', value: '12', meta: '+1 this week' },
    { label: 'Pending Reviews', value: '4', meta: 'avg 2 days' },
    { label: 'Revenue', value: '$2.3k', meta: 'monthly' },
    { label: 'Featured', value: '3', meta: 'top picks' },
  ],
  deployments: [
    { label: 'Live Deployments', value: '5', meta: '2 staging' },
    { label: 'Pending', value: '2', meta: 'awaiting QA' },
    { label: 'Rollbacks', value: '1', meta: 'last 7d', tone: 'warn' },
    { label: 'Uptime', value: '99.9%', meta: '30d' },
  ],
  streaming: [
    { label: 'Active Streams', value: '0', meta: 'ready to start' },
    { label: 'AI Features', value: 'Ready', meta: 'WebLLM + MediaPipe' },
    { label: 'Protocols', value: 'WHIP + WebRTC', meta: 'dual mode' },
    { label: 'Latency', value: '<500ms', meta: 'P2P/SFU' },
  ],
};

const panelData: Record<SectionId, { title: string; items: { title: string; meta: string; status?: 'ok' | 'warn' | 'info' }[]; rightTitle: string; rightItems: { label: string; value: string; status?: 'ok' | 'warn' | 'info' }[] }> = {
  agents: {
    title: 'Registry Snapshot',
    items: [
      { title: 'Sentinel-02', meta: 'Guardrail checks • 1.2s avg', status: 'ok' },
      { title: 'Forge-17', meta: 'Build pipeline • 3 jobs queued', status: 'info' },
      { title: 'Relay-05', meta: 'Event router • 2.1k/min', status: 'ok' },
      { title: 'Atlas-09', meta: 'Indexer • 1 warning', status: 'warn' },
    ],
    rightTitle: 'Agent Health',
    rightItems: [
      { label: 'Healthy', value: '11', status: 'ok' },
      { label: 'Degraded', value: '2', status: 'warn' },
      { label: 'Offline', value: '1', status: 'info' },
    ],
  },
  jobs: {
    title: 'Recent Jobs',
    items: [
      { title: 'Inference Batch #4412', meta: 'Completed • 48s', status: 'ok' },
      { title: 'Vector Sync • Marketing', meta: 'Running • 62%', status: 'info' },
      { title: 'Webhook Replay • 19 events', meta: 'Queued • ETA 3m', status: 'info' },
      { title: 'Deploy Preview • v0.9.3', meta: 'Failed • Retry scheduled', status: 'warn' },
    ],
    rightTitle: 'Job Pools',
    rightItems: [
      { label: 'Core', value: '4 workers', status: 'ok' },
      { label: 'GPU', value: '2 workers', status: 'info' },
      { label: 'Batch', value: '3 workers', status: 'ok' },
    ],
  },
  events: {
    title: 'Stream Monitor',
    items: [
      { title: 'gateway.events', meta: '1.1k/min • 0.4s p95', status: 'ok' },
      { title: 'job.status', meta: '240/min • 0.9s p95', status: 'info' },
      { title: 'deploy.alerts', meta: '12/min • 2 retries', status: 'warn' },
    ],
    rightTitle: 'Subscribers',
    rightItems: [
      { label: 'Realtime UI', value: '14', status: 'ok' },
      { label: 'Webhooks', value: '18', status: 'info' },
      { label: 'Internal', value: '10', status: 'ok' },
    ],
  },
  marketplace: {
    title: 'Featured Apps',
    items: [
      { title: 'SignalBoost', meta: 'Analytics • 4.8★', status: 'ok' },
      { title: 'OpsKit', meta: 'Deployment Toolkit • 4.6★', status: 'info' },
      { title: 'AgentForge', meta: 'Agent Templates • 4.9★', status: 'ok' },
      { title: 'PulseBoard', meta: 'Event Dashboards • 4.3★', status: 'info' },
    ],
    rightTitle: 'Review Queue',
    rightItems: [
      { label: 'New Submissions', value: '4', status: 'info' },
      { label: 'Security Review', value: '2', status: 'warn' },
      { label: 'Approved', value: '7', status: 'ok' },
    ],
  },
  deployments: {
    title: 'Deploy Pipeline',
    items: [
      { title: 'nxcor-api@v0.9.3', meta: 'Staging • 62% tests', status: 'info' },
      { title: 'agent-router@v0.9.1', meta: 'Prod • Healthy', status: 'ok' },
      { title: 'marketplace@v0.8.8', meta: 'Rollback queued', status: 'warn' },
    ],
    rightTitle: 'Regions',
    rightItems: [
      { label: 'us-east', value: 'Green', status: 'ok' },
      { label: 'eu-west', value: 'Green', status: 'ok' },
      { label: 'ap-south', value: 'Degraded', status: 'warn' },
    ],
  },
  streaming: {
    title: 'AI Streaming Features',
    items: [
      { title: 'MediaPipe Face Tracking', meta: 'GPU-accelerated • 468 landmarks', status: 'ok' },
      { title: 'WebLLM Assistant', meta: 'Phi-3-mini • In-browser', status: 'ok' },
      { title: 'WHIP Protocol', meta: 'Standard WebRTC ingestion', status: 'ok' },
      { title: 'Hype Mode Detection', meta: 'Expression-based overlays', status: 'info' },
    ],
    rightTitle: 'Stream Modes',
    rightItems: [
      { label: 'Basic WebRTC', value: 'P2P/SFU', status: 'ok' },
      { label: 'Enhanced', value: 'AI + AR', status: 'info' },
      { label: 'WHIP', value: 'Optional', status: 'ok' },
    ],
  },
};

const statusDot = (status?: 'ok' | 'warn' | 'info') => {
  if (status === 'warn') return 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]';
  if (status === 'info') return 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]';
  return 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]';
};

export const DeveloperConsole: React.FC<DeveloperConsoleProps> = ({ setHeader }) => {
  const [activeSection, setActiveSection] = useState<SectionId>('agents');

  useEffect(() => {
    setHeader({
      title: 'Developer Console',
      subtitle: 'Operations command shell',
      variant: 'glass',
      showSearch: true,
    });
  }, [setHeader]);

  const cards = useMemo(() => cardData[activeSection], [activeSection]);
  const panels = useMemo(() => panelData[activeSection], [activeSection]);

  return (
    <div className="flex h-full bg-transparent text-zinc-100">
      <aside className="w-64 border-r border-white/5 bg-white/5 backdrop-blur-3xl p-4 shrink-0">
        <div className="mb-6 px-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Dev Console</div>
          <div className="text-xs text-zinc-400 mt-1">Live shell</div>
        </div>
        <div className="space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeSection === section.id
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              {section.icon}
              {section.label}
            </button>
          ))}
        </div>
      </aside>

      <section className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/40">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">{sections.find(s => s.id === activeSection)?.label}</div>
              <h2 className="text-2xl font-black text-white mt-1">Live Overview</h2>
              <p className="text-sm text-zinc-400 mt-1">Realtime status, metrics, and pipeline visibility.</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-emerald-300 font-black">Live</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {cards.map((card) => (
              <div key={card.label} className="nebula-glass p-6 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{card.label}</span>
                  {card.tone === 'warn' ? (
                    <AlertTriangle size={14} className="text-amber-400" />
                  ) : (
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  )}
                </div>
                <div className="text-3xl font-black text-white mt-3">{card.value}</div>
                {card.meta && <div className="text-xs text-zinc-400 mt-2">{card.meta}</div>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 nebula-glass rounded-3xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Layers size={18} className="text-primary" /> {panels.title}
                </h3>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Last 15m</div>
              </div>
              <div className="space-y-3">
                {panels.items.map((item) => (
                  <div key={item.title} className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusDot(item.status)}`} />
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{item.title}</div>
                      <div className="text-xs text-zinc-400">{item.meta}</div>
                    </div>
                    <Sparkles size={14} className="text-zinc-500" />
                  </div>
                ))}
              </div>
            </div>

            <div className="nebula-glass rounded-3xl p-6 border border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Server size={18} className="text-primary" /> {panels.rightTitle}
                </h3>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-black">Snapshot</div>
              </div>
              <div className="space-y-3">
                {panels.rightItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${statusDot(item.status)}`} />
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">{item.label}</span>
                    </div>
                    <span className="text-sm font-black text-white">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-indigo-500/10 border border-primary/20">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                  <Zap size={14} /> Immediate Actions
                </div>
                <div className="text-xs text-zinc-300 mt-2">Queue rollout, sync agents, or view deep logs.</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="nebula-glass p-5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest"><Users size={14} /> Operator Notes</div>
              <p className="text-sm text-zinc-300 mt-3">Keep eyes on the rollout window and agent registry sync every 30m.</p>
            </div>
            <div className="nebula-glass p-5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest"><Clock size={14} /> Next Milestone</div>
              <p className="text-sm text-zinc-300 mt-3">Marketplace refresh scheduled in 2 hours.</p>
            </div>
            <div className="nebula-glass p-5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest"><CheckCircle2 size={14} /> System Pulse</div>
              <p className="text-sm text-zinc-300 mt-3">All core services reporting stable. No critical alerts.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
