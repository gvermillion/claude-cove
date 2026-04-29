// src/components/exec/ExecSummaryView.tsx
//
// Executive Summary view — composes the shared summary content blocks with
// `mode="exec"`. All topic content is rendered from
// `../summary/summaryContent`; this view is just the composition shell.

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

interface ExecSummaryViewProps {
  onNavigate?: (tabId: string) => void;
}

const ExecSummaryView: React.FC<ExecSummaryViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <HeroBlock mode="exec" />
      <KeyConceptsGrid mode="exec" />
      <GovernanceChallenge mode="exec" />
      <CoreVulnerabilities mode="exec" />
      <SolutionPatternViz mode="exec" />
      <SolutionPatternsGrid mode="exec" />
      <UDPSynergyCallout />
      <DocumentRoadmap mode="exec" onNavigate={onNavigate} />
    </div>
  );
};

export default ExecSummaryView;
