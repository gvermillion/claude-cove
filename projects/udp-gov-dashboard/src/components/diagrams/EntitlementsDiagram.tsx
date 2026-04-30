import React, { useState } from 'react';

interface EntNode {
  content: React.ReactNode;
  edges: string[];
}

const ENT_DATA_ENG: Record<string, EntNode> = {
  okta: {
    content: (
      <>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
          Okta — Identity Source
        </p>
        <p style={{ fontSize: '0.75rem', color: '#bbb', lineHeight: 1.6, marginBottom: '0.25rem' }}>
          Group memberships and role assignments flow automatically from Okta into{' '}
          <code style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: '0.92em', background: '#ffffff0d', padding: '1px 5px', borderRadius: 3 }}>ENTITLEMENTS</code>.
          When a user&apos;s Okta group changes, their data access updates without manual intervention.
        </p>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem', background: '#0a1a0a', color: '#4ade80', border: '1px solid #14532d55' }}>
          Automated via ELT
        </span>
        <div style={{ marginTop: '0.5rem', padding: '0.6rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8 }}>
          <p style={{ fontSize: '0.58rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>Sequence</p>
          <svg viewBox="0 0 260 80" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <marker id="arr-g" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4" fill="#4ade80" />
              </marker>
              <marker id="arr-o" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4" fill="#fb923c" />
              </marker>
            </defs>
            <text x="30" y="12" fill="#4ade80" fontSize="8" fontWeight="700" textAnchor="middle">Okta</text>
            <line x1="30" y1="18" x2="30" y2="75" stroke="#4ade8066" strokeWidth="1" />
            <text x="130" y="12" fill="#888" fontSize="8" fontWeight="700" textAnchor="middle">ELT</text>
            <line x1="130" y1="18" x2="130" y2="75" stroke="#88888844" strokeWidth="1" />
            <text x="230" y="12" fill="#f87171" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="SF Mono,monospace">ENTITLEMENTS</text>
            <line x1="230" y1="18" x2="230" y2="75" stroke="#f8717144" strokeWidth="1" />
            <line x1="30" y1="32" x2="124" y2="32" stroke="#4ade80" strokeWidth="1" markerEnd="url(#arr-g)" />
            <text x="80" y="28" fill="#bbb" fontSize="6" textAnchor="middle">group change event</text>
            <line x1="130" y1="48" x2="224" y2="48" stroke="#fb923c" strokeWidth="1" markerEnd="url(#arr-o)" />
            <text x="180" y="44" fill="#bbb" fontSize="6" textAnchor="middle">MERGE INTO</text>
            <line x1="230" y1="64" x2="136" y2="64" stroke="#888" strokeWidth="1" strokeDasharray="3 2" />
            <text x="180" y="60" fill="#888" fontSize="6" textAnchor="middle">rows affected</text>
          </svg>
        </div>
      </>
    ),
    edges: ['edge-okta'],
  },
  sf: {
    content: (
      <>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
          Salesforce — Account Mapping
        </p>
        <p style={{ fontSize: '0.75rem', color: '#bbb', lineHeight: 1.6, marginBottom: '0.25rem' }}>
          Customer-to-region and account ownership mappings sync from Salesforce. Sales territory
          changes cascade into governance automatically — no security ticket required.
        </p>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem', background: '#0a0f1a', color: '#60a5fa', border: '1px solid #1e3a8a55' }}>
          Automated via ELT
        </span>
        <div style={{ marginTop: '0.5rem', padding: '0.6rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8 }}>
          <p style={{ fontSize: '0.58rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>Sequence</p>
          <svg viewBox="0 0 260 80" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <marker id="arr-b" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4" fill="#60a5fa" />
              </marker>
              <marker id="arr-o2" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4" fill="#fb923c" />
              </marker>
            </defs>
            <text x="30" y="12" fill="#60a5fa" fontSize="8" fontWeight="700" textAnchor="middle">Salesforce</text>
            <line x1="30" y1="18" x2="30" y2="75" stroke="#60a5fa66" strokeWidth="1" />
            <text x="130" y="12" fill="#888" fontSize="8" fontWeight="700" textAnchor="middle">ELT</text>
            <line x1="130" y1="18" x2="130" y2="75" stroke="#88888844" strokeWidth="1" />
            <text x="230" y="12" fill="#f87171" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="SF Mono,monospace">ENTITLEMENTS</text>
            <line x1="230" y1="18" x2="230" y2="75" stroke="#f8717144" strokeWidth="1" />
            <line x1="30" y1="32" x2="124" y2="32" stroke="#60a5fa" strokeWidth="1" markerEnd="url(#arr-b)" />
            <text x="80" y="28" fill="#bbb" fontSize="6" textAnchor="middle">territory update</text>
            <line x1="130" y1="48" x2="224" y2="48" stroke="#fb923c" strokeWidth="1" markerEnd="url(#arr-o2)" />
            <text x="180" y="44" fill="#bbb" fontSize="6" textAnchor="middle">MERGE INTO</text>
            <line x1="230" y1="64" x2="136" y2="64" stroke="#888" strokeWidth="1" strokeDasharray="3 2" />
            <text x="180" y="60" fill="#888" fontSize="6" textAnchor="middle">rows affected</text>
          </svg>
        </div>
      </>
    ),
    edges: ['edge-sf'],
  },
  'future-src': {
    content: (
      <>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
          Future Source
        </p>
        <p style={{ fontSize: '0.75rem', color: '#bbb', lineHeight: 1.6, marginBottom: '0.25rem' }}>
          The architecture is extensible. Any identity or business system can feed{' '}
          <code style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: '0.92em', background: '#ffffff0d', padding: '1px 5px', borderRadius: 3 }}>ENTITLEMENTS</code>{' '}
          via the same ELT pattern — HRIS, custom apps, partner portals.
        </p>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem', background: '#222', color: '#bbb', border: '1px solid #33333388' }}>
          Extensible
        </span>
      </>
    ),
    edges: ['edge-future-src'],
  },
  pdp: {
    content: (
      <>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
          <code style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: '0.92em', background: '#ffffff0d', padding: '1px 5px', borderRadius: 3 }}>ENTITLEMENTS</code> — Policy Decision Point
        </p>
        <p style={{ fontSize: '0.75rem', color: '#bbb', lineHeight: 1.6, marginBottom: '0.25rem' }}>
          The single source of truth. Fed by Okta + Salesforce. Every PEP reads from this one
          canonical table. Adding a new enforcement point requires only a lookup here.
        </p>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem', background: '#1a0a0a', color: '#f87171', border: '1px solid #7f1d1d55' }}>
          Single source of truth
        </span>
        <div style={{ marginTop: '0.5rem', padding: '0.6rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8 }}>
          <p style={{ fontSize: '0.58rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>Example Table</p>
          <table style={{ fontSize: '0.62rem', borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {['user', 'access_level', 'access_value', 'source'].map((h) => (
                  <th key={h} style={{ background: '#1a1a1a', color: '#ccc', padding: '3px 6px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #2a2a2a' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>alice@cs.com</td>
                <td style={{ padding: '3px 6px', color: '#60a5fa', borderBottom: '1px solid #1a1a1a' }}>REGION</td>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>West</td>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>Okta</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>bob@cs.com</td>
                <td style={{ padding: '3px 6px', color: '#fb923c', borderBottom: '1px solid #1a1a1a' }}>OPPORTUNITY</td>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>OPP-001</td>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>SFDC</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>carol@cs.com</td>
                <td style={{ padding: '3px 6px', color: '#a78bfa', borderBottom: '1px solid #1a1a1a' }}>GLOBAL</td>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>*</td>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>Okta</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>dana@cs.com</td>
                <td style={{ padding: '3px 6px', color: '#60a5fa', borderBottom: '1px solid #1a1a1a' }}>REGION</td>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>East</td>
                <td style={{ padding: '3px 6px', color: '#999', borderBottom: '1px solid #1a1a1a' }}>Okta</td>
              </tr>
              <tr>
                <td style={{ padding: '3px 6px', color: '#666' }}>…</td>
                <td style={{ padding: '3px 6px', color: '#666' }}>…</td>
                <td style={{ padding: '3px 6px', color: '#666' }}>…</td>
                <td style={{ padding: '3px 6px', color: '#666' }}>…</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    ),
    edges: ['edge-okta', 'edge-sf', 'edge-snow', 'edge-cloud'],
  },
  snow: {
    content: (
      <>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
          Snowflake — Row Access Policies
        </p>
        <p style={{ fontSize: '0.75rem', color: '#bbb', lineHeight: 1.6, marginBottom: '0.25rem' }}>
          RAPs attached to tags inspect{' '}
          <code style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: '0.92em', background: '#ffffff0d', padding: '1px 5px', borderRadius: 3 }}>ENTITLEMENTS</code>{' '}
          at query time. Enforcement is invisible to analysts — they see only the rows they&apos;re entitled to.
        </p>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem', background: '#0a0f1a', color: '#60a5fa', border: '1px solid #1e3a8a55' }}>
          PEP: Row-level filtering
        </span>
        <div style={{ marginTop: '0.5rem', padding: '0.6rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: 8 }}>
          <p style={{ fontSize: '0.58rem', color: '#777', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>Sequence</p>
          <svg viewBox="0 0 260 80" style={{ width: '100%', height: 'auto' }}>
            <defs>
              <marker id="arr-b3" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4" fill="#60a5fa" />
              </marker>
              <marker id="arr-r" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4" fill="#f87171" />
              </marker>
              <marker id="arr-g3" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                <path d="M0,0 L6,2 L0,4" fill="#4ade80" />
              </marker>
            </defs>
            <text x="30" y="12" fill="#60a5fa" fontSize="8" fontWeight="700" textAnchor="middle">Analyst</text>
            <line x1="30" y1="18" x2="30" y2="75" stroke="#60a5fa66" strokeWidth="1" />
            <text x="130" y="12" fill="#60a5fa" fontSize="8" fontWeight="700" textAnchor="middle">Snowflake</text>
            <line x1="130" y1="18" x2="130" y2="75" stroke="#60a5fa44" strokeWidth="1" />
            <text x="230" y="12" fill="#f87171" fontSize="8" fontWeight="700" textAnchor="middle" fontFamily="SF Mono,monospace">ENTITLEMENTS</text>
            <line x1="230" y1="18" x2="230" y2="75" stroke="#f8717144" strokeWidth="1" />
            <line x1="30" y1="32" x2="124" y2="32" stroke="#60a5fa" strokeWidth="1" markerEnd="url(#arr-b3)" />
            <text x="80" y="28" fill="#bbb" fontSize="6" textAnchor="middle">SELECT *</text>
            <line x1="130" y1="48" x2="224" y2="48" stroke="#f87171" strokeWidth="1" markerEnd="url(#arr-r)" />
            <text x="180" y="44" fill="#bbb" fontSize="6" textAnchor="middle">RAP lookup</text>
            <line x1="130" y1="64" x2="36" y2="64" stroke="#4ade80" strokeWidth="1" markerEnd="url(#arr-g3)" />
            <text x="80" y="60" fill="#bbb" fontSize="6" textAnchor="middle">filtered rows only</text>
          </svg>
        </div>
      </>
    ),
    edges: ['edge-snow'],
  },
  cloud: {
    content: (
      <>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
          Cloud &amp; AI — S3 · Bedrock
        </p>
        <p style={{ fontSize: '0.75rem', color: '#bbb', lineHeight: 1.6, marginBottom: '0.25rem' }}>
          IAM / Lake Formation gate S3 data access. Bedrock guardrails scope AI context windows.
          Both consume{' '}
          <code style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: '0.92em', background: '#ffffff0d', padding: '1px 5px', borderRadius: 3 }}>ENTITLEMENTS</code>{' '}
          — the same region filter governing a dashboard query also governs a chatbot&apos;s context window.
        </p>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem', background: '#1a0f0a', color: '#fb923c', border: '1px solid #78350f55' }}>
          PEP: Data &amp; model access
        </span>
      </>
    ),
    edges: ['edge-cloud'],
  },
  'future-pep': {
    content: (
      <>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
          Future PEP
        </p>
        <p style={{ fontSize: '0.75rem', color: '#bbb', lineHeight: 1.6, marginBottom: '0.25rem' }}>
          Any enforcement point that reads from{' '}
          <code style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: '0.92em', background: '#ffffff0d', padding: '1px 5px', borderRadius: 3 }}>ENTITLEMENTS</code>{' '}
          can be added to the architecture. A new PEP requires only a lookup query — the access
          logic is already encoded in the PDP.
        </p>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem', background: '#222', color: '#bbb', border: '1px solid #33333388' }}>
          Extensible
        </span>
      </>
    ),
    edges: ['edge-future-pep'],
  },
};

const ENT_DATA_EXEC: typeof ENT_DATA_ENG = {
  okta: {
    edges: ENT_DATA_ENG.okta.edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">Identity input.</span>{' '}
          Who works here, and what teams they belong to.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Owned by IT/IAM. Already maintained today as part of standard SSO
          provisioning — governance reuses it.
        </p>
      </>
    ),
  },
  sf: {
    edges: ENT_DATA_ENG.sf.edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">Ownership input.</span>{' '}
          Which records belong to which person or team.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Owned by Sales Ops and Domain Stewards. Already maintained as part of
          day-to-day account management — governance reuses it.
        </p>
      </>
    ),
  },
  'future-src': {
    edges: ENT_DATA_ENG['future-src'].edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">Any future identity or ownership system.</span>{' '}
          New HR systems, partner directories, ticketing platforms.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Adding a new source feeds the same central rule book — every existing
          enforcement point inherits the change automatically.
        </p>
      </>
    ),
  },
  pdp: {
    edges: ENT_DATA_ENG.pdp.edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">The single rule book.</span>{' '}
          One canonical source of truth for who can see what.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Every enforcement point — Snowflake, S3, AI agents — reads from here.
          Change a rule once; it propagates everywhere.
        </p>
      </>
    ),
  },
  snow: {
    edges: ENT_DATA_ENG.snow.edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">Snowflake — analyst access.</span>{' '}
          Dashboards and queries respect the rule book at query time.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Invisible to the analyst. They write a query; the platform filters
          the rows they&apos;re not entitled to see.
        </p>
      </>
    ),
  },
  cloud: {
    edges: ENT_DATA_ENG.cloud.edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">AWS — services and data lakes.</span>{' '}
          The same rule book governs S3 buckets and cloud workloads.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          One identity, one rule book — applied consistently across the cloud
          estate.
        </p>
      </>
    ),
  },
  'future-pep': {
    edges: ENT_DATA_ENG['future-pep'].edges,
    content: (
      <>
        <p className="text-sm text-gray-300 leading-relaxed">
          <span className="text-white font-semibold">Any future enforcement point.</span>{' '}
          A new BI tool, a custom service, an AI agent.
        </p>
        <p className="text-xs text-gray-500 leading-relaxed mt-3">
          Plug it in and it inherits every existing access rule on day one.
          No parallel governance system to build.
        </p>
      </>
    ),
  },
};

const ALL_ENT_EDGES = ['edge-okta', 'edge-sf', 'edge-future-src', 'edge-snow', 'edge-cloud', 'edge-future-pep'];

const FUTURE_NODE_MAP: Record<string, string> = {
  'future-src': 'future-src',
  'future-pep': 'future-pep',
};

type EntMode = 'exec' | 'eng';

interface EntitlementsDiagramProps {
  mode?: EntMode;
}

/**
 * EntitlementsDiagram — interactive SVG visualization of the governance automation pipeline.
 *
 * Shows Sources (Okta, Salesforce) feeding the ENTITLEMENTS PDP, which drives all PEPs.
 * Hover any node to highlight its edges and show a detail panel with sequence diagrams.
 *
 * @param mode - 'eng' (default) shows technical detail; 'exec' shows business narrative.
 */
export const EntitlementsDiagram: React.FC<EntitlementsDiagramProps> = ({
  mode = 'eng',
}) => {
  const ENT_DATA = mode === 'exec' ? ENT_DATA_EXEC : ENT_DATA_ENG;
  const [hovered, setHovered] = useState<string | null>(null);

  function edgeOpacity(id: string, base = 0.5): number {
    if (!hovered) return base;
    const active = ENT_DATA[hovered]?.edges ?? [];
    return active.includes(id) ? 1.0 : 0.25;
  }

  function edgeWidth(id: string): number {
    if (!hovered) return 1.5;
    const active = ENT_DATA[hovered]?.edges ?? [];
    return active.includes(id) ? 2.5 : 1.2;
  }

  function futureOpacity(nodeKey: 'future-src' | 'future-pep'): number {
    if (!hovered) return 0.55;
    if (hovered === nodeKey) return 1.0;
    if (FUTURE_NODE_MAP[hovered] === nodeKey) return 1.0;
    return 0.35;
  }

  function futureSrcEdgeBase(): number {
    if (!hovered) return 0.3;
    const active = ENT_DATA[hovered]?.edges ?? [];
    return active.includes('edge-future-src') ? 1.0 : 0.2;
  }

  function futurePepEdgeBase(): number {
    if (!hovered) return 0.3;
    const active = ENT_DATA[hovered]?.edges ?? [];
    return active.includes('edge-future-pep') ? 1.0 : 0.2;
  }

  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#0d0d0d', borderBottom: '1px solid #1a1a1a', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ccc' }}>Governance Automation Pipeline</span>
        {mode === 'eng' && (
          <span style={{ fontSize: '0.65rem', color: '#888' }}>Sources → PDP → PEPs</span>
        )}
        {mode === 'exec' && (
          <span style={{ fontSize: '0.65rem', color: '#888' }}>Identity sources → unified rule book → enforced everywhere</span>
        )}
      </div>

      {/* Body: SVG left, detail panel right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 320 }}>
        {/* SVG viz */}
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg viewBox="0 0 420 325" style={{ width: '100%', maxWidth: 420, height: 325 }}>
            <defs>
              <path id="path-okta" d="M 100,48 C 100,90 210,90 210,130" fill="none" />
              <path id="path-sf" d="M 320,48 C 320,90 210,90 210,130" fill="none" />
              <path id="path-snow" d="M 210,190 C 210,225 65,248 65,268" fill="none" />
              <path id="path-cloud" d="M 210,190 C 210,215 202,248 202,268" fill="none" />
              <filter id="gl">
                <feGaussianBlur stdDeviation="3" result="g" />
                <feMerge>
                  <feMergeNode in="g" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Edges: Sources → PDP */}
            <path
              d="M 100,48 C 100,90 210,90 210,130"
              fill="none"
              stroke="#22c55e"
              strokeWidth={edgeWidth('edge-okta')}
              strokeOpacity={edgeOpacity('edge-okta')}
            />
            <path
              d="M 320,48 C 320,90 210,90 210,130"
              fill="none"
              stroke="#3b82f6"
              strokeWidth={edgeWidth('edge-sf')}
              strokeOpacity={edgeOpacity('edge-sf')}
            />
            <path
              d="M 210,34 L 210,130"
              fill="none"
              stroke="#888"
              strokeWidth={edgeWidth('edge-future-src')}
              strokeDasharray="4 4"
              strokeOpacity={futureSrcEdgeBase()}
            />

            {/* Edges: PDP → PEPs */}
            <path
              d="M 210,190 C 210,225 65,248 65,268"
              fill="none"
              stroke="#3b82f6"
              strokeWidth={edgeWidth('edge-snow')}
              strokeOpacity={edgeOpacity('edge-snow')}
            />
            <path
              d="M 210,190 C 210,215 202,248 202,268"
              fill="none"
              stroke="#fb923c"
              strokeWidth={edgeWidth('edge-cloud')}
              strokeOpacity={edgeOpacity('edge-cloud')}
            />
            <path
              d="M 210,190 C 230,230 320,248 320,268"
              fill="none"
              stroke="#888"
              strokeWidth={edgeWidth('edge-future-pep')}
              strokeDasharray="4 4"
              strokeOpacity={futurePepEdgeBase()}
            />

            {/* Traveling pulses */}
            <circle r="3.5" fill="#4ade80" filter="url(#gl)">
              <animateMotion dur="2.5s" repeatCount="indefinite">
                <mpath href="#path-okta" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" dur="2.5s" repeatCount="indefinite" />
            </circle>
            <circle r="3.5" fill="#60a5fa" filter="url(#gl)">
              <animateMotion dur="2.8s" repeatCount="indefinite" begin="0.4s">
                <mpath href="#path-sf" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" dur="2.8s" repeatCount="indefinite" begin="0.4s" />
            </circle>
            <circle r="3" fill="#60a5fa" filter="url(#gl)">
              <animateMotion dur="2.2s" repeatCount="indefinite" begin="0.8s">
                <mpath href="#path-snow" />
              </animateMotion>
              <animate attributeName="opacity" values="0;.9;.9;0" dur="2.2s" repeatCount="indefinite" begin="0.8s" />
            </circle>
            <circle r="3" fill="#fb923c" filter="url(#gl)">
              <animateMotion dur="2.3s" repeatCount="indefinite" begin="1.4s">
                <mpath href="#path-cloud" />
              </animateMotion>
              <animate attributeName="opacity" values="0;.9;.9;0" dur="2.3s" repeatCount="indefinite" begin="1.4s" />
            </circle>

            {/* Source nodes */}
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('okta')}>
              <rect x="50" y="24" width="100" height="40" rx="8" fill="#0f2a0f" stroke="#16a34a" strokeWidth="1.5" />
              <text x="100" y="41" textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="700">OKTA</text>
              <text x="100" y="54" textAnchor="middle" fill="#bbb" fontSize="7">Identity Groups</text>
            </g>
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('sf')}>
              <rect x="270" y="24" width="100" height="40" rx="8" fill="#0f1530" stroke="#2563eb" strokeWidth="1.5" />
              <text x="320" y="41" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="700">SALESFORCE</text>
              <text x="320" y="54" textAnchor="middle" fill="#bbb" fontSize="7">Account Mapping</text>
            </g>
            <g
              style={{ cursor: 'pointer', opacity: futureOpacity('future-src') }}
              onMouseEnter={() => setHovered('future-src')}
            >
              <rect x="175" y="0" width="70" height="34" rx="6" fill="none" stroke="#888" strokeWidth="1" strokeDasharray="3 3" />
              <text x="210" y="15" textAnchor="middle" fill="#888" fontSize="7" fontWeight="600">FUTURE</text>
              <text x="210" y="27" textAnchor="middle" fill="#888" fontSize="6">e.g. HRIS</text>
            </g>

            {/* PDP center */}
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('pdp')}>
              <rect x="135" y="130" width="150" height="60" rx="12" fill="#1a0f0f" stroke="#dc2626" strokeWidth="2" />
              <rect x="135" y="130" width="150" height="60" rx="12" fill="none" stroke="#ef4444" strokeWidth="1" opacity=".15">
                <animate attributeName="opacity" values=".05;.25;.05" dur="3s" repeatCount="indefinite" />
              </rect>
              <text x="210" y="150" textAnchor="middle" fill="#f87171" fontSize="10" fontWeight="700" letterSpacing=".5" fontFamily="SF Mono, Fira Code, monospace">ENTITLEMENTS</text>
              <text x="210" y="166" textAnchor="middle" fill="#bbb" fontSize="7.5">Policy Decision Point (PDP)</text>
              <text x="210" y="180" textAnchor="middle" fill="#888" fontSize="6.5">Single source of truth</text>
            </g>

            {/* PEP nodes */}
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('snow')}>
              <rect x="15" y="268" width="100" height="44" rx="8" fill="#0f1530" stroke="#2563eb" strokeWidth="1.5" />
              <text x="65" y="286" textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="700">SNOWFLAKE</text>
              <text x="65" y="300" textAnchor="middle" fill="#bbb" fontSize="7">Row Access Policies</text>
            </g>
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('cloud')}>
              <rect x="145" y="268" width="115" height="44" rx="8" fill="#1a1208" stroke="#d97706" strokeWidth="1.5" />
              <text x="202" y="283" textAnchor="middle" fill="#fb923c" fontSize="9" fontWeight="700">CLOUD &amp; AI</text>
              <text x="202" y="296" textAnchor="middle" fill="#bbb" fontSize="7">S3 · Bedrock</text>
              <text x="202" y="307" textAnchor="middle" fill="#bbb" fontSize="7">IAM / Guardrails</text>
            </g>
            <g
              style={{ cursor: 'pointer', opacity: futureOpacity('future-pep') }}
              onMouseEnter={() => setHovered('future-pep')}
            >
              <rect x="280" y="268" width="80" height="44" rx="8" fill="none" stroke="#888" strokeWidth="1" strokeDasharray="3 3" />
              <text x="320" y="287" textAnchor="middle" fill="#888" fontSize="7" fontWeight="600">FUTURE</text>
              <text x="320" y="300" textAnchor="middle" fill="#888" fontSize="6">e.g. API Gateway</text>
            </g>

            {/* Row labels */}
            <text x="8" y="46" fill="#666" fontSize="6.5" fontWeight="600">SOURCES</text>
            <text x="8" y="163" fill="#666" fontSize="6.5" fontWeight="600">PDP</text>
            <text x="8" y="260" fill="#666" fontSize="6.5" fontWeight="600">PEPs</text>
          </svg>
        </div>

        {/* Detail panel */}
        <div style={{ borderLeft: '1px solid #1a1a1a', padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {hovered && ENT_DATA[hovered] ? (
            ENT_DATA[hovered].content
          ) : (
            <p style={{ fontSize: '0.72rem', color: '#777', fontStyle: 'italic' }}>
              ← hover any node to see how it connects
            </p>
          )}
        </div>
      </div>

      {/* Invisible reset zone — mouseLeave on outermost container would require onMouseLeave on wrapper */}
      {/* Hover is persistent per spec: no mouseleave needed */}
    </div>
  );
}

// Silence unused import warning — ALL_ENT_EDGES used in type narrowing context only
void ALL_ENT_EDGES;
