# CLAUDE.md — Campus Virtual LXP · Médica Capacitación

> Este archivo es **contexto permanente**. Claude Code debe releerlo al inicio de cada
> sesión y respetarlo en cada cambio. El plan de construcción por fases vive en
> `SPRINTS.md`. **Ejecuta un sprint a la vez** y no avances hasta cumplir su Definition
> of Done.

---

## 1. Qué estamos construyendo

Un **LXP (Learning Experience Platform)** para una escuela de médicos especializada en
ultrasonido diagnóstico y POCUS. No es un LMS de catálogo: es el **hogar de aprendizaje
completo** donde el alumno médico:

- Consume la **teoría del curso** (módulos, videos instruccionales, contenido interactivo).
- Asiste a **clases en vivo** (Zoom) cuyas grabaciones caen en la videoteca.
- **Sube los casos reales que realizó en práctica** — siempre en **DICOM** (viñeta + cine-loop + hallazgos).
- **Genera reportes clínicos** de sus estudios (herramienta que reemplaza Word); el mismo estudio, anonimizado, alimenta su bitácora.
- Participa en la **comunidad / Ateneo Virtual** (interconsulta de casos, validada por docentes).
- Ve su **progreso de competencia** por dominio, no un simple "% completado".

El corazón del producto es un **loop que se retroalimenta**:
`teoría ↔ práctica (casos/reportes) ↔ comunidad ↔ competencia`.

**Escala objetivo:** ~800 alumnos activos.

### Eco — el asistente de IA
**Eco** es el asistente de IA transversal del campus (un solo personaje, muchos contextos):
ayuda al docente a evaluar (pre-analiza casos y entregas, sugiere nota, redacta feedback),
responde consultas, asiste al diseñador con contenido, apoya al alumno para estudiar, y actúa
como analista conversacional para el admin. **Eco propone; el humano decide** — nunca asienta
una calificación o validación solo. Arquitectura en §3.

### Modelo pedagógico: I-AIM
La competencia en ultrasonido se traza sobre el modelo **I-AIM**: **I**ndicación,
**A**dquisición, **I**nterpretación, toma de decisión **M**édica. La competencia
**decae con el tiempo** (sobre todo Adquisición); por eso el sistema no solo acumula
horas: detecta decaimiento y programa **repaso espaciado a nivel de concepto**.

### Comunidad: Ateneo vs foros (no confundir)
- **Ateneo** = comunidad **abierta y transversal** (todos los grupos y roles). Casos,
  interconsulta, encuestas y anuncios. Vive fuera de los cursos.
- **Foro de lección** = discusión **cerrada del grupo**, es una **actividad** que el diseñador
  coloca en una lección (junto a tarea y autoevaluación). Su estructura se hereda del programa;
  la discusión es propia de cada grupo.

### Frontera y relación con CORA (el ERP)
El LXP es un **codebase separado** con su **esquema `lxp` propio**, pero **comparte el mismo
proyecto Supabase que CORA** (el ERP): mismo Postgres, mismo `auth.users`. Reparto:

- **Identidad compartida nativa:** un solo `auth.users` / `user_id` para CORA y LXP. El alumno
  provisionado al inscribirse en CORA **ya existe** para el LXP (perfil `lxp` creado por
  trigger/evento de inscripción). No hay provisión por API ni sincronización frágil.
- **CORA es dueño** (esquema **`public`**, no `cora`): alumnos, inscripción, grupo, calificaciones,
  pagos/facturación, calendario (`public.usuarios`, `public.estudiantes`, `public.grupos`,
  `public.pagos`…). El LXP los **lee directo en solo lectura** (vía funciones `SECURITY DEFINER` en
  `lxp`, ver §10), nunca los escribe.
- **LXP es dueño** (esquema `lxp`): contenido, casos, competencia, comunidad, eventos de aprendizaje.
- **Acceso/suspensión:** CORA controla `acceso_activo` (según pago). El LXP lo **obedece** (guard + RLS).
- **Saliente (menor/posterior):** un resumen de competencia/horas que el portal de CORA puede leer del esquema `lxp`. No se construye en el MVP salvo que un sprint lo indique.

⚠️ **CORA está en producción con RLS propio.** El LXP **no toca las policies de CORA**: agrega
las suyas solo en `lxp`, con **roles por plataforma**, y se prueba en **staging**, nunca sobre la
BD viva. Ver §10.

