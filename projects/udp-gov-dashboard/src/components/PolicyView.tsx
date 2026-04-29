import React, { useState } from 'react';
import {
  Code,
  Zap,
  User,
  ChevronDown,
} from 'lucide-react';
import {
  SectionHeader,
  CalloutBox,
  C,
} from './primitives';

interface MockUser {
  name: string;
  accessLevel: string;
  accessValue: string;
  desc: string;
}

const mockUsers: MockUser[] = [
  { name: 'alice@cs.com', accessLevel: 'REGION', accessValue: 'West', desc: 'Regional sales lead — sees West region only' },
  { name: 'bob@cs.com', accessLevel: 'OPPORTUNITY', accessValue: 'OPP-001', desc: 'Account executive — sees their own opportunities' },
  { name: 'charlie@cs.com', accessLevel: 'GLOBAL', accessValue: '*', desc: 'VP of Sales — sees all data' },
  { name: 'eve@cs.com', accessLevel: '(none)', accessValue: '—', desc: 'No entitlements — denied by null guard' },
];

const mockRows = [
  { opp_id: 'OPP-001', region: 'West', amount: '$120K', owner: 'Bob' },
  { opp_id: 'OPP-002', region: 'West', amount: '$85K', owner: 'Dana' },
  { opp_id: 'OPP-003', region: 'East', amount: '$210K', owner: 'Fran' },
  { opp_id: 'OPP-004', region: 'Central', amount: '$45K', owner: 'Greg' },
  { opp_id: 'OPP-005', region: 'West', amount: '$320K', owner: 'Alice' },
  { opp_id: null, region: null, amount: '$50K', owner: 'System' },
];

function getRowAccess(user: MockUser, row: typeof mockRows[0]): { allowed: boolean; reason: string } {
  if (row.opp_id === null && row.region === null) {
    return { allowed: false, reason: 'Null guard — both security columns are NULL → FALSE' };
  }
  if (user.accessLevel === '(none)') {
    return { allowed: false, reason: 'No entitlement record found for this user' };
  }
  if (user.accessLevel === 'GLOBAL') {
    return { allowed: true, reason: 'GLOBAL access — all rows visible' };
  }
  if (user.accessLevel === 'REGION') {
    if (row.region === user.accessValue) {
      return { allowed: true, reason: `REGION match: ${row.region} = ${user.accessValue}` };
    }
    return { allowed: false, reason: `REGION mismatch: ${row.region} ≠ ${user.accessValue}` };
  }
  if (user.accessLevel === 'OPPORTUNITY') {
    if (row.opp_id === user.accessValue) {
      return { allowed: true, reason: `OPPORTUNITY match: ${row.opp_id} = ${user.accessValue}` };
    }
    return { allowed: false, reason: `OPPORTUNITY mismatch: ${row.opp_id} ≠ ${user.accessValue}` };
  }
  return { allowed: false, reason: 'Unknown access level' };
}

const PolicyView = () => {
  const [selectedUser, setSelectedUser] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
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
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="Hierarchical Provisioning & Policy Logic"
        subtitle="A single SQL policy must correctly handle global admins, regional leads, and individual contributors — without becoming unmaintainable. Trace the RAP logic for each persona."
        icon={Code}
        badge="Section 5"
      />

      {/* Two-column interactive area */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
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
              {'            '}(e.access_level = <span className="text-amber-300">'<C>GLOBAL</C>'</span>)
              </span>{'\n'}
              {'            '}<span className="text-blue-400">OR</span>{'\n'}
              <span className={`transition-all duration-300 ${branch === 'region' ? 'bg-blue-600/20 text-white' : ''}`}>
              {'            '}(e.access_level = <span className="text-amber-300">'<C>REGION</C>'</span> <span className="text-blue-400">AND</span> e.access_value = row_region)
              </span>{'\n'}
              {'            '}<span className="text-blue-400">OR</span>{'\n'}
              <span className={`transition-all duration-300 ${branch === 'opportunity' ? 'bg-emerald-600/20 text-white' : ''}`}>
              {'            '}(e.access_level = <span className="text-amber-300">'<C>OPPORTUNITY</C>'</span> <span className="text-blue-400">AND</span> e.access_value = row_opp_id)
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </div>
  );
};

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

export default PolicyView;
