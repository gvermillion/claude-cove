/**
 * Governance Implementation — 5-chapter guided-narrative shell.
 *
 * Replaces the earlier 7-tab flat layout. The same content is now sequenced
 * as a numbered story:
 *
 *   1. The Claim         — scale strip + what's enforced / detected / roadmap
 *   2. The Architecture  — 3-lane pipeline diagram + principal model
 *   3. The Controls      — 4 mechanical sub-beats (tags / schemas / policy / write-path)
 *                          with a SINGLE global Happy | Failure lens
 *   4. The Evidence      — audit tab body (compliance map + evidence drawer)
 *   5. The Operations    — operating model (change mgmt, SLOs, break-glass, risk)
 *
 * Each chapter ends with a ChapterFooter (prev · takeaway · next). The
 * Happy | Failure lens is hoisted here (not per-tab) and only rendered in
 * Chapter 3. The Principal switcher is demoted from a global sticky bar to
 * an inline control inside Chapter 3 where it actually matters.
 */

import React, { useState } from 'react';
import {
  Tags,
  Table2,
  Code,
  Zap,
  ArrowRight,
  Shield,
  ShieldCheck,
  Users,
  ClipboardCheck,
  Settings,
  Eye,
  Flag,
  Route,
  Sliders,
  FileSearch,
} from 'lucide-react';
import {
  SectionHeader,
  SubTabs,
  C,
  ClaimCard,
  PrincipalSwitcher,
  BoundaryOverlay,
  ChapterNav,
  ChapterFooter,
  type Chapter,
} from '../primitives';
import type { LucideIcon } from 'lucide-react';
import TagTaxonomyTab from './governance/tabs/TagTaxonomyTab';
import SchemaDesignTab from './governance/tabs/SchemaDesignTab';
import PolicyLogicTab from './governance/tabs/PolicyLogicTab';
import WritePathTab from './governance/tabs/WritePathTab';
import {
  PrincipalGallery,
  PrincipalControlsMatrix,
  IdentityFailureModes,
} from './governance/tabs/IdentityTab';
import AuditTab from './governance/tabs/AuditTab';
import OperatingModelTab from './governance/tabs/OperatingModelTab';
import type { Principal } from './governance/data/principals';
import { defaultPrincipals } from './governance/data/principals';

/* ───────────────────────────────────────────────────────────
   Chapter / control / lens ids
   ─────────────────────────────────────────────────────────── */

type ChapterId = 'claim' | 'arch' | 'controls' | 'evidence' | 'ops';
type ControlId = 'tags' | 'schemas' | 'policy' | 'writePath';
type Lens = 'happy' | 'failure';

const chapters: Chapter<ChapterId>[] = [
  { id: 'claim',    label: 'The Claim',        icon: Flag },
  { id: 'arch',     label: 'The Architecture', icon: Route },
  { id: 'controls', label: 'The Controls',     icon: Sliders },
  { id: 'evidence', label: 'The Evidence',     icon: FileSearch },
  { id: 'ops',      label: 'The Operations',   icon: Settings },
];

const takeaways: Record<ChapterId, string> = {
  claim:
    'Governance makes four concrete promises today (enforce / detect / advise / defer) and names what is still on the roadmap. Everything that follows explains how those promises are kept.',
  arch:
    'Three lanes (enforcement · classification · write-path) and four principal kinds (human · service · agent · share) compose into one evaluation model. The ENTITLEMENTS table is the single source of truth each lane consults.',
  controls:
    'Tags describe, schemas enforce, policy decides, write-path prevents. Toggle the lens to compare the Happy Path to the documented Failure Modes for each control.',
  evidence:
    'Every control maps to an auditable query. The compliance map ties each control to SOC 2 / ISO / GDPR obligations, and the evidence drawer shows the SQL an auditor would actually run.',
  ops:
    'Governance is only as strong as the operating cadence around it. SLOs, change-management gates, break-glass, and the risk register close the loop from design to production.',
};

const controls: { id: ControlId; label: string; icon: LucideIcon }[] = [
  { id: 'tags',      label: 'Tag Taxonomy', icon: Tags },
  { id: 'schemas',   label: 'Schema Design', icon: Table2 },
  { id: 'policy',    label: 'Policy Logic', icon: Code },
  { id: 'writePath', label: 'Write Path',   icon: ShieldCheck },
];

