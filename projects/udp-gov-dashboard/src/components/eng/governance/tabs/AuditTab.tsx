/**
 * Audit & Evidence tab — compliance coverage matrix, SQL evidence queries,
 * failure modes, and bottom-line claim cards.
 *
 * Uses EvidenceDrawer for on-demand SQL inspection and ComplianceMap for the
 * framework × control coverage matrix.
 */

import React, { useState } from 'react';
import { FileSearch } from 'lucide-react';
import {
  CalloutBox,
  ClaimCard,
  ComplianceMap,
  EvidenceDrawer,
  FailureModeCard,
} from '../../../primitives';
import type { EvidenceQuery } from '../../../primitives';
import type { Principal } from '../data/principals';
import { frameworks, complianceControls, coverage } from '../data/compliance';

/* ── Types ────────────────────────────────────────────────── */

interface AuditTabProps {
  principal: Principal;
}

interface EvidenceBundle {
  title: string;
  description: string;
  queries: EvidenceQuery[];
}

/* ── Evidence bundles ─────────────────────────────────────── */

const evidenceBundles: EvidenceBundle[] = [
  {
    title: 'Row Access Policies — attachment coverage',
    description: 'Verify every governed table has a RAP bound. Zero unprotected rows in governed schemas.',
    queries: [
      {
        label: 'Find tables in governed schemas WITHOUT a RAP',
        sql: `SELECT t.table_schema, t.table_name
FROM information_schema.tables t
LEFT JOIN snowflake.account_usage.policy_references pr
  ON pr.ref_database_name = t.table_catalog
  AND pr.ref_schema_name  = t.table_schema
  AND pr.ref_entity_name  = t.table_name
  AND pr.policy_kind = 'ROW_ACCESS_POLICY'
WHERE t.table_schema IN ('SALES','HR','FINANCE')
  AND pr.policy_name IS NULL
  AND t.deleted IS NULL;`,
        expectedShape:
          'Zero rows = full coverage. Non-zero rows = unprotected tables in governed schemas; investigate immediately.',
      },
    ],
  },
  {
    title: 'Tag coverage — PII columns without PII_POLICY',
    description: 'Identify RESTRICTED columns missing a PII_POLICY tag. Invariant: every RESTRICTED column has a masking tag.',
    queries: [
      {
        label: 'Find columns classified as RESTRICTED but without a PII_POLICY tag',
        sql: `WITH restricted_cols AS (
  SELECT column_name, table_name, table_schema
  FROM snowflake.account_usage.tag_references
  WHERE tag_name = 'DATA_SENSITIVITY' AND tag_value = 'RESTRICTED'
    AND domain = 'COLUMN'
),
pii_cols AS (
  SELECT column_name, table_name, table_schema
  FROM snowflake.account_usage.tag_references
  WHERE tag_name = 'PII_POLICY' AND tag_value IS NOT NULL
    AND domain = 'COLUMN'
)
SELECT r.*
FROM restricted_cols r
LEFT JOIN pii_cols p USING (column_name, table_name, table_schema)
WHERE p.column_name IS NULL;`,
        expectedShape:
          'Zero rows under the invariant. Non-zero = invariant violation; tag-validation policy must close the gap.',
      },
    ],
  },
  {
    title: 'Masking policy — unmasked PII access',
    description: 'Detect queries that accessed PII-tagged columns without a masking policy in the last 7 days.',
    queries: [
      {
        label: 'Queries that SELECT a PII_POLICY-tagged column without the policy applied',
        sql: `SELECT query_id, user_name, query_text, start_time
FROM snowflake.account_usage.access_history ah,
     LATERAL FLATTEN(ah.direct_objects_accessed) do
WHERE TO_VARCHAR(do.value:"objectName")::STRING LIKE 'SALES.OPPS%'
  AND NOT EXISTS (
    SELECT 1 FROM snowflake.account_usage.policy_references pr
    WHERE pr.policy_kind = 'MASKING_POLICY'
      AND pr.ref_database_name = SPLIT_PART(do.value:"objectName",'.',1)
  )
  AND ah.start_time > DATEADD('day',-7,CURRENT_TIMESTAMP());`,
        expectedShape:
          'Investigate any results. Should be zero for PII-tagged columns. Note: this is a lagging indicator (ACCESS_HISTORY has ~45 min latency).',
      },
    ],
  },
  {
    title: 'Entitlements — change history',
    description: 'Audit all ENTITLEMENTS inserts in the last 30 days. Every row must have an approved_by value.',
    queries: [
      {
        label: 'All ENTITLEMENTS inserts in the last 30 days',
        sql: `SELECT user_name, domain, access_level, access_value,
       granted_by, granted_at, approved_by
FROM governance.entitlements_history
WHERE operation = 'INSERT'
  AND granted_at > DATEADD('day',-30,CURRENT_TIMESTAMP())
ORDER BY granted_at DESC;`,
        expectedShape:
          'Every row has a non-null approved_by. Rows with NULL approved_by = exception; must be reconciled to a ticket.',
      },
    ],
  },
  {
    title: 'Tag drift — Stream+Task output',
    description: 'Review tag-loss events detected in the last 24 hours and their remediation status.',
    queries: [
      {
        label: 'Tag loss events detected in the last 24 h',
        sql: `SELECT detected_at, object_name,
       lost_tags::string AS tags_removed, remediated_at
FROM governance.tag_drift_alerts
WHERE detected_at > DATEADD('hour',-24,CURRENT_TIMESTAMP())
ORDER BY detected_at DESC;`,
        expectedShape:
          'Non-zero rows are expected; all must have remediated_at within SLO window. NULL remediated_at on rows older than 1h = breach.',
      },
    ],
  },
  {
    title: 'Break-glass — emergency access events',
    description: 'Review all break-glass sessions in the last 90 days for completeness of audit trail.',
    queries: [
      {
        label: 'Break-glass sessions in the last 90 days',
        sql: `SELECT user_name, session_start, session_end,
       business_justification, ticket_id, reviewer
FROM governance.break_glass_events
WHERE session_start > DATEADD('day',-90,CURRENT_TIMESTAMP())
ORDER BY session_start DESC;`,
        expectedShape:
          'Every row has ticket_id + reviewer + business_justification. Missing any of these = audit finding.',
      },
    ],
  },
];

