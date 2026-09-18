# Node 20 LTS en producción (§3). El contexto de build es la RAÍZ del monorepo.
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

# ── Dependencias + build ──
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @campus/shared build
RUN pnpm --filter @campus/db build
RUN pnpm --filter @campus/api build

# ── Runtime ──
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo /repo
WORKDIR /repo/apps/api
EXPOSE 8000
CMD ["node", "dist/main.js"]
