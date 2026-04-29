// src/components/exec/ExecSummaryView.tsx
//
// Executive Summary — narrative-arc composition. Reads as a story:
// problem → scaling risk → attack surface → requirements → NIST solution →
// implementation specifics → value proposition → patterns → navigation.

import React from 'react';
import {
  ExecHero,
  ProblemToday,
  ScalingHorizon,
  AttackVectors,
  DesignRequirements,
  NistPattern,
  EntitlementsSpecifics,
  ValueProposition,
} from './execNarrative';
import { SolutionPatternsGrid, DocumentRoadmap } from '../summary/summaryContent';

interface ExecSummaryViewProps {
  onNavigate?: (tabId: string) => void;
}

const ExecSummaryView: React.FC<ExecSummaryViewProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <ExecHero />
      <ProblemToday />
      <ScalingHorizon />
      <AttackVectors />
      <DesignRequirements />
      <NistPattern />
      <EntitlementsSpecifics />
      <ValueProposition />
      <SolutionPatternsGrid />
      <DocumentRoadmap mode="exec" onNavigate={onNavigate} />
    </div>
  );
};

export default ExecSummaryView;
