import { ContactPage } from '../../components/contact-page';
import { PublicPage } from '../../components/public-page';
import { publicPageMetadata } from '../../lib/site-metadata';

export const metadata = publicPageMetadata('/contact') ?? {};

export default function ContactRoute() {
  return (
    <PublicPage path="/contact">
      <ContactPage />
    </PublicPage>
  );
}
