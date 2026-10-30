# syntax=docker/dockerfile:1.7
# Node 20 LTS en producción (§3). El contexto de build es la RAÍZ del monorepo.
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /repo

# ── Dependencias (CAPA CACHEADA) ──
# Solo los MANIFIESTOS primero: así `pnpm install` queda en una capa que BuildKit
# reutiliza mientras el lockfile + los package.json no cambien. Un cambio de CÓDIGO
# ya no re-dispara la instalación (antes el `COPY . .` previo la invalidaba siempre).
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
# Cache mount del store de pnpm: acelera también el primer build tras cambiar el lockfile.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

# ── Build ──
FROM deps AS build
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
ARG NODE_OPTIONS=--max-old-space-size=4096
ENV NODE_OPTIONS=$NODE_OPTIONS
# COPY por CAPAS para aislar la caché (no un `COPY . .` monolítico): primero lo COMPARTIDO
# (turbo.json + packages/*), luego SOLO esta app. Así un cambio en apps/web NO invalida las
# imágenes de api/worker, y un cambio en apps/api|worker NO invalida la de web (cada
# Dockerfile copia únicamente SU app). `.dockerignore` deja fuera node_modules/.next/dist.
COPY turbo.json ./
COPY packages/ ./packages/
RUN pnpm --filter @campus/shared build
COPY apps/web/ ./apps/web/
# Cache de compilación de Next (webpack) ENTRE builds: BuildKit persiste `.next/cache`
# fuera de la imagen → `next build` recompila INCREMENTAL. No afecta el runtime.
RUN --mount=type=cache,id=next-cache-web,target=/repo/apps/web/.next/cache \
    pnpm --filter @campus/web build

# ── Runtime (SLIM · Next standalone, como el CRM) ──
# En vez de `COPY /repo /repo` (monorepo + node_modules enteros → imagen de ~2GB), se
# copia SOLO la salida standalone de Next: server.js autocontenido + node_modules podados
# por file-tracing (`output: 'standalone'`, §3). `outputFileTracingRoot` = raíz del
# monorepo, así que standalone MIRRORea /repo: server.js queda en `apps/web/server.js`.
# `.next/static` y `public` NO van en standalone → se copian aparte (incl. el `sw.js` de
# serwist). Resultado: imagen de cientos de MB en vez de 2GB.
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
# El server.js de standalone lee PORT y HOSTNAME del entorno. Docker fija HOSTNAME al
# id del contenedor → sin esto, Next bindea a esa interfaz y NO a 0.0.0.0, así que
# `localhost:3000` (el healthcheck de compose) y traefik por localhost fallan aunque
# sirva en su IP. Forzar 0.0.0.0 es el patrón estándar de Next standalone en Docker.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/web/server.js"]
