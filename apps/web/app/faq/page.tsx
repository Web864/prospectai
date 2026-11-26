import { FaqPage } from '../../components/reference-marketing-pages';
import { PublicPage } from '../../components/public-page';
import { publicPageMetadata } from '../../lib/site-metadata';

export const metadata = publicPageMetadata('/faq') ?? {};

export default function FaqRoute() {
  return (
    <PublicPage path="/faq">
      <FaqPage />
    </PublicPage>
  );
}
