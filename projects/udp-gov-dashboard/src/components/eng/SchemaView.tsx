import React, { useState } from 'react';
import { Table2 } from 'lucide-react';
import {
  SectionHeader,
  CalloutBox,
  StepSidebar,
  DetailPanel,
  C,
  colorStyles,
} from '../primitives';

interface SchemaInfo {
  name: string;
  policy: string;
  grainColumns: React.ReactNode;
  color: string;
  domain: string;
  detail: {
    description: React.ReactNode;
    rapBehavior: React.ReactNode;
    exampleAccess: { user: string; result: string; reason: React.ReactNode }[];
  };
}

const schemas: SchemaInfo[] = [
  // --- SALES ---
  {
    name: 'SALES_GRANULAR',
    policy: 'FULL_RESTRICTION',
    grainColumns: <><C>OPPORTUNITY_ID</C>, <C>REGION_ID</C></>,
    color: 'red',
    domain: 'SALES',
    detail: {
      description: <>Most restrictive schema — requires both opportunity-level and region-level security attributes. Used for deal-level data.</>,
      rapBehavior: <>RAP checks BOTH <C>OPP_ID</C> and <C>REGION_ID</C>. Opportunity-level entitlement grants access to specific deals. Region grants access to all deals in a region.</>,
      exampleAccess: [
        { user: 'Bob (OPPORTUNITY=OPP-001)', result: '✓', reason: <>Opportunity match on <C>OPP-001</C></> },
        { user: 'Alice (REGION=West)', result: '✓', reason: 'Region match — sees all West deals' },
        { user: 'Eve (no entitlements)', result: '✗', reason: 'No entitlement record' },
      ],
    },
  },
  {
    name: 'SALES_BY_REGION',
    policy: 'REGION_ONLY',
    grainColumns: <><C>REGION_ID</C></>,
    color: 'blue',
    domain: 'SALES',
    detail: {
      description: <>Aggregated to region grain — no opportunity-level detail. Used for regional dashboards and summaries.</>,
      rapBehavior: <>RAP checks <C>REGION_ID</C> only. Opportunity-level entitlements are ignored (no <C>OPP_ID</C> column exists).</>,
      exampleAccess: [
        { user: 'Alice (REGION=West)', result: '✓', reason: 'Region match' },
        { user: 'Bob (OPPORTUNITY=OPP-001)', result: '✗', reason: 'No region entitlement — opportunity doesn\'t apply here' },
        { user: 'Charlie (GLOBAL)', result: '✓', reason: <><C>GLOBAL</C> bypasses all filters</> },
      ],
    },
  },
  {
    name: 'SALES_GLOBAL',
    policy: 'ADMIN_ONLY',
    grainColumns: <>(High-level aggregates only)</>,
    color: 'amber',
    domain: 'SALES',
    detail: {
      description: <>Highly aggregated — no row-level security attributes. Only <C>GLOBAL</C>-entitled users can access.</>,
      rapBehavior: <>RAP checks for <C>GLOBAL</C> <C>access_level</C> only. No opportunity or region filtering — data is already fully aggregated.</>,
      exampleAccess: [
        { user: 'Charlie (GLOBAL)', result: '✓', reason: <><C>GLOBAL</C> access</> },
        { user: 'Alice (REGION=West)', result: '✗', reason: <>No <C>GLOBAL</C> entitlement</> },
        { user: 'Bob (OPPORTUNITY=OPP-001)', result: '✗', reason: <>No <C>GLOBAL</C> entitlement</> },
      ],
    },
  },
  // --- HR ---
  {
    name: 'HR_BY_DEPARTMENT',
    policy: 'DEPT_ONLY',
    grainColumns: <><C>DEPARTMENT_ID</C></>,
    color: 'blue',
    domain: 'HR',
    detail: {
      description: <>Department-scoped HR data — headcount, attrition, compensation bands. Managers see only their department.</>,
      rapBehavior: <>RAP checks <C>DEPARTMENT_ID</C> against the user's entitled department. <C>GLOBAL</C> bypasses the filter for HR leadership.</>,
      exampleAccess: [
        { user: 'HR Manager (DEPARTMENT=Engineering)', result: '✓', reason: <>Department match on <C>Engineering</C></> },
        { user: 'HR Manager (DEPARTMENT=Sales)', result: '✗', reason: 'Department mismatch — cannot see Engineering data' },
        { user: 'CHRO (GLOBAL)', result: '✓', reason: <><C>GLOBAL</C> bypasses department filter</> },
      ],
    },
  },
  {
    name: 'HR_INDIVIDUAL',
    policy: 'FULL_RESTRICTION',
    grainColumns: <><C>EMPLOYEE_ID</C>, <C>DEPARTMENT_ID</C></>,
    color: 'blue',
    domain: 'HR',
    detail: {
      description: <>Most sensitive HR schema — individual employee records including PII, performance reviews, and compensation details. Dual-key access required.</>,
      rapBehavior: <>RAP checks BOTH <C>EMPLOYEE_ID</C> and <C>DEPARTMENT_ID</C>. Direct reports require employee-level entitlement. Department heads see all employees in their org.</>,
      exampleAccess: [
        { user: 'Direct Manager (EMPLOYEE=EMP-042)', result: '✓', reason: <>Employee-level entitlement on <C>EMP-042</C></> },
        { user: 'HR Manager (DEPARTMENT=Engineering)', result: '✓', reason: 'Department match — sees all Engineering employees' },
        { user: 'Finance Analyst (no HR entitlement)', result: '✗', reason: 'No HR entitlement record' },
      ],
    },
  },
  // --- FINANCE ---
  {
    name: 'FINANCE_GLOBAL',
    policy: 'ADMIN_ONLY',
    grainColumns: <>(Aggregates only)</>,
    color: 'amber',
    domain: 'FINANCE',
    detail: {
      description: <>Consolidated financial reporting — P&L, budget summaries, forecast models. No line-item detail exposed. Restricted to finance leadership.</>,
      rapBehavior: <>RAP checks for <C>GLOBAL</C> <C>access_level</C> only. No department or cost-center filtering — data is pre-aggregated at the corporate level.</>,
      exampleAccess: [
        { user: 'Finance Admin (GLOBAL)', result: '✓', reason: <><C>GLOBAL</C> access to all finance aggregates</> },
        { user: 'Department Head (DEPARTMENT=Engineering)', result: '✗', reason: <>No <C>GLOBAL</C> finance entitlement</> },
        { user: 'External Auditor (no entitlement)', result: '✗', reason: 'No entitlement record — requires provisioning' },
      ],
    },
  },
];

