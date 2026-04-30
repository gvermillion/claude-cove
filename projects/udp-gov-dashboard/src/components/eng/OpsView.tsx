import React from 'react';
import {
  Settings,
  UserCheck,
  GitBranch,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import {
  SectionHeader,
  DataTable,
  CalloutBox,
  C,
} from '../primitives';

const ROADMAP_ITEMS: { phase: string; title: string; items: string[]; status: 'done' | 'active' | 'planned' }[] = [
  {
    phase: 'Phase 1',
    title: 'Foundation (SALES domain)',
    status: 'done',
    items: [
      'ENTITLEMENTS table + ELT from Okta & Salesforce',
      'RAP for SALES__GRANULAR, SALES__BY_REGION, SALES__GLOBAL',
      'Sandbox provisioning via Terraform + auto-drop task',
      'Audit stream → AUDIT_LOG + GLOBAL alert',
    ],
  },
  {
    phase: 'Phase 2',
    title: 'Multi-Domain Expansion',
    status: 'active',
    items: [
      'Onboard THREAT domain — assign steward, build ELT',
      'Onboard FINANCE domain — assign steward, build ELT',
      'PII masking policy rollout to HR__INDIVIDUAL',
      'Memoizable function tuning for cross-domain RAPs',
    ],
  },
  {
    phase: 'Phase 3',
    title: 'Cross-Platform PEPs',
    status: 'planned',
    items: [
      'AWS S3 Lake Formation mirror + row filter (Recipe A)',
      'Bedrock Agent guardrail integration (Recipe B)',
      'Workday → PDP source for HR ownership (Recipe C)',
      'Automated PEP health-check dashboard',
    ],
  },
];

const OpsView = () => {
  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="Roadmap & Operational Setup"
        subtitle="Governance rollout phases, domain stewardship requirements, and Terraform-enforced provisioning controls."
        icon={Settings}
        badge="Roadmap & Ops"
      />

      {/* Narrative connector */}
      <p className="text-xs text-gray-500 italic -mt-4">
        Operationalizing the architecture from the preceding sections. Phased rollout, domain stewardship, and Terraform-enforced provisioning.
      </p>

      {/* Rollout Roadmap */}
      <div id="eng-ops-roadmap" className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <GitBranch size={16} className="text-red-500" /> Rollout Roadmap
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ROADMAP_ITEMS.map((phase) => {
            const borderColor =
              phase.status === 'done' ? 'border-emerald-600/40' :
              phase.status === 'active' ? 'border-amber-600/40' :
              'border-white/15';
            const bgColor =
              phase.status === 'done' ? 'bg-emerald-600/5' :
              phase.status === 'active' ? 'bg-amber-600/5' :
              'bg-white/[0.02]';
            const badgeColor =
              phase.status === 'done' ? 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30' :
              phase.status === 'active' ? 'bg-amber-600/20 text-amber-400 border-amber-600/30' :
              'bg-white/10 text-gray-400 border-white/20';
            const StatusIcon = phase.status === 'done' ? CheckCircle2 : Circle;
            const iconColor =
              phase.status === 'done' ? 'text-emerald-500' :
              phase.status === 'active' ? 'text-amber-500' :
              'text-gray-600';

            return (
              <div key={phase.phase} className={`rounded-xl border ${borderColor} ${bgColor} p-5 space-y-3`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${badgeColor}`}>
                    {phase.phase}
                  </span>
                  <StatusIcon size={14} className={iconColor} />
                </div>
                <p className="text-white font-bold text-sm">{phase.title}</p>
                <div className="space-y-1.5">
                  {phase.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`shrink-0 mt-1 w-1.5 h-1.5 rounded-full ${
                        phase.status === 'done' ? 'bg-emerald-500' :
                        phase.status === 'active' ? 'bg-amber-500' :
                        'bg-gray-600'
                      }`} />
                      <span className="text-[11px] text-gray-400 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Domain Steward */}
      <div id="eng-ops-stewards" className="bg-[#111] p-8 rounded-xl border border-white/20 space-y-6">
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

      {/* The Bottom Line */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-8 space-y-3 shadow-xl shadow-emerald-950/10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
          The Bottom Line
        </p>
        <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
          Governance rolls out in phases, enforced by Terraform. No domain goes live without an accountable steward.
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Phase 1 (SALES) is complete. Phase 2 adds THREAT and FINANCE domains.
          Phase 3 extends enforcement to AWS and Bedrock. Every phase requires a
          registered Domain Data Steward before schemas can be provisioned.
        </p>
      </div>
    </div>
  );
};

export default OpsView;
