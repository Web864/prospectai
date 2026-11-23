import Link from 'next/link';
import { ArrowRight, BriefcaseBusiness, Building2, Check, Compass, Search, Sparkles, Users } from 'lucide-react';
import './prospect-codex-home.css';

const workflow = [
  ['01', 'Start with a website', 'Begin with a business website to understand its public positioning, services, and context.'],
  ['02', 'Spot meaningful signals', 'Review observations that could indicate real business needs—not just raw page data.'],
  ['03', 'Find your outreach angle', 'Turn relevant observations into a focused opportunity hypothesis you can validate.'],
] as const;
const audiences = [
  { title: 'Freelancers', copy: 'Discover businesses that may benefit from your expertise.', icon: BriefcaseBusiness },
  { title: 'Agencies', copy: 'Build a more relevant and researched prospecting approach.', icon: Building2 },
  { title: 'Consultants', copy: 'Lead with insight and a clear reason for your recommendation.', icon: Compass },
  { title: 'Sales teams', copy: 'Give every outbound conversation more meaningful context.', icon: Users },
];
const questions = [
  ['What does ProspectAI help me do?', 'ProspectAI is designed to help you interpret publicly available website signals and identify potential sales opportunities. You should validate individual insights before acting.'],
  ['Who is ProspectAI for?', 'Freelancers, agencies, consultants and sales professionals who want stronger context for relevant prospecting.'],
  ['Are the opportunities guaranteed?', 'No. A website signal is evidence to investigate, not a guarantee that a business needs a service or is ready to buy.'],
] as const;

