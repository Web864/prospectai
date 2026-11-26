import { HowItWorksPage } from '../../components/how-it-works-page';
import { PublicPage } from '../../components/public-page';
import { publicPageMetadata } from '../../lib/site-metadata';

export const metadata = publicPageMetadata('/how-it-works') ?? {};

export default function HowItWorksRoute() {
  return (
    <PublicPage path="/how-it-works">
      <HowItWorksPage />
    </PublicPage>
  );
}
