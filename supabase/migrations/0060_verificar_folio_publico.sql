-- ═══════════════════════════════════════════════════════════════════════════
-- 0060 · Verificación PÚBLICA de folio de certificado (§6/§8) — sin sesión
--
-- Un tercero (empleador, otra escuela) confirma la autenticidad de un certificado
-- tecleando su folio, SIN tener cuenta en el campus. Hasta ahora la acción web
-- `verificarFolio` corría con `comoAlumno` (RLS `certificados_select` = propios), así
-- que solo validaba el folio del PROPIO alumno — no era una verificación pública.
--
-- Se expone una función SECURITY DEFINER de solo-lectura, granted a `anon`, que busca
-- el folio y devuelve SOLO lo que ya está impreso en el certificado (título + fecha).
-- El folio (`MC-<tipo>-<8 hex del user_id>`) no es enumerable secuencialmente, y la
-- proyección no revela PII ni el id del alumno. La función es el límite de seguridad:
-- `anon` no puede leer `lxp.certificados` (RLS lo impide), solo llamar a esta función
-- acotada a un folio exacto.
--
-- Patrón nombre_de/perfil_publico_de (§10, regla 4): solo esquema `lxp`, READ-ONLY,
-- proyección mínima. Aditiva.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function lxp.verificar_folio_publico(p_folio text)
returns table (folio text, titulo text, emitido_en timestamptz)
language sql stable security definer set search_path = lxp, public as $$
  select c.folio, c.titulo, c.emitido_en
  from lxp.certificados c
  where c.folio = p_folio
  limit 1;
$$;

grant execute on function lxp.verificar_folio_publico(text)
  to anon, authenticated, service_role;
