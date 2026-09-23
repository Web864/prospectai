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
  ['Enter Website', 'Analyze any company domain with one click.'],
  ['AI Research', 'We scan their website, tech stack, content and market signals.'],
  ['Detect Needs', "Find what’s missing, outdated or under-optimized."],
  ['Match Opportunity', 'Get tailored service recommendations.'],
  ['Review Insights', 'See evidence, scores and reasoning.'],
  ['Generate Pitch', 'Create personalized outreach, grounded in real data.'],
  ['Go to Market', 'Copy, edit and send with confidence.'],
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
    'What is ProspectAI?',
    'ProspectAI is an AI-powered opportunity intelligence platform that turns public website evidence into service opportunities and grounded outreach ideas.',
  ],
  [
    'What types of businesses can I analyze?',
    'You can analyze most public business websites across industries, provided the site can be accessed and reviewed from the public web.',
  ],
  [
    'How does the opportunity scoring work?',
    'The score combines observable website signals with commercial relevance to help you prioritize prospects without treating every finding as a buying signal.',
  ],
  [
    'Can I use this for multiple industries?',
    'Yes. ProspectAI is designed to support freelancers, agencies, consultants and small sales teams working across different industries and service categories.',
  ],
  [
    'Do you offer a free plan?',
    'Yes. The free plan lets you explore the core workflow and run a limited number of website analyses before upgrading.',
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
