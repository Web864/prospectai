import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './app-shell';
import { SettingsView } from './workspace-views';

vi.mock('next/navigation', () => ({ usePathname: () => '/app/settings/extension' }));
vi.mock('./account-session', () => ({
  AccountSession: () => <button aria-label="Account">QA</button>,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('V3 blueprint integration', () => {
  it('retains the source dimensions, colors and responsive grids', () => {
    const source = readFileSync(
      resolve('../../docs/ProspectAI_Codex_Handoff/references/prototypes/dashboard-v3.html'),
      'utf8',
    );
    const css = readFileSync(resolve('app/workspace-redesign.css'), 'utf8');
    for (const token of [
      '#f7f9fa',
      '#101d2c',
      '#627486',
      '#e1e8ec',
      '#098568',
      '#e7f5ef',
      '#0c161d',
      '#13252f',
      '#afc0ca',
      '#29404b',
    ]) {
      expect(source).toContain(token);
      expect(css).toContain(token);
    }
    const style = document.createElement('style');
    style.textContent = css;
    document.head.append(style);
    const rules = Array.from(style.sheet!.cssRules).filter(
      (rule): rule is CSSStyleRule => 'selectorText' in rule,
    );
    const property = (selector: string, name: string) =>
      rules
        .find(
          (rule) =>
            rule.selectorText === `.app-shell.v3-app ${selector}` &&
            rule.style.getPropertyValue(name),
        )
        ?.style.getPropertyValue(name);
    expect(property('.v3-side', 'width')).toBe('250px');
    expect(property('.v3-top', 'height')).toBe('79px');
    expect(property('.v3-content', 'padding')).toBe('35px 38px 85px');
    expect(property('.v3-stat', 'padding')).toBe('20px 22px');
    expect(property('.v3-stat', 'border-radius')).toBe('15px');
    expect(property('.v3-surface', 'border-radius')).toBe('16px');
    expect(property('.v3-surfacepad', 'padding')).toBe('24px');
    expect(css).toMatch(/max-width:\s*1160px/);
    expect(css).toMatch(/max-width:\s*800px/);
    expect(css).toMatch(/max-width:\s*480px/);
    style.remove();
  });

  it('keeps all real navigation, page search, collapse and accessible mobile navigation', async () => {
    const user = userEvent.setup();
    render(
      <AppShell title="Extension management" activePath="/app/settings/extension">
        <p>Workspace content</p>
      </AppShell>,
    );
    const nav = screen.getByRole('navigation', { name: 'Application' });
    expect(nav.querySelectorAll('a')).toHaveLength(8);
    expect(nav.closest('.v4-side-scroll')).toBeTruthy();
    const utilities = screen.getByRole('navigation', { name: 'Preferences and tools' });
    expect(utilities.closest('.v4-side-bottom')).toBeTruthy();
    expect(
      Array.from(utilities.querySelectorAll('a'), (link) => link.getAttribute('href')),
    ).toEqual(['/app/settings', '/app/settings/extension']);
    expect(utilities.querySelector('[aria-current="page"]')?.getAttribute('href')).toBe(
      '/app/settings/extension',
    );
    expect(nav.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
    expect(utilities.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    await user.click(screen.getByRole('searchbox', { name: 'Find a workspace page' }));
    await user.paste('billing');
    expect(screen.getByRole('navigation', { name: 'Search results' }).textContent).toContain(
      'Billing',
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Search results' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));
    expect(
      screen.getByRole('button', { name: 'Expand sidebar' }).getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('opens the mobile drawer, traps focus and closes with Escape', async () => {
    const user = userEvent.setup();
    render(
      <AppShell title="Extension management" activePath="/app/settings/extension">
        <p>Workspace content</p>
      </AppShell>,
    );
    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog', { name: 'ProspectAI navigation' })).toBeTruthy();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Connected')).toBeNull();
  });

  it('preserves saved settings and sends the existing PATCH contract', async () => {
    const data = {
      displayName: 'Existing name',
      role: 'Consultant',
      services: ['SEO', 'Web design'],
      outreachPreferences: 'Evidence first',
      extension: { connected: false, status: 'disconnected' },
    };
    const fetchMock = vi
      .fn()
      .mockImplementation(
        async (_url, init) =>
          new Response(
            JSON.stringify(
              init?.method === 'PATCH' ? { data: { message: 'Settings saved' } } : { data },
            ),
            { headers: { 'Content-Type': 'application/json' } },
          ),
      );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<SettingsView />);
    expect(((await screen.findByLabelText('Display name')) as HTMLInputElement).value).toBe(
      'Existing name',
    );
    await user.click(screen.getByRole('button', { name: 'Save settings' }));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/settings'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          displayName: 'Existing name',
          role: 'Consultant',
          services: ['SEO', 'Web design'],
          outreachPreferences: 'Evidence first',
        }),
      }),
    );
  });

  it('does not show an active extension when the API says disconnected', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              displayName: null,
              role: null,
              services: [],
              outreachPreferences: null,
              extension: { connected: false, status: 'disconnected' },
            },
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    render(<SettingsView extensionOnly />);
    expect(await screen.findByText('Disconnected')).toBeTruthy();
    expect(screen.queryByText('Extension active')).toBeNull();
    expect(screen.getByRole('link', { name: 'Reconnect' }).getAttribute('href')).toBe(
      '/extension/connect',
    );
  });
});
