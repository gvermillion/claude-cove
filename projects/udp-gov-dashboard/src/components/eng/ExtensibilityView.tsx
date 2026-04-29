import React, { useState } from 'react';
import {
  Globe,
  Database,
  Network,
  UserCheck,
  Cloud,
  Bot,
  Snowflake,
  Plus,
} from 'lucide-react';
import {
  SectionHeader,
  CalloutBox,
  StepSidebar,
  DetailPanel,
  PrevNextNav,
  C,
} from '../primitives';

/* ------------------------------------------------------------------ */
/*  Hub-and-spoke data                                                 */
/* ------------------------------------------------------------------ */

interface SpokeNode {
  id: string;
  label: string;
  sublabel: string;
  color: string;           // tailwind color stem
  icon: React.ElementType;
  dashed?: boolean;
  mechanism: string;
  reads: string;
  failClosed: string;
  detail: React.ReactNode;
  /** CSS position offsets for the spoke node (px, translated -50%) */
  pos: { top: string; left: string };
  /** SVG line endpoint relative to hub center (0,0 = hub center) */
  line: { x: number; y: number };
}

const spokeNodes: SpokeNode[] = [
  {
    id: 'snowflake',
    label: 'Snowflake',
    sublabel: 'Row Access Policies',
    color: 'blue',
    icon: Snowflake,
    mechanism: 'Tag-based Row Access Policies evaluated at query time.',
    reads: 'USER_ENTITLEMENTS, DATA_DOMAIN, SENSITIVITY_LEVEL tags — joined via CURRENT_ROLE() and session context.',
    failClosed: 'If ENTITLEMENTS is unavailable, the RAP returns zero rows. No silent data leak — fail-closed by default.',
    detail: <>RAPs attached to Tags. The RAP inspects <C>ENTITLEMENTS</C> at query time — no manual join required. Enforcement is invisible to the analyst. Primary enforcement point for structured analytics.</>,
    pos: { top: '10%', left: '20%' },
    line: { x: -140, y: -100 },
  },
  {
    id: 's3',
    label: 'AWS S3',
    sublabel: 'IAM / Lake Formation',
    color: 'amber',
    icon: Cloud,
    mechanism: 'IAM policies + Lake Formation permissions consuming ENTITLEMENTS via S3 mirror.',
    reads: 'Mirrored ENTITLEMENTS parquet files or API endpoint — same columns (USER_ID, DATA_DOMAIN, REGION).',
    failClosed: 'Lake Formation denies by default. If the mirror is stale, the last-known entitlements apply — never a permissive fallback.',
    detail: <>IAM policies and Lake Formation permissions consume the same <C>ENTITLEMENTS</C> data via S3 mirror or API. S3 bucket policies enforce row/column-level access using the same identity-to-data mapping.</>,
    pos: { top: '10%', left: '80%' },
    line: { x: 140, y: -100 },
  },
  {
    id: 'bedrock',
    label: 'Bedrock',
    sublabel: 'Guardrails / Context',
    color: 'red',
    icon: Bot,
    mechanism: 'AI guardrails and context-window scoping via ENTITLEMENTS lookup before inference.',
    reads: 'Same ENTITLEMENTS columns — the agent resolves the caller identity and filters context to entitled data only.',
    failClosed: 'If ENTITLEMENTS is unreachable, the agent refuses to answer data questions. No hallucinated access grants.',
    detail: <>AI agents look up <C>ENTITLEMENTS</C> to scope context windows and guardrails. The same "Region = West" filter applies to a chatbot as to a dashboard. Prevents AI agents from surfacing data the user isn't entitled to see.</>,
    pos: { top: '85%', left: '20%' },
    line: { x: -140, y: 100 },
  },
  {
    id: 'future',
    label: 'Future PEP',
    sublabel: 'Any platform',
    color: 'gray',
    icon: Plus,
    dashed: true,
    mechanism: 'Any platform that can query a table or call an API.',
    reads: 'Standard ENTITLEMENTS schema — USER_ID, DATA_DOMAIN, SENSITIVITY_LEVEL, REGION, VALID_FROM, VALID_TO.',
    failClosed: 'Implementation-specific, but the pattern is always deny-by-default. No entitlement row = no access.',
    detail: <>Any future platform — a new BI tool, a custom microservice, a partner integration — adds enforcement by implementing a single lookup against <C>ENTITLEMENTS</C>. No schema changes, no new mapping tables, no governance redesign.</>,
    pos: { top: '85%', left: '80%' },
    line: { x: 140, y: 100 },
  },
];

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
/*  SVG spoke line                                                     */
/* ------------------------------------------------------------------ */

