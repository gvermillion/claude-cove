/**
 * Operating Model tab — change management, SLOs, break-glass, risk register,
 * lifecycle/retention, and kill switches. The operational side of governance.
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { CalloutBox, ClaimCard, RiskRegisterRow, KillSwitchBadge } from '../../../primitives';
import type { Principal } from '../data/principals';

interface OperatingModelTabProps {
  principal: Principal;
}

/* ── Change-management step data ── */
const cmSteps = [
  {
    num: 1,
    title: 'Propose',
    desc: 'Developer opens a PR touching governance/ or tag YAML. PR template requires: owner, domain, rollback plan, test coverage.',
  },
  {
    num: 2,
    title: 'Validate',
    desc: 'CI runs tag-invariant lint, resolver dry-run, policy diff, and a synthetic RAP test against a sandbox dataset.',
  },
  {
    num: 3,
    title: 'Review',
    desc: 'Two approvals: Data Platform Guild + Domain Steward for the affected domain.',
  },
  {
    num: 4,
    title: 'Deploy',
    desc: 'Terraform apply via GitHub Actions with OIDC into the GOVERNANCE_DEPLOYER Snowflake role. Blue/green: new policies applied with a 24 h grace period where old + new coexist.',
  },
  {
    num: 5,
    title: 'Observe',
    desc: 'Post-deploy checks: drift alerts silent, no new RAP-without-table, no tag-invariant violations.',
  },
] as const;

/* ── SLO table data ── */
const sloRows = [
  { automation: 'Tag-drift Stream + Task', target: '15 min', alert: '> 20 min', escalation: 'Page Data Platform on-call' },
  { automation: 'RAP event-hook bind', target: '< 5 min', alert: '> 10 min', escalation: 'Page Data Platform on-call' },
  { automation: 'ENTITLEMENTS reconciliation (Okta/HR)', target: 'Daily, 06:00 UTC', alert: '> 2 h past schedule', escalation: 'Page Identity on-call' },
  { automation: 'Memo TTL refresh', target: '1 h default / 15 min sensitive', alert: 'TTL miss rate > 5%', escalation: 'Ticket' },
  { automation: 'Break-glass alert', target: 'Real-time', alert: 'Any session', escalation: 'Immediate page + Slack' },
  { automation: 'Share audit reconciliation', target: 'Weekly', alert: '> 8-day gap', escalation: 'Ticket' },
] as const;

/* ── Break-glass steps ── */
const breakGlassSteps = [
  {
    num: 1,
    title: 'Request',
    desc: 'Emergency responder calls governance.request_break_glass(ticket_id, justification). Proc returns a one-time role grant BREAK_GLASS_SOX_ROLE valid for 60 min.',
  },
  {
    num: 2,
    title: 'Use',
    desc: "Role bypasses RAP via CURRENT_AVAILABLE_ROLES() check in RAP CASE: IS_ROLE_IN_SESSION('BREAK_GLASS_SOX_ROLE') OR (normal CASE). Every query tagged QUERY_TAG = 'BREAK_GLASS:<ticket_id>'.",
  },
  {
    num: 3,
    title: 'Close',
    desc: 'After 60 min, role auto-revokes. Reviewer assigned within 24 h. Session transcripts + justification reviewed weekly by the governance council.',
  },
] as const;

/* ── Kill switch actions ── */
const killSwitches = [
  'ALTER TASK governance.tag_drift_task SUSPEND',
  'ALTER TASK governance.rap_bind_task SUSPEND',
  'REVOKE ROLE BREAK_GLASS_SOX_ROLE FROM USER <user>',
  'ALTER SHARE <share_name> REMOVE ACCOUNTS = (<consumer>)',
  "ALTER MASKING POLICY pii_tag_mask SET body = 'val'; -- passthrough (emergency only, audit required)",
  'REVOKE WRITE ON SCHEMA sales FROM ROLE DBT_SERVICE_ROLE',
] as const;

