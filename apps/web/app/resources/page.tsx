import { ResourcesPage } from '../../components/reference-marketing-pages';
import { PublicPage } from '../../components/public-page';
import { publicPageMetadata } from '../../lib/site-metadata';

export const metadata = publicPageMetadata('/resources') ?? {};

export default function ResourcesRoute() {
  return (
    <PublicPage path="/resources">
      <ResourcesPage />
    </PublicPage>
  );
}
