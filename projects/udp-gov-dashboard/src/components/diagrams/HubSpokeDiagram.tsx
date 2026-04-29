import React, { useState } from 'react';
import { Database, Cloud, Bot, Snowflake, Plus } from 'lucide-react';
import { DetailPanel, C } from '../primitives';
import type { Mode } from '../ModeToggle';

interface SpokeNode {
  id: string;
  label: string;
  sublabel: string;
  color: 'blue' | 'amber' | 'red' | 'gray';
  icon: React.ElementType;
  dashed?: boolean;
  pos: { top: string; left: string };
  line: { x: number; y: number };
  /** Engineering-altitude detail panel content. */
  detailEng: React.ReactNode;
  /** Exec-altitude detail panel content. */
  detailExec: React.ReactNode;
  /** Engineering-only fields, rendered only in eng mode. */
  mechanism?: string;
  reads?: string;
  failClosed?: string;
}

const spokeNodes: SpokeNode[] = [
  {
    id: 'snowflake',
    label: 'Snowflake',
    sublabel: 'Row Access Policies',
    color: 'blue',
    icon: Snowflake,
    pos: { top: '10%', left: '20%' },
    line: { x: -140, y: -100 },
    mechanism: 'Tag-based Row Access Policies evaluated at query time.',
    reads:
      'USER_ENTITLEMENTS, DATA_DOMAIN, SENSITIVITY_LEVEL tags — joined via CURRENT_ROLE() and session context.',
    failClosed:
      'If ENTITLEMENTS is unavailable, the RAP returns zero rows. No silent data leak — fail-closed by default.',
    detailEng: (
      <>
        RAPs attached to Tags. The RAP inspects <C>ENTITLEMENTS</C> at query
        time — no manual join required. Enforcement is invisible to the
        analyst. Primary enforcement point for structured analytics.
      </>
    ),
    detailExec: (
      <>
        Snowflake — where analysts run dashboards and queries. Access rules
        apply automatically; analysts never see data they aren't entitled to.
      </>
    ),
  },
  {
    id: 's3',
    label: 'AWS S3',
    sublabel: 'IAM / Lake Formation',
    color: 'amber',
    icon: Cloud,
    pos: { top: '10%', left: '80%' },
    line: { x: 140, y: -100 },
    mechanism:
      'IAM policies + Lake Formation permissions consuming ENTITLEMENTS via S3 mirror.',
    reads:
      'Mirrored ENTITLEMENTS parquet files or API endpoint — same columns (USER_ID, DATA_DOMAIN, REGION).',
    failClosed:
      'Lake Formation denies by default. If the mirror is stale, the last-known entitlements apply — never a permissive fallback.',
    detailEng: (
      <>
        IAM policies and Lake Formation permissions consume the same{' '}
        <C>ENTITLEMENTS</C> data via S3 mirror or API. S3 bucket policies
        enforce row/column-level access using the same identity-to-data mapping.
      </>
    ),
    detailExec: (
      <>
        AWS S3 — data lakes and cloud services. The same rule book governs who
        can read which buckets and which rows inside them.
      </>
    ),
  },
  {
    id: 'bedrock',
    label: 'Bedrock',
    sublabel: 'Guardrails / Context',
    color: 'red',
    icon: Bot,
    pos: { top: '85%', left: '20%' },
    line: { x: -140, y: 100 },
    mechanism:
      'AI guardrails and context-window scoping via ENTITLEMENTS lookup before inference.',
    reads:
      'Same ENTITLEMENTS columns — the agent resolves the caller identity and filters context to entitled data only.',
    failClosed:
      'If ENTITLEMENTS is unreachable, the agent refuses to answer data questions. No hallucinated access grants.',
    detailEng: (
      <>
        AI agents look up <C>ENTITLEMENTS</C> to scope context windows and
        guardrails. The same "Region = West" filter applies to a chatbot as to
        a dashboard. Prevents AI agents from surfacing data the user isn't
        entitled to see.
      </>
    ),
    detailExec: (
      <>
        AI agents and copilots. The same access rules constrain what the AI
        can pull into context — a chatbot is held to the same data perimeter
        as a dashboard.
      </>
    ),
  },
  {
    id: 'future',
    label: 'Future PEP',
    sublabel: 'Any platform',
    color: 'gray',
    icon: Plus,
    dashed: true,
    pos: { top: '85%', left: '80%' },
    line: { x: 140, y: 100 },
    mechanism: 'Any platform that can query a table or call an API.',
    reads:
      'Standard ENTITLEMENTS schema — USER_ID, DATA_DOMAIN, SENSITIVITY_LEVEL, REGION, VALID_FROM, VALID_TO.',
    failClosed:
      'Implementation-specific, but the pattern is always deny-by-default. No entitlement row = no access.',
    detailEng: (
      <>
        Any future platform — a new BI tool, a custom microservice, a partner
        integration — adds enforcement by implementing a single lookup against{' '}
        <C>ENTITLEMENTS</C>. No schema changes, no new mapping tables, no
        governance redesign.
      </>
    ),
    detailExec: (
      <>
        Any future platform. Plug it in and it inherits every existing access
        rule on day one — no parallel governance system to design.
      </>
    ),
  },
];

