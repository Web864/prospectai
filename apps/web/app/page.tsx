import { Homepage } from '../components/homepage';
import { SiteShell } from '../components/site-shell';
import { StructuredData, homepageStructuredData } from '../components/structured-data';
import { publicPageMetadata } from '../lib/site-metadata';

export const metadata = publicPageMetadata('/') ?? {};

export default function HomePage() {
  return (
    <SiteShell>
      <StructuredData data={homepageStructuredData()} />
      <Homepage />
    </SiteShell>
  );
}
