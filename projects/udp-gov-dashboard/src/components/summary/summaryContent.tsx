// src/components/summary/summaryContent.tsx
//
// Shared content module for the Summary tab. Both ExecSummaryView and
// EngOverviewView compose these sub-components. Each sub-component takes a
// `mode?: 'exec' | 'eng'` prop — the audience lens. Topic and structure are
// the same across modes; only badges/copy density tune per audience.

import React, { useState } from 'react';
import {
  Shield,
  AlertOctagon,
  Code,
  Users,
  GitBranch,
  Zap,
  Globe,
  Snowflake,
  Cloud,
  Bot,
  Layers,
  Tag,
  EyeOff,
  Box,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  InfoCard,
  CalloutBox,
  DetailPanel,
  PrevNextNav,
  C,
  colorStyles,
} from '../primitives';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SummaryMode = 'exec' | 'eng';

interface ModeProps {
  mode?: SummaryMode;
}

interface NavigableModeProps extends ModeProps {
  onNavigate?: (tabId: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

export const PEP_ITEMS: {
  label: string;
  icon: LucideIcon;
  color: 'blue' | 'amber' | 'red';
  sublabel: string;
  detail: string;
}[] = [
  {
    label: 'Snowflake',
    icon: Snowflake,
    color: 'blue',
    sublabel: 'Row Access Policies',
    detail:
      'RAPs attached to Tags inspect the ENTITLEMENTS table at query time — enforcement is invisible to analysts.',
  },
  {
    label: 'AWS S3',
    icon: Cloud,
    color: 'amber',
    sublabel: 'IAM / Lake Formation',
    detail:
      'IAM policies and Lake Formation permissions consume the same ENTITLEMENTS data via S3 mirror. No separate access matrix.',
  },
  {
    label: 'Bedrock',
    icon: Bot,
    color: 'red',
    sublabel: 'Guardrails / Context',
    detail:
      'AI agents look up ENTITLEMENTS to scope context windows. The same region filter applies to a chatbot as to a dashboard.',
  },
];

export const KEY_CONCEPTS: {
  term: string;
  expansion: string;
  definition: string;
  color: string;
}[] = [
  {
    term: 'PDP',
    expansion: 'Policy Decision Point',
    definition: 'Where access rules are stored — the single source of truth',
    color: 'emerald',
  },
  {
    term: 'PEP',
    expansion: 'Policy Enforcement Point',
    definition:
      'Where access rules are evaluated at query time (Snowflake, S3, Bedrock)',
    color: 'emerald',
  },
  {
    term: 'RAP',
    expansion: 'Row Access Policy',
    definition:
      "Snowflake's native mechanism for filtering rows based on user identity",
    color: 'blue',
  },
  {
    term: 'CTAS',
    expansion: 'CREATE TABLE AS SELECT',
    definition:
      'SQL operation that materializes a query result — silently strips RAPs',
    color: 'red',
  },
  {
    term: 'ENTITLEMENTS',
    expansion: 'Entitlements Table',
    definition:
      'The mapping matrix: who can see what, populated by Okta + Salesforce',
    color: 'red',
  },
  {
    term: 'RLS',
    expansion: 'Row-Level Security',
    definition:
      'Restricting which rows a user can see based on their identity attributes',
    color: 'amber',
  },
];

export const VULN_ITEMS: {
  label: string;
  icon: LucideIcon;
  color: 'red' | 'amber';
  title: string;
  content: React.ReactNode;
}[] = [
  {
    label: 'CTAS / Materialization',
    icon: AlertOctagon,
    color: 'red',
    title: 'The CTAS / Materialization Trap',
    content: (
      <p>
        RAPs attach to the <em>object</em>, not the data. A <C>CTAS</C> downstream
        discards the policy entirely — pipelines silently produce unprotected
        tables.
      </p>
    ),
  },
  {
    label: 'Decentralized SQL',
    icon: Code,
    color: 'amber',
    title: 'The Decentralized SQL Trap',
    content: (
      <p>
        Enforcement depends on developers remembering to <C>JOIN</C> the security
        table. Missed joins pass silently — the query returns data, just without
        filtering. Breaks on aggregation or grain change — no centralized audit
        trail.
      </p>
    ),
  },
  {
    label: 'Grain Change',
    icon: GitBranch,
    color: 'red',
    title: 'Grain Change Vulnerability',
    content: (
      <p>
        When a table is aggregated to a different grain (e.g., opportunity →
        region), the original security columns may be dropped or <C>NULL</C>ed.
        The RAP continues to pass — it just filters on nothing.
      </p>
    ),
  },
  {
    label: 'Mapping Bottleneck',
    icon: Users,
    color: 'amber',
    title: 'Mapping Ownership Bottleneck',
    content: (
      <>
        <p>
          Manual user-to-row mapping bottlenecks Data Engineering. Every new user
          or role change requires a manual <C>ENTITLEMENTS</C> update.
        </p>
        <p className="text-emerald-400 font-semibold text-xs mt-2">
          Solution: Automate via Okta/Salesforce-synced <C>ENTITLEMENTS</C> ELT.
        </p>
      </>
    ),
  },
];

export const SOLUTION_PATTERNS: {
  name: string;
  standard: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    name: 'PEP / PDP Segregation',
    standard: 'NIST SP 800-162',
    description: 'Decouple who decides from who enforces',
    icon: Shield,
  },
  {
    name: 'Schema Segregation by Security Grain',
    standard: 'Logical Isolation',
    description: 'Organize shared schemas by access dimension',
    icon: Layers,
  },
  {
    name: 'Tag-Triggered Row Access Policies',
    standard: 'Attribute-Based Access Control (ABAC)',
    description: 'Policies bind to tags, not tables',
    icon: Tag,
  },
  {
    name: 'Dynamic Data Masking',
    standard: 'Column-Level Protection',
    description: 'PII masked independently of row-level filtering',
    icon: EyeOff,
  },
  {
    name: 'Developer Sandbox Isolation',
    standard: 'Ephemeral Workspaces',
    description: 'Full iteration speed with zero admin overhead',
    icon: Box,
  },
  {
    name: 'Cortex Copilot Skills',
    standard: 'AI-Assisted Developer Routing',
    description: 'Navigate governance without memorizing schema catalogs',
    icon: Sparkles,
  },
];

export const ROADMAP_EXEC: { section: string; label: string; tabId: string }[] =
  [
    { section: '§1', label: 'Summary', tabId: 'summary' },
    { section: '§2', label: 'Architecture', tabId: 'architecture' },
    { section: '§3', label: 'Security', tabId: 'security' },
    { section: '§4', label: 'Roadmap', tabId: 'roadmap' },
  ];

export const ROADMAP_ENG: { section: string; label: string; tabId: string }[] =
  [
    { section: '§1', label: 'Overview', tabId: 'overview' },
    { section: '§2', label: 'Developer Sandbox', tabId: 'sandbox' },
    { section: '§3', label: 'Schema Design', tabId: 'schema' },
    { section: '§4', label: 'Tag Taxonomy', tabId: 'taxonomy' },
    { section: '§5', label: 'Policy Logic', tabId: 'policy' },
    { section: '§6', label: 'Hardening', tabId: 'enforcement' },
    { section: '§7', label: 'Extensibility', tabId: 'extensibility' },
    { section: '§8', label: 'Roadmap & Ops', tabId: 'ops' },
  ];

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

/**
 * Hero block — gradient banner + Shield watermark + UPPERCASE title. Badge
 * copy varies per audience; everything else is identical.
 */
export const HeroBlock: React.FC<ModeProps> = ({ mode = 'exec' }) => {
  const badgeText =
    mode === 'exec' ? 'Executive Summary' : 'Section 1 · Architecture Overview';
  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#050505] border border-white/15 rounded-xl p-10 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
        <Shield size={300} className="text-red-600" />
      </div>
      <div className="relative z-10 max-w-4xl">
        <div className="inline-block px-3 py-1 bg-red-600/10 border border-red-600/30 rounded-full text-red-500 text-[10px] font-black uppercase tracking-widest mb-6">
          {badgeText}
        </div>
        <h1 className="text-4xl font-black text-white mb-4 leading-[1.1] tracking-tighter uppercase">
          Snowflake Governance &<br /> Access Architecture Plan
        </h1>
        <p className="text-gray-400 text-base leading-relaxed font-light max-w-3xl">
          Identified gaps in Snowflake's row-level security propagation can be
          closed using standard, vendor-neutral patterns — layered onto the{' '}
          <span className="text-white font-semibold">
            Unified Data Platform (UDP)
          </span>{' '}
          build already in motion.
        </p>
      </div>
    </div>
  );
};

