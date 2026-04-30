/**
 * Compliance framework data — frameworks, controls, and coverage matrix.
 *
 * New in Phase 0B. Consumed by the AuditTab ComplianceMap (Phase 4).
 */

export interface Framework {
  id: string;
  label: string;
  description: string;
}

export interface ComplianceControl {
  id: string;
  label: string;
}

export type Coverage = 'full' | 'partial' | 'gap';

export const frameworks: Framework[] = [
  { id: 'SOX',   label: 'SOX ITGC',          description: 'Access provisioning, change management, SoD' },
  { id: 'SOC2',  label: 'SOC 2 CC6',         description: 'Logical access controls' },
  { id: 'GDPR',  label: 'GDPR Art. 17/25/32', description: 'Erasure, privacy-by-design, security' },
  { id: 'HIPAA', label: 'HIPAA §164.312',     description: 'Access controls for PHI' },
  { id: 'PCI',   label: 'PCI-DSS 7/8',        description: 'Restrict access by business need' },
];

export const complianceControls: ComplianceControl[] = [
  { id: 'rap',          label: 'Row Access Policy' },
  { id: 'masking',      label: 'Column Masking' },
  { id: 'rbac',         label: 'RBAC write gates' },
  { id: 'entitlements', label: 'Entitlements audit' },
  { id: 'tag-audit',    label: 'Tag history' },
  { id: 'erasure',      label: 'Erasure workflow' },
  { id: 'break-glass',  label: 'Break-glass flow' },
];

/** coverage[frameworkId][controlId] → Coverage level */
export const coverage: Record<string, Record<string, Coverage>> = {
  SOX:   { rap: 'full',    masking: 'partial', rbac: 'partial', entitlements: 'partial', 'tag-audit': 'partial', erasure: 'gap',    'break-glass': 'gap' },
  SOC2:  { rap: 'full',    masking: 'full',    rbac: 'partial', entitlements: 'partial', 'tag-audit': 'partial', erasure: 'gap',    'break-glass': 'gap' },
  GDPR:  { rap: 'partial', masking: 'partial', rbac: 'partial', entitlements: 'gap',     'tag-audit': 'gap',     erasure: 'gap',    'break-glass': 'gap' },
  HIPAA: { rap: 'full',    masking: 'full',    rbac: 'partial', entitlements: 'gap',     'tag-audit': 'partial', erasure: 'gap',    'break-glass': 'gap' },
  PCI:   { rap: 'full',    masking: 'partial', rbac: 'partial', entitlements: 'gap',     'tag-audit': 'partial', erasure: 'gap',    'break-glass': 'gap' },
};
