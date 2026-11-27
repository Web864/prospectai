'use client';

import { useActionState } from 'react';
import type { ActionState } from '../../app/admin/actions';

export interface FaqValues {
  question: string;
  answer: string;
  sortOrder: number;
  status: 'DRAFT' | 'PUBLISHED';
}

export function FaqEditor({
  action,
  remove,
  initial,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  remove?: () => Promise<void>;
  initial: FaqValues;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errors = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="admin-card admin-faq-row">
      <label className="admin-field">
        Question
        <input name="question" defaultValue={initial.question} required />
        {errors.question && <span className="admin-error">{errors.question}</span>}
      </label>
      <label className="admin-field" style={{ gridColumn: '1 / -1' }}>
        Answer
        <small>Plain text. The chatbot quotes from published answers only.</small>
        <textarea name="answer" rows={3} defaultValue={initial.answer} required />
        {errors.answer && <span className="admin-error">{errors.answer}</span>}
      </label>
      <label className="admin-field">
        Order
        <input name="sortOrder" type="number" min={0} defaultValue={initial.sortOrder} />
      </label>
      <label className="admin-field">
        Status
        <select name="status" defaultValue={initial.status}>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </select>
      </label>
      <div className="admin-row-actions">
        <button className="admin-btn is-primary" type="submit" disabled={pending}>
          {pending ? 'Saving…' : remove ? 'Save' : 'Add answer'}
        </button>
        {remove && (
          <button className="admin-btn is-danger" type="submit" formAction={remove}>
            Delete
          </button>
        )}
        {state.saved && <span className="admin-alert is-ok">Saved.</span>}
        {state.error && <span className="admin-alert is-error">{state.error}</span>}
      </div>
    </form>
  );
}
