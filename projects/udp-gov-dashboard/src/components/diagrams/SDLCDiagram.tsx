/**
 * SDLCDiagram — Developer SDLC dual-entrypoint flow diagram.
 *
 * Two paths (Lane A: ad-hoc, Lane B: CI/CD) converge on a governed schema.
 * Hover any node to reveal its detail panel. Hover is persistent (no reset on leave).
 */

import React, { useState } from 'react';

type SdlcKey = 'sandbox' | 'cortex' | 'write' | 'cicd' | 'promote' | 'governed' | 'live';

const CODE: React.CSSProperties = {
  fontFamily: 'SF Mono, Fira Code, monospace',
  fontSize: '0.92em',
  background: '#ffffff0d',
  padding: '1px 5px',
  borderRadius: 3,
};

const TAG_BASE: React.CSSProperties = {
  fontSize: '0.62rem',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 4,
  display: 'inline-block',
  marginTop: '0.25rem',
  alignSelf: 'flex-start',
};

const DETAIL_NAME: React.CSSProperties = {
  fontSize: '0.82rem',
  fontWeight: 700,
  color: '#fff',
  marginBottom: '0.4rem',
};

const DETAIL_TEXT: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#bbb',
  lineHeight: 1.6,
};

const SDLC_DATA: Record<SdlcKey, React.ReactNode> = {
  sandbox: (
    <>
      <p style={DETAIL_NAME}>Dev Sandbox</p>
      <p style={DETAIL_TEXT}>
        Developer creates tables, trains models, builds agents — full CRUD in a personal schema like{' '}
        <code style={CODE}>SANDBOX_ALICE</code>. Zero admin overhead, zero governance constraints while
        experimenting.
      </p>
      <span style={{ ...TAG_BASE, background: '#0a0f1a', color: '#60a5fa', border: '1px solid #1e3a8a55' }}>
        Lane A · Dev only
      </span>
    </>
  ),
  cortex: (
    <>
      <p style={DETAIL_NAME}>Cortex Copilot — Schema Router</p>
      <p style={DETAIL_TEXT}>
        When it's time to share, Cortex Copilot analyzes the table's data and identifies the correct governed
        schema based on security grain. Not a security gate — a routing guide that helps the developer find
        where the table belongs.
      </p>
      <span style={{ ...TAG_BASE, background: '#0a1a0a', color: '#4ade80', border: '1px solid #14532d55' }}>
        AI-assisted routing
      </span>
    </>
  ),
  write: (
    <>
      <p style={DETAIL_NAME}>Write to Schema</p>
      <p style={DETAIL_TEXT}>
        Developer writes the table into the governed schema in dev. The table lands in the correct location as
        identified by Cortex Copilot. At this point dbt picks it up — the posthook fires and adds governance
        metadata (tags) to the table automatically.
      </p>
      <span style={{ ...TAG_BASE, background: '#0f1a1a', color: '#22d3ee', border: '1px solid #0e749055' }}>
        dbt adds metadata on landing
      </span>
    </>
  ),
  cicd: (
    <>
      <p style={DETAIL_NAME}>CI/CD Pipeline</p>
      <p style={DETAIL_TEXT}>
        The canonical path. Developer writes dbt models in the pipeline repo. Schema placement, tag
        application, and promotion are all codified, version-controlled, and repeatable. This is the
        production-grade entrypoint.
      </p>
      <span style={{ ...TAG_BASE, background: '#1a0f1a', color: '#a78bfa', border: '1px solid #5b21b655' }}>
        Lane B · Canonical
      </span>
    </>
  ),
  promote: (
    <>
      <p style={DETAIL_NAME}>Promote — Schema Migration</p>
      <p style={DETAIL_TEXT}>
        CI/CD pipeline promotes the asset through environments (dev → staging → prod). Schema tests validate
        correct placement. dbt post-hooks apply tags automatically at each stage.
      </p>
      <span style={{ ...TAG_BASE, background: '#1a0f1a', color: '#a78bfa', border: '1px solid #5b21b655' }}>
        Pipeline stage
      </span>
    </>
  ),
  governed: (
    <>
      <p style={DETAIL_NAME}>Governed Schema</p>
      <p style={DETAIL_TEXT}>
        Both paths converge here. The dbt posthook fires on landing, applying tags automatically. Tag
        inheritance from the schema ensures every child object is immediately protected by Row Access Policies.
      </p>
      <span style={{ ...TAG_BASE, background: '#1a0f0a', color: '#fb923c', border: '1px solid #78350f55' }}>
        Merge point · dbt posthook
      </span>
    </>
  ),
  live: (
    <>
      <p style={DETAIL_NAME}>Live &amp; Governed</p>
      <p style={DETAIL_TEXT}>
        The asset is now governed. Row Access Policies evaluate <code style={CODE}>ENTITLEMENTS</code> at query
        time. The analyst sees only the rows they're entitled to — enforcement is invisible.
      </p>
      <span style={{ ...TAG_BASE, background: '#1a0a0a', color: '#f87171', border: '1px solid #7f1d1d55' }}>
        RLS active
      </span>
    </>
  ),
};