/**
 * Six-card grid of shared vocabulary (PDP, PEP, RAP, CTAS, ENTITLEMENTS, RLS).
 * Renders identically in both modes — these are foundational terms.
 */
export const KeyConceptsGrid: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
      Key Concepts
      <span className="text-gray-500 font-normal text-xs ml-2 normal-case tracking-normal">
        — terms used throughout this document
      </span>
    </h3>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {KEY_CONCEPTS.map((kc) => {
        const s = colorStyles[kc.color];
        return (
          <div
            key={kc.term}
            className={`rounded-xl border ${s.border} ${s.bg} px-5 py-4`}
          >
            <div className="flex items-baseline gap-2 mb-1">
              <code className={`${s.accent} text-sm font-mono font-bold`}>
                {kc.term}
              </code>
              <span className="text-[10px] text-gray-500 font-mono">
                {kc.expansion}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {kc.definition}
            </p>
          </div>
        );
      })}
    </div>
  </div>
);

/**
 * Interactive PEP sidebar (Snowflake / AWS S3 / Bedrock) + DetailPanel. The
 * status footer copy adjusts for audience: exec gets a high-level framing,
 * eng gets the engineering-oriented "no shared source of truth" line.
 */
export const GovernanceChallenge: React.FC<ModeProps> = ({ mode = 'exec' }) => {
  const [activePep, setActivePep] = useState(0);
  const footerCopy =
    mode === 'exec'
      ? 'In a typical multi-platform deployment, each platform has its own access rules.'
      : 'Today: each platform maintains its own access rules — no shared source of truth.';

  const ActivePepIcon = PEP_ITEMS[activePep].icon;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
        The Governance Challenge
        <span className="text-gray-500 font-normal text-xs ml-2 normal-case tracking-normal">
          — multiple environments × multiple access grains = complexity
        </span>
      </h3>

      <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
        In a typical multi-platform deployment, the data estate spans three
        enforcement platforms (PEPs), three identity sources (Okta, Salesforce,
        manual overrides), and zero shared policy logic. Each PEP implements its
        own access rules independently — a combinatorial governance problem.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-1">
          {PEP_ITEMS.map((pep, i) => {
            const isActive = i === activePep;
            const s = colorStyles[pep.color];
            return (
              <button
                key={pep.label}
                onClick={() => setActivePep(i)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 border ${
                  isActive
                    ? `${s.border} ${s.bg} shadow-lg`
                    : 'border-transparent hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <pep.icon
                    size={14}
                    className={isActive ? s.accent : 'text-gray-500'}
                  />
                  <div>
                    <p
                      className={`text-xs font-semibold ${
                        isActive ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {pep.label}
                    </p>
                    <p className="text-[10px] text-gray-600">{pep.sublabel}</p>
                  </div>
                </div>
              </button>
            );
          })}
          <PrevNextNav
            current={activePep}
            total={PEP_ITEMS.length}
            onPrev={() => setActivePep((s) => Math.max(0, s - 1))}
            onNext={() =>
              setActivePep((s) => Math.min(PEP_ITEMS.length - 1, s + 1))
            }
          />
        </div>

        <DetailPanel activeKey={activePep}>
          <div className="rounded-xl border border-white/15 bg-[#111] p-5 space-y-3 h-full">
            <div className="flex items-center gap-2">
              <ActivePepIcon
                size={16}
                className={colorStyles[PEP_ITEMS[activePep].color].accent}
              />
              <h4 className="text-sm font-bold text-white uppercase tracking-tight">
                {PEP_ITEMS[activePep].label} Enforcement
              </h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {PEP_ITEMS[activePep].detail}
            </p>
            <div
              className={`rounded-lg border ${
                colorStyles[PEP_ITEMS[activePep].color].border
              } ${colorStyles[PEP_ITEMS[activePep].color].bg} px-3 py-2`}
            >
              <p className="text-[10px] text-gray-500 italic">{footerCopy}</p>
            </div>
          </div>
        </DetailPanel>
      </div>
    </div>
  );
};

/**
 * Interactive vulnerability sidebar (CTAS, Decentralized SQL, Grain Change,
 * Mapping Bottleneck) + DetailPanel. Same content for both audiences — the
 * <C> primitive renders inline-code identically regardless of mode.
 */
export const CoreVulnerabilities: React.FC = () => {
  const [activeVuln, setActiveVuln] = useState(0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
        Core Vulnerabilities
        <span className="text-gray-500 font-normal text-xs ml-2 normal-case tracking-normal">
          — click to explore each attack surface
        </span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
        <div className="space-y-1">
          {VULN_ITEMS.map((v, i) => {
            const isActive = i === activeVuln;
            const s = colorStyles[v.color];
            return (
              <button
                key={v.label}
                onClick={() => setActiveVuln(i)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 border ${
                  isActive
                    ? `${s.border} ${s.bg} shadow-lg`
                    : 'border-transparent hover:bg-white/[0.03]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <v.icon
                    size={14}
                    className={isActive ? s.accent : 'text-gray-500'}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      isActive ? 'text-white' : 'text-gray-500'
                    }`}
                  >
                    {v.label}
                  </span>
                </div>
              </button>
            );
          })}
          <PrevNextNav
            current={activeVuln}
            total={VULN_ITEMS.length}
            onPrev={() => setActiveVuln((s) => Math.max(0, s - 1))}
            onNext={() =>
              setActiveVuln((s) => Math.min(VULN_ITEMS.length - 1, s + 1))
            }
          />
        </div>

        <DetailPanel activeKey={activeVuln}>
          <InfoCard
            title={VULN_ITEMS[activeVuln].title}
            icon={VULN_ITEMS[activeVuln].icon}
            accent={VULN_ITEMS[activeVuln].color === 'red' ? 'red' : 'amber'}
          >
            {VULN_ITEMS[activeVuln].content}
          </InfoCard>
        </DetailPanel>
      </div>
    </div>
  );
};

/**
 * Canonical PDP/PEP visualization with the animated arrow + the two
 * Maximising-UDP-Investment / Multi-Platform-Vendor-Neutrality info cards.
 * Identical content across modes.
 */
export const SolutionPatternViz: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
      The Solution Pattern
      <span className="text-gray-500 font-normal text-xs ml-2 normal-case tracking-normal">
        — NIST SP 800-162 PDP / PEP segregation
      </span>
    </h3>

    <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
      This architecture implements NIST SP 800-162 PDP/PEP segregation. The{' '}
      <C>ENTITLEMENTS</C> table is the sole PDP — one canonical table fed by
      Okta, Salesforce, and manual overrides. Every PEP reads from this single
      source. Adding a new enforcement point requires only a lookup against{' '}
      <C>ENTITLEMENTS</C>, not a redesign of access logic.
    </p>

    <div className="bg-[#111] border border-white/20 rounded-xl p-8 space-y-4">
      <div className="rounded-xl border border-emerald-600/40 bg-emerald-600/10 px-6 py-4">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-wide">
            Policy Decision Point (PDP)
          </p>
          <span className="text-[9px] text-emerald-600 font-mono border border-emerald-600/30 rounded px-1.5 py-0.5">
            NIST SP 800-162
          </span>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          <C>ENTITLEMENTS</C> table — one canonical source of truth, fed by Okta
          + Salesforce + manual overrides. All enforcement points read from here.
        </p>
      </div>

      <div className="flex justify-center py-1 text-emerald-500">
        <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
          <path
            d="M8 0v20m0 0l-4-4m4 4l4-4"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <animate
              attributeName="stroke"
              values="#10b981;#6ee7b7;#10b981"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </path>
        </svg>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Feeds <span className="text-blue-400 font-semibold">Snowflake</span>,{' '}
        <span className="text-amber-400 font-semibold">AWS S3</span>,{' '}
        <span className="text-red-400 font-semibold">Bedrock</span>, and any
        future enforcement point
      </p>

      <p className="text-[10px] text-gray-500 text-center italic">
        Same policy logic — multiple enforcement points — zero duplication
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <InfoCard title="Maximising UDP Investment" icon={Zap} accent="emerald">
        <p>
          Environment setup, medallion architecture, and automated ingestion are
          already scoped as core UDP work. Governance layered on top moves from
          high-overhead manual provisioning to a{' '}
          <span className="text-emerald-400 font-semibold">
            net-negative effort operation
          </span>
          .
        </p>
      </InfoCard>
      <InfoCard
        title="Multi-Platform Vendor Neutrality"
        icon={Globe}
        accent="emerald"
      >
        <p>
          The architecture decouples the PDP from each PEP. The same security
          logic extends to AWS, S3, and Bedrock without duplication. See Section
          8.
        </p>
      </InfoCard>
    </div>
  </div>
);

