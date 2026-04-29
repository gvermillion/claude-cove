import React, { useState } from 'react';
import { Tags, ArrowRight } from 'lucide-react';
import {
  SectionHeader,
  CalloutBox,
  StepSidebar,
  DetailPanel,
  C,
  colorStyles,
} from '../primitives';

interface TagDetail {
  description: React.ReactNode;
  schemas: React.ReactNode[];
  rapEffect: React.ReactNode;
}

interface TagDef {
  name: string;
  values: React.ReactNode;
  enforcement: React.ReactNode;
  color: string;
  detail: TagDetail;
}

const tagDefs: TagDef[] = [
  {
    name: 'DATA_DOMAIN',
    values: <>SALES, THREAT, FINANCE</>,
    enforcement: <>Routes data to domain-specific RAPs.</>,
    color: 'red',
    detail: {
      description: <>The primary organizational tag. Determines which RAP binds to the schema and which Domain Data Steward is responsible.</>,
      schemas: [
        <><C>SALES__GRANULAR</C></>,
        <><C>SALES__BY_REGION</C></>,
        <><C>SALES__GLOBAL</C></>,
      ],
      rapEffect: <>RAP selected based on domain-specific business rules. SALES domain uses <C>unified_sales_policy</C>.</>,
    },
  },
  {
    name: 'DATA_SENSITIVITY',
    values: <><C>PUBLIC</C>, INTERNAL, <C>RESTRICTED</C></>,
    enforcement: <>Triggers masking or <C>RLS</C> based on classification.</>,
    color: 'amber',
    detail: {
      description: <>Classification tag that determines whether additional masking policies apply on top of the base RAP.</>,
      schemas: [<>Any schema — applied at column or table level</>],
      rapEffect: <><C>RESTRICTED</C> triggers additional column masking via <C>PII_POLICY</C>. <C>PUBLIC</C> data may bypass <C>RLS</C> entirely.</>,
    },
  },
  {
    name: 'GOVERNANCE_GRAIN',
    values: <><C>OPP_ID</C>, <C>REGION</C>, <C>GLOBAL</C></>,
    enforcement: <>Tells the RAP which security attribute columns to filter on.</>,
    color: 'emerald',
    detail: {
      description: <>The security grain determines which <C>ENTITLEMENTS</C> columns the RAP evaluates. This is the core routing mechanism.</>,
      schemas: [
        <><C>SALES__GRANULAR</C> → <C>OPP_ID</C> + <C>REGION</C></>,
        <><C>SALES__BY_REGION</C> → <C>REGION</C> only</>,
        <><C>SALES__GLOBAL</C> → <C>GLOBAL</C> (admin only)</>,
      ],
      rapEffect: <>RAP <C>CASE</C> logic branches based on grain. <C>OPP_ID</C> grain checks opportunity-level access; <C>REGION</C> grain checks region-level.</>,
    },
  },
  {
    name: 'PII_POLICY',
    values: <><C>EMAIL</C>, <C>FULL_NAME</C></>,
    enforcement: <>Dynamic column masking based on user role.</>,
    color: 'blue',
    detail: {
      description: <>Column-level masking tag. Columns tagged with <C>PII_POLICY</C> are dynamically masked unless the querying user has an explicit unmask privilege.</>,
      schemas: [<>Applied to specific columns, not schemas</>],
      rapEffect: <>Operates independently of <C>RLS</C>. Masking fires after row filtering — users who can see a row may still see masked column values.</>,
    },
  },
];