/* ───────────────────────────────────────────────────────────
   MAIN COMPONENT
   ─────────────────────────────────────────────────────────── */

const GovernanceImplView = ({ onNavigate }: { onNavigate?: (tabId: string) => void }) => {
  const [chapter, setChapter] = useState<ChapterId>('claim');
  const [control, setControl] = useState<ControlId>('tags');
  const [lens, setLens] = useState<Lens>('happy');
  const [principal, setPrincipal] = useState<Principal>(defaultPrincipals[0]);
  const [showBoundaries, setShowBoundaries] = useState(false);

  const chapterIdx = chapters.findIndex((c) => c.id === chapter);
  const prevChapter = chapterIdx > 0 ? chapters[chapterIdx - 1] : null;
  const nextChapter = chapterIdx < chapters.length - 1 ? chapters[chapterIdx + 1] : null;

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      {/* ── Page Header ── */}
      <SectionHeader
        title="Governance Implementation"
        subtitle="A 5-chapter walkthrough of how UDP enforces data access: the claim, the architecture, the controls, the evidence, the operations."
        icon={Code}
        badge="How It Works"
      />

      {/* ── Sticky chapter toolbar ── */}
      <div className="sticky top-0 z-30 bg-[#080808]/95 backdrop-blur -mx-4 px-4 py-3 border-y border-white/10">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <ChapterNav chapters={chapters} active={chapter} onChange={setChapter} />
          {chapter === 'controls' && (
            <LensToggle lens={lens} onChange={setLens} />
          )}
        </div>
      </div>

      {/* ── Chapter body ── */}
      {chapter === 'claim'    && <ChapterClaim />}
      {chapter === 'arch'     && (
        <ChapterArchitecture
          principal={principal}
          onPrincipalChange={setPrincipal}
          showBoundaries={showBoundaries}
          onToggleBoundaries={() => setShowBoundaries((v) => !v)}
          onJumpToControl={(id) => { setControl(id); setChapter('controls'); }}
        />
      )}
      {chapter === 'controls' && (
        <ChapterControls
          control={control}
          onControlChange={setControl}
          lens={lens}
          principal={principal}
          onPrincipalChange={setPrincipal}
          onNavigate={onNavigate}
        />
      )}
      {chapter === 'evidence' && <AuditTab principal={principal} />}
      {chapter === 'ops'      && <OperatingModelTab principal={principal} />}

      {/* ── Chapter footer ── */}
      <ChapterFooter
        prev={prevChapter}
        next={nextChapter}
        takeaway={takeaways[chapter]}
        onNav={setChapter}
      />
    </div>
  );
};

export default GovernanceImplView;

/* ───────────────────────────────────────────────────────────
   Lens toggle (only shown in Chapter 3)
   ─────────────────────────────────────────────────────────── */

const LensToggle = ({ lens, onChange }: { lens: Lens; onChange: (l: Lens) => void }) => (
  <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 px-3">Lens</span>
    <button
      onClick={() => onChange('happy')}
      className={`px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
        lens === 'happy'
          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/40'
          : 'text-gray-500 hover:text-gray-300 border border-transparent'
      }`}
    >
      Happy Path
    </button>
    <button
      onClick={() => onChange('failure')}
      className={`px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
        lens === 'failure'
          ? 'bg-red-600/20 text-red-400 border border-red-600/40'
          : 'text-gray-500 hover:text-gray-300 border border-transparent'
      }`}
    >
      Failure Modes
    </button>
  </div>
);

/* ───────────────────────────────────────────────────────────
   Chapter 1 — The Claim
   Surfaces scale + what is enforced/detected/roadmap FIRST so the
   viewer sees the conclusion before the mechanics.
   ─────────────────────────────────────────────────────────── */

