-- ═══════════════════════════════════════════════════════════════════════════
-- 0069 · Clases y videoteca — alcance por grupo (M-2 parcial · auditoría RLS)
-- Campus Virtual LXP · Médica Capacitación
--
-- Antes: clases/videoteca con SELECT `using(auth.uid() is not null)` → todo autenticado
-- veía las clases en vivo y las grabaciones de TODOS los grupos. Ahora: staff ve todo; el
-- alumno ve las de SU grupo (`es_miembro_grupo` · 0036). En videoteca, el material con
-- `grupo_id` NULL (general, no atado a cohorte) permanece visible a todos los inscritos.
--
-- `anuncios` NO se toca aquí a propósito: su columna `alcance` es jsonb {tipo,prioridad}
-- (una CATEGORÍA, no una audiencia por grupo/rol), así que segmentar por RLS exigiría
-- definir antes el esquema de audiencia — se reporta aparte para decisión de producto, no
-- se inventa. Solo esquema `lxp`; jamás public/auth (§10).
-- ═══════════════════════════════════════════════════════════════════════════

drop policy if exists clases_read on lxp.clases;
create policy clases_read on lxp.clases for select to authenticated
  using (lxp.es_miembro_grupo(grupo_id));   -- grupo_id NOT NULL; es_miembro_grupo ya cubre staff

drop policy if exists videoteca_read on lxp.videoteca;
create policy videoteca_read on lxp.videoteca for select to authenticated
  using (grupo_id is null or lxp.es_miembro_grupo(grupo_id));
