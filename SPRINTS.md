# SPRINTS.md — Plan de construcción del Campus Virtual LXP

> Lee `CLAUDE.md` antes de cada sprint. **Ejecuta un sprint por sesión.** No avances sin
> cumplir el **Definition of Done (DoD)**. Cada sprint deja el repo corrible y verificable.
>
> Formato de cada sprint: **Objetivo · Decisiones · Archivos · Pasos · DoD · Verificación.**

### Principios globales (aplican a TODOS los sprints)
- **Local primero.** Todo se construye y prueba en **local con Docker**. La config de los dos VPS
  (apps + BD) y el deploy a producción van en los **sprints finales**, no antes.
- **Datos mock como andamio.** Cada sprint **siembra datos mock** en la BD para testear la
  funcionalidad. Los mocks NO son producto: cuando la función está lista y es hora de operar en
  real, **se borran** (script `seed:clean`). La lógica no debe depender de datos sembrados.
- **Estructura real desde el inicio.** Aunque los datos sean mock, las **tablas, tipos y contratos
  son los definitivos** (§6 del CLAUDE.md). No se prototipa con esquemas falsos.
- **CORA local simulado.** En local, el esquema `cora` es un **mock** (tablas mínimas + seed) para
  probar la convivencia (identidad compartida, lectura de pagos/grupos, RLS). La CORA real de
  producción **nunca** se toca; la conexión real se cablea en el sprint de integración/deploy.

---

## Sprint 0 — Esqueleto del monorepo (local)

**Objetivo:** monorepo levantado y corriendo en vacío, con las 3 apps + infra local en Docker.

**Decisiones:** pnpm + Turborepo; Node 20; TS strict; nombres de §4. Todo local (sin VPS aún).

**Archivos:** `pnpm-workspace.yaml`, `turbo.json`, `.env.example`, `apps/web` (Next 15 App Router
+ Tailwind + shadcn/ui + next-pwa), `apps/api` (NestJS + `/health`), `apps/worker` (NestJS
standalone, sin HTTP, conectado a Redis), `packages/shared`, `packages/db`, `packages/config`,
`infra/docker-compose.yml` (postgres local, redis, web, api, worker; traefik/cloudflared comentados).

**Pasos:**
1. Inicializa el workspace pnpm + Turbo con las carpetas de §4.
2. `apps/web`: Next 15, Tailwind, shadcn/ui, PWA. Página raíz que hace fetch a `api:/health`.
3. `apps/api`: NestJS con módulo `health` (`GET /health` → `{status, uptime, version}`).
4. `apps/worker`: NestJS standalone que conecta a Redis y registra una cola `envio-xapi` vacía.
5. `packages/config`: eslint + tsconfig + tailwind preset compartidos.
6. `.env.example` con TODAS las variables (Supabase/Postgres, Redis, LRS, object storage, Zoom, LLM/Eco, embeddings, Sentry).
7. `docker-compose.yml` local: `postgres`, `redis`, `web`, `api`, `worker` con healthchecks.

**DoD:** ✅ COMPLETADO (2026-09-17)
- [x] `pnpm install` sin errores.
- [x] `docker compose up -d` levanta postgres + redis.
- [x] `pnpm dev` levanta web, api y worker.
- [x] `GET /health` responde 200; la home de `web` muestra "API OK".
- [x] El worker conecta a Redis.

**Verificación:**
```bash
docker compose -f infra/docker-compose.yml up -d
pnpm install && pnpm dev
curl -s localhost:8000/health
```

---

## Sprint 1 — Base de datos, esquema núcleo, roles y RLS (local)

**Objetivo:** el modelo de datos de §6 (estructura definitiva) con RLS y datos mock, sobre BD local.

**Decisiones:** elegir **Drizzle o Prisma** para `packages/db` y **no mezclar** después. Esquema
`lxp` real + esquema `cora` **mock** (mínimo, para probar convivencia). Identidad compartida:
`auth.users` local + `lxp.perfiles`. Nombres de dominio en español.

**Archivos:** `supabase/migrations/` (`0001_schema_lxp_perfiles_roles.sql`, `0002_programas_grupos.sql`,
`0003_contenido_actividades.sql`, `0004_bitacora_reportes.sql`, `0005_ateneo_biblioteca.sql`,
`0006_competencia_hitos_badges.sql`, `0007_herramientas_consultas_anuncios.sql`, `0008_rag.sql`,
`0009_cora_mock.sql`, `0010_rls.sql`); `packages/db` (esquema + cliente); `supabase/seed/`.

