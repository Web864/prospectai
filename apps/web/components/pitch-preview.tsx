'use client';

import { ArrowRight, Check, Copy, FileSearch, PenLine, RefreshCw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const pitchText = `Hello,

I noticed your service pages explain the offer clearly, but the next step changes from page to page. A more consistent conversion path could help qualified visitors act with less friction.

Would it be useful if I shared the three specific points I found?`;

export function PitchPreview() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  async function copyPitch() {
    try {
      await navigator.clipboard.writeText(pitchText);
      setCopied(true);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="pitch-composer" aria-label="Illustrative evidence-grounded pitch draft">
      <div className="composer-head">
        <span>
          <Sparkles size={16} /> Pitch draft
        </span>
        <span className="composer-regenerate" aria-hidden="true">
          <RefreshCw size={14} /> Regenerate
        </span>
      </div>

      <div className="pitch-tabs" aria-hidden="true">
        <span className="is-active">Email</span>
        <span>LinkedIn</span>
        <span>Summary</span>
      </div>

      <div className="pitch-draft-body">
        {pitchText.split('\n\n').map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="composer-foot">
        <span className="composer-source">
          <FileSearch size={15} />
          <span>Evidence</span>
          <span>Opportunity</span>
          <span>High confidence</span>
        </span>
        <div className="composer-actions">
          <button type="button" onClick={copyPitch} aria-label="Copy illustrative pitch">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <Link href="/app/pitches/new" aria-label="Edit pitch in ProspectAI">
            <PenLine size={15} /> Edit
          </Link>
          <span className="template-action" aria-hidden="true">
            Use template <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}
