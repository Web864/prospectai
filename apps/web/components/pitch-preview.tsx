'use client';

import { ArrowRight, Check, Copy, PenLine, RefreshCw, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const pitchText = `Hi there,

I noticed that your website is missing recent case studies and could benefit from stronger content around your new product offering.

I help companies like yours improve their online presence and generate more qualified leads through strategic content and SEO.`;

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
          <Sparkles size={15} /> Pitch draft
        </span>
        <span className="composer-regenerate" aria-hidden="true">
          <RefreshCw size={12} /> Regenerate
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
        <div className="composer-actions">
          <button type="button" onClick={copyPitch} aria-label="Copy illustrative pitch">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <Link href="/app/pitches/new" aria-label="Edit pitch in ProspectAI">
            <PenLine size={13} /> Edit
          </Link>
        </div>
        <span className="template-action" aria-hidden="true">
          Use template <ArrowRight size={13} />
        </span>
      </div>
    </div>
  );
}
