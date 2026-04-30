// src/components/exec/ExecSecurityView.tsx
//
// Exec Security page — static narrative arc:
// risk→defense mapping → defense-in-depth layers → column-level protection →
// compliance posture → closing callout.

import React from 'react';
import {
  Shield,
  ShieldCheck,
  AlertOctagon,
  Code,
  GitBranch,
  Users,
  EyeOff,
  Lock,
  FileCheck,
  Layers,
  Search,
} from 'lucide-react';
import { SectionHeader, C } from '../primitives';

const ExecSecurityView: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <SectionHeader
        title="Security Posture"
        subtitle="Four independent defense layers. No single point of failure. Every risk the Summary identified is closed by a specific mechanism."
        icon={Shield}
      />

      {/* Beat 1 — Risk → Defense mapping */}
      <section id="sec-risk" className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <AlertOctagon size={18} className="text-red-600" /> Every Risk Maps to
          a Defense
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          The Summary identified four structural risks in how row-level security
          works today. Each one is addressed by a specific layer of the
          architecture — not by policy or process, but by mechanism.
        </p>

        <div className="bg-[#111] border border-white/20 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[44px_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-white/10 bg-white/[0.03]">
            <span />
            <span className="text-[10px] font-black uppercase tracking-widest text-red-800">
              Risk
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Defense Layer
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
              How It's Closed
            </span>
          </div>
          {/* Rows */}
          {([
            {
              icon: AlertOctagon,
              risk: 'Data copies lose protection',
              layer: 'Schema Inheritance',
              defense: <>Tags set on a governed schema cascade to every child object. Copies landing in governed schemas inherit protection automatically — no manual tagging.</>,
            },
            {
              icon: Code,
              risk: 'Enforcement depends on discipline',
              layer: 'Tag-Based Policies',
              defense: <>RAPs and masking policies bind to tags, not individual tables. Any tagged object is filtered at query time — no join to remember, no developer discipline required.</>,
            },
            {
              icon: GitBranch,
              risk: 'Reshaping data strips the rules',
              layer: 'CI/CD Gate',
              defense: <>dbt routing blocks promotion of misconfigured tables before they reach governed schemas. Aggregations that drop security columns fail the pipeline.</>,
            },
            {
              icon: Users,
              risk: 'Onboarding takes tickets',
              layer: <><C>ENTITLEMENTS</C> (PDP)</>,
              defense: <>Identity flows from Okta and Salesforce into <C>ENTITLEMENTS</C> via automated ELT. Personnel changes resolve without engineering involvement.</>,
            },
          ] as const).map(({ icon: Icon, risk, layer, defense }, i, arr) => (
            <div
              key={risk}
              className={`grid grid-cols-[44px_1fr_1fr_1fr] gap-4 px-6 py-4 items-start text-xs ${
                i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''
              }`}
            >
              <span className="shrink-0 w-7 h-7 rounded-md bg-red-600/15 text-red-400 flex items-center justify-center">
                <Icon size={13} />
              </span>
              <span className="text-red-400/80 font-semibold">{risk}</span>
              <span className="text-gray-300 font-mono text-[11px]">{layer}</span>
              <span className="text-gray-400">{defense}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Beat 2 — Defense in Depth (static stack) */}
      <section id="sec-depth" className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <ShieldCheck size={18} className="text-red-600" /> Defense in Depth —
          Four Independent Layers
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          No single control is trusted in isolation. An attack must penetrate
          every layer to reach protected data. If any one layer fails, the others
          still hold.
        </p>

        <div className="space-y-2">
          {([
            {
              num: '1',
              name: 'CI/CD Gate',
              role: 'Build-time enforcement',
              detail: 'dbt routing rules enforce correct schema placement at build time. A misconfigured table cannot be promoted — the pipeline blocks it before it ever reaches a governed schema.',
              blocks: 'Unauthorized schema placement, misconfigured pipelines, accidental promotion of ungoverned assets.',
              color: 'border-amber-600/40 bg-amber-600/10',
              numColor: 'bg-amber-600/20 text-amber-400',
              accent: 'text-amber-400',
            },
            {
              num: '2',
              name: 'Schema Inheritance',
              role: 'Automatic coverage',
              detail: <>Tags set on a governed schema cascade to every child object — tables, views, columns. This includes both governance tags (which trigger RAPs) and classification tags like <C>PII_POLICY</C> (which trigger column masking). New objects inherit both the instant they land.</>,
              blocks: 'Missing tags on new objects, forgotten manual tagging, unmasked PII columns, protection gaps between table creation and policy attachment.',
              color: 'border-emerald-600/40 bg-emerald-600/10',
              numColor: 'bg-emerald-600/20 text-emerald-400',
              accent: 'text-emerald-400',
            },
            {
              num: '3',
              name: 'Tag-Based Policies',
              role: 'Query-time enforcement',
              detail: <>Row Access Policies and Dynamic Data Masking policies both bind to tags, not individual tables. Governance tags trigger row filtering; <C>PII_POLICY</C> tags trigger column masking. Both fire automatically at query time on any tagged object — inherited or directly applied.</>,
              blocks: 'Tagged objects escaping row-level or column-level enforcement regardless of how they acquired the tag.',
              color: 'border-blue-600/40 bg-blue-600/10',
              numColor: 'bg-blue-600/20 text-blue-400',
              accent: 'text-blue-400',
            },
            {
              num: '⛊',
              name: <><C>ENTITLEMENTS</C> (PDP)</>,
              role: 'Last line of defense',
              detail: <>All RAPs evaluate against <C>ENTITLEMENTS</C> at query time. Even if every outer layer fails, this table still gates every query. Non-bypassable — the single source of truth for who can see what.</>,
              blocks: <>Direct table access bypassing all outer controls. <C>ENTITLEMENTS</C> is the final gate at query evaluation time.</>,
              color: 'border-red-600/40 bg-red-600/10',
              numColor: 'bg-red-600/20 text-red-400',
              accent: 'text-red-400',
            },
          ]).map(({ num, name, role, detail, blocks, color, numColor, accent }, i) => (
            <div
              key={i}
              className={`rounded-xl border ${color} px-5 py-4 flex gap-4 items-start`}
            >
              <div className={`shrink-0 w-8 h-8 rounded-lg ${numColor} flex items-center justify-center text-sm font-black`}>
                {num}
              </div>
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className={`text-xs font-bold ${accent}`}>{name}</p>
                  <span className="text-[10px] font-mono text-gray-500">{role}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{detail}</p>
                <p className="text-[10px] text-red-400/70 leading-relaxed">
                  <span className="font-bold uppercase tracking-wide text-red-500 mr-1">Blocks:</span>
                  {blocks}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-emerald-500 text-center italic font-medium">
          Four independent layers. An attack must penetrate all four to reach
          protected data.
        </p>
      </section>

      {/* Beat 3 — Column-Level Protection */}
      <section id="sec-dimensions" className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <EyeOff size={18} className="text-red-600" /> Two Dimensions of
          Protection
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Row-level security controls <em className="text-gray-300">which records</em> a
          user can see. Column-level masking controls{' '}
          <em className="text-gray-300">which fields</em>. Both operate
          independently — a user who passes the row filter may still see masked
          columns.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border border-blue-600/40 bg-blue-600/10 px-5 py-4 space-y-2">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-blue-400" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-blue-400">
                Row Filtering
              </p>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              RAPs evaluate <C>ENTITLEMENTS</C> at query time to determine which
              rows a user can see. Based on identity attributes — role, team,
              territory, domain ownership.
            </p>
            <p className="text-[10px] text-gray-500 font-mono">
              "Can this user see this record?"
            </p>
          </div>
          <div className="rounded-xl border border-amber-600/40 bg-amber-600/10 px-5 py-4 space-y-2">
            <div className="flex items-center gap-2">
              <EyeOff size={14} className="text-amber-400" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-400">
                Column Masking
              </p>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Dynamic Data Masking policies apply to columns tagged with
              PII classification. Masked by default — visible only to users
              with an explicit unmask grant (e.g., security analysts, fraud
              investigators).
            </p>
            <p className="text-[10px] text-gray-500 font-mono">
              "Can this user see this field?"
            </p>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 text-center italic">
          Both controls fire independently. Masking applies after row filtering —
          a user who passes the row check may still see redacted fields.
        </p>
      </section>

      {/* Beat 4 — Compliance & Audit Posture */}
      <section id="sec-compliance" className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <FileCheck size={18} className="text-red-600" /> Compliance & Audit
          Posture
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Every control maps to a compliance requirement. Access decisions are
          traceable, policy changes flow through version control, and audit
          queries resolve from a single table.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {([
            {
              icon: Search,
              title: 'Auditability',
              desc: <><C>ENTITLEMENTS</C> is the complete access ledger. Point-in-time queries answer "who had access to what, when" from a single table — no cross-platform reconciliation.</>,
              color: 'border-blue-600/40 bg-blue-600/10 text-blue-400',
            },
            {
              icon: Lock,
              title: 'Least Privilege by Default',
              desc: <>Access is derived from role and ownership attributes, not granted manually. If a user's identity doesn't map to an <C>ENTITLEMENTS</C> row, access is denied — fail-closed, not fail-open.</>,
              color: 'border-amber-600/40 bg-amber-600/10 text-amber-400',
            },
            {
              icon: Users,
              title: 'Separation of Duties',
              desc: 'Policy authorship (CI/CD + dbt) is separated from enforcement (RAPs at query time) and identity management (Okta/Salesforce). No single team controls all three.',
              color: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-400',
            },
            {
              icon: GitBranch,
              title: 'Change Traceability',
              desc: 'All policy changes flow through version-controlled dbt models. Every governance change has a commit hash, a PR review, and a CI/CD pipeline run — no ad-hoc grants.',
              color: 'border-red-600/40 bg-red-600/10 text-red-400',
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
      </section>

      {/* Beat 5 — Closing callout */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-8 space-y-3 shadow-xl shadow-emerald-950/10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
          The Bottom Line
        </p>
        <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
          Security is structural — built into how data moves, how identity resolves, and how policies propagate.
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Four independent layers that fail safely. Two dimensions of
          protection that operate independently. A single audit surface that
          answers any compliance question from one table.
        </p>
      </div>
    </div>
  );
};

export default ExecSecurityView;