const SpokeLine = ({ x, y, active, dashed }: { x: number; y: number; active: boolean; dashed?: boolean }) => {
  const cx = 200; // SVG center x
  const cy = 130; // SVG center y
  return (
    <line
      x1={cx} y1={cy}
      x2={cx + x} y2={cy + y}
      stroke={active ? '#10b981' : '#555'}
      strokeWidth={active ? 2 : 1.5}
      strokeDasharray={dashed ? '6 4' : active ? '8 4' : 'none'}
      className="transition-all duration-500"
    >
      {active && (
        <animate
          attributeName="stroke-dashoffset"
          values="24;0"
          dur="1s"
          repeatCount="indefinite"
        />
      )}
    </line>
  );
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ExtensibilityView = () => {
  const [activeSpoke, setActiveSpoke] = useState(0);
  const [pepStep, setPepStep] = useState(0);
  const [pdpStep, setPdpStep] = useState(0);

  const spoke = spokeNodes[activeSpoke];

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="Cross-Platform Extensibility"
        subtitle="CrowdStrike's data estate spans Snowflake, AWS S3, and Bedrock AI agents. This section proves that governance is a platform service, not a vendor-specific feature — and shows how to extend it."
        icon={Globe}
        badge="Section 8"
      />

      {/* ── Hub-and-Spoke Diagram ── */}
      <div className="bg-[#111] border border-white/20 rounded-xl p-8 space-y-6">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          PDP / PEP Architecture — Hub and Spoke
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Left: visual diagram */}
          <div className="relative w-full" style={{ minHeight: 320 }}>
            {/* SVG spoke lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 400 260"
              preserveAspectRatio="xMidYMid meet"
            >
              {spokeNodes.map((node, i) => (
                <SpokeLine
                  key={node.id}
                  x={node.line.x}
                  y={node.line.y}
                  active={activeSpoke === i}
                  dashed={node.dashed}
                />
              ))}
            </svg>

            {/* Center hub */}
            <div
              className="absolute rounded-2xl border-2 border-emerald-600/60 bg-emerald-600/15 px-5 py-4 text-center shadow-lg shadow-emerald-900/20 z-10"
              style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', minWidth: 170 }}
            >
              <Database size={20} className="text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-400 text-[11px] font-black uppercase tracking-wider">ENTITLEMENTS</p>
              <p className="text-emerald-300/60 text-[9px] mt-1">Policy Decision Point</p>
            </div>

            {/* Spoke nodes */}
            {spokeNodes.map((node, i) => {
              const isActive = activeSpoke === i;
              const Icon = node.icon;
              const colorMap: Record<string, string> = {
                blue: isActive ? 'border-blue-500/60 bg-blue-600/20 shadow-blue-900/30' : 'border-blue-600/30 bg-blue-600/10',
                amber: isActive ? 'border-amber-500/60 bg-amber-600/20 shadow-amber-900/30' : 'border-amber-600/30 bg-amber-600/10',
                red: isActive ? 'border-red-500/60 bg-red-600/20 shadow-red-900/30' : 'border-red-600/30 bg-red-600/10',
                gray: isActive ? 'border-white/30 bg-white/10 shadow-white/5' : 'border-white/15 bg-white/[0.06]',
              };
              const textColor: Record<string, string> = {
                blue: 'text-blue-400', amber: 'text-amber-400', red: 'text-red-400', gray: 'text-gray-400',
              };
              return (
                <button
                  key={node.id}
                  onClick={() => setActiveSpoke(i)}
                  className={`absolute z-10 rounded-xl border px-4 py-3 text-center transition-all duration-300 cursor-pointer hover:scale-105 ${colorMap[node.color]} ${isActive ? 'ring-2 ring-white/20 scale-105 shadow-lg' : ''} ${node.dashed ? 'border-dashed' : ''}`}
                  style={{ top: node.pos.top, left: node.pos.left, transform: 'translate(-50%, -50%)', minWidth: 120 }}
                >
                  <Icon size={16} className={`mx-auto mb-1.5 ${textColor[node.color]}`} />
                  <p className={`text-[10px] font-bold uppercase tracking-wide ${textColor[node.color]}`}>
                    {node.label}
                  </p>
                  <p className="text-[9px] text-gray-500 mt-0.5">{node.sublabel}</p>
                </button>
              );
            })}
          </div>

          {/* Right: spoke detail panel */}
          <DetailPanel activeKey={activeSpoke}>
            <div className="p-5 rounded-xl border border-white/20 bg-white/[0.03] space-y-4">
              <div className="flex items-center gap-2">
                <spoke.icon size={16} className="text-red-500 shrink-0" />
                <p className="text-sm font-bold uppercase tracking-wide text-white">
                  {spoke.label}
                </p>
              </div>

              <div className="space-y-3 text-xs text-gray-400 leading-relaxed">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Enforcement Mechanism</p>
                  <p>{spoke.mechanism}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Reads from ENTITLEMENTS</p>
                  <p>{spoke.reads}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Fail-Closed Behavior</p>
                  <p>{spoke.failClosed}</p>
                </div>
              </div>

              <p className="text-xs text-gray-400 leading-relaxed border-t border-white/10 pt-3">{spoke.detail}</p>
            </div>
          </DetailPanel>
        </div>

        <p className="text-[10px] text-gray-500 text-center italic">
          Click any spoke to inspect its enforcement mechanism, data contract, and fail-closed behavior
        </p>
      </div>

      {/* ── Vendor-neutrality callout ── */}
      <CalloutBox title="Vendor Neutrality" variant="blue">
        <p>
          Every platform named here is illustrative. The <C>ENTITLEMENTS</C> table is the universal policy interface.
          Adding a new enforcement point requires only a lookup against this table — no redesign of access logic.
        </p>
      </CalloutBox>

      {/* ── UDP synergy callout ── */}
      <CalloutBox title="UDP Synergy" variant="emerald">
        <p>
          The UDP build handles the heavy infrastructure — environment setup, medallion architecture, automated ingestion.
          From there, governance becomes a federated service that layers on with net-negative operational cost.
        </p>
      </CalloutBox>

      {/* ── Adding a New PEP walkthrough ── */}
      <div className="bg-[#111] border border-white/20 rounded-xl p-8 space-y-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-tight">
          Adding a New Enforcement Point (PEP)
        </h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          What happens when a new platform needs governance? Three steps — no governance redesign.
        </p>

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
