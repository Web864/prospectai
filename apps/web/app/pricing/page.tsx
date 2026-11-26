import { PricingPage } from '../../components/reference-marketing-pages';
import { PublicPage } from '../../components/public-page';
import { publicPageMetadata } from '../../lib/site-metadata';

export const metadata = publicPageMetadata('/pricing') ?? {};

export default function PricingRoute() {
  return (
    <PublicPage path="/pricing">
      <PricingPage />
    </PublicPage>
  );
}
