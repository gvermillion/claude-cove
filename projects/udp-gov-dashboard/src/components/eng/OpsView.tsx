import React from 'react';
import {
  Settings,
  UserCheck,
} from 'lucide-react';
import {
  SectionHeader,
  DataTable,
  CalloutBox,
  C,
} from '../primitives';

const OpsView = () => {
  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="Operational Setup"
        subtitle="Domain stewardship requirements and Terraform-enforced provisioning controls."
        icon={Settings}
        badge="Section 10"
      />

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
