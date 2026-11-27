'use client';

import { ArrowUp, MessageCircle, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import './site-assistant.css';

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  sources?: { title: string; url: string }[] | undefined;
}

const suggestions = [
  'What does ProspectAI do?',
  'Is there a free plan?',
  'How is the opportunity score calculated?',
];

const greeting: Turn = {
  role: 'assistant',
  content:
    'Hi! I answer questions about ProspectAI using what is published on this website. What would you like to know?',
};

/** Floating website assistant. Answers come from /api/v1/site-assistant, grounded in site content. */
export function SiteAssistant() {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([greeting]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function ask(question: string) {
    const message = question.trim().slice(0, 500);
    if (!message || busy) return;
    const history = turns
      .filter((turn) => turn !== greeting)
      .slice(-6)
      .map(({ role, content }) => ({ role, content: content.slice(0, 1_200) }));
    setTurns((current) => [...current, { role: 'user', content: message }]);
    setDraft('');
    setBusy(true);
    try {
      const response = await fetch('/api/v1/site-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      });
      const body = (await response.json().catch(() => null)) as {
        data?: { answer: string; sources: Turn['sources'] };
        error?: { message?: string };
      } | null;
      if (!response.ok || !body?.data)
        throw new Error(
          response.status === 429
            ? 'You have asked a lot of questions in a short time. Please try again in a few minutes.'
            : (body?.error?.message ?? 'The assistant could not answer right now.'),
        );
      setTurns((current) => [
        ...current,
        { role: 'assistant', content: body.data!.answer, sources: body.data!.sources },
      ]);
    } catch (error) {
      setTurns((current) => [
        ...current,
        {
          role: 'assistant',
          content: error instanceof Error ? error.message : 'The assistant could not answer.',
          sources: [{ title: 'Contact', url: '/contact' }],
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`sa-root${open ? ' is-open' : ''}`}>
      {open && (
        <section className="sa-panel" role="dialog" aria-label="ProspectAI assistant">
          <header className="sa-head">
            <span className="sa-avatar" aria-hidden="true">
              <Sparkles size={16} />
            </span>
            <div>
              <strong>ProspectAI assistant</strong>
              <small>Answers from this website only</small>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X size={18} />
            </button>
          </header>
          <div className="sa-messages" ref={listRef} aria-live="polite">
            {turns.map((turn, index) => (
              <div className={`sa-turn is-${turn.role}`} key={index}>
                <p>{turn.content}</p>
                {turn.sources && turn.sources.length > 0 && (
                  <div className="sa-sources">
                    {turn.sources.map((source) => (
                      <Link key={source.url} href={source.url} onClick={() => setOpen(false)}>
                        {source.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="sa-turn is-assistant sa-typing" aria-label="Assistant is typing">
                <i />
                <i />
                <i />
              </div>
            )}
            {turns.length === 1 && (
              <div className="sa-suggestions">
                {suggestions.map((suggestion) => (
                  <button type="button" key={suggestion} onClick={() => ask(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form
            className="sa-form"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(draft);
            }}
          >
            <textarea
              ref={inputRef}
              value={draft}
              maxLength={500}
              rows={1}
              placeholder="Ask about features, plans, data…"
              aria-label="Your question"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void ask(draft);
                }
              }}
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label="Send question">
              <ArrowUp size={18} />
            </button>
          </form>
        </section>
      )}
      <button
        type="button"
        className="sa-launcher"
        aria-expanded={open}
        aria-label={open ? 'Close assistant' : 'Ask the ProspectAI assistant'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
