// src/App.tsx
import React, { useCallback } from 'react';
import {
  Shield,
  Cpu,
  Layers,
  Tags,
  Table2,
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
  SandboxView,
  EnforcementView,
  TaxonomyView,
  PolicyView,
  SchemaView,
  ExtensibilityView,
  OpsView,
} from './components/eng';

type ExecTabId = 'summary' | 'architecture' | 'security' | 'roadmap';
type EngTabId =
  | 'sandbox'
  | 'enforcement'
  | 'taxonomy'
  | 'schema'
  | 'policy'
  | 'extensibility'
  | 'ops';

const execMenu: { id: ExecTabId; label: string; icon: LucideIcon }[] = [
  { id: 'summary', label: 'Summary', icon: Briefcase },
  { id: 'architecture', label: 'Architecture', icon: Network },
  { id: 'security', label: 'Security', icon: ShieldCheck },
  { id: 'roadmap', label: 'Roadmap', icon: Map },
];

const engMenu: { id: EngTabId; label: string; icon: LucideIcon }[] = [
  { id: 'sandbox', label: 'Developer Experience', icon: Cpu },
  { id: 'schema', label: 'Schema Design', icon: Table2 },
  { id: 'taxonomy', label: 'Tag Taxonomy', icon: Tags },
  { id: 'policy', label: 'Policy Logic', icon: Code },
  { id: 'enforcement', label: 'Hardening', icon: Layers },
  { id: 'extensibility', label: 'Extensibility', icon: Globe },
  { id: 'ops', label: 'Roadmap & Ops', icon: Settings },
];

export default function App() {
  const [mode, setMode] = useLocalStorage<Mode>('udp-mode', 'exec');
  const [execTab, setExecTab] = useLocalStorage<ExecTabId>(
    'udp-exec-tab',
    'summary',
  );
  const [engTab, setEngTab] = useLocalStorage<EngTabId>(
    'udp-eng-tab',
    'sandbox',
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
    summary: <ExecSummaryView onNavigate={navigateExec} />,
    architecture: <ExecArchitectureView />,
    security: <ExecSecurityView />,
    roadmap: <ExecRoadmapView />,
  };

  const engViews: Record<EngTabId, React.ReactNode> = {
    sandbox: <SandboxView onNavigate={navigateEng} />,
    enforcement: <EnforcementView />,
    taxonomy: <TaxonomyView />,
    schema: <SchemaView />,
    policy: <PolicyView />,
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
        <div className="p-6 flex items-center justify-between mb-2">
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
            <SidebarItem
              key={item.id}
              icon={item.icon}
              label={isSidebarOpen ? item.label : ''}
              active={activeId === item.id}
              onClick={() => onNavigate(item.id)}
            />
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
          <span>SILVER LAYER & GOVERNANCE</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={12} className="text-red-800" />
          <span className="text-red-800">PROPRIETARY / INTERNAL</span>
        </div>
      </footer>
    </div>
  );
}
