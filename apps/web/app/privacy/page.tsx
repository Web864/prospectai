import { LegalPage } from '../../components/legal-pages';
import { PublicPage } from '../../components/public-page';
import { publicPageMetadata } from '../../lib/site-metadata';

export const metadata = publicPageMetadata('/privacy') ?? {};

export default function PrivacyRoute() {
  return (
    <PublicPage path="/privacy">
      <LegalPage kind="privacy" />
    </PublicPage>
  );
}
