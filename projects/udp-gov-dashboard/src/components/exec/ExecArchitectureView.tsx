// src/components/exec/ExecArchitectureView.tsx
import React from 'react';
import {
  Network,
  ShieldCheck,
  ArrowRight,
  Snowflake,
  Cloud,
  Bot,
  Plus,
  Database,
  Settings,
  Minus,
  TrendingUp,
  Users,
} from 'lucide-react';
import { SectionHeader, C } from '../primitives';

const ExecArchitectureView: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <SectionHeader
        title="Scalability & Extensibility"
        subtitle="One rule book. Many enforcement points. Extend either side of the architecture without redesigning it."
        icon={Network}
      />

      {/* Beat 1 — Hub-to-spokes */}
      <section id="arch-hub" className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Network size={18} className="text-red-600" /> Decisions live in one
          place. Each enforcement point is a thin extension — not a parallel
          governance system.
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Snowflake, AWS S3, AI agents — each one reads from the same{' '}
          <C>ENTITLEMENTS</C> table. New platforms plug in without rebuilding
          the governance model.
        </p>

        <div className="bg-[#111] border border-white/20 rounded-xl p-6">
          {/* Hub */}
          <div className="flex flex-col items-center">
            <div className="rounded-xl border-2 border-emerald-600/60 bg-emerald-600/15 px-8 py-4 text-center">
              <Database size={20} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-black uppercase tracking-tight">
                <C>ENTITLEMENTS</C>
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                Single source of truth — every platform reads from here
              </p>
            </div>
            {/* Vertical stem from hub */}
            <div className="w-0.5 h-5 bg-emerald-600/60" />
          </div>

          {/* Connector: horizontal bar + vertical drops — percentage-based to track the 4-col grid */}
          <svg
            viewBox="0 0 100 8"
            preserveAspectRatio="none"
            className="hidden lg:block w-full h-7 text-emerald-600/60"
          >
            {/* Horizontal bar connecting all four drop points */}
            <line x1="12.5" y1="0" x2="87.5" y2="0" stroke="currentColor" strokeWidth="0.4" />
            {/* Vertical drops at column centers: 12.5%, 37.5%, 62.5%, 87.5% */}
            <line x1="12.5" y1="0" x2="12.5" y2="8" stroke="currentColor" strokeWidth="0.4" />
            <line x1="37.5" y1="0" x2="37.5" y2="8" stroke="currentColor" strokeWidth="0.4" />
            <line x1="62.5" y1="0" x2="62.5" y2="8" stroke="currentColor" strokeWidth="0.4" />
            <line x1="87.5" y1="0" x2="87.5" y2="8" stroke="currentColor" strokeWidth="0.4" strokeDasharray="1.2 0.8" />
          </svg>

          {/* Spoke cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                icon: Snowflake,
                label: 'Snowflake',
                mechanism: 'Row Access Policies',
                result: 'Analysts never see unauthorized rows — enforcement is invisible at query time.',
                color: 'border-blue-600/40 bg-blue-600/10 text-blue-400',
              },
              {
                icon: Cloud,
                label: 'AWS S3',
                mechanism: 'IAM + Lake Formation',
                result: 'Same identity-to-data mapping governs bucket and row-level access in the lake.',
                color: 'border-amber-600/40 bg-amber-600/10 text-amber-400',
              },
              {
                icon: Bot,
                label: 'AI Agents',
                mechanism: 'Context-window scoping',
                result: 'Chatbots and copilots are held to the same data perimeter as dashboards.',
                color: 'border-red-600/40 bg-red-600/10 text-red-400',
              },
              {
                icon: Plus,
                label: 'Future Platform',
                mechanism: 'Any table read or API call',
                result: 'Plug in and inherit every existing access rule on day one.',
                color: 'border-white/20 bg-white/[0.04] text-gray-400',
                dashed: true,
              },
            ].map((spoke) => {
              const Icon = spoke.icon;
              return (
                <div
                  key={spoke.label}
                  className={`rounded-xl border px-5 py-4 space-y-2 ${spoke.color} ${'dashed' in spoke && spoke.dashed ? 'border-dashed' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="shrink-0" />
                    <p className="text-[11px] font-bold uppercase tracking-wide">
                      {spoke.label}
                    </p>
                  </div>
                  <p className="text-[10px] font-mono text-gray-500">
                    {spoke.mechanism}
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {spoke.result}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Two-track extension: PEP (enforcement) vs PDP (decisions) */}
          <div className="pt-6 mt-2 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Two ways to extend
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Track 1 — Add Enforcement Point (PEP) */}
              <div className="rounded-xl border border-blue-600/40 bg-blue-600/10 px-5 py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-blue-400" />
                  <p className="text-[11px] font-bold uppercase tracking-wide text-blue-400">
                    Add an Enforcement Point
                  </p>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  A new platform needs to enforce access — Snowflake, S3, an AI
                  agent, a BI tool.
                </p>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-gray-500">1.</span>
                  <span className="text-gray-300">Point it at <C>ENTITLEMENTS</C></span>
                  <ArrowRight size={10} className="text-gray-600" />
                  <span className="text-gray-500">2.</span>
                  <span className="text-gray-300">Map to native controls</span>
                  <ArrowRight size={10} className="text-gray-600" />
                  <span className="text-gray-500">3.</span>
                  <span className="text-blue-400 font-semibold">Every rule applies day one</span>
                </div>
              </div>
              {/* Track 2 — Add Decision Source (PDP feeder) */}
              <div className="rounded-xl border border-amber-600/40 bg-amber-600/10 px-5 py-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-amber-400" />
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-400">
                    Add a Decision Source
                  </p>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  A new identity or ownership system needs to feed governance —
                  an HR platform, a partner IdP, a new project tracker.
                </p>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-gray-500">1.</span>
                  <span className="text-gray-300">Build ELT into <C>ENTITLEMENTS</C></span>
                  <ArrowRight size={10} className="text-gray-600" />
                  <span className="text-gray-500">2.</span>
                  <span className="text-gray-300">Map to domain tags</span>
                  <ArrowRight size={10} className="text-gray-600" />
                  <span className="text-gray-500">3.</span>
                  <span className="text-amber-400 font-semibold">Every platform enforces it automatically</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Beat 4 — Scaling Scenarios */}
      <section id="arch-scaling" className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <TrendingUp size={18} className="text-red-600" /> What Happens When
          Things Change
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          The Summary showed how day-to-day personnel changes resolve
          automatically. Here's what happens when the architecture itself changes
          — each scenario resolves through the existing framework, no redesign
          required.
        </p>

        <div className="bg-[#111] border border-white/20 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[180px_160px_1fr_1fr] gap-4 px-6 py-3 border-b border-white/10 bg-white/[0.03]">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Scenario
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Example
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              What Changes
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
              Governance Result
            </span>
          </div>
          {/* Rows */}
          {([
            {
              icon: Plus,
              scenario: 'Add a data source',
              example: 'JIRA project data',
              change: <>New ELT pipeline writes domain tags and ownership into <C>ENTITLEMENTS</C>.</>,
              result: <>Existing policies auto-apply to JIRA data. No new rules to write — every enforcement point already knows what to enforce.</>,
            },
            {
              icon: Bot,
              scenario: 'Add an enforcement point',
              example: 'Claude (Anthropic)',
              change: <>Claude reads <C>ENTITLEMENTS</C> at inference time to scope its context window.</>,
              result: <>Same data perimeter applies instantly. Claude cannot surface data the user isn't entitled to — identical to Snowflake or S3.</>,
            },
            {
              icon: Settings,
              scenario: 'Change org-level policy',
              example: 'New sensitivity tier',
              change: <>One tag or row update in <C>ENTITLEMENTS</C>. Single commit, single table.</>,
              result: <>Every enforcement point enforces the new tier on the next query cycle. No per-platform rollout, no config drift.</>,
            },
            {
              icon: Minus,
              scenario: 'Remove a data source',
              example: 'Legacy CRM sunset',
              change: <>ELT pipeline stops. <C>ENTITLEMENTS</C> rows for that source expire or are deleted.</>,
              result: <>Access rules for the decommissioned source vanish cleanly. No orphaned grants, no stale permissions across any platform.</>,
            },
            {
              icon: ShieldCheck,
              scenario: 'Respond to an audit',
              example: 'SOC 2 evidence request',
              change: <>Nothing. <C>ENTITLEMENTS</C> is already the complete access ledger.</>,
              result: <>Point-in-time access state is queryable from a single table. No cross-platform reconciliation needed.</>,
            },
          ] as const).map(({ icon: Icon, scenario, example, change, result }, i, arr) => (
            <div
              key={scenario}
              className={`grid grid-cols-[180px_160px_1fr_1fr] gap-4 px-6 py-4 items-start text-xs ${
                i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''
              }`}
            >
              <span className="text-white font-bold flex items-center gap-2">
                <span className="shrink-0 w-6 h-6 rounded-md bg-emerald-600/15 text-emerald-400 text-[11px] font-black flex items-center justify-center">
                  <Icon size={12} />
                </span>
                {scenario}
              </span>
              <span className="text-gray-500 font-mono text-[11px]">{example}</span>
              <span className="text-gray-400">{change}</span>
              <span className="text-gray-300">{result}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Closing — Extensibility Takeaway */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-8 space-y-3 shadow-xl shadow-emerald-950/10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
          The Bottom Line
        </p>
        <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
          No platform ceiling. No governance redesign. Every new technology plugs into
          the same framework.
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Whether it's a new data source, a new AI model, or a regulation that didn't
          exist yesterday — the pattern absorbs it. One table update, zero per-platform
          rollouts.
        </p>
      </div>
    </div>
  );
};

export default ExecArchitectureView;
