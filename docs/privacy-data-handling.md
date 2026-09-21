# Privacy and Guest Data Handling

ProspectAI analyzes only the active page selected by the user after an explicit action. It does not continuously monitor tabs, collect browser history, harvest prospects in the background, or upload page content before analysis is requested.

Guest storage is limited to an opaque guest token, public session identifier, disclosure acknowledgement, and a temporary current-analysis identifier used only to restore the result after account conversion. The backend stores trial usage, analysis jobs, and limited results needed for recovery and conversion. Guest session/result retention is configurable and defaults to 30 days; expired guest data must be removed by the scheduled retention process before production release.

Guest conversion transfers only eligible analyses, current results, and opportunity summaries belonging to that guest session. It does not transfer unrelated browsing data. ProspectAI does not sell browsing history. Operational logs and analytics exclude tokens, raw page content, URLs, and unnecessary personal data.
