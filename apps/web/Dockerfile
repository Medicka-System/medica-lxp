# Node 20 LTS en producción (§3). El contexto de build es la RAÍZ del monorepo.
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

# ── Dependencias + build ──
FROM base AS build
# NEXT_PUBLIC_* se inlinea en build; apunta al host del navegador, no a la red docker.
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
# Supabase (§10): el cliente @supabase/ssr (login, middleware, realtime) y el CSP de
# next.config.mjs se resuelven en el navegador → deben quedar INLINEADOS en el build.
ARG NEXT_PUBLIC_SUPABASE_URL=
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_TELEMETRY_DISABLED=1
# Tope de heap de Node para el build de Next (webpack + Cornerstone): evita OOM en
# hosts con RAM acotada / build con --memory. Cabe en un contenedor de 6 GB.
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @campus/shared build
RUN pnpm --filter @campus/web build

# ── Runtime ──
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /repo /repo
WORKDIR /repo/apps/web
EXPOSE 3000
CMD ["pnpm", "start", "-p", "3000"]