**Pasos:**
1. `lxp.perfiles` extendiendo `auth.users`, enum `rol`: `super_admin | admin | docente | disenador_instruccional | alumno`, `acceso_activo` (bool, lo controla CORA). **Roles por plataforma** (§10).
2. Programas y grupos con **herencia**: `programas`, `modulos`, `lecciones`, `contenidos`, `grupos`, `grupo_overrides`.
3. Actividades y evaluación: `actividades` (tarea/autoevaluacion/foro), `rubricas`, `entregas`, `foro_mensajes`.
4. Práctica/reportes: `bitacora_casos` (ref DICOM, dominio_iaim, estado, origen), `validaciones` (+ `correccion_sobre_eco`), `reportes`.
5. Comunidad/biblioteca: `posts_ateneo` (tipo caso/encuesta/anuncio), `comentarios_ateneo`, `casos_biblioteca` (**verdad estructurada del caso**), `simuladores`.
6. Competencia y reconocimiento: `competencia_dominios` (proyección), `hitos`, `certificados`, `badges`, `badges_otorgados`.
7. Herramientas/comunicación/RAG: `plantillas_reporte`, `calculadoras`, `recursos_docente`, `anuncios`, `consultas`, `consulta_mensajes`, `documentos_rag` (+ `vector` pgvector), `eco_correcciones`.
8. `cora` **mock**: tablas mínimas (`cora.alumnos`, `cora.grupos`, `cora.pagos`) + seed, para probar lectura solo-lectura desde `lxp` y la convivencia RLS.
9. **RLS** según §6/§10: policies **solo en `lxp`**; alumno solo lo suyo y si `acceso_activo`; ateneo aprobado legible; proyecciones read-only desde web; roles por plataforma.
10. **Seed mock:** 1 de cada rol staff + 4 alumnos, 1 programa con 2 grupos (síncrono/asíncrono), módulos/lecciones/actividades, casos de bitácora en varios estados, posts de ateneo, casos de biblioteca con verdad estructurada. Script `seed` y `seed:clean`.

**DoD:**
- [ ] Migraciones corren limpio desde cero (esquema definitivo, no provisional).
- [ ] Seed mock carga; `seed:clean` lo borra sin dejar basura.
- [ ] RLS: un alumno **no** ve casos de otro; **sí** los suyos; sin `acceso_activo` no accede.
- [ ] Proyecciones (`competencia_dominios`) no escribibles por `anon`/alumno.
- [ ] `lxp` puede **leer** `cora` mock (pagos/grupos) pero no escribirlo; las policies de `cora` mock no se rompen.

**Verificación:**
```bash
pnpm --filter db migrate:up && pnpm --filter db seed
pnpm --filter db test:rls
pnpm --filter db seed:clean   # deja la BD limpia
```

---

## Sprint 2 — Capa xAPI / LRS (local)

**Objetivo:** LRS conformante levantado en local y el perfil xAPI emitiendo/consultando.

**Decisiones:** **SQL LRS** de Yet Analytics vía Docker (local). Buffer con cola, nunca síncrono.
xAPI es el tracking base; **acepta también SCORM** (se cablea en el sprint de Contenido).

**Archivos:** `infra/docker-compose.yml` (+ servicio `lrs` local), `packages/shared/xapi/`
(verbos, actividades, builders), módulo `xapi` en `api`, worker `envio-xapi`.

**Pasos:**
1. Añade `lrs` al compose local (con su almacén y credenciales por env).
2. Define el **perfil xAPI**: verbos (`experimentó`, `completó`, `aprobó`, `subió`, `validó`, `asistió`, `falló`) y actividades (lección, caso, clase, dominio I-AIM).
3. Implementa el worker `envio-xapi` (buffer + retry/backoff → LRS).
4. Helper `emitirStatement(actor, verbo, objeto, result?)` en `packages/shared`.
5. Endpoint de lectura en `api` que consulta el LRS (para competencia/analítica posterior).

**DoD:**
- [ ] LRS local responde y acepta un statement de prueba vía la cola.
- [ ] El statement se consulta de vuelta desde `api`.
- [ ] Retry funciona si el LRS está caído (el job no se pierde).

**Verificación:**
```bash
docker compose up -d lrs
pnpm --filter api test -- xapi
```
---

## Sprint 3 — Dominio NestJS: competencia, hitos, certificados, badges + workers

**Objetivo:** el cerebro. Motor I-AIM, decaimiento, repaso, hitos, certificados, badges.

