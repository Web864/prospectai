import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnalysisView, DashboardView, LeadsView } from './product-views';
describe('product UI states', () => {
  it('renders dashboard empty state without fake metrics', () => {
    const html = renderToStaticMarkup(<DashboardView />);
    expect(html).toContain('Ready for your first prospect');
    expect(html).toContain('>--<');
  });
  it('renders lead list empty state', () =>
    expect(renderToStaticMarkup(<LeadsView />)).toContain('No saved leads yet'));
  it('separates evidence, interpretation, and opportunity', () => {
    const html = renderToStaticMarkup(<AnalysisView />);
    expect(html).toContain('Evidence');
    expect(html).toContain('Interpretation');
    expect(html).toContain('Opportunity');
  });
  it('renders partial analysis state', () =>
    expect(renderToStaticMarkup(<AnalysisView partial />)).toContain('Partial analysis'));
  it('renders actionable analysis error', () =>
    expect(renderToStaticMarkup(<AnalysisView failed />)).toContain('Try again'));
});
