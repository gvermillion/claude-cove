// src/components/exec/ExecArchitectureView.tsx
import React from 'react';
import {
  GitBranch,
  Network,
  Plug,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { SectionHeader } from '../primitives';
import { EntitlementsDiagram, HubSpokeDiagram } from '../diagrams';

const extensionSteps: {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: 'blue' | 'amber' | 'emerald';
}[] = [
  {
    title: 'Connect',
    subtitle: 'Point the new platform at the central rule book.',
    icon: Plug,
    color: 'blue',
  },
  {
    title: 'Enforce',
    subtitle: 'Plug into the existing access rules — no new logic to design.',
    icon: ShieldCheck,
    color: 'amber',
  },
  {
    title: 'Done',
    subtitle: 'Every existing entitlement applies on day one.',
    icon: CheckCircle2,
    color: 'emerald',
  },
];

const ExecArchitectureView: React.FC = () => {
  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <SectionHeader
        title="Architecture"
        subtitle="One rule book. Many enforcement points. Adding a new platform takes three steps — never a redesign."
        icon={Network}
      />

      {/* Beat 1 — Segregation */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <GitBranch size={18} className="text-red-600" /> Decisions live in
          one place; enforcement happens everywhere.
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Identity and ownership flow into a single rule book. Every platform
          reads from it. Change a rule once; it propagates.
        </p>
        <EntitlementsDiagram mode="exec" />
      </section>

      {/* Beat 2 — Extensibility */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Network size={18} className="text-red-600" /> Each enforcement point
          is a thin extension — not a parallel governance system.
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          Snowflake, AWS S3, AI agents — each one is a spoke that reads from
          the same hub. New platforms plug in without rebuilding the
          governance model.
        </p>
        <HubSpokeDiagram mode="exec" />
      </section>

      {/* Beat 3 — Three-card extension strip */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-tight">
          <Plug size={18} className="text-red-600" /> Adding a New Platform —
          Three Steps
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-4">
          {extensionSteps.map((step, i) => {
            const colorAccent = {
              blue: 'border-blue-600/40 bg-blue-600/10 text-blue-400',
              amber: 'border-amber-600/40 bg-amber-600/10 text-amber-400',
              emerald: 'border-emerald-600/40 bg-emerald-600/10 text-emerald-400',
            }[step.color];
            const StepIcon = step.icon;
            return (
              <React.Fragment key={step.title}>
                <div
                  className={`rounded-xl border ${colorAccent} p-6 flex flex-col items-center text-center gap-3`}
                >
                  <StepIcon size={28} />
                  <p className="text-lg font-black uppercase tracking-tight text-white">
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {step.subtitle}
                  </p>
                </div>
                {i < extensionSteps.length - 1 && (
                  <div className="hidden md:flex items-center justify-center text-gray-500">
                    <ArrowRight size={20} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default ExecArchitectureView;
