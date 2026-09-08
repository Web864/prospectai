# ADR 0004: Deterministic Scoring, AI as Supporting Reasoning

Status: Accepted

Website and opportunity scores are computed from versioned deterministic logic. AI is server-side only, receives bounded structured evidence, and must produce validated structured output referencing known finding IDs. Invalid or unavailable AI output cannot become an authoritative score or ungrounded opportunity.