const ChapterClaim = () => (
  <section className="space-y-6">
    <div className="bg-[#111] border border-white/15 rounded-xl p-6 space-y-4">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
        Chapter 1 — The Claim
      </p>
      <p className="text-sm text-gray-300 leading-relaxed">
        Governance in this architecture runs on{' '}
        <span className="text-white font-semibold">three lanes</span>. The{' '}
        <span className="text-white font-semibold">enforcement lane</span> is schema
        placement: when a table lands in a governed schema like <C>SALES__BY_REGION</C>, the
        Row Access Policy binds automatically and evaluates the <C>ENTITLEMENTS</C> table at
        query time — no tags required. The{' '}
        <span className="text-white font-semibold">classification lane</span> runs alongside:
        governance tags describe domain, sensitivity, grain, and PII policy; tags drive
        column-level masking and make the catalog queryable. The{' '}
        <span className="text-white font-semibold">write-path lane</span> completes the picture:
        RBAC gates, Copilot semantic guardrails, and Stream + Task validation ensure data only
        lands where it belongs.
      </p>
      <div className="border border-amber-500/30 bg-amber-500/5 rounded-lg p-4">
        <p className="text-sm text-amber-200 leading-relaxed">
          <span className="text-amber-400 font-bold">The most expensive prerequisite</span> for
          a pattern like this is not the Snowflake implementation — it is the{' '}
          <span className="text-white font-semibold">governance design work</span> that precedes
          it: agreeing on data domains, defining sensitivity classifications, mapping security
          grains to business concepts, and authoring the RAP logic.
        </p>
      </div>
    </div>

    {/* Scale strip */}
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
        Scale &amp; cadence
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        {[
          '~8,000 tables under policy',
          '~150 policies applied',
          '~30 domain tags in taxonomy',
          '~450 active entitlements',
          '15 min tag-drift detection window',
          '365 day audit retention',
          '60 min break-glass auto-revoke',
        ].map((chip) => (
          <span key={chip} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white bg-white/[0.03]">
            {chip}
          </span>
        ))}
      </div>
    </div>

    {/* Three-column promise grid */}
    <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.02] to-transparent p-6 space-y-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">
          The Promise
        </p>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl mt-2">
          What this page enforces today, detects today, and what remains on the roadmap.
          The rest of the walkthrough explains the mechanics and the failure modes behind each row.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Enforces today</p>
          <ClaimCard status="today" claim="Schema placement binds RAP on bind" caveat="Only after explicit table-level binding; see Chapter 3 \u2192 Schemas." />
          <ClaimCard status="today" claim="NULL rows fail closed" caveat="Partial-null rows fall through to EXISTS \u2014 see Chapter 3 \u2192 Policy." />
          <ClaimCard status="today" claim="Column masking via PII_POLICY tag" />
          <ClaimCard status="today" claim="RBAC write grants from ENTITLEMENTS" />
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Detects today</p>
          <ClaimCard status="today" claim="Tag drift via Stream + Task" caveat="15-min window is detective, not preventive" />
          <ClaimCard status="today" claim="Domain vocabulary mismatch" caveat="Heuristic advisory \u2014 not a compliance control" />
        </div>
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Out of scope today</p>
          <ClaimCard status="roadmap" claim="DENY rules, time-bound access, residency" />
          <ClaimCard status="roadmap" claim="Erasure workflow (GDPR Art. 17)" />
          <ClaimCard status="roadmap" claim="Break-glass with auto-audit" />
          <ClaimCard status="roadmap" claim="Tag preservation across CREATE OR REPLACE" />
          <ClaimCard status="roadmap" claim="Service account / agent identity model" />
        </div>
      </div>
    </div>
  </section>
);

/* ───────────────────────────────────────────────────────────
   Chapter 2 — The Architecture
   Shows the three-lane pipeline diagram plus the principal model.
   ─────────────────────────────────────────────────────────── */

interface ChapterArchitectureProps {
  principal: Principal;
  onPrincipalChange: (p: Principal) => void;
  showBoundaries: boolean;
  onToggleBoundaries: () => void;
  onJumpToControl: (id: ControlId) => void;
}