/* ── Component ────────────────────────────────────────────── */

export default function AuditTab({ principal: _principal }: AuditTabProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTitle, setDrawerTitle] = useState('');
  const [drawerQueries, setDrawerQueries] = useState<EvidenceQuery[]>([]);

  const openEvidence = (bundle: EvidenceBundle) => {
    setDrawerTitle(bundle.title);
    setDrawerQueries(bundle.queries);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* ── A. Intro ── */}
      <div className="bg-[#111] border border-white/10 rounded-xl p-6 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
          Chapter 4 — The Evidence
        </p>
        <p className="text-sm text-gray-300 leading-relaxed">
          Every governance control has an audit signal. This chapter shows what auditors can
          verify, which query produces the evidence, and where coverage is partial or
          missing.
        </p>
      </div>

      {/* ── B. Compliance coverage matrix ── */}
      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
          Framework × Control coverage
        </p>
        <ComplianceMap
          frameworks={frameworks}
          controls={complianceControls}
          coverage={coverage}
        />
        <div className="flex items-center gap-6 text-[10px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Full
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-amber-400">△</span> Partial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-red-400">✗</span> Gap
          </span>
        </div>
        <CalloutBox title="Honest inventory" variant="amber">
          <p className="text-xs text-gray-400 leading-relaxed">
            This matrix is the honest inventory. Where coverage is{' '}
            <span className="text-amber-300 font-semibold">PARTIAL</span>, auditors must
            verify compensating controls. Where coverage is{' '}
            <span className="text-red-400 font-semibold">GAP</span>, a documented risk
            acceptance is required until the roadmap closes it.
          </p>
        </CalloutBox>
      </div>

      {/* ── C. Evidence queries ── */}
      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
          Evidence Queries
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidenceBundles.map((bundle) => (
            <div
              key={bundle.title}
              className="bg-[#111] border border-white/10 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <FileSearch size={14} className="text-blue-400 shrink-0" />
                <h4 className="text-xs font-bold text-white uppercase tracking-tight">
                  {bundle.title}
                </h4>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {bundle.description}
              </p>
              <button
                onClick={() => openEvidence(bundle)}
                className="text-[11px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5 hover:bg-blue-500/20 transition-colors"
              >
                Open evidence queries
              </button>
            </div>
          ))}
        </div>

        <EvidenceDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={drawerTitle}
          queries={drawerQueries}
        />
      </div>

      {/* ── D. Audit failure modes ── */}
      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
          Audit Failure Modes
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FailureModeCard
            title="ACCESS_HISTORY lag"
            severity="medium"
            trigger="Snowflake ACCESS_HISTORY has ~45-minute population lag."
            blastRadius="Real-time audit detection is not possible. An incident in progress cannot be observed via ACCESS_HISTORY until up to 45 min later."
            control="Event table + query_history streaming for real-time detection. ACCESS_HISTORY remains the system-of-record for retention + reporting."
            owner="Governance Platform"
          />
          <FailureModeCard
            title="Evidence queries show 'current' state, not historical"
            severity="medium"
            trigger={<>Auditor asks: &ldquo;Did masking apply to this column on 2024-03-15?&rdquo;</>}
            blastRadius="TAG_REFERENCES and POLICY_REFERENCES are current state. Historical queries require TAG_REFERENCES_HISTORY (account_usage) with 365-day retention and 45-min latency."
            control="Use account_usage.tag_references_history + policy_references_history for point-in-time evidence. Document retention SLO (365 days per Snowflake default)."
            owner="Governance Platform"
          />
        </div>
      </div>

      {/* ── E. Bottom line ── */}
      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
          Bottom Line — Audit & Evidence
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              Enforces today
            </p>
            <ClaimCard status="today" claim="Every control has a Snowflake-native evidence query" />
            <ClaimCard status="today" claim="Audit retention 365 days (account_usage defaults)" />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">
              Detects today
            </p>
            <ClaimCard status="today" claim="Tag drift + broken invariants caught via Stream+Task" />
            <ClaimCard status="today" claim="ENTITLEMENTS inserts require approved_by" />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">
              Out of scope today
            </p>
            <ClaimCard status="roadmap" claim="Real-time audit streaming (query_history → event table)" />
            <ClaimCard status="roadmap" claim="Immutable per-query evidence export (WORM storage)" />
            <ClaimCard status="roadmap" claim="Automatic evidence packaging for SOX walkthroughs" />
          </div>
        </div>
      </div>
    </div>
  );
}