**Decisiones:** todo es **dominio en `api`/`worker`**, con tests. Nada en el front. Corre sobre
datos mock del Sprint 1.

**Archivos:** módulos `competencia`, `hitos`, `certificados`, `badges` en `api`; workers
`calculo-competencia`, `deteccion-decaimiento`, `programar-repaso`, `deteccion-hito`,
`emision-certificado`, `otorgar-badges`; tests unitarios.

**Pasos:**
1. `calculo-competencia`: al aprobarse un caso, recalcula `competencia_dominios` (horas por dominio I-AIM, ponderación) con `service_role`.
2. `deteccion-decaimiento` (cron): marca dominios en caída según ventana temporal.
3. `programar-repaso`: agenda reexamen **a nivel de concepto** (curva de olvido por alumno).
4. `deteccion-hito` + `emision-certificado`: 100/500/1000h → certificado.
5. `otorgar-badges`: evalúa reglas automáticas (hitos, casos, competencia, racha).
6. Tests del motor de competencia y del scheduler (obligatorio).

**DoD:**
- [ ] Aprobar un caso mock dispara `calculo-competencia` y actualiza la proyección.
- [ ] Cron de decaimiento marca al menos un caso de prueba.
- [ ] Alcanzar un hito encola `emision-certificado` y otorga su badge.
- [ ] Tests del motor de competencia y repaso en verde.

**Verificación:**
```bash
pnpm --filter api test -- competencia repaso hitos badges
pnpm --filter worker start:dev
```

---

## Sprint 4 — Shell del Campus + Home + competencia (alumno)

**Objetivo:** la experiencia base del alumno, mobile-first, con datos mock. Referencia visual:
mocks `alumno/shell-menus`, `alumno/home`, `alumno/dominio`.

**Decisiones:** CRUD simple va `web → Supabase` directo (Regla de Oro). PWA. shadcn **personalizado**
(§5A), tokens definitivos, sidebar navy.

**Archivos:** `web/app/(campus)/layout.tsx` (shell: nav lateral + topbar), `home/page.tsx`,
`dominio/page.tsx`, componentes base (badges, cards, botones personalizados de shadcn).

**Pasos:**
1. Shell del campus: nav lateral navy (Inicio, Cursos, Explorar, Bitácora, Ateneo, Biblioteca, Mis herramientas, Mi dominio, Certificados, Calendario, Pagos, Ayuda) + topbar (búsqueda, notificaciones, avatar). Bottom-nav móvil (5). PWA.
2. **Home inteligente**: hero (anuncio si hay / aspiracional si no), "continuar donde me quedé" + pulso de progreso, dos columnas (Ateneo + cine-loops de la semana), calendario.
3. **Mi dominio**: competencia I-AIM (no "% completado") — anillo + dimensiones + decaimiento + repasos, leyendo `competencia_dominios`.
4. Componentes shadcn personalizados (§5A) — badges, botones, cards con el carácter del proyecto.

**DoD:**
- [ ] Campus navegable en móvil, instalable como PWA.
- [ ] Home no se siente administrativo (hero inteligente, comunidad al frente).
- [ ] Mi dominio muestra competencia I-AIM real desde mock.
- [ ] Los componentes NO se ven como shadcn default.

**Verificación:**
```bash
pnpm --filter web dev   # viewport móvil + Lighthouse PWA
```

---

## Sprint 4.5 — Studio del diseñador: programas, grupos, contenido

**Objetivo:** que el diseñador **cree cursos sin tocar SQL**. Sin esto no hay contenido. Referencia:
mocks `studio/disenador/*`.

**Decisiones:** área `/studio` con RBAC y **header de navegación (sin sidebar)**. Modelo de
**herencia** programa→grupo. H5P self-host. Acepta SCORM/xAPI/ofimáticos en Contenido.

**Archivos:** `web/app/(studio)/programas/`, `grupos/`, `contenido/`, `casos/` + `casos/editor`,
`herramientas/`; endpoints de publicación/versionado y de overrides en `api`.

**Pasos:**
1. **Course builder** (Programas): programa → módulos → lecciones drag-and-drop; horas por módulo; bloques de actividad (contenido, tarea, autoevaluación, foro) + **rúbrica** de cada actividad.
2. **Grupos**: instanciar un programa (fechas/modalidad, calendario de liberación, docente); vista **heredado vs personalizado** con overrides; aviso de re-sincronización.
3. **Contenido** (biblioteca reutilizable): video (→ Stream), H5P, **SCORM/xAPI (Articulate)**, PDF/Word/PPT, imágenes; con "dónde se usa".
4. **Casos** (curaduría) + **editor de caso** (visor DICOM placeholder, anotación, verdad estructurada); subida directa staff.
5. **Herramientas**: Plantillas de reporte, Calculadoras, Simuladores (config) — estructura de administración con placeholders del contenido clínico.
6. **Publicación con versionado** + **vista previa como alumno**.

