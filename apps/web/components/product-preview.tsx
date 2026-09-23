import Image from 'next/image';
import {
  ArrowUpRight,
  CheckCircle2,
  FileSearch,
  Gauge,
  Search,
  Settings,
  Share2,
  Target,
} from 'lucide-react';

const findings = [
  ['Modern, but missing key pages', 'Content and conversion signal'],
  ['No recent case studies', 'Trust and proof signal'],
  ['Growing team / hiring', 'Commercial timing signal'],
] as const;

const services = [
  ['SEO & Content Strategy', 'Strong'],
  ['Conversion Optimization', 'Strong'],
  ['Technical SEO Audit', 'Moderate'],
] as const;

export function ProductPreview() {
  return (
    <div className="product-preview" aria-label="Illustrative ProspectAI analysis workspace">
      <div className="preview-chrome">
        <div className="preview-brand">
          <Image src="/brand-mark.png" alt="" width={24} height={24} priority />
          <strong>ProspectAI</strong>
        </div>
        <div className="preview-toolbar" aria-hidden="true">
          <span><ArrowUpRight size={12} /> Export</span>
          <span><Share2 size={12} /> Share</span>
          <b>P</b>
        </div>
      </div>

      <div className="preview-workspace">
        <aside className="preview-rail" aria-label="Product preview navigation">
          <span className="rail-active">
            <Gauge size={14} /> Overview
          </span>
          <span>
            <Search size={14} /> Research
          </span>
          <span>
            <Target size={14} /> Opportunities
          </span>
          <span>
            <Settings size={14} /> Settings
          </span>
        </aside>

        <div className="preview-main">
          <div className="preview-topbar">
            <div className="preview-url">
              <Search size={13} aria-hidden="true" />
              <span>Enter a company name or domain...</span>
            </div>
            <span className="preview-analyze">Analyze</span>
          </div>

          <div className="preview-summary">
            <div className="company-summary">
              <span className="company-icon">
                <FileSearch size={18} />
              </span>
              <div>
                <strong>example.com</strong>
                <small>Technology · 20-50 employees</small>
              </div>
              <span className="preview-confidence">
                <CheckCircle2 size={11} /> High opportunity
              </span>
            </div>
            <PreviewScore label="Readiness Score" value="62" tone="amber" />
            <PreviewScore label="Opportunity Score" value="87" tone="green" />
          </div>

          <div className="preview-detail-grid">
            <section className="preview-opportunities" aria-labelledby="preview-findings">
              <div className="preview-section-title">
                <h3 id="preview-findings">Key Findings</h3>
              </div>
              <div className="opportunity-rows">
                {findings.map(([title, evidence], index) => (
                  <article key={title}>
                    <span className={`opportunity-icon opportunity-icon-${index + 1}`}>
                      <CheckCircle2 size={11} />
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <small>{evidence}</small>
                    </div>
                  </article>
                ))}
              </div>
              <span className="preview-inline-link">View all insights <ArrowUpRight size={11} /></span>
            </section>

            <section className="preview-services" aria-labelledby="preview-services">
              <div className="preview-section-title">
                <h3 id="preview-services">Recommended Services</h3>
              </div>
              <div className="service-rows">
                {services.map(([service, strength]) => (
                  <div key={service}>
                    <Target size={11} />
                    <span>{service}</span>
                    <small>{strength}</small>
                  </div>
                ))}
              </div>
              <span className="preview-inline-link">View details <ArrowUpRight size={11} /></span>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewScore({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="preview-score">
      <span>{label}</span>
      <div className={`score-ring score-ring-${tone}`}>
        <strong>{value}</strong>
      </div>
      <small>{tone === 'green' ? 'Strong fit' : 'Readiness'}</small>
    </div>
  );
}
