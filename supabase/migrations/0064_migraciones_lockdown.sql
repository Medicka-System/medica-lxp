-- ═══════════════════════════════════════════════════════════════════════════
-- 0064 · Candado del ledger de migraciones (H-1 · auditoría RLS pre-go-live)
-- Campus Virtual LXP · Médica Capacitación
--
-- `lxp._migraciones` quedaba con RLS OFF + DML completo al rol genérico `authenticated`
-- (un JWT de alumno podía leer/alterar el ledger). Se cierra: RLS ON sin políticas =
-- deny-all, y se revocan los grants. El runner (packages/db/migrate.ts) usa la conexión
-- DIRECTA de owner (postgres), que OMITE RLS y conserva sus privilegios → este candado
-- NO lo afecta. Solo esquema `lxp`; jamás public/auth (§10).
-- ═══════════════════════════════════════════════════════════════════════════

alter table lxp._migraciones enable row level security;  -- RLS ON, 0 políticas = deny-all
revoke all on lxp._migraciones from authenticated, anon;
