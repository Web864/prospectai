import { FeaturesPage } from '../../components/reference-marketing-pages';
import { PublicPage } from '../../components/public-page';
import { publicPageMetadata } from '../../lib/site-metadata';

export const metadata = publicPageMetadata('/features') ?? {};

export default function FeaturesRoute() {
  return (
    <PublicPage path="/features">
      <FeaturesPage />
    </PublicPage>
  );
}
