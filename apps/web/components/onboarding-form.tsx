'use client';

import { useState, type FormEvent } from 'react';
import { actionResponseSchema, onboardingInputSchema } from '@prospectai/validation';
import { Button } from './design-system';
import { ApiClientError, webApiRequest } from '../lib/web-api';

export function OnboardingForm() {
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const values = new FormData(event.currentTarget);
    const list = (name: string) =>
      String(values.get(name) ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const parsed = onboardingInputSchema.safeParse({
      role: values.get('role'),
      services: list('services'),
      industries: list('industries'),
      locations: list('locations'),
      icp: values.get('icp') || undefined,
      agencyWebsite: values.get('agencyWebsite') || undefined,
      outreachPreferences: values.get('outreachPreferences') || undefined,
    });
    if (!parsed.success) {
      setMessage('Role and at least one service are required. Check optional URLs as well.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const response = await webApiRequest('/onboarding', actionResponseSchema, {
        method: 'PUT',
        body: JSON.stringify(parsed.data),
      });
      setMessage(response.data.message);
      if (response.data.next?.startsWith('/')) window.location.assign(response.data.next);
    } catch (error) {
      setMessage(
        error instanceof ApiClientError ? error.message : 'Onboarding could not be saved.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-panel" onSubmit={(event) => void submit(event)}>
      <label className="field">
        Role
        <select name="role" required defaultValue="">
          <option value="" disabled>
            Select a role
          </option>
          <option>Freelancer</option>
          <option>Agency</option>
          <option>Consultant</option>
          <option>Sales team</option>
        </select>
      </label>
      <label className="field">
        Services offered
        <textarea name="services" rows={3} required placeholder="Web design, performance, SEO" />
      </label>
      <label className="field">
        Industries <span className="muted">Optional, comma-separated</span>
        <input name="industries" />
      </label>
      <label className="field">
        Locations <span className="muted">Optional, comma-separated</span>
        <input name="locations" />
      </label>
      <label className="field">
        Ideal customer profile <span className="muted">Optional</span>
        <textarea name="icp" rows={2} />
      </label>
      <label className="field">
        Agency website <span className="muted">Optional</span>
        <input name="agencyWebsite" type="url" inputMode="url" />
      </label>
      <label className="field">
        Outreach preferences <span className="muted">Optional</span>
        <textarea name="outreachPreferences" rows={2} />
      </label>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Saving...' : 'Continue'}
      </Button>
    </form>
  );
}
