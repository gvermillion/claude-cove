/**
 * Schema Design tab — multi-domain schema selector with detail panel.
 *
 * Extracted from GovernanceImplView.tsx (Phase 0C).
 */

import React, { useState } from 'react';
import { DetailPanel, CalloutBox, C, colorStyles, FailureModeCard, FailureTimeline, PrincipalChip } from '../../../primitives';
import type { TimelineEvent } from '../../../primitives';
import { schemas, schemasByDomain } from '../data/schemas';
import type { Principal } from '../data/principals';

type Lens = 'happy' | 'failure';

interface SchemaDesignTabProps {
  principal: Principal;
  lens: Lens;
  onNavigate?: (tabId: string) => void;
}

const rapBindingTimeline: TimelineEvent[] = [
  { label: 'CREATE TABLE', kind: 'event', at: 'T+0', note: 'New table in sales schema' },
  { label: 'Default GRANT applies', kind: 'event', at: 'T+0s', note: 'Role has SELECT on schema' },
  { label: 'Unprotected window', kind: 'event', at: 'T+0..T+5m', note: 'No RAP — all rows readable' },
  { label: 'Event-driven RAP bind', kind: 'control', at: 'T+5m', note: 'Schema hook fires ALTER TABLE ... ADD ROW ACCESS POLICY' },
  { label: 'Daily audit', kind: 'alert', at: 'T+24h', note: 'Backup detection — catches event-hook failures' },
];

