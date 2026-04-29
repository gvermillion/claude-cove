import React, { useState } from 'react';
import {
  Settings,
  CheckCircle2,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import {
  SectionHeader,
  DataTable,
  CalloutBox,
  C,
} from './primitives';

const OpsView = () => {
  const [expandedPhase, setExpandedPhase] = useState<'phase1' | 'phase2' | null>('phase1');

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="Implementation Phasing"
        subtitle="Governance layers onto the existing UDP investment. This section maps what ships before UDP Go-Live and what completes at Go-Live — and who owns what afterward."
        icon={Settings}
        badge="Sections 9 & 10"
      />

      {/* Phases — collapsible */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-6 bg-amber-500/10 border border-amber-500/40 rounded-xl space-y-4 cursor-pointer transition-all duration-200 ${expandedPhase === 'phase1' ? '' : 'opacity-60 hover:opacity-100'}`}
          onClick={() => setExpandedPhase(expandedPhase === 'phase1' ? null : 'phase1')}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-amber-500 font-bold uppercase tracking-widest text-xs">
              Phase 1 — Pre-UDP Go-Live (Bootstrap)
            </h4>
            <ChevronDown size={14} className={`text-amber-500 transition-transform duration-200 ${expandedPhase === 'phase1' ? 'rotate-180' : ''}`} />
          </div>
          {expandedPhase === 'phase1' && (
            <ul className="text-xs space-y-3 text-gray-400 animate-in fade-in slide-in-from-top-2 duration-300">
              {[
                { label: 'Structured Seed File', desc: 'Entitlements loaded via validated JSON seed file with schema enforcement.' },
                { label: 'Pre-Ingestion Review', desc: 'IAM team reviews proposed diffs via stored procedure before committing.' },
                { label: 'Direct RAP Application', desc: 'RAPs applied directly to Gold Views.' },
                { label: 'Sandbox Write Enabled', desc: 'Write-access enabled; distribution restricted to manual review.' },
              ].map(({ label, desc }) => (
                <li key={label} className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-white font-semibold">{label}:</span> {desc}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={`p-6 bg-emerald-500/10 border border-emerald-500/40 rounded-xl space-y-4 cursor-pointer transition-all duration-200 ${expandedPhase === 'phase2' ? '' : 'opacity-60 hover:opacity-100'}`}
          onClick={() => setExpandedPhase(expandedPhase === 'phase2' ? null : 'phase2')}
        >
          <div className="flex items-center justify-between">
            <h4 className="text-emerald-500 font-bold uppercase tracking-widest text-xs">
              Phase 2 — UDP Go-Live (Full Automation)
            </h4>
            <ChevronDown size={14} className={`text-emerald-500 transition-transform duration-200 ${expandedPhase === 'phase2' ? 'rotate-180' : ''}`} />
          </div>
          {expandedPhase === 'phase2' && (
            <ul className="text-xs space-y-3 text-gray-400 animate-in fade-in slide-in-from-top-2 duration-300">
              {[
                { label: 'Automated ELT Pipelines', desc: <>Okta/Salesforce ELT writes to <C>ENTITLEMENTS_STAGING</C>; validated promotion moves records to live table.</> },
                { label: 'Schema-Level Tag Inheritance', desc: 'Full tag propagation — all objects inherit protection automatically.' },
                { label: 'Native Cortex Copilot Skills', desc: 'Skills configured for routing and sharing assistance in developer workflow.' },
              ].map(({ label, desc }, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-white font-semibold">{label}:</span> {desc}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Federated Governance — reframed as enterprise responsibility */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-bold text-white uppercase tracking-tight border-b border-white/20 pb-2">
          §10 — Day 2 Ops: Governance Maps to Existing Roles
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
          Every governance maintenance task maps onto an organizational function that already exists.
          No new teams, no new headcount — governance is absorbed by the people who already own the underlying systems.
        </p>
        <DataTable
          columns={['Domain', 'Existing Function', 'What They Already Do', 'Governance Extension']}
          data={[
            ['Identity', 'IT / IAM', 'Manages Okta groups and SSO provisioning', 'Maintains identity inputs that feed ENTITLEMENTS'],
            ['Record Ownership', 'Domain Data Stewards', 'Manages Salesforce team/owner records', 'Maintains record-level ownership that drives row-level access'],
            ['Infrastructure', 'Data Platform Engineering', 'Runs pipelines and monitors data freshness', 'Maintains ENTITLEMENTS promotion procedure and tag consistency'],
            ['Auditing', 'SecOps', 'Audits access logs and compliance controls', 'Reviews ENTITLEMENTS matrix and governance audit trail'],
          ]}
        />
        <CalloutBox title="Zero New Headcount" variant="emerald">
          <p>
            No new teams or headcount required. Every governance maintenance task maps to an existing operational role.
            The <C>ENTITLEMENTS</C> table is maintained by the same people who already maintain the source systems that feed it.
          </p>
        </CalloutBox>
      </div>

      {/* Domain Steward */}
      <div className="bg-[#111] p-8 rounded-xl border border-white/20 space-y-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-tight flex items-center gap-2">
          <UserCheck size={16} className="text-red-500" /> Domain Steward Requirement
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          Each value in the <C>DATA_DOMAIN</C> tag taxonomy must have
          a designated{' '}
          <span className="text-white font-semibold">Domain Data Steward registered in <C>DOMAIN_STEWARDS</C></span>{' '}
          before that domain's governed schemas can be created.
        </p>

        <DataTable
          columns={['Domain', 'Steward Role', 'Responsible Team']}
          data={[
            ['SALES', 'Sales Ops', 'Salesforce Team/Owner maintenance'],
            ['THREAT', '⚠ TBD — required before onboarding', '—'],
            ['FINANCE', '⚠ TBD — required before onboarding', '—'],
          ]}
        />

        <CalloutBox title="Terraform Enforcement" variant="red">
          <p>
            The Terraform module that provisions new governed schemas{' '}
            <span className="text-white font-semibold">validates that a steward record exists</span>{' '}
            for the target domain. If no steward is registered, schema creation fails with an actionable error.
          </p>
        </CalloutBox>
      </div>
    </div>
  );
};

export default OpsView;
