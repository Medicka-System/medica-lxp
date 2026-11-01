# Fixtures SCORM — verificación en navegador

El runtime SCORM del navegador (`apps/web/lib/scorm/*` + `app/scorm/play` + `app/scorm/commit`)
tiene tests unitarios de la **lógica pura** (acumulador CMI, armado del shell). La **reproducción
real en el navegador** (iframe + `window.API`) no se puede ejercer en los gates headless — se
verifica a mano con el paquete de abajo.

## Paquete de prueba incluido

`scorm12-demo.zip` — SCORM 1.2 mínimo y estándar-válido (`imsmanifest.xml` + `index.html` en la
raíz del zip, `adlcp:scormtype="sco"`). El SCO:

- descubre `window.API` subiendo por la cadena de ventanas (algoritmo SCORM 1.2 estándar),
- `LMSInitialize`, lee `lesson_status` / `suspend_data` previos (prueba la **reanudación**),
- botones para `LMSSetValue` (status, score), `LMSCommit`, `LMSFinish`,
- imprime cada llamada y su código de error en pantalla.

### Alternativas descargables (SCORM 2004 y paquetes "golden")
Si quieres probar también SCORM 2004 o paquetes reales de autoría:

- **ADL / Rustici "golden" packages** — <https://github.com/adlnet/golden-scorm-packages>
  (SCORM 1.2 y 2004, mínimos y conformes).
- **SCORM Cloud "Golf Examples"** — <https://scorm.com/scorm-explained/technical-scorm/golf-examples/>
  (paquetes clásicos 1.2 y 2004, con varios SCOs).
- **Articulate** — exporta cualquier curso Rise/Storyline como "SCORM 1.2" o "SCORM 2004".

Cualquiera de esos `.zip` se sube igual que el fixture.

## Cómo subirlo al LXP

1. Studio → diseñador → una lección tipo **paquete** (xAPI/SCORM) → subir `scorm12-demo.zip`.
   El `api` lo recibe (`POST /paquetes`), el `worker` lo descomprime a
   `media/paquetes-extraidos/{contenidoId}/` y parsea el manifiesto (`estado: listo`).
2. Publica la lección y entra como **alumno** inscrito al grupo.

## CHECKLIST de verificación en el navegador

Abre la lección del alumno. El `BloquePaquete` detecta SCORM y apunta el iframe a
`/scorm/play/{contenidoId}?entry=index.html&leccion=...` (el **shell mismo-origen**), no al
`lanzadorUrl` crudo. Con **DevTools → Console** y **Network** abiertos:

**(a) Inicializa**
- En la pantalla del SCO (dentro del iframe) debe decir `LMSInitialize -> true`.
- Consola sin `SecurityError` de cross-origin (confirma que el SCO en `srcdoc` hereda el origen
  de la app y alcanza `window.parent.API`).
- `lesson_status previo` vacío en el **primer** acceso.

**(b) El CMI llega a `POST /players/scorm/commit`**
- Pulsa *Marcar completed* → *Puntaje 90* → **Commit**.
- Network → filtra `commit`: aparece `POST /scorm/commit` (el puente web) con **200**.
  El payload lleva `{ contenidoId, leccionId, cmi: { "cmi.core.lesson_status":"completed",
  "cmi.core.score.raw":"90", ... } }` y **NO** lleva `alumnoId` (lo pone el servidor desde la
  sesión). Ese handler reenvía a `${API_URL}/players/scorm/commit`.

**(c) Avanza en `lxp.reproduccion_progreso`**
- En la BD (Supabase prod o la que uses):
  ```sql
  select alumno_id, contenido_id, porcentaje, completado, estado_scorm, actualizado_en
  from lxp.reproduccion_progreso
  where contenido_id = '<contenidoId de la lección>'
  order by actualizado_en desc;
  ```
- `estado_scorm` debe contener el CMI interpretado (lesson_status/score); `completado=true`
  tras marcar *completed*. (Lo escribe `players.service.commitScorm` → `interpretarCmi` →
  `upsertProgreso`, backend **intacto**.)

**(d) Reanuda al reabrir**
- Cierra la lección y vuelve a entrar. El shell lee `estado_scorm` (read-back vía
  `comoAlumno` en `/scorm/play`) y siembra `cmiPrevio` en el runtime.
- La pantalla del SCO debe mostrar `lesson_status previo = "completed"` y el `suspend_data`
  guardado. Eso confirma el ciclo completo: commit → persistencia → rehidratación.

### Qué mirar si algo falla
- **No aparece `window.API`** → el SCO se abrió fuera del shell (revisa que `BloquePaquete`
  esté enrutando a `/scorm/play/...`, no al `lanzadorUrl` crudo; requiere `contenidoId` +
  `entryPoint` en el contrato del paquete).
- **`/scorm/commit` da 403** → sesión sin `acceso_activo` (pago en pausa, §10).
- **`/scorm/commit` da 502** → el web no alcanza el `api` (`API_URL` / red interna).
- **Assets del SCO 404** → el `<base href>` del shell apunta al directorio del `entryPoint` en
  MinIO; revisa que `media/paquetes-extraidos/{id}/` sea servible (lectura anónima).
