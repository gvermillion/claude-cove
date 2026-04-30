import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  User,
  Server,
  Bot,
  Share2,
  X,
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

// --- Chapter narrative primitives ---

/**
 * Chapter identifier type. Each chapter has an id, a display label, and its
 * 1-based position is derived from its index in the `chapters` array passed
 * to `ChapterNav`.
 */
export interface Chapter<Id extends string = string> {
  id: Id;
  label: string;
  icon?: LucideIcon;
}

/**
 * Numbered chapter stepper. Replaces a flat tab bar when the content has a
 * recommended reading order. Each pill shows its ordinal (1…N) plus the
 * chapter label. The currently active pill is highlighted; completed pills
 * (earlier than active) are dimmed but still clickable.
 *
 * Keep the chapter count small (≤ 6). For sub-beats inside a chapter, use
 * `SubTabs` instead.
 */
export const ChapterNav = <Id extends string>({
  chapters,
  active,
  onChange,
}: {
  chapters: Chapter<Id>[];
  active: Id;
  onChange: (id: Id) => void;
}) => {
  const activeIdx = chapters.findIndex((c) => c.id === active);
  return (
    <nav
      aria-label="Chapter navigation"
      className="flex items-center gap-1.5 border border-white/15 rounded-xl p-1.5 bg-[#0a0a0a] overflow-x-auto"
    >
      {chapters.map((c, i) => {
        const isActive = c.id === active;
        const isPast = i < activeIdx;
        return (
          <button
            key={c.id}
            onClick={() => onChange(c.id)}
            aria-current={isActive ? 'step' : undefined}
            className={`group flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-200 whitespace-nowrap border ${
              isActive
                ? 'bg-red-600/15 text-red-400 border-red-600/40 shadow-lg shadow-red-950/20'
                : isPast
                  ? 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white'
                  : 'text-gray-600 border-transparent hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <span
              className={`shrink-0 w-5 h-5 rounded-md text-[10px] font-black flex items-center justify-center transition-colors ${
                isActive
                  ? 'bg-red-600/25 text-red-300'
                  : isPast
                    ? 'bg-white/10 text-gray-400'
                    : 'bg-white/5 text-gray-600'
              }`}
            >
              {i + 1}
            </span>
            {c.icon && <c.icon size={13} className="shrink-0" />}
            {c.label}
          </button>
        );
      })}
    </nav>
  );
};

/**
 * Per-chapter footer that closes the chapter with a takeaway line and
 * Prev/Next navigation keyed to chapter ids. Render at the bottom of each
 * chapter body. Disables the Prev button on the first chapter and Next on
 * the last — callers pass `null` for those ends.
 */
export const ChapterFooter = <Id extends string>({
  prev,
  next,
  takeaway,
  onNav,
}: {
  prev: Chapter<Id> | null;
  next: Chapter<Id> | null;
  takeaway: React.ReactNode;
  onNav: (id: Id) => void;
}) => (
  <div className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-6">
    <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-4 items-stretch">
      {/* Prev */}
      {prev ? (
        <button
          onClick={() => onNav(prev.id)}
          className="group flex flex-col items-start gap-1 rounded-xl border border-white/10 bg-[#0a0a0a] hover:border-white/25 hover:bg-white/[0.04] px-4 py-3 text-left transition-all"
        >
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-400">
            <ChevronLeft size={12} />
            Previous
          </span>
          <span className="text-sm font-semibold text-white">{prev.label}</span>
        </button>
      ) : (
        <div className="hidden md:block" />
      )}

      {/* Takeaway */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-5 py-3 flex flex-col justify-center">
        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 mb-1">
          Takeaway
        </span>
        <p className="text-sm text-gray-200 leading-relaxed">{takeaway}</p>
      </div>

      {/* Next */}
      {next ? (
        <button
          onClick={() => onNav(next.id)}
          className="group flex flex-col items-end gap-1 rounded-xl border border-red-600/30 bg-red-600/5 hover:border-red-600/60 hover:bg-red-600/10 px-4 py-3 text-right transition-all"
        >
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-400">
            Next
            <ChevronRight size={12} />
          </span>
          <span className="text-sm font-semibold text-white">{next.label}</span>
        </button>
      ) : (
        <div className="hidden md:block" />
      )}
    </div>
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

// --- Phase 0A: Red-team primitives ---

// -- ClaimCard --

export interface ClaimCardProps {
  claim: string | React.ReactNode;
  status: 'today' | 'partial' | 'roadmap';
  caveat?: React.ReactNode;
}

const claimStatusColor: Record<ClaimCardProps['status'], string> = {
  today: 'emerald',
  partial: 'amber',
  roadmap: 'blue',
};

const claimStatusLabel: Record<ClaimCardProps['status'], string> = {
  today: 'Today',
  partial: 'Partial',
  roadmap: 'Roadmap',
};

/** Bolded claim + status badge + optional caveat. Used for narrative honesty panels. */
export const ClaimCard = ({ claim, status, caveat }: ClaimCardProps) => {
  const color = claimStatusColor[status];
  const s = colorStyles[color];
  return (
    <div className={`relative rounded-xl border-l-4 ${s.border} ${s.bg} p-5`}>
      <span
        className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${s.accent} ${s.numBg}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {claimStatusLabel[status]}
      </span>
      <p className="text-white font-bold text-sm leading-relaxed pr-24">{claim}</p>
      {caveat && <p className="text-gray-500 text-xs mt-2 leading-relaxed">{caveat}</p>}
    </div>
  );
};

// -- FailureModeCard --

export interface FailureModeCardProps {
  title: string;
  trigger: React.ReactNode;
  blastRadius: React.ReactNode;
  control: React.ReactNode;
  owner: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const severityColor: Record<FailureModeCardProps['severity'], string> = {
  low: 'blue',
  medium: 'amber',
  high: 'red',
  critical: 'red',
};

/** Structured failure panel with severity chip, trigger, blast radius, control, owner. */
export const FailureModeCard = ({ title, trigger, blastRadius, control, owner, severity }: FailureModeCardProps) => {
  const color = severityColor[severity];
  const s = colorStyles[color];
  const rows: { label: string; content: React.ReactNode }[] = [
    { label: 'TRIGGER', content: trigger },
    { label: 'BLAST RADIUS', content: blastRadius },
    { label: 'COMPENSATING CONTROL', content: control },
    { label: 'OWNER', content: owner },
  ];
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} overflow-hidden`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
        <h4 className="text-white font-bold text-sm uppercase tracking-tight">{title}</h4>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${s.accent} ${s.numBg}`}>
          {severity === 'critical' && <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />}
          {severity}
        </span>
      </div>
      <div className="divide-y divide-white/5">
        {rows.map((row) => (
          <div key={row.label} className="px-5 py-3 grid grid-cols-[140px_1fr] gap-4 items-start">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 pt-0.5">{row.label}</span>
            <div className="text-xs text-gray-400 leading-relaxed">{row.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// -- RiskRegisterRow --

export interface RiskRegisterRowProps {
  risk: string;
  probability: 'low' | 'med' | 'high';
  impact: 'low' | 'med' | 'high';
  detection: React.ReactNode;
  owner: string;
  mitigation: React.ReactNode;
  status: 'accepted' | 'mitigated' | 'open';
}

const riskLevelColor: Record<'low' | 'med' | 'high', string> = {
  low: 'text-blue-400',
  med: 'text-amber-400',
  high: 'text-red-400',
};

const riskStatusColor: Record<RiskRegisterRowProps['status'], { text: string; bg: string }> = {
  accepted: { text: 'text-amber-400', bg: 'bg-amber-600/20' },
  mitigated: { text: 'text-emerald-400', bg: 'bg-emerald-600/20' },
  open: { text: 'text-red-400', bg: 'bg-red-600/20' },
};

/** Single row for a risk register table. Caller provides <table>/<thead>. */
export const RiskRegisterRow = ({ risk, probability, impact, detection, owner, mitigation, status }: RiskRegisterRowProps) => {
  const st = riskStatusColor[status];
  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3 text-xs text-gray-300 font-semibold leading-relaxed">{risk}</td>
      <td className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest ${riskLevelColor[probability]}`}>{probability}</td>
      <td className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest ${riskLevelColor[impact]}`}>{impact}</td>
      <td className="px-4 py-3 text-xs text-gray-400 leading-relaxed">{detection}</td>
      <td className="px-4 py-3 text-xs text-gray-400">{owner}</td>
      <td className="px-4 py-3 text-xs text-gray-400 leading-relaxed">{mitigation}</td>
      <td className="px-4 py-3">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${st.text} ${st.bg}`}>
          {status}
        </span>
      </td>
    </tr>
  );
};

// -- KillSwitchBadge --

export interface KillSwitchBadgeProps {
  action: string;
}

/** Compact amber pill showing how to disable an automation. */
export const KillSwitchBadge = ({ action }: KillSwitchBadgeProps) => (
  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-600/40 bg-amber-600/10 text-amber-400 text-[10px] font-mono tracking-wide">
    <span className="font-black uppercase tracking-widest font-sans">Kill Switch:</span> {action}
  </span>
);

// -- PrincipalChip --

export interface PrincipalChipProps {
  kind: 'human' | 'service' | 'agent' | 'share';
  label: string;
}

const principalIconMap: Record<PrincipalChipProps['kind'], React.ElementType> = {
  human: User,
  service: Server,
  agent: Bot,
  share: Share2,
};

const principalColorMap: Record<PrincipalChipProps['kind'], string> = {
  human: 'blue',
  service: 'amber',
  agent: 'emerald',
  share: 'red',
};

/** Small chip for a principal identity with icon and colored border. */
export const PrincipalChip = ({ kind, label }: PrincipalChipProps) => {
  const Icon = principalIconMap[kind];
  const s = colorStyles[principalColorMap[kind]];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${s.border} ${s.bg} ${s.accent} text-[10px] font-bold uppercase tracking-wider`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

// -- PrincipalSwitcher --

export type Principal =
  | { kind: 'human'; userName: string }
  | { kind: 'service'; roleName: string }
  | { kind: 'agent'; onBehalfOf?: string }
  | { kind: 'share'; consumerAccount: string };

export interface PrincipalSwitcherProps {
  principal: Principal;
  onChange: (p: Principal) => void;
  options: Principal[];
}

function principalLabel(p: Principal): string {
  switch (p.kind) {
    case 'human': return p.userName;
    case 'service': return p.roleName;
    case 'agent': return p.onBehalfOf ? `Agent (${p.onBehalfOf})` : 'Agent';
    case 'share': return p.consumerAccount;
  }
}

function principalKey(p: Principal): string {
  return `${p.kind}:${principalLabel(p)}`;
}

/** Sticky horizontal bar for selecting the active principal context. */
export const PrincipalSwitcher = ({ principal, onChange, options }: PrincipalSwitcherProps) => (
  <div className="sticky top-0 z-40 flex items-center gap-3 px-5 py-3 bg-[#0a0a0a] border border-white/10 rounded-xl">
    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 shrink-0">Principal</span>
    <div className="flex items-center gap-1.5 overflow-x-auto">
      {options.map((opt) => {
        const active = principalKey(opt) === principalKey(principal);
        const color = principalColorMap[opt.kind];
        const s = colorStyles[color];
        const Icon = principalIconMap[opt.kind];
        return (
          <button
            key={principalKey(opt)}
            onClick={() => onChange(opt)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border ${
              active
                ? `${s.border} ${s.bg} ${s.accent}`
                : 'border-transparent text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <Icon size={12} />
            {principalLabel(opt)}
          </button>
        );
      })}
    </div>
    <span className="ml-auto text-[10px] text-gray-600 italic shrink-0">Principal context affects every playground below</span>
  </div>
);

// -- FailureTimeline --

export interface TimelineEvent {
  label: string;
  kind: 'event' | 'control' | 'alert';
  at: string;
  note?: string;
}

export interface FailureTimelineProps {
  events: TimelineEvent[];
  gap?: { fromIndex: number; toIndex: number; label: string };
}

const timelineKindColor: Record<TimelineEvent['kind'], string> = {
  event: 'gray',
  control: 'emerald',
  alert: 'red',
};

/** Horizontal timeline with dots, labels, and optional highlighted gap region. */
export const FailureTimeline = ({ events, gap }: FailureTimelineProps) => (
  <div className="relative overflow-x-auto py-8 px-4">
    {/* Main line */}
    <div className="absolute top-[42px] left-8 right-8 h-px bg-white/15" />
    {/* Gap highlight */}
    {gap && events.length > 1 && (
      <div
        className="absolute top-[34px] h-[17px] bg-red-600/15 border border-red-600/30 rounded"
        style={{
          left: `${(gap.fromIndex / (events.length - 1)) * 100}%`,
          width: `${((gap.toIndex - gap.fromIndex) / (events.length - 1)) * 100}%`,
        }}
      >
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-widest text-red-400 whitespace-nowrap">
          {gap.label}
        </span>
      </div>
    )}
    {/* Events */}
    <div className="relative flex justify-between min-w-[400px]">
      {events.map((evt, i) => {
        const color = timelineKindColor[evt.kind];
        const s = colorStyles[color];
        return (
          <div key={i} className="flex flex-col items-center text-center" style={{ width: `${100 / events.length}%` }}>
            <span className="text-[9px] text-gray-500 mb-2">{evt.at}</span>
            <div className={`w-3 h-3 rounded-full ${s.dot} ring-2 ring-[#080808] z-10`} />
            <span className="text-[10px] text-gray-300 font-semibold mt-2 leading-tight max-w-[100px]">{evt.label}</span>
            {evt.note && <span className="text-[9px] text-gray-600 mt-1 leading-tight max-w-[100px]">{evt.note}</span>}
          </div>
        );
      })}
    </div>
  </div>
);

