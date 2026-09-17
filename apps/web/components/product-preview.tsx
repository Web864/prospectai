import Image from 'next/image';
import {
  ArrowUpRight,
  CheckCircle2,
  Chrome,
  FileSearch,
  Gauge,
  Search,
  Sparkles,
  Target,
} from 'lucide-react';

const findings = [
  ['Modern, but missing key pages', 'Content and conversion signal'],
  ['No recent case studies', 'Trust and proof signal'],
  ['Growing team and offer', 'Commercial timing signal'],
] as const;

const services = [
  ['SEO and content strategy', 'Strong'],
  ['Conversion optimization', 'Strong'],
  ['Technical SEO audit', 'Moderate'],
] as const;

export function ProductPreview() {
  return (
    <div className="product-preview" aria-label="Illustrative ProspectAI analysis workspace">
      <div className="preview-chrome">
        <div className="preview-brand">
          <Image src="/brand-mark.png" alt="" width={28} height={28} priority />
          <strong>ProspectAI</strong>
        </div>
        <span className="preview-label">Illustrative analysis</span>
      </div>

      <div className="preview-workspace">
        <aside className="preview-rail" aria-label="Product preview navigation">
          <span className="rail-active">
            <Gauge size={16} /> Overview
          </span>
          <span>
            <Search size={16} /> Research
          </span>
          <span>
            <Target size={16} /> Opportunities
          </span>
          <span>
            <Sparkles size={16} /> Pitch
          </span>
          <span className="extension-entry">
            <Chrome size={16} /> Built for Chrome
          </span>
        </aside>

        <div className="preview-main">
          <div className="preview-topbar">
            <div className="preview-url">
              <Search size={15} aria-hidden="true" />
              <span>Enter a company name or domain...</span>
            </div>
            <span className="preview-analyze">Analyze</span>
          </div>

          <div className="preview-summary">
            <div className="company-summary">
              <span className="company-icon">
                <FileSearch size={22} />
              </span>
              <div>
                <strong>example.com</strong>
                <small>Technology · 20-50 employees</small>
              </div>
              <span className="preview-confidence">
                <CheckCircle2 size={13} /> High opportunity
              </span>
            </div>
            <PreviewScore label="Website Score" value="62" tone="amber" />
            <PreviewScore label="Opportunity Score" value="87" tone="green" />
          </div>

          <div className="preview-detail-grid">
            <section className="preview-opportunities" aria-labelledby="preview-findings">
              <div className="preview-section-title">
                <h3 id="preview-findings">Key findings</h3>
                <span>
                  View all insights <ArrowUpRight size={13} />
                </span>
              </div>
              <div className="opportunity-rows">
                {findings.map(([title, evidence], index) => (
                  <article key={title}>
                    <span className={`opportunity-icon opportunity-icon-${index + 1}`}>
                      <CheckCircle2 size={13} />
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <small>{evidence}</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="preview-services" aria-labelledby="preview-services">
              <div className="preview-section-title">
                <h3 id="preview-services">Recommended services</h3>
              </div>
              <div className="service-rows">
                {services.map(([service, strength]) => (
                  <div key={service}>
                    <Target size={13} />
                    <span>{service}</span>
                    <small>{strength}</small>
                  </div>
                ))}
              </div>
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
