-- ═══════════════════════════════════════════════════════════════════════════
-- 0022 · Las horas se definen en la LECCIÓN; el módulo (y el programa) las SUMA
--
-- Corrección de modelo (§5B): la fuente de verdad de las horas acumulables es la
-- LECCIÓN, no el módulo. Hasta 0002 `lxp.modulos.horas` era un campo editable a
-- mano; ahora pasa a ser una CACHÉ mantenida = suma de las horas de sus lecciones.
-- El total del programa ya se calcula como suma de módulos (sigue igual, ahora
-- correcto por transitividad).
--
--   lección.horas  (editable · fuente de verdad)
--        └─ Σ ─▶ módulo.horas  (caché, trigger)
--                     └─ Σ ─▶ total del programa (calculado en la lectura)
--
-- ⚠️ Solo esquema `lxp`; jamás el `public` de CORA (§10, regla 3).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Horas por lección (misma escala que módulo: numeric(6,2)) ──
alter table lxp.lecciones
  add column if not exists horas numeric(6,2) not null default 0;

-- ── Backfill seed-safe: reparte las horas que hoy viven en el módulo entre sus
-- lecciones (distribución uniforme), de modo que la SUMA por módulo se conserva.
-- Un módulo sin lecciones no tiene dónde repartir → sus horas pasan a 0 al
-- recomputar (modelo nuevo: módulo vacío = 0 h).
update lxp.lecciones l
set horas = round((m.horas / c.cnt)::numeric, 2)
from lxp.modulos m
join (
  select modulo_id, count(*)::numeric as cnt
  from lxp.lecciones group by modulo_id
) c on c.modulo_id = m.id
where l.modulo_id = m.id and m.horas > 0;

-- ── Trigger: mantener `modulos.horas` = Σ horas de sus lecciones ──
create or replace function lxp.recalc_horas_modulo()
returns trigger language plpgsql as $$
begin
  -- Módulo destino (insert/update): recalcula su suma.
  if tg_op in ('INSERT', 'UPDATE') then
    update lxp.modulos m
      set horas = coalesce(
        (select sum(l.horas) from lxp.lecciones l where l.modulo_id = new.modulo_id), 0)
      where m.id = new.modulo_id;
  end if;
  -- Módulo de origen (delete, o si la lección cambió de módulo): también recalcula.
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.modulo_id <> new.modulo_id) then
    update lxp.modulos m
      set horas = coalesce(
        (select sum(l.horas) from lxp.lecciones l where l.modulo_id = old.modulo_id), 0)
      where m.id = old.modulo_id;
  end if;
  return null;  -- AFTER trigger: el valor de retorno se ignora.
end
$$;

create trigger lecciones_recalc_horas
  after insert or update or delete on lxp.lecciones
  for each row execute function lxp.recalc_horas_modulo();

-- ── Alinea el estado actual: recomputa la caché de todos los módulos ──
update lxp.modulos m
set horas = coalesce(
  (select sum(l.horas) from lxp.lecciones l where l.modulo_id = m.id), 0);
