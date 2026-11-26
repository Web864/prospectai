import { describe, expect, it } from 'vitest';
import { detectPage } from './page-detection';

describe('page detection', () => {
  it('accepts public http and https business websites and drops the fragment', () => {
    expect(detectPage('https://www.example.com/services#pricing')).toEqual({
      supported: true,
      url: 'https://www.example.com/services',
      domain: 'example.com',
    });
    expect(detectPage('http://shop.example.co.uk/')).toMatchObject({ supported: true });
  });

  it.each([
    [undefined, 'no_access'],
    ['chrome://settings', 'browser_page'],
    ['chrome-extension://abc/popup.html', 'browser_page'],
    ['about:blank', 'browser_page'],
    ['view-source:https://example.com', 'browser_page'],
    ['https://chromewebstore.google.com/detail/x', 'browser_page'],
    ['file:///Users/me/site.html', 'not_web'],
    ['ftp://example.com', 'not_web'],
    ['data:text/html,hi', 'not_web'],
    ['http://localhost:3000', 'local_network'],
    ['http://app.localhost', 'local_network'],
    ['http://127.0.0.1:8080', 'local_network'],
    ['http://192.168.1.20', 'local_network'],
    ['http://10.0.0.5', 'local_network'],
    ['http://172.20.1.1', 'local_network'],
    ['http://169.254.169.254/latest', 'local_network'],
    ['http://[::1]:3000', 'local_network'],
    ['http://printer.local', 'local_network'],
    ['http://intranet/', 'local_network'],
    ['https://www.linkedin.com/company/example', 'linkedin'],
    ['https://example.com/brochure.pdf', 'document'],
    ['not a url', 'invalid'],
  ])('refuses %s as %s', (url, reason) => {
    expect(detectPage(url)).toEqual({ supported: false, reason });
  });

  it('does not mistake public addresses for private ones', () => {
    expect(detectPage('http://172.32.0.1')).toMatchObject({ supported: true });
    expect(detectPage('https://local-business.com')).toMatchObject({ supported: true });
  });
});
