/**
 * Identity tab — principal kinds, ENTITLEMENTS table, principal x controls matrix,
 * and failure modes for agent OBO and share bypass.
 *
 * New in Phase 3.
 */

import React from 'react';
import {
  PrincipalChip,
  PrincipalMatrix,
  FailureModeCard,
  ClaimCard,
  CalloutBox,
} from '../../../primitives';
import type { Principal } from '../data/principals';
import { defaultPrincipals } from '../data/principals';
import { entitlementExamples } from '../data/entitlements';

interface IdentityTabProps {
  principal: Principal;
  onPrincipalChange: (p: Principal) => void;
}

/* ── Matrix data ── */

const matrixPrincipals = [
  { kind: 'human',   label: 'Human (Alice)' },
  { kind: 'service', label: 'Service (dbt)' },
  { kind: 'agent',   label: 'Agent (Cortex)' },
  { kind: 'share',   label: 'Share (Partner)' },
];

const matrixControls = [
  { id: 'rap',         label: 'Row Access Policy' },
  { id: 'masking',     label: 'Column Masking' },
  { id: 'rbac-write',  label: 'RBAC write grants' },
  { id: 'copilot',     label: 'Domain Vocab Check' },
  { id: 'audit',       label: 'Audit trail in ACCESS_HISTORY' },
];

const effects: Record<string, Record<string, 'pass' | 'partial' | 'bypass'>> = {
  human:   { rap: 'pass',    masking: 'pass',    'rbac-write': 'pass',    copilot: 'pass',    audit: 'pass' },
  service: { rap: 'pass',    masking: 'pass',    'rbac-write': 'pass',    copilot: 'bypass',  audit: 'pass' },
  agent:   { rap: 'partial', masking: 'partial', 'rbac-write': 'partial', copilot: 'partial', audit: 'partial' },
  share:   { rap: 'bypass',  masking: 'pass',    'rbac-write': 'bypass',  copilot: 'bypass',  audit: 'partial' },
};

/* ── Entitlements table columns ── */

const entitlementColumns = [
  'User/Role', 'Domain', 'Level', 'Value', 'Source',
  'Approved By', 'Effective From', 'Effective To', 'Granted At', 'Granted By',
];

/* ── Principal descriptions ── */

const principalDescriptions: Record<string, string> = {
  human:   'Federated via Okta \u2192 Snowflake SSO. User name = CURRENT_USER(). Entitlements keyed by user name or group membership in OKTA.',
  service: 'Snowflake role owned by a service (dbt, Airflow, etc.). Identity = role name. Entitlements are role-level, not user-level.',
  agent:   'Cortex Agent or Copilot acting on-behalf-of a user. Honest model: agent should assume the user\'s principal via session context. TODAY: agents run as their service role. Delegation is on the roadmap.',
  share:   'Reader account consuming a secure share. Identity = consumer account. Entitlements are share-level; RAP does not execute (no CURRENT_USER context).',
};

/* ── Named sub-section exports (used by the Architecture chapter) ── */

