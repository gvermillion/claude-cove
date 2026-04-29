// src/components/eng/EngOverviewView.tsx
//
// Engineering Overview view — composes the shared summary content blocks
// with `mode="eng"`. Mirrors ExecSummaryView; the audience lens is the only
// difference.

import React from 'react';
import {
  HeroBlock,
  KeyConceptsGrid,
  GovernanceChallenge,
  CoreVulnerabilities,
  SolutionPatternViz,
  SolutionPatternsGrid,
  UDPSynergyCallout,
  DocumentRoadmap,
} from '../summary/summaryContent';

interface EngOverviewViewProps {
  onNavigate?: (tabId: string) => void;
}

const EngOverviewView: React.FC<EngOverviewViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <HeroBlock mode="eng" />
      <KeyConceptsGrid />
      <GovernanceChallenge mode="eng" />
      <CoreVulnerabilities />
      <SolutionPatternViz />
      <SolutionPatternsGrid />
      <UDPSynergyCallout />
      <DocumentRoadmap mode="eng" onNavigate={onNavigate} />
    </div>
  );
};

export default EngOverviewView;
