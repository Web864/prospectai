# ADR 0001: Modular Monolith With Dedicated Worker

Status: Accepted

ProspectAI uses one Next.js web/API application and one dedicated Node.js BullMQ worker. Domain modules live in shared packages with explicit interfaces. This keeps authorization, tenancy, API contracts, and data ownership centralized while moving crawler/AI workloads out of request handling. Separate microservices are not introduced at this stage.
