import { LegalPage } from '../../components/legal-pages';
import { PublicPage } from '../../components/public-page';
import { publicPageMetadata } from '../../lib/site-metadata';

export const metadata = publicPageMetadata('/terms') ?? {};

export default function TermsRoute() {
  return (
    <PublicPage path="/terms">
      <LegalPage kind="terms" />
    </PublicPage>
  );
}
