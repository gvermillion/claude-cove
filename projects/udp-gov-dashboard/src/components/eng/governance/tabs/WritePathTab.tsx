/**
 * Write Path tab — defense-in-depth write governance simulator.
 *
 * Extracted from GovernanceImplView.tsx (Phase 0C).
 */

import React, { useState } from 'react';
import { Tags, ArrowRight, Shield, ShieldCheck, Zap } from 'lucide-react';
import { CalloutBox, ClaimCard, C, FailureModeCard, FailureTimeline, KillSwitchBadge, PrincipalChip } from '../../../primitives';
import type { TimelineEvent } from '../../../primitives';
import { writeRoles, writeTargets, resolveWriteScenario } from '../data/writePath';
import type { Principal } from '../data/principals';

type Lens = 'happy' | 'failure';

interface WritePathTabProps {
  principal: Principal;
  lens: Lens;
  onNavigate?: (tabId: string) => void;
}

const principalWriteContext: Record<Principal['kind'], string> = {
  human:   'Acting as HUMAN. All three layers apply.',
  service: 'Acting as SERVICE role. Copilot/vocab check is typically bypassed for programmatic writes; CI + post-hooks + schema resolver remain.',
  agent:   'Acting as AGENT. Today: runs as service role; inherits service-level gates. OBO roadmap: inherits caller\'s grants, so human path applies.',
  share:   'Acting as SHARE consumer. Consumer accounts cannot write back -- this path is read-only.',
};

