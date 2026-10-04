#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# Deploy de UN comando del stack LXP "prisma"  ·  vive en /var/www/prisma/deploy.sh
#
#   ssh LXP-Medica 'bash /var/www/prisma/deploy.sh'          # despliega HEAD de main
#   ssh LXP-Medica 'bash /var/www/prisma/deploy.sh <rama>'   # despliega otra rama
#
# Qué hace:
#   1) Trae el código a /var/www/prisma/repo con git (fetch + reset --hard a
#      origin/<rama>). Determinista al HEAD; NO sube node_modules (git no los trackea).
#      El VPS ya tiene llave SSH con acceso de lectura al repo (sin secreto nuevo).
#   2) Construye las 3 imágenes del LXP con BuildKit + caché de capas (manifiestos
#      primero → pnpm install cacheado), --memory=6g/--memory-swap=10g, NODE_OPTIONS
#      y --platform linux/amd64. Build-args de Supabase tomados de /var/www/prisma/.env.
#   3) `docker compose up -d` → recrea SOLO los servicios prisma-* (proyecto "prisma").
#
# PRIORIDAD #1 — NO TOCAR EL CRM:
#   · SOLO opera dentro de /var/www/prisma y sobre imágenes campus-lxp-*.
#   · NUNCA corre compose sobre el stack del CRM ni reconstruye sus imágenes.
#   · NO reinicia el Traefik del host (solo se adjunta a la red externa crm_web).
#   · Vigila RAM y la salud de los contenedores crm-*; si el CRM se cae, ABORTA
#     antes de tocar compose.
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

PRISMA=/var/www/prisma
REPO="$PRISMA/repo"
COMPOSE="$PRISMA/docker-compose.yml"
ENV_FILE="$PRISMA/.env"
GIT_URL="git@github.com:Medicka-System/medica-lxp.git"
BRANCH="${1:-main}"
APP_URL="https://prisma.medicacapacitacion.com"

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

log() { echo -e "\n\033[1;36m>> $*\033[0m"; }
die() { echo -e "\n\033[1;31m!! $*\033[0m" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "Falta $ENV_FILE"
[ -f "$COMPOSE" ]  || die "Falta $COMPOSE"

# ── Firma de salud del CRM (nombre + nº de reinicios + arranque). Si cambia, el CRM
#    sufrió → abortamos. Fuente única de verdad para "no tocar el CRM". ──
crm_firma() {
  docker ps --filter 'name=crm-' --format '{{.Names}}' | sort | while read -r c; do
    [ -n "$c" ] && docker inspect -f '{{.Name}} r={{.RestartCount}} s={{.State.StartedAt}}' "$c"
  done
}
CRM_ANTES="$(crm_firma)"
CRM_N=$(printf '%s\n' "$CRM_ANTES" | grep -c . || true)
log "CRM vivo: $CRM_N contenedores (snapshot tomado)"
[ "$CRM_N" -ge 1 ] || die "No veo contenedores crm-* arriba; abortando por precaución"

crm_ok() {
  local ahora; ahora="$(crm_firma)"
  [ "$ahora" = "$CRM_ANTES" ] || {
    echo "--- CRM antes ---"; echo "$CRM_ANTES"
    echo "--- CRM ahora ---"; echo "$ahora"
    die "El CRM cambió (reinicio/caída) — ABORTO sin tocar compose del LXP"
  }
}

# ── Preflight de RAM: no arrancar si el host ya está ahogado. ──
MEM_AVAIL=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
log "RAM disponible: ${MEM_AVAIL} MiB"; free -h | awk 'NR<=2'
[ "$MEM_AVAIL" -ge 1500 ] || die "RAM disponible (${MEM_AVAIL} MiB) demasiado baja para construir sin arriesgar al CRM"

# ── 1) Código: git fetch + reset --hard (sin node_modules, exacto a HEAD) ──
# SKIP_FETCH=1 → despliega el checkout ACTUAL de $REPO sin tocar git (útil cuando el
# origin no es alcanzable/empujable todavía, p. ej. un commit traído por bundle).
if [ "${SKIP_FETCH:-0}" = "1" ]; then
  [ -d "$REPO/.git" ] || die "SKIP_FETCH=1 pero $REPO no es un repo git"
  log "SKIP_FETCH=1 → usando el checkout actual de $REPO (sin git fetch)"
else
  log "Trayendo código (rama $BRANCH)…"
  if [ -d "$REPO/.git" ]; then
    git -C "$REPO" fetch --depth 1 origin "$BRANCH"
    git -C "$REPO" reset --hard "origin/$BRANCH"
    git -C "$REPO" clean -fd
  else
    git clone --depth 1 --branch "$BRANCH" "$GIT_URL" "$REPO"
  fi
fi
SHA=$(git -C "$REPO" rev-parse --short HEAD)
log "Código en $SHA"

# ── 2) Build-args de Supabase desde el .env del stack (no se imprimen) ──
set -a; . "$ENV_FILE"; set +a
: "${NEXT_PUBLIC_SUPABASE_URL:?falta NEXT_PUBLIC_SUPABASE_URL en .env}"
: "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?falta NEXT_PUBLIC_SUPABASE_ANON_KEY en .env}"

BUILD_COMMON=(--platform linux/amd64 --memory=6g --memory-swap=10g
              --build-arg NODE_OPTIONS=--max-old-space-size=4096)

# Muestrea `free -h` cada 15s mientras dura un build (para "vigilar la RAM").
sampler() { while true; do sleep 15; echo "   [ram] $(free -h | awk '/Mem:/{print "usada "$3" / disp "$7}')"; done; }

build() {
  local name=$1 dockerfile=$2; shift 2
  log "Build $name  (cache de capas + BuildKit)"
  sampler & local sp=$!
  if ! docker build "${BUILD_COMMON[@]}" "$@" \
        -t "${name}:latest" -f "$REPO/$dockerfile" "$REPO"; then
    kill "$sp" 2>/dev/null || true; die "Build de $name falló"
  fi
  kill "$sp" 2>/dev/null || true
  crm_ok   # tras cada build: ¿el CRM sigue intacto?
}

build campus-lxp-web apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  --build-arg NEXT_PUBLIC_API_URL="$APP_URL" \
  --build-arg NEXT_PUBLIC_APP_URL="$APP_URL"
build campus-lxp-api    apps/api/Dockerfile
build campus-lxp-worker apps/worker/Dockerfile

# ── 3) Recrear SOLO prisma-* (proyecto "prisma"); el CRM es otro proyecto ──
crm_ok
log "docker compose up -d (solo prisma-*)"
docker compose -f "$COMPOSE" up -d
crm_ok

# Limpieza de capas colgantes (dangling): no borra imágenes en uso por el CRM.
docker image prune -f >/dev/null 2>&1 || true

# Mantener /var/www/prisma/deploy.sh sincronizado con el repo (mv atómico = seguro
# aunque este mismo script esté corriendo: bash conserva su fd al inode viejo).
# Con SKIP_FETCH no sincronizamos (el checkout puede no ser el origin canónico).
if [ "${SKIP_FETCH:-0}" != "1" ] && [ -f "$REPO/infra/prisma/deploy.sh" ] && ! cmp -s "$REPO/infra/prisma/deploy.sh" "$PRISMA/deploy.sh"; then
  cp "$REPO/infra/prisma/deploy.sh" "$PRISMA/deploy.sh.new" && mv "$PRISMA/deploy.sh.new" "$PRISMA/deploy.sh"
  log "deploy.sh actualizado desde el repo"
fi

echo
log "DEPLOY OK — prisma @ $SHA"
docker compose -f "$COMPOSE" ps