**Sin fricción entre plataformas** (que se sienta un solo lugar): marca y dominio compartidos
(`campus.…` / `portal.…`); **deep-links** en ambos sentidos ("Entrar al Campus" / "Pagos y
facturación"); **estado de pago embebido** en el LXP (solo lectura, con link al checkout de CORA);
y **suspensión como puente** — pantalla amable con botón de pago, nunca un error roto.

---

## 2. Principio de arquitectura (LA REGLA DE ORO)

La responsabilidad se reparte así. **Respetar esta separación es la decisión más importante
del repo:**

| Capa | Responsabilidad | NO hace |
|---|---|---|
| **Supabase (Postgres + Auth + Storage + RLS)** | Fuente de verdad de datos, CRUD directo desde el front, autz por fila. Esquema `lxp`; lee `public` (CORA) en solo lectura | Lógica de negocio compleja |
| **Next.js (`apps/web`)** | UI, PWA, mobile-first, server actions ligeros, lee/escribe Supabase directo para CRUD simple | Cálculos de dominio, jobs de fondo |
| **NestJS (`apps/api` + `apps/worker`)** | **Dominio + workers + integraciones + Eco.** Competencia, repaso, hitos, certificados, orquestación (Zoom, LRS, H5P, CORA) y el pipeline de IA (Eco + RAG) | **Proxy de CRUD.** No poner Nest delante de un SELECT que RLS ya resuelve |
| **LRS (xAPI)** | Store de registro de todos los eventos de aprendizaje | Lógica de negocio |

**Anti-patrón prohibido:** enrutar por NestJS lecturas/escrituras simples (catálogo, feed,
perfil, listado de casos). Eso va directo `web → Supabase` con RLS. NestJS solo toca lo que
**no puede ni debe** vivir en el cliente ni en una policy: dominio, workers de fondo,
integraciones y Eco.

**Por qué existe NestJS:** de todos modos necesitas un **proceso Node persistente** para los
workers de BullMQ (decaimiento, repaso, certificados, ingesta de Zoom/DICOM, orquestación de
Eco no caben en route handlers de Next, que son request-scoped y con timeout). NestJS es la
forma disciplinada de estructurar ese worker tier y, de paso, exponer la API de dominio.

---

## 3. Stack y versiones

Fija cada dependencia a su **última estable** al momento de instalar; abajo el piso mínimo.

- **Monorepo:** pnpm (workspaces) + Turborepo
- **Runtime:** Node 20 LTS · TypeScript 5.x (strict)
- **Front:** Next.js 16+ (App Router), React 19, Tailwind, shadcn/ui (**personalizado**, no defaults — ver §5A), Serwist (`@serwist/next`) — sucesor de next-pwa, para Next 16 + Turbopack. **Bundler: `next dev` usa Turbopack; el build de PRODUCCIÓN usa `next build --webpack`** — decisión por **incompatibilidad de los codecs WASM de Cornerstone3D (`@cornerstonejs/dicom-image-loader`) con Turbopack** (cuelgan el build al entrar al grafo vía el visor DICOM). `next.config.mjs` stubea `fs`/`path`/`crypto` a vacío en ambos bundlers. No es un TODO: es el modo de build soportado hasta que Turbopack resuelva el WASM/Node-builtins
- **Backend/dominio:** NestJS 10+ (`apps/api`) + worker NestJS standalone (`apps/worker`)
- **Colas:** BullMQ + Redis 7 (**Redis propio del LXP**, separado del de CORA/CRM)
- **Datos:** **Supabase compartido con CORA** (Postgres 15 + Auth + RLS). Esquema `lxp` propio; lee `public` (esquema de CORA) en solo lectura. Hoy en **Supabase Cloud**; destino **VPS de BD dedicado** self-hosted. Extensión **pgvector** para RAG
- **Auth:** OAuth (Google/Microsoft, según proveedor del correo) + **email/contraseña con restablecer**. Sin passwordless/magic-link. Identidad = mismo `auth.users` que CORA
- **IA (Eco):** orquestación **modelo-agnóstica** multi-modelo — Haiku (recopilar/clasificar) + Sonnet (juicio/evaluación) + **tools deterministas** (datos y cálculos = SQL, no LLM); Opus solo excepciones. **RAG:** pgvector + **embeddings multilingües self-hosted** (BGE-M3 / e5-multilingual) en el VPS — no API (latencia). **Captura de correcciones docente→Eco** como loop de mejora
- **LRS:** Yet Analytics **SQL LRS** (self-hosted, Docker) — endpoint xAPI conformante. xAPI es el tracking base
- **Contenido:** **H5P** (interactivos, `@lumieducation/h5p-server`) + **acepta paquetes SCORM y xAPI** (exportados de Articulate Rise/Storyline; SCORM por compatibilidad del material existente) + documentos (**PDF, Word, PowerPoint**) + video. **Course builder (ingesta):** paquetes SCORM/xAPI se descomprimen con **`adm-zip`** y se valida el manifiesto con **`fast-xml-parser`**; los reactivos de autoevaluación se importan de **CSV/Excel con `exceljs`** (una sola dep, cubre `.xlsx` y `.csv`; **no** SheetJS/`xlsx` — la versión npm arrastra advisories)
- **Imagen médica:** todo es **DICOM** — visor **Cornerstone3D** (ver + anotar) + **anonimización obligatoria** en ingesta (worker `procesar-dicom`)
- **Media:** video/DICOM/archivos en **object storage** — MinIO o Supabase Storage al inicio, **Cloudflare R2** cuando el media escale — **nunca en Postgres ni en el VPS de apps**. Video adaptativo por **Cloudflare Stream**
- **Validación:** zod (compartido front/back) · DTOs de Nest derivados de zod
- **ORM en `api`:** Drizzle (o Prisma) contra Postgres — decidir en Sprint 1 y no mezclar
- **Infra:** **VPS de apps** (Hostinger KVM4) con **Docker Compose + Traefik** (reverse proxy, ya en uso en el CRM) corriendo web/api/worker/redis/lrs/embeddings; **VPS de BD** dedicado para Supabase self-hosted (a futuro). Exposición sin puertos públicos vía Traefik / **Cloudflare Tunnel**
- **Observabilidad:** Sentry + pino (logs estructurados) + Uptime Kuma (self-host)

### Dependencias del COURSE BUILDER (fijas y aprobadas por Manny)
Piso mínimo del constructor de contenido del diseñador (§5B / §5C). **Todas quedan permitidas en
esta §3**; ver §5C para qué editor usa cada bloque. Fija cada una a su última estable al instalar.

- **Editor rico (teoría + foro):** `@tiptap/react`, `@tiptap/starter-kit`, extensiones `table`
  (+ `table-cell` / `table-header` / `table-row`), `image`, `link`, `youtube`, `placeholder`,
  `character-count`, `highlight`, `mathematics` (KaTeX inline); `katex`; `mammoth` (importar
  Word → HTML).
- **Drag & drop:** `@dnd-kit/core`, `@dnd-kit/sortable`.
- **Audio / TTS:** `wavesurfer.js` (onda visual) + **adaptador TTS INTERCAMBIABLE** — OpenAI para
  arrancar, ElevenLabs como upgrade **por config** (mismo patrón modelo-agnóstico que Eco, §3/§7A:
  el proveedor de voz es una pieza reemplazable, no cableada).
- **Video:** `vidstack` / `@vidstack/react` (transcripción + marcadores de hitos).
- **Interactivos básicos:** `react-konva`, `konva` (hotspots sobre imagen/video).
- **H5P completo:** `@lumieducation/h5p-server` + `@lumieducation/h5p-react` (**editor Y player**
  dentro del Studio). ⚠️ **AGPL** — Manny lo asume conscientemente.
- **Paquetes xAPI / SCORM:** `adm-zip`, `fast-xml-parser`.
- **Autoevaluación / importar:** `exceljs` (una sola dep cubre **CSV y Excel** `.xlsx`). **No** SheetJS/`xlsx` (la versión npm arrastra advisories). La importación de reactivos es server-side (`POST /reactivos/importar` en `apps/api`).
- **PDF:** `pdf-lib`.

**No introducir tecnologías fuera de esta lista sin confirmación explícita.** En particular:
**nada de n8n en el core** de lógica de negocio (es un anti-objetivo declarado; la lógica va en
NestJS/BullMQ). Las deps del course builder de arriba **ya están aprobadas**; ningún agente
instala nada **fuera** de esa lista sin confirmación.

---

## 4. Estructura del monorepo

campus-virtual-lxp/
├── campus-lxp-mocks/        # REFERENCIA VISUAL — mocks TSX aprobados por pantalla (no es la app)
│   ├── alumno/
│   ├── studio/
│   │   ├── disenador/
│   │   ├── docente/
│   │   └── admin/
│   └── globals.css          # tokens del sistema de diseño (fuente de verdad visual)
├── apps/
│   ├── web/
├── apps/
│ ├── web/ # Next.js — UI, PWA, mobile-first
│ ├── api/ # NestJS — API de dominio (HTTP)
│ │ └── src/ai/ # Eco: orquestador multi-modelo, prompts, RAG (retrieve)
│ └── worker/ # NestJS standalone — consumidores BullMQ (sin HTTP)
├── services/
│ └── embeddings/ # Python — BGE-M3 self-hosted (sentence-transformers)
├── packages/
│ ├── shared/ # tipos TS + esquemas zod + verbos xAPI + contratos
│ ├── db/ # esquema Drizzle/Prisma (schema lxp), migraciones, seed
│ └── config/ # eslint, tsconfig, tailwind preset compartidos
├── infra/
│ ├── docker-compose.yml # web, api, worker, redis, lrs, embeddings, traefik, cloudflared
│ ├── traefik/ # config del reverse proxy
│ ├── backups/ # scripts pg_dump + WAL + sync a object storage
│ └── observability/ # sentry, uptime-kuma
├── supabase/
│ ├── migrations/ # SQL versionado (schema lxp + pgvector) — NO tocar schema public de CORA
│ └── seed/ # datos semilla
├── turbo.json
├── pnpm-workspace.yaml
├── .env.example
├── SPRINTS.md
└── CLAUDE.md


Reglas: **tipos y contratos compartidos viven en `packages/shared`** (nunca duplicar un tipo de
dominio). Las migraciones del LXP tocan **solo el esquema `lxp`** (+ pgvector); **jamás el
esquema `public` de CORA**. El servicio de embeddings es Python (único no-TS), aislado en `services/`.

---

## 5. Convenciones de código

- **TypeScript strict** en todo el repo. Prohibido `any` sin comentario justificando.
- **Nombres de dominio en español** (tablas, entidades, rutas de negocio): `bitacora_casos`,
  `casos_ateneo`, `competencia_dominios`. Código/infra/libs en inglés estándar.
- **Validación con zod** en el borde. Los DTOs de Nest se derivan del esquema zod de
  `packages/shared` (no reescribir la forma dos veces).
- **Errores:** nunca tragar excepciones. En `api`/`worker` usar filtros de excepción de
  Nest + logs pino con `correlationId`. En `web`, estados de error visibles + toasts.
- **Sin secretos en el código.** Todo por env. `service_role` de Supabase **solo** en
  `api`/`worker`, **jamás** en `web`.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`…), scope por app.
- **Tests:** cada módulo de dominio en `api` lleva test unitario (Vitest/Jest). El motor de
  competencia, el scheduler de repaso y **el pipeline de evaluación de Eco** deben tener tests
  — son lógica crítica.

---

## 5A · Sistema de diseño (UI) — respetar al construir `apps/web`

Tokens **definitivos del proyecto**, compartidos con el portal de CORA (refuerza el "un solo
lugar"). Fuente de verdad: `globals.css`. En TSX todo sale de utilidades semánticas
(`bg-card`, `text-secondary`, `bg-sidebar`…), **sin hex hardcodeado**. Referencia visual: los
mocks TSX en `/campus-lxp-mocks`.

**shadcn/ui va PERSONALIZADO, no por default.** El look genérico viene de usar los componentes
tal cual salen. shadcn es código propio en el repo: sus componentes (badge, button, card, input…)
se reescriben con el carácter del proyecto (radios, relleno, estados) una sola vez, y todos
heredan ese estilo. No usar los defaults.

### Modo de color
- **Light por defecto.**
- **Modo lectura inmersivo** SOLO dentro de la lección (§ pantalla de lección): tres temas de
  lectura — **claro / sepia / oscuro** — que tiñen **toda** la superficie de lección (no una
  isla), con el sidebar oculto y el header en tono. El **sepia** (`#F4ECD8` fondo / `#5B4636`
  texto aprox) es el óptimo para estudio prolongado; el oscuro usa gris profundo (`#1A1A1A`),
  **nunca negro puro**. Transición suave; instantánea si `prefers-reduced-motion`. Recuerda el
  tema y ofrece control de tamaño de fuente (A- / A+).

