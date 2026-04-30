/**
 * Policy Logic tab — RAP playground with user selector and row-level access demo.
 *
 * Extracted from GovernanceImplView.tsx (Phase 0C).
 */

import React, { useState, useEffect } from 'react';
import { User, ChevronDown, Zap } from 'lucide-react';
import { CalloutBox, C, FailureModeCard, PolicyBranchRoadmap } from '../../../primitives';
import type { Branch } from '../../../primitives';
import { mockUsers, mockRows, getRowAccess } from '../data/policy';
import type { Principal } from '../data/principals';

/** Performance: Memoizable Functions — collapsible section. */
const MemoFunctionSection = () => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[#111] p-6 rounded-xl border border-white/15 space-y-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-center justify-between"
      >
        <h3 className="text-white font-bold text-sm uppercase tracking-tight flex items-center gap-2">
          <Zap size={16} className="text-red-500" /> Performance: Memoizable Functions
        </h3>
        <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
          <p className="text-sm text-gray-400 leading-relaxed">
            The <C>ENTITLEMENTS</C> lookup is wrapped in a Memoizable Function to cache results in-memory, ensuring sub-second response on billion-row tables.
          </p>
          <CalloutBox title="Accepted Risk — Stale Entitlement Window" variant="amber">
            <p>
              Cache persists for the warehouse session lifetime. A revoked Okta entitlement may continue granting access until cache expires.
            </p>
            <p className="mt-2 font-semibold text-amber-300">Compensating controls:</p>
            <ul className="mt-1 space-y-1">
              <li>
                <span className="text-white">Emergency Revocation:</span>{' '}
                <code className="text-amber-300">ALTER WAREHOUSE &lt;wh&gt; SUSPEND; RESUME;</code> flushes cache immediately.
              </li>
              <li>
                <span className="text-white">Risk Register:</span> Stale window formally accepted, Data Platform Engineering named owner.
              </li>
            </ul>
          </CalloutBox>
        </div>
      )}
    </div>
  );
};

interface PolicyLogicTabProps {
  principal: Principal;
  lens: Lens;
  onNavigate?: (tabId: string) => void;
}

type Lens = 'happy' | 'failure';

const currentBranches: Branch[] = [
  { label: 'Global access', expr: "ent.access_level = 'GLOBAL'", status: 'current' },
  { label: 'Region match', expr: "ent.access_level = 'REGION' AND row.region = ent.access_value", status: 'current' },
  { label: 'Opp match', expr: "ent.access_level = 'OPPORTUNITY' AND row.opp_id = ent.access_value", status: 'current' },
  { label: 'Fallthrough', expr: 'FALSE -- fail closed', status: 'current' },
];

const plannedBranches: Branch[] = [
  { label: 'Explicit DENY', expr: "ent.effect = 'DENY' AND ...", status: 'planned', note: 'Short-circuit negation for legal holds' },
  { label: 'Time window', expr: 'CURRENT_TIMESTAMP BETWEEN ent.start_ts AND ent.end_ts', status: 'planned', note: 'Business-hours, fixed-term contractors' },
  { label: 'Residency', expr: 'row.region = CURRENT_SESSION_REGION()', status: 'planned', note: 'EU data stays EU' },
  { label: 'Break-glass audited', expr: 'IS_BREAK_GLASS_ACTIVE(CURRENT_USER) AND LOG_ACCESS(...)', status: 'planned', note: 'Emergency access with audit trail' },
];

const nullTruthRows: { oppId: string; region: string; entitlement: string; visible: boolean; reason: string }[] = [
  { oppId: 'OPP-42', region: 'EMEA', entitlement: 'OPP-42', visible: true, reason: 'opp match' },
  { oppId: 'NULL', region: 'EMEA', entitlement: 'OPP-42', visible: false, reason: "opp branch EXISTS false, region branch requires access_level='REGION'" },
  { oppId: 'OPP-42', region: 'NULL', entitlement: 'OPP-42', visible: true, reason: 'opp branch matches' },
  { oppId: 'NULL', region: 'NULL', entitlement: 'OPP-42', visible: false, reason: 'fail closed' },
  { oppId: 'OPP-99', region: 'EMEA', entitlement: 'EMEA region', visible: true, reason: 'region branch matches' },
  { oppId: 'NULL', region: 'EMEA', entitlement: 'EMEA region', visible: true, reason: 'region branch matches on region' },
];

