-- 0048 · Tabla de reportes: columnas[0] pasa a ser la COLUMNA DE ETIQUETAS DE FILA (§6.5)
--
-- Antes, el render de la tabla inyectaba una 1ª columna (las etiquetas de fila) que NO existía en
-- `columnas` de la config → columna fantasma: no se podía nombrar ni borrar, y config y tabla no
-- coincidían. Modelo corregido: `columnas[0]` = columna de etiquetas de fila (header, vacío por
-- defecto, editable/borrable como cualquier otra); `columnas[1..]` = columnas de datos.
--
-- Esta migración antepone "" a `columnas` de CADA campo tabla en las plantillas ya guardadas, para
-- que la config liste TODAS las columnas (incluida la 0). Los valores de reportes YA llenados NO se
-- tocan: las columnas de DATOS siguen siendo las mismas (columnas[1..]), con idéntica cantidad y
-- orden, así que la matriz `filas × columnasDatos` queda alineada sin reindexar.
--
-- Migración de una sola pasada (el runner registra las aplicadas): opera sobre datos del modelo
-- viejo. No es idempotente si se re-ejecutara manualmente sobre datos ya migrados.

update lxp.plantillas_reporte p
set estructura = jsonb_set(
  p.estructura,
  '{secciones}',
  (
    select jsonb_agg(
      case
        when jsonb_typeof(s->'campos') = 'array' then jsonb_set(
          s,
          '{campos}',
          (
            select jsonb_agg(
              case
                when c->>'tipo' = 'tabla'
                  then jsonb_set(c, '{columnas}', '[""]'::jsonb || coalesce(c->'columnas', '[]'::jsonb))
                else c
              end
              order by ord
            )
            from jsonb_array_elements(s->'campos') with ordinality as ca(c, ord)
          )
        )
        else s
      end
      order by ord
    )
    from jsonb_array_elements(p.estructura->'secciones') with ordinality as se(s, ord)
  )
)
where jsonb_typeof(p.estructura->'secciones') = 'array'
  and exists (
    select 1
    from jsonb_array_elements(p.estructura->'secciones') s,
         jsonb_array_elements(s->'campos') c
    where c->>'tipo' = 'tabla'
  );
