'use client';

import { useActionState, useMemo, useState } from 'react';
import type { ActionState } from '../../app/admin/actions';
import { renderMarkdown } from '../../lib/markdown';

export interface PageEditorValues {
  kind: 'BLOG_POST' | 'LANDING_PAGE';
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  authorName: string;
  status: 'DRAFT' | 'PUBLISHED';
}

function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className="admin-field" htmlFor={`field-${name}`}>
      {label}
      {hint && <small>{hint}</small>}
      {children}
      {error && <span className="admin-error">{error}</span>}
    </label>
  );
}

export function PageEditor({
  action,
  initial,
  basePath,
  created,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  initial: PageEditorValues;
  basePath: string;
  created?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, created ? { saved: true } : {});
  const [body, setBody] = useState(initial.body);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [preview, setPreview] = useState(false);
  const rendered = useMemo(() => (preview ? renderMarkdown(body).html : ''), [preview, body]);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="admin-editor">
      <input type="hidden" name="kind" value={initial.kind} />
      <div className="admin-card">
        {state.error && <p className="admin-alert is-error">{state.error}</p>}
        {state.saved && !state.error && <p className="admin-alert is-ok">Saved.</p>}
        <Field label="Title" name="title" error={errors.title}>
          <input id="field-title" name="title" defaultValue={initial.title} required />
        </Field>
        <Field
          label="Summary"
          name="excerpt"
          hint="Shown on cards and used as the meta description when none is set."
          error={errors.excerpt}
        >
          <textarea
            id="field-excerpt"
            name="excerpt"
            rows={3}
            defaultValue={initial.excerpt}
            required
          />
        </Field>
        <div className="admin-field">
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Body (Markdown)
            <span className="admin-tabs">
              <button type="button" aria-pressed={!preview} onClick={() => setPreview(false)}>
                Write
              </button>
              <button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>
                Preview
              </button>
            </span>
          </span>
          <small>
            ## Heading, **bold**, *italic*, [link](https://…), - lists, &gt; quotes and ``` code.
            Raw HTML is shown as text.
          </small>
          <textarea
            id="field-body"
            name="body"
            className="is-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            hidden={preview}
            aria-label="Body"
          />
          {preview && (
            <div
              className="admin-preview content-prose"
              dangerouslySetInnerHTML={{ __html: rendered }}
            />
          )}
          {errors.body && <span className="admin-error">{errors.body}</span>}
        </div>
      </div>
      <aside className="admin-card">
        <Field label="Status" name="status">
          <select id="field-status" name="status" defaultValue={initial.status}>
            <option value="DRAFT">Draft (hidden)</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </Field>
        <Field
          label="URL slug"
          name="slug"
          hint={`${basePath}/your-slug. Leave empty to build it from the title.`}
          error={errors.slug}
        >
          <input id="field-slug" name="slug" defaultValue={initial.slug} />
        </Field>
        <Field label="Tags" name="tags" hint="Comma separated, for example: Claude, AI agents">
          <input id="field-tags" name="tags" defaultValue={initial.tags} />
        </Field>
        <Field label="Author" name="authorName">
          <input id="field-authorName" name="authorName" defaultValue={initial.authorName} />
        </Field>
        <Field
          label="SEO title"
          name="seoTitle"
          hint={`${seoTitle.length}/70 · leave empty to use the title`}
          error={errors.seoTitle}
        >
          <input
            id="field-seoTitle"
            name="seoTitle"
            maxLength={70}
            value={seoTitle}
            onChange={(event) => setSeoTitle(event.target.value)}
          />
        </Field>
        <Field
          label="Meta description"
          name="seoDescription"
          hint={`${seoDescription.length}/170 · aim for 140 to 160 characters`}
          error={errors.seoDescription}
        >
          <textarea
            id="field-seoDescription"
            name="seoDescription"
            rows={4}
            maxLength={170}
            value={seoDescription}
            onChange={(event) => setSeoDescription(event.target.value)}
          />
        </Field>
        <button className="admin-btn is-primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </button>
      </aside>
    </form>
  );
}
