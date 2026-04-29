import React from 'react';
import {
  Cpu,
  RefreshCcw,
  Lock,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import {
  SectionHeader,
  C,
} from '../primitives';
import { SDLCDiagram } from '../diagrams';

// --- Full sandbox permission matrix ---

const SANDBOX_ALLOWED = [
  { label: 'CREATE TABLE / VIEW',  detail: 'Materialize working tables and views inside the sandbox schema.' },
  { label: 'CREATE TEMP TABLE',    detail: 'Session-scoped scratch space; auto-dropped on disconnect.' },
  { label: 'INSERT / UPDATE / DELETE / MERGE', detail: 'Mutate sandbox-owned objects freely.' },
  { label: 'SELECT / JOIN',        detail: 'Read from any governed schema where the user has entitlements.' },
  { label: 'CREATE FUNCTION (UDF) / PROCEDURE', detail: 'Iterate on transforms, ML features, ELT logic.' },
  { label: 'CREATE STAGE (internal)', detail: 'Stage files for testing inside the account.' },
  { label: 'COPY INTO (sandbox-scoped)', detail: 'Load test data into sandbox tables.' },
  { label: 'TIME TRAVEL',          detail: 'Recover from mistakes within retention window.' },
];

const SANDBOX_BLOCKED = [
  { label: 'GRANT / REVOKE',          detail: 'Cannot share sandbox objects outward — DLP boundary.' },
  { label: 'CREATE EXTERNAL STAGE',   detail: 'No egress to outside cloud storage from the sandbox.' },
  { label: 'CREATE SHARE / REPLICATION', detail: 'No cross-account distribution.' },
  { label: 'ALTER ACCOUNT / WAREHOUSE / ROLE', detail: 'No platform-level configuration changes.' },
  { label: 'CREATE ROW ACCESS POLICY / MASKING POLICY', detail: 'Policy authorship is centralized; sandbox cannot self-grant exemptions.' },
  { label: 'MOUNT EXTERNAL OBJECT STORE', detail: 'No bridging to S3 / GCS / Azure outside the governed perimeter.' },
  { label: 'EXFIL VIA UDF (network egress)', detail: 'External access integrations are not enabled in sandbox.' },
];

const SANDBOX_PERIMETER_GUARANTEES = [
  { label: 'Row Access Policies remain enforced', detail: 'Reading governed schemas applies the same RAPs as production.' },
  { label: 'Masking Policies remain enforced',    detail: 'PII columns stay masked in sandbox queries.' },
  { label: 'Lineage is captured',                  detail: 'Snowflake ACCESS_HISTORY records every read; sandbox is fully audited.' },
  { label: '30-day auto-drop',                     detail: 'Idle sandbox schemas are auto-cleaned after 30 days.' },
  { label: 'Offboarding cascade',                  detail: 'When a user is offboarded in Okta, their sandbox is dropped within 24h.' },
];

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
        badge="Section 2 · Developer Experience"
      />

      {/* Thesis headline — the page's central claim, lifted from the bottom callout */}
      <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent p-8 shadow-xl shadow-blue-950/10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-3">
          The Thesis
        </p>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-4">
          Governance is invisible to the developer.
        </h2>
        <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">
          The developer never writes a <C>GRANT</C>, applies a tag, or configures a
          policy. They write SQL in their sandbox, ask Copilot for routing guidance
          when ready to share, and promote via dbt. Security is structural — enforced by schema placement
          and tag inheritance.
        </p>
      </div>

      {/* Two-Stage Lifecycle — overview + SDLC diagram + stage cards */}
      <div className="space-y-6">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <RefreshCcw size={18} className="text-red-600" /> The Two-Stage Lifecycle
        </h3>
        <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">
          Every developer gets a private sandbox schema with full CRUD — no tickets,
          no admin overhead. When they're ready to share their work, Cortex Copilot
          analyzes the data and recommends the correct governed schema based on security
          grain. Writing to that schema automatically triggers governance: dbt post-hooks
          apply tags, and tag inheritance activates Row Access Policies. The developer
          never touches a policy.
        </p>
        <SDLCDiagram />
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
              {/* Allowed actions — folded */}
              <details className="group mb-3">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14] border border-emerald-500/20 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    Allowed actions ({SANDBOX_ALLOWED.length})
                  </span>
                  <ChevronDown
                    size={12}
                    className="text-emerald-400 transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="space-y-1.5 mt-3 px-1">
                  {SANDBOX_ALLOWED.map((item) => (
                    <div key={item.label}>
                      <span className="text-xs font-mono text-gray-300">{item.label}</span>
                      <p className="text-[10px] text-gray-500 leading-tight">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </details>
              {/* Blocked actions — folded */}
              <details className="group">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-red-500/[0.06] hover:bg-red-500/[0.12] border border-red-500/20 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                    Forbidden actions ({SANDBOX_BLOCKED.length})
                  </span>
                  <ChevronDown
                    size={12}
                    className="text-red-400 transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="space-y-1.5 mt-3 px-1">
                  {SANDBOX_BLOCKED.map((item) => (
                    <div key={item.label}>
                      <span className="text-xs font-mono text-red-400 line-through">{item.label}</span>
                      <p className="text-[10px] text-red-400/60 leading-tight">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </details>
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
              <div className="space-y-1.5">
                {SANDBOX_PERIMETER_GUARANTEES.map((item) => (
                  <div key={item.label}>
                    <span className="text-xs font-mono text-red-300">{item.label}</span>
                    <p className="text-[10px] text-gray-400 leading-tight">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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

    </div>
  );
};

export default SandboxView;
