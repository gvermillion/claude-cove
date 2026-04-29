// src/components/exec/ExecRoadmapView.tsx
import React, { useState } from 'react';
import { Settings, CheckCircle2, ChevronDown } from 'lucide-react';
import {
  SectionHeader,
  DataTable,
  CalloutBox,
  C,
} from '../primitives';

const ExecRoadmapView: React.FC = () => {
  const [expandedPhase, setExpandedPhase] = useState<
    'phase1' | 'phase2' | null
  >('phase1');

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <SectionHeader
        title="Roadmap"
        subtitle="What ships before UDP Go-Live, what completes at Go-Live, and who maintains it after — without adding a single new team."
        icon={Settings}
      />

      {/* Phase 1 / 2 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className={`p-6 bg-amber-500/10 border border-amber-500/40 rounded-xl space-y-4 cursor-pointer transition-all duration-200 ${
            expandedPhase === 'phase1' ? '' : 'opacity-60 hover:opacity-100'
          }`}
          onClick={() =>
            setExpandedPhase(expandedPhase === 'phase1' ? null : 'phase1')
          }
        >
          <div className="flex items-center justify-between">
            <h4 className="text-amber-500 font-bold uppercase tracking-widest text-xs">
              Phase 1 — Pre-UDP Go-Live (Bootstrap)
            </h4>
            <ChevronDown
              size={14}
              className={`text-amber-500 transition-transform duration-200 ${
                expandedPhase === 'phase1' ? 'rotate-180' : ''
              }`}
            />
          </div>
          {expandedPhase === 'phase1' && (
            <ul className="text-xs space-y-3 text-gray-400 animate-in fade-in slide-in-from-top-2 duration-300">
              {[
                {
                  label: 'Curated Seed Data',
                  desc: 'Initial access matrix loaded from a validated seed file.',
                },
                {
                  label: 'Pre-Ingestion Review',
                  desc: 'IAM team reviews proposed changes before they take effect.',
                },
                {
                  label: 'Direct Policy Application',
                  desc: 'Access policies applied directly to published data products.',
                },
                {
                  label: 'Sandbox Write Enabled',
                  desc: 'Developers can iterate; distribution stays under manual review.',
                },
              ].map(({ label, desc }) => (
                <li key={label} className="flex items-start gap-2">
                  <CheckCircle2
                    size={12}
                    className="text-amber-500 mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="text-white font-semibold">{label}:</span>{' '}
                    {desc}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className={`p-6 bg-emerald-500/10 border border-emerald-500/40 rounded-xl space-y-4 cursor-pointer transition-all duration-200 ${
            expandedPhase === 'phase2' ? '' : 'opacity-60 hover:opacity-100'
          }`}
          onClick={() =>
            setExpandedPhase(expandedPhase === 'phase2' ? null : 'phase2')
          }
        >
          <div className="flex items-center justify-between">
            <h4 className="text-emerald-500 font-bold uppercase tracking-widest text-xs">
              Phase 2 — UDP Go-Live (Full Automation)
            </h4>
            <ChevronDown
              size={14}
              className={`text-emerald-500 transition-transform duration-200 ${
                expandedPhase === 'phase2' ? 'rotate-180' : ''
              }`}
            />
          </div>
          {expandedPhase === 'phase2' && (
            <ul className="text-xs space-y-3 text-gray-400 animate-in fade-in slide-in-from-top-2 duration-300">
              {[
                {
                  label: 'Automated Identity Sync',
                  desc: 'Okta and Salesforce feed the central rule book directly — no manual updates.',
                },
                {
                  label: 'Universal Tag Inheritance',
                  desc: 'Every new dataset inherits its protection automatically.',
                },
                {
                  label: 'AI Copilot Skills',
                  desc: 'Developers get routing and sharing guidance inline — no governance memorization required.',
                },
              ].map(({ label, desc }) => (
                <li key={label} className="flex items-start gap-2">
                  <CheckCircle2
                    size={12}
                    className="text-emerald-500 mt-0.5 shrink-0"
                  />
                  <div>
                    <span className="text-white font-semibold">{label}:</span>{' '}
                    {desc}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Day 2 Ops */}
      <section className="space-y-4 pt-4">
        <h3 className="text-lg font-bold text-white uppercase tracking-tight border-b border-white/20 pb-2">
          Day 2 Ops: Governance Maps to Existing Roles
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed max-w-4xl">
          Every governance maintenance task maps onto an organizational
          function that already exists. No new teams, no new headcount —
          governance is absorbed by the people who already own the underlying
          systems.
        </p>
        <DataTable
          columns={[
            'Domain',
            'Existing Function',
            'What They Already Do',
            'Governance Extension',
          ]}
          data={[
            [
              'Identity',
              'IT / IAM',
              'Manages Okta groups and SSO provisioning',
              'Maintains identity inputs that feed the rule book',
            ],
            [
              'Record Ownership',
              'Domain Data Stewards',
              'Manages Salesforce team/owner records',
              'Maintains record-level ownership that drives row-level access',
            ],
            [
              'Infrastructure',
              'Data Platform Engineering',
              'Runs pipelines and monitors data freshness',
              'Maintains rule-book promotion and tag consistency',
            ],
            [
              'Auditing',
              'SecOps',
              'Audits access logs and compliance controls',
              'Reviews the access matrix and governance audit trail',
            ],
          ]}
        />
        <CalloutBox title="Zero New Headcount" variant="emerald">
          <p>
            No new teams or headcount required. Every governance maintenance
            task maps to an existing operational role. The central{' '}
            <C>ENTITLEMENTS</C> matrix is maintained by the same people who
            already maintain the source systems that feed it.
          </p>
        </CalloutBox>
      </section>
    </div>
  );
};

export default ExecRoadmapView;