const WritePathTab = ({ principal, lens }: WritePathTabProps) => {
  const [selectedWriteRole, setSelectedWriteRole] = useState(0);
  const [selectedWriteTarget, setSelectedWriteTarget] = useState(0);
  const writeRole = writeRoles[selectedWriteRole];
  const writeTarget = writeTargets[selectedWriteTarget];
  const writeResult = resolveWriteScenario(writeRole, writeTarget);

  const evolutionTimeline: TimelineEvent[] = [
    { label: 'ALTER TABLE ADD COLUMN phone_number', kind: 'event', at: 'T+0', note: 'Column exists, no tags' },
    { label: 'First INSERT with phone data', kind: 'event', at: 'T+30s', note: 'PII data unmasked at rest' },
    { label: 'Classifier procedure runs', kind: 'control', at: 'T+2m', note: 'ALTER TABLE trigger fires async' },
    { label: 'Default restrictive tags applied', kind: 'control', at: 'T+2m', note: "PII_POLICY='GENERIC_MASK', DATA_SENSITIVITY='RESTRICTED'" },
    { label: 'Stream+Task sweep', kind: 'alert', at: 'T+15m', note: 'Detective backup confirms coverage' },
  ];

    return (
      <section id="eng-gi-write-path" className="space-y-6">
        {lens === 'happy' && (<>
        <p className="text-sm text-gray-400 leading-relaxed">
        The read path assumes data is already in the right schema. The write path is where
        governance <span className="text-white font-semibold">prevents misplacement</span> — three
        layers of defense ensure that only authorized, semantically correct data lands in governed
        schemas. The same <C>ENTITLEMENTS</C> table that drives read-time RAP also drives write-time RBAC.
      </p>

      <ClaimCard
        status="partial"
        claim="Domain Vocabulary Check is advisory, not a control"
        caveat="LLM / heuristic semantic check. Auditors should not count this as a compliance gate. See Operating Model for escalation pattern."
      />

      {/* Principal context chip */}
      <div className="flex items-center gap-3">
        <PrincipalChip kind={principal.kind} label={principal.label} />
        <span className="text-xs text-gray-400">{principalWriteContext[principal.kind]}</span>
      </div>

      {/* ── Defense-in-Depth Pipeline ── */}
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
          Three-Layer Defense-in-Depth
        </p>
        <div className="flex items-stretch gap-0 overflow-x-auto">
          {/* Layer 1: RBAC */}
          <div className={`flex-1 min-w-[180px] rounded-lg border p-4 text-left transition-all duration-300 ${
            writeResult.rbac.passed
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-red-500/40 bg-red-500/10'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={14} className={writeResult.rbac.passed ? 'text-emerald-400' : 'text-red-400'} />
              <span className={`text-xs font-bold uppercase tracking-wide ${writeResult.rbac.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                RBAC Gate
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
              Entitlements → schema write grants
            </p>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
              writeResult.rbac.passed
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-red-500/15 text-red-300'
            }`}>
              {writeResult.rbac.passed ? '✓ GRANTED' : '✗ DENIED'}
            </span>
          </div>

          <div className="flex items-center px-2 text-gray-600 shrink-0">
            <div className="flex flex-col items-center gap-1">
              <ArrowRight size={18} className={!writeResult.rbac.passed ? 'text-gray-800' : ''} />
              <span className="text-[9px] text-gray-600 font-medium">
                {writeResult.rbac.passed ? 'validates' : 'blocked'}
              </span>
            </div>
          </div>

          {/* Layer 2: Copilot */}
          <div className={`flex-1 min-w-[180px] rounded-lg border p-4 text-left transition-all duration-300 ${
            !writeResult.rbac.passed
              ? 'border-white/5 bg-[#111] opacity-40'
              : writeResult.copilot.flag === 'pass'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : writeResult.copilot.flag === 'warn'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-red-500/40 bg-red-500/10'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={14} className={
                !writeResult.rbac.passed ? 'text-gray-600'
                : writeResult.copilot.flag === 'pass' ? 'text-emerald-400'
                : writeResult.copilot.flag === 'warn' ? 'text-amber-400'
                : 'text-red-400'
              } />
              <span className={`text-xs font-bold uppercase tracking-wide ${
                !writeResult.rbac.passed ? 'text-gray-600'
                : writeResult.copilot.flag === 'pass' ? 'text-emerald-400'
                : writeResult.copilot.flag === 'warn' ? 'text-amber-400'
                : 'text-red-400'
              }`}>
                Domain Vocabulary Check
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
              Semantic validation of column patterns (advisory)
            </p>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
              !writeResult.rbac.passed ? 'bg-white/5 text-gray-600'
              : writeResult.copilot.flag === 'pass' ? 'bg-emerald-500/15 text-emerald-300'
              : writeResult.copilot.flag === 'warn' ? 'bg-amber-500/15 text-amber-300'
              : 'bg-red-500/15 text-red-300'
            }`}>
              {!writeResult.rbac.passed ? '— SKIPPED' : writeResult.copilot.flag === 'pass' ? '✓ APPROVED' : writeResult.copilot.flag === 'warn' ? '⚠ WARNING' : '✗ BLOCKED'}
            </span>
          </div>

          <div className="flex items-center px-2 text-gray-600 shrink-0">
            <div className="flex flex-col items-center gap-1">
              <ArrowRight size={18} className={!writeResult.rbac.passed || writeResult.copilot.flag === 'block' ? 'text-gray-800' : ''} />
              <span className="text-[9px] text-gray-600 font-medium">
                {!writeResult.rbac.passed || writeResult.copilot.flag === 'block' ? 'blocked' : 'monitors'}
              </span>
            </div>
          </div>

          {/* Layer 3: Stream + Task */}
          <div className={`flex-1 min-w-[180px] rounded-lg border p-4 text-left transition-all duration-300 ${
            writeResult.validation.status === 'n/a'
              ? 'border-white/5 bg-[#111] opacity-40'
              : writeResult.validation.status === 'ok'
                ? 'border-emerald-500/30 bg-emerald-500/5'
                : 'border-amber-500/30 bg-amber-500/5'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Tags size={14} className={
                writeResult.validation.status === 'n/a' ? 'text-gray-600'
                : writeResult.validation.status === 'ok' ? 'text-emerald-400'
                : 'text-amber-400'
              } />
              <span className={`text-xs font-bold uppercase tracking-wide ${
                writeResult.validation.status === 'n/a' ? 'text-gray-600'
                : writeResult.validation.status === 'ok' ? 'text-emerald-400'
                : 'text-amber-400'
              }`}>
                Tag Validation
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
              Stream + Task continuous monitoring
            </p>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
              writeResult.validation.status === 'n/a' ? 'bg-white/5 text-gray-600'
              : writeResult.validation.status === 'ok' ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-amber-500/15 text-amber-300'
            }`}>
              {writeResult.validation.status === 'n/a' ? '— SKIPPED' : writeResult.validation.status === 'ok' ? '✓ CLEAN' : '⚠ FLAGGED'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Write Scenario Simulator ── */}
      <div id="eng-gi-write-simulator" className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          Write Scenario Simulator
          <span className="text-gray-600 font-normal normal-case tracking-normal ml-2">
            — pick a role and target to trace the gates
          </span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          {/* Left column — Selectors + Gate Results */}
          <div className="space-y-4">
            {/* Role selector */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                Writer Role
              </p>
              <div className="flex flex-wrap gap-2">
                {writeRoles.map((r, i) => (
                  <button
                    key={r.name}
                    onClick={() => setSelectedWriteRole(i)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all duration-200 border ${
                      i === selectedWriteRole
                        ? 'bg-blue-600/20 border-blue-600/30 text-blue-400'
                        : 'border-white/10 text-gray-500 hover:border-white/25 hover:text-gray-300'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-gray-500">
                {writeRole.desc}
                {writeRole.entitlements.length > 0 && (
                  <span className="ml-2 text-blue-400/70">
                    Entitlements: {writeRole.entitlements.map(e => <C key={e}>{e}</C>).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [])}
                  </span>
                )}
                {writeRole.entitlements.length === 0 && (
                  <span className="ml-2 text-red-400/70">No write entitlements</span>
                )}
              </p>
            </div>

            {/* Target selector */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                Target Schema / Table
              </p>
              <div className="flex flex-col gap-1.5">
                {writeTargets.map((t, i) => (
                  <button
                    key={`${t.schema}-${t.tableName}`}
                    onClick={() => setSelectedWriteTarget(i)}
                    className={`text-left px-3 py-2 rounded-md text-xs transition-all duration-200 border ${
                      i === selectedWriteTarget
                        ? 'bg-amber-500/10 border-amber-500/30 text-white'
                        : 'border-white/5 text-gray-500 hover:border-white/15 hover:text-gray-300'
                    }`}
                  >
                    <span className="font-mono font-semibold">{t.schema}</span>
                    <span className="text-gray-600 mx-1.5">→</span>
                    <span className="font-mono text-gray-400">{t.tableName}</span>
                    {!t.hasCorrectTags && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold">NO TAGS</span>
                    )}
                    {t.columnSignature === 'mismatched' && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-semibold">WRONG DOMAIN</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Gate result cards */}
            <div className="space-y-2">
              {/* RBAC result */}
              <div className={`rounded-lg border p-3 transition-all duration-300 ${
                writeResult.rbac.passed ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${writeResult.rbac.passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Layer 1 — RBAC</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">{writeResult.rbac.reason}</p>
              </div>

              {/* Copilot result */}
              <div className={`rounded-lg border p-3 transition-all duration-300 ${
                !writeResult.rbac.passed ? 'border-white/5 bg-[#111] opacity-50'
                : writeResult.copilot.flag === 'pass' ? 'border-emerald-500/20 bg-emerald-500/5'
                : writeResult.copilot.flag === 'warn' ? 'border-amber-500/20 bg-amber-500/5'
                : 'border-red-500/20 bg-red-500/5'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${
                    !writeResult.rbac.passed ? 'bg-gray-600'
                    : writeResult.copilot.flag === 'pass' ? 'bg-emerald-400'
                    : writeResult.copilot.flag === 'warn' ? 'bg-amber-400'
                    : 'bg-red-400'
                  }`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Layer 2 — Domain Vocabulary Check</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">{writeResult.copilot.reason}</p>
              </div>

              {/* Validation result */}
              <div className={`rounded-lg border p-3 transition-all duration-300 ${
                writeResult.validation.status === 'n/a' ? 'border-white/5 bg-[#111] opacity-50'
                : writeResult.validation.status === 'ok' ? 'border-emerald-500/20 bg-emerald-500/5'
                : 'border-amber-500/20 bg-amber-500/5'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${
                    writeResult.validation.status === 'n/a' ? 'bg-gray-600'
                    : writeResult.validation.status === 'ok' ? 'bg-emerald-400'
                    : 'bg-amber-400'
                  }`} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Layer 3 — Tag Validation</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-relaxed">{writeResult.validation.reason}</p>
              </div>
            </div>
          </div>

          {/* Right column — Write Decision + SQL */}
          <div className="space-y-4">
            {/* Overall verdict */}
            <div className={`rounded-xl border-2 p-5 transition-all duration-300 ${
              writeResult.overall === 'allowed'
                ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent'
                : writeResult.overall === 'blocked'
                  ? 'border-red-500/40 bg-gradient-to-br from-red-500/10 to-transparent'
                  : 'border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-transparent'
            }`}>
              <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-2 ${
                writeResult.overall === 'allowed' ? 'text-emerald-400'
                : writeResult.overall === 'blocked' ? 'text-red-400'
                : 'text-amber-400'
              }`}>
                Write Decision
              </p>
              <p className="text-lg font-black text-white mb-2">
                {writeResult.overall === 'allowed' && '✓ Write Allowed'}
                {writeResult.overall === 'blocked' && '✗ Write Blocked'}
                {writeResult.overall === 'warning' && '⚠ Write Allowed — With Warnings'}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed">
                {writeResult.overall === 'allowed' && `${writeRole.label} has the correct entitlement, Copilot validates the table structure, and tag validation confirms domain alignment.`}
                {writeResult.overall === 'blocked' && !writeResult.rbac.passed && `${writeRole.label} lacks the ${writeTarget.domain} entitlement. The RBAC gate blocks the write before it reaches the schema — no data touches governed storage.`}
                {writeResult.overall === 'blocked' && writeResult.rbac.passed && `${writeRole.label} has the entitlement, but the domain vocabulary check detects that the table's column patterns don't belong in the ${writeTarget.domain} domain. This advisory heuristic flags authorized-but-wrong writes for review.`}
                {writeResult.overall === 'warning' && `${writeRole.label} can write to ${writeTarget.schema}, but governance flags are raised. The Stream + Task monitor will surface this table for review.`}
              </p>
            </div>

            {/* RBAC sync SQL */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Layer 1 — RBAC Sync Procedure
              </p>
              <pre className="bg-[#0f0f0f] border border-white/20 rounded-xl p-5 font-mono text-[11px] leading-relaxed text-gray-300 overflow-x-auto shadow-2xl">
{`-- Stored proc syncs ENTITLEMENTS → schema grants
-- Runs on schedule or triggered by entitlement changes
CALL governance.sync_write_grants();

-- For each row in ENTITLEMENTS where DOMAIN = 'HR':
GRANT INSERT, CREATE TABLE
  ON SCHEMA sandbox.HR__INDIVIDUAL
  TO ROLE hr_writer;

GRANT INSERT, CREATE TABLE
  ON SCHEMA sandbox.HR__BY_DEPARTMENT
  TO ROLE hr_writer;

-- Users with HR entitlement inherit hr_writer
GRANT ROLE hr_writer
  TO ROLE sandbox_role;  -- conditional on entitlement`}</pre>
            </div>

            {/* Copilot inspection */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Layer 2 — Domain Vocabulary Check (Advisory)
              </p>
              <pre className="bg-[#0f0f0f] border border-white/20 rounded-xl p-5 font-mono text-[11px] leading-relaxed text-gray-300 overflow-x-auto shadow-2xl">
{`-- Domain vocabulary check inspects before CREATE TABLE / INSERT:
-- NOTE: This is an advisory heuristic, not an enforcement gate.
-- 1. Read column names + types from DDL
-- 2. Compare against domain vocabulary:
--    HR columns:    EMPLOYEE_ID, HIRE_DATE, SALARY...
--    SALES columns: OPP_ID, CLOSE_DATE, AMOUNT...
-- 3. Flag if column patterns don't match target domain
-- 4. Check if DATA_DOMAIN tag is set on the table

-- Example: writing quota_attainment to HR schema
-- Columns: QUOTA, ATTAINMENT, REP_NAME, TERRITORY
-- → Advisory: "These columns match SALES patterns,
--    not HR. Did you mean SALES__BY_REGION?"`}</pre>
            </div>

            {/* Stream + Task SQL */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Layer 3 — Stream + Task Validation
              </p>
              <pre className="bg-[#0f0f0f] border border-white/20 rounded-xl p-5 font-mono text-[11px] leading-relaxed text-gray-300 overflow-x-auto shadow-2xl">
{`-- Stream monitors governed schemas for new objects
CREATE STREAM governance.schema_changes_stream
  ON TABLE information_schema.tables
  SHOW_INITIAL_ROWS = FALSE;

-- Task runs every 15 minutes
CREATE TASK governance.validate_new_objects
  WAREHOUSE = governance_wh
  SCHEDULE  = '15 MINUTE'
AS
  INSERT INTO governance.validation_alerts
  SELECT t.table_schema, t.table_name,
         tr.tag_value AS data_domain_tag,
         SPLIT_PART(t.table_schema, '__', 1) AS expected
  FROM governance.schema_changes_stream t
  LEFT JOIN TABLE(
    information_schema.tag_references(
      t.table_catalog||'.'||t.table_schema||'.'||t.table_name,
      'TABLE'
    )
  ) tr ON tr.tag_name = 'DATA_DOMAIN'
  WHERE tr.tag_value IS NULL          -- missing tag
     OR tr.tag_value != expected;     -- domain mismatch`}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CalloutBox title="ENTITLEMENTS → RBAC Plumbing" variant="amber">
          <p>
            The sync between <C>ENTITLEMENTS</C> and Snowflake role grants requires new plumbing — a stored
            procedure or scheduled Task that reads entitlement rows and issues <C>GRANT</C> / <C>REVOKE</C> statements.
            This is the same ENTITLEMENTS table that drives read-time RAP, now also driving write-time RBAC.
            The alternative is a role hierarchy where HR-entitled users inherit an <C>HR_WRITER</C> role.
          </p>
        </CalloutBox>
          <CalloutBox title="Defense in Depth — Not Redundancy" variant="blue">
            <p>
              Each layer catches what the others cannot. RBAC prevents unauthorized writes (you can't even touch the schema).
              Copilot prevents authorized-but-wrong writes (you have access, but the data doesn't belong here).
              Tag validation catches anything that slips through (continuous monitoring after the fact).
              Together they close the loop on write-path governance.
            </p>
          </CalloutBox>
        </div>
        </>)}

        {lens === 'failure' && (<>
          <p className="text-sm text-gray-400 leading-relaxed">
            The write path has <span className="text-white font-semibold">known bypass vectors</span>.
            Each card below documents a failure mode, its blast radius, and the compensating controls that cap exposure.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FailureModeCard
              title="Direct SQL bypasses Domain Vocabulary Check"
              severity="high"
              trigger="Developer with WRITE role authors INSERT/MERGE in a SQL worksheet, not via Copilot. The domain vocabulary heuristic never runs."
              blastRadius="Columns with misaligned domain/grain tags land in governed schemas. Downstream masking + RAP rely on tags; mismatched tags produce wrong policy attachment."
              control="The heuristic is advisory only (LLM-based). Real enforcement is: (a) tag-validation procedure gated on the commit, and (b) schema resolver rejecting unknown domain/grain combos at DDL time. A preventive CI hook on merge catches most cases. GAP: ad-hoc writes in worksheets bypass CI."
              owner="Data Platform Guild"
            />

            <FailureModeCard
              title="Schema-evolution drift: new column lands without tags"
              severity="high"
              trigger={<>ALTER TABLE ADD COLUMN adds <C>phone_number</C> to <C>sales.opps</C>. Column has no tags set at creation.</>}
              blastRadius={<>Until the tag-apply job runs (up to 15 min), the new column has no <C>PII_POLICY</C> or <C>DATA_SENSITIVITY</C>. Masking policy does not engage. If the column contains PII, it flows unmasked.</>}
              control={<>ALTER TABLE trigger runs a tag-classification procedure (regex/cortex-classifier). Default: columns without classified tags inherit table-level <C>DATA_SENSITIVITY='RESTRICTED'</C> and a generic <C>PII_POLICY='GENERIC_MASK'</C>. Detective backup: Stream on <C>TAG_REFERENCES</C>.</>}
              owner="Data Platform Guild"
            />

            <FailureModeCard
              title="Service account bypass"
              severity="critical"
              trigger={<>dbt service role <C>DBT_SERVICE_ROLE</C> has WRITE grants for its target schemas. Service runs without going through the Copilot/vocab path. If the service's config is wrong, it writes misaligned data.</>}
              blastRadius="Service identity has no human-in-the-loop. Misconfigured models silently write misaligned tags or place data in the wrong schema."
              control={<>
                dbt post-hook runs tag-validation procedure. CI on the dbt project enforces <C>{'{{ config(meta={...}) }}'}</C> on every model. Break-glass is operator-run via a separate procedure with audit logging.
                <div className="mt-2">
                  <KillSwitchBadge action="REVOKE WRITE ON SCHEMA sales FROM ROLE DBT_SERVICE_ROLE" />
                </div>
              </>}
              owner="Analytics Engineering"
            />

            <FailureModeCard
              title="Stream+Task latency on detection"
              severity="medium"
              trigger="All three layers depend on Stream+Task cadence (currently 15 min) for detective backup. A bad write + detection window means data is wrong for up to 15 min."
              blastRadius="Downstream BI or ML consumers read the bad data. Audit trail shows the gap."
              control="Preventive controls (CI, post-hooks, DDL procedures) catch most cases before the window. Detective window is the blast-radius cap, not the primary control. Roadmap: sub-minute task cadence + Snowpipe-style continuous."
              owner="Data Platform Guild"
            />
          </div>

          {/* Schema-evolution tag-drift timeline */}
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
              Schema-evolution tag-drift window
            </p>
            <FailureTimeline
              events={evolutionTimeline}
              gap={{ fromIndex: 0, toIndex: 3, label: 'UNMASKED PII WINDOW (0–2 min)' }}
            />
          </div>

          <CalloutBox title="Write-path honest claim" variant="red">
            <p>
              The write path is defense in depth, not a single choke point. Copilot is advisory. CI catches most
              misalignments. Post-hooks and DDL triggers enforce per-action. The Stream+Task detective layer caps
              blast radius at 15 minutes. No single layer is sufficient; all three together are.
            </p>
          </CalloutBox>
        </>)}
      </section>
  );
};

export default WritePathTab;
