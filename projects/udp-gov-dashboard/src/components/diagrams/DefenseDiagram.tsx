import React, { useState } from 'react';

interface CutLayer {
  color: string;
  borderColor: string;
  bgColor: string;
  numBg: string;
  name: string;
  sub: string;
  numContent: React.ReactNode;
}

const LAYERS: CutLayer[] = [
  {
    color: '#fb923c',
    borderColor: '#78350f',
    bgColor: '#fb923c',
    numBg: '#78350f55',
    name: 'CI/CD Gate',
    sub: 'dbt routing — blocks misconfigured promotions',
    numContent: <span style={{ color: '#fb923c' }}>1</span>,
  },
  {
    color: '#4ade80',
    borderColor: '#14532d',
    bgColor: '#4ade80',
    numBg: '#14532d55',
    name: 'Schema Inheritance',
    sub: 'Schema tags auto-cascade → every child object tagged',
    numContent: <span style={{ color: '#4ade80' }}>2</span>,
  },
  {
    color: '#60a5fa',
    borderColor: '#1e3a8a',
    bgColor: '#60a5fa',
    numBg: '#1e3a8a55',
    name: 'Tag-Based RAPs',
    sub: 'RAPs enforce on any tagged object — inherited or direct',
    numContent: <span style={{ color: '#60a5fa' }}>3</span>,
  },
  {
    color: '#f87171',
    borderColor: '#7f1d1d',
    bgColor: '#f87171',
    numBg: '#7f1d1d55',
    name: 'ENTITLEMENTS (PDP)',
    sub: 'Single source of truth — last line of defense',
    numContent: (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
];

interface CutDetail {
  content: React.ReactNode;
}

const CUT_DETAIL: CutDetail[] = [
  {
    content: (
      <>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
          Layer 1 — CI/CD Gate
        </p>
        <p style={{ fontSize: '0.75rem', color: '#bbb', lineHeight: 1.6, marginBottom: '0.25rem' }}>
          Outermost perimeter. dbt routing rules enforce correct schema placement at build time.
          A table that fails schema tests cannot be promoted — the pipeline blocks it before it
          ever reaches a governed schema.
        </p>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem', background: '#1a0f0a', color: '#fb923c', border: '1px solid #78350f55' }}>
          Build-time enforcement
        </span>
        <div style={{ fontSize: '0.68rem', color: '#fca5a5', marginTop: '0.4rem', padding: '0.5rem 0.7rem', background: '#1a0a0a', borderRadius: 6, border: '1px solid #7f1d1d44', lineHeight: 1.5 }}>
          <strong style={{ color: '#f87171', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>Blocks</strong>
          Unauthorized schema placement, misconfigured pipelines, accidental promotion of ungoverned assets
        </div>
      </>
    ),
  },
  {
    content: (
      <>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
          Layer 2 — Schema Inheritance
        </p>
        <p style={{ fontSize: '0.75rem', color: '#bbb', lineHeight: 1.6, marginBottom: '0.25rem' }}>
          <strong style={{ color: '#4ade80' }}>How tags get applied.</strong> Tags set on a governed
          schema automatically cascade to every child object — tables, views, columns. New objects
          inherit governance tags the instant they land, even before dbt posthook runs. This is the{' '}
          <em>coverage</em> mechanism: it ensures nothing exists untagged.
        </p>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem', background: '#0a1a0a', color: '#4ade80', border: '1px solid #14532d55' }}>
          Coverage — ensures every object is tagged
        </span>
        <div style={{ fontSize: '0.68rem', color: '#fca5a5', marginTop: '0.4rem', padding: '0.5rem 0.7rem', background: '#1a0a0a', borderRadius: 6, border: '1px solid #7f1d1d44', lineHeight: 1.5 }}>
          <strong style={{ color: '#f87171', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>Blocks</strong>
          Missing tags on new objects, forgotten manual tagging, protection gaps between table creation and dbt posthook
        </div>
      </>
    ),
  },
  {
    content: (
      <>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
          Layer 3 — Tag-Based RAPs
        </p>
        <p style={{ fontSize: '0.75rem', color: '#bbb', lineHeight: 1.6, marginBottom: '0.25rem' }}>
          <strong style={{ color: '#60a5fa' }}>What happens when a tag is present.</strong> RAPs bind
          to tags, not individual tables. Any object carrying a governance tag — whether inherited
          from its parent schema (Layer 2) or applied directly to the object — is automatically
          filtered at query time. Note: in Snowflake, CTAS creates a new table without inheriting
          the source&apos;s tags. If the CTAS target lands in a governed schema, schema inheritance
          (Layer 2) still applies its tags. Clones do preserve source table tags and RAPs. This is
          the <em>enforcement</em> mechanism.
        </p>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem', background: '#0a0f1a', color: '#60a5fa', border: '1px solid #1e3a8a55' }}>
          Enforcement — policies follow data, not objects
        </span>
        <div style={{ fontSize: '0.68rem', color: '#fca5a5', marginTop: '0.4rem', padding: '0.5rem 0.7rem', background: '#1a0a0a', borderRadius: 6, border: '1px solid #7f1d1d44', lineHeight: 1.5 }}>
          <strong style={{ color: '#f87171', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>Blocks</strong>
          Objects bearing a governance tag escaping row-level enforcement — whether the tag was schema-inherited (Layer 2) or directly applied
        </div>
      </>
    ),
  },
  {
    content: (
      <>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
          Layer 4 —{' '}
          <code style={{ color: '#f87171', background: '#7f1d1d33', fontFamily: 'SF Mono, Fira Code, monospace', fontSize: '0.92em', padding: '1px 5px', borderRadius: 3 }}>ENTITLEMENTS</code>{' '}
          (PDP)
        </p>
        <p style={{ fontSize: '0.75rem', color: '#bbb', lineHeight: 1.6, marginBottom: '0.25rem' }}>
          Innermost layer and single source of truth. All RAPs evaluate against this table at query
          time. Even if every outer layer fails,{' '}
          <code style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: '0.92em', background: '#ffffff0d', padding: '1px 5px', borderRadius: 3 }}>ENTITLEMENTS</code>{' '}
          still gates every query. This is the non-bypassable core.
        </p>
        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4, display: 'inline-block', marginTop: '0.25rem', background: '#1a0a0a', color: '#f87171', border: '1px solid #7f1d1d55' }}>
          Last line of defense
        </span>
        <div style={{ fontSize: '0.68rem', color: '#fca5a5', marginTop: '0.4rem', padding: '0.5rem 0.7rem', background: '#1a0a0a', borderRadius: 6, border: '1px solid #7f1d1d44', lineHeight: 1.5 }}>
          <strong style={{ color: '#f87171', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 2 }}>Blocks</strong>
          Direct table access bypassing all outer controls —{' '}
          <code style={{ fontFamily: 'SF Mono, Fira Code, monospace', fontSize: '0.92em', background: '#ffffff0d', padding: '1px 5px', borderRadius: 3 }}>ENTITLEMENTS</code>{' '}
          is the final gate at query evaluation time
        </div>
      </>
    ),
  },
];

/**
 * DefenseDiagram — interactive cutaway visualization of defense-in-depth layers.
 *
 * Renders four concentric defense layers as a vertical stack. Hover any layer to dim
 * the others and display detailed information about what that layer defends against.
 * Attack direction flows top → bottom (outermost → innermost).
 */
export function DefenseDiagram(): React.ReactElement {
  const [hovered, setHovered] = useState<number | null>(null);

  function layerOpacity(i: number): number {
    if (hovered === null) return 1;
    return hovered === i ? 1 : 0.2;
  }

  return (
    <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#0d0d0d', borderBottom: '1px solid #1a1a1a', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#ccc' }}>Defense-in-Depth — Layered Cutaway</span>
        <span style={{ fontSize: '0.65rem', color: '#888' }}>Attack penetration depth: top → bottom</span>
      </div>

      {/* Body: cutaway left, detail panel right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 380 }}>
        {/* Cutaway viz */}
        <div style={{ padding: '1.5rem 1.5rem 1.5rem 3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
            {/* Attack direction arrow */}
            <div style={{ position: 'absolute', left: -38, top: 30, bottom: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" opacity=".9">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '0.55rem', color: '#f87171', letterSpacing: '0.12em', fontWeight: 700, opacity: 0.9, whiteSpace: 'nowrap' }}>
                ATTACK DEPTH
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" opacity=".9">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>

            {/* Outermost perimeter label */}
            <div style={{ textAlign: 'center', padding: '0.35rem 0', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: '#f87171cc' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" opacity=".85" style={{ verticalAlign: 'middle', marginRight: 4 }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              OUTERMOST PERIMETER
            </div>

            {/* Layers */}
            {LAYERS.map((layer, i) => (
              <div
                key={i}
                onMouseEnter={() => setHovered(i)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '28px 1fr',
                  cursor: 'pointer',
                  transition: 'opacity 0.35s ease',
                  position: 'relative',
                  borderBottom: i < 3 ? '1px solid #1a1a1a' : 'none',
                  opacity: layerOpacity(i),
                }}
              >
                {/* Depth bar + dot */}
                <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'center', position: 'relative', color: layer.color }}>
                  <div style={{ width: 2, background: 'currentColor', opacity: 0.25 }} />
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                    width: 10, height: 10, borderRadius: '50%', border: `2px solid ${layer.color}`,
                    background: i === 3 ? '#1a0a0a' : '#111', zIndex: 1,
                  }} />
                </div>

                {/* Body */}
                <div style={{ padding: '0.8rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative' }}>
                  {/* Slab background */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: layer.bgColor,
                    opacity: hovered === i ? 0.18 : 0.06,
                    transition: 'opacity 0.3s',
                  }} />

                  {/* Number badge */}
                  <div style={{
                    fontSize: '0.58rem', fontWeight: 700, width: 20, height: 20, borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    position: 'relative', zIndex: 1, background: layer.numBg,
                  }}>
                    {layer.numContent}
                  </div>

                  {/* Info */}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: layer.color }}>
                      {i === 3 ? (
                        <>
                          <code style={{ color: '#f87171', background: '#7f1d1d33', fontFamily: 'SF Mono, Fira Code, monospace', fontSize: '0.92em', padding: '1px 5px', borderRadius: 3 }}>ENTITLEMENTS</code>{' '}
                          <span style={{ fontSize: '0.68rem', color: '#bbb' }}>(PDP)</span>
                        </>
                      ) : (
                        layer.name
                      )}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#999' }}>{layer.sub}</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Protected core label */}
            <div style={{ textAlign: 'center', padding: '0.35rem 0', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: '#4ade80cc' }}>
              PROTECTED CORE
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" opacity=".85" style={{ verticalAlign: 'middle', marginLeft: 4 }}>
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <div style={{ borderLeft: '1px solid #1a1a1a', padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {hovered !== null ? (
            CUT_DETAIL[hovered].content
          ) : (
            <p style={{ fontSize: '0.72rem', color: '#777', fontStyle: 'italic' }}>
              ← hover a layer to see what it defends
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