const PolicyLogicTab = ({ principal, lens }: PolicyLogicTabProps) => {
    const [selectedUser, setSelectedUser] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    // When principal changes, auto-select the matching mockUser if human
    useEffect(() => {
      if (principal.kind === 'human') {
        const idx = mockUsers.findIndex((u) => u.name === principal.userName);
        if (idx >= 0) setSelectedUser(idx);
      }
    }, [principal]);

    const user = mockUsers[selectedUser];

  const getHighlightedBranch = (): 'null' | 'global' | 'region' | 'opportunity' | 'none' => {
    if (user.accessLevel === '(none)') return 'none';
    if (user.accessLevel === 'GLOBAL') return 'global';
    if (user.accessLevel === 'REGION') return 'region';
    if (user.accessLevel === 'OPPORTUNITY') return 'opportunity';
    return 'none';
  };
  const branch = getHighlightedBranch();
  const accessibleRows = mockRows.filter((row) => getRowAccess(user, row).allowed);

    return (
      <section id="eng-gi-policy" className="space-y-6">
        {/* ── Happy Path ── */}
        {lens === 'happy' && (
          <>
            {/* Principal context banner */}
            {principal.kind === 'service' && (
              <CalloutBox title="Service role principal" variant="amber">
                Service role — RAP evaluates role-level grants. This playground shows user-level evaluation; see Identity tab for service semantics.
              </CalloutBox>
            )}
            {principal.kind === 'agent' && (
              <CalloutBox title="Agent principal" variant="red">
                Agent principal — today runs as service role, NOT on-behalf-of user. RAP evaluation shown here is the HYPOTHETICAL post-OBO experience.
              </CalloutBox>
            )}
            {principal.kind === 'share' && (
              <CalloutBox title="Share consumer principal" variant="red">
                Share consumer — RAP does not execute. Data access is driven by the share's view SQL.
              </CalloutBox>
            )}

            <p className="text-sm text-gray-400 leading-relaxed">
              The Row Access Policy is the single SQL function that evaluates every query — it
              reads the caller&#39;s entitlements and the table&#39;s security grain to decide which rows
              are visible. Choose a persona below to see which CASE branch fires and what rows they can access.
            </p>
            {/* Two-column interactive area */}
            <div id="eng-gi-playground" className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
              {/* Left column: user selector + entitlement + SQL (sticky) */}
              <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
                {/* Identity selector */}
                <div className="bg-[#111] border border-white/20 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      RAP Playground
                    </p>
                    <div className="relative">
                      <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 bg-[#0a0a0a] text-sm hover:bg-white/5 transition-colors"
                      >
                        <User size={14} className="text-blue-400" />
                        <span className="text-white font-semibold">{user.name}</span>
                        <ChevronDown size={14} className="text-gray-500" />
                      </button>
                      {showDropdown && (
                        <div className="absolute right-0 top-full mt-1 w-80 bg-[#0a0a0a] border border-white/20 rounded-xl shadow-2xl z-10 overflow-hidden">
                          {mockUsers.map((u, i) => (
                            <button
                              key={u.name}
                              onClick={() => {
                                setSelectedUser(i);
                                setShowDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/15 last:border-b-0 ${
                                i === selectedUser ? 'bg-blue-600/10' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-white text-xs font-semibold">{u.name}</span>
                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                                  u.accessLevel === 'GLOBAL' ? 'bg-amber-600/10 text-amber-400' :
                                  u.accessLevel === 'REGION' ? 'bg-blue-600/10 text-blue-400' :
                                  u.accessLevel === 'OPPORTUNITY' ? 'bg-emerald-600/10 text-emerald-400' :
                                  'bg-red-600/10 text-red-400'
                                }`}>
                                  {u.accessLevel}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-500 mt-0.5">{u.desc}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Entitlement badge strip */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Entitlement:</span>
                    <span className={`text-[10px] font-mono px-3 py-1 rounded-lg border ${
                      user.accessLevel === 'GLOBAL' ? 'bg-amber-600/10 border-amber-600/40 text-amber-300' :
                      user.accessLevel === 'REGION' ? 'bg-blue-600/10 border-blue-600/40 text-blue-300' :
                      user.accessLevel === 'OPPORTUNITY' ? 'bg-emerald-600/10 border-emerald-600/40 text-emerald-300' :
                      'bg-red-600/10 border-red-600/40 text-red-300'
                    }`}>
                      {user.accessLevel === '(none)' ? 'NO ENTITLEMENT' : `${user.accessLevel} = ${user.accessValue}`}
                    </span>
                    <span className="text-[10px] text-gray-500">{user.desc}</span>
                  </div>
                </div>

                {/* SQL block with highlighted branch */}
                <div className="bg-[#0f0f0f] border border-white/20 rounded-xl p-5 font-mono text-[11px] shadow-2xl">
                  <pre className="text-gray-400 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    <span className="text-blue-400">CREATE OR REPLACE ROW ACCESS POLICY</span>{' '}<C>unified_sales_policy</C>{'\n'}
                    {'  '}<span className="text-blue-400">AS</span> (row_opp_id <span className="text-emerald-300">VARCHAR</span>, row_region <span className="text-emerald-300">VARCHAR</span>){'\n'}
                    {'  '}<span className="text-blue-400">RETURNS BOOLEAN</span> -{'>'}{'\n'}
                    {'    '}<span className="text-gray-500">-- Fail closed: NULL security attributes deny access.</span>{'\n'}
                    {'    '}<span className="text-pink-500">CASE</span>{'\n'}
                    <span className={`transition-all duration-300 ${branch === 'null' ? 'bg-red-600/20 text-white' : ''}`}>
                    {'      '}<span className="text-pink-500">WHEN</span> row_opp_id <span className="text-blue-400">IS NULL AND</span> row_region <span className="text-blue-400">IS NULL THEN</span> <C>FALSE</C>
                    </span>{'\n'}
                    {'      '}<span className="text-pink-500">ELSE</span>{'\n'}
                    {'        '}<span className="text-blue-400">EXISTS</span> ({'\n'}
                    {'          '}<span className="text-blue-400">SELECT</span> 1 <span className="text-blue-400">FROM</span> governance_db.security.entitlements e{'\n'}
                    {'          '}<span className="text-blue-400">WHERE</span> e.user_name = <C>CURRENT_USER()</C>{'\n'}
                    <span className={`transition-all duration-300 ${branch === 'none' ? 'bg-red-600/20' : ''}`}>
                    {'          '}<span className="text-blue-400">AND</span> ({'\n'}
                    </span>
                    <span className={`transition-all duration-300 ${branch === 'global' ? 'bg-amber-600/20 text-white' : ''}`}>
                    {'            '}(e.access_level = <span className="text-amber-300">&apos;<C>GLOBAL</C>&apos;</span>)
                    </span>{'\n'}
                    {'            '}<span className="text-blue-400">OR</span>{'\n'}
                    <span className={`transition-all duration-300 ${branch === 'region' ? 'bg-blue-600/20 text-white' : ''}`}>
                    {'            '}(e.access_level = <span className="text-amber-300">&apos;<C>REGION</C>&apos;</span> <span className="text-blue-400">AND</span> e.access_value = row_region)
                    </span>{'\n'}
                    {'            '}<span className="text-blue-400">OR</span>{'\n'}
                    <span className={`transition-all duration-300 ${branch === 'opportunity' ? 'bg-emerald-600/20 text-white' : ''}`}>
                    {'            '}(e.access_level = <span className="text-amber-300">&apos;<C>OPPORTUNITY</C>&apos;</span> <span className="text-blue-400">AND</span> e.access_value = row_opp_id)
                    </span>{'\n'}
                    {'          '}){'\n'}
                    {'        '}){'\n'}
                    {'    '}<span className="text-pink-500">END</span>;
                  </pre>
                </div>
              </div>

              {/* Right column: row-level access result table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Row-Level Access Result
                  </p>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    accessibleRows.length > 0 ? 'bg-emerald-600/10 border-emerald-600/40 text-emerald-400' : 'bg-red-600/10 border-red-600/40 text-red-400'
                  }`}>
                    {accessibleRows.length} of {mockRows.length} rows visible
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-white/20 bg-[#0f0f0f]">
                  <table className="w-full text-left text-[11px] text-gray-400">
                    <thead className="bg-white/5 text-white">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">OPP_ID</th>
                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">REGION</th>
                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">Owner</th>
                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">Access</th>
                        <th className="px-4 py-2.5 font-semibold uppercase tracking-wider">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {mockRows.map((row, i) => {
                        const access = getRowAccess(user, row);
                        return (
                          <tr key={i} className={`transition-all duration-300 ${access.allowed ? '' : 'opacity-30'}`}>
                            <td className="px-4 py-2.5 font-mono">{row.opp_id ?? <span className="text-red-400">NULL</span>}</td>
                            <td className="px-4 py-2.5">{row.region ?? <span className="text-red-400">NULL</span>}</td>
                            <td className="px-4 py-2.5">{row.amount}</td>
                            <td className="px-4 py-2.5">{row.owner}</td>
                            <td className="px-4 py-2.5">
                              {access.allowed ? (
                                <span className="text-emerald-400 font-semibold">✓</span>
                              ) : (
                                <span className="text-red-400 font-semibold">✗</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-[10px]">{access.reason}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Full-width callouts below the two-column grid */}
            <div id="eng-gi-callouts" className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CalloutBox title="Fail-Closed Null Guard" variant="red">
                <p>
                  The <C>CASE WHEN ... IS NULL THEN FALSE</C> block denies all access when security attribute columns are <C>NULL</C>. This is the actual enforcement backstop — not tag inheritance alone.
                </p>
              </CalloutBox>
              <CalloutBox title="CI/CD Reinforcement" variant="blue">
                <p>
                  dbt schema tests assert required security columns are non-null at build time. RAP null guard = runtime failsafe; dbt test = build-time gate.
                </p>
              </CalloutBox>
            </div>

            {/* Memoizable functions */}
            <MemoFunctionSection />

            {/* Roadmap teaser — compact version of PolicyBranchRoadmap */}
            <div className="bg-[#111] p-6 rounded-xl border border-white/15 space-y-3">
              <h3 className="text-white font-bold text-sm uppercase tracking-tight">
                Roadmap — what&apos;s coming to this CASE
              </h3>
              <PolicyBranchRoadmap current={[]} planned={plannedBranches} />
              <p className="text-[10px] text-gray-500 italic mt-2">
                See Failure Modes for the gap analysis that drives these additions.
              </p>
            </div>
          </>
        )}

        {/* ── Failure Modes ── */}
        {lens === 'failure' && (
          <>
            <p className="text-sm text-gray-400 leading-relaxed">
              Edge cases in the RAP CASE logic where partial-null rows, join surfaces, or missing
              primitives create gaps between intended and actual access control.
            </p>

            {/* Failure mode cards — 2-col grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FailureModeCard
                title="Partial-null row falls through EXISTS"
                severity="high"
                trigger={
                  <>
                    Row in <C>sales.opps</C> has <C>region = &#39;EMEA&#39;</C> but <C>opp_id = NULL</C>.
                    User Alice has entitlement on <C>OPP_ID=&#39;OPP-42&#39;</C> only.
                  </>
                }
                blastRadius={
                  <>
                    RAP CASE reaches the OPP branch: <C>EXISTS (SELECT 1 FROM entitlements WHERE user = CURRENT_USER AND opp_id = row.opp_id)</C>.{' '}
                    <C>NULL = NULL</C> is UNKNOWN, EXISTS returns false, row is correctly denied.
                    BUT: if the CASE order is region-first with a fallthrough, the row may be
                    visible under the region branch — and partial-null rows shift depending on CASE ordering.
                  </>
                }
                control={
                  <>
                    Explicit NULL handling per branch. Add <C>row.opp_id IS NOT NULL AND ...</C> to
                    opp-level checks, and <C>row.opp_id IS NULL AND row.region = ent.region</C> to
                    region-fallback. Unit tests per null combination.
                  </>
                }
                owner="Data Platform Guild"
              />
              <FailureModeCard
                title="JOIN amplification — RAP evaluated per base table, not result"
                severity="medium"
                trigger={
                  <>
                    Query joins <C>sales.opps</C> + <C>sales.products</C>. Both tables have RAP.
                    Joined result contains rows whose combination is not individually authorized.
                  </>
                }
                blastRadius={
                  <>
                    RAP enforces access to each source row, but the join surface may expose
                    relationships the user could not query via either table alone. E.g.
                    product-to-opportunity linkages reveal which products are attached to
                    opportunities the user cannot see.
                  </>
                }
                control={
                  <>
                    RAP on views that encode the intended join semantics. Avoid <C>CURRENT_ROLE</C>{' '}
                    bypass via SECURE views. Monitor join patterns in <C>access_history</C>.
                  </>
                }
                owner="Data Stewards"
              />
              <FailureModeCard
                title="No DENY, no time-of-day, no residency"
                severity="high"
                trigger={
                  <>
                    Compliance requirement: &#34;Contractors cannot access production data outside
                    business hours&#34; OR &#34;EU rows must not leave EU region.&#34;
                  </>
                }
                blastRadius={
                  <>
                    Current RAP CASE only supports ALLOW branches. There is no DENY primitive,
                    no time-of-day gate, no residency enforcement. Out-of-hours or cross-region
                    access relies entirely on network controls + after-the-fact detection.
                  </>
                }
                control={
                  <>
                    Compensating: warehouse-level network policies + session tags + query history
                    review. Roadmap: explicit deny branches + <C>TIME_OF_DAY_CHECK</C> +{' '}
                    <C>REGION_CHECK</C> functions in RAP body. See PolicyBranchRoadmap below.
                  </>
                }
                owner="Governance Platform"
              />
            </div>

            {/* Policy branch roadmap */}
            <div className="bg-[#111] p-6 rounded-xl border border-white/15 space-y-3">
              <h3 className="text-white font-bold text-sm uppercase tracking-tight">
                Policy CASE — current branches + roadmap
              </h3>
              <PolicyBranchRoadmap current={currentBranches} planned={plannedBranches} />
            </div>

            {/* Partial-null truth table */}
            <CalloutBox title="Partial-null truth table" variant="amber">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] text-gray-400 mt-2">
                  <thead className="text-white">
                    <tr>
                      <th className="px-3 py-2 font-semibold uppercase tracking-wider">opp_id</th>
                      <th className="px-3 py-2 font-semibold uppercase tracking-wider">region</th>
                      <th className="px-3 py-2 font-semibold uppercase tracking-wider">entitlement</th>
                      <th className="px-3 py-2 font-semibold uppercase tracking-wider">visible?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {nullTruthRows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono">
                          {r.oppId === 'NULL' ? <span className="text-red-400">NULL</span> : r.oppId}
                        </td>
                        <td className="px-3 py-2">
                          {r.region === 'NULL' ? <span className="text-red-400">NULL</span> : r.region}
                        </td>
                        <td className="px-3 py-2 font-mono">{r.entitlement}</td>
                        <td className="px-3 py-2">
                          {r.visible ? (
                            <span className="text-emerald-400 font-semibold">✓ visible</span>
                          ) : (
                            <span className="text-red-400 font-semibold">✗ hidden</span>
                          )}
                          <span className="text-gray-600 ml-2">({r.reason})</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-amber-400/70 mt-3">
                Unit tests must cover all 8 null combinations per user archetype.
              </p>
            </CalloutBox>
          </>
        )}
      </section>
    );
};

export default PolicyLogicTab;
