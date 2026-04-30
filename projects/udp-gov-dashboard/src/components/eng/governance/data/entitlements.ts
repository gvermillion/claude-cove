/**
 * Entitlements table data — row shapes and example fixtures.
 *
 * New in Phase 0B. Consumed by the IdentityTab (Phase 3).
 */

export interface EntitlementRow {
  user_name: string;
  domain: string;
  access_level: 'GLOBAL' | 'REGION' | 'OPPORTUNITY' | 'DEPARTMENT' | 'EMPLOYEE';
  access_value: string;
  source: 'OKTA' | 'HR_SYSTEM' | 'MANUAL' | 'SCIM';
  approved_by: string | null;
  effective_from: string;  // ISO date
  effective_to: string | null;
  granted_at: string;
  granted_by: string;
}

export const entitlementExamples: EntitlementRow[] = [
  {
    user_name: 'alice@cs.com',
    domain: 'SALES',
    access_level: 'REGION',
    access_value: 'West',
    source: 'OKTA',
    approved_by: 'vp_sales@cs.com',
    effective_from: '2025-01-15',
    effective_to: null,
    granted_at: '2025-01-15T09:30:00Z',
    granted_by: 'scim_sync',
  },
  {
    user_name: 'bob@cs.com',
    domain: 'SALES',
    access_level: 'OPPORTUNITY',
    access_value: 'OPP-001',
    source: 'MANUAL',
    approved_by: 'alice@cs.com',
    effective_from: '2025-03-01',
    effective_to: '2025-12-31',
    granted_at: '2025-03-01T14:12:00Z',
    granted_by: 'alice@cs.com',
  },
  {
    user_name: 'charlie@cs.com',
    domain: 'SALES',
    access_level: 'GLOBAL',
    access_value: '*',
    source: 'HR_SYSTEM',
    approved_by: 'cro@cs.com',
    effective_from: '2024-06-01',
    effective_to: null,
    granted_at: '2024-06-01T08:00:00Z',
    granted_by: 'hr_sync',
  },
  {
    user_name: 'dana@cs.com',
    domain: 'HR',
    access_level: 'DEPARTMENT',
    access_value: 'Engineering',
    source: 'OKTA',
    approved_by: 'chro@cs.com',
    effective_from: '2025-02-01',
    effective_to: null,
    granted_at: '2025-02-01T10:00:00Z',
    granted_by: 'scim_sync',
  },
  {
    user_name: 'eve@cs.com',
    domain: 'HR',
    access_level: 'EMPLOYEE',
    access_value: 'EMP-042',
    source: 'SCIM',
    approved_by: null,
    effective_from: '2025-04-01',
    effective_to: '2025-06-30',
    granted_at: '2025-04-01T11:45:00Z',
    granted_by: 'scim_sync',
  },
  {
    user_name: 'frank@cs.com',
    domain: 'FINANCE',
    access_level: 'GLOBAL',
    access_value: '*',
    source: 'MANUAL',
    approved_by: 'cfo@cs.com',
    effective_from: '2025-01-01',
    effective_to: null,
    granted_at: '2025-01-01T08:00:00Z',
    granted_by: 'cfo@cs.com',
  },
];
