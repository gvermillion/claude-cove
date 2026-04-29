import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// --- Color system ---

export const colorStyles: Record<string, { border: string; bg: string; dot: string; accent: string; numBg: string }> = {
  red: { border: 'border-red-600/40', bg: 'bg-red-600/10', dot: 'bg-red-600', accent: 'text-red-500', numBg: 'bg-red-600/20' },
  amber: { border: 'border-amber-600/40', bg: 'bg-amber-600/10', dot: 'bg-amber-600', accent: 'text-amber-500', numBg: 'bg-amber-600/20' },
  emerald: { border: 'border-emerald-600/40', bg: 'bg-emerald-600/10', dot: 'bg-emerald-600', accent: 'text-emerald-500', numBg: 'bg-emerald-600/20' },
  blue: { border: 'border-blue-600/40', bg: 'bg-blue-600/10', dot: 'bg-blue-600', accent: 'text-blue-500', numBg: 'bg-blue-600/20' },
  gray: { border: 'border-white/15', bg: 'bg-white/[0.06]', dot: 'bg-gray-600', accent: 'text-gray-400', numBg: 'bg-white/10' },
};

// --- Sidebar ---

export const SidebarItem = ({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active
        ? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
        : 'text-gray-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <Icon size={18} className="shrink-0" />
    <span className="font-medium text-[11px] uppercase tracking-wider truncate">{label}</span>
  </button>
);

// --- Section header ---

export const SectionHeader = ({
  title,
  subtitle,
  icon: Icon,
  badge,
}: {
  title: string;
  subtitle: React.ReactNode;
  icon?: LucideIcon;
  badge?: string;
}) => (
  <header className="mb-8 border-l-4 border-red-600 pl-6">
    {badge && (
      <div className="inline-block px-3 py-1 bg-red-600/10 border border-red-600/30 rounded-full text-red-500 text-[10px] font-black uppercase tracking-widest mb-3">
        {badge}
      </div>
    )}
    <div className="flex items-center space-x-3 mb-2">
      {Icon && <Icon className="text-red-600 shrink-0" size={24} />}
      <h2 className="text-2xl font-bold text-white tracking-tight italic uppercase">{title}</h2>
    </div>
    <p className="text-gray-400 max-w-4xl leading-relaxed font-light">{subtitle}</p>
  </header>
);

// --- InfoCard ---

export const InfoCard = ({
  title,
  icon: Icon,
  children,
  accent,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  accent?: 'red' | 'amber' | 'emerald';
}) => {
  const border =
    accent === 'amber'
      ? 'hover:border-amber-500/30'
      : accent === 'emerald'
      ? 'hover:border-emerald-500/30'
      : 'hover:border-red-600/30';
  return (
    <div
      className={`bg-[#111] p-6 rounded-xl border border-white/15 relative overflow-hidden transition-colors h-full ${border}`}
    >
      <div className="flex items-center gap-3 mb-4 border-b border-white/15 pb-4">
        {Icon && <Icon className="text-red-500 shrink-0" size={20} />}
        <h3 className="text-white font-bold tracking-tight uppercase text-sm">{title}</h3>
      </div>
      <div className="text-sm text-gray-400 space-y-3 leading-relaxed">{children}</div>
    </div>
  );
};

// --- Callout box ---

export const CalloutBox = ({
  title,
  children,
  variant = 'red',
}: {
  title: string;
  children: React.ReactNode;
  variant?: 'red' | 'amber' | 'emerald' | 'blue';
}) => {
  const styles = {
    red: 'border-red-900/40 bg-red-900/10',
    amber: 'border-amber-500/40 bg-amber-500/10',
    emerald: 'border-emerald-500/40 bg-emerald-500/10',
    blue: 'border-blue-500/20 bg-blue-500/5',
  };
  const titleColor = {
    red: 'text-red-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    blue: 'text-blue-400',
  };
  return (
    <div className={`p-5 border rounded-xl ${styles[variant]}`}>
      <h4 className={`font-bold text-xs uppercase tracking-widest mb-3 ${titleColor[variant]}`}>
        {title}
      </h4>
      <div className="text-xs text-gray-400 space-y-2 leading-relaxed">{children}</div>
    </div>
  );
};

// --- Data table ---

export const DataTable = ({
  columns,
  data,
  firstColumnEmphasis = false,
  valueFontMono = false,
}: {
  columns: string[];
  data: string[][];
  firstColumnEmphasis?: boolean;
  valueFontMono?: boolean;
}) => (
  <div className="overflow-x-auto rounded-lg border border-white/20 bg-[#0f0f0f]">
    <table className="w-full text-left text-sm text-gray-400">
      <thead className="bg-white/5 text-white">
        <tr>
          {columns.map((col, i) => (
            <th key={i} className="px-5 py-3 font-semibold uppercase tracking-wider text-xs">
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {data.map((row, i) => (
          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
            {row.map((cell, j) => (
              <td
                key={j}
                className={`px-5 py-4 leading-relaxed${
                  j === 0 && firstColumnEmphasis ? ' font-semibold text-gray-300' : ''
                }${j > 0 && valueFontMono ? ' font-mono text-xs' : ''}`}
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// --- Diagram primitives ---

/** Horizontal flow: connected nodes with arrows. Now supports onClick per node. */
export const FlowDiagram = ({
  nodes,
  activeIndex,
  onNodeClick,
}: {
  nodes: { label: string; sublabel?: string; color?: string }[];
  activeIndex?: number;
  onNodeClick?: (index: number) => void;
}) => (
  <div className="flex items-center gap-0 overflow-x-auto py-4 px-2">
    {nodes.map((node, i) => {
      const s = colorStyles[node.color ?? 'red'];
      const isActive = activeIndex === i;
      const isDimmed = activeIndex !== undefined && activeIndex !== i;
      return (
        <React.Fragment key={i}>
          <div
            onClick={() => onNodeClick?.(i)}
            className={`shrink-0 rounded-xl border ${s.border} ${s.bg} px-5 py-4 min-w-[140px] text-center relative transition-all duration-300 ${
              onNodeClick ? 'cursor-pointer hover:scale-105' : ''
            } ${isActive ? 'ring-2 ring-white/30 scale-105 shadow-lg' : ''} ${
              isDimmed ? 'opacity-40' : ''
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${s.dot} absolute top-3 right-3 ${isActive ? 'animate-pulse' : 'opacity-60'}`} />
            <p className="text-white text-xs font-bold uppercase tracking-wide leading-snug">
              {node.label}
            </p>
            {node.sublabel && (
              <p className="text-[10px] text-gray-400 mt-1.5 leading-snug">{node.sublabel}</p>
            )}
          </div>
          {i < nodes.length - 1 && (
            <div className={`shrink-0 w-8 flex items-center justify-center text-gray-500 transition-opacity duration-300 ${isDimmed ? 'opacity-30' : ''}`}>
              <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
                <path d="M0 6h20m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
          )}
        </React.Fragment>
      );
    })}
  </div>
);

/** Vertical layered stack — now supports onClick per layer. */
export const StackDiagram = ({
  layers,
  activeIndex,
  onLayerClick,
}: {
  layers: { label: string; sublabel?: string; color?: string }[];
  activeIndex?: number;
  onLayerClick?: (index: number) => void;
}) => (
  <div className="flex flex-col gap-1.5 py-2">
    {[...layers].reverse().map((layer, i) => {
      const originalIndex = layers.length - 1 - i;
      const s = colorStyles[layer.color ?? 'red'];
      const isActive = activeIndex === originalIndex;
      const isDimmed = activeIndex !== undefined && activeIndex !== originalIndex;
      return (
        <div
          key={i}
          onClick={() => onLayerClick?.(originalIndex)}
          className={`rounded-xl border ${s.border} ${s.bg} px-6 py-4 flex items-center gap-4 transition-all duration-300 ${
            onLayerClick ? 'cursor-pointer hover:bg-white/[0.04]' : ''
          } ${isActive ? 'ring-2 ring-white/30 scale-[1.01] shadow-lg' : ''} ${
            isDimmed ? 'opacity-40' : ''
          }`}
        >
          <span
            className={`shrink-0 w-7 h-7 rounded-lg ${s.numBg} ${s.accent} font-black text-xs flex items-center justify-center`}
          >
            {layers.length - i}
          </span>
          <div>
            <p className="text-white text-sm font-bold uppercase tracking-tight">{layer.label}</p>
            {layer.sublabel && (
              <p className="text-[11px] text-gray-400 mt-0.5">{layer.sublabel}</p>
            )}
          </div>
        </div>
      );
    })}
  </div>
);

/** Horizontal pipeline with pass/fail gate checkpoints — now supports onClick + animated active state. */
export const PipelineDiagram = ({
  stages,
  activeIndex,
  onStageClick,
  animatedUpTo,
}: {
  stages: { label: string; type: 'source' | 'stage' | 'gate' | 'sink' | 'alert' }[];
  activeIndex?: number;
  onStageClick?: (index: number) => void;
  animatedUpTo?: number;
}) => {
  const styleMap: Record<string, { bg: string; border: string; text: string }> = {
    source: { bg: 'bg-blue-600/10', border: 'border-blue-600/30', text: 'text-blue-400' },
    stage: { bg: 'bg-white/[0.06]', border: 'border-white/15', text: 'text-gray-300' },
    gate: { bg: 'bg-emerald-600/10', border: 'border-emerald-600/30', text: 'text-emerald-400' },
    sink: { bg: 'bg-red-600/10', border: 'border-red-600/30', text: 'text-red-400' },
    alert: { bg: 'bg-amber-600/10', border: 'border-amber-600/30', text: 'text-amber-400' },
  };
  return (
    <div className="flex items-center gap-0 overflow-x-auto py-4 px-2">
      {stages.map((s, i) => {
        const st = styleMap[s.type];
        const isActive = activeIndex === i;
        const isDimmed = activeIndex !== undefined && activeIndex !== i;
        const isReached = animatedUpTo !== undefined && i <= animatedUpTo;
        return (
          <React.Fragment key={i}>
            <div
              onClick={() => onStageClick?.(i)}
              className={`shrink-0 rounded-xl border ${st.border} ${st.bg} px-4 py-3 min-w-[100px] text-center transition-all duration-300 ${
                onStageClick ? 'cursor-pointer hover:scale-105' : ''
              } ${isActive ? 'ring-2 ring-white/30 scale-105 shadow-lg' : ''} ${
                isDimmed ? 'opacity-40' : ''
              } ${isReached && !isActive ? 'opacity-100' : ''}`}
            >
              {s.type === 'gate' && (
                <CheckCircle2 size={14} className={`mx-auto mb-1.5 ${isReached ? 'text-emerald-500' : 'text-emerald-500/40'}`} />
              )}
              {s.type === 'alert' && (
                <AlertTriangle size={14} className="text-amber-500 mx-auto mb-1.5" />
              )}
              <p className={`text-[10px] font-bold uppercase tracking-wide ${st.text}`}>
                {s.label}
              </p>
            </div>
            {i < stages.length - 1 && (
              <div className={`shrink-0 w-6 flex items-center justify-center transition-all duration-300 ${
                isReached ? 'text-emerald-500' : 'text-gray-500'
              } ${isDimmed ? 'opacity-30' : ''}`}>
                <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                  <path d="M0 5h14m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Sub-tab navigation bar within a section. */
export const SubTabs = ({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: { id: string; label: string; icon?: LucideIcon }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) => (
  <div className="flex items-center gap-1 border border-white/20 rounded-xl p-1 bg-[#0a0a0a] overflow-x-auto">
    {tabs.map((tab) => {
      const isActive = tab.id === activeTab;
      return (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
            isActive
              ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border border-transparent'
          }`}
        >
          {tab.icon && <tab.icon size={14} />}
          {tab.label}
        </button>
      );
    })}
  </div>
);

/** Step sidebar + detail panel layout. */
export const StepSidebar = ({
  steps,
  activeStep,
  onStepClick,
}: {
  steps: { label: string; color?: string }[];
  activeStep: number;
  onStepClick: (index: number) => void;
}) => (
  <div className="flex flex-col gap-1">
    {steps.map((step, i) => {
      const isActive = i === activeStep;
      const s = colorStyles[step.color ?? 'gray'];
      return (
        <button
          key={i}
          onClick={() => onStepClick(i)}
          className={`text-left px-4 py-3 rounded-xl transition-all duration-200 border ${
            isActive
              ? `${s.border} ${s.bg} shadow-lg`
              : 'border-transparent hover:bg-white/[0.03]'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`shrink-0 w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center transition-colors ${
                isActive ? `${s.numBg} ${s.accent}` : 'bg-white/5 text-gray-500'
              }`}
            >
              {i + 1}
            </span>
            <span className={`text-xs font-semibold transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`}>
              {step.label}
            </span>
          </div>
        </button>
      );
    })}
  </div>
);

/** Animated detail panel that transitions content. */
export const DetailPanel = ({
  children,
  activeKey,
}: {
  children: React.ReactNode;
  activeKey: string | number;
}) => (
  <div
    key={activeKey}
    className="animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-both"
  >
    {children}
  </div>
);

// --- Inline code ---

/** Monospaced inline code for technical terms (table names, columns, SQL keywords). */
export const C = ({ children }: { children: React.ReactNode }) => (
  <code className="text-red-400 text-[0.9em] font-mono">{children}</code>
);

// --- Prev / Next navigation ---

/** ← Back / Next → buttons for step-through UIs. Matches eval frontend pattern. */
export const PrevNextNav = ({
  current,
  total,
  onPrev,
  onNext,
}: {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) => (
  <div className="flex gap-2 mt-4">
    <button
      onClick={onPrev}
      disabled={current === 0}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border border-white/20 bg-[#0a0a0a] hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <ChevronLeft size={14} />
      Back
    </button>
    <button
      onClick={onNext}
      disabled={current === total - 1}
      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border border-white/20 bg-[#0a0a0a] hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      Next
      <ChevronRight size={14} />
    </button>
  </div>
);

// --- Two-column interactive layout ---

/** Selection sidebar (left) + detail panel (right). Universal pattern for all clickable diagrams. */
export const TwoColumnInteractive = ({
  sidebar,
  detail,
  sidebarWidth = '240px',
}: {
  sidebar: React.ReactNode;
  detail: React.ReactNode;
  sidebarWidth?: string;
}) => (
  <div className={`grid grid-cols-1 md:grid-cols-[${sidebarWidth}_1fr] gap-6`}>
    <div className="min-w-0">{sidebar}</div>
    <div className="min-w-0">{detail}</div>
  </div>
);
