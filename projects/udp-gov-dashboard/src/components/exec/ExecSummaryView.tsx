// src/components/exec/ExecSummaryView.tsx
import React from 'react';
import { Shield, Zap, Globe, ArrowRight } from 'lucide-react';
import { InfoCard } from '../primitives';

interface ExecSummaryViewProps {
  onNavigate?: (tabId: string) => void;
}

const ExecSummaryView: React.FC<ExecSummaryViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#050505] border border-white/15 rounded-xl p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Shield size={300} className="text-red-600" />
        </div>
        <div className="relative z-10 max-w-4xl">
          <div className="inline-block px-3 py-1 bg-red-600/10 border border-red-600/30 rounded-full text-red-500 text-[10px] font-black uppercase tracking-widest mb-6">
            Executive Summary
          </div>
          <h1 className="text-4xl font-black text-white mb-4 leading-[1.1] tracking-tighter uppercase">
            Snowflake Governance &<br /> Access Architecture Plan
          </h1>
          <p className="text-gray-400 text-base leading-relaxed font-light max-w-3xl">
            CrowdStrike's security engineering team identified gaps in
            Snowflake's row-level security propagation. This plan closes every
            gap using standard, vendor-neutral patterns — layered onto the{' '}
            <span className="text-white font-semibold">
              Unified Data Platform (UDP)
            </span>{' '}
            build already in motion.
          </p>
        </div>
      </div>

      {/* Two callouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InfoCard title="Maximising UDP Investment" icon={Zap} accent="emerald">
          <p>
            Environment setup, medallion architecture, and automated ingestion
            are already scoped as core UDP work. Governance layered on top
            moves from high-overhead manual provisioning to a{' '}
            <span className="text-emerald-400 font-semibold">
              net-negative effort operation
            </span>
            .
          </p>
        </InfoCard>
        <InfoCard
          title="Multi-Platform Vendor Neutrality"
          icon={Globe}
          accent="emerald"
        >
          <p>
            The architecture decouples decision-making from enforcement. The
            same security logic extends to AWS, S3, and Bedrock without
            duplication — and to any future platform.
          </p>
        </InfoCard>
      </div>

      {/* CTA */}
      <button
        onClick={() => onNavigate?.('architecture')}
        className="group flex items-center gap-3 rounded-xl border border-white/20 bg-[#111] px-6 py-4 transition-colors hover:border-red-600/40 hover:bg-red-600/5"
      >
        <span className="text-sm font-bold uppercase tracking-tight text-white">
          How does it work?
        </span>
        <span className="text-xs text-gray-500">→ Architecture</span>
        <ArrowRight
          size={16}
          className="ml-auto text-red-500 transition-transform group-hover:translate-x-1"
        />
      </button>
    </div>
  );
};

export default ExecSummaryView;