// Group schemas by domain for sidebar rendering
const domainOrder = ['SALES', 'HR', 'FINANCE'] as const;
const schemasByDomain = domainOrder.map((domain) => ({
  domain,
  schemas: schemas.filter((s) => s.domain === domain),
}));

const SchemaView = () => {
  const [activeSchema, setActiveSchema] = useState(0);
  const schema = schemas[activeSchema];
  const s = colorStyles[schema.color];

  // Build steps with domain dividers for StepSidebar
  const sidebarSteps = schemas.map((sc) => ({ label: sc.name, color: sc.color }));

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="Schema Segregation & Expansion Pattern"
        subtitle="When analysts materialize governed data, RAPs are silently lost. Schema segregation by security grain makes it structurally impossible to create unprotected data products."
        icon={Table2}
        badge="Section 6"
      />

      {/* Two-column schema selector */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white uppercase tracking-tight">
          Multi-Domain Schema Set
          <span className="text-gray-500 font-normal text-xs ml-2 normal-case tracking-normal">
            — select a schema to explore its access model
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          {/* Left: schema list grouped by domain */}
          <div className="flex flex-col gap-1">
            {schemasByDomain.map((group) => (
              <React.Fragment key={group.domain}>
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-600">
                    {group.domain}
                  </span>
                </div>
                {group.schemas.map((sc) => {
                  const globalIndex = schemas.indexOf(sc);
                  const isActive = globalIndex === activeSchema;
                  const cs = colorStyles[sc.color];
                  return (
                    <button
                      key={sc.name}
                      onClick={() => setActiveSchema(globalIndex)}
                      className={`text-left px-4 py-3 rounded-xl transition-all duration-200 border ${
                        isActive
                          ? `${cs.border} ${cs.bg} shadow-lg`
                          : 'border-transparent hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`shrink-0 w-2 h-2 rounded-full transition-colors ${
                            isActive ? cs.dot : 'bg-gray-700'
                          }`}
                        />
                        <span className={`text-xs font-semibold transition-colors ${isActive ? 'text-white' : 'text-gray-500'}`}>
                          {sc.name}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* Right: schema detail */}
          <DetailPanel activeKey={activeSchema}>
            <div className="p-5 rounded-xl border border-white/20 bg-[#0a0a0a] space-y-4">
              <div className="flex items-center gap-3">
                <p className={`font-mono font-bold text-sm ${s.accent}`}>
                  <C>{schema.name}</C>
                </p>
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 bg-white/5 px-2 py-0.5 rounded">
                  {schema.domain}
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{schema.detail.description}</p>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Policy: <C>{schema.policy}</C></p>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Grain Columns: {schema.grainColumns}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">RAP Behavior</p>
                <p className="text-xs text-gray-400 leading-relaxed">{schema.detail.rapBehavior}</p>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Access Examples</p>
                <div className="space-y-1">
                  {schema.detail.exampleAccess.map((ex, i) => (
                    <div key={i} className="flex items-center gap-3 text-[11px]">
                      <span className={ex.result === '✓' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                        {ex.result}
                      </span>
                      <span className="text-white font-semibold">{ex.user}</span>
                      <span className="text-gray-500">—</span>
                      <span className="text-gray-400">{ex.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DetailPanel>
        </div>
      </div>

      {/* PDP back-reference (consolidated in Exec Summary) */}
      <CalloutBox title="Centralized Policy Decision Point" variant="blue">
        <p>
          The PDP/PEP segregation pattern that enables this schema design is detailed in{' '}
          <span className="text-white font-semibold">Section 1: Executive Summary</span>.
          The <C>ENTITLEMENTS</C> table in the Silver Layer serves as the shared PDP — Snowflake, AWS, and future platforms all read the same source of truth.
        </p>
      </CalloutBox>
    </div>
  );
};

export default SchemaView;
