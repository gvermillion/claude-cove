/**
 * Policy logic data — mock users, mock rows, and row-access resolution.
 *
 * Extracted from GovernanceImplView.tsx (Phase 0B).
 */

export interface MockUser {
  name: string;
  accessLevel: string;
  accessValue: string;
  desc: string;
}

export const mockUsers: MockUser[] = [
  { name: 'alice@cs.com', accessLevel: 'REGION', accessValue: 'West', desc: 'Regional sales lead — sees West region only' },
  { name: 'bob@cs.com', accessLevel: 'OPPORTUNITY', accessValue: 'OPP-001', desc: 'Account executive — sees their own opportunities' },
  { name: 'charlie@cs.com', accessLevel: 'GLOBAL', accessValue: '*', desc: 'VP of Sales — sees all data' },
  { name: 'eve@cs.com', accessLevel: '(none)', accessValue: '—', desc: 'No entitlements — denied by null guard' },
];

export const mockRows = [
  { opp_id: 'OPP-001', region: 'West', amount: '$120K', owner: 'Bob' },
  { opp_id: 'OPP-002', region: 'West', amount: '$85K', owner: 'Dana' },
  { opp_id: 'OPP-003', region: 'East', amount: '$210K', owner: 'Fran' },
  { opp_id: 'OPP-004', region: 'Central', amount: '$45K', owner: 'Greg' },
  { opp_id: 'OPP-005', region: 'West', amount: '$320K', owner: 'Alice' },
  { opp_id: null as string | null, region: null as string | null, amount: '$50K', owner: 'System' },
];

export function getRowAccess(user: MockUser, row: typeof mockRows[0]): { allowed: boolean; reason: string } {
  if (row.opp_id === null && row.region === null) {
    return { allowed: false, reason: 'Null guard — both security columns are NULL → FALSE' };
  }
  if (user.accessLevel === '(none)') {
    return { allowed: false, reason: 'No entitlement record found for this user' };
  }
  if (user.accessLevel === 'GLOBAL') {
    return { allowed: true, reason: 'GLOBAL access — all rows visible' };
  }
  if (user.accessLevel === 'REGION') {
    if (row.region === user.accessValue) {
      return { allowed: true, reason: `REGION match: ${row.region} = ${user.accessValue}` };
    }
    return { allowed: false, reason: `REGION mismatch: ${row.region} ≠ ${user.accessValue}` };
  }
  if (user.accessLevel === 'OPPORTUNITY') {
    if (row.opp_id === user.accessValue) {
      return { allowed: true, reason: `OPPORTUNITY match: ${row.opp_id} = ${user.accessValue}` };
    }
    return { allowed: false, reason: `OPPORTUNITY mismatch: ${row.opp_id} ≠ ${user.accessValue}` };
  }
  return { allowed: false, reason: 'Unknown access level' };
}