### Tokens de color (light; ver `globals.css` para la definición completa)
**Marca:**
- `--primary` `#53c3be` (teal claro) — botones de acción sólidos, barras de progreso, badge de contador, toggles activos
- `--secondary` `#1a8880` (teal oscuro) — hero de olas, links, íconos activos, hover de primary, texto sobre accent
- `--accent` `#f0fafa` / `--accent-foreground` `#1a8880` — fila "hoy", selección, chips positivos, hover de filas
- `--sidebar` `#0f2d52` (navy) / `--sidebar-foreground` `#ffffff` — ítem activo del menú, tarjeta WhatsApp, avatares de staff

**Neutros:**
- `--background` / `--muted` `#F8F9FA` · `--card` `#FFFFFF` · `--border` `#E5E7EB`
- `--foreground` `#111827` (texto/cifras) · secundario `#374151` · `--muted-foreground` `#6B7280` · placeholder `#9ca3af` · íconos vacíos `#d1d5db`

**Estados** (regla: **un solo color de atención por pantalla**; el rojo **nunca** fuera de dinero vencido):
- `--destructive` `#ef4444` — SOLO pago vencido (chip, borde, badge). Fondo `#fef2f2` / borde `#f8c9c9`
- warning `#f59e0b` (texto `#92400e`) — práctica, por vencer, pendiente. Fondo `#fffbeb` / borde `#fde68a`
- info `#6366f1` (texto `#4338ca`) — sesión presencial, archivo en validación. Fondo `#eef2ff` / borde `#c7d2fe`