/**
 * Six-card grid of named patterns with standards references. Identical for
 * both audiences — executives benefit from seeing standards (NIST, ABAC) as
 * signal of architectural rigor.
 */
export const SolutionPatternsGrid: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
      Solution Patterns Employed
    </h3>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {SOLUTION_PATTERNS.map((p) => (
        <div
          key={p.name}
          className="bg-[#111] border border-white/15 rounded-xl px-5 py-4 hover:border-white/25 transition-colors"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <p.icon size={14} className="text-red-500 shrink-0" />
            <p className="text-white text-xs font-bold leading-snug">{p.name}</p>
          </div>
          <p className="text-[10px] text-gray-500 font-mono mb-1.5">
            {p.standard}
          </p>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            {p.description}
          </p>
        </div>
      ))}
    </div>
  </div>
);

/**
 * UDP synergy callout — the bolder "byproduct of existing data engineering
 * work / no one-way doors" framing. Identical across modes.
 */
export const UDPSynergyCallout: React.FC = () => (
  <CalloutBox
    title="UDP Synergy & Architectural Independence"
    variant="emerald"
  >
    <p className="text-xs text-gray-300 leading-relaxed">
      This plan layers onto the UDP build already in motion. The result is{' '}
      <strong className="text-emerald-400">
        net-negative enterprise operational effort
      </strong>{' '}
      — governance becomes a byproduct of existing data engineering work. No
      one-way doors. No vendor-binding decisions. Every component uses standard
      Snowflake primitives that can be replaced or extended.
    </p>
  </CalloutBox>
);

/**
 * Document roadmap chips — picks ROADMAP_EXEC or ROADMAP_ENG based on mode.
 * Each chip dispatches `onNavigate(tabId)` on click.
 */
export const DocumentRoadmap: React.FC<NavigableModeProps> = ({
  mode = 'exec',
  onNavigate,
}) => {
  const items = mode === 'exec' ? ROADMAP_EXEC : ROADMAP_ENG;
  return (
    <div className="bg-[#111] border border-white/20 rounded-xl px-6 py-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
        Document Roadmap
        <span className="text-gray-600 font-normal normal-case tracking-normal ml-2">
          — click to navigate
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        {items.map(({ section, label, tabId }) => (
          <button
            key={section}
            onClick={() => onNavigate?.(tabId)}
            className="inline-flex items-center gap-2 text-[11px] bg-white/[0.06] border border-white/20 rounded-lg px-3 py-1.5 transition-all duration-200 hover:bg-white/10 hover:border-white/20 cursor-pointer"
          >
            <span className="text-red-600 font-black">{section}</span>
            <span className="text-gray-400">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
