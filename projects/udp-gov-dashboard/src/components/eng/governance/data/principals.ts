/**
 * Principal types — human, service, agent, and share actor definitions.
 *
 * New in Phase 0B. Consumed by the PrincipalSwitcher (Phase 3).
 */

export type Principal =
  | { kind: 'human';   userName: string; label: string }
  | { kind: 'service'; roleName: string; label: string }
  | { kind: 'agent';   onBehalfOf?: string; label: string }
  | { kind: 'share';   consumerAccount: string; label: string };

export const defaultPrincipals: Principal[] = [
  { kind: 'human',   userName: 'alice@cs.com',        label: 'Alice (human)' },
  { kind: 'service', roleName: 'DBT_SERVICE_ROLE',    label: 'dbt service' },
  { kind: 'agent',   onBehalfOf: 'alice@cs.com',      label: 'Cortex Agent (OBO alice)' },
  { kind: 'share',   consumerAccount: 'PARTNER_ACCT', label: 'Reader account' },
];