Ámbar/indigo/rojo usan la escala de Tailwind (el tema no define `--warning`/`--info`).

### Tipografía
Familia única **Inter** (400–800). **Mono del sistema** (ui-monospace, Menlo) SOLO para RFC,
CLABE, folios y matrícula. Escala: Display 30/800, cifra grande 26/800, H1 22/700, H2 16/700,
cuerpo 13–13.5/600, meta 11/400, overline 10–11/700 mayúsculas.

### Geometría
- Radios: **12px** tarjetas · **9–11px** botones/campos/chips · **999px** chips de estado/avatares/barras · 14–18px hero
- Grid desktop **208 / 1fr / 316**, gap 20. Ancho máx **1240px** centrado.
- Sombra única de reposo: `0 1px 3px rgba(17,24,39,.06)`. **Sin glass ni gradientes** salvo el hero de olas.
- Target táctil 44px (48px en CTA principal). Iconografía **Lucide**, stroke 1.75.

### Layout adaptativo (Campus vs Studio)
- **Campus (alumno):** shell de nav lateral navy + contenido. Panorama → 3 col (`208/1fr/316`);
  aprendizaje/lección → 1 col centrada (medida de lectura, sin rail, nav colapsable); catálogo → grid.
- **Studio (staff):** **sin sidebar** — navegación en el **header**, para dar todo el ancho al
  trabajo; header contextual en modo edición (breadcrumb + guardar/publicar). Denso, tablas/formularios.
- Responsive: `3 col → 2 col (rail a drawer) → 1 col + bottom-nav (móvil, 5 esenciales)`.

### Moción y microinteracciones
Con propósito, no decorativas (comunican estado: guardado, enviado, validado, progreso).
200–300 ms, easing físico. Respetar SIEMPRE `prefers-reduced-motion`.

### Calidad base (piso, no negociable)
Mobile-first (PWA), `:focus-visible`, contraste WCAG AA, componentes consistentes, una acción
primaria por vista, "Continuar donde lo dejaste", búsqueda global. Copy en voz activa
("Subir caso" → toast "Caso enviado a validación").

---

## 5B · Consola de staff ("Studio") y roles

El staff trabaja en `/studio` dentro de `apps/web` con **RBAC** (no es otra app: misma base,
guards por rol). Hereda el sistema visual (§5A) en "modo trabajo" (denso, sin sidebar —
navegación en el header). **Una sola vista completa; el rol acota qué se ve/hace** (ej. Config
del sistema solo la ve súper admin).

Cinco roles (enum en `perfiles.rol`):

- **`super_admin`** — gobierna **todo**, incluida la **configuración del sistema**: usuarios y
  roles, IA/Eco, integraciones, académico global, marca, storage/LRS, notificaciones, seguridad/
  auditoría, badges. Ve el centro de control (negocio + salud del sistema) y la analítica global.
- **`admin`** — administra la **experiencia** (grupos, alumnos, recursos, avance, anuncios) —
  **absorbe "control escolar"**. Ve todo lo académico global pero **no** la config del sistema.
- **`docente`** — opera y **evalúa** (el especialista clínico): valida casos con criterio médico,
  revisa entregas, atiende **consultas** (canal 1:1 con alumnos), sigue sus grupos, da clases en
  vivo, cura la **Biblioteca de casos** (estructura la "verdad del caso"), tiene **Mis recursos**
  (almacén personal). Eco lo asiste en todo.
- **`disenador_instruccional`** — construye contenido: **course builder** (programa → módulos →
  lecciones, drag-and-drop, horas acumulables), autoría (video, H5P, teoría), **rúbricas de las
  actividades**, biblioteca de Contenido reutilizable, curaduría/subida de casos (apoyo al docente),
  publicación con **versionado**. También puede lanzar encuestas al Ateneo.
- **`alumno`** — vive en el Campus, no en el Studio. Su identidad viene de CORA (§1).

**Reparto pedagógico vs clínico (clave):** lo **pedagógico** (estructura, rúbricas de actividad)
es del **diseñador**; el **criterio clínico** (verdad del caso, validación de imágenes) es del
**docente** — un pedagogo no puede juzgar una imagen ecográfica. Eco evalúa contra la verdad que
define el docente.

Regla: sin capa de autoría no hay contenido que mostrar. El Studio del diseñador es prioritario.

---

## 5C · Course builder — editores de bloque

El **course builder** (del diseñador, §5B) arma la lección arrastrando **bloques** (drag & drop con
`@dnd-kit`, §3). Cada tipo de bloque tiene su editor. Especificación por bloque (deps en §3):

- **Texto / teoría:** editor rico **TipTap** (acepta y produce **HTML**), **fórmulas KaTeX inline**
  (extensión `mathematics`), **importar Word** (`mammoth` → HTML). Además **narración TTS
  automática** — Eco lee el texto y lo manda a renderizar por el adaptador TTS (OpenAI→ElevenLabs
  por config, §3) — **y** opción de **subir audio propio**. La onda visual es `wavesurfer.js`.
- **Video:** subir/embeber (`vidstack`) + **transcripción** (ventana lateral) + **hitos de consulta
  rápida** (tab junto a la transcripción para saltar a puntos clave).
- **Interactivo H5P:** **H5P completo** (editor + player, `@lumieducation/*`) **dentro del Studio** —
  se autora y se previsualiza sin salir. Emite xAPI al LRS (§7).