**DoD:**
- [ ] Un diseñador crea un programa con módulos, lecciones y rúbricas desde la UI (cero SQL).
- [ ] Instancia un grupo; se distingue heredado vs personalizado; un override no rompe la plantilla.
- [ ] Sube un recurso (H5P/SCORM/PDF) y aparece en una lección.
- [ ] Publicar versiona; un borrador no es visible para alumnos. Un `alumno` no entra a `/studio`.

**Verificación:**
```bash
pnpm --filter web dev
pnpm --filter api test -- publicacion versionado herencia rbac
```

---

## Sprint 4.7 — Pipeline + visor DICOM (infraestructura central)

**Objetivo:** **toda imagen es DICOM**; este pipeline la procesa/anonimiza/visualiza. Dependencia
del Sprint 5. Referencia: componente `VisorDicom` (Cornerstone3D).

**Decisiones:** **Cornerstone3D** (ver + anotar). **Anonimización obligatoria y bloqueante** en
ingesta. Estudios en **object storage** (MinIO/Supabase local), **no** en Postgres ni en el VPS.

**Archivos:** `web` `VisorDicom`, servicio de ingesta en `api`, worker `procesar-dicom`,
ajuste de `bitacora_casos` a DICOM (series/multi-frame).

**Pasos:**
1. Ingesta: recibir DICOM (archivo/serie/multi-frame) vía URL firmada a object storage.
2. `procesar-dicom`: parsear → **anonimizar** (quitar PII antes de persistir, con traza) → guardar.
3. `VisorDicom` (Cornerstone3D): ver series/cine-loops + herramientas de anotación/medición.
4. Embeber el visor donde se usa (bitácora, Ateneo, Biblioteca, editor de caso).

**DoD:**
- [ ] Un DICOM (incl. multi-frame) se sube, se anonimiza y se visualiza.
- [ ] Ningún dato de paciente sobrevive en el estudio educativo guardado; hay traza.
- [ ] El visor reproduce cine-loops, navega series y permite anotar.

**Verificación:**
```bash
pnpm --filter api test -- dicom anonimizacion
pnpm --filter web dev   # subir un DICOM de prueba y verlo/anotarlo
```

---

## Sprint 5 — El loop principal: bitácora (DICOM) + Ateneo (comunidad)

**Objetivo:** el diferenciador. Subir casos reales en DICOM, validación, comunidad, todo emitiendo
xAPI. Referencia: mocks `alumno/bitacora`, `alumno/ateneo`.

**Decisiones:** núcleo del producto; priorízalo sobre lo cosmético. Usa el pipeline DICOM (4.7).

**Archivos:** `web/app/(campus)/bitacora/` (subida en sheet/modal que **hereda el contexto del
módulo**), `ateneo/`; flujo de validación del docente; enganche a `emitirStatement`.

**Pasos:**
1. **Subir caso** (sheet corto, hereda módulo/órgano/dominio I-AIM del contexto): DICOM + hallazgos + diagnóstico → `bitacora_casos` (`pendiente`). Toasts + estados de carga.
2. **Validación (docente)**: aprobar/rechazar con feedback → `validaciones`; aprobar dispara `calculo-competencia` y emite xAPI.
3. **Ateneo**: feed de `posts_ateneo` (tipos caso/encuesta/anuncio) con `VisorDicom` en miniatura, "Sugerir diagnóstico" / "Ver interconsulta"; comentarios con upvotes y flag de validación del docente.
4. Cada acción emite su statement al LRS.

**DoD:**
- [ ] Alumno sube un caso DICOM desde un módulo → aparece `pendiente` con contexto heredado.
- [ ] El docente lo aprueba → competencia se actualiza y se emite xAPI.
- [ ] Un caso aprobado aparece en el Ateneo y se comenta/upvotea.
- [ ] El loop teoría↔práctica↔comunidad es demostrable de punta a punta.

**Verificación:**
```bash
pnpm dev   # subir → validar → ver en ateneo → comentar
pnpm --filter api test -- validacion ateneo
```

---

## Sprint 5.3 — Eco: evaluación asistida por IA (docente)