// -- TagLifecycleTrace --

export interface TagLifecycleStep {
  ddl: string;
  tagState: 'set' | 'lost' | 'preserved' | 'inherited';
  note?: React.ReactNode;
}

export interface TagLifecycleTraceProps {
  steps: TagLifecycleStep[];
}

const tagStateColor: Record<TagLifecycleStep['tagState'], string> = {
  set: 'emerald',
  lost: 'red',
  preserved: 'emerald',
  inherited: 'blue',
};

/** Vertical ladder: DDL events on left, tag-state chips on right. */
export const TagLifecycleTrace = ({ steps }: TagLifecycleTraceProps) => (
  <div className="space-y-0">
    {steps.map((step, i) => {
      const color = tagStateColor[step.tagState];
      const s = colorStyles[color];
      return (
        <div key={i} className="relative">
          {/* Connector line */}
          {i < steps.length - 1 && (
            <div className="absolute left-[11px] top-8 bottom-0 w-px bg-white/10" />
          )}
          <div className="flex items-start gap-4 py-3">
            {/* Dot */}
            <div className={`shrink-0 w-[23px] h-[23px] rounded-full ${s.numBg} flex items-center justify-center mt-0.5`}>
              <div className={`w-2 h-2 rounded-full ${s.dot}`} />
            </div>
            {/* DDL */}
            <div className="flex-1 min-w-0">
              <code className="text-xs font-mono text-gray-300 block leading-relaxed">{step.ddl}</code>
              {step.note && <div className="text-[10px] text-gray-500 mt-1 leading-relaxed">{step.note}</div>}
            </div>
            {/* Tag state chip */}
            <span className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${s.accent} ${s.numBg}`}>
              {step.tagState}
            </span>
          </div>
        </div>
      );
    })}
  </div>
);

// -- PolicyBranchRoadmap --

export interface Branch {
  label: string;
  expr: string;
  status: 'current' | 'planned';
  note?: string;
}

export interface PolicyBranchRoadmapProps {
  current: Branch[];
  planned: Branch[];
}

/** Policy CASE visualizer: current branches in full, planned branches ghosted with roadmap chip. */
export const PolicyBranchRoadmap = ({ current, planned }: PolicyBranchRoadmapProps) => {
  const renderBranch = (branch: Branch, i: number) => {
    const isPlanned = branch.status === 'planned';
    return (
      <div
        key={`${branch.status}-${i}`}
        className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${
          isPlanned
            ? 'border-blue-600/20 bg-blue-600/5 opacity-40'
            : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-gray-300">{branch.label}</span>
            {isPlanned && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-600/20">
                Roadmap
              </span>
            )}
          </div>
          <code className="text-[11px] font-mono text-gray-500 block leading-relaxed">{branch.expr}</code>
          {branch.note && <p className="text-[10px] text-gray-600 mt-1">{branch.note}</p>}
        </div>
      </div>
    );
  };
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">CASE branches</div>
      {current.map((b, i) => renderBranch(b, i))}
      {planned.length > 0 && (
        <>
          <div className="border-t border-white/5 my-3" />
          <div className="text-[10px] font-black uppercase tracking-widest text-blue-500/60 mb-2">Planned</div>
          {planned.map((b, i) => renderBranch(b, i))}
        </>
      )}
    </div>
  );
};

// -- ComplianceMap --

export interface Framework {
  id: string;
  label: string;
}

export interface ComplianceControl {
  id: string;
  label: string;
}

export type Coverage = 'full' | 'partial' | 'gap';

export interface ComplianceMapProps {
  frameworks: Framework[];
  controls: ComplianceControl[];
  coverage: Record<string, Record<string, Coverage>>;
}

const coverageStyle: Record<Coverage, { bg: string; text: string; icon: string }> = {
  full: { bg: 'bg-emerald-600/20', text: 'text-emerald-400', icon: '\u2713' },
  partial: { bg: 'bg-amber-600/20', text: 'text-amber-400', icon: '\u25B3' },
  gap: { bg: 'bg-red-600/20', text: 'text-red-400', icon: '\u2717' },
};

/** Matrix of frameworks (rows) x controls (cols) with coverage indicators. */
export const ComplianceMap = ({ frameworks, controls, coverage }: ComplianceMapProps) => (
  <div className="overflow-x-auto rounded-lg border border-white/20 bg-[#0f0f0f]">
    <table className="w-full text-left text-sm">
      <thead className="bg-white/5">
        <tr>
          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white">Framework</th>
          {controls.map((ctrl) => (
            <th key={ctrl.id} className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center">
              {ctrl.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {frameworks.map((fw) => (
          <tr key={fw.id} className="hover:bg-white/[0.02] transition-colors">
            <td className="px-4 py-3 text-xs font-semibold text-gray-300">{fw.label}</td>
            {controls.map((ctrl) => {
              const cov = coverage[fw.id]?.[ctrl.id] ?? 'gap';
              const cs = coverageStyle[cov];
              return (
                <td key={ctrl.id} className="px-3 py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${cs.bg} ${cs.text} text-xs font-bold`}>
                    {cs.icon}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// -- PrincipalMatrix --

export interface PrincipalMatrixControl {
  id: string;
  label: string;
}

export type Effect = 'pass' | 'partial' | 'bypass';

export interface PrincipalMatrixProps {
  principals: { kind: string; label: string }[];
  controls: PrincipalMatrixControl[];
  effects: Record<string, Record<string, Effect>>;
}

const effectStyle: Record<Effect, { bg: string; text: string; icon: string }> = {
  pass: { bg: 'bg-emerald-600/20', text: 'text-emerald-400', icon: '\u2713' },
  partial: { bg: 'bg-amber-600/20', text: 'text-amber-400', icon: '\u25B3' },
  bypass: { bg: 'bg-red-600/20', text: 'text-red-400', icon: '\u2717' },
};

/** Principals (rows) x controls (cols) matrix with pass/partial/bypass indicators. */
export const PrincipalMatrix = ({ principals, controls, effects }: PrincipalMatrixProps) => (
  <div className="overflow-x-auto rounded-lg border border-white/20 bg-[#0f0f0f]">
    <table className="w-full text-left text-sm">
      <thead className="bg-white/5">
        <tr>
          <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-white">Principal</th>
          {controls.map((ctrl) => (
            <th key={ctrl.id} className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 text-center">
              {ctrl.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {principals.map((p) => (
          <tr key={p.kind} className="hover:bg-white/[0.02] transition-colors">
            <td className="px-4 py-3">
              <PrincipalChip kind={p.kind as PrincipalChipProps['kind']} label={p.label} />
            </td>
            {controls.map((ctrl) => {
              const eff = effects[p.kind]?.[ctrl.id] ?? 'bypass';
              const es = effectStyle[eff];
              return (
                <td key={ctrl.id} className="px-3 py-3 text-center">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${es.bg} ${es.text} text-xs font-bold`}>
                    {es.icon}
                  </span>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// -- EvidenceDrawer --

export interface EvidenceQuery {
  label: string;
  sql: string;
  expectedShape?: string;
}

export interface EvidenceDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  queries: EvidenceQuery[];
}

/** Right-side slide-over panel displaying SQL evidence queries. */
export const EvidenceDrawer = ({ open, onClose, title, queries }: EvidenceDrawerProps) => {
  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[480px] max-w-full z-50 bg-[#0a0a0a] border-l border-white/10 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h3 className="text-white font-bold text-sm uppercase tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {queries.map((q, i) => (
            <div key={i}>
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">{q.label}</h4>
              <pre className="text-[11px] font-mono text-gray-400 bg-[#111] border border-white/10 rounded-lg p-4 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                {q.sql}
              </pre>
              {q.expectedShape && (
                <p className="text-[10px] text-gray-600 mt-2 italic">Expected shape: {q.expectedShape}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// -- BoundaryOverlay --

export interface BoundaryOverlayProps {
  show: boolean;
  children: React.ReactNode;
  labels?: string[];
}

/** Wraps children with a dashed trust-boundary outline when show=true. */
export const BoundaryOverlay = ({ show, children, labels }: BoundaryOverlayProps) => {
  if (!show) return <>{children}</>;
  return (
    <div className="relative rounded-xl border-2 border-dashed border-red-600/40 p-4">
      <div className="absolute top-2 right-3 flex items-center gap-2">
        {labels?.map((lbl, i) => (
          <span key={i} className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-600/10 px-2 py-0.5 rounded">
            {lbl}
          </span>
        ))}
        {(!labels || labels.length === 0) && (
          <span className="text-[9px] font-black uppercase tracking-widest text-red-400 bg-red-600/10 px-2 py-0.5 rounded">
            Trust Boundary
          </span>
        )}
      </div>
      <div className="pt-4">{children}</div>
    </div>
  );
};