- **xAPI:** subir **paquete** (Articulate / xAPI), reproducir, **reporta al LRS** directo (§7).
- **SCORM:** subir **paquete**, reproducir en su player (ya construido en el **Sprint 6**);
  reporta progreso.
- **Tarea:** **rúbricas NO inline** — se toman de un **catálogo REUTILIZABLE** (rúbricas para
  **estudios/reportes** vs **tareas entregables**, son familias distintas). La tarea solo
  **SELECCIONA** la rúbrica del catálogo + añade **lineamientos**; no se redacta la rúbrica dentro
  de la tarea. (La define el diseñador, §5B; el criterio clínico de estudios lo da el docente.)
- **Autoevaluación:** **constructor de preguntas** + **Eco propone examen** (borrador, el humano
  decide · §7A) + **importar reactivos** de archivo (`exceljs`: CSV / Excel).
- **Foro:** post del alumno con **editor completo** (el **mismo TipTap**: HTML / imágenes / video) +
  comentarios. (El foro es una actividad cerrada del grupo, §1 — no confundir con el Ateneo.)
- **Encuesta:** **una pregunta al final de cada módulo**, con **control de avance** (gate: responder
  para continuar).

---

## 6. Modelo de datos (núcleo)

Tablas en el esquema **`lxp`** de Supabase (nombres definitivos; RLS obligatoria en todas). El
LXP **lee** el esquema **`public`** de CORA (`public.usuarios`, `public.estudiantes`, `public.grupos`,
`public.pagos`, calendario) en solo lectura vía funciones `SECURITY DEFINER` (§10); **no** crea esas
tablas. *(En local, el mock de CORA del Sprint 1 replica esa misma estructura `public.*` — mismos
nombres en local y producción, para no reescribir queries en el Sprint 11.)*

- `lxp.perfiles` — extiende `auth.users` (**compartido con CORA**). `rol` enum
  `super_admin | admin | docente | disenador_instruccional | alumno`. El perfil `alumno` se crea
  por evento de inscripción en CORA (no a mano). `acceso_activo` (bool) lo controla CORA (pago).
- **Programas y grupos (modelo de herencia):** `programas` (plantilla: temario/contenido — fuente
  de verdad viva), `modulos`, `lecciones`, `contenidos` (`tipo`: `video | h5p | scorm | xapi | texto | quiz`),
  `grupos` (instancia de un programa: nombre, modalidad síncrono/asíncrono, fechas, calendario de
  liberación, docente), `grupo_overrides` (personalizaciones puntuales de un grupo sobre la plantilla).
  Inscripción alumno↔grupo vive en `public` (CORA; se lee).
- **Actividades de lección:** `actividades` (`tipo`: `tarea | autoevaluacion | foro`), `rubricas`
  (criterios/pesos — las define el diseñador), `entregas` (respuesta del alumno, nota, estado),
  `foro_mensajes` (discusión **cerrada del grupo**).
- **Práctica y reportes (DICOM):** `bitacora_casos` (id_alumno, grupo, modulo, organo, dominio_iaim,
  estudio_dicom_ref → object storage, hallazgos, diagnostico_presuntivo, horas_estimadas,
  estado_validacion `pendiente|aprobado|rechazado`, origen `alumno|staff`), `validaciones`
  (id_docente, feedback, decisión, correccion_sobre_eco), `reportes` (reporte clínico con datos de
  paciente → PDF/envío; genera versión anonimizada como caso).
- **Comunidad / Ateneo:** `posts_ateneo` (`tipo`: `caso | encuesta | anuncio_comunidad`, viñeta,
  ref DICOM, visibilidad), `comentarios_ateneo` (upvotes, flag de validación del docente).
- **Competencia y verdad de casos:** `competencia_dominios` (proyección por alumno×dominio I-AIM;
  horas, decaimiento, próximo repaso — **la escribe el worker, no a mano**), `casos_biblioteca`
  (acervo curado + **verdad estructurada del caso**: hallazgos clave, diagnóstico, puntos de
  aprendizaje — alimenta simuladores y evaluación de Eco), `simuladores` (config: tipo
  `interpretacion|reporte`, casos base, parámetros).
- **Progreso/reconocimiento:** `hitos` (100/500/1000h…), `certificados`, `badges` +
  `badges_otorgados` (reglas automáticas o manuales; alumnos y docentes).
- **Herramientas:** `plantillas_reporte`, `calculadoras`, `recursos_docente` (almacén personal).
- **Comunicación:** `anuncios` (alcance/segmentación, canales, vigencia), `consultas` +
  `consulta_mensajes` (canal 1:1 alumno↔docente).
- **Eco / RAG:** `documentos_rag` + columna `embedding vector` (pgvector); `eco_correcciones`
  (registro de correcciones docente→Eco para el loop de mejora).

### RLS (patrones) — ver §10 para la convivencia con CORA
- `alumno` solo inserta/edita **sus propias** `bitacora_casos`, `entregas`, `consultas`; solo accede si `acceso_activo`.
- Lectura de `posts_ateneo` **aprobados** y `casos_biblioteca` publicados a todos los inscritos; solo `docente` valida/modera.
- `competencia_dominios` y proyecciones = **read-only** desde `web` (las escribe el worker con `service_role`).
- `docente` accede a sus grupos y a la curaduría clínica; `disenador_instruccional` a la autoría; `admin` a la experiencia global (sin config de sistema); `super_admin` a todo.
- Roles definidos **por plataforma** (un usuario puede ser staff en CORA y no tener rol LXP, o viceversa) — ver §10.

---

## 7. Capa xAPI / LRS

- El **SQL LRS** es el **store de registro** de todos los eventos de aprendizaje. El contenido
  (H5P, **SCORM**, video, quizzes, casos, clases) emite statements **actor–verbo–objeto** al LRS.
- **Contenido externo:** paquetes **SCORM y xAPI** (exportados de Articulate Rise/Storyline) se
  suben en Contenido; xAPI reporta al LRS directo; SCORM se reproduce en su player y reporta progreso.