**Objetivo:** Eco como copiloto de evaluación (§7A). Es lo que hace sostenible al docente a escala.

**Decisiones:** **tools primero, LLM al final** (§7A). RAG con pgvector + embeddings self-hosted.
**Eco propone, el docente decide.** Modelo-agnóstico.

**Archivos:** `services/embeddings/` (BGE-M3), `api/src/ai/` (orquestador, prompts, retrieve),
workers `indexar-rag` y `eco-evaluacion`, panel de Eco en `web` (bandeja + chat).

**Pasos:**
1. Servicio de embeddings local + `indexar-rag`: indexa verdad de casos, rúbricas, material en pgvector.
2. Pipeline de evaluación: tools (SQL + RAG + auto-calificación) → Haiku *condicional* → Sonnet (juicio) → propuesta.
3. **Bandeja**: casos/entregas pre-analizados, separados por confianza ("listos" vs "requieren criterio"), aprobar en lote.
4. **Eco conversacional**: "resume Grupo B", "mejores casos", "redacta feedback".
5. Captura de correcciones docente→Eco (`eco_correcciones`).

**DoD:**
- [ ] Eco pre-analiza un lote de casos mock y los separa por confianza; el docente confirma.
- [ ] Ninguna nota/validación se asienta sin confirmación humana.
- [ ] El RAG recupera la verdad del caso correcta; Sonnet evalúa contra ella.
- [ ] Una corrección del docente queda registrada en `eco_correcciones`.

**Verificación:**
```bash
docker compose up -d embeddings
pnpm --filter api test -- eco rag evaluacion
```

---

## Sprint 5.5 — Consolas de docente y admin/súper admin

**Objetivo:** las herramientas de staff del día a día. Referencia: mocks `studio/docente/*` y
`studio/admin/*`.

**Decisiones:** área `/studio` con RBAC por rol. Se apoya en el motor (Sprint 3) y en Eco (5.3).

**Archivos:** `web/app/(studio)/` — docente: `dashboard`, `validacion`, `entregas`, `consultas`,
`grupos`, `recursos`, `clases`; admin/súper admin: `dashboard`, `analitica`, `alumnos`, `staff`,
`grupos`, `programas`, `anuncios`, `configuracion`.

**Pasos:**
1. **Docente**: dashboard con Eco, bandeja de validación (con Eco), entregas, consultas (canal 1:1 + Eco redacta), seguimiento de grupos, mis recursos, clases (Zoom).
2. **Admin**: grupos/alumnos/staff/programas globales (consulta + seguimiento), anuncios, recursos.
3. **Súper admin**: todo lo del admin + centro de control (negocio + salud del sistema) + analítica global (Eco analista) + **hub de Configuración** (9 áreas, incl. IA/Eco y Badges).
4. **Anuncios**: gestor con segmentación por rol, canales (in-app/correo/WhatsApp), vigencia, Eco redacta.

**DoD:**
- [ ] El docente valida desde su bandeja (con Eco) y dispara el motor de competencia.
- [ ] El admin ve grupos/alumnos globales sin acceso a Configuración del sistema.
- [ ] El súper admin ve analítica global y entra a Configuración.
- [ ] RBAC: cada rol solo ve lo suyo (admin ≠ súper admin).

**Verificación:**
```bash
pnpm --filter web dev   # /studio como docente, admin y super_admin
pnpm --filter api test -- rbac analitica anuncios
```
---

## Sprint 6 — Media pipeline, Zoom y players de contenido

**Objetivo:** contenido en vivo y multimedia integrado al loop. Local primero (mock del webhook).

**Decisiones:** grabaciones **fuera de Zoom Cloud** → object storage/Stream. H5P self-host. SCORM
con su player. Zoom = **lanzar** (no SDK). MiCo+ = solo enlazar/agendar (integración real pendiente
de Mindray).

**Archivos:** servicio de media en `api` (URLs firmadas), worker `ingesta-grabacion-zoom`, webhook
Zoom (validación de firma), players H5P y SCORM en `lecciones`, agenda de clases (Zoom + MiCo+ enlace).

**Pasos:**
1. Subidas de video → object storage/Stream con URL firmada; videoteca lista/reproduce.
2. Clases en vivo: crear/agendar reunión Zoom desde el Studio; botón "Iniciar clase" (lanza Zoom). MiCo+ como enlace agendado.
3. Webhook Zoom `recording.completed` (firma validada, **simulado en local**) → `ingesta-grabacion-zoom`: descarga → sube a storage/Stream → registra en videoteca ligada al grupo/lección → emite xAPI.
4. Players: montar `@lumieducation/h5p-server` (embeber H5P en `lecciones`, emite xAPI); player **SCORM** (reproduce paquete, captura progreso); paquetes **xAPI** de Articulate reportan al LRS.
5. Documentos (PDF/Word/PPT) con visor embebido.

