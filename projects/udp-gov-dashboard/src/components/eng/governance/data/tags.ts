/**
 * Tag taxonomy data — tag metadata, scenario fixtures, and masking examples.
 *
 * Extracted from GovernanceImplView.tsx (Phase 0B).
 */

export interface TagSelection {
  domain: string;
  sensitivity: string;
  grain: string;
  piiPolicy: string;
}

export interface ResolvedOutcome {
  schemaName: string | null;
  policy: string | null;
  grainColumns: React.ReactNode | null;
  rapBranch: string;
  maskingBehavior: string;
  summary: string;
}

export const tagMeta: { key: keyof TagSelection; label: string; color: string }[] = [
  { key: 'domain', label: 'DATA_DOMAIN', color: 'red' },
  { key: 'sensitivity', label: 'DATA_SENSITIVITY', color: 'amber' },
  { key: 'grain', label: 'GOVERNANCE_GRAIN', color: 'emerald' },
  { key: 'piiPolicy', label: 'PII_POLICY', color: 'blue' },
];

export interface TagScenario {
  label: string;
  desc: string;
  tags: TagSelection;
}

export const tagScenarios: TagScenario[] = [
  { label: 'Sales rep views regional pipeline',
    desc: 'RESTRICTED region-grain data — RAP binds, no PII masking needed',
    tags: { domain: 'SALES', sensitivity: 'RESTRICTED', grain: 'REGION', piiPolicy: 'None' } },
  { label: 'HR manager views employee records',
    desc: 'Full governance — PII masking active on EMAIL column',
    tags: { domain: 'HR', sensitivity: 'RESTRICTED', grain: 'EMPLOYEE_ID', piiPolicy: 'EMAIL' } },
  { label: 'HR manager views SSN data',
    desc: 'Same schema, SSN_LAST4 masking branch highlighted',
    tags: { domain: 'HR', sensitivity: 'RESTRICTED', grain: 'EMPLOYEE_ID', piiPolicy: 'SSN_LAST4' } },
  { label: 'Department head views HR rollup',
    desc: 'Valid schema, INTERNAL sensitivity — no masking fires',
    tags: { domain: 'HR', sensitivity: 'INTERNAL', grain: 'DEPARTMENT', piiPolicy: 'None' } },
  { label: 'Finance leadership views global report',
    desc: 'ADMIN_ONLY schema, RESTRICTED but no PII columns',
    tags: { domain: 'FINANCE', sensitivity: 'RESTRICTED', grain: 'GLOBAL', piiPolicy: 'None' } },
  { label: 'Invalid: Finance at deal grain',
    desc: 'No schema resolves — grain not defined for this domain',
    tags: { domain: 'FINANCE', sensitivity: 'RESTRICTED', grain: 'OPP_ID', piiPolicy: 'None' } },
  { label: 'Taxonomy bug: HR PII + INTERNAL',
    desc: 'TAXONOMY INVARIANT VIOLATED \u2014 if PII_POLICY is set, sensitivity must be RESTRICTED. This scenario exists only to demonstrate the broken state and what the guardrail should catch.',
    tags: { domain: 'HR', sensitivity: 'INTERNAL', grain: 'EMPLOYEE_ID', piiPolicy: 'FULL_NAME' } },
];

export interface MaskingExample {
  column: string;
  raw: string;
  masked: string;
}

export const maskingExamples: Record<string, MaskingExample[]> = {
  EMAIL: [
    { column: 'EMAIL', raw: 'jane.doe@crowdstrike.com', masked: 'j*****@c*****.com' },
    { column: 'FULL_NAME', raw: 'Jane Doe', masked: 'Jane Doe' },
    { column: 'SSN_LAST4', raw: '7890', masked: '7890' },
  ],
  FULL_NAME: [
    { column: 'EMAIL', raw: 'jane.doe@crowdstrike.com', masked: 'jane.doe@crowdstrike.com' },
    { column: 'FULL_NAME', raw: 'Jane Doe', masked: '***' },
    { column: 'SSN_LAST4', raw: '7890', masked: '7890' },
  ],
  SSN_LAST4: [
    { column: 'EMAIL', raw: 'jane.doe@crowdstrike.com', masked: 'jane.doe@crowdstrike.com' },
    { column: 'FULL_NAME', raw: 'Jane Doe', masked: 'Jane Doe' },
    { column: 'SSN_LAST4', raw: '7890', masked: '****' },
  ],
};

export const tagInvariants: { id: string; rule: string; rationale: string }[] = [
  {
    id: 'pii-requires-restricted',
    rule: 'PII_POLICY \u2260 None \u21d2 DATA_SENSITIVITY = RESTRICTED',
    rationale: 'Any column that carries a PII policy is, by definition, sensitive personal data and must be classified RESTRICTED. The combination (PII, INTERNAL) is a classification error.',
  },
  {
    id: 'grain-defined-per-domain',
    rule: 'GOVERNANCE_GRAIN must be defined in the domain-to-grain lookup',
    rationale: 'Grain values are domain-scoped. FINANCE at OPP_ID grain has no meaning and must not resolve to a schema.',
  },
];
