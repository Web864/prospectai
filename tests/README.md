# Test Fixtures

This directory is reserved for cross-workspace fixtures and end-to-end suites. Tests must use synthetic data and controlled local crawler targets; they must never contact arbitrary external websites or production providers.

## Phase 6 Runtime Integration

Start the web API and worker against a migrated development PostgreSQL database, select the development email adapter, then run:

node tests/integration/phase6-runtime.mjs

The harness uses synthetic account and guest data. It never calls AI, email, or payment production providers. Its crawler target is the stable public example.com test domain.
