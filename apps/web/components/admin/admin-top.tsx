import Image from 'next/image';
import Link from 'next/link';

const links = [
  ['Content', '/admin'],
  ['FAQ and chatbot answers', '/admin/faq'],
] as const;

export function AdminTop({ email, active }: { email: string; active: string }) {
  return (
    <header className="admin-top">
      <Link className="admin-brand" href="/admin">
        <Image src="/brand-mark.png" alt="" width={28} height={28} />
        Site admin
      </Link>
      <nav aria-label="Admin">
        {links.map(([label, href]) => (
          <Link key={href} href={href} aria-current={active === href ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="admin-user">
        <span>{email}</span>
        <Link href="/" target="_blank">
          View site
        </Link>
      </div>
    </header>
  );
}
