import React, { useState } from 'react';
import { Globe } from 'lucide-react';
import {
  SectionHeader,
  CalloutBox,
  DataTable,
  StepSidebar,
  DetailPanel,
  PrevNextNav,
  C,
  colorStyles,
} from '../primitives';
import { HubSpokeDiagram } from '../diagrams';

/* ------------------------------------------------------------------ */
/*  Recipe data types                                                  */
/* ------------------------------------------------------------------ */

type RecipeStep = {
  title: string;
  body: React.ReactNode;
};

type Recipe = {
  key: 'aws-s3' | 'bedrock' | 'workday-pdp';
  label: string;
  title: string;
  role: string;
  color: 'blue' | 'emerald' | 'amber';
  steps: RecipeStep[];
  code?: { language: string; content: string };
};

/* ------------------------------------------------------------------ */
/*  Recipe definitions                                                 */
/* ------------------------------------------------------------------ */

const RECIPES: Recipe[] = [
  {
    key: 'aws-s3',
    label: 'AWS S3 (Lake Formation)',
    title: 'Recipe A — Add AWS S3 (Lake Formation) as a PEP',
    role: 'PEP',
    color: 'blue',
    steps: [
      {
        title: 'Step 1 — Mirror ENTITLEMENTS to S3',
        body: (
          <>
            <p>
              Run <C>COPY INTO @s3_stage/entitlements/</C> from the <C>ENTITLEMENTS</C> table,
              writing Parquet files. Schedule via a Snowflake Task or an Airflow DAG on your
              preferred cadence (e.g., hourly).
            </p>
          </>
        ),
      },
      {
        title: 'Step 2 — Create Glue table + Lake Formation permissions',
        body: (
          <>
            <p>
              Create an AWS Glue table <C>entitlements_mirror</C> pointing at the Parquet S3
              location. Grant <C>SELECT</C> on that table to the IAM role used by governed
              dataset readers via Lake Formation.
            </p>
          </>
        ),
      },
      {
        title: 'Step 3 — Attach a Row Filter to each governed dataset',
        body: (
          <>
            <p>
              For each governed S3 dataset, create a Lake Formation Row Filter that joins to{' '}
              <C>entitlements_mirror</C> on <C>caller_identity()</C> → <C>user_id</C>, filtering
              on <C>data_domain</C> and <C>region</C>. See the filter template below.
            </p>
          </>
        ),
      },
      {
        title: 'Step 4 — Verify by impersonation',
        body: (
          <>
            <p>
              Test via <C>aws sts assume-role</C> as a user with <C>region='West'</C>. That user
              reading a governed S3 dataset should receive only West rows. A user outside that
              region should receive an empty result set — not an error.
            </p>
          </>
        ),
      },
    ],
    code: {
      language: 'sql',
      content: `-- Lake Formation row filter (pseudo)
CREATE FILTER pep_west_only ON s3.governed_dataset
AS (
  caller_identity() IN (
    SELECT user_id FROM entitlements_mirror
    WHERE data_domain = 'SALES'
      AND region = current_dataset_region()
  )
);`,
    },
  },
  {
    key: 'bedrock',
    label: 'Bedrock Agent',
    title: 'Recipe B — Add Bedrock Agent as a PEP',
    role: 'PEP',
    color: 'emerald',
    steps: [
      {
        title: 'Step 1 — Expose ENTITLEMENTS as a Lambda function',
        body: (
          <>
            <p>
              Create a Lambda that accepts a caller identity and returns their entitled{' '}
              <C>data_domains</C>, <C>regions</C>, and <C>unmask_pii</C> flag from the{' '}
              <C>ENTITLEMENTS</C> table. Cache responses for 60 s to reduce Snowflake round
              trips.
            </p>
          </>
        ),
      },
      {
        title: 'Step 2 — Declare an action group in Bedrock',
        body: (
          <>
            <p>
              Add an <C>entitlements_lookup</C> tool to the agent's action group. The tool
              schema declares inputs (caller session) and outputs (<C>data_domains</C>,{' '}
              <C>regions</C>, <C>unmask_pii</C>). See the action group snippet below.
            </p>
          </>
        ),
      },
      {
        title: 'Step 3 — Constrain the system prompt',
        body: (
          <>
            <p>
              Instruct the agent to call <C>entitlements_lookup</C> before any tool that
              fetches data, then restrict context to the returned domains and regions. This
              is the only prompt-level change required.
            </p>
          </>
        ),
      },
      {
        title: 'Step 4 — Add a Bedrock Guardrail',
        body: (
          <>
            <p>
              Create a guardrail that denies the topic <C>pii_topics</C> unless{' '}
              <C>unmask_pii=true</C> is returned by the lookup. This provides a second
              enforcement layer independent of the prompt.
            </p>
          </>
        ),
      },
      {
        title: 'Step 5 — Test by entitlement gap',
        body: (
          <>
            <p>
              Invoke the agent as a user without <C>region='West'</C> and ask about a West
              deal. The agent should refuse and cite the entitlement gap — not hallucinate
              the restricted data.
            </p>
          </>
        ),
      },
    ],
    code: {
      language: 'json',
      content: `{
  "actionGroup": "entitlements_lookup",
  "description": "Returns the caller's entitled domains, regions, and PII unmask flag",
  "apiSchema": {
    "openapi": "3.0",
    "paths": { "/lookup": { "get": { "..." } } }
  },
  "guardrails": [
    {
      "type": "topic_deny",
      "topic": "pii_topics",
      "unless": "unmask_pii=true"
    }
  ]
}`,
    },
  },
  {
    key: 'workday-pdp',
    label: 'Workday → PDP (HR)',
    title: 'Recipe C — Add a New PDP Source (Workday for HR Ownership)',
    role: 'PDP Source',
    color: 'amber',
    steps: [
      {
        title: 'Step 1 — Define identity mapping',
        body: (
          <>
            <p>
              Map Workday's <C>worker_id</C> to the existing <C>user_id</C> in{' '}
              <C>ENTITLEMENTS</C>. This is a design decision, not code — document which
              Workday field corresponds to each ENTITLEMENTS column before writing ELT.
            </p>
          </>
        ),
      },
      {
        title: 'Step 2 — Write Workday → ENTITLEMENTS_STAGING ELT',
        body: (
          <>
            <p>
              Build the Workday → <C>ENTITLEMENTS_STAGING</C> ELT job. The existing
              promotion stored procedure handles schema validation, orphan-reference checks,
              and rejection of malformed rows before merging to the live table.
            </p>
          </>
        ),
      },
      {
        title: 'Step 3 — Register Workday as authoritative for HR rows',
        body: (
          <>
            <p>
              In the staging table metadata, mark Workday as the authoritative source for{' '}
              <C>data_domain='HR'</C> rows. This prevents other PDP sources from overwriting
              HR ownership records during promotion.
            </p>
          </>
        ),
      },
      {
        title: 'Step 4 — Promote; all PEPs inherit automatically',
        body: (
          <>
            <p>
              Run the promotion procedure. All enforcement points — Snowflake RAPs, S3 Lake
              Formation row filters, and Bedrock guardrails — read the same{' '}
              <C>ENTITLEMENTS</C> table. No PEP-level changes are required.
            </p>
          </>
        ),
      },
    ],
    // No code blob for Recipe C — data-pipeline plumbing.
  },
];

