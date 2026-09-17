import {
  BriefcaseBusiness,
  ChevronDown,
  FileSearch,
  Globe2,
  PenLine,
  ScanSearch,
  Target,
  UserRoundPlus,
} from 'lucide-react';

export const prospectWorkflow = [
  ['Visit Website', 'Open the public business website you are already evaluating.'],
  ['Analyze', 'Start a scoped analysis from the ProspectAI Chrome Extension.'],
  [
    'Detect Evidence',
    'Capture observable technical, content, trust, UX, SEO, and conversion signals.',
  ],
  ['Identify Opportunity', 'Separate factual findings from their likely commercial meaning.'],
  ['Recommend Service', 'Match credible opportunities to services the user actually offers.'],
  ['Generate Pitch', 'Draft editable outreach grounded in the evidence and opportunity.'],
  ['Save Lead', 'Keep the company, contacts, findings, pitches, and activity together.'],
] as const;

const workflowIcons = [
  Globe2,
  ScanSearch,
  FileSearch,
  Target,
  BriefcaseBusiness,
  PenLine,
  UserRoundPlus,
];

export const prospectFaqQuestions = [
  [
    'What does ProspectAI analyze?',
    'ProspectAI analyzes accessible public website pages for technical, content, trust, conversion, and business signals relevant to a sales opportunity.',
  ],
  [
    'How is Opportunity Score different from Website Score?',
    'Website Score summarizes observed website quality. Opportunity Score estimates how strong and relevant the service opportunity is for your business. A weak website does not automatically make a strong prospect.',
  ],
  [
    'Does ProspectAI send outreach automatically?',
    'No. V1 generates editable pitches but does not send outreach. You review, edit, and choose what to do with every pitch.',
  ],
  [
    'What data does the Chrome Extension access?',
    'The extension uses the active tab URL and title only when you invoke an analysis. Account and analysis data are exchanged with the ProspectAI API over an authenticated session.',
  ],
  [
    'Does ProspectAI monitor all browsing?',
    'No. It does not monitor browsing history or continuously inspect tabs. Analysis begins only from an explicit action on the current tab.',
  ],
  [
    'How are analyses counted?',
    'Usage is counted server-side according to your plan when an analysis job is accepted. Retries and partial outcomes follow the billing rules shown in your usage history.',
  ],
  [
    'Can an analysis partially complete?',
    'Yes. If some checks cannot run, ProspectAI can return verified results with a clear partial status and identify what was unavailable.',
  ],
  [
    'What happens if a website blocks automated analysis?',
    'ProspectAI reports the blocked or failed state instead of inventing findings. You can retry later or continue with the evidence that was safely collected.',
  ],
  [
    'Can I edit AI-generated pitches?',
    'Yes. Generated pitches are drafts. You can edit them before saving or using them outside ProspectAI.',
  ],
] as const;

export function HowItWorksView() {
  return (
    <section className="workflow" aria-labelledby="workflow-heading">
      <div className="section-title">
        <h2 id="workflow-heading">From a live website to a qualified lead</h2>
        <p className="muted">
          ProspectAI is a Prospect Opportunity Intelligence platform. It turns website evidence into
          a service recommendation and an editable sales pitch, without confusing an audit finding
          for a buying signal.
        </p>
      </div>
      <ol>
        {prospectWorkflow.map(([title, copy], index) => {
          const Icon = workflowIcons[index] ?? ScanSearch;
          return (
            <li key={title} tabIndex={0} aria-label={`Step ${index + 1}: ${title}`}>
              <div className="workflow-marker" aria-hidden="true">
                <span>{index + 1}</span>
                <Icon size={18} />
              </div>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function FaqView() {
  return (
    <section className="faq" aria-labelledby="faq-heading">
      <h2 className="sr-only" id="faq-heading">
        ProspectAI frequently asked questions
      </h2>
      {prospectFaqQuestions.map(([question, answer]) => (
        <details key={question}>
          <summary>
            <span>{question}</span>
            <ChevronDown size={18} aria-hidden="true" />
          </summary>
          <p>{answer}</p>
        </details>
      ))}
    </section>
  );
}