const SchemaDesignTab = ({ principal, lens, onNavigate }: SchemaDesignTabProps) => {
  const [activeSchema, setActiveSchema] = useState(0);
  const schema = schemas[activeSchema];
  const schemaStyle = colorStyles[schema.color];

  return (
    <section id="eng-gi-schemas" className="space-y-6">
      <div className="flex items-center gap-3">
        <PrincipalChip kind={principal.kind} label={principal.label} />
      </div>

      {lens === 'happy' && (
        <>
          <p className="text-sm text-gray-400 leading-relaxed">
            Schema placement is the primary enforcement mechanism — the moment a table lands in a
            governed schema, the Row Access Policy binds automatically with no tags required.
            Select a schema below to see its domain, grain, and the access model it inherits.
          </p>
          {/* Two-column schema selector */}
          <div id="eng-gi-schema-selector" className="space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-tight">
              Multi-Domain Schema Set
              <span className="text-gray-500 font-normal text-xs ml-2 normal-case tracking-normal">
                — select a schema to explore its access model
              </span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
              {/* Left: schema list grouped by domain */}
              <div className="flex flex-col gap-1">
                {schemasByDomain.map((group) => (
                  <React.Fragment key={group.domain}>
                    <div className="px-4 pt-3 pb-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">
                        {group.domain}
                      </span>
                    </div>
                    {group.schemas.map((sc) => {
                      const globalIndex = schemas.indexOf(sc);
                      const isActive = globalIndex === activeSchema;
                      const cs = colorStyles[sc.color];
                      return (
                        <button
                          key={sc.name}
                          onClick={() => setActiveSchema(globalIndex)}
                          className={`text-left px-4 py-3 rounded-xl transition-all duration-200 border ${
                            isActive
                              ? `${cs.border} ${cs.bg} shadow-lg`
                              : 'border-transparent hover:bg-white/[0.03]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`shrink-0 w-2 h-2 rounded-full transition-colors ${
                                isActive ? cs.dot : 'bg-gray-700'
                              }`}
                            />
                            <span className={`text-xs font-semibold transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`}>
                              {sc.name}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>

              {/* Right: schema detail */}
              <DetailPanel activeKey={activeSchema}>
                <div className="p-5 rounded-xl border border-white/20 bg-[#0a0a0a] space-y-4">
                  <div className="flex items-center gap-3">
                    <p className={`font-mono font-bold text-sm ${schemaStyle.accent}`}>
                      <C>{schema.name}</C>
                    </p>
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 bg-white/5 px-2 py-0.5 rounded">
                      {schema.domain}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">{schema.detail.description}</p>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Policy: <C>{schema.policy}</C></p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Grain Columns: {schema.grainColumns}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">PII Columns</p>
                    {schema.pii.present ? (
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-red-300">
                        {schema.pii.columns?.map((col, i) => (
                          <React.Fragment key={col}>
                            <C>{col}</C>
                            {i < (schema.pii.columns?.length ?? 0) - 1 && <span className="text-gray-600">,</span>}
                          </React.Fragment>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-400/70">None — aggregates / non-PII attributes only</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">RAP Behavior</p>
                    <p className="text-xs text-gray-400 leading-relaxed">{schema.detail.rapBehavior}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Access Examples</p>
                    <div className="space-y-1">
                      {schema.detail.exampleAccess.map((ex, i) => (
                        <div key={i} className="flex items-center gap-3 text-[11px]">
                          <span className={ex.result === '✓' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {ex.result}
                          </span>
                          <span className="text-white font-semibold">{ex.user}</span>
                          <span className="text-gray-500">—</span>
                          <span className="text-gray-400">{ex.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 italic">
                    PII columns are masked column-level via <C>PII_POLICY</C>; row-level entitlements still apply on top.
                  </p>
                </div>
              </DetailPanel>
            </div>
          </div>

          {/* PDP back-reference */}
          <CalloutBox title="Centralized Policy Decision Point" variant="blue">
            <p>
              The PDP/PEP segregation pattern that enables this schema design is detailed in the{' '}
              <button
                onClick={() => onNavigate?.('enforcement')}
                className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300/60 transition-colors font-semibold"
              >
                Enforcement &amp; Hardening
              </button>{' '}
              section.
              The <C>ENTITLEMENTS</C> table in the Silver Layer serves as the shared PDP — Snowflake, AWS, and future platforms all read the same source of truth.
            </p>
          </CalloutBox>
        </>
      )}

      {lens === 'failure' && (
        <>
          <p className="text-sm text-gray-400 leading-relaxed">
            Schema-level enforcement has binding gaps. These failure modes trace the scenarios where
            a table exists in a governed schema but the Row Access Policy is not yet bound.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <FailureModeCard
              title="New table in a governed schema — RAP not bound"
              severity="critical"
              trigger="Developer creates a new table in sales.opportunities schema but the table-level RAP binding DDL is not run. Schema-level RAP does not automatically attach to new tables."
              blastRadius="The new table has NO row-access policy. All grants to SELECT can read every row regardless of region/opportunity entitlement."
              control={<>Schema-level CREATE TABLE hook (event-driven procedure) that ALTERs newly created tables to bind RAP. Detective backup: daily audit query <C>SELECT tables WITHOUT rap_binding JOIN protected_schemas</C>.</>}
              owner="Data Platform Guild"
            />
            <FailureModeCard
              title="Schema rebuild (dbt full-refresh) drops RAP binding"
              severity="high"
              trigger="dbt full-refresh materializes as CREATE OR REPLACE TABLE. RAP binding on the replaced table is dropped."
              blastRadius="Window between CREATE OR REPLACE and post-hook RAP re-bind. During this window (seconds to minutes) the table is unprotected."
              control="dbt post_hook to ALTER TABLE ... ADD ROW ACCESS POLICY. Fail closed: if post-hook fails, revoke table access in the same transaction. Detective backup via same Stream+Task as tags."
              owner="Analytics Engineering"
            />
            <FailureModeCard
              title="Cross-domain JOIN leaks sensitive columns"
              severity="medium"
              trigger={<>Join between <C>sales.opps</C> and <C>hr.employees</C> on <C>owner_employee_id</C>. RAP on each side enforces row access, but the join result exposes HR columns to sales users.</>}
              blastRadius="Sales user sees employee PII (compensation, manager, etc.) they would not see by querying hr.employees directly. Column masking partially helps but does not cover all fields."
              control={<>Column masking policies on <C>hr.employees</C> apply through the join. GAP: <C>DATA_DOMAIN='HR'</C> columns should have a view-level DENY for non-HR principals. Today this relies on masking coverage; a domain-boundary DENY is on roadmap.</>}
              owner="Data Stewards"
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-base font-bold text-white uppercase tracking-tight">
              New-table RAP binding gap
            </h3>
            <FailureTimeline
              events={rapBindingTimeline}
              gap={{ fromIndex: 0, toIndex: 3, label: 'UNPROTECTED WINDOW (0\u20135 min)' }}
            />
          </div>

          <CalloutBox title="Why this matters for audits" variant="red">
            <p>
              SOC2 CC6.1 (logical access) requires that access controls attach &ldquo;at or before data becomes available&rdquo;.
              The current architecture has an event-driven bind hook that closes the window, but audit should verify
              the hook&rsquo;s success rate and MTTR on hook failures. See Operating Model.
            </p>
          </CalloutBox>
        </>
      )}
    </section>
  );
};

export default SchemaDesignTab;