**DoD:**
- [ ] Un video instruccional sube y reproduce.
- [ ] Un evento de grabación de Zoom (simulado) ingesta a la videoteca ligado a su lección.
- [ ] Un H5P y un SCORM se muestran en una lección; H5P emite xAPI, SCORM captura progreso.

**Verificación:**
```bash
pnpm --filter worker test -- zoom media
# simular webhook Zoom firmado → verificar job + registro en videoteca
```

---

## Sprint 6.5 — Generador de reportes clínicos (pieza núcleo)

**Objetivo:** la herramienta clínica que reemplaza Word: el médico genera el reporte EN la
plataforma, embebe DICOM, y lo envía al paciente / imprime / descarga PDF. Referencia: mock
`alumno/reportes`.

**Decisiones:** se apoya en el visor DICOM (4.7). **Flujo dual:** *reporte clínico* conserva datos
del paciente; *caso educativo* se anonimiza (alimenta bitácora/Biblioteca). El detalle clínico fino
(plantillas por estudio, guía, membrete/firma) **se levanta con Manny al ejecutar este sprint** — no
inventar.

**Archivos:** `web/app/(campus)/herramientas/reportes/` (listado + editor), servicio de reportes en
`api` (PDF, envío), enganche a `plantillas_reporte`.

**Pasos:**
1. Listado de reportes (borrador/finalizado/enviado) + "Nuevo reporte".
2. Editor: elegir plantilla por tipo de estudio → embeber imágenes DICOM (desde el visor) → redactar hallazgos con la guía → impresión diagnóstica + membrete/firma.
3. Generar **PDF**; imprimir; **enviar al paciente** por correo (reporte clínico, con datos).
4. "Guardar como caso" → versión **anonimizada** → `bitacora_casos` (alimenta lo académico).

**DoD:**
- [ ] El médico genera un reporte completo con imágenes DICOM embebidas y exporta PDF.
- [ ] Envío al paciente por correo (mock) e impresión funcionan.
- [ ] "Guardar como caso" produce una versión anonimizada separada del reporte clínico.

**Verificación:**
```bash
pnpm --filter api test -- reportes anonimizacion-dual
pnpm --filter web dev
```

---

## Sprint 7 — Simuladores IA (interpretación + reporte)

**Objetivo:** entrenadores IA que practican con casos y evalúan con Eco. Referencia: mock
`alumno/simuladores`.

**Decisiones:** se alimentan del **banco curado** (verdad estructurada del caso). Mismo motor de
Eco (§7A). Eco evalúa; no reemplaza al docente como fuente de verdad.

**Archivos:** `web/app/(campus)/herramientas/simuladores/`, lógica de sesión en `api/src/ai/`.

**Pasos:**
1. Catálogo de simuladores (interpretación / reporte) por área y dificultad, con progreso previo.
2. Sesión **interpretación**: presenta caso (visor + viñeta, sin diagnóstico) → el alumno responde → Eco evalúa contra la verdad → feedback + registro (competencia/repaso).
3. Sesión **reporte**: presenta estudio → el alumno redacta reporte (reusa editor) → Eco revisa estructura/omisiones → feedback.
4. Cada sesión emite xAPI y alimenta competencia/repaso.

**DoD:**
- [ ] Una sesión de interpretación evalúa la respuesta del alumno contra la verdad del caso.
- [ ] Una sesión de reporte revisa un reporte y da feedback estructurado.
- [ ] El resultado registra competencia y agenda repaso.

**Verificación:**
```bash
pnpm --filter api test -- simuladores
pnpm --filter web dev
```

---

## Sprint 8 — Campus completo del alumno (herramientas + secciones restantes)

**Objetivo:** cerrar la experiencia del alumno. Referencia: mocks `alumno/*` restantes.

**Decisiones:** CRUD directo `web → Supabase`. Reusa componentes ya hechos.

**Archivos:** `web/app/(campus)/` — `cursos/`, `explorar/`, `leccion/` (con **modo lectura
claro/sepia/oscuro**), `biblioteca/`, `certificados/`, `herramientas/calculadoras/`.