/* ------------------------------------------------------------------ */
/*  Comparison matrix data                                             */
/* ------------------------------------------------------------------ */

const MATRIX_COLUMNS = ['Aspect', 'Snowflake (RAPs)', 'AWS S3 (Lake Formation)', 'Bedrock'];

const MATRIX_DATA: string[][] = [
  ['Source of truth', 'ENTITLEMENTS table', 'entitlements_mirror (Glue)', 'Lambda over ENTITLEMENTS'],
  ['Identity propagation', 'current_user()', 'caller_identity()', 'invoker session'],
  ['Filter mechanism', 'Row Access Policy', 'Row Filter Expression', 'System prompt + guardrail'],
  ['Update latency', 'Real-time', 'Refresh cadence (mirror)', 'TTL-bound (lookup cache)'],
  ['New addition', 'None — already wired', 'Mirror + Glue table + row filter', 'Lambda + action group'],
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const ExtensibilityView = () => {
  const [activeRecipe, setActiveRecipe] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const recipe = RECIPES[activeRecipe];

  const handleRecipeClick = (index: number) => {
    setActiveRecipe(index);
    setActiveStep(0);
  };

  return (
    <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
      <SectionHeader
        title="Cross-Platform Extensibility"
        subtitle="A representative target estate — illustrated here as Snowflake, AWS S3, and Bedrock — spans multiple enforcement points. This section proves that governance is a platform service, not a vendor-specific feature — and shows how to extend it to any platform."
        icon={Globe}
        badge="Section 8"
      />

      {/* Hub-and-Spoke Diagram */}
      <HubSpokeDiagram mode="eng" />

      {/* Three Concrete Recipes */}
      <div className="bg-[#111] border border-white/20 rounded-xl p-8 space-y-6">
        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-tight">
            Extension Recipes
          </h3>
          <p className="text-xs text-gray-400 leading-relaxed mt-1">
            Select a recipe to see a concrete, step-by-step implementation guide.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
          {/* Recipe selector */}
          <div className="flex flex-col gap-1">
            {RECIPES.map((r, i) => {
              const isActive = i === activeRecipe;
              return (
                <button
                  key={r.key}
                  onClick={() => handleRecipeClick(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 border ${
                    isActive
                      ? `${colorStyles[r.color].border} ${colorStyles[r.color].bg} shadow-lg`
                      : 'border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <p className={`text-xs font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                    {r.label}
                  </p>
                  <p
                    className={`text-[10px] mt-0.5 uppercase tracking-wide ${
                      isActive ? colorStyles[r.color].accent : 'text-gray-600'
                    }`}
                  >
                    {r.role}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Recipe detail */}
          <DetailPanel activeKey={activeRecipe}>
            <div className="space-y-4">
              <div>
                <p className={`text-[10px] font-bold uppercase tracking-widest ${colorStyles[recipe.color].accent}`}>
                  {recipe.role}
                </p>
                <p className="text-white font-bold text-sm mt-1">{recipe.title}</p>
              </div>

              {/* Step sidebar + step detail */}
              <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
                <div>
                  <StepSidebar
                    steps={recipe.steps.map((s) => ({
                      label: s.title.replace(/^Step \d+ — /, ''),
                      color: recipe.color,
                    }))}
                    activeStep={activeStep}
                    onStepClick={setActiveStep}
                  />
                  <PrevNextNav
                    current={activeStep}
                    total={recipe.steps.length}
                    onPrev={() => setActiveStep((s) => Math.max(0, s - 1))}
                    onNext={() => setActiveStep((s) => Math.min(recipe.steps.length - 1, s + 1))}
                  />
                </div>

                <DetailPanel activeKey={`${activeRecipe}-${activeStep}`}>
                  <div className="p-4 rounded-xl border border-white/20 bg-white/[0.03] space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-white">
                      {recipe.steps[activeStep].title}
                    </p>
                    <div className="text-xs text-gray-400 leading-relaxed">
                      {recipe.steps[activeStep].body}
                    </div>
                  </div>
                </DetailPanel>
              </div>

              {/* Code blob (Recipes A and B only) */}
              {recipe.code && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {recipe.code.language === 'sql' ? 'SQL Template' : 'Config Snippet'}
                  </p>
                  <pre
                    tabIndex={0}
                    role="region"
                    aria-label={`${recipe.code.language.toUpperCase()} template for ${recipe.label}`}
                    className="bg-[#0a0a0a] border border-white/15 rounded-lg p-4 text-xs font-mono text-gray-300 overflow-x-auto leading-relaxed focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    {recipe.code.content}
                  </pre>
                </div>
              )}
            </div>
          </DetailPanel>
        </div>
      </div>

      {/* PEP Comparison Matrix */}
      <div className="space-y-3">
        <h3 className="text-white font-bold text-xs uppercase tracking-widest">
          PEP Comparison: What&apos;s Reused, What&apos;s Platform-Specific
        </h3>
        <DataTable columns={MATRIX_COLUMNS} data={MATRIX_DATA} firstColumnEmphasis valueFontMono />
      </div>

      {/* Architecture Guarantee */}
      <CalloutBox title="Architecture Guarantee" variant="emerald">
        <p>
          Because the PDP lives in the Silver Layer and the ELT sources write to it independently of
          any enforcement platform, governance is a{' '}
          <span className="text-white font-semibold">Global Service of the UDP</span> — not a siloed
          feature of Snowflake. Adding a new enforcement point requires only a lookup against{' '}
          <C>ENTITLEMENTS</C>, not a redesign of access logic.
        </p>
      </CalloutBox>
    </div>
  );
};

export default ExtensibilityView;
