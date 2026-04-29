// src/components/exec/ExecSecurityView.tsx
import React, { useState } from 'react';
import {
  Shield,
  AlertOctagon,
  Code,
  Users,
  GitBranch,
  ShieldCheck,
  EyeOff,
} from 'lucide-react';
import {
  SectionHeader,
  InfoCard,
  DetailPanel,
  PrevNextNav,
  colorStyles,
} from '../primitives';
import { DefenseDiagram } from '../diagrams';

const VULN_ITEMS_EXEC = [
  {
    label: 'Hidden Pipeline Data',
    icon: AlertOctagon,
    color: 'red' as const,
    title: 'Risk: Data Copies Lose Their Protection',
    content: (
      <p>
        Access controls are attached to the original table. When a downstream
        pipeline copies data into a new table, those controls don't follow —
        the copy is unprotected and nobody is notified. The result: sensitive
        data ends up in places it shouldn't be.
      </p>
    ),
  },
  {
    label: 'Forgotten Joins',
    icon: Code,
    color: 'amber' as const,
    title: 'Risk: Enforcement Depends on Discipline',
    content: (
      <p>
        Today, security only works if every developer remembers to manually
        attach the rule book to their query. A forgotten join silently returns
        unfiltered data — the query succeeds, just without protection. There's
        no central audit trail to catch the miss.
      </p>
    ),
  },
  {
    label: 'Aggregation Drift',
    icon: GitBranch,
    color: 'red' as const,
    title: 'Risk: Reshaping Data Strips the Rules',
    content: (
      <p>
        When a table is summarized to a different level (e.g., individual
        records rolled up to a region), the columns that drove the access
        rules may disappear. The protection technically still applies, but
        with nothing to filter on, every row is visible.
      </p>
    ),
  },
  {
    label: 'Manual Bottleneck',
    icon: Users,
    color: 'amber' as const,
    title: 'Risk: Onboarding Takes Engineering Tickets',
    content: (
      <>
        <p>
          Today, every new user or role change requires a manual update to the
          access matrix. Data Engineering is in the loop for every personnel
          change — slow, error-prone, and at odds with how identity systems
          already work.
        </p>
        <p className="text-emerald-400 font-semibold text-xs mt-2">
          Solved by sourcing identity and ownership directly from Okta and
          Salesforce.
        </p>
      </>
    ),
  },
  {
    label: 'Sensitive Data Exposure',
    icon: EyeOff,
    color: 'red' as const,
    title: 'Risk: Personal Data Visible Where It Shouldn\'t Be',
    content: (
      <>
        <p>
          Personal information — names, emails, identifiers — needs to stay visible only to the people whose job
          requires it. The current architecture doesn't have a clean answer for "let security analysts unmask this
          column for an investigation, but nobody else."
        </p>
        <p className="text-emerald-400 font-semibold text-xs mt-2">
          Solved by column-level masking + a role-based unmask grant — row-level rules still apply on top.
        </p>
      </>
    ),
  },
];

const ExecSecurityView: React.FC = () => {
  const [activeVuln, setActiveVuln] = useState(0);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <SectionHeader
        title="Security"
        subtitle="Five risks the current architecture can't catch — and the layered defenses that close them."
        icon={Shield}
      />

      {/* Vulnerability cards */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white border-b border-white/20 pb-2">
          Risks in the Current State
          <span className="text-gray-500 font-normal text-xs ml-2 normal-case tracking-normal">
            — click each to explore
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          <div className="space-y-1">
            {VULN_ITEMS_EXEC.map((v, i) => {
              const isActive = i === activeVuln;
              const s = colorStyles[v.color];
              return (
                <button
                  key={v.label}
                  onClick={() => setActiveVuln(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 border ${
                    isActive
                      ? `${s.border} ${s.bg} shadow-lg`
                      : 'border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <v.icon
                      size={14}
                      className={isActive ? s.accent : 'text-gray-500'}
                    />
                    <span
                      className={`text-xs font-semibold ${
                        isActive ? 'text-white' : 'text-gray-500'
                      }`}
                    >
                      {v.label}
                    </span>
                  </div>
                </button>
              );
            })}
            <PrevNextNav
              current={activeVuln}
              total={VULN_ITEMS_EXEC.length}
              onPrev={() => setActiveVuln((s) => Math.max(0, s - 1))}
              onNext={() =>
                setActiveVuln((s) =>
                  Math.min(VULN_ITEMS_EXEC.length - 1, s + 1),
                )
              }
            />
          </div>

          <DetailPanel activeKey={activeVuln}>
            <InfoCard
              title={VULN_ITEMS_EXEC[activeVuln].title}
              icon={VULN_ITEMS_EXEC[activeVuln].icon}
              accent={
                VULN_ITEMS_EXEC[activeVuln].color === 'red' ? 'red' : 'amber'
              }
            >
              {VULN_ITEMS_EXEC[activeVuln].content}
            </InfoCard>
          </DetailPanel>
        </div>
      </section>

      {/* Defense in depth */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/20 pb-2">
          <ShieldCheck size={18} className="text-red-600" /> Defense in Depth
        </h3>
        <DefenseDiagram />
        <p className="text-sm text-gray-400 italic leading-relaxed">
          Four independent layers. Any single layer can fail without
          compromising the system.
        </p>
      </section>
    </div>
  );
};

export default ExecSecurityView;
