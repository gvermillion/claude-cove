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
  DesignRequirements,
  NistPattern,
  GovernanceInAction,
  ValueProposition,
} from './execNarrative';
const ExecSummaryView: React.FC = () => {
  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <ExecHero />
      <div id="summary-problem"><ProblemToday /></div>
      <div id="summary-horizon"><ScalingHorizon /></div>
      <div id="summary-requirements"><DesignRequirements /></div>
      <div id="summary-nist"><NistPattern /></div>
      <div id="summary-action"><GovernanceInAction /></div>
      <div id="summary-value"><ValueProposition /></div>
    </div>
  );
};

export default ExecSummaryView;
