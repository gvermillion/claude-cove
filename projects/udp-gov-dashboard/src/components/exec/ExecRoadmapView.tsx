// src/components/exec/ExecRoadmapView.tsx
//
// Exec Roadmap page — static narrative arc:
// pre-UDP options → what UDP completes → Day 2 ops cascade →
// honest governance-component cases → closing callout.

import React from 'react';
import {
  Map,
  ShieldCheck,
  Wrench,
  Database,
  Tag,
  Users,
  Search,
  ArrowRight,
  Bot,
  Layers,
} from 'lucide-react';
import { SectionHeader, C } from '../primitives';

const ExecRoadmapView: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <SectionHeader
        title="Roadmap"
        subtitle="The heavy lifting is the data platform. Governance layers on top at marginal cost — and until UDP goes live, proven patterns cover the gap."
        icon={Map}
      />

      {/* Beat 1 — Pre-UDP: what works today */}
      <section id="road-preudp" className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <ShieldCheck size={18} className="text-amber-500" /> Operating Today
          (Pre-UDP)
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Full governance automation arrives with UDP go-live. Until then, two
          approaches provide coverage with known trade-offs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Proven patterns */}
          <div className="rounded-xl border border-blue-600/40 bg-blue-600/10 px-5 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-blue-400" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-400">
                Proven Solution Patterns
              </p>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Existing RBAC patterns — like the HR Analytics access model already
              in production — continue to work as-is. These are standalone
              implementations that will be absorbed into the unified framework at
              go-live.
            </p>
            <ul className="space-y-1.5 text-[11px] text-gray-400">
              <li className="flex gap-2 items-start">
                <ArrowRight size={10} className="text-blue-400 mt-0.5 shrink-0" />
                <span>Policies scoped to individual data products</span>
              </li>
              <li className="flex gap-2 items-start">
                <ArrowRight size={10} className="text-blue-400 mt-0.5 shrink-0" />
                <span>Manual role-to-table access grants</span>
              </li>
              <li className="flex gap-2 items-start">
                <ArrowRight size={10} className="text-blue-400 mt-0.5 shrink-0" />
                <span>Known limitation: policies don't follow data copies or reshaping</span>
              </li>
            </ul>
            <p className="text-[10px] text-blue-400/60 font-mono">
              Works now. No migration risk — absorbed at go-live.
            </p>
          </div>

          {/* Bootstrap stop-gap */}
          <div className="rounded-xl border border-amber-600/40 bg-amber-600/10 px-5 py-4 space-y-3">
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-amber-400" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-400">
                Bootstrap Stop-Gap
              </p>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Stand up the governance framework ahead of UDP with manual inputs.
              Same architecture, same <C>ENTITLEMENTS</C> table — just
              human-curated instead of auto-populated. Manual overhead disappears
              at go-live when automated feeds replace the seed data.
            </p>
            <ul className="space-y-1.5 text-[11px] text-gray-400">
              <li className="flex gap-2 items-start">
                <ArrowRight size={10} className="text-amber-400 mt-0.5 shrink-0" />
                <span>Curated seed data loaded into <C>ENTITLEMENTS</C></span>
              </li>
              <li className="flex gap-2 items-start">
                <ArrowRight size={10} className="text-amber-400 mt-0.5 shrink-0" />
                <span>IAM pre-ingestion review for access changes</span>
              </li>
              <li className="flex gap-2 items-start">
                <ArrowRight size={10} className="text-amber-400 mt-0.5 shrink-0" />
                <span>Direct policy application to published data products</span>
              </li>
            </ul>
            <p className="text-[10px] text-amber-400/60 font-mono">
              Full architecture. Manual inputs replaced at go-live.
            </p>
          </div>
        </div>
      </section>

      {/* Beat 2 — What UDP Go-Live Completes */}
      <section id="road-golive" className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Database size={18} className="text-emerald-500" /> What UDP Go-Live
          Completes
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          The governance framework described in the Summary and Security pages
          activates fully as a byproduct of UDP go-live. Three capabilities that
          require the data platform to be in place:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            {
              icon: Users,
              title: 'Automated Identity Sync',
              desc: <>Okta groups and Salesforce ownership flow into <C>ENTITLEMENTS</C> via automated ELT. Personnel changes resolve without tickets or manual grants.</>,
              color: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-400',
            },
            {
              icon: Tag,
              title: 'Universal Tag Inheritance',
              desc: 'Schema-level governance and PII tags cascade to every child object. New tables, views, and columns inherit protection the instant they land.',
              color: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-400',
            },
            {
              icon: Bot,
              title: 'AI Copilot Skills',
              desc: 'Developers get schema routing and data-sharing guidance inline from Cortex. Governance knowledge is embedded in the tool, not memorized by engineers.',
              color: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-400',
            },
          ] as const).map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className={`rounded-xl border px-5 py-4 space-y-2 ${color}`}
            >
              <div className="flex items-center gap-2">
                <Icon size={14} className="shrink-0" />
                <p className="text-[11px] font-bold uppercase tracking-wide">
                  {title}
                </p>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-emerald-500 text-center italic font-medium">
          No separate governance initiative. These activate as part of the
          platform build already in motion.
        </p>
      </section>

      {/* Beat 3a — Day 2 Ops: cascade principle */}
      <section id="road-day2" className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Wrench size={18} className="text-blue-500" /> Day 2: Ops You Already
          Do
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Every governance domain maps to a team that already owns the
          underlying system. Their existing work cascades into{' '}
          <C>ENTITLEMENTS</C> automatically — no new processes, no new
          headcount.
        </p>

        <div className="bg-[#111] border border-white/20 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[120px_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-white/10 bg-white/[0.03]">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Domain
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Existing Team
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              What They Already Do
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
              Cascade into Governance
            </span>
          </div>
          {/* Rows */}
          {([
            {
              domain: 'Identity',
              team: 'IT / IAM',
              existing: 'Manages Okta groups and SSO provisioning',
              cascade: <>Okta group changes flow into <C>ENTITLEMENTS</C> via ELT. Access updates on the next sync cycle.</>,
            },
            {
              domain: 'Ownership',
              team: 'Domain Stewards',
              existing: 'Manages Salesforce team/territory records',
              cascade: <>Ownership records feed <C>ENTITLEMENTS</C> row-level access. Territory reassignments resolve automatically.</>,
            },
            {
              domain: 'Infrastructure',
              team: 'Data Platform Eng',
              existing: 'Runs pipelines and monitors data freshness',
              cascade: <>Pipeline promotions carry governance tags through dbt. Tag consistency enforced at build time.</>,
            },
            {
              domain: 'Auditing',
              team: 'SecOps',
              existing: 'Audits access logs and compliance controls',
              cascade: <><C>ENTITLEMENTS</C> is the single access ledger. Point-in-time queries replace cross-platform reconciliation.</>,
            },
          ]).map(({ domain, team, existing, cascade }, i, arr) => (
            <div
              key={domain}
              className={`grid grid-cols-[120px_1fr_1fr_1fr] gap-4 px-6 py-4 items-start text-xs ${
                i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''
              }`}
            >
              <span className="text-white font-bold">{domain}</span>
              <span className="text-gray-300 font-mono text-[11px]">{team}</span>
              <span className="text-gray-400">{existing}</span>
              <span className="text-gray-300">{cascade}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Beat 3b — Honest cases: when governance itself needs attention */}
      <section id="road-attention" className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Search size={18} className="text-amber-500" /> When Governance
          Components Need Attention
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Day-to-day operations cascade into governance automatically. But a
          handful of structural changes require deliberate work on the governance
          components themselves. These are infrequent and scoped.
        </p>

        <div className="bg-[#111] border border-white/20 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_100px_140px_1fr_1fr] gap-4 px-6 py-3 border-b border-white/10 bg-white/[0.03]">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
              Trigger
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Frequency
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Owner
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Action
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Brief Example
            </span>
          </div>
          {/* Rows */}
          {([
            {
              trigger: 'New data domain onboarded',
              freq: 'A few times/year',
              owner: 'Data Platform Eng',
              action: 'Add tag values, create governed schema, update dbt routing rules',
              example: 'Finance data lands in a new governed schema; tags cascade on first load',
            },
            {
              trigger: 'Sensitivity model changes',
              freq: 'Rare',
              owner: 'Data Platform Eng + SecOps',
              action: 'Update tag taxonomy, adjust masking scope to match new tiers',
              example: 'New "RESTRICTED" tier added — one tag update, all policies pick it up',
            },
            {
              trigger: 'New enforcement platform',
              freq: 'Rare',
              owner: 'Data Platform Eng',
              action: <>Build a lookup against <C>ENTITLEMENTS</C> for the new platform</>,
              example: 'Claude (Anthropic) onboarded — reads ENTITLEMENTS at inference time',
            },
            {
              trigger: 'PII masking scope changes',
              freq: 'Occasional',
              owner: 'Domain Steward + Platform Eng',
              action: <>Apply <C>PII_POLICY</C> tags to newly classified columns</>,
              example: 'Legal flags employee phone numbers as PII — tag added, masking fires',
            },
          ]).map(({ trigger, freq, owner, action, example }, i, arr) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_100px_140px_1fr_1fr] gap-4 px-6 py-4 items-start text-xs ${
                i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''
              }`}
            >
              <span className="text-amber-400/80 font-semibold">{trigger}</span>
              <span className="text-gray-500 font-mono text-[11px]">{freq}</span>
              <span className="text-gray-300 font-mono text-[11px]">{owner}</span>
              <span className="text-gray-400">{action}</span>
              <span className="text-gray-500 italic">{example}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 text-center italic">
          None of these require a governance-specific team. Each maps to the
          platform or domain team that owns the underlying change.
        </p>
      </section>

      {/* Beat 4 — Closing callout */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-8 space-y-3 shadow-xl shadow-emerald-950/10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
          The Bottom Line
        </p>
        <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
          The hard part is the data platform — and that work is already
          underway.
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Governance layers on top at marginal cost. Proven patterns cover the
          gap until go-live. Ongoing maintenance maps to teams and processes
          that already exist. Structural governance changes are infrequent,
          scoped, and owned by the people closest to the change.
        </p>
      </div>
    </div>
  );
};

export default ExecRoadmapView;