export function SDLCDiagram() {
  const [hovered, setHovered] = useState<SdlcKey | null>(null);

  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          background: '#0d0d0d',
          borderBottom: '1px solid #1a1a1a',
          padding: '0.6rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
        }}
      >
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ccc' }}>
          Developer SDLC — Two Paths to Governance
        </span>
        <span style={{ fontSize: '0.65rem', color: '#888' }}>Dual entrypoints converging on governed schema</span>
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', minHeight: 480 }}>
        {/* SVG pane */}
        <div
          style={{
            padding: '1.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            viewBox="0 0 520 280"
            preserveAspectRatio="xMidYMid meet"
            style={{ width: '100%', height: 'auto', maxHeight: 460 }}
          >
            <defs>
              <path id="sp-a" d="M 108,57 L 370,57 C 385,57 395,78 395,100" fill="none" />
              <path id="sp-b" d="M 108,197 L 250,197 C 320,197 395,158 395,140" fill="none" />
              <path id="sp-post" d="M 395,140 L 395,210 L 455,210" fill="none" />
              <filter id="gl2">
                <feGaussianBlur stdDeviation="2.5" result="g" />
                <feMerge>
                  <feMergeNode in="g" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Lane labels and backgrounds */}
            <text x="12" y="20" fill="#888" fontSize="7" fontWeight="700" letterSpacing=".1em">
              LANE A · DEV ONLY (AD-HOC)
            </text>
            <rect
              x="7" y="30" width="400" height="55" rx="8"
              fill="#60a5fa" fillOpacity=".03"
              stroke="#1e3a8a" strokeOpacity=".15" strokeWidth="1"
            />

            <text x="12" y="160" fill="#888" fontSize="7" fontWeight="700" letterSpacing=".1em">
              LANE B · CANONICAL (CI/CD)
            </text>
            <rect
              x="7" y="170" width="370" height="55" rx="8"
              fill="#a78bfa" fillOpacity=".03"
              stroke="#5b21b6" strokeOpacity=".15" strokeWidth="1"
            />

            {/* Lane A edges */}
            <line x1="108" y1="57" x2="155" y2="57" stroke="#60a5fa" strokeWidth="1.5" strokeOpacity=".55" />
            <line x1="238" y1="57" x2="277" y2="57" stroke="#4ade80" strokeWidth="1.5" strokeOpacity=".55" />
            <line x1="348" y1="57" x2="370" y2="57" stroke="#fb923c" strokeWidth="1.5" strokeOpacity=".55" />
            <path d="M 375,60 C 390,60 395,80 395,105" fill="none" stroke="#fb923c" strokeWidth="1.5" strokeOpacity=".55" />

            {/* Lane B edges */}
            <line x1="108" y1="197" x2="165" y2="197" stroke="#a78bfa" strokeWidth="1.5" strokeOpacity=".55" />
            <path d="M 250,197 C 320,197 395,160 395,140" fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeOpacity=".55" />

            {/* Post-merge edges */}
            <line x1="395" y1="140" x2="395" y2="210" stroke="#f87171" strokeWidth="1.5" strokeOpacity=".85" />
            <line x1="405" y1="210" x2="455" y2="210" stroke="#f87171" strokeWidth="1.5" strokeOpacity=".85" />

            {/* Animated pulses */}
            <circle r="3" fill="#60a5fa" filter="url(#gl2)">
              <animateMotion dur="4s" repeatCount="indefinite">
                <mpath href="#sp-a" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle r="3" fill="#a78bfa" filter="url(#gl2)">
              <animateMotion dur="3.2s" repeatCount="indefinite" begin="1.2s">
                <mpath href="#sp-b" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" dur="3.2s" repeatCount="indefinite" begin="1.2s" />
            </circle>
            <circle r="3" fill="#f87171" filter="url(#gl2)">
              <animateMotion dur="2s" repeatCount="indefinite" begin="2.2s">
                <mpath href="#sp-post" />
              </animateMotion>
              <animate attributeName="opacity" values="0;1;1;0" dur="2s" repeatCount="indefinite" begin="2.2s" />
            </circle>

            {/* Lane A nodes */}
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('sandbox')}>
              <rect x="18" y="35" width="90" height="44" rx="8" fill="#0a0f1a" stroke="#1e3a8a" strokeWidth="1.5" />
              <text x="63" y="52" textAnchor="middle" fill="#60a5fa" fontSize="8" fontWeight="700">SANDBOX</text>
              <text x="63" y="63" textAnchor="middle" fill="#999" fontSize="6">Build tables, models,</text>
              <text x="63" y="72" textAnchor="middle" fill="#999" fontSize="6">agents, etc.</text>
            </g>
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('cortex')}>
              <rect x="155" y="35" width="84" height="44" rx="8" fill="#0a1a0a" stroke="#14532d" strokeWidth="1.5" />
              <text x="197" y="50" textAnchor="middle" fill="#4ade80" fontSize="8" fontWeight="700">CORTEX</text>
              <text x="197" y="60" textAnchor="middle" fill="#4ade80" fontSize="7">COPILOT</text>
              <text x="197" y="72" textAnchor="middle" fill="#999" fontSize="6">Find right schema</text>
            </g>
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('write')}>
              <rect x="277" y="35" width="72" height="44" rx="8" fill="#0f1a1a" stroke="#0e7490" strokeWidth="1.5" />
              <text x="313" y="52" textAnchor="middle" fill="#22d3ee" fontSize="8" fontWeight="700">WRITE</text>
              <text x="313" y="63" textAnchor="middle" fill="#999" fontSize="6">Table to schema</text>
              <text x="313" y="72" textAnchor="middle" fill="#999" fontSize="6">in dev</text>
            </g>

            {/* Lane B nodes */}
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('cicd')}>
              <rect x="18" y="175" width="90" height="44" rx="8" fill="#1a0f1a" stroke="#5b21b6" strokeWidth="1.5" />
              <text x="63" y="193" textAnchor="middle" fill="#a78bfa" fontSize="8" fontWeight="700">CI/CD</text>
              <text x="63" y="205" textAnchor="middle" fill="#999" fontSize="6">dbt pipeline</text>
            </g>
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('promote')}>
              <rect x="165" y="175" width="86" height="44" rx="8" fill="#1a0f1a" stroke="#5b21b6" strokeWidth="1.5" />
              <text x="208" y="193" textAnchor="middle" fill="#a78bfa" fontSize="8" fontWeight="700">PROMOTE</text>
              <text x="208" y="205" textAnchor="middle" fill="#999" fontSize="6">Schema migration</text>
            </g>

            {/* Merge: Governed Schema */}
            <text x="395" y="95" textAnchor="middle" fill="#666" fontSize="5.5" fontStyle="italic">
              both paths merge
            </text>
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('governed')}>
              <rect x="350" y="100" width="90" height="50" rx="10" fill="#3a2418" stroke="#b45309" strokeWidth="2" />
              <text x="395" y="118" textAnchor="middle" fill="#fb923c" fontSize="8" fontWeight="700">GOVERNED</text>
              <text x="395" y="130" textAnchor="middle" fill="#fb923c" fontSize="7">SCHEMA</text>
              <text x="395" y="143" textAnchor="middle" fill="#999" fontSize="6">dbt posthook → tags</text>
            </g>

            {/* Post: Live */}
            <g style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered('live')}>
              <rect x="455" y="192" width="55" height="38" rx="8" fill="#3a1818" stroke="#991b1b" strokeWidth="1.5" />
              <text x="482" y="207" textAnchor="middle" fill="#f87171" fontSize="8" fontWeight="700">LIVE</text>
              <text x="482" y="219" textAnchor="middle" fill="#999" fontSize="6">Governed</text>
            </g>
          </svg>
        </div>

        {/* Detail panel */}
        <div
          style={{
            borderLeft: '1px solid #1a1a1a',
            padding: '1.25rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          {hovered ? (
            SDLC_DATA[hovered]
          ) : (
            <p style={{ fontSize: '0.72rem', color: '#777', fontStyle: 'italic' }}>
              ← hover a step to see its role
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
