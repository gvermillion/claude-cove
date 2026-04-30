/**
 * Tag Taxonomy tab — tag resolution playground and masking policy demo.
 *
 * Extracted from GovernanceImplView.tsx (Phase 0C).
 */

import React, { useState } from 'react';
import { Zap, Shield } from 'lucide-react';
import { C, CalloutBox, ClaimCard, colorStyles, FailureModeCard, TagLifecycleTrace, PrincipalChip, type TagLifecycleStep } from '../../../primitives';
import { tagMeta, tagScenarios, tagInvariants, maskingExamples } from '../data/tags';
import { schemas, resolveTagSelection } from '../data/schemas';
import type { Principal } from '../data/principals';

type Lens = 'happy' | 'failure';

interface TagTaxonomyTabProps {
  principal: Principal;
  lens: Lens;
  onNavigate?: (tabId: string) => void;
}

const createOrReplaceLifecycle: TagLifecycleStep[] = [
  { ddl: "CREATE TABLE sales.opps (email VARCHAR)", tagState: 'set', note: "Initial table; tag-apply pipeline sets PII_POLICY='EMAIL', DATA_SENSITIVITY='RESTRICTED'" },
  { ddl: "ALTER TABLE sales.opps MODIFY COLUMN email SET TAG PII_POLICY='EMAIL'", tagState: 'preserved', note: "Explicit tag application" },
  { ddl: "-- Developer edits schema --", tagState: 'preserved' },
  { ddl: "CREATE OR REPLACE TABLE sales.opps (email VARCHAR, phone VARCHAR)", tagState: 'lost', note: "All column tags dropped. Snowflake does not preserve column-level tags across CREATE OR REPLACE." },
  { ddl: "-- 15 min elapsed --", tagState: 'lost', note: "Data flows UNMASKED during this window" },
  { ddl: "INSERT INTO TAG_DRIFT_ALERTS SELECT ... FROM TAG_REFERENCES_DIFF", tagState: 'lost', note: "Stream+Task detects missing tags. Alert fires." },
  { ddl: "ALTER TABLE sales.opps MODIFY COLUMN email SET TAG PII_POLICY='EMAIL'", tagState: 'set', note: "Manual remediation re-applies tags." },
];

