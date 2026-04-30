import React from 'react';
import {
  Cpu,
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


const SandboxView = (_props: { onNavigate?: (tabId: string) => void }) => {
  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="The Governed Developer Experience"
        subtitle="Developers need unrestricted iteration speed. The enterprise needs security guarantees. This section shows how both coexist — without requiring developers to understand governance."
        icon={Cpu}
        badge="Developer Experience"
      />

      {/* Narrative connector */}
      <p className="text-xs text-gray-500 italic -mt-4">
        The Overview established the governance challenge. This section shows how developers interact with the governed platform — without ever touching a policy.
      </p>

      {/* Thesis headline — the page's central claim, lifted from the bottom callout */}
      <div id="eng-sb-thesis" className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/15 via-blue-500/5 to-transparent p-8 shadow-xl shadow-blue-950/10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-3">
          The Thesis
        </p>
        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-tight mb-4">
          Governance is invisible to the developer.
        </h2>
        <p className="text-sm text-gray-300 leading-relaxed max-w-3xl">
          Every developer gets a private sandbox schema with full CRUD — no tickets, no
          admin overhead. When they&apos;re ready to share, Cortex Code discovers the data
          domain and recommends the correct governed schema. Writing there triggers
          governance automatically: dbt post-hooks apply tags, and tag inheritance
          activates Row Access Policies. The developer never writes
          a <C>GRANT</C>, applies a tag, or configures a policy.
        </p>
      </div>

      {/* CoCo mock + stage cards */}
      <div id="eng-sb-lifecycle" className="space-y-6">
        {/* Side-by-side: CoCo mock (left) + stage cards (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cortex Code interaction mock — shows the AI-assisted routing moment */}
          <div className="rounded-xl border border-white/10 bg-[#0a0a0a] overflow-hidden self-start">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
              </div>
              <span className="text-[10px] font-mono text-gray-500 ml-2">cortex code</span>
            </div>
            <div className="p-5 space-y-4 font-mono text-[11px] leading-relaxed">
              {/* Developer prompt */}
              <div className="flex gap-3">
                <span className="shrink-0 text-blue-400 font-bold select-none">&gt;</span>
                <span className="text-gray-300">
                  I want to share <C>SANDBOX_GVERMILLION.STG_OPPORTUNITIES</C>
                </span>
              </div>
              {/* Cortex Code response */}
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 space-y-3">
                {/* Discovery */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Discovery</p>
                  <p className="text-gray-400">
                    Scanned <span className="text-white font-semibold">23 columns</span>.
                    Detected domain{' '}
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/25 text-blue-400 font-bold">SALES</span>
                    {' '}at grain{' '}
                    <span className="px-1.5 py-0.5 rounded bg-red-600/15 border border-red-600/30 text-red-400 font-bold">ROW</span>
                    {' '}— columns <C>ACCOUNT_ID</C> and <C>TERRITORY_CODE</C> map to the
                    ENTITLEMENTS join key.
                  </p>
                </div>
                {/* Preflight checks */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Preflight</p>
                  <div className="space-y-1">
                    <p className="text-gray-400"><span className="text-emerald-400">&#10003;</span> Required join key <C>ACCOUNT_ID</C> present and non-null</p>
                    <p className="text-gray-400"><span className="text-emerald-400">&#10003;</span> Schema <C>PROD.SALES_GOLD</C> exists with active RAP binding</p>
                    <p className="text-gray-400"><span className="text-emerald-400">&#10003;</span> No PII columns detected outside masking policy coverage</p>
                    <p className="text-gray-400"><span className="text-emerald-400">&#10003;</span> dbt model <C>opportunities</C> found with post-hook configured</p>
                  </div>
                </div>
                {/* Recommendation */}
                <div className="border-t border-white/[0.06] pt-2.5">
                  <p className="text-gray-400">
                    Write to{' '}
                    <span className="px-1.5 py-0.5 rounded bg-red-600/15 border border-red-600/30 text-red-400 font-bold">
                      PROD.SALES_GOLD.OPPORTUNITIES
                    </span>
                    . Tags <C>DATA_DOMAIN=&apos;SALES&apos;</C> and <C>GOVERNANCE_GRAIN=&apos;ROW&apos;</C> will
                    bind via dbt post-hook, activating the existing RAP.
                  </p>
                </div>
                {/* Promotion flow */}
                <div className="border-t border-white/[0.06] pt-2.5">
                  <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-1">Promotion flow</p>
                  <p className="text-gray-500">
                    <span className="text-gray-400">1.</span> dbt run --select opportunities{' '}
                    <span className="text-gray-600">&#8594;</span>{' '}
                    <span className="text-gray-400">2.</span> post-hook applies tags{' '}
                    <span className="text-gray-600">&#8594;</span>{' '}
                    <span className="text-gray-400">3.</span> RAP activates on next query
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stage cards: Private Sandbox → Shared Perimeter */}
          <div className="bg-[#111] border border-white/20 rounded-xl p-6 self-start space-y-5">
            {/* Private Sandbox */}
            <div className="rounded-xl border border-gray-500/30 bg-white/[0.05] p-6 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-lg bg-white/10 text-gray-400 font-black text-xs flex items-center justify-center">1</span>
                <div>
                  <h4 className="text-white font-bold uppercase tracking-tight text-sm">Private Sandbox</h4>
                  <p className="text-[10px] font-mono text-gray-500">DEV.SANDBOX_ALICE</p>
                </div>
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
            {/* Arrow */}
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <svg width="12" height="32" viewBox="0 0 12 32" fill="none">
                <path d="M6 0v28m0 0l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span className="text-[9px] font-mono text-red-600/60 uppercase leading-tight text-center">
                dbt post-hook: adds <C>DATA_DOMAIN</C>, <C>GOVERNANCE_GRAIN</C> tags
              </span>
            </div>
            {/* Shared Perimeter */}
            <div className="rounded-xl border border-red-600/40 bg-red-600/10 p-6 transition-all duration-300">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-lg bg-red-600/20 text-red-500 font-black text-xs flex items-center justify-center">2</span>
                <div>
                  <h4 className="text-white font-bold uppercase tracking-tight text-sm">Shared Perimeter</h4>
                  <p className="text-[10px] font-mono text-red-400/60">PROD.SALES_GOLD</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                RAP-controlled shared schema — enterprise security wraps all exported data.
                Hardening controls enforced automatically on promotion.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Paths to Governance — motivational lead-in + diagram */}
      <div id="eng-sb-two-paths" className="space-y-4">
        <h3 className="text-base font-bold text-white uppercase tracking-tight">
          Two Paths to Governance
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          The Cortex Code interaction above shows a single developer&apos;s journey. At the
          platform level, that journey maps to one of two lanes. Lane&nbsp;A is the manual
          promotion path — developers iterate in sandbox and write to a governed schema in
          dev or other non-prod environments. Lane&nbsp;B is the CI/CD pipeline path, which is
          the <span className="text-white font-semibold">only path that can reach production</span>.
          Both lanes converge on the same governed schema and trigger the same dbt post-hooks,
          but only Lane&nbsp;B carries the version control, schema tests, and gate checks
          required for production deployment.
        </p>
        <SDLCDiagram />
      </div>

      {/* The Bottom Line */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-8 space-y-3 shadow-xl shadow-emerald-950/10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
          The Bottom Line
        </p>
        <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
          Developers never touch governance. Governance never misses a table.
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Schema placement and tag inheritance make security structural. The sandbox gives
          full iteration speed; the shared perimeter enforces full enterprise controls.
          No tickets, no admin overhead, no gaps.
        </p>
      </div>

    </div>
  );
};

export default SandboxView;
