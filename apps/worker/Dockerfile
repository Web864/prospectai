FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm --filter @prospectai/worker build
ENV NODE_ENV=production
USER node
STOPSIGNAL SIGTERM
# Workspace exports are TypeScript; tsx is deliberately retained for execution.
CMD ["pnpm", "--filter", "@prospectai/worker", "exec", "tsx", "src/index.ts"]
