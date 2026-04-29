import React, { useState } from 'react';
import {
  Layers,
  Lock,
  Key,
  Network,
  AlertTriangle,
  History as HistoryIcon,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Shield,
} from 'lucide-react';
import {
  SectionHeader,
  DetailPanel,
  StepSidebar,
  PrevNextNav,
  C,
  colorStyles,
  CalloutBox,
} from '../primitives';
import { EntitlementsDiagram, DefenseDiagram } from '../diagrams';

// --- ENTITLEMENTS lifecycle data ---

const lifecycleStages = [
  {
    label: 'Birth',
    color: 'blue' as const,
    title: 'ELT Writes to ENTITLEMENTS_STAGING',
    detail: (
      <div className="space-y-3">
        <p className="text-sm text-gray-400 leading-relaxed">
          Automated ELT pulls identity and access data from Okta (role memberships) and
          Salesforce (territory assignments) into the <C>ENTITLEMENTS_STAGING</C> table.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {['Okta → Role Memberships', 'Salesforce → Territory Maps'].map((src) => (
            <span key={src} className="text-[9px] font-mono bg-blue-600/10 border border-blue-600/40 text-blue-300 px-3 py-1.5 rounded-lg text-center">
              {src}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 italic">
          Staging is a write-only landing zone — never queried by policies.
        </p>
      </div>
    ),
  },
  {
    label: 'Validation',
    color: 'emerald' as const,
    title: 'Schema Check, Dedup, Delta Threshold',
    detail: null, // rendered with pass/fail toggle below
  },
  {
    label: 'Promotion',
    color: 'amber' as const,
    title: 'Merge into Live ENTITLEMENTS',
    detail: (
      <div className="space-y-3">
        <p className="text-sm text-gray-400 leading-relaxed">
          Validated records are <C>MERGE</C>-ed into the live <C>ENTITLEMENTS</C> table.
          <C>TRUNCATE</C> never executes on the live table — all changes are merge-based
          to prevent accidental mass revocation.
        </p>
        <div className="bg-[#0f0f0f] border border-white/20 rounded-xl p-4 font-mono text-[11px]">
          <pre className="text-gray-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
            <span className="text-blue-400">MERGE INTO</span> entitlements <span className="text-blue-400">AS</span> tgt{'\n'}
            <span className="text-blue-400">USING</span> entitlements_staging <span className="text-blue-400">AS</span> src{'\n'}
            {'  '}<span className="text-blue-400">ON</span> tgt.user_name = src.user_name{'\n'}
            {'    '}<span className="text-blue-400">AND</span> tgt.data_domain = src.data_domain{'\n'}
            <span className="text-blue-400">WHEN MATCHED THEN UPDATE</span> ...{'\n'}
            <span className="text-blue-400">WHEN NOT MATCHED THEN INSERT</span> ...;
          </pre>
        </div>
        <p className="text-[10px] text-gray-500 italic">
          Ownership: <C>GOVERNANCE_ADMIN</C> role. ELT service accounts write only to staging.
        </p>
      </div>
    ),
  },
  {
    label: 'Audit',
    color: 'red' as const,
    title: 'Stream → AUDIT_LOG + GLOBAL Alert',
    detail: (
      <div className="space-y-3">
        <p className="text-sm text-gray-400 leading-relaxed">
          A Snowflake Stream on <C>ENTITLEMENTS</C> captures every change to an append-only
          <C>AUDIT_LOG</C> table owned by <C>AUDIT_READ_ONLY</C> role.
        </p>
        <div className="bg-amber-600/10 border border-amber-600/40 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-amber-400">
            <C>access_level = 'GLOBAL'</C> inserts trigger a real-time SecOps alert via
            Snowflake Alert → PagerDuty / Slack.
          </p>
        </div>
        <p className="text-[10px] text-gray-500 italic">
          GLOBAL bypasses all row-level filtering — every grant is flagged for human review.
        </p>
      </div>
    ),
  },
  {
    label: 'Retirement',
    color: 'gray' as const,
    title: 'Okta Deactivation → Removal Cascade',
    detail: (
      <div className="space-y-3">
        <p className="text-sm text-gray-400 leading-relaxed">
          When a user is deactivated in Okta, the next ELT run removes their records from
          <C>ENTITLEMENTS_STAGING</C>. The delta merge propagates the removal to the live table.
          Downstream sandbox schemas are dropped via <C>DROP SCHEMA CASCADE</C>.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {['Okta Deactivation', 'ELT Removal', 'Schema Cascade'].map((stage) => (
            <span key={stage} className="text-[9px] font-mono bg-white/[0.06] border border-white/15 text-gray-400 px-3 py-1.5 rounded-lg text-center">
              {stage}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-gray-500 italic">
          No manual offboarding steps — identity lifecycle drives access lifecycle.
        </p>
      </div>
    ),
  },
];

// --- Validation gate data (used in lifecycle stage 1) ---

const gateDetails: Record<number, { title: string; checks: string[]; passDesc: string; failDesc: string }> = {
  0: {
    title: 'Schema Validation',
    checks: ['USER_NAME VARCHAR NOT NULL', 'ACCESS_LEVEL VARCHAR NOT NULL', 'ACCESS_VALUE VARCHAR', 'DATA_DOMAIN VARCHAR NOT NULL'],
    passDesc: 'All required columns present with correct types. Record passes to dedup check.',
    failDesc: 'Missing DATA_DOMAIN column. Record rejected — staging table rolled back, error logged.',
  },
  1: {
    title: 'Deduplication',
    checks: ['No duplicate (USER_NAME, ACCESS_LEVEL, ACCESS_VALUE, DATA_DOMAIN) tuples', 'Primary key integrity validated'],
    passDesc: 'Zero duplicates found. Record passes to delta check.',
    failDesc: 'Duplicate entitlement detected for alice@cs.com + REGION + West + SALES. Record rejected.',
  },
  2: {
    title: 'Delta Threshold (±10%)',
    checks: ['Row count delta vs. live table ≤ 10%', 'No mass deletion detected', 'No mass insertion detected'],
    passDesc: 'Delta is +3.2% (12 new records out of 375). Within threshold — promotion proceeds.',
    failDesc: 'Delta is -47% (178 records deleted). Exceeds threshold — promotion blocked, SecOps alerted.',
  },
};

const gateListItems = [
  { label: 'Schema Check', color: 'emerald' },
  { label: 'Dedup Check', color: 'emerald' },
  { label: 'Delta ≤ 10%', color: 'emerald' },
];

// --- Sandbox Hardening data (canonical location) ---

const sandboxHardeningLayers = [
  {
    label: 'Isolation',
    color: 'red' as const,
    title: 'User-Owned Role per Sandbox',
    detail: (
      <>
        <p className="text-sm text-gray-400 leading-relaxed">
          No cross-user access — each sandbox schema is owned by a dedicated role provisioned via Terraform.
        </p>
        <p className="text-[10px] text-gray-500 mt-3 italic">
          If isolation fails, the DLP Block still prevents data exfiltration.
        </p>
      </>
    ),
  },
  {
    label: 'DLP Block',
    color: 'amber' as const,
    title: 'No External Stage USAGE',
    detail: (
      <>
        <p className="text-sm text-gray-400 leading-relaxed">
          <C>COPY INTO</C> to external locations is explicitly revoked. Even if isolation fails, data cannot leave Snowflake.
        </p>
        <p className="text-[10px] text-gray-500 mt-3 italic">
          If DLP fails, 30-Day Auto-Drop limits the exposure window.
        </p>
      </>
    ),
  },
  {
    label: '30-Day Auto-Drop',
    color: 'amber' as const,
    title: 'Stale Object Cleanup',
    detail: (
      <>
        <p className="text-sm text-gray-400 leading-relaxed">
          Snowflake Task drops stale objects after 30 days — bounds the Revocation Gap even if offboarding is delayed.
        </p>
        <p className="text-[10px] text-gray-500 mt-3 italic">
          If auto-drop fails, Offboarding Cascade nukes the schema on Okta deactivation.
        </p>
      </>
    ),
  },
  {
    label: 'Offboarding Cascade',
    color: 'red' as const,
    title: 'DROP SCHEMA CASCADE on Okta Deactivation',
    detail: (
      <>
        <p className="text-sm text-gray-400 leading-relaxed">
          <C>DROP SCHEMA CASCADE</C> on Okta deactivation eliminates all materialized data — the nuclear option for departed users.
        </p>
        <p className="text-[10px] text-gray-500 mt-3 italic">
          If cascade fails, Lineage Tagging enables SecOps to trace and manually remediate.
        </p>
      </>
    ),
  },
  {
    label: 'Lineage Tagging',
    color: 'emerald' as const,
    title: 'Gold-Layer Source Metadata',
    detail: (
      <>
        <p className="text-sm text-gray-400 leading-relaxed">
          dbt post-hook tags sandbox tables with Gold-layer source metadata for SecOps audit — enables lineage tracking back to governed sources.
        </p>
        <p className="text-[10px] text-gray-500 mt-3 italic">
          Each layer operates independently — failure of any one does not compromise the system.
        </p>
      </>
    ),
  },
];

// --- Components ---

/** Validation gate detail with pass/fail toggle. */
const ValidationGatePanel = () => {
  const [activeGate, setActiveGate] = useState(0);
  const [scenario, setScenario] = useState<'pass' | 'fail'>('pass');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          Validation Gates
        </p>
        <button
          onClick={() => setScenario(scenario === 'pass' ? 'fail' : 'pass')}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/20 hover:bg-white/5 transition-colors"
        >
          {scenario === 'pass' ? (
            <ToggleRight size={14} className="text-emerald-500" />
          ) : (
            <ToggleLeft size={14} className="text-red-500" />
          )}
          <span className={scenario === 'pass' ? 'text-emerald-400' : 'text-red-400'}>
            {scenario === 'pass' ? 'Valid Record' : 'Malformed Record'}
          </span>
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
        <StepSidebar
          steps={gateListItems}
          activeStep={activeGate}
          onStepClick={setActiveGate}
        />
        <DetailPanel activeKey={`${activeGate}-${scenario}`}>
          <div className="p-5 rounded-xl border border-white/20 bg-[#0a0a0a] space-y-3">
            <p className="text-white font-bold text-sm uppercase tracking-tight">
              {gateDetails[activeGate].title}
            </p>
            <div className="space-y-1">
              {gateDetails[activeGate].checks.map((check, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px]">
                  {scenario === 'pass' ? (
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  ) : i === gateDetails[activeGate].checks.length - 1 ? (
                    <XCircle size={12} className="text-red-500 shrink-0" />
                  ) : (
                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  )}
                  <span className="text-gray-400">{check}</span>
                </div>
              ))}
            </div>
            <div className={`p-3 rounded-lg border ${scenario === 'pass' ? 'border-emerald-600/40 bg-emerald-600/10' : 'border-red-600/40 bg-red-600/10'}`}>
              <p className={`text-xs ${scenario === 'pass' ? 'text-emerald-400' : 'text-red-400'}`}>
                {scenario === 'pass' ? gateDetails[activeGate].passDesc : gateDetails[activeGate].failDesc}
              </p>
            </div>
          </div>
        </DetailPanel>
      </div>
    </div>
  );
};

// --- Main component ---

const EnforcementView = () => {
  const [activeLifecycleStage, setActiveLifecycleStage] = useState(0);
  const [activeHardeningLayer, setActiveHardeningLayer] = useState(0);

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="System-Based Enforcement"
        subtitle="No single control can be trusted in isolation. This section shows how four independent enforcement layers create a system where any one can fail without compromising data security."
        icon={Layers}
        badge="Section 3"
      />

      {/* Governance Architecture Overview */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white uppercase tracking-tight">
          Governance Architecture
          <span className="text-gray-500 font-normal text-xs ml-2 normal-case tracking-normal">
            — sources feed the PDP, PDP drives all enforcement
          </span>
        </h3>
        <EntitlementsDiagram />
      </div>

      {/* Defense-in-Depth Cutaway */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white uppercase tracking-tight">
          Defense-in-Depth Layers
          <span className="text-gray-500 font-normal text-xs ml-2 normal-case tracking-normal">
            — hover a layer to see detail
          </span>
        </h3>
        <DefenseDiagram />
      </div>

      {/* ENTITLEMENTS Lifecycle — step-through */}
      <div className="p-8 border border-red-900/40 rounded-xl bg-red-900/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
          <Lock size={120} className="text-red-600" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1 uppercase tracking-tight">
          §3.1 — Anatomy of an <C>ENTITLEMENTS</C> Record
        </h3>
        <p className="text-xs text-gray-400 mb-6">
          Single point of control for all <C>RLS</C>. Every record has a lifecycle — birth, validation, promotion, audit, and retirement.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          <div>
            <StepSidebar
              steps={lifecycleStages.map((s) => ({ label: s.label, color: s.color }))}
              activeStep={activeLifecycleStage}
              onStepClick={setActiveLifecycleStage}
            />
            <PrevNextNav
              current={activeLifecycleStage}
              total={lifecycleStages.length}
              onPrev={() => setActiveLifecycleStage((s) => Math.max(0, s - 1))}
              onNext={() => setActiveLifecycleStage((s) => Math.min(lifecycleStages.length - 1, s + 1))}
            />
          </div>
          <div className="bg-[#0a0a0a] border border-white/20 rounded-xl p-6">
            <DetailPanel activeKey={activeLifecycleStage}>
              <h4 className={`text-sm font-bold uppercase tracking-tight mb-4 ${colorStyles[lifecycleStages[activeLifecycleStage].color].accent}`}>
                {lifecycleStages[activeLifecycleStage].title}
              </h4>
              {activeLifecycleStage === 1 ? (
                <ValidationGatePanel />
              ) : (
                lifecycleStages[activeLifecycleStage].detail
              )}
            </DetailPanel>
          </div>
        </div>

        {/* Compact hardening details */}
        <div className="mt-8 space-y-3">
          {[
            { icon: Key, label: 'Ownership Isolation', desc: <>Live table owned by <C>GOVERNANCE_ADMIN</C>. ELT writes only to staging.</> },
            { icon: Network, label: 'Promotion Validation', desc: <>Schema check, dedup, ±10% delta alerting. <C>TRUNCATE</C> never executes on live.</> },
            { icon: AlertTriangle, label: 'GLOBAL Grant Alert', desc: <><C>access_level = 'GLOBAL'</C> triggers real-time SecOps webhook.</> },
            { icon: HistoryIcon, label: 'Row-Level Change Audit', desc: <>Stream → append-only <C>AUDIT_LOG</C> owned by <C>AUDIT_READ_ONLY</C> role.</> },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <Icon size={15} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-gray-400">
                  <span className="text-white font-bold">{item.label}</span>
                  {' — '}
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sandbox Hardening Controls — canonical location */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Shield size={18} className="text-red-600" /> Sandbox Hardening Controls
          <span className="text-gray-500 font-normal text-xs ml-1 normal-case tracking-normal">
            — five independent layers protecting developer sandboxes
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          <StepSidebar
            steps={sandboxHardeningLayers.map((l) => ({ label: l.label, color: l.color }))}
            activeStep={activeHardeningLayer}
            onStepClick={setActiveHardeningLayer}
          />
          <div className="bg-[#111] border border-white/20 rounded-xl p-6">
            <DetailPanel activeKey={activeHardeningLayer}>
              <h4 className={`text-sm font-bold uppercase tracking-tight mb-3 ${colorStyles[sandboxHardeningLayers[activeHardeningLayer].color].accent}`}>
                {sandboxHardeningLayers[activeHardeningLayer].title}
              </h4>
              {sandboxHardeningLayers[activeHardeningLayer].detail}
            </DetailPanel>
          </div>
        </div>
        <CalloutBox title="Defense in Depth" variant="red">
          <p>
            Each sandbox hardening layer operates independently. If any single layer fails,
            the remaining layers still prevent data exfiltration or unauthorized access.
            This is the same defense-in-depth principle applied to the developer experience.
          </p>
        </CalloutBox>
      </div>
    </div>
  );
};

export default EnforcementView;