const TagTaxonomyTab = ({ principal, lens }: TagTaxonomyTabProps) => {
  const [selectedScenario, setSelectedScenario] = useState(0);
  const tagSelection = tagScenarios[selectedScenario].tags;
  const resolved = resolveTagSelection(tagSelection);

  return (
    <section id="eng-gi-tags" className="space-y-6">
      <div className="flex items-center gap-3">
        <PrincipalChip kind={principal.kind} label={principal.label} />
      </div>

      {lens === 'failure' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FailureModeCard
              title="Tag drop on CREATE OR REPLACE"
              severity="critical"
              trigger="Developer re-runs `CREATE OR REPLACE TABLE ...` without re-applying tags. Snowflake drops all column-level tags."
              blastRadius="Masking policy silently disengages on PII columns. Data flows unmasked to BI consumers until detected."
              control="Stream on INFORMATION_SCHEMA.TAG_REFERENCES + Task every 15 min. Detective, not preventive. Compensating: CI job blocks CREATE OR REPLACE patterns; require CREATE TABLE IF NOT EXISTS + ALTER."
              owner="Data Platform Guild"
            />
            <FailureModeCard
              title="Taxonomy invariant violated (PII + INTERNAL)"
              severity="high"
              trigger="Developer tags a column PII_POLICY='EMAIL' but leaves DATA_SENSITIVITY='INTERNAL'."
              blastRadius="Masking policy does NOT apply (DATA_SENSITIVITY gate fails) — email data flows unmasked despite PII tag."
              control="Tag-validation policy + CI lint checks the invariant 'PII_POLICY ≠ None ⇒ DATA_SENSITIVITY = RESTRICTED'. Today: advisory-only in pre-commit hook."
              owner="Data Stewards"
            />
            <FailureModeCard
              title="Domain/grain mismatch"
              severity="medium"
              trigger="DATA_DOMAIN='FINANCE' with GOVERNANCE_GRAIN='OPP_ID'. Grain is not defined for the finance domain."
              blastRadius="Schema resolver returns null — table lands in an undefined schema (or the default), RAP is the wrong policy, access is either over- or under-permissive."
              control="Resolver enforces domain-scoped grain whitelist at registration time. If invalid, registration fails closed."
              owner="Governance Platform"
            />
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
              Lifecycle of a CREATE OR REPLACE tag loss
            </p>
            <TagLifecycleTrace steps={createOrReplaceLifecycle} />
          </div>

          <CalloutBox title="Detective window" variant="red">
            The Stream+Task detection cadence creates a 0–15 minute window where tag-loss can expose
            unmasked data. Treat this as detective, not preventive. A preventive control (CI block on
            CREATE OR REPLACE) is on the roadmap — see Operating Model.
          </CalloutBox>
        </div>
      ) : (
      <>
      {/* Tag Resolution Playground */}
      <div id="eng-gi-tag-registry" className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          Tag Resolution Playground
          <span className="text-gray-600 font-normal normal-case tracking-normal ml-2">
            — select a scenario to see the resolution cascade
          </span>
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          {/* Left column — Scenario Selector */}
          <div className="space-y-3">
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Scenario
              </p>
              <div className="flex flex-col gap-1.5">
                {tagScenarios.map((sc, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedScenario(i)}
                    className={`text-left px-3 py-2.5 rounded-md border transition-all duration-200 ${
                      i === selectedScenario
                        ? 'bg-blue-600/10 border-blue-500/30 text-white'
                        : 'border-white/10 text-gray-500 hover:border-white/25 hover:text-gray-300'
                    }`}
                  >
                    <span className="text-xs font-semibold block">
                      {sc.label}
                      {sc.label.startsWith('Taxonomy bug:') && (
                        <span className="ml-2 inline-flex items-center text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-red-500/40 bg-red-500/10 text-red-400">
                          INVARIANT
                        </span>
                      )}
                    </span>
                    <span className="block text-[10px] text-gray-500 mt-0.5 leading-snug">{sc.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Taxonomy invariants callout */}
            <CalloutBox title="Taxonomy invariants" variant="blue">
              <ul className="space-y-2">
                {tagInvariants.map((inv) => (
                  <li key={inv.id} className="text-xs text-gray-400 leading-relaxed">
                    <span className="font-bold text-white">{inv.rule}</span>
                    {' \u2014 '}
                    <span className="italic">{inv.rationale}</span>
                  </li>
                ))}
              </ul>
            </CalloutBox>

            {/* Read-only tag chips — show what the selected scenario resolves to */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                Active Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {tagMeta.map((tm) => {
                  const style = colorStyles[tm.color];
                  return (
                    <span
                      key={tm.key}
                      className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-md border ${style.bg} ${style.border} ${style.accent}`}
                    >
                      {tm.label} = {tagSelection[tm.key]}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column — Resolution Panel */}
          <div className="p-5 rounded-xl border border-white/20 bg-[#0a0a0a] space-y-5">
            <div className="flex items-center gap-3">
              <Zap size={16} className="text-amber-400" />
              <span className="text-white text-sm font-semibold">Resolved Outcome</span>
            </div>

            {/* Resolved Schema */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Resolved Schema</p>
              {resolved.schemaName ? (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {resolved.schemaName}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-sm font-mono text-red-400">No matching schema</span>
                </div>
              )}
            </div>

            {/* Bound Policy & Grain */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Bound Policy</p>
                <p className="text-xs text-gray-300 font-mono">
                  {resolved.policy ? <C>{resolved.policy}</C> : <span className="text-gray-600">—</span>}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Grain Columns</p>
                <p className="text-xs text-gray-300">
                  {resolved.grainColumns ?? <span className="text-gray-600">—</span>}
                </p>
              </div>
            </div>

            {/* RAP Branch */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">RAP Behavior</p>
              <p className="text-xs text-gray-400 leading-relaxed">{resolved.rapBranch}</p>
            </div>

            {/* Masking Status */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Masking Status</p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${
                  resolved.maskingBehavior.startsWith('Column masking active')
                    ? 'bg-red-500'
                    : resolved.maskingBehavior.startsWith('No PII')
                      ? 'bg-emerald-500'
                      : 'bg-gray-500'
                }`} />
                <p className={`text-xs leading-relaxed ${
                  resolved.maskingBehavior.startsWith('Column masking active')
                    ? 'text-red-400'
                    : resolved.maskingBehavior.startsWith('No PII')
                      ? 'text-emerald-400'
                      : 'text-gray-400'
                }`}>
                  {resolved.maskingBehavior}
                </p>
              </div>
            </div>

            {/* Enforcement Summary */}
            <div className="space-y-1.5 border-t border-white/10 pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Enforcement Summary</p>
              <p className="text-xs text-gray-400 leading-relaxed">{resolved.summary}</p>
            </div>
          </div>
        </div>
       </div>

      {/* Masking Policy Playground — gated on PII schema + policy selection */}
      {(() => {
        const maskSchema = resolved.schemaName
          ? schemas.find((s) => s.name === resolved.schemaName)
          : null;
        const hasPii = maskSchema?.pii.present ?? false;
        const piiActive = tagSelection.piiPolicy !== 'None' && hasPii && tagSelection.sensitivity === 'RESTRICTED';
        const maskRows = maskingExamples[tagSelection.piiPolicy] ?? null;

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-blue-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Masking Policy Playground
                <span className="text-gray-600 font-normal normal-case tracking-normal ml-2">
                  — tag-based column masking
                </span>
              </p>
            </div>

            {piiActive && maskRows ? (
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
                {/* Left column — Masking policy SQL */}
                <div className="bg-[#0f0f0f] border border-white/20 rounded-xl p-5 font-mono text-[11px] shadow-2xl">
                  <pre className="text-gray-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    <span className="text-blue-400">CREATE OR REPLACE MASKING POLICY</span>{' '}<C>pii_tag_mask</C>{'\n'}
                    {'  '}<span className="text-blue-400">AS</span> (val <span className="text-emerald-300">VARCHAR</span>){'\n'}
                    {'  '}<span className="text-blue-400">RETURNS</span> <span className="text-emerald-300">VARCHAR</span> -{'>'}{'\n'}
                    {'    '}<span className="text-gray-500">-- Two gates: PII_POLICY must be set AND the column&apos;s DATA_SENSITIVITY must be RESTRICTED.</span>{'\n'}
                    {'    '}<span className="text-gray-500">-- Column-level tags override table-level tags via Snowflake tag inheritance rules.</span>{'\n'}
                    {'    '}<span className="text-pink-500">CASE</span>{'\n'}
                    {'      '}<span className="text-pink-500">WHEN</span> <span className="text-blue-400">SYSTEM$GET_TAG_ON_CURRENT_COLUMN</span>(<span className="text-amber-300">&apos;PII_POLICY&apos;</span>) <span className="text-blue-400">IS NULL</span>{'\n'}
                    {'        '}<span className="text-pink-500">THEN</span> val{'\n'}
                    {'      '}<span className="text-pink-500">WHEN</span> <span className="text-blue-400">SYSTEM$GET_TAG_ON_CURRENT_COLUMN</span>(<span className="text-amber-300">&apos;DATA_SENSITIVITY&apos;</span>) != <span className="text-amber-300">&apos;RESTRICTED&apos;</span>{'\n'}
                    {'        '}<span className="text-pink-500">THEN</span> val{'  '}<span className="text-gray-500">-- PII policy tagged but sensitivity below threshold: do NOT mask</span>{'\n'}
                    <span className={`transition-all duration-300 ${tagSelection.piiPolicy === 'EMAIL' ? 'bg-blue-600/20 text-white' : ''}`}>
                    {'      '}<span className="text-pink-500">WHEN</span> <span className="text-blue-400">SYSTEM$GET_TAG_ON_CURRENT_COLUMN</span>(<span className="text-amber-300">&apos;PII_POLICY&apos;</span>) = <span className="text-amber-300">&apos;EMAIL&apos;</span>{'\n'}
                    {'        '}<span className="text-pink-500">THEN</span> <span className="text-blue-400">REGEXP_REPLACE</span>(val, <span className="text-amber-300">&apos;(.).*(@.).*(\\..*)</span><span className="text-amber-300">&apos;</span>, <span className="text-amber-300">&apos;\\1*****\\2*****\\3&apos;</span>)
                    </span>{'\n'}
                    <span className={`transition-all duration-300 ${tagSelection.piiPolicy === 'FULL_NAME' ? 'bg-blue-600/20 text-white' : ''}`}>
                    {'      '}<span className="text-pink-500">WHEN</span> <span className="text-blue-400">SYSTEM$GET_TAG_ON_CURRENT_COLUMN</span>(<span className="text-amber-300">&apos;PII_POLICY&apos;</span>) = <span className="text-amber-300">&apos;FULL_NAME&apos;</span>{'\n'}
                    {'        '}<span className="text-pink-500">THEN</span> <span className="text-amber-300">&apos;***&apos;</span>
                    </span>{'\n'}
                    <span className={`transition-all duration-300 ${tagSelection.piiPolicy === 'SSN_LAST4' ? 'bg-blue-600/20 text-white' : ''}`}>
                    {'      '}<span className="text-pink-500">WHEN</span> <span className="text-blue-400">SYSTEM$GET_TAG_ON_CURRENT_COLUMN</span>(<span className="text-amber-300">&apos;PII_POLICY&apos;</span>) = <span className="text-amber-300">&apos;SSN_LAST4&apos;</span>{'\n'}
                    {'        '}<span className="text-pink-500">THEN</span> <span className="text-amber-300">&apos;****&apos;</span>
                    </span>{'\n'}
                    {'      '}<span className="text-pink-500">ELSE</span> val{'\n'}
                    {'    '}<span className="text-pink-500">END</span>;
                  </pre>
                </div>

                {/* Right column — Before / After table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Column-Level Masking Result
                    </p>
                    <span className="text-xs font-bold px-3 py-1 rounded-full border bg-blue-600/10 border-blue-600/40 text-blue-400">
                      PII_POLICY = {tagSelection.piiPolicy}
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-white/20 bg-[#0f0f0f]">
                    <table className="w-full text-left text-[11px] text-gray-400">
                      <thead className="bg-white/5 text-white">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">Column</th>
                          <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">Raw Value</th>
                          <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">After Masking</th>
                          <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maskRows.map((row) => {
                          const isMasked = row.raw !== row.masked;
                          return (
                            <tr
                              key={row.column}
                              className={`border-t border-white/10 transition-all duration-300 ${
                                isMasked ? 'bg-red-600/5' : ''
                              }`}
                            >
                              <td className="px-4 py-2.5 font-mono font-semibold text-white">
                                {row.column}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-gray-300">
                                {row.raw}
                              </td>
                              <td className={`px-4 py-2.5 font-mono font-semibold ${
                                isMasked ? 'text-red-400' : 'text-gray-300'
                              }`}>
                                {row.masked}
                              </td>
                              <td className="px-4 py-2.5">
                                {isMasked ? (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-red-600/10 text-red-400 border border-red-600/30">
                                    MASKED
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-600/10 text-emerald-400 border border-emerald-600/30">
                                    PASS-THROUGH
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-gray-500 italic leading-relaxed">
                    The masking policy reads the <C>PII_POLICY</C> tag value on each column at query time via{' '}
                    <C>SYSTEM$GET_TAG_ON_CURRENT_COLUMN</C>. Only columns tagged with the active policy are masked —
                    others pass through unchanged. Row-level entitlements (RAP) still apply on top.
                  </p>
                  <ClaimCard
                    status="today"
                    claim="SQL enforces both gates"
                    caveat="If either gate fails, value passes through unmasked. See Failure Modes for CREATE OR REPLACE tag loss."
                  />
                </div>
              </div>
            ) : (
              <div className="border border-white/10 bg-[#0a0a0a] rounded-lg p-4">
                <p className="text-xs text-gray-500 leading-relaxed">
                  {!resolved.schemaName
                    ? 'Select a scenario that resolves to a valid schema to see masking in action.'
                    : !hasPii
                      ? <>This schema has no PII columns. Try an <span className="text-white font-semibold">HR + EMPLOYEE_ID</span> scenario to see <C>HR__INDIVIDUAL</C>, the only PII-bearing schema.</>
                      : tagSelection.piiPolicy === 'None'
                        ? <>This scenario has no PII_POLICY set. Try <span className="text-white font-semibold">HR manager views employee records</span> to see masking in action.</>
                        : <>Set sensitivity to <span className="text-white font-semibold">RESTRICTED</span> to activate dynamic masking — <C>{tagSelection.sensitivity}</C> sensitivity does not enforce masking.</>
                  }
                </p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Masking edge cases — what the playground doesn't show */}
      <div className="space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          What the playground doesn&apos;t show
        </p>
        <CalloutBox title="Masking edge cases" variant="amber">
          <ul className="space-y-3 text-xs text-gray-400 leading-relaxed">
            <li>
              <span className="text-white font-semibold">Table-level vs column-level tag:</span>{' '}
              Column-level wins. If a column has no tag, table-level propagates.
            </li>
            <li>
              <span className="text-white font-semibold">Inheritance across views:</span>{' '}
              Masking policies do NOT automatically propagate through views. A SECURE view bypasses masking if the underlying masking policy body is evaluated in the view owner&apos;s context, not the invoker&apos;s. Use <C>EXECUTE AS INVOKER</C> or re-apply policies at the view level.
            </li>
            <li>
              <span className="text-white font-semibold">UDF-applied masking:</span>{' '}
              Masking policies attach to columns, not UDF outputs. A UDF that reads a masked column returns the masked value; a UDF that re-derives (e.g. string-concat) the raw value is a bypass. <span className="text-amber-400 font-semibold">GAP:</span> static analysis of UDF bodies is on roadmap.
            </li>
            <li>
              <span className="text-white font-semibold">COPY INTO bypass:</span>{' '}
              <C>COPY INTO @stage FROM masked_table</C> exports masked values (policy applies). <C>COPY INTO @stage FROM raw_landing</C> does not; landing stages must have table-level RAP + masking or live in an isolated schema with no direct grants.
            </li>
            <li>
              <span className="text-white font-semibold">Snowflake Cortex LLM functions:</span>{' '}
              Cortex SQL functions (<C>COMPLETE</C>, <C>SUMMARIZE</C>) see masked inputs when invoked over a masked column. Embedded-column prompts reading sibling columns must be audited — the prompt template can unintentionally pull unmasked context.
            </li>
          </ul>
        </CalloutBox>
      </div>
      </>
      )}
    </section>
  );
};

export default TagTaxonomyTab;
