// src/App.tsx
import React, { useCallback } from 'react';
import {
  Shield,
  Cpu,
  Layers,
  Code,
  Globe,
  Settings,
  Database,
  AlertTriangle,
  PanelLeftClose,
  PanelLeft,
  Briefcase,
  Network,
  ShieldCheck,
  Map,
  LayoutDashboard,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SidebarItem } from './components/primitives';
import { ModeToggle, type Mode } from './components/ModeToggle';
import { useLocalStorage } from './hooks/useLocalStorage';
import {
  ExecSummaryView,
  ExecArchitectureView,
  ExecSecurityView,
  ExecRoadmapView,
} from './components/exec';
import {
  EngOverviewView,
  SandboxView,
  EnforcementView,
  GovernanceImplView,
  ExtensibilityView,
  OpsView,
} from './components/eng';

type ExecTabId = 'summary' | 'architecture' | 'security' | 'roadmap';
type EngTabId =
  | 'overview'
  | 'sandbox'
  | 'governance'
  | 'enforcement'
  | 'extensibility'
  | 'ops';

interface SubSection {
  id: string;
  label: string;
}

const execMenu: {
  id: ExecTabId;
  label: string;
  icon: LucideIcon;
  sections?: SubSection[];
}[] = [
  {
    id: 'summary',
    label: 'Summary',
    icon: Briefcase,
    sections: [
      { id: 'summary-problem', label: 'Problem Today' },
      { id: 'summary-horizon', label: 'Scaling Horizon' },
      { id: 'summary-requirements', label: 'Design Requirements' },
      { id: 'summary-nist', label: 'NIST Pattern' },
      { id: 'summary-action', label: 'Governance in Action' },
      { id: 'summary-value', label: 'Value Proposition' },
    ],
  },
  {
    id: 'architecture',
    label: 'Scale & Extend',
    icon: Network,
    sections: [
      { id: 'arch-hub', label: 'Hub & Spokes' },
      { id: 'arch-scaling', label: 'Scaling Scenarios' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: ShieldCheck,
    sections: [
      { id: 'sec-risk', label: 'Risk → Defense' },
      { id: 'sec-depth', label: 'Defense in Depth' },
      { id: 'sec-dimensions', label: 'Two Dimensions' },
      { id: 'sec-compliance', label: 'Compliance & Audit' },
    ],
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    icon: Map,
    sections: [
      { id: 'road-preudp', label: 'Pre-UDP' },
      { id: 'road-golive', label: 'UDP Go-Live' },
      { id: 'road-day2', label: 'Day 2 Ops' },
      { id: 'road-attention', label: 'Governance Attention' },
    ],
  },
];

const engMenu: { id: EngTabId; label: string; icon: LucideIcon; sections?: SubSection[] }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, sections: [
    { id: 'eng-ov-risks', label: 'Core Risks' },
    { id: 'eng-ov-topics', label: "What's Covered" },
  ]},
  { id: 'sandbox', label: 'Developer Experience', icon: Cpu, sections: [
    { id: 'eng-sb-thesis', label: 'The Thesis' },
    { id: 'eng-sb-lifecycle', label: 'CoCo & Stages' },
    { id: 'eng-sb-two-paths', label: 'Two Paths to Governance' },
  ]},
  { id: 'governance', label: 'Implementation', icon: Code },
  { id: 'enforcement', label: 'Hardening', icon: Layers, sections: [
    { id: 'eng-enf-arch', label: 'Governance Architecture' },
    { id: 'eng-enf-depth', label: 'Defense in Depth' },
    { id: 'eng-enf-pii', label: 'PII / RLS Interaction' },
    { id: 'eng-enf-lifecycle', label: 'ENTITLEMENTS Lifecycle' },
    { id: 'eng-enf-sandbox', label: 'Sandbox Hardening' },
  ]},
  { id: 'extensibility', label: 'Extensibility', icon: Globe, sections: [
    { id: 'eng-ext-hub', label: 'Hub & Spokes' },
    { id: 'eng-ext-recipes', label: 'Extension Recipes' },
    { id: 'eng-ext-matrix', label: 'PEP Comparison' },
  ]},
  { id: 'ops', label: 'Roadmap & Ops', icon: Settings, sections: [
    { id: 'eng-ops-roadmap', label: 'Rollout Roadmap' },
    { id: 'eng-ops-stewards', label: 'Domain Stewards' },
  ]},
];

