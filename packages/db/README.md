# @campus/db — datos del LXP (esquema `lxp`)

Dueño del **esquema `lxp`** (§4/§6): migraciones SQL versionadas, cliente de datos y seed.
Toca **solo `lxp`** (+ el mock local de `public` en 0009); **jamás la CORA real** (§10).

## ORM: Drizzle (decidido en Sprint 1)

Se eligió **Drizzle** sobre Prisma y **no se mezcla** (§3). Razones:

- **SQL-first + multi-esquema** (`lxp`, `public`, `auth`) sin fricción.
- Convive con **RLS**, **`SECURITY DEFINER`**, **triggers** y **pgvector** — cosas que Prisma no
  expresa en su schema (los usamos para la convivencia con CORA · §10).
- Ligero sobre `postgres.js`.

La **fuente de verdad de las migraciones es el SQL** en `supabase/migrations` (aplicado por
`src/migrate.ts`). El schema Drizzle (`src/schema/`) da **acceso tipado** a `api`/`worker` y crece
por sprint (hoy: identidad).

## Comandos

```bash
# Requiere Postgres local arriba (infra/docker-compose.yml) y .env en la raíz.
pnpm --filter db migrate:up            # aplica migraciones pendientes
pnpm --filter db migrate:new -- <nombre>  # crea el siguiente 000N_<nombre>.sql
pnpm --filter db seed                  # limpia y siembra datos mock
pnpm --filter db test:rls              # suite de RLS (sale ≠0 si algo falla)
pnpm --filter db seed:clean            # borra los datos mock, deja la BD limpia
```

## Convivencia con CORA (§10) — cómo se prueba en local

- `auth.users` + esquema `auth` se **emulan** en local (en Supabase real ya existen). Las policies
  usan `auth.uid()`/`auth.role()` igual que en producción.
- `0009_cora_mock.sql` replica CORA en **`public.*`** con los **mismos nombres** que producción
  (`usuarios`, `estudiantes`, `grupos`, `pagos`), su **CHECK de rol**, su **trigger
  `on_auth_user_created`** y **RLS**. El seed **nunca** inserta en `auth.users` desde la app: lo hace
  emulando a CORA, y el trigger crea la fila en `public.usuarios`.
- El LXP lee CORA **solo** por funciones puente `SECURITY DEFINER` de solo-lectura
  (`lxp.cora_usuario`, `lxp.cora_acceso_activo`, `lxp.cora_grupos_de`) — nunca acoplando tablas.