export default function OperatingModelTab({ principal: _principal }: OperatingModelTabProps) {
  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">

      {/* ── A. Intro ── */}
      <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
          Chapter 5 — The Operations
        </p>
        <p className="text-sm text-gray-300 leading-relaxed">
          Governance is not a set of DDLs. It is the{' '}
          <span className="text-white font-semibold">people + process + automation</span> that keeps
          those DDLs honest over time. This chapter covers: change management, SLOs on automation,
          break-glass, kill switches, retention, and the living risk register.
        </p>
      </div>

      {/* ── B. Change management flow ── */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm tracking-wide uppercase">Change Management Flow</h3>
        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          {cmSteps.map((step, i) => (
            <React.Fragment key={step.num}>
              <div className="min-w-[180px] flex-1 bg-[#111] border border-white/10 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600/20 text-red-400 text-[10px] font-black">
                    {step.num}
                  </span>
                  <span className="text-white font-bold text-xs">{step.title}</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
              {i < cmSteps.length - 1 && (
                <ArrowRight className="shrink-0 mt-6 text-gray-600" size={16} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── C. SLOs on automation ── */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm tracking-wide uppercase">SLOs on Automation</h3>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                {['Automation', 'Target', 'Alert Threshold', 'Escalation'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sloRows.map((r) => (
                <tr key={r.automation} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-xs text-white font-semibold">{r.automation}</td>
                  <td className="px-4 py-3 text-xs text-emerald-400 font-mono">{r.target}</td>
                  <td className="px-4 py-3 text-xs text-amber-400 font-mono">{r.alert}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{r.escalation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── D. Memoize TTL ── */}
      <CalloutBox title="Memoize TTL — the subtle one" variant="blue">
        <p>
          Snowflake memoizable UDFs cache function results per warehouse session. The RAP helper
          function uses <code className="text-blue-300">memoize</code>. Default TTL is effectively
          the session lifetime. For sensitive tags (PII_POLICY changes), we override to a shorter
          15-minute TTL via <code className="text-blue-300">MEMOIZE_FOR_DURATION_SECONDS</code>.
          Without this override, a user whose entitlement is revoked continues to see their prior
          access until session end. The TTL override is the control.
        </p>
        <pre className="mt-4 bg-black/40 border border-white/5 rounded-lg p-4 text-[11px] text-gray-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">{`CREATE OR REPLACE FUNCTION governance.check_entitlement(user_name STRING, level STRING, value STRING)
RETURNS BOOLEAN
LANGUAGE SQL
MEMOIZABLE
-- 15 min cap for entitlement checks; balances perf with fast revocation propagation
MEMOIZE_FOR_DURATION_SECONDS = 900
AS $$
  SELECT EXISTS (
    SELECT 1 FROM governance.entitlements e
    WHERE e.user_name = check_entitlement.user_name
      AND e.access_level = check_entitlement.level
      AND e.access_value = check_entitlement.value
      AND CURRENT_TIMESTAMP() BETWEEN e.effective_from AND COALESCE(e.effective_to, '9999-12-31')
  )
$$;`}</pre>
      </CalloutBox>

      {/* ── E. Break-glass flow ── */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm tracking-wide uppercase">Break-Glass Flow</h3>
        <div className="flex items-start gap-2 overflow-x-auto pb-2">
          {breakGlassSteps.map((step, i) => (
            <React.Fragment key={step.num}>
              <div className="min-w-[200px] flex-1 bg-[#111] border border-red-600/20 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600/20 text-red-400 text-[10px] font-black">
                    {step.num}
                  </span>
                  <span className="text-white font-bold text-xs">{step.title}</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
              {i < breakGlassSteps.length - 1 && (
                <ArrowRight className="shrink-0 mt-6 text-gray-600" size={16} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="mt-2">
          <KillSwitchBadge action="REVOKE ROLE BREAK_GLASS_SOX_ROLE FROM USER <user>" />
        </div>
      </div>

      {/* ── F. Risk register ── */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm tracking-wide uppercase">Risk Register</h3>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                {['Risk', 'Prob.', 'Impact', 'Detection', 'Owner', 'Mitigation', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <RiskRegisterRow
                risk="Tag drop on CREATE OR REPLACE"
                probability="med"
                impact="high"
                detection="Stream + Task 15 min"
                owner="Data Platform Guild"
                mitigation="CI block + post-hook re-apply"
                status="mitigated"
              />
              <RiskRegisterRow
                risk="RAP binding gap on new table"
                probability="low"
                impact="high"
                detection="Event-hook + daily audit"
                owner="Data Platform Guild"
                mitigation="Event-driven ALTER + daily sweep"
                status="mitigated"
              />
              <RiskRegisterRow
                risk="Agent OBO not implemented"
                probability="high"
                impact="med"
                detection={<>N/A &mdash; known gap</>}
                owner="Data Platform Guild"
                mitigation="Narrow agent role grants; roadmap OBO by Q3"
                status="accepted"
              />
              <RiskRegisterRow
                risk="No DENY primitive in RAP"
                probability="high"
                impact="med"
                detection={<>N/A &mdash; known gap</>}
                owner="Governance Platform"
                mitigation="Compensating: network policies + session tags; roadmap adds DENY branch"
                status="accepted"
              />
              <RiskRegisterRow
                risk="GDPR erasure workflow incomplete"
                probability="low"
                impact="high"
                detection="Quarterly review"
                owner="Legal + Data Stewards"
                mitigation="Ticket-driven manual process; automation on roadmap"
                status="open"
              />
              <RiskRegisterRow
                risk="Break-glass audit not automated"
                probability="low"
                impact="high"
                detection="Weekly manual review"
                owner="Governance Platform"
                mitigation="Weekly governance council review + QUERY_TAG logging"
                status="mitigated"
              />
              <RiskRegisterRow
                risk="ACCESS_HISTORY 45-min lag"
                probability="high"
                impact="low"
                detection={<>N/A &mdash; platform constraint</>}
                owner="Governance Platform"
                mitigation="Event table streaming for real-time; ACCESS_HISTORY remains system-of-record"
                status="accepted"
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── G. Lifecycle / retention ── */}
      <CalloutBox title="Data Lifecycle" variant="blue">
        <ul className="list-disc list-inside space-y-1.5">
          <li><span className="text-white font-semibold">Raw layer:</span> 90 days, then archived to external stage (S3) with GLACIER after 1 year.</li>
          <li><span className="text-white font-semibold">Silver/Gold:</span> materialized on demand; no explicit TTL beyond dbt-managed freshness.</li>
          <li><span className="text-white font-semibold">ENTITLEMENTS:</span> append-only; soft-deleted via effective_to. Never hard-deleted.</li>
          <li><span className="text-white font-semibold">Tag history:</span> 365 days via snowflake.account_usage.tag_references_history.</li>
          <li><span className="text-white font-semibold">ACCESS_HISTORY:</span> 365 days; exported quarterly to cold storage for 7-year retention (SOX requirement).</li>
          <li><span className="text-white font-semibold">Break-glass transcripts:</span> 7 years; separate audit schema with immutable grant.</li>
        </ul>
      </CalloutBox>

      {/* ── H. Kill switches inventory ── */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm tracking-wide uppercase">
          Automation Kill Switches{' '}
          <span className="font-normal text-gray-500 normal-case tracking-normal">(memorize before you need them)</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {killSwitches.map((action) => (
            <KillSwitchBadge key={action} action={action} />
          ))}
        </div>
      </div>

      {/* ── I. Bottom line ── */}
      <div className="space-y-4">
        <h3 className="text-white font-bold text-sm tracking-wide uppercase">Bottom Line</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <ClaimCard claim="Change management gate on every governance/ PR" status="today" />
            <ClaimCard claim="Memoize TTL caps entitlement staleness at 15 min" status="today" />
            <ClaimCard claim="Break-glass role auto-revokes in 60 min" status="today" />
          </div>
          <div className="space-y-3">
            <ClaimCard claim="SLO alerts on every automation" status="partial" />
            <ClaimCard claim="Weekly governance-council review of risk register" status="partial" />
          </div>
          <div className="space-y-3">
            <ClaimCard claim="Automated GDPR erasure" status="roadmap" />
            <ClaimCard claim="Continuous compliance dashboard (SOX evidence on-demand)" status="roadmap" />
            <ClaimCard claim="Break-glass approval workflow (currently manual ticket)" status="roadmap" />
          </div>
        </div>
      </div>
    </div>
  );
}