export default function App() {
  const [mode, setMode] = useLocalStorage<Mode>('udp-mode', 'exec');
  const [execTab, setExecTab] = useLocalStorage<ExecTabId>(
    'udp-exec-tab',
    'summary',
  );
  const [engTab, setEngTab] = useLocalStorage<EngTabId>(
    'udp-eng-tab',
    'overview',
  );
  const [isSidebarOpen, setSidebarOpen] = useLocalStorage<boolean>(
    'udp-sidebar-open',
    true,
  );

  const navigateExec = useCallback(
    (tabId: string) => {
      setExecTab(tabId as ExecTabId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setExecTab],
  );

  const navigateEng = useCallback(
    (tabId: string) => {
      setEngTab(tabId as EngTabId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setEngTab],
  );

  const execViews: Record<ExecTabId, React.ReactNode> = {
    summary: <ExecSummaryView />,
    architecture: <ExecArchitectureView />,
    security: <ExecSecurityView />,
    roadmap: <ExecRoadmapView />,
  };

  const engViews: Record<EngTabId, React.ReactNode> = {
    overview: <EngOverviewView onNavigate={navigateEng} />,
    sandbox: <SandboxView onNavigate={navigateEng} />,
    governance: <GovernanceImplView onNavigate={navigateEng} />,
    enforcement: <EnforcementView />,
    extensibility: <ExtensibilityView />,
    ops: <OpsView />,
  };

  const activeView =
    mode === 'exec' ? execViews[execTab] : engViews[engTab];
  const menuItems = mode === 'exec' ? execMenu : engMenu;
  const activeId: string = mode === 'exec' ? execTab : engTab;
  const onNavigate = mode === 'exec' ? navigateExec : navigateEng;

  return (
    <div className="min-h-screen bg-[#080808] text-white flex font-sans selection:bg-red-600/30">
      <aside
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } fixed inset-y-0 left-0 bg-[#0d0d0d] border-r border-white/15 transition-all duration-300 z-50 flex flex-col`}
      >
        <div
          className={`flex items-center mb-2 ${
            isSidebarOpen
              ? 'p-6 justify-between'
              : 'px-3 pt-5 pb-3 flex-col gap-2'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-600 flex items-center justify-center rounded-sm shrink-0 shadow-lg shadow-red-900/10">
              <Shield size={22} className="text-white fill-white" />
            </div>
            {isSidebarOpen && (
              <span className="font-black tracking-tighter text-2xl leading-none italic">
                UDP<span className="text-red-600">GOV</span>
              </span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-white/5 rounded text-gray-500 transition-colors"
          >
            {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
          </button>
        </div>

        <ModeToggle mode={mode} onChange={setMode} collapsed={!isSidebarOpen} />

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-6">
          {menuItems.map((item) => (
            <React.Fragment key={item.id}>
              <SidebarItem
                icon={item.icon}
                label={isSidebarOpen ? item.label : ''}
                active={activeId === item.id}
                onClick={() => onNavigate(item.id)}
              />
              {activeId === item.id &&
                isSidebarOpen &&
                item.sections && (
                  <div className="ml-9 border-l border-white/10 pl-3 py-1 space-y-0.5">
                    {item.sections.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() =>
                          document
                            .getElementById(sub.id)
                            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }
                        className="block w-full text-left text-[10px] text-gray-500 hover:text-white py-1 px-2 rounded transition-colors hover:bg-white/5 truncate"
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
            </React.Fragment>
          ))}
        </nav>
      </aside>

      <main
        className={`flex-1 transition-all duration-300 ${
          isSidebarOpen ? 'ml-64' : 'ml-20'
        } p-10 pb-24`}
      >
        <div className="max-w-5xl mx-auto">
          <div className="min-h-[70vh]">{activeView}</div>
        </div>
      </main>

      <footer
        className={`fixed bottom-0 right-0 h-12 bg-[#0d0d0d]/90 backdrop-blur-xl border-t border-white/15 flex items-center justify-between px-10 z-40 text-[9px] font-black text-gray-600 uppercase tracking-[.5em] transition-all duration-300 ${
          isSidebarOpen ? 'left-64' : 'left-20'
        }`}
      >
        <div className="flex items-center space-x-8">
          <span className="flex items-center gap-2 italic">
            <Database size={10} className="text-red-800" /> CROWDSTRIKE UDP
          </span>
          <span>{mode === 'exec' ? 'GOVERNANCE OVERVIEW' : 'SILVER LAYER & GOVERNANCE'}</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className="text-red-800" />
          <span className="text-red-800">PROPRIETARY / INTERNAL</span>
        </div>
      </footer>
    </div>
  );
}