const ChapterArchitecture = ({
  principal,
  onPrincipalChange,
  showBoundaries,
  onToggleBoundaries,
  onJumpToControl,
}: ChapterArchitectureProps) => (
  <section className="space-y-8">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
        Chapter 2 — The Architecture
      </p>
      <p className="text-sm text-gray-300 leading-relaxed mt-2 max-w-4xl">
        The architecture has two axes. <span className="text-white font-semibold">Lanes</span>{' '}
        describe <em>what</em> is enforced: enforcement (schema placement + RAP), classification
        (tags + masking), and write-path (defense in depth).{' '}
        <span className="text-white font-semibold">Principals</span> describe <em>who</em> is
        acting: humans, service roles, agents, and share consumers. Every cell of the lane ×
        principal matrix resolves against the same <C>ENTITLEMENTS</C> table.
      </p>
    </div>

    {/* Inline trust-boundary toggle next to the diagram it affects */}
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-500">
        How the Pieces Fit — click any block to jump to its control
      </p>
      <button
        onClick={onToggleBoundaries}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
          showBoundaries
            ? 'bg-red-600/15 border-red-600/40 text-red-400'
            : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300 hover:border-white/20'
        }`}
      >
        <Eye size={12} />
        Trust boundaries
      </button>
    </div>

    {/* Three-lane pipeline diagram */}
    <BoundaryOverlay show={showBoundaries} labels={['Trusted Snowflake account', 'Partner consumer account', 'External CI/CD runner']}>
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 space-y-4">
        {/* Lane 1: Enforcement */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400/70 pl-1">
            Enforcement Lane — the hot path
          </p>
          <div className="grid grid-cols-[1fr_40px_1fr_40px_1fr] items-stretch">
            <button
              onClick={() => onJumpToControl('schemas')}
              className="rounded-lg border border-white/10 bg-[#111] hover:border-blue-500/30 hover:bg-blue-500/5 p-4 text-left transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Table2 size={14} className="text-blue-400" />
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Schema Placement</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-2">Table lands in a governed schema</p>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 font-mono">SALES__BY_REGION</span>
            </button>

            <div className="flex items-center justify-center text-gray-600">
              <div className="flex flex-col items-center gap-1">
                <ArrowRight size={18} />
                <span className="text-[9px] text-gray-600 font-medium">binds</span>
              </div>
            </div>

            <button
              onClick={() => onJumpToControl('policy')}
              className="rounded-lg border border-white/10 bg-[#111] hover:border-emerald-500/30 hover:bg-emerald-500/5 p-4 text-left transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Code size={14} className="text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Row Access Policy</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-2">CASE evaluates entitlements at query time</p>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono">REGION branch → ✓</span>
            </button>

            <div className="flex items-center justify-center text-gray-600">
              <div className="flex flex-col items-center gap-1">
                <ArrowRight size={18} />
                <span className="text-[9px] text-gray-600 font-medium">resolves</span>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#111] p-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Access Granted</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">Rows visible per persona</p>
            </div>
          </div>
        </div>

        {/* Lane 2: Classification */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-red-400/70 pl-1">
            Classification Lane — parallel metadata
          </p>
          <div className="grid grid-cols-[1fr_40px_1fr_40px_1fr] items-stretch">
            <button
              onClick={() => onJumpToControl('tags')}
              className="rounded-lg border border-white/10 bg-[#111] hover:border-red-500/30 hover:bg-red-500/5 p-4 text-left transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Tags size={14} className="text-red-400" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wide">Governance Tags</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-2">Classify domain, sensitivity, grain, PII</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-300 font-mono">SALES</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono">RESTRICTED</span>
              </div>
            </button>

            <div className="flex items-center justify-center text-gray-600">
              <div className="flex flex-col items-center gap-1">
                <ArrowRight size={18} />
                <span className="text-[9px] text-gray-600 font-medium">drives</span>
              </div>
            </div>

            <button
              onClick={() => onJumpToControl('tags')}
              className="rounded-lg border border-white/10 bg-[#111] hover:border-amber-500/30 hover:bg-amber-500/5 p-4 text-left transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Tags size={14} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">PII Masking</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-2">Tag-based masking policies on columns</p>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono">EMAIL → masked</span>
            </button>

            <div className="flex items-center justify-center text-gray-700">
              <span className="text-[11px]">+</span>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#111] p-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Table2 size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Catalog &amp; Audit</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">Queryable via TAG_REFERENCES</p>
            </div>
          </div>
        </div>

        {/* Lane 3: Write-Path */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-violet-400/70 pl-1">
            Write-Path Lane — defense in depth
          </p>
          <div className="grid grid-cols-[1fr_40px_1fr_40px_1fr] items-stretch">
            <button
              onClick={() => onJumpToControl('writePath')}
              className="rounded-lg border border-white/10 bg-[#111] hover:border-violet-500/30 hover:bg-violet-500/5 p-4 text-left transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-violet-400" />
                <span className="text-xs font-bold text-violet-400 uppercase tracking-wide">RBAC Gate</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-2">Entitlements → write grants on schemas</p>
              <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 font-mono">INSERT denied</span>
            </button>

            <div className="flex items-center justify-center text-gray-600">
              <div className="flex flex-col items-center gap-1">
                <ArrowRight size={18} />
                <span className="text-[9px] text-gray-600 font-medium">validates</span>
              </div>
            </div>

            <button
              onClick={() => onJumpToControl('writePath')}
              className="rounded-lg border border-white/10 bg-[#111] hover:border-violet-500/30 hover:bg-violet-500/5 p-4 text-left transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-violet-400" />
                <span className="text-xs font-bold text-violet-400 uppercase tracking-wide">Domain Vocab Check</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-2">Semantic check on column patterns (advisory)</p>
              <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 font-mono">domain mismatch?</span>
            </button>

            <div className="flex items-center justify-center text-gray-600">
              <div className="flex flex-col items-center gap-1">
                <ArrowRight size={18} />
                <span className="text-[9px] text-gray-600 font-medium">monitors</span>
              </div>
            </div>

            <button
              onClick={() => onJumpToControl('writePath')}
              className="rounded-lg border border-white/10 bg-[#111] hover:border-violet-500/30 hover:bg-violet-500/5 p-4 text-left transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-violet-400" />
                <span className="text-xs font-bold text-violet-400 uppercase tracking-wide">Tag Validation</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">Stream + Task continuous check</p>
            </button>
          </div>
        </div>
      </div>
    </BoundaryOverlay>

    {/* Principal model */}
    <div className="space-y-5 pt-2">
      <div className="flex items-center gap-3">
        <Users size={16} className="text-red-400" />
        <h3 className="text-sm font-bold text-white uppercase tracking-tight">
          Principals — who can act
        </h3>
      </div>
      <p className="text-sm text-gray-400 leading-relaxed max-w-4xl">
        Every read and write resolves against one of four principal kinds. The same{' '}
        <C>ENTITLEMENTS</C> table drives RAP, masking, and RBAC write grants — what differs is
        how each principal maps to an ENTITLEMENT row. Pick a principal here; it carries through
        to the Chapter 3 playgrounds.
      </p>
      <PrincipalGallery principal={principal} onPrincipalChange={onPrincipalChange} />
      <PrincipalControlsMatrix />
      <IdentityFailureModes />
    </div>
  </section>
);

/* ───────────────────────────────────────────────────────────
   Chapter 3 — The Controls
   Hosts the 4 mechanical sub-beats under a single global lens.
   ─────────────────────────────────────────────────────────── */

interface ChapterControlsProps {
  control: ControlId;
  onControlChange: (id: ControlId) => void;
  lens: Lens;
  principal: Principal;
  onPrincipalChange: (p: Principal) => void;
  onNavigate?: (tabId: string) => void;
}

const ChapterControls = ({
  control,
  onControlChange,
  lens,
  principal,
  onPrincipalChange,
  onNavigate,
}: ChapterControlsProps) => (
  <section className="space-y-6">
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-400">
        Chapter 3 — The Controls
      </p>
      <p className="text-sm text-gray-300 leading-relaxed mt-2 max-w-4xl">
        Four mechanical controls, one lens. Pick a control below to see the{' '}
        <span className="text-emerald-400 font-semibold">Happy Path</span> implementation or
        the <span className="text-red-400 font-semibold">Failure Modes</span> it defends against
        — the toggle in the header applies to all four.
      </p>
    </div>

    {/* Control sub-nav + inline principal switcher */}
    <div className="flex flex-wrap items-center justify-between gap-4 border border-white/10 rounded-xl p-3 bg-[#0a0a0a]">
      <SubTabs
        tabs={controls}
        activeTab={control}
        onTabChange={(id) => onControlChange(id as ControlId)}
      />
      <PrincipalSwitcher
        principal={principal}
        onChange={(p) => onPrincipalChange(p as Principal)}
        options={defaultPrincipals}
      />
    </div>

    {/* Active control body */}
    {control === 'tags'      && <TagTaxonomyTab principal={principal} lens={lens} onNavigate={onNavigate} />}
    {control === 'schemas'   && <SchemaDesignTab principal={principal} lens={lens} onNavigate={onNavigate} />}
    {control === 'policy'    && <PolicyLogicTab principal={principal} lens={lens} onNavigate={onNavigate} />}
    {control === 'writePath' && <WritePathTab principal={principal} lens={lens} onNavigate={onNavigate} />}
  </section>
);