**Pasos:**
1. **Mis cursos** + **Explorar/Catálogo** (upsell modular).
2. **Lección/Lectura**: contenido + **modo lectura inmersivo** (3 temas, tokens locales del contenedor, sidebar oculto, header en tono) + narración/audio + notas/subrayado.
3. **Biblioteca de casos** (acervo curado, filtros, visor).
4. **Calculadoras** (2–3 reales de ejemplo + catálogo).
5. **Certificados y badges** (logros + en-progreso + verificación de folio).

**DoD:**
- [ ] El alumno recorre cursos, entra a una lección y usa el modo lectura sepia inmersivo.
- [ ] Biblioteca filtrable; una calculadora calcula; certificados/badges se ven.
- [ ] El campus del alumno está completo y consistente con los mocks.

**Verificación:**
```bash
pnpm --filter web dev
```

## Sprint 8.5 — Actividades del alumno, consultas y notificaciones

**Objetivo:** cerrar los flujos de usuario que faltaban y montar el sistema de notificaciones
multicanal. Referencia: mocks del alumno + `studio/docente/consultas`.

**Decisiones:** notificaciones = **un motor, varios canales** (in-app, correo vía **Resend**,
WhatsApp vía la infra existente). Un servicio recibe "evento → usuario" y despacha según tipo y
preferencia del usuario. CRUD del alumno directo `web → Supabase`.

**Archivos:** `web/app/(campus)/` — actividades en `leccion/` (tarea, autoevaluación, foro),
`herramientas/consultas/` (lado alumno); `api/src/notificaciones/` (motor + adaptadores Resend/
WhatsApp/in-app), worker `notificaciones`, centro de notificaciones (campana) en el shell.

**Pasos:**
1. **Actividades del alumno** dentro de la lección: contestar **tarea** y **autoevaluación**
   (auto-calificable) → `entregas`; participar en el **foro cerrado del grupo** → `foro_mensajes`.
   Cada acción emite xAPI.
2. **Consultas (lado alumno):** iniciar y ver sus consultas 1:1 con el docente (el otro lado ya
   está en 5.5) → `consultas` / `consulta_mensajes`.
3. **Motor de notificaciones:** servicio que despacha por canal según tipo/preferencia.
   - **In-app:** campana en el topbar (no leídas, historial).
   - **Correo (Resend):** plantillas transaccionales (validación lista, repaso, certificado,
     anuncio, nueva consulta). API key por env.
   - **WhatsApp:** avisos clave por la infra existente.
   - **Preferencias del usuario:** qué recibir y por dónde.
4. Conectar el worker `notificaciones` a los eventos ya existentes (validación, hito, repaso, anuncio, consulta).

**DoD:**
- [ ] El alumno contesta una tarea/autoevaluación y participa en el foro de su grupo; emite xAPI.
- [ ] El alumno abre una consulta y el docente la ve (canal 1:1 completo, ambos lados).
- [ ] Un evento (ej. caso validado) dispara notificación in-app **y** correo por Resend.
- [ ] El usuario puede ajustar preferencias de notificación; se respetan.

**Verificación:**
```bash
pnpm --filter api test -- notificaciones consultas actividades
# verificar envío Resend en modo test + campana in-app
```

---

## Sprint 9 — Seguridad, RLS a fondo y auditoría

**Objetivo:** blindar accesos y datos antes de tocar producción. Aún local (con `cora` mock).

**Decisiones:** doble control (guard + RLS). Roles por plataforma. Auditoría de acciones sensibles.

**Archivos:** guard JWT/JWKS en `api`, revisión de todas las policies `lxp`, `configuracion/seguridad`
(logs de auditoría) en el Studio.

**Pasos:**
1. Guard NestJS que **verifica firma** del JWT contra el JWKS de Supabase; nunca confía en headers.
2. Auditoría de RLS de **todas** las tablas `lxp` con queries de prueba por rol (alumno/docente/diseñador/admin/súper admin) — lo que cada rol SÍ y NO ve.
3. Bloqueo por `acceso_activo=false` → pantalla "acceso en pausa" con link a checkout (mock CORA).
4. Logs de auditoría de acciones sensibles (cambios de rol, borrados, config).
5. Validación de firma en webhooks (Zoom/LRS) y en los futuros endpoints CORA.

**DoD:**
- [ ] Petición sin JWT válido a un endpoint de dominio → 401.
- [ ] Suite de RLS: cada rol ve exactamente lo que debe (verificado, no supuesto).
- [ ] Suspendido → pantalla de pausa, no error.
- [ ] Acciones sensibles quedan en el log de auditoría.

