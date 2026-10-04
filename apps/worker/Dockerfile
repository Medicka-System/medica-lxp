# syntax=docker/dockerfile:1.7
# Node 20 LTS en producción (§3). El contexto de build es la RAÍZ del monorepo.
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

# ── Dependencias (CAPA CACHEADA) ──
# Manifiestos primero → `pnpm install` cacheado mientras el lockfile no cambie.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

# ── Build ──
FROM deps AS build
ARG NODE_OPTIONS=--max-old-space-size=4096
ENV NODE_OPTIONS=$NODE_OPTIONS
COPY . .
RUN pnpm --filter @campus/shared build
RUN pnpm --filter @campus/db build
RUN pnpm --filter @campus/worker build

# ── Runtime ──
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/worker
CMD ["node", "dist/main.js"]
