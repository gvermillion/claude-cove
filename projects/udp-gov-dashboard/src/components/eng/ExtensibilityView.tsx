import React, { useState } from 'react';
import {
  Globe,
  Database,
  Network,
  UserCheck,
} from 'lucide-react';
import {
  SectionHeader,
  CalloutBox,
  StepSidebar,
  DetailPanel,
  PrevNextNav,
  C,
} from '../primitives';
import { HubSpokeDiagram } from '../diagrams';

/* ------------------------------------------------------------------ */
/*  "Adding a New PEP" walkthrough steps                               */
/* ------------------------------------------------------------------ */

const newPepSteps = [
  {
    label: 'Mirror ENTITLEMENTS',
    color: 'blue',
    title: 'Step 1 — Mirror ENTITLEMENTS',
    body: (
      <>
        <p>Create a read replica or API endpoint so the new platform can query <C>ENTITLEMENTS</C>.</p>
        <p className="mt-2">Options: S3 parquet mirror (batch), Snowflake External API (real-time), or a lightweight REST proxy. The schema is identical regardless of transport.</p>
      </>
    ),
  },
  {
    label: 'Implement Lookup',
    color: 'emerald',
    title: 'Step 2 — Implement Lookup',
    body: (
      <>
        <p>Add the <C>ENTITLEMENTS</C> lookup to the platform's policy/authorization layer.</p>
        <p className="mt-2">The lookup resolves the caller's identity to entitled data domains, sensitivity levels, and regions. This is the only integration code required — typically 10–30 lines.</p>
      </>
    ),
  },
  {
    label: 'Done',
    color: 'emerald',
    title: 'Step 3 — Done',
    body: (
      <>
        <p>Existing entitlements apply immediately. Every user's access grants propagate to the new platform without any new mappings or logic.</p>
        <p className="mt-2">When IT/IAM updates an Okta group or a Domain Steward changes a Salesforce ownership record, the new PEP inherits those changes automatically at the next sync cycle.</p>
      </>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  "Adding a New PDP Source" walkthrough steps                        */
/* ------------------------------------------------------------------ */

const newPdpSteps = [
  {
    label: 'Map Identity',
    color: 'amber',
    title: 'Step 1 — Map Identity',
    body: (
      <>
        <p>Define how the new source's identity model maps to <C>ENTITLEMENTS</C> columns (<C>USER_ID</C>, <C>DATA_DOMAIN</C>, <C>REGION</C>).</p>
        <p className="mt-2">This is a design decision, not code. Document which field in the source system corresponds to each ENTITLEMENTS column.</p>
      </>
    ),
  },
  {
    label: 'Build ELT',
    color: 'emerald',
    title: 'Step 2 — Build ELT',
    body: (
      <>
        <p>Write to <C>ENTITLEMENTS_STAGING</C> with schema validation. The promotion procedure validates types, checks for orphan references, and rejects malformed rows before merging to the live table.</p>
        <p className="mt-2">Standard ELT pattern — no custom framework. The same promotion stored procedure handles all sources.</p>
      </>
    ),
  },
  {
    label: 'Done',
    color: 'emerald',
    title: 'Step 3 — Done',
    body: (
      <>
        <p>All existing PEPs automatically enforce the new entitlements. No changes to Snowflake RAPs, S3 Lake Formation policies, or Bedrock guardrails.</p>
        <p className="mt-2">The new PDP source's entitlements are indistinguishable from existing ones — every enforcement point reads the same unified table.</p>
      </>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ExtensibilityView = () => {
  const [pepStep, setPepStep] = useState(0);
  const [pdpStep, setPdpStep] = useState(0);

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="Cross-Platform Extensibility"
        subtitle="CrowdStrike's data estate spans Snowflake, AWS S3, and Bedrock AI agents. This section proves that governance is a platform service, not a vendor-specific feature — and shows how to extend it."
        icon={Globe}
        badge="Section 8"
      />

      {/* ── Hub-and-Spoke Diagram ── */}
      <HubSpokeDiagram mode="eng" />

      {/* ── Adding a New PEP walkthrough ── */}
      <div className="bg-[#111] border border-white/20 rounded-xl p-8 space-y-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-tight">
          Adding a New Enforcement Point (PEP)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          <div>
            <StepSidebar
              steps={newPepSteps.map((s) => ({ label: s.label, color: s.color }))}
              activeStep={pepStep}
              onStepClick={setPepStep}
            />
            <PrevNextNav
              current={pepStep}
              total={newPepSteps.length}
              onPrev={() => setPepStep((s) => Math.max(0, s - 1))}
              onNext={() => setPepStep((s) => Math.min(newPepSteps.length - 1, s + 1))}
            />
          </div>
          <DetailPanel activeKey={pepStep}>
            <div className="p-4 rounded-xl border border-white/20 bg-white/[0.03] space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-white">{newPepSteps[pepStep].title}</p>
              <div className="text-xs text-gray-400 leading-relaxed">{newPepSteps[pepStep].body}</div>
            </div>
          </DetailPanel>
        </div>
      </div>

      {/* ── Adding a New PDP Source walkthrough ── */}
      <div className="bg-[#111] border border-white/20 rounded-xl p-8 space-y-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-tight">
          Adding a New Policy Source (PDP)
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          What happens when a new identity or ownership source needs to feed governance? Three steps — all existing enforcement points inherit it automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          <div>
            <StepSidebar
              steps={newPdpSteps.map((s) => ({ label: s.label, color: s.color }))}
              activeStep={pdpStep}
              onStepClick={setPdpStep}
            />
            <PrevNextNav
              current={pdpStep}
              total={newPdpSteps.length}
              onPrev={() => setPdpStep((s) => Math.max(0, s - 1))}
              onNext={() => setPdpStep((s) => Math.min(newPdpSteps.length - 1, s + 1))}
            />
          </div>
          <DetailPanel activeKey={pdpStep}>
            <div className="p-4 rounded-xl border border-white/20 bg-white/[0.03] space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-white">{newPdpSteps[pdpStep].title}</p>
              <div className="text-xs text-gray-400 leading-relaxed">{newPdpSteps[pdpStep].body}</div>
            </div>
          </DetailPanel>
        </div>
      </div>

      {/* ── Key properties grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            title: 'Shared Source of Truth',
            icon: Database,
            desc: <><C>ENTITLEMENTS</C> is mirrored to S3 or exposed via API. AWS agents and Snowflake read the same data.</>,
          },
          {
            title: 'Policy Parity',
            icon: Network,
            desc: <>AWS agents (Bedrock, custom Python services) look up the same <C>ENTITLEMENTS</C> data. No security logic is duplicated.</>,
          },
          {
            title: 'Consistent Identity',
            icon: UserCheck,
            desc: <>Okta and Salesforce feed <C>ENTITLEMENTS</C> — not just Snowflake roles. "Region = West" is consistent in a dashboard or an AI agent.</>,
          },
        ].map(({ title, icon: Icon, desc }) => (
          <div key={title} className="bg-[#111] p-5 rounded-lg border border-white/20">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={16} className="text-red-500 shrink-0" />
              <h4 className="text-white font-bold text-xs uppercase tracking-tight">{title}</h4>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <CalloutBox title="Architecture Guarantee" variant="emerald">
        <p>
          Because the PDP lives in the Silver Layer and the ELT sources write to it independently of
          any enforcement platform, governance is a{' '}
          <span className="text-white font-semibold">Global Service of the UDP</span> — not a siloed
          feature of Snowflake. Adding a new enforcement point requires only a lookup against{' '}
          <C>ENTITLEMENTS</C>, not a redesign of access logic.
        </p>
      </CalloutBox>
    </div>
  );
};

export default ExtensibilityView;