export function Homepage() {
  return <main className="codex-home" id="top">
    <section className="ch-wrap ch-hero" aria-labelledby="home-title">
      <div className="ch-hero-copy">
        <div className="ch-eyebrow"><span className="ch-dot"/> A MORE INTELLIGENT WAY TO PROSPECT</div>
        <h1 id="home-title">Know the business.<br/><span>Find your angle.</span><br/>Win better clients.</h1>
        <p className="ch-lead">Turn a business website into a clearer picture of what matters. Discover meaningful signals, understand the opportunity, and reach out with a reason—not a guess.</p>
        <div className="ch-actions"><Link className="ch-btn ch-primary" href="/signup">Start free <ArrowRight size={17}/></Link><Link className="ch-btn ch-outline" href="#how">See how it works <ArrowRight size={17}/></Link></div>
        <p className="ch-smallnote">Understand the business. Find the angle. Reach out with confidence.</p>
      </div>
      <div className="ch-visual" aria-label="Illustrative ProspectAI research report">
        <div className="ch-halo" aria-hidden="true"/>
        <div className="ch-app">
          <div className="ch-appbar"><div className="ch-circles"><i/><i/><i/></div><small>PROSPECTAI / WORKSPACE</small><small><span className="ch-dot"/> Preview mode</small></div>
          <div className="ch-appbody">
            <div className="ch-apphead"><div><span className="ch-tiny">PROSPECT INTELLIGENCE / 001</span><strong>Website overview</strong><small>Research workspace</small></div><span className="ch-tag">● Example report</span></div>
            <div className="ch-domain"><span className="ch-domainicon"><Search size={18}/></span><div><strong>example-business.com</strong><small>Public website analysis</small></div><em>Illustrative data</em></div>
            <div className="ch-signalhead"><span className="ch-tiny">OBSERVED SIGNALS</span><span>03 FINDINGS</span></div>
            {[
              ['Service offering identified','Discover what the business provides'],
              ['Website positioning reviewed','Understand the current value proposition'],
              ['Potential improvement area','Connect evidence to a useful outreach angle'],
            ].map(([title,description]) => <div className="ch-signal" key={title}><span className="ch-signalicon"><Check size={16}/></span><div><strong>{title}</strong><small>{description}</small></div></div>)}
            <div className="ch-insight"><strong><Sparkles size={14}/> Opportunity hypothesis</strong><p>A website signal may indicate a relevant service opportunity. Validate the evidence before outreach.</p></div>
          </div>
        </div>
        <div className="ch-float"><Sparkles size={14}/> Research before outreach</div>
      </div>
    </section>
    <div className="ch-trust"><div className="ch-wrap">RESEARCH WITH PURPOSE <span>/</span> SELL WITH RELEVANCE <span>/</span> GROW WITH CONFIDENCE</div></div>
    <section className="ch-wrap ch-editorial"><div><span className="ch-index">01 / THE IDEA</span><h2>More than a lead list.<br/><em>A reason to connect.</em></h2></div><div><p>Generic outreach starts with a name. Thoughtful outreach starts with understanding. ProspectAI helps you bridge the gap between what a website reveals and where you can bring real value.</p><Link href="#how">Explore the approach <ArrowRight size={16}/></Link></div></section>
    <section className="ch-wrap ch-section" id="how"><div className="ch-sectionhead"><p className="ch-kicker">How it works</p><h2>A better conversation starts<br/>before the first message.</h2><p>A simple approach to understanding businesses and spotting opportunities worth exploring.</p></div><div className="ch-three">{workflow.map(([number,title,copy]) => <article className="ch-card" key={number}><span className="ch-num">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="ch-feature" id="features"><div className="ch-wrap ch-featurelayout"><div><p className="ch-kicker">A clearer way to prospect</p><h2>Go beyond the surface.<br/><span>See the opportunity.</span></h2><p>Prospecting should begin with understanding. Build a stronger case for every conversation by connecting a signal to its business implication.</p><div className="ch-featureitems">{[['Evidence first','Ground opportunities in visible information about the business.'],['Commercial interpretation','Connect what you notice with why it might matter.'],['Services worth selling','Focus on relevant value instead of generic, mass-produced pitches.']].map(([title,copy])=><div key={title}><span><Check size={17}/></span><section><strong>{title}</strong><p>{copy}</p></section></div>)}</div></div><div className="ch-featuredemo"><div className="ch-demohead"><strong>Insight explorer</strong><span>● EXAMPLE</span></div>{[['01 / OBSERVE','What does the website tell us?','Review publicly visible positioning, content and service information.'],['02 / INTERPRET','Why might it matter?','Consider how each observation could connect to a genuine business need.'],['03 / ACT','Where is the opportunity?','Form a specific, testable reason to start a conversation.']].map(([tag,title,copy])=><div className="ch-sample" key={tag}><small>{tag}</small><strong>{title}</strong><p>{copy}</p></div>)}</div></div></section>
    <section className="ch-wrap ch-story"><div className="ch-storyhead"><p className="ch-kicker">FROM OBSERVATION TO OUTREACH</p><h2>Make the next step<br/><span>make sense.</span></h2><p>Follow a clear thread from a public signal to a considered business hypothesis. Every step is meant to make outreach more relevant—not more automated.</p></div><div className="ch-storypath">{[['01 — SIGNAL','What you can observe','Review visible website details, services, and positioning.'],['02 — CONTEXT','Why it might matter','Understand a plausible business implication before assuming a need.'],['03 — OPPORTUNITY','What to explore next','Start with a testable hypothesis and a relevant conversation.']].map(([tag,title,copy],i)=><article key={tag}><span>{tag}</span><h3>{title}</h3><p>{copy}</p>{i<2&&<ArrowRight className="ch-storyarrow" size={19}/>}</article>)}</div><p className="ch-disclaimer">Illustrative workflow. ProspectAI insights should be reviewed and validated before outreach.</p></section>
    <section className="ch-wrap ch-section" id="audiences"><div className="ch-sectionhead"><p className="ch-kicker">Built around your workflow</p><h2>Built for the way you win business.</h2><p>Whether you work solo or as part of a team, better context leads to better conversations.</p></div><div className="ch-audiences">{audiences.map(({title,copy,icon:Icon})=><article key={title}><Icon size={23}/><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="ch-wrap ch-section ch-faq" id="faq"><div className="ch-sectionhead"><p className="ch-kicker">Good to know</p><h2>Questions, answered clearly.</h2></div><div>{questions.map(([question,answer],index)=><details key={question} open={index===0}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    <section className="ch-wrap ch-end" id="final"><p className="ch-kicker">Make every conversation count</p><h2>Every good opportunity starts with understanding.</h2><p>Build a more thoughtful approach to finding your next opportunity.</p><Link className="ch-btn ch-primary" href="/signup">Start exploring <ArrowRight size={17}/></Link></section>
  </main>;
}
