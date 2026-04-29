// src/components/exec/execNarrative.tsx
//
// Narrative-arc components for the Exec Summary page. Designed to read as a
// compelling story: problem → scaling risk → attack surface → requirements →
// NIST solution → implementation specifics → value proposition.

import React from 'react';
import {
  Shield,
  AlertOctagon,
  Code,
  GitBranch,
  Users,
  TrendingUp,
  Globe,
  Zap,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { C, colorStyles } from '../primitives';
import { EntitlementsDiagram } from '../diagrams';

/* ------------------------------------------------------------------ */
/*  Section 1 — Hero                                                   */
/* ------------------------------------------------------------------ */

export const ExecHero: React.FC = () => (
  <div className="bg-gradient-to-br from-[#1a1a1a] to-[#050505] border border-white/15 rounded-xl p-10 relative overflow-hidden">
    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
      <Shield size={300} className="text-red-600" />
    </div>
    <div className="relative z-10 max-w-4xl">
      <div className="inline-block px-3 py-1 bg-red-600/10 border border-red-600/30 rounded-full text-red-500 text-[10px] font-black uppercase tracking-widest mb-6">
        Executive Summary
      </div>
      <h1 className="text-4xl font-black text-white mb-4 leading-[1.1] tracking-tighter uppercase">
        Enterprise Data Governance<br />That Scales With You
      </h1>
      <p className="text-gray-400 text-base leading-relaxed font-light max-w-3xl">
        A vendor-neutral, standards-based access architecture that turns
        governance from a manual bottleneck into an automated byproduct of the{' '}
        <span className="text-white font-semibold">
          Unified Data Platform (UDP)
        </span>{' '}
        build already in motion.
      </p>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Section 2 — The Problem Today                                      */
/* ------------------------------------------------------------------ */

const PROBLEM_CARDS = [
  {
    title: 'Fragmented Identity',
    desc: 'Okta handles authentication, Salesforce owns territory assignments, and JIRA tracks access exceptions — but nothing ties them together for data access decisions.',
    color: 'red',
  },
  {
    title: 'Manual Provisioning',
    desc: 'Every new hire, role change, or territory adjustment requires a ticket, an engineer to update access rules, and a manager to verify. Time-to-access becomes a bottleneck.',
    color: 'amber',
  },
  {
    title: 'Platform Silos',
    desc: 'Snowflake, S3, and Bedrock each enforce access independently. A policy change in one doesn\'t propagate to the others — three systems to update, three chances to drift.',
    color: 'red',
  },
];

export const ProblemToday: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
      The Problem Today
    </h3>
    <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
      The modern data estate doesn't live in one place. Analytics run in
      Snowflake. Data lakes live in S3. AI models hit Bedrock. Each platform has
      its own access model, its own admin surface, and its own definition of "who
      can see what."
    </p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {PROBLEM_CARDS.map(({ title, desc, color }) => {
        const s = colorStyles[color];
        return (
          <div
            key={title}
            className={`rounded-xl border ${s.border} ${s.bg} px-5 py-4`}
          >
            <p
              className={`text-xs font-bold uppercase tracking-wide ${s.accent} mb-2`}
            >
              {title}
            </p>
            <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
          </div>
        );
      })}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Section 3 — The 3–5 Year Horizon                                   */
/* ------------------------------------------------------------------ */

const HORIZON_ROWS = [
  {
    label: 'Data Volume',
    now: 'Hundreds of governed tables',
    future: 'Thousands across medallion layers',
    risk: 'Every new table needs manual policy attachment — or ships ungoverned.',
  },
  {
    label: 'User Base',
    now: 'Analysts & engineers in core BUs',
    future: 'Cross-functional users, partners, global teams',
    risk: 'Manual onboarding can\'t keep pace. Time-to-access becomes a blocker.',
  },
  {
    label: 'Platform Sprawl',
    now: 'Snowflake + S3',
    future: '+ Bedrock, partner APIs, new BI tools',
    risk: 'Each new platform requires a parallel access model maintained by hand.',
  },
  {
    label: 'AI Adoption',
    now: 'Exploratory',
    future: 'Production agents, copilots, RAG pipelines',
    risk: 'AI agents inherit whatever access you give them. No governance = uncontrolled exposure.',
  },
];

export const ScalingHorizon: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/20 pb-2">
      <TrendingUp size={18} className="text-red-600" /> The 3–5 Year Horizon
    </h3>
    <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
      Today's governance approach may work at current scale. But every one of
      these growth vectors compounds the problem — and brittle, manual solutions
      break quietly.
    </p>
    <div className="bg-[#111] border border-white/20 rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-white/10 bg-white/[0.03]">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          Today
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          3–5 Years
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-red-800">
          Risk
        </span>
      </div>
      {/* Data rows */}
      {HORIZON_ROWS.map(({ label, now, future, risk }, i) => (
        <div
          key={label}
          className={`grid grid-cols-[140px_1fr_1fr_1fr] gap-4 px-6 py-3.5 items-start text-xs ${
            i < HORIZON_ROWS.length - 1 ? 'border-b border-white/[0.06]' : ''
          }`}
        >
          <span className="text-white font-bold uppercase tracking-tight">
            {label}
          </span>
          <span className="text-gray-400">{now}</span>
          <span className="text-gray-300">{future}</span>
          <span className="text-red-400/80">{risk}</span>
        </div>
      ))}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Section 4 — Attack Vectors                                         */
/* ------------------------------------------------------------------ */

const ATTACK_VECTORS = [
  {
    icon: AlertOctagon,
    title: 'Data Copies Lose Protection',
    desc: 'When a pipeline materializes data into a new table, the access policy stays behind on the original. The copy is unprotected and nobody is notified.',
    color: 'red' as const,
  },
  {
    icon: Code,
    title: 'Enforcement Depends on Discipline',
    desc: 'Security only works if every developer remembers to attach the rule book to their query. A missed join silently returns unfiltered data — the query succeeds, just without protection.',
    color: 'amber' as const,
  },
  {
    icon: GitBranch,
    title: 'Reshaping Data Strips the Rules',
    desc: 'When data is aggregated to a different level, the columns that drove access rules may vanish. The policy technically still applies — it just filters on nothing.',
    color: 'red' as const,
  },
  {
    icon: Users,
    title: 'Onboarding Takes Engineering Tickets',
    desc: 'Every new user or role change requires a manual update to the access matrix. Data Engineering is in the loop for every personnel change — slow, error-prone, and doesn\'t scale.',
    color: 'amber' as const,
  },
];

export const AttackVectors: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
      Attack Vectors Any Solution Must Address
    </h3>
    <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
      These aren't hypothetical risks. They're structural weaknesses in how
      row-level security works across platforms today — and any governance
      solution must close all four.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {ATTACK_VECTORS.map(({ icon: Icon, title, desc, color }) => {
        const s = colorStyles[color];
        return (
          <div
            key={title}
            className={`rounded-xl border ${s.border} ${s.bg} px-5 py-4`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={s.accent} />
              <p className={`text-xs font-bold ${s.accent}`}>{title}</p>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
          </div>
        );
      })}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Section 5 — Design Requirements                                    */
/* ------------------------------------------------------------------ */

const REQUIREMENTS = [
  {
    icon: Globe,
    title: 'Cloud & Vendor Agnostic',
    desc: 'Works across Snowflake, AWS, Azure, GCP — no vendor lock-in at the governance layer.',
  },
  {
    icon: TrendingUp,
    title: 'Scales Automatically',
    desc: 'New platforms, new users, new data sources inherit governance on day one — no redesign needed.',
  },
  {
    icon: Zap,
    title: 'Zero Manual Overhead',
    desc: 'Role changes in Okta, territory shifts in Salesforce — governance updates automatically. No tickets.',
  },
];

export const DesignRequirements: React.FC = () => (
  <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent p-8">
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400 mb-3">
      Design Requirements
    </p>
    <h2 className="text-xl font-black text-white tracking-tight leading-tight mb-6">
      Any solution must be vendor-neutral, cloud-agnostic, and future-proof.
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {REQUIREMENTS.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="flex gap-3 items-start">
          <div className="shrink-0 w-7 h-7 rounded-lg bg-amber-600/20 flex items-center justify-center mt-0.5">
            <Icon size={14} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-white mb-1">{title}</p>
            <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Section 6 — The NIST Solution Pattern                              */
/* ------------------------------------------------------------------ */

export const NistPattern: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
      The Answer: Separate Decisions from Enforcement
      <span className="text-gray-500 font-normal text-xs ml-2 normal-case tracking-normal">
        — NIST SP 800-162
      </span>
    </h3>
    <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
      NIST SP 800-162 defines a proven enterprise pattern: separate where access
      rules <em className="text-gray-300">live</em> (the{' '}
      <strong className="text-emerald-400">Policy Decision Point</strong>) from
      where they are <em className="text-gray-300">enforced</em> (
      <strong className="text-gray-300">Policy Enforcement Points</strong>). One
      source of truth feeds every platform. No duplication, no drift.
    </p>
    <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
      The key insight: an <C>ENTITLEMENTS</C> table sits downstream of the tools
      that already manage your identity and ownership data — Okta, Salesforce,
      JIRA. When someone changes roles during normal business operations,
      governance updates automatically. No tickets, no engineering intervention.
    </p>

    {/* Compact PDP → PEP visual */}
    <div className="bg-[#111] border border-white/20 rounded-xl p-8 space-y-5">
      {/* Source row */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {['Okta', 'Salesforce', 'JIRA'].map((src) => (
          <div
            key={src}
            className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-xs text-gray-400 font-semibold"
          >
            {src}
          </div>
        ))}
      </div>

      <div className="flex justify-center text-gray-600">
        <ChevronRight size={16} className="rotate-90" />
      </div>

      {/* PDP */}
      <div className="rounded-xl border-2 border-emerald-600/60 bg-emerald-600/10 px-6 py-4 text-center max-w-md mx-auto">
        <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">
          Policy Decision Point
        </p>
        <p className="text-emerald-300 text-sm font-black uppercase tracking-tight">
          ENTITLEMENTS
        </p>
        <p className="text-[10px] text-gray-500 mt-1">
          Single source of truth — who can see what, and why
        </p>
      </div>

      <div className="flex justify-center text-emerald-500">
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

      {/* PEP row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Snowflake',
            sub: 'Row Access Policies',
            border: 'border-blue-500/30',
            bg: 'bg-blue-500/5',
            color: 'text-blue-400',
          },
          {
            label: 'AWS S3',
            sub: 'Lake Formation',
            border: 'border-amber-500/30',
            bg: 'bg-amber-500/5',
            color: 'text-amber-400',
          },
          {
            label: 'Bedrock',
            sub: 'AI Guardrails',
            border: 'border-red-500/30',
            bg: 'bg-red-500/5',
            color: 'text-red-400',
          },
          {
            label: 'Future PEP',
            sub: 'Any platform',
            border: 'border-white/15',
            bg: 'bg-white/[0.03]',
            color: 'text-gray-500',
            dashed: true,
          },
        ].map(({ label, sub, border, bg, color, dashed }) => (
          <div
            key={label}
            className={`rounded-xl border ${dashed ? 'border-dashed' : ''} ${border} ${bg} px-3 py-3 text-center`}
          >
            <p className={`text-[11px] font-bold ${color}`}>{label}</p>
            <p className="text-[9px] text-gray-500 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-gray-500 text-center italic">
        Same policy logic — multiple enforcement points — zero duplication
      </p>
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Section 7 — Implementation Specifics                               */
/* ------------------------------------------------------------------ */

export const EntitlementsSpecifics: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
      How It Works in Practice
    </h3>
    <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
      Okta and Salesforce — tools you already maintain — feed the{' '}
      <C>ENTITLEMENTS</C> table through automated ELT pipelines. The table lives
      in Snowflake today, but the pattern works identically against S3, a
      database, or any future data store. Every enforcement point reads from one
      place.
    </p>
    <EntitlementsDiagram mode="exec" />
  </div>
);

/* ------------------------------------------------------------------ */
/*  Section 8 — Value Proposition                                      */
/* ------------------------------------------------------------------ */

const VALUE_ITEMS = [
  {
    icon: Zap,
    headline: 'The Hard Part Is Already Happening',
    body: (
      <p>
        Enterprise governance solutions at this level of sophistication are
        typically out of reach — they require significant foundational data
        engineering before the first policy can be written. With{' '}
        <strong className="text-white">UDP</strong>, that foundational work is
        already in motion. Governance layers on top at{' '}
        <strong className="text-emerald-400">marginal cost</strong>.
      </p>
    ),
  },
  {
    icon: ArrowRight,
    headline: 'Operational Effort Goes Down, Not Up',
    body: (
      <>
        <p>
          Because <C>ENTITLEMENTS</C> sits downstream of Okta and Salesforce,
          you get{' '}
          <strong className="text-emerald-400">
            out-of-the-box governance
          </strong>{' '}
          going forward. But the real win: many existing processes that today
          involve opening a ticket and manually granting permissions can be taken
          over by this framework.
        </p>
        <p className="mt-2 text-emerald-400 font-semibold">
          Net effect: decreased operational effort for the org while delivering
          best-in-class governance — positioned for whatever new technology comes
          out tomorrow.
        </p>
      </>
    ),
  },
  {
    icon: Globe,
    headline: 'No Vendor Lock-In. No One-Way Doors.',
    body: (
      <p>
        The underlying solution pattern — PDP/PEP segregation from NIST SP
        800-162 — is agnostic to cloud provider, data platform, and vendor.
        Snowflake, AWS, Azure, GCP, or whatever comes next: the architecture
        adapts without redesign. Every component uses standard primitives that
        can be replaced or extended independently.
      </p>
    ),
  },
];

export const ValueProposition: React.FC = () => (
  <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-8 space-y-6 shadow-xl shadow-emerald-950/10">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">
        Why This Matters
      </p>
      <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
        Enterprise-grade governance — delivered as a byproduct of work already
        underway.
      </h2>
    </div>

    <div className="space-y-5">
      {VALUE_ITEMS.map(({ icon: Icon, headline, body }) => (
        <div key={headline} className="flex gap-4 items-start">
          <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-600/20 flex items-center justify-center mt-0.5">
            <Icon size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white mb-1.5">{headline}</p>
            <div className="text-xs text-gray-300 leading-relaxed">{body}</div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