const SpokeLine = ({
  x,
  y,
  active,
  dashed,
}: {
  x: number;
  y: number;
  active: boolean;
  dashed?: boolean;
}) => {
  const cx = 200;
  const cy = 130;
  return (
    <line
      x1={cx}
      y1={cy}
      x2={cx + x}
      y2={cy + y}
      stroke={active ? '#10b981' : '#777'}
      strokeWidth={active ? 2.5 : 1.5}
      strokeDasharray={dashed ? '6 4' : active ? '8 4' : 'none'}
      className="transition-all duration-500"
    >
      {active && (
        <animate
          attributeName="stroke-dashoffset"
          values="24;0"
          dur="1s"
          repeatCount="indefinite"
        />
      )}
    </line>
  );
};

interface HubSpokeDiagramProps {
  mode?: Mode;
}

export const HubSpokeDiagram: React.FC<HubSpokeDiagramProps> = ({
  mode = 'eng',
}) => {
  const [activeSpoke, setActiveSpoke] = useState(0);
  const spoke = spokeNodes[activeSpoke];

  return (
    <div className="bg-[#111] border border-white/20 rounded-xl p-8 space-y-6">
      {mode === 'eng' && (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          PDP / PEP Architecture — Hub and Spoke
        </p>
      )}
      {mode === 'exec' && (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          Single Source of Truth — Hub and Spoke
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <div className="relative w-full" style={{ minHeight: 320 }}>
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 400 260"
            preserveAspectRatio="xMidYMid meet"
          >
            {spokeNodes.map((node, i) => (
              <SpokeLine
                key={node.id}
                x={node.line.x}
                y={node.line.y}
                active={activeSpoke === i}
                dashed={node.dashed}
              />
            ))}
          </svg>

          <div
            className="absolute rounded-2xl border-2 border-emerald-600/60 bg-emerald-600/15 px-5 py-4 text-center shadow-lg shadow-emerald-900/20 z-10"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              minWidth: 170,
            }}
          >
            <Database size={20} className="text-emerald-400 mx-auto mb-2" />
            <p className="text-emerald-400 text-[11px] font-black uppercase tracking-wider">
              ENTITLEMENTS
            </p>
            <p className="text-emerald-300/60 text-[9px] mt-1">
              Policy Decision Point
            </p>
          </div>

          {spokeNodes.map((node, i) => {
            const isActive = activeSpoke === i;
            const Icon = node.icon;
            const colorMap: Record<string, string> = {
              blue: isActive
                ? 'border-blue-500/60 bg-blue-600/20 shadow-blue-900/30'
                : 'border-blue-600/30 bg-blue-600/10',
              amber: isActive
                ? 'border-amber-500/60 bg-amber-600/20 shadow-amber-900/30'
                : 'border-amber-600/30 bg-amber-600/10',
              red: isActive
                ? 'border-red-500/60 bg-red-600/20 shadow-red-900/30'
                : 'border-red-600/30 bg-red-600/10',
              gray: isActive
                ? 'border-white/30 bg-white/10 shadow-white/5'
                : 'border-white/15 bg-white/[0.06]',
            };
            const textColor: Record<string, string> = {
              blue: 'text-blue-400',
              amber: 'text-amber-400',
              red: 'text-red-400',
              gray: 'text-gray-400',
            };
            return (
              <button
                key={node.id}
                onClick={() => setActiveSpoke(i)}
                className={`absolute z-10 rounded-xl border px-4 py-3 text-center transition-all duration-300 cursor-pointer hover:scale-105 ${colorMap[node.color]} ${
                  isActive ? 'ring-2 ring-white/20 scale-105 shadow-lg' : ''
                } ${node.dashed ? 'border-dashed' : ''}`}
                style={{
                  top: node.pos.top,
                  left: node.pos.left,
                  transform: 'translate(-50%, -50%)',
                  minWidth: 120,
                }}
              >
                <Icon
                  size={16}
                  className={`mx-auto mb-1.5 ${textColor[node.color]}`}
                />
                <p
                  className={`text-[10px] font-bold uppercase tracking-wide ${textColor[node.color]}`}
                >
                  {node.label}
                </p>
                <p className="text-[9px] text-gray-500 mt-0.5">
                  {node.sublabel}
                </p>
              </button>
            );
          })}
        </div>

        <DetailPanel activeKey={activeSpoke}>
          <div className="p-5 rounded-xl border border-white/20 bg-white/[0.03] space-y-4">
            <div className="flex items-center gap-2">
              <spoke.icon size={16} className="text-red-500 shrink-0" />
              <p className="text-sm font-bold uppercase tracking-wide text-white">
                {spoke.label}
              </p>
            </div>

            {mode === 'eng' ? (
              <>
                <div className="space-y-3 text-xs text-gray-400 leading-relaxed">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                      Enforcement Mechanism
                    </p>
                    <p>{spoke.mechanism}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                      Reads from ENTITLEMENTS
                    </p>
                    <p>{spoke.reads}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">
                      Fail-Closed Behavior
                    </p>
                    <p>{spoke.failClosed}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed border-t border-white/10 pt-3">
                  {spoke.detailEng}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-300 leading-relaxed">
                {spoke.detailExec}
              </p>
            )}
          </div>
        </DetailPanel>
      </div>

      <p className="text-[10px] text-gray-500 text-center italic">
        {mode === 'eng'
          ? 'Click any spoke to inspect its enforcement mechanism, data contract, and fail-closed behavior'
          : 'Click any platform to see how it fits the architecture'}
      </p>
    </div>
  );
};

export default HubSpokeDiagram;
