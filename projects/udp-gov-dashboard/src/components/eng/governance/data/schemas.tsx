/**
 * Schema design data — schema definitions, lookup tables, and tag resolution logic.
 *
 * Extracted from GovernanceImplView.tsx (Phase 0B).
 */

import React from 'react';
import { C } from '../../../primitives';
import type { TagSelection, ResolvedOutcome } from './tags';

export interface SchemaInfo {
  name: string;
  policy: string;
  grainColumns: React.ReactNode;
  color: string;
  domain: string;
  pii: { present: boolean; columns?: string[] };
  detail: {
    description: React.ReactNode;
    rapBehavior: React.ReactNode;
    exampleAccess: { user: string; result: string; reason: React.ReactNode }[];
  };
}

export const schemas: SchemaInfo[] = [
  // --- SALES ---
  {
    name: 'SALES__GRANULAR',
    policy: 'FULL_RESTRICTION',
    grainColumns: <><C>OPPORTUNITY_ID</C>, <C>REGION_ID</C></>,
    color: 'red',
    domain: 'SALES',
    pii: { present: false },
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
    name: 'SALES__BY_REGION',
    policy: 'REGION_ONLY',
    grainColumns: <><C>REGION_ID</C></>,
    color: 'blue',
    domain: 'SALES',
    pii: { present: false },
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
    name: 'SALES__GLOBAL',
    policy: 'ADMIN_ONLY',
    grainColumns: <>(High-level aggregates only)</>,
    color: 'amber',
    domain: 'SALES',
    pii: { present: false },
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
    name: 'HR__BY_DEPARTMENT',
    policy: 'DEPT_ONLY',
    grainColumns: <><C>DEPARTMENT_ID</C></>,
    color: 'blue',
    domain: 'HR',
    pii: { present: false },
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
    name: 'HR__INDIVIDUAL',
    policy: 'FULL_RESTRICTION',
    grainColumns: <><C>EMPLOYEE_ID</C>, <C>DEPARTMENT_ID</C></>,
    color: 'blue',
    domain: 'HR',
    pii: { present: true, columns: ['EMAIL', 'FULL_NAME', 'SSN_LAST4'] },
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
    name: 'FINANCE__GLOBAL',
    policy: 'ADMIN_ONLY',
    grainColumns: <>(Aggregates only)</>,
    color: 'amber',
    domain: 'FINANCE',
    pii: { present: false },
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

export const domainOrder = ['SALES', 'HR', 'FINANCE'] as const;

export const schemasByDomain = domainOrder.map((domain) => ({
  domain,
  schemas: schemas.filter((s) => s.domain === domain),
}));

/** Map (domain, grain) to schema name. Only valid combinations are listed. */
export const schemaLookup: Record<string, Record<string, string>> = {
  SALES: {
    OPP_ID: 'SALES__GRANULAR',
    REGION: 'SALES__BY_REGION',
    GLOBAL: 'SALES__GLOBAL',
  },
  HR: {
    DEPARTMENT: 'HR__BY_DEPARTMENT',
    EMPLOYEE_ID: 'HR__INDIVIDUAL',  // individual-level grain
    GLOBAL: 'HR__BY_DEPARTMENT',    // HR leadership path
  },
  FINANCE: {
    GLOBAL: 'FINANCE__GLOBAL',
  },
};

export function resolveTagSelection(sel: TagSelection): ResolvedOutcome {
  const domainSchemas = schemaLookup[sel.domain];
  const schemaName = domainSchemas?.[sel.grain] ?? null;
  const matchedSchema = schemaName
    ? schemas.find((s) => s.name === schemaName)
    : null;

  const rapBranch = !matchedSchema
    ? 'No matching schema — this grain is not defined for this domain'
    : `RAP bound via ${matchedSchema.policy} policy on ${sel.domain} domain`;

  const hasPii = matchedSchema?.pii.present ?? false;
  const piiSelected = sel.piiPolicy !== 'None';
  const isRestricted = sel.sensitivity === 'RESTRICTED';

  let maskingBehavior: string;
  if (!matchedSchema) {
    maskingBehavior = 'N/A — no schema resolved';
  } else if (hasPii && piiSelected && isRestricted) {
    maskingBehavior = `Column masking active on ${sel.piiPolicy} — RESTRICTED sensitivity enforces dynamic masking`;
  } else if (hasPii && piiSelected && !isRestricted) {
    maskingBehavior = `PII columns present but ${sel.sensitivity} sensitivity — masking may not apply`;
  } else if (piiSelected && !hasPii) {
    maskingBehavior = 'PII policy selected but this schema has no tagged PII columns';
  } else {
    maskingBehavior = 'No PII masking — either PUBLIC data or no PII columns in this schema';
  }

  let summary: string;
  if (!matchedSchema) {
    summary = `The ${sel.domain} domain does not define a schema at the ${sel.grain} grain. Try a different grain for this domain.`;
  } else {
    summary = `Tables in ${matchedSchema.name} are filtered by ${sel.grain} grain via the ${matchedSchema.policy} policy. ${
      isRestricted ? 'RESTRICTED classification adds defense-in-depth masking.' : `${sel.sensitivity} classification — standard access controls apply.`
    }`;
  }

  return {
    schemaName,
    policy: matchedSchema?.policy ?? null,
    grainColumns: matchedSchema?.grainColumns ?? null,
    rapBranch,
    maskingBehavior,
    summary,
  };
}
