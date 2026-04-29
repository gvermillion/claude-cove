import React from 'react';
import {
  Cpu,
  RefreshCcw,
  Lock,
  Zap,
  ArrowRight,
} from 'lucide-react';
import {
  SectionHeader,
  CalloutBox,
  C,
} from './primitives';
import { SDLCDiagram } from './diagrams';

// --- Hardening layer data (compact summary — canonical detail lives in EnforcementView) ---

const hardeningSummary = [
  { label: 'Isolation', desc: 'User-owned role per sandbox — no cross-user access' },
  { label: 'DLP Block', desc: 'COPY INTO and external stages explicitly revoked' },
  { label: '30-Day Auto-Drop', desc: 'Stale objects cleaned up automatically' },
  { label: 'Offboarding Cascade', desc: 'DROP SCHEMA CASCADE on Okta deactivation' },
  { label: 'Lineage Tagging', desc: 'Gold-layer source metadata for SecOps audit' },
];

const SandboxView = ({ onNavigate }: { onNavigate?: (tabId: string) => void }) => {
  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="The Governed Developer Experience"
        subtitle="Developers need unrestricted iteration speed. The enterprise needs security guarantees. This section shows how both coexist — without requiring developers to understand governance."
        icon={Cpu}
        badge="Sections 2 & 7"
      />

      {/* Two-Stage Lifecycle — static overview */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <RefreshCcw size={18} className="text-red-600" /> The Two-Stage Lifecycle
        </h3>
        <div className="bg-[#111] border border-white/20 rounded-xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-center">
            <div className="rounded-xl border border-gray-500/30 bg-white/[0.05] p-6 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-lg bg-white/10 text-gray-400 font-black text-xs flex items-center justify-center">1</span>
                <h4 className="text-white font-bold uppercase tracking-tight text-sm">Private Lab</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Personal sandbox schema — full CRUD, no admin overhead.
              </p>
              {/* Allowed actions */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {['CREATE TABLE', 'JOIN', 'ITERATE'].map((t) => (
                  <span key={t} className="text-[9px] font-mono bg-white/8 text-gray-400 px-2 py-1 rounded">
                    {t}
                  </span>
                ))}
              </div>
              {/* Blocked actions */}
              <div className="flex flex-wrap gap-1.5">
                {['GRANT USAGE', 'COPY INTO', 'EXTERNAL STAGE'].map((t) => (
                  <span key={t} className="text-[9px] font-mono bg-red-600/10 text-red-400/60 line-through px-2 py-1 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="hidden md:flex flex-col items-center gap-2 text-gray-500">
              <svg width="48" height="12" viewBox="0 0 48 12" fill="none">
                <path d="M0 6h44m0 0l-4-4m4 4l-4 4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className="text-[9px] font-mono text-red-600/60 uppercase leading-tight text-center max-w-[140px]">
                dbt post-hook: adds <C>DATA_DOMAIN</C>, <C>GOVERNANCE_GRAIN</C> tags
              </span>
            </div>
            <div className="flex md:hidden flex-col items-center gap-2 py-2 text-gray-500">
              <svg width="12" height="32" viewBox="0 0 12 32" fill="none">
                <path d="M6 0v28m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className="text-[9px] font-mono text-red-600/60 uppercase leading-tight text-center">
                dbt post-hook: adds <C>DATA_DOMAIN</C>, <C>GOVERNANCE_GRAIN</C> tags
              </span>
            </div>
            <div className="rounded-xl border border-red-600/40 bg-red-600/10 p-6 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-lg bg-red-600/20 text-red-500 font-black text-xs flex items-center justify-center">2</span>
                <h4 className="text-white font-bold uppercase tracking-tight text-sm">Shared Perimeter</h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                RAP-controlled shared schema — enterprise security wraps all exported data.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['ROW ACCESS POLICY', 'BI DASHBOARDS', 'GOVERNED'].map((t) => (
                  <span key={t} className="text-[9px] font-mono bg-red-600/10 text-red-400/60 px-2 py-1 rounded">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SDLC — dual-entrypoint diagram */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Zap size={18} className="text-red-600" /> Developer SDLC — Two Paths to Governance
        </h3>
        <SDLCDiagram />
      </div>

      {/* Sandbox Hardening Controls — compact summary */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Lock size={18} className="text-red-600" /> Sandbox Hardening Controls
        </h3>
        <div className="bg-[#111] border border-white/20 rounded-xl p-6 space-y-3">
          {hardeningSummary.map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="shrink-0 w-5 h-5 rounded bg-red-600/20 text-red-500 font-black text-[9px] flex items-center justify-center">
                {i + 1}
              </span>
              <p className="text-xs text-gray-400">
                <span className="text-white font-bold">{item.label}</span>
                {' — '}
                {item.desc}
              </p>
            </div>
          ))}
        </div>
        <button
          onClick={() => onNavigate?.('enforcement')}
          className="flex items-center gap-2 text-xs text-red-400 hover:text-red-300 transition-colors group"
        >
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          See §3: Hardening for full controls detail
        </button>
      </div>

      <CalloutBox title="Governance is Invisible to the Developer" variant="blue">
        <p>
          The developer never writes a <C>GRANT</C>, applies a tag, or configures a policy.
          They write SQL in their sandbox, ask Copilot for routing guidance, and promote via dbt.
          Security is structural — enforced by schema placement and tag inheritance.
        </p>
      </CalloutBox>
    </div>
  );
};

export default SandboxView;