- `packages/shared/xapi` define el **perfil xAPI** del proyecto: verbos (`experimentó`, `completó`,
  `aprobó`, `subió`, `validó`, `asistió`, `falló`) y actividades (lección, caso, clase, dominio I-AIM).
- **Flujo:** cliente/servidor → cola `envio-xapi` (buffer + retry) → LRS. Nunca escribir al LRS de
  forma síncrona en el request del usuario.
- NestJS/Eco **leen** el LRS para el motor de competencia y la analítica; **no** reimplementan la spec.

## 7A · Eco — arquitectura de evaluación e IA

**Regla de oro de Eco:** un LLM solo toca lo que requiere **lenguaje o juicio**. Todo lo que es
**datos, filtros, cálculo o recuperación** lo hace un **tool** (SQL / lógica / RAG) — más rápido,
exacto y sin costo. Y cuando un LLM sí entra, se usa **el modelo más chico que resuelva bien**.
El RAG no es un adorno: recuperar la verdad del caso + la rúbrica hace que **Sonnet sea certero sin
necesitar un modelo grande** — el contexto sustituye tamaño de modelo.

### Pipeline de evaluación (casos y entregas) — tools primero, LLM al final
1. **Tool (SQL):** recopila las entregas/casos del grupo. *(nunca un LLM)*
2. **Tool (RAG · pgvector):** recupera la verdad estructurada del caso y la rúbrica relevante. *(nunca un LLM)*
3. **Tool (lógica):** auto-califica lo objetivo (opción múltiple), calcula lo determinista.
4. **Haiku — condicional:** solo si hay **texto libre desordenado** que normalizar/resumir a campos
   comparables. Si la respuesta ya viene estructurada, **este paso se salta**. Haiku no es obligatorio.
5. **Sonnet — el juicio:** compara la respuesta del alumno contra verdad+rúbrica, sugiere nota y
   redacta el borrador de feedback.
6. **Humano (docente):** confirma o corrige. **Nada se asienta sin él.**

En muchos casos reales el pipeline es **tool + Sonnet** (sin Haiku). No es una cadena fija de dos
modelos: es tools + el LLM mínimo necesario donde el texto/juicio lo exija.

### Dos modos de Eco (mismo principio)
- **Bandeja (lote):** Eco pre-analiza todos los casos/entregas y los separa por confianza —
  **"listos para confirmar"** (alta confianza → el docente aprueba en lote) vs **"requieren tu
  criterio"** (dudosos → el docente los revisa uno a uno). Corre en el job `eco-evaluacion`.
