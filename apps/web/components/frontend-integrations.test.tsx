import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthForm } from './auth-form';
import { OnboardingForm } from './onboarding-form';
import { UsageView } from './workspace-views';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('Phase 5 frontend flows', () => {
  it('submits login credentials and reports an unauthorized response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(json({ error: { message: 'Invalid credentials' } }, 401));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<AuthForm page="login" />);
    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.type(screen.getByLabelText('Password'), 'long-password');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect((await screen.findByRole('alert')).textContent).toContain('email or password');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('requires a reset token before accepting a new password', () => {
    render(<AuthForm page="reset-password" />);
    expect(screen.getByText('Reset link required')).toBeTruthy();
  });

  it('persists required and optional onboarding fields through the API contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ data: { message: 'Profile saved' } }));
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    render(<OnboardingForm />);
    await user.selectOptions(screen.getByLabelText('Role'), 'Agency');
    await user.type(screen.getByLabelText('Services offered'), 'Web design, SEO');
    await user.type(screen.getByLabelText(/Industries/), 'SaaS, Legal');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Profile saved')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/onboarding'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });

  it('shows authoritative quota exceeded state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json({
          data: {
            plan: 'free',
            used: 3,
            limit: 3,
            remaining: 0,
            periodStart: '2026-09-01T00:00:00.000Z',
            periodEnd: '2026-10-01T00:00:00.000Z',
            quotaReached: true,
          },
        }),
      ),
    );
    render(<UsageView />);
    expect(await screen.findByText('Analysis limit reached')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View plans' })).toBeTruthy();
  });
});
