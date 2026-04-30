// src/components/eng/EngOverviewView.tsx
//
// Engineering Overview view — composes the shared summary content blocks
// with `mode="eng"`. Sets up the problem; defers solutions to deeper pages.

import React from 'react';
import {
  HeroBlock,
  VulnerabilityGrid,
  TopicNav,
} from '../summary/summaryContent';

interface EngOverviewViewProps {
  onNavigate?: (tabId: string) => void;
}

const EngOverviewView: React.FC<EngOverviewViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <HeroBlock mode="eng" />
      <div id="eng-ov-risks"><VulnerabilityGrid /></div>
      <div id="eng-ov-topics"><TopicNav onNavigate={onNavigate} /></div>

      {/* The Bottom Line */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-8 space-y-3 shadow-xl shadow-emerald-950/10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
          The Bottom Line
        </p>
        <h2 className="text-2xl font-black text-white tracking-tight leading-tight">
          One table, one pattern, every platform. The sections that follow show exactly how it works.
        </h2>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
          The ENTITLEMENTS table is the single PDP. Schemas segregate by security grain.
          Tags drive policy binding. RAPs enforce row-level access. Each section details
          one layer of this architecture — start with Developer Experience or click any topic above.
        </p>
      </div>
    </div>
  );
};

export default EngOverviewView;