- **Conversacional:** el docente le pide a Eco en lenguaje natural ("resume el Grupo B", "mejores
  casos", "redacta feedback para los reprobados"). Orquestación más flexible, mismo principio
  tools-first.

### Autonomía (balanceado, nunca agresivo)
Eco **propone**; el docente **decide**. Puede auto-calificar lo objetivo y **pre-calificar** lo abierto,
pero la nota/validación **solo se asienta con confirmación humana** (individual o en lote). Umbral de
confianza configurable (súper admin) para separar "listos" de "requieren criterio". Por el peso clínico
y curricular, **nunca** auto-aprobar sin humano.

### Requisitos que habilitan a Eco
- **Verdad estructurada del caso** (contrato mínimo, definido por el docente): hallazgos clave,
  diagnóstico correcto, puntos de aprendizaje, errores comunes. **No texto libre** — si no está
  estructurado, Eco no evalúa bien. Es lo que alimenta evaluación y simuladores.
- **RAG:** pgvector + embeddings self-hosted (§3). Indexado asíncrono (`indexar-rag`).
- **Loop de mejora:** cada corrección del docente sobre una sugerencia de Eco se registra
  (`eco_correcciones`) → material para afinar prompts/conocimiento (y a futuro, fine-tuning propio).
- **Modelo-agnóstico:** "el modelo que resume" y "el modelo que juzga" son piezas intercambiables por
  config (hoy Anthropic; mañana otro proveedor u open-source self-hosted sin reescribir lógica).

---

## 8. Jobs de fondo (BullMQ · corren en `apps/worker`)

Enumerados; cada uno con reintentos y backoff:

1. `envio-xapi` — enviar statements al LRS con retry (buffer, nunca síncrono).
2. `procesar-dicom` — al subir un estudio: parsear → **anonimizar** (quitar PII del paciente, bloqueante) → guardar en object storage → registrar metadatos. **Ningún caso se guarda sin anonimizar.**
3. `ingesta-grabacion-zoom` — webhook Zoom `recording.completed` → descarga → sube a object storage/Stream → registra en videoteca → emite xAPI de disponibilidad.
4. `calculo-competencia` — al aprobarse un caso, recalcular `competencia_dominios` del alumno.
5. `deteccion-decaimiento` — cron: detectar dominios con competencia en caída.
6. `programar-repaso` — calcular curva de olvido por alumno y agendar reexamen a nivel de concepto.
7. `deteccion-hito` — detectar 100/500/1000h u otros hitos → dispara badges/certificados.
8. `emision-certificado` — generar y registrar certificado al cumplir hito final.
9. `otorgar-badges` — evaluar reglas automáticas de badges (por hitos, casos, competencia, racha).
10. `indexar-rag` — al crear/curar un caso, rúbrica o material: chunk → embedding (servicio local) → upsert en pgvector. Asíncrono (la latencia no importa aquí).
11. `eco-evaluacion` — pipeline de Eco en lote (pre-analizar casos/entregas de un grupo): tools recopilan → Haiku clasifica → Sonnet juzga → deja propuestas para el docente.
12. `notificaciones` — avisos al alumno/docente (validación pendiente, repaso, certificado, anuncio) por in-app / correo / WhatsApp.

> El resumen saliente hacia CORA **no es un job**: CORA lee el esquema `lxp` directo (mismo
> Postgres). La provisión/suspensión de alumnos **tampoco**: es identidad compartida + `acceso_activo` (§1, §10).

---

## 9. Integraciones externas

- **Zoom (clases en vivo):** REST API para crear/listar reuniones; el docente **inicia la clase
  desde el Studio** (lanza Zoom, el video corre en Zoom — no se embebe el SDK en el MVP). **Webhook**
  `recording.completed` (firma validada) → `ingesta-grabacion-zoom`. Las grabaciones **no se quedan
  en Zoom Cloud** (caro/limitado a 800 alumnos): se mueven a object storage/Stream y quedan ligadas
  al grupo/lección. Brandear Zoom (logo/color) para suavizar el salto.
- **MiCo+ (Mindray) — clase de ultrasonido en vivo:** plataforma **cerrada, sin API pública
  confirmada**. Por ahora se **agenda/enlaza** desde el Studio (patrón "lanzar", como Zoom);
  ejecución fuera. **Nivel de integración real (A: API / B: enlace / C: solo su app) pendiente de
  confirmar con Mindray.** No construir integración profunda hasta acuerdo.
- **Cloudflare Stream / object storage:** todo video, DICOM y archivo pesado pasa por object storage
  (MinIO/Supabase al inicio → R2 al escalar). **Nunca en Postgres ni en el VPS de apps.** Video
  adaptativo por Stream.
- **Contenido empaquetado:** **H5P** (autorable, emite xAPI) + **SCORM y xAPI** de Articulate
  (Rise/Storyline) subidos en Contenido. El material SCORM existente funciona tal cual; lo nuevo se
  exporta a xAPI desde Articulate apuntando al LRS.
- **IA (Eco):** proveedores de LLM vía API (Anthropic por default; **modelo-agnóstico** por config —
  §3). Embeddings **self-hosted** (servicio local, no API). Config de modelos/parámetros en el súper admin.
- **CORA:** **no es una integración por API** — es el mismo proyecto Supabase (esquema **`public`**,
  leído en solo lectura; `auth.users` compartido). Ver §1 y §10.

---

## 10. Seguridad e identidad (convivencia con CORA)

**Identidad compartida:** LXP y CORA usan el **mismo `auth.users`** (mismo proyecto Supabase). Un
solo `user_id`. Auth por **OAuth (Google/Microsoft según el proveedor del correo) + email/contraseña
con restablecer**. En el primer acceso el alumno define su contraseña (enlace enviado por CORA, que es
quien comunica el alta). Sin passwordless/magic-link como vía principal.

- NestJS **verifica la firma** del JWT contra el **JWKS** de Supabase en un guard; nunca confía en headers sin verificar.
- **Roles por plataforma:** un usuario puede ser staff en CORA sin rol LXP, o alumno LXP sin rol
  CORA. El rol LXP vive en `lxp.perfiles.rol`; no asumir que un rol de CORA aplica al LXP.
- **`acceso_activo`** (controlado por CORA según pago) **bloquea** el acceso del alumno vía guard + RLS
  → pantalla de "acceso en pausa" con link al checkout de CORA, no un error.
- Autz por rol en endpoints de dominio + RLS en datos (doble control). `service_role` solo en
  `api`/`worker`; `web` usa `anon`/JWT de usuario.
- **DICOM/datos de paciente:** anonimización obligatoria y **bloqueante** antes de persistir el caso
  educativo; el reporte clínico (con datos de paciente) y el caso educativo (anonimizado) son flujos
  separados. Traza auditable de la anonimización.
- Webhooks (Zoom, LRS) validan firma/secreto antes de procesar.

### Hallazgos REALES de la auditoría de CORA (verificados en su dashboard, no supuestos)
CORA vive en el esquema **`public`** (no `cora`) del proyecto Supabase compartido. Lo confirmado:

- **Trigger `on_auth_user_created`** `AFTER INSERT ON auth.users` ejecuta `sync_auth_user_to_usuarios()`.
  Esa función **INSERTA en `public.usuarios`**, y si el metadata no trae `rol`, lo pone por DEFAULT en
  `'control_escolar'` (un rol administrativo de CORA). ⇒ **cualquier alta en `auth.users` crea fila en
  CORA.**
- **`public.usuarios.rol` tiene un CHECK** que solo admite
  `('super_admin','admin','control_escolar','docente','alumno','asesor')`. **No acepta valores nuevos.**
- **TODAS las tablas del esquema `public` tienen RLS habilitada** (usuarios, grupos, pagos,
  estudiantes, etc.). CORA + CRM + web pública conviven en el mismo proyecto Supabase.
- **Plan Pro con Supabase Branching disponible** → el staging es una **preview branch** (ver abajo).

### ⚠️ 5 REGLAS DE CONVIVENCIA (no negociables — la BD de CORA está en PRODUCCIÓN)
1. **El LXP NUNCA crea, invita ni modifica usuarios en `auth.users`** — ni `auth.admin.createUser`, ni
   `inviteUserByEmail`, ni `signUp`. Si lo hiciera, el trigger de CORA crearía una **fila espuria** en
   `public.usuarios` con rol `'control_escolar'`. El LXP **SOLO autentica** (`signInWithPassword` /
   OAuth) contra usuarios que **CORA ya creó**.
2. **Los roles del LXP viven SOLO en `lxp.perfiles.rol`.** Jamás en `public.usuarios` (el CHECK los
   rechaza).
3. **CERO DDL y CERO cambios de RLS sobre tablas del esquema `public` de CORA.** Todas tienen RLS
   activa; alterarlas **rompe CORA en silencio**.
4. **Lecturas CORA→LXP solo vía funciones `SECURITY DEFINER` de solo-lectura en el esquema `lxp`**
   (leer de `public.usuarios` / `estudiantes` / `grupos` / `pagos` por `supabase_auth_id`). **Nunca
   acoplar tablas** entre esquemas.
5. **`lxp.perfiles` se puebla LEYENDO el vínculo existente** (`auth.users` ↔
   `public.usuarios.supabase_auth_id`), **no creando identidad**.

### Reglas operativas base
- El LXP **agrega policies solo en el esquema `lxp`**; **jamás modifica las de CORA (`public`)**.
- Todo cambio de RLS/esquema se prueba en **staging = Supabase Branching** (preview branch desde
  `main`), verificando que CORA sigue intacto Y que el LXP aísla bien; **nunca** directo sobre la BD
  viva. **El branch se usa en el Sprint 11.**
- Antes de escribir policies del LXP, **entender el modelo de roles y `auth` que CORA ya usa**.
- Sin puertos públicos: exposición vía **Traefik / Cloudflare Tunnel**.

---

## 11. DevOps / resiliencia ("a prueba de bajones")

- **Dos VPS (mismo proveedor/datacenter, red cercana):**
  - **VPS de apps** (Hostinger KVM4): `web`, `api`, `worker`, `redis` (propio del LXP), `lrs`,
    `embeddings`, **Traefik** (reverse proxy, ya en uso en el CRM), `cloudflared`. Docker Compose,
    con **límites de recursos por contenedor** para que un pico del LXP no ahogue al CRM que convive.
  - **VPS de BD** (dedicado, a futuro): Supabase self-hosted (Postgres + Auth + pgvector) para
    CORA + LXP. Migración de CORA desde Cloud = trabajo de semanas; el LXP nace apuntando aquí.
- **Media pesado (DICOM/video) fuera de ambos VPS** → object storage (vigilar disco; R2 cuando escale).
- **Backups:** `pg_dump` diario + WAL → object storage (con versioning).
- **Observabilidad:** Sentry (errores), pino → logs centralizados, Uptime Kuma, healthchecks
  `/health` en `api` y `worker`.
- **CI/CD:** lint + test + build en cada push; deploy al VPS (patrón de la TAS de Zack: Docker +
  Traefik/Cloudflare Tunnel + CI/CD). Restart policies por servicio.

---

## 12. Comandos

```bash
# Instalar
pnpm install

# Desarrollo (todo el monorepo vía Turbo)
pnpm dev
pnpm --filter web dev          # solo front
pnpm --filter api start:dev    # solo API de dominio
pnpm --filter worker start:dev # solo workers

# Base de datos (Supabase — SOLO esquema lxp)
pnpm --filter db migrate:new -- <nombre>
pnpm --filter db migrate:up
pnpm --filter db seed

# Calidad
pnpm lint
pnpm test
pnpm build

# Infra local
docker compose -f infra/docker-compose.yml up -d
```

---

## 13. Guardrails para el agente (Claude Code)

- **Un sprint a la vez.** No empieces el siguiente hasta cumplir el Definition of Done del actual. No mezcles alcance entre sprints.
- **Ediciones quirúrgicas.** Cambia solo lo necesario. **Nada de refactors, renombres masivos ni "mejoras" no pedidas.**
- **No cambies el stack ni la arquitectura** de este archivo. Si algo choca con la realidad, **detente y pregúntalo** antes de improvisar.
- **No inventes** APIs, nombres de tablas, endpoints ni librerías. Si un dato no está aquí ni en `SPRINTS.md`, pregunta.
- **No instales dependencias fuera de la §3** sin confirmación.
- **Respeta la Regla de Oro (§2):** nada de proxys de CRUD en NestJS.
- **Respeta el Sistema de diseño (§5A):** tokens, tipografía (Inter), geometría, layout Campus vs Studio, y **shadcn personalizado, no defaults**. No inventes colores ni cambies la paleta.
- **CORA es sagrado (§10):** solo esquema `lxp`, nunca tocar el esquema `public` de CORA ni sus policies, probar en staging (Supabase Branching).
- **Datos de paciente (§10):** DICOM siempre anonimizado antes de persistir el caso educativo. No saltarse ese paso.
- **Eco propone, el humano decide:** ninguna calificación/validación se asienta sin confirmación humana.
- Al terminar cada sprint, **imprime el checklist del Definition of Done** y los comandos de verificación ejecutados.
- Explica en 2–3 líneas qué vas a hacer **antes** de tocar archivos en un paso complejo, y espera confirmación si hay ambigüedad.

---

## 14. Cómo trabajar este repo con Claude Code

1. Lee este `CLAUDE.md` completo **antes de cualquier acción**.
2. Usa los mocks TSX en `/campus-lxp-mocks` como **referencia visual** de cada pantalla — son el
   diseño aprobado, no la app final. Constrúyelos como app real (rutas App Router, datos, RLS)
   siguiendo la arquitectura de este archivo, no los pegues tal cual.
3. Abre `SPRINTS.md` y ejecuta **únicamente** el sprint indicado. Un sprint por sesión.
4. Al final del sprint: corre los comandos de verificación, muestra el checklist del Definition of
   Done, y **espera el visto bueno** del humano antes de avanzar.
5. Cada sprint deja el repo en un estado **corrible y verificable**.

### Antes de tocar la base de datos, siempre
- El esquema/policies del LXP viven **solo en `lxp`**. **Nunca** modifiques el esquema `public` de
  CORA ni sus RLS: CORA está en producción (§10). Ante cualquier duda de convivencia, **detente y
  pregunta**.
- Prueba migraciones y RLS en **staging** (copia), nunca sobre la BD viva.

### Prioridad si hay que recortar
El **loop de práctica** (bitácora DICOM → validación del docente con Eco → competencia → Ateneo) es
el corazón del producto. Ante presión de alcance, protégelo por encima de lo cosmético.

### Los mocks son la referencia visual
- La carpeta `campus-lxp-mocks/` en el root contiene el **diseño aprobado** de cada pantalla en TSX,
  organizada por rol (`alumno/`, `studio/disenador/`, `studio/docente/`, `studio/admin/`), más
  `globals.css` con los **tokens definitivos** (§5A).
- **Antes de construir cualquier pantalla, abre su mock correspondiente** y respétalo: layout,
  jerarquía, componentes y copy. Son la fuente de verdad de *cómo se ve*.
- **NO los copies tal cual** como app final: son estáticos con datos mock. Constrúyelos como app real
  (rutas App Router, datos, RLS, Eco) siguiendo la arquitectura del CLAUDE.md. El mock dice *qué se ve*;
  el CLAUDE.md dice *cómo funciona*.
- `campus-lxp-mocks/globals.css` es la base de los tokens; el `globals.css` real de `apps/web` parte
  de ahí. Si hay conflicto entre un color del mock y §5A, manda §5A.