**Verificación:**
```bash
curl -s -o /dev/null -w "%{http_code}" localhost:8000/competencia   # 401 sin JWT
pnpm --filter db test:rls-full
```

---

## Sprint 10 — Infraestructura: VPS, Docker, deploy (producción)

**Objetivo:** llevar lo probado en local a los dos VPS y exponerlo con seguridad. **Aquí empieza lo
de producción.**

**Decisiones:** **dos VPS** (apps + BD), Traefik, sin puertos públicos, límites por contenedor.

**Archivos:** `infra/docker-compose.prod.yml`, `infra/traefik/`, `infra/backups/`,
`infra/observability/`, CI/CD.

**Pasos:**
1. **VPS de apps** (KVM4): compose de producción (web, api, worker, redis, lrs, embeddings) con **Traefik** y **límites de recursos por contenedor** (que un pico del LXP no ahogue al CRM que convive).
2. **VPS de BD** (dedicado): Supabase self-hosted + pgvector; conexión desde apps por red cercana.
3. Exposición vía **Traefik / Cloudflare Tunnel**, sin puertos públicos.
4. **Backups**: `pg_dump` diario + WAL → object storage (versioning) + restore probado.
5. **Observabilidad**: Sentry, pino centralizado, Uptime Kuma, `/health`.
6. **CI/CD**: lint + test + build + deploy al VPS (patrón TAS de Zack). Restart policies.
7. Media pesado → **R2** cuando el disco lo pida.

**DoD:**
- [ ] `web` y `api` accesibles solo por el túnel; sin puertos públicos.
- [ ] Backup corre y **restaura** en entorno limpio (probado).
- [ ] Sentry captura un error; Uptime Kuma monitorea `/health`.
- [ ] CI/CD en verde; un pico del LXP no tira al CRM (límites de contenedor).

**Verificación:**
```bash
bash infra/backups/backup.sh && bash infra/backups/restore-test.sh
```

---

## Sprint 11 — Integración CORA real y corte a producción

**Objetivo:** conectar la identidad/datos reales de CORA y quitar los mocks. **Con extremo cuidado
(CORA está en producción).**

**Decisiones:** identidad compartida real (`auth.users` de CORA); LXP lee `cora` real en solo
lectura; **probar en staging antes de tocar la BD viva** (§10).

**Archivos:** migración del esquema `lxp` al Supabase real, config de auth (OAuth + contraseña),
activación de deep-links y estado de pago, `sync-erp` (stub).

**Pasos:**
1. En **staging** (copia de CORA): montar el esquema `lxp` junto al `cora` real; verificar que las policies de CORA **siguen intactas** y que el LXP aísla bien.
2. Auth real: OAuth (Google/Microsoft) + email/contraseña con restablecer; primer acceso define contraseña. Login atado al `auth.users` compartido.
3. Reemplazar `cora` mock por lectura del `cora` real (pagos, grupos, calendario). `acceso_activo` real.
4. **Sin fricción**: deep-links LXP↔portal CORA, estado de pago embebido (real), pantalla de suspensión.
5. `sync-erp` (saliente): stub del resumen de competencia, desactivado por flag.
6. `seed:clean`: eliminar todos los datos mock; entrar datos reales.
7. Pase a producción **solo tras validar staging**.

**DoD:**
- [ ] En staging: LXP y CORA conviven; policies de CORA intactas; identidad compartida funciona.
- [ ] Login real (OAuth + contraseña) con el `auth.users` compartido.
- [ ] El LXP lee pagos/grupos reales de CORA (solo lectura); suspensión real bloquea acceso.
- [ ] Datos mock eliminados; plataforma con datos reales.
- [ ] Nada de CORA se rompió (verificado en staging antes de producción).

**Verificación:**
```bash
# en staging, no en producción
pnpm --filter db test:rls-full
pnpm --filter api test -- cora-integracion auth
```


---
## Orden y dependencias

`0 → 1 → 2 → 3` son la base (infra, datos, eventos, dominio). **`4.5` (Studio del diseñador)
habilita el contenido** — sin autoría no hay qué mostrar. `4 → 5` son la experiencia del alumno
y el loop; `5.5` suma las consolas de docente/admin. `6` suma media/live. `7` endurece e integra
la provisión del ERP. **El Sprint 5 es el corazón del producto**; si hay que recortar para caber
en una sesión, protege `1, 4.5, 3 y 5`. La provisión entrante del ERP (`7`) es load-bearing para
operar con alumnos reales, aunque el resumen saliente pueda esperar.
