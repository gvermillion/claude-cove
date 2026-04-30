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

    <div className="mt-6 space-y-3">
      <p className="text-xs font-bold text-white uppercase tracking-wide">
        Structural Risks to Address
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {[
          { icon: AlertOctagon, text: 'Data copies lose protection — policies stay on the original, copies ship ungoverned.' },
          { icon: Code, text: 'Enforcement depends on discipline — a missed join silently returns unfiltered data.' },
          { icon: GitBranch, text: 'Reshaping data strips the rules — aggregation removes the columns policies filter on.' },
          { icon: Users, text: 'Onboarding takes engineering tickets — every personnel change requires manual access updates.' },
        ].map(({ icon: Icon, text }) => (
          <div key={text} className="flex gap-2 items-start">
            <Icon size={12} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
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
        —{' '}
        <a
          href="https://csrc.nist.gov/pubs/sp/800/162/upd2/final"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-500/80 hover:text-emerald-400 underline decoration-emerald-500/30 hover:decoration-emerald-400/60 transition-colors"
        >
          NIST SP 800-162
        </a>
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

    <EntitlementsDiagram mode="exec" />
  </div>
);

/* ------------------------------------------------------------------ */
/*  Section 7 — Governance in Action (scenarios)                       */
/* ------------------------------------------------------------------ */
/*  Section 7b — Governance in Action (scenarios)                      */
/* ------------------------------------------------------------------ */

const SCENARIOS: {
  event: string;
  trigger: string;
  effect: React.ReactNode;
  icon: string;
}[] = [
  {
    event: 'New employee starts',
    trigger: 'IT creates Okta account, assigns groups',
    effect: <><C>ENTITLEMENTS</C> row created automatically. Employee sees only the data their role permits — day one, no tickets.</>,
    icon: '→',
  },
  {
    event: 'Employee offboarded',
    trigger: 'Okta account deactivated',
    effect: <><C>ENTITLEMENTS</C> rows removed. All platform access revoked within the next ELT cycle — no stale permissions.</>,
    icon: '×',
  },
  {
    event: 'Promotion / role change',
    trigger: 'Manager updates Okta group membership',
    effect: <><C>ENTITLEMENTS</C> adjust to reflect expanded (or narrowed) access. No engineering involvement.</>,
    icon: '↑',
  },
  {
    event: 'Developer joins a new project',
    trigger: 'Added to project group in Okta',
    effect: <>Data domains for that project become visible. Sandbox stays unchanged — governed schemas update.</>,
    icon: '+',
  },
  {
    event: 'Sales rep moves territories',
    trigger: 'Territory reassigned in Salesforce',
    effect: <>Rep sees new territory data, loses old territory data. Pipeline forecasts and dashboards adjust automatically.</>,
    icon: '⇄',
  },
];

export const GovernanceInAction: React.FC = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
      Governance in Action
    </h3>
    <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
      Every scenario below resolves automatically — no tickets, no manual grants,
      no engineering time. The governance framework inherits changes from systems
      your teams already maintain.
    </p>
    <div className="bg-[#111] border border-white/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[200px_1fr_1fr] gap-4 px-6 py-3 border-b border-white/10 bg-white/[0.03]">
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          Event
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          Current Ops Activity
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
          Auto-Updated Governance
        </span>
      </div>
      {/* Rows */}
      {SCENARIOS.map(({ event, trigger, effect, icon }, i) => (
        <div
          key={event}
          className={`grid grid-cols-[200px_1fr_1fr] gap-4 px-6 py-4 items-start text-xs ${
            i < SCENARIOS.length - 1 ? 'border-b border-white/[0.06]' : ''
          }`}
        >
          <span className="text-white font-bold flex items-center gap-2">
            <span className="shrink-0 w-6 h-6 rounded-md bg-emerald-600/15 text-emerald-400 text-[11px] font-black flex items-center justify-center">
              {icon}
            </span>
            {event}
          </span>
          <span className="text-gray-400">{trigger}</span>
          <span className="text-gray-300">{effect}</span>
        </div>
      ))}
    </div>
    <p className="text-[10px] text-emerald-500 text-center italic font-medium">
      Zero engineering tickets. Zero manual access changes. Governance is a byproduct of operations you're already doing.
    </p>
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