const TaxonomyView = () => {
  const [activeTag, setActiveTag] = useState(0);
  const tag = tagDefs[activeTag];
  const s = colorStyles[tag.color];

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="Governance Tag Taxonomy"
        subtitle="Tags are the primary expansion points — new controls can be added without modifying existing tables."
        icon={Tags}
        badge="Section 4"
      />

      {/* Two-column tag registry */}
      <div className="space-y-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          Tag Registry
          <span className="text-gray-600 font-normal normal-case tracking-normal ml-2">
            — select a tag to see propagation
          </span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          {/* Left: tag list */}
          <StepSidebar
            steps={tagDefs.map((t) => ({ label: t.name, color: t.color }))}
            activeStep={activeTag}
            onStepClick={setActiveTag}
          />

          {/* Right: tag propagation detail */}
          <DetailPanel activeKey={activeTag}>
            <div className="p-5 rounded-xl border border-white/20 bg-[#0a0a0a] space-y-4">
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold text-sm ${s.accent}`}>
                  <C>{tag.name}</C>
                </span>
                <ArrowRight size={14} className="text-gray-500" />
                <span className="text-white text-sm font-semibold">Propagation & Effect</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{tag.detail.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Affected Schemas</p>
                  {tag.detail.schemas.map((schema, i) => (
                    <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${colorStyles[tag.color].dot}`} />
                      {schema}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">RAP Effect</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{tag.detail.rapEffect}</p>
                </div>
              </div>
            </div>
          </DetailPanel>
        </div>
      </div>

      {/* PII / RLS interaction */}
      <PiiInteractionSection />
    </div>
  );
};

const PiiInteractionSection = () => {
  const [showConflict, setShowConflict] = useState(false);

  return (
    <div className="space-y-4">
      <h3 className="text-base font-bold text-white uppercase tracking-tight border-b border-white/20 pb-2">
        PII Masking / RLS Interaction Rule
      </h3>
      <div className="bg-[#111] p-6 rounded-xl border border-white/15 space-y-4">
        <p className="text-sm text-gray-400 leading-relaxed">
          Dynamic Data Masking (via <C>PII_POLICY</C> tags) and Row Access Policies coexist on Gold tables.
        </p>

        {/* Interactive conflict toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConflict(!showConflict)}
            className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all duration-200 ${
              showConflict
                ? 'border-red-600/30 bg-red-600/10 text-red-400'
                : 'border-white/20 bg-white/5 text-gray-400 hover:text-white'
            }`}
          >
            {showConflict ? '✗ Conflict Scenario' : 'Show Conflict Scenario'}
          </button>
          <span className="text-[10px] text-gray-500 italic">
            What if a column is both a PII target AND a RAP filter?
          </span>
        </div>

        {showConflict && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 p-4 rounded-xl border border-red-600/40 bg-red-600/10 space-y-3">
            <p className="text-xs text-red-400 font-bold uppercase tracking-wide">Conflict Detected</p>
            <p className="text-xs text-gray-400">
              Column <C>EMAIL</C> is tagged with <C>PII_POLICY</C> for masking,
              but also used as a RAP filter dimension. The RAP would compare the masked value (e.g., <code className="text-gray-500">****@cs.com</code>)
              against the <C>ENTITLEMENTS</C> value — causing silent access denial for all rows.
            </p>
            <p className="text-xs text-white font-semibold">
              → This is why the separation rule exists. It prevents this class of bugs at design time.
            </p>
          </div>
        )}

        <CalloutBox title="Separation Rule" variant="red">
          <p>
            <span className="text-white font-semibold">Masked columns cannot be used as RAP filter dimensions.</span>{' '}
            Columns tagged with <C>PII_POLICY</C> must be structurally separate from the security attribute columns.
          </p>
        </CalloutBox>
        <CalloutBox title="Certification Prerequisite" variant="amber">
          <p>
            A test matrix documenting expected behavior for every RAP + masking combination on a
            given Gold table is a <span className="text-white font-semibold">prerequisite for Gold layer certification</span>.
          </p>
        </CalloutBox>
        <CalloutBox title="ABAC + RBAC: layered access models" variant="blue">
          <p>
            The default model is <span className="text-white font-semibold">ABAC</span> — access derives from attributes
            (region, owner, domain) recorded in <C>ENTITLEMENTS</C>. PII unmasking is the natural place for an{' '}
            <span className="text-white font-semibold">RBAC overlay</span>: grant <C>UNMASK_PII</C> to specific roles
            (e.g. <C>SECURITY_ANALYST</C>, <C>FRAUD_INVESTIGATOR</C>) so that column masking respects role membership in
            addition to row-level entitlements. Layering RBAC on ABAC keeps the data plane attribute-driven while exposing
            a clear, auditable surface for sensitive-data exemptions.
          </p>
        </CalloutBox>
      </div>
    </div>
  );
};

export default TaxonomyView;
