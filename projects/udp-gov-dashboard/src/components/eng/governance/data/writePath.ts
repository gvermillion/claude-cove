/**
 * Write-path governance data — roles, targets, and write-gate resolution.
 *
 * Extracted from GovernanceImplView.tsx (Phase 0B).
 */

export interface WriteRole {
  name: string;
  label: string;
  entitlements: string[];   // domains this role has write access to
  desc: string;
}

export const writeRoles: WriteRole[] = [
  { name: 'hr_analyst@cs.com', label: 'HR Analyst', entitlements: ['HR'], desc: 'HR domain writer — can write to HR schemas' },
  { name: 'sales_analyst@cs.com', label: 'Sales Analyst', entitlements: ['SALES'], desc: 'Sales domain writer — can write to Sales schemas' },
  { name: 'junior_eng@cs.com', label: 'Junior Engineer', entitlements: ['SALES'], desc: 'New hire — has Sales entitlement but unfamiliar with tagging' },
  { name: 'contractor@cs.com', label: 'External Contractor', entitlements: [], desc: 'No write entitlements — read-only access' },
];

export interface WriteTarget {
  schema: string;
  domain: string;
  tableName: string;
  columnSignature: 'hr' | 'sales' | 'mismatched';
  hasCorrectTags: boolean;
}

export const writeTargets: WriteTarget[] = [
  { schema: 'HR__INDIVIDUAL', domain: 'HR', tableName: 'employee_reviews', columnSignature: 'hr', hasCorrectTags: true },
  { schema: 'HR__BY_DEPARTMENT', domain: 'HR', tableName: 'dept_headcount', columnSignature: 'hr', hasCorrectTags: true },
  { schema: 'SALES__BY_REGION', domain: 'SALES', tableName: 'pipeline_summary', columnSignature: 'sales', hasCorrectTags: true },
  { schema: 'HR__BY_DEPARTMENT', domain: 'HR', tableName: 'quota_attainment', columnSignature: 'mismatched', hasCorrectTags: false },
  { schema: 'SALES__GRANULAR', domain: 'SALES', tableName: 'raw_opps_untagged', columnSignature: 'sales', hasCorrectTags: false },
];

export interface WriteGateResult {
  rbac: { passed: boolean; reason: string };
  copilot: { flag: 'pass' | 'warn' | 'block'; reason: string };
  validation: { status: 'ok' | 'flagged' | 'n/a'; reason: string };
  overall: 'allowed' | 'blocked' | 'warning';
}

export function resolveWriteScenario(role: WriteRole, target: WriteTarget): WriteGateResult {
  // Layer 1: RBAC — does the role have write entitlement for this domain?
  const hasRbac = role.entitlements.includes(target.domain);
  const rbac = hasRbac
    ? { passed: true, reason: `${role.label} has ${target.domain} entitlement → GRANT INSERT on ${target.schema}` }
    : { passed: false, reason: `No ${target.domain} entitlement → INSERT denied on ${target.schema}` };

  if (!hasRbac) {
    return {
      rbac,
      copilot: { flag: 'pass' as const, reason: 'Skipped — blocked at RBAC layer' },
      validation: { status: 'n/a' as const, reason: 'Skipped — blocked at RBAC layer' },
      overall: 'blocked',
    };
  }

  // Layer 2: Copilot semantic guardrail
  let copilot: WriteGateResult['copilot'];
  if (target.columnSignature === 'mismatched') {
    copilot = { flag: 'block', reason: `Column patterns (QUOTA, ATTAINMENT) don't match ${target.domain} domain — Copilot flags semantic mismatch` };
  } else if (!target.hasCorrectTags) {
    copilot = { flag: 'warn', reason: `Table structure matches ${target.domain} but missing governance tags — Copilot recommends tagging before write` };
  } else {
    copilot = { flag: 'pass', reason: `Column patterns match ${target.domain} domain, tags present — Copilot approves` };
  }

  // Layer 3: Stream + Task continuous validation
  let validation: WriteGateResult['validation'];
  if (copilot.flag === 'block') {
    validation = { status: 'n/a', reason: 'Copilot blocked the write — validation not reached' };
  } else if (!target.hasCorrectTags) {
    validation = { status: 'flagged', reason: `Stream detects ${target.tableName} in ${target.schema} with missing DATA_DOMAIN tag — alert raised` };
  } else {
    validation = { status: 'ok', reason: `DATA_DOMAIN tag matches schema convention — no drift detected` };
  }

  const overall = !hasRbac ? 'blocked'
    : copilot.flag === 'block' ? 'blocked'
    : copilot.flag === 'warn' || validation.status === 'flagged' ? 'warning'
    : 'allowed';

  return { rbac, copilot, validation, overall };
}
