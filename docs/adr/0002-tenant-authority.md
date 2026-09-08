# ADR 0002: Server-Derived Tenant Authority

Status: Accepted

All tenant-owned persistence models carry an organization foreign key. The server derives the active organization from a verified membership/session or extension session; it does not authorize client-supplied organization IDs. Scoped uniqueness and indexes supplement, but do not replace, authorization checks.