/** Principal gallery — 4-up grid of principal kinds with Select/Active buttons. */
export const PrincipalGallery = ({
  principal,
  onPrincipalChange,
}: IdentityTabProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    {defaultPrincipals.map((p, i) => {
      const isActive = p.kind === principal.kind && p.label === principal.label;
      return (
        <div
          key={p.label}
          className={`rounded-xl border p-5 space-y-3 transition-all duration-200 ${
            isActive
              ? 'border-blue-500/50 bg-blue-500/5'
              : 'border-white/10 bg-[#0a0a0a]'
          }`}
        >
          <PrincipalChip kind={p.kind} label={p.label} />
          <p className="text-xs text-gray-400 leading-relaxed">
            {principalDescriptions[p.kind]}
          </p>
          <button
            onClick={() => onPrincipalChange(defaultPrincipals[i])}
            className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
              isActive
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-400 cursor-default'
                : 'border-white/15 text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/5'
            }`}
          >
            {isActive ? 'Active' : 'Select'}
          </button>
        </div>
      );
    })}
  </div>
);

/** ENTITLEMENTS table + principal × controls coverage matrix. */
export const PrincipalControlsMatrix = () => (
  <div className="space-y-6">
    <div className="space-y-3">
      <ClaimCard
        status="today"
        claim="Single source of truth for access grants"
        caveat="ENTITLEMENTS is append-only with approved_by + effective_to for audit. Service accounts: access_level is role-scoped, not user-scoped. Agents: no row yet; uses the calling user's entitlement in OBO mode (roadmap)."
      />
      <div className="overflow-x-auto rounded-lg border border-white/20 bg-[#0f0f0f]">
        <table className="w-full text-left text-[11px] text-gray-400">
          <thead className="bg-white/5 text-white">
            <tr>
              {entitlementColumns.map((col) => (
                <th key={col} className="px-3 py-2.5 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {entitlementExamples.map((row, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-3 py-2.5 font-mono font-semibold text-gray-300 whitespace-nowrap">{row.user_name}</td>
                <td className="px-3 py-2.5">{row.domain}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                    row.access_level === 'GLOBAL' ? 'bg-amber-600/10 text-amber-400' :
                    row.access_level === 'REGION' ? 'bg-blue-600/10 text-blue-400' :
                    row.access_level === 'OPPORTUNITY' ? 'bg-emerald-600/10 text-emerald-400' :
                    'bg-gray-600/10 text-gray-400'
                  }`}>
                    {row.access_level}
                  </span>
                </td>
                <td className="px-3 py-2.5 font-mono">{row.access_value}</td>
                <td className="px-3 py-2.5">{row.source}</td>
                <td className="px-3 py-2.5 text-gray-500">{row.approved_by ?? '—'}</td>
                <td className="px-3 py-2.5 font-mono text-[10px]">{row.effective_from}</td>
                <td className="px-3 py-2.5 font-mono text-[10px]">{row.effective_to ?? '—'}</td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-gray-500">{row.granted_at}</td>
                <td className="px-3 py-2.5 text-gray-500">{row.granted_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
        Principal x Control coverage
      </p>
      <PrincipalMatrix
        principals={matrixPrincipals}
        controls={matrixControls}
        effects={effects}
      />
      <div className="flex items-center gap-6 text-[10px] text-gray-500">
        <span><span className="text-emerald-400 font-bold mr-1">{'\u2713'}</span> pass (enforced)</span>
        <span><span className="text-amber-400 font-bold mr-1">{'\u25B3'}</span> partial (enforced with caveats)</span>
        <span><span className="text-red-400 font-bold mr-1">{'\u2717'}</span> bypass (principal bypasses this control)</span>
      </div>
    </div>
  </div>
);

/** Identity-related failure modes (agent OBO, share bypass). */
export const IdentityFailureModes = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <FailureModeCard
      title="Agent OBO not yet implemented"
      severity="high"
      trigger="Cortex Agent runs as its service role. User alice asks the agent 'show me my deals.' Agent executes as CORTEX_AGENT_ROLE, not as alice."
      blastRadius="RAP cannot filter to alice's entitlements -- it filters to CORTEX_AGENT_ROLE's broader service-grade access. Agent receives more data than alice would."
      control="TODAY: agent role has narrower grants than any single human, to bound blast radius. ROADMAP: Snowflake OAuth token-exchange -> session QAS tag with CURRENT_SESSION_AGENT_OBO -- RAP evaluates against alice's entitlements."
      owner="Data Platform Guild"
    />
    <FailureModeCard
      title="Shares bypass RAP"
      severity="medium"
      trigger="A secure share is granted to a partner account. The partner reads the shared view."
      blastRadius="RAP policies reference CURRENT_USER, which has no value in the consumer account. The view must be pre-filtered at share creation. If the share SQL is wrong, the partner sees data they should not."
      control="Share-target views are hand-authored and reviewed. No RAP dependency; data filtering is compiled into the view SQL. Break-glass revocation: ALTER SHARE ... REVOKE. Audit: MARKETPLACE_EVENTS + share_access_history."
      owner="Governance Platform"
    />
  </div>
);

const IdentityTab = ({ principal, onPrincipalChange }: IdentityTabProps) => {
  return (
    <section id="eng-gi-identity" className="space-y-6">
      {/* ── Intro ── */}
      <p className="text-sm text-gray-400 leading-relaxed">
        Every read and write in UDP resolves against one of four principal kinds.
        The same <span className="text-white font-semibold">ENTITLEMENTS</span> table
        drives RAP, column masking, and RBAC write grants. What differs is how the
        principal's identity maps to an ENTITLEMENT row.
      </p>

      {/* ── Principal gallery ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {defaultPrincipals.map((p, i) => {
          const isActive = p.kind === principal.kind && p.label === principal.label;
          return (
            <div
              key={p.label}
              className={`rounded-xl border p-5 space-y-3 transition-all duration-200 ${
                isActive
                  ? 'border-blue-500/50 bg-blue-500/5'
                  : 'border-white/10 bg-[#0a0a0a]'
              }`}
            >
              <PrincipalChip kind={p.kind} label={p.label} />
              <p className="text-xs text-gray-400 leading-relaxed">
                {principalDescriptions[p.kind]}
              </p>
              <button
                onClick={() => onPrincipalChange(defaultPrincipals[i])}
                className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                  isActive
                    ? 'border-blue-500/40 bg-blue-500/10 text-blue-400 cursor-default'
                    : 'border-white/15 text-gray-500 hover:text-white hover:border-white/30 hover:bg-white/5'
                }`}
              >
                {isActive ? 'Active' : 'Select'}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── ENTITLEMENTS table ── */}
      <div className="space-y-3">
        <ClaimCard
          status="today"
          claim="Single source of truth for access grants"
          caveat="ENTITLEMENTS is append-only with approved_by + effective_to for audit. Service accounts: access_level is role-scoped, not user-scoped. Agents: no row yet; uses the calling user's entitlement in OBO mode (roadmap)."
        />

        <div className="overflow-x-auto rounded-lg border border-white/20 bg-[#0f0f0f]">
          <table className="w-full text-left text-[11px] text-gray-400">
            <thead className="bg-white/5 text-white">
              <tr>
                {entitlementColumns.map((col) => (
                  <th key={col} className="px-3 py-2.5 font-semibold uppercase tracking-wider text-[10px] whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {entitlementExamples.map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5 font-mono font-semibold text-gray-300 whitespace-nowrap">{row.user_name}</td>
                  <td className="px-3 py-2.5">{row.domain}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                      row.access_level === 'GLOBAL' ? 'bg-amber-600/10 text-amber-400' :
                      row.access_level === 'REGION' ? 'bg-blue-600/10 text-blue-400' :
                      row.access_level === 'OPPORTUNITY' ? 'bg-emerald-600/10 text-emerald-400' :
                      'bg-gray-600/10 text-gray-400'
                    }`}>
                      {row.access_level}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono">{row.access_value}</td>
                  <td className="px-3 py-2.5">{row.source}</td>
                  <td className="px-3 py-2.5 text-gray-500">{row.approved_by ?? '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px]">{row.effective_from}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px]">{row.effective_to ?? '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-[10px] text-gray-500">{row.granted_at}</td>
                  <td className="px-3 py-2.5 text-gray-500">{row.granted_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Principal x Controls matrix ── */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
          Principal x Control coverage
        </p>
        <PrincipalMatrix
          principals={matrixPrincipals}
          controls={matrixControls}
          effects={effects}
        />
        <div className="flex items-center gap-6 text-[10px] text-gray-500">
          <span><span className="text-emerald-400 font-bold mr-1">{'\u2713'}</span> pass (enforced)</span>
          <span><span className="text-amber-400 font-bold mr-1">{'\u25B3'}</span> partial (enforced with caveats)</span>
          <span><span className="text-red-400 font-bold mr-1">{'\u2717'}</span> bypass (principal bypasses this control)</span>
        </div>
      </div>

      {/* ── Failure modes ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FailureModeCard
          title="Agent OBO not yet implemented"
          severity="high"
          trigger="Cortex Agent runs as its service role. User alice asks the agent 'show me my deals.' Agent executes as CORTEX_AGENT_ROLE, not as alice."
          blastRadius="RAP cannot filter to alice's entitlements -- it filters to CORTEX_AGENT_ROLE's broader service-grade access. Agent receives more data than alice would."
          control="TODAY: agent role has narrower grants than any single human, to bound blast radius. ROADMAP: Snowflake OAuth token-exchange -> session QAS tag with CURRENT_SESSION_AGENT_OBO -- RAP evaluates against alice's entitlements."
          owner="Data Platform Guild"
        />
        <FailureModeCard
          title="Shares bypass RAP"
          severity="medium"
          trigger="A secure share is granted to a partner account. The partner reads the shared view."
          blastRadius="RAP policies reference CURRENT_USER, which has no value in the consumer account. The view must be pre-filtered at share creation. If the share SQL is wrong, the partner sees data they should not."
          control="Share-target views are hand-authored and reviewed. No RAP dependency; data filtering is compiled into the view SQL. Break-glass revocation: ALTER SHARE ... REVOKE. Audit: MARKETPLACE_EVENTS + share_access_history."
          owner="Governance Platform"
        />
      </div>

      {/* ── Bottom line ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Enforces today</p>
          <ClaimCard status="today" claim="Human RAP/masking via ENTITLEMENTS" />
          <ClaimCard status="today" claim="Service role-level access grants" />
          <ClaimCard status="today" claim="Share pre-filtered views" />
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Detects today</p>
          <ClaimCard status="today" claim="ACCESS_HISTORY per-query audit" />
          <ClaimCard status="today" claim="Share access history per-consumer" />
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Out of scope today</p>
          <ClaimCard status="roadmap" claim="Agent OBO delegation" />
          <ClaimCard status="roadmap" claim="Per-share RAP evaluation" />
          <ClaimCard status="roadmap" claim="Session-context residency enforcement" />
        </div>
      </div>

      <CalloutBox title="Identity is the first column in every governance decision" variant="blue">
        <p>
          Switch the principal in the bar above to see how each tab's playground
          responds. The identity model is incomplete for agents and shares — those
          gaps are documented honestly, not hidden.
        </p>
      </CalloutBox>
    </section>
  );
};

export default IdentityTab;
