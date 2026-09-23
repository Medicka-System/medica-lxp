/**
 * Seed mock del Sprint 1 (SPRINTS §1, paso 10). Datos-andamio para testear; NO
 * son producto (se borran con `seed:clean`). La lógica no debe depender de ellos.
 *
 * Demuestra en vivo las 5 REGLAS DE CONVIVENCIA con CORA (§10):
 *   • El alta de identidad se hace insertando en `auth.users` COMO SI FUERA CORA
 *     (regla 1: el LXP nunca lo hace en producción). El trigger simulado crea la
 *     fila en `public.usuarios`.
 *   • `lxp.perfiles` se puebla LEYENDO el vínculo `auth.users` (regla 5), no
 *     creando identidad.
 *   • El diseñador (rol LXP `disenador_instruccional`) va con rol CORA
 *     `control_escolar`, porque el CHECK de `public.usuarios` rechaza el rol LXP
 *     (regla 2: los roles LXP viven solo en `lxp.perfiles`).
 *   • `acceso_activo` se deriva de los pagos de CORA vía la función puente
 *     `lxp.cora_acceso_activo` (regla 4: lectura por función, sin acoplar tablas).
 *
 * Uso:  tsx src/seed.ts          → limpia y siembra
 *       tsx src/seed.ts --clean  → solo limpia (deja la BD sin basura)
 */
import { createSql, type Sql } from './client';

const SEED_EMAIL_DOMINIO = '@seed.local';

type AlumnoKey = 'a1' | 'a2' | 'a3' | 'a4';

/** Primera fila de un resultado, con aserción de existencia (para RETURNING). */
function first<T>(rows: readonly T[]): T {
  const row = rows[0];
  if (row === undefined) throw new Error('La consulta no devolvió filas.');
  return row;
}

async function clean(sql: Sql): Promise<void> {
  await sql.unsafe(`
    truncate
      lxp.perfiles, lxp.programas, lxp.modulos, lxp.lecciones, lxp.contenidos,
      lxp.bloques, lxp.reproduccion_progreso,
      lxp.grupos, lxp.grupo_overrides, lxp.actividades, lxp.rubricas, lxp.entregas,
      lxp.foro_mensajes, lxp.bitacora_casos, lxp.validaciones, lxp.reportes,
      lxp.posts_ateneo, lxp.comentarios_ateneo, lxp.casos_biblioteca, lxp.simuladores,
      lxp.competencia_dominios, lxp.hitos, lxp.certificados, lxp.badges,
      lxp.badges_otorgados, lxp.plantillas_reporte, lxp.calculadoras,
      lxp.recursos_docente, lxp.anuncios, lxp.consultas, lxp.consulta_mensajes,
      lxp.documentos_rag, lxp.eco_correcciones,
      public.usuarios, public.estudiantes, public.grupos,
      public.inscripciones, public.pagos
    cascade;
  `);
  // Borra solo la identidad sembrada (CORA real jamás se toca · §10).
  await sql`delete from auth.users where email like ${'%' + SEED_EMAIL_DOMINIO}`;
}

/** Alta de identidad emulando a CORA: inserta en auth.users → trigger crea public.usuarios. */
async function altaCora(
  sql: Sql,
  p: { email: string; nombre: string; coraRol: string },
): Promise<string> {
  const u = first(
    await sql<{ id: string }[]>`
      insert into auth.users (email, raw_user_meta_data)
      values (${p.email}, ${sql.json({ nombre: p.nombre, rol: p.coraRol, seed: true })})
      returning id`,
  );
  return u.id;
}

/** Puebla lxp.perfiles LEYENDO el vínculo de auth.users (regla 5 · §10). */
async function crearPerfil(
  sql: Sql,
  authId: string,
  p: { lxpRol: string; acceso: boolean },
): Promise<void> {
  await sql`
    insert into lxp.perfiles (user_id, rol, nombre, email, acceso_activo)
    select id, ${p.lxpRol}::lxp.rol, raw_user_meta_data->>'nombre', email, ${p.acceso}
    from auth.users where id = ${authId}`;
}

async function seed(sql: Sql): Promise<void> {
  await clean(sql); // idempotente

  // ── Staff (1 de cada rol) ──────────────────────────────────────────────
  const superAdmin = await altaCora(sql, {
    email: `super${SEED_EMAIL_DOMINIO}`,
    nombre: 'Sofía Superadmin',
    coraRol: 'super_admin',
  });
  await crearPerfil(sql, superAdmin, { lxpRol: 'super_admin', acceso: true });

  const admin = await altaCora(sql, {
    email: `admin${SEED_EMAIL_DOMINIO}`,
    nombre: 'Ana Admin',
    coraRol: 'admin',
  });
  await crearPerfil(sql, admin, { lxpRol: 'admin', acceso: true });

  const docente = await altaCora(sql, {
    email: `docente${SEED_EMAIL_DOMINIO}`,
    nombre: 'Dr. Diego Docente',
    coraRol: 'docente',
  });
  await crearPerfil(sql, docente, { lxpRol: 'docente', acceso: true });

  // El diseñador va con rol CORA control_escolar (el CHECK rechaza el rol LXP).
  const disenador = await altaCora(sql, {
    email: `disenador${SEED_EMAIL_DOMINIO}`,
    nombre: 'Dora Diseñadora',
    coraRol: 'control_escolar',
  });
  await crearPerfil(sql, disenador, {
    lxpRol: 'disenador_instruccional',
    acceso: true,
  });

  // ── Alumnos (4; a4 con pago vencido = suspendido) ──────────────────────
  const alumnosSpec: { key: AlumnoKey; nombre: string; vencido: boolean }[] = [
    { key: 'a1', nombre: 'Alumno Uno', vencido: false },
    { key: 'a2', nombre: 'Alumno Dos', vencido: false },
    { key: 'a3', nombre: 'Alumno Tres', vencido: false },
    { key: 'a4', nombre: 'Alumno Cuatro (suspendido)', vencido: true },
  ];
  const alumnos = {} as Record<AlumnoKey, string>;
  for (const a of alumnosSpec) {
    const id = await altaCora(sql, {
      email: `${a.key}${SEED_EMAIL_DOMINIO}`,
      nombre: a.nombre,
      coraRol: 'alumno',
    });
    // acceso provisional; se recalcula desde pagos de CORA más abajo.
    await crearPerfil(sql, id, { lxpRol: 'alumno', acceso: !a.vencido });
    alumnos[a.key] = id;
  }

  // ── Datos CORA (public.*) que el LXP LEE ───────────────────────────────
  const gCoraA = first(
    await sql<{ id: string }[]>`
      insert into public.grupos (nombre, ciclo) values ('Generación 2026-A', '2026') returning id`,
  );
  for (const a of alumnosSpec) {
    const authId = alumnos[a.key];
    await sql`
      insert into public.estudiantes (supabase_auth_id, matricula, nombre)
      values (${authId}, ${'MAT-' + a.key.toUpperCase()}, ${a.nombre})`;
    await sql`
      insert into public.inscripciones (supabase_auth_id, grupo_id)
      values (${authId}, ${gCoraA.id})`;
    await sql`
      insert into public.pagos (supabase_auth_id, estado, vence_el)
      values (${authId}, ${a.vencido ? 'vencido' : 'al_corriente'}, ${
        a.vencido ? '2026-08-01' : '2026-12-31'
      })`;
  }

  // Sincroniza acceso_activo desde CORA vía la función puente (regla 4 · §10).
  await sql`
    update lxp.perfiles p
    set acceso_activo = lxp.cora_acceso_activo(p.user_id)
    where p.rol = 'alumno'`;

  // ═════════════════════════════════════════════════════════════════════════
  // CURSO DEMO en el MODELO NUEVO (mig 0023/0026): la lección es MONO-TIPO; su
  // contenido vive en `lxp.bloques` (teoría) o `lxp.lecciones.config` (el resto).
  // Se siembra 1 lección de CADA uno de los 7 tipos, con contenido de ejemplo.
  //   ⚠️ estado = 'publicado' (no basta `publicado=true`): la policy programas_read
  //      exige estado='publicado' para que el alumno lo vea (mig 0013).
  // ═════════════════════════════════════════════════════════════════════════
  const programa = first(
    await sql<{ id: string }[]>`
      insert into lxp.programas (nombre, descripcion, publicado, estado, version)
      values ('Ultrasonografía Básica — Demo',
              'Curso demo del constructor nuevo: una lección de cada tipo.',
              true, 'publicado'::lxp.estado_publicacion, 1)
      returning id`,
  );

  // Las horas se definen POR LECCIÓN (mig 0022); el módulo las SUMA solo (trigger).
  const m1 = first(
    await sql<{ id: string }[]>`
      insert into lxp.modulos (programa_id, nombre, orden)
      values (${programa.id}, 'Fundamentos y física', 1) returning id`,
  );
  const m2 = first(
    await sql<{ id: string }[]>`
      insert into lxp.modulos (programa_id, nombre, orden)
      values (${programa.id}, 'Adquisición y actividades', 2) returning id`,
  );

  /** Crea una lección MONO-TIPO (mig 0023) y devuelve su id. */
  async function crearLeccion(p: {
    moduloId: string;
    nombre: string;
    orden: number;
    horas: number;
    tipo: string;
    config?: unknown;
  }): Promise<string> {
    const row = first(
      await sql<{ id: string }[]>`
        insert into lxp.lecciones (modulo_id, nombre, orden, horas, tipo, config)
        values (${p.moduloId}, ${p.nombre}, ${p.orden}, ${p.horas},
                ${p.tipo}::lxp.leccion_tipo, ${sql.json((p.config ?? {}) as never)})
        returning id`,
    );
    return row.id;
  }

  // ── (1) TEORÍA → bloques ordenables en lxp.bloques ──────────────────────
  const lTeoria = await crearLeccion({
    moduloId: m1.id, nombre: 'Principios de la imagen', orden: 1, horas: 3, tipo: 'teoria',
  });
  await sql`
    insert into lxp.bloques (leccion_id, orden, tipo_bloque, config) values
      (${lTeoria}, 1, 'texto', ${sql.json({
        html: '<h2>Formación de la imagen</h2><p>El ultrasonido se genera por el <strong>efecto piezoeléctrico</strong>: el transductor emite pulsos y recibe los ecos reflejados en las interfaces de distinta impedancia acústica.</p>',
      })}),
      (${lTeoria}, 2, 'imagen', ${sql.json({
        src: 'https://placehold.co/800x450?text=Transductor+lineal',
        alt: 'Esquema de un transductor lineal',
        pie: 'Figura 1. Emisión y recepción del pulso.',
      })}),
      (${lTeoria}, 3, 'html', ${sql.json({
        html: '<blockquote>La <em>impedancia acústica</em> (Z) es el producto de la densidad del medio por la velocidad del sonido.</blockquote>',
      })}),
      (${lTeoria}, 4, 'link', ${sql.json({
        url: 'https://www.pocus101.com/', titulo: 'POCUS 101 — recurso externo',
        descripcion: 'Guía externa de POCUS para ampliar.',
      })})`;

  // ── (2) VIDEO → config (ref + transcripción + highlights) ───────────────
  await crearLeccion({
    moduloId: m1.id, nombre: 'Artefactos en modo B', orden: 2, horas: 2, tipo: 'video',
    config: {
      // Enlace directo (demo reproducible sin subir a MinIO · soportado por el editor
      // de video y el render del alumno). En producción el diseñador sube el archivo
      // (videotecaId, URL firmada) o pega su propio enlace (Stream / CDN).
      url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      ref: 'demo/videos/artefactos-modo-b.mp4',
      titulo: 'Artefactos en modo B',
      estado: 'listo',
      transcripcion:
        'En esta clase revisamos los artefactos más comunes: sombra acústica, refuerzo posterior y reverberación (colas de cometa)...',
      highlights: [
        { t: 15, titulo: 'Sombra acústica' },
        { t: 92, titulo: 'Refuerzo posterior' },
        { t: 174, titulo: 'Reverberación / colas de cometa' },
      ],
    },
  });

  // ── (5=módulo) ENCUESTA de fin de módulo NO es un tipo de lección: se omite.
  //    Los 7 tipos son teoria/video/autoevaluacion/tarea/foro/h5p/xapi (mig 0023).

  // ── (3) AUTOEVALUACIÓN → config con reactivos (shape autoeval-contrato) ──
  const lAutoeval = await crearLeccion({
    moduloId: m2.id, nombre: 'Autoevaluación: fundamentos', orden: 1, horas: 1, tipo: 'autoevaluacion',
    config: {
      descripcion:
        'Cinco preguntas sobre los fundamentos: cómo se refleja el ultrasonido, artefactos de modo B y cómo describir la impedancia. No cuenta para la nota del diplomado: sirve para saber si puedes seguir o conviene repasar.',
      promesa:
        'Al terminar verás qué acertaste, qué falló y por qué — con la retroalimentación de cada pregunta.',
      intentos: 0,
      barajar: true,
      mostrarRetro: true,
      minutos: 20,
      umbral: 80,
      fechaApertura: '2026-09-15',
      fechaCierre: '2026-09-28',
      cuentaParaCalificacion: false,
      reactivos: [
        {
          id: 'r-demo-1', tipo: 'opcion_multiple',
          enunciado: '¿Qué propiedad determina la reflexión del ultrasonido en una interfaz?',
          imagen: {
            etiqueta: 'Serie 1 · modo B',
            anotacion: 'Interfaz de impedancia',
            pie: 'Referencia técnica en modo B: la reflexión ocurre en el salto de impedancia acústica entre dos medios.',
          },
          opciones: [
            { clave: 'a', texto: 'La frecuencia del operador' },
            { clave: 'b', texto: 'La diferencia de impedancia acústica' },
            { clave: 'c', texto: 'El color del gel' },
          ],
          correcta: 'b', puntaje: 1, dominio: 'interpretacion', retro: 'La reflexión depende del salto de impedancia (Z).',
          origen: 'manual',
        },
        {
          id: 'r-demo-2', tipo: 'verdadero_falso',
          enunciado: 'El refuerzo posterior aparece detrás de estructuras llenas de líquido.',
          opciones: [
            { clave: 'v', texto: 'Verdadero' },
            { clave: 'f', texto: 'Falso' },
          ],
          correcta: 'v', puntaje: 1, origen: 'manual',
        },
        {
          id: 'r-demo-3', tipo: 'multi',
          enunciado: 'Selecciona los artefactos de modo B:',
          ayuda: 'Puedes marcar más de una.',
          opciones: [
            { clave: 'a', texto: 'Sombra acústica' },
            { clave: 'b', texto: 'Reverberación' },
            { clave: 'c', texto: 'Efecto Doppler' },
          ],
          correcta: ['a', 'b'], puntaje: 2, origen: 'manual',
        },
        {
          id: 'r-demo-4', tipo: 'abierta',
          enunciado: 'Explica con tus palabras qué es la impedancia acústica.',
          ayuda: 'En una o dos frases, con tus propias palabras.',
          opciones: [], correcta: null, puntaje: 2, origen: 'manual',
        },
        {
          id: 'r-demo-5', tipo: 'opcion_multiple',
          enunciado: 'Ve una imagen anecoica en el seno renal que no comunica con los cálices. ¿Qué hace primero?',
          opciones: [
            { clave: 'a', texto: 'La reporta como quiste parapiélico' },
            { clave: 'b', texto: 'Pone Doppler color para descartar un vaso hiliar' },
            { clave: 'c', texto: 'La ignora por ser un hallazgo normal' },
          ],
          correcta: 'b', puntaje: 1, dominio: 'interpretacion',
          retro: 'Ante un anecoico en el seno, primero Doppler color: si se llena de señal, son vasos hiliares. El quiste parapiélico se descarta después, por no comunicar y por su pared.',
          origen: 'manual',
        },
      ],
    },
  });

  // ── (4) TAREA → config referencia una RÚBRICA del catálogo (mig 0018) ────
  const rubricaCatalogo = first(
    await sql<{ id: string }[]>`
      insert into lxp.rubricas (nombre, tipo, descripcion, publicado, creado_por, criterios)
      values ('Rúbrica de entrega — Planos básicos', 'tareas'::lxp.rubrica_tipo,
              'Evalúa la identificación de planos y la calidad de imagen.', true, ${disenador},
              ${sql.json([
                { criterio: 'Plano correcto', descripcion: 'Identifica el plano solicitado', peso: 0.5 },
                { criterio: 'Calidad de imagen', descripcion: 'Ganancia y profundidad adecuadas', peso: 0.5 },
              ])})
      returning id`,
  );
  const lTarea = await crearLeccion({
    moduloId: m2.id, nombre: 'Tarea: identifica los planos', orden: 2, horas: 2, tipo: 'tarea',
    config: {
      rubricaId: rubricaCatalogo.id,
      lineamientos: '<p>Sube 3 imágenes en los planos <strong>longitudinal</strong>, <strong>transversal</strong> y <strong>oblicuo</strong>.</p>',
      valor: 10,
      entrega: 'archivo',
    },
  });
  // Actividad de respaldo (modelo viejo, aún vivo): entregas.actividad_id es NOT NULL,
  // así que la lección tarea del modelo nuevo mantiene una actividad de respaldo hasta
  // fase 3 (igual que el foro). La rúbrica canónica es la del catálogo (config.rubricaId).
  const actTarea = first(
    await sql<{ id: string }[]>`
      insert into lxp.actividades (leccion_id, tipo, titulo, instrucciones, rubrica_id, orden)
      values (${lTarea}, 'tarea'::lxp.actividad_tipo, 'Tarea: identifica los planos',
              'Sube 3 imágenes.', ${rubricaCatalogo.id}, 1)
      returning id`,
  );

  // ── (6) FORO → config (consigna/reglas/modalidad) + actividad de respaldo ─
  // El motor de mensajes (foro_mensajes) se ancla a una actividad foro de respaldo
  // (modelo viejo, aún vivo) Y a la lección (leccion_id · mig 0026).
  const lForo = await crearLeccion({
    moduloId: m2.id, nombre: 'Foro: tu primer caso', orden: 3, horas: 1, tipo: 'foro',
  });
  const actForo = first(
    await sql<{ id: string }[]>`
      insert into lxp.actividades (leccion_id, tipo, titulo, instrucciones, orden)
      values (${lForo}, 'foro'::lxp.actividad_tipo, '¿Qué los hace dudar entre grado II y III?',
              'Trae un caso propio donde hayas dudado entre grado II y III.', 1)
      returning id`,
  );
  // Rúbrica de participación del CATÁLOGO (como en la tarea · tipo 'tareas').
  const rubricaForo = first(
    await sql<{ id: string }[]>`
      insert into lxp.rubricas (nombre, tipo, descripcion, publicado, creado_por, criterios)
      values ('Rúbrica de participación — Foro clínico', 'tareas'::lxp.rubrica_tipo,
              'Evalúa la calidad del caso traído y de las respuestas a los compañeros.', true, ${disenador},
              ${sql.json([
                { criterio: 'Su caso está contado con datos', descripcion: 'Edad, motivo, qué midió y con qué grado se quedó. Sin datos del paciente.', puntos: 4 },
                { criterio: 'Argumenta la duda, no solo la reporta', descripcion: 'Dice qué lo hizo dudar y qué lo habría hecho cambiar de opinión.', puntos: 3 },
                { criterio: 'Responde a dos compañeros', descripcion: 'Con algo aprovechable: una medida, una ventana, una pregunta.', puntos: 3 },
              ])})
      returning id`,
  );
  // Ahora que existe la actividad de respaldo, se fija en la config del foro.
  await sql`
    update lxp.lecciones
    set config = ${sql.json({
      tema: '¿Qué los hace dudar entre grado II y III?',
      instrucciones:
        '<p>La gradación de la hidronefrosis es el punto donde más se separan dos médicos mirando el mismo estudio. No es falta de conocimiento: es que cada quien fija el umbral en un lugar distinto cuando la imagen queda entre dos grados.</p><p>Trae a este foro un caso propio donde hayas dudado entre grado II y III. Cuenta qué viste, con qué te quedaste y qué te habría hecho cambiar de opinión. Si puedes, sube la imagen o el loop —aunque sea el que te salió mal, que es el que más enseña.</p><p>Después lee a dos compañeros y respóndeles con algo que puedan usar: una medida que no consideraron, una ventana alterna, una pregunta que los haga volver a la imagen.</p>',
      reglas: ['Sin datos que identifiquen al paciente', 'Fundamenta tus hallazgos con lo que mediste'],
      modalidad: 'asincrono',
      aperturaEn: null,
      cierreEn: '2026-09-30T23:59',
      participacion: { califica: true, puntos: 10, minPosts: 1, minComentarios: 2 },
      rubricaId: rubricaForo.id,
      actividadId: actForo.id,
    })}
    where id = ${lForo}`;

  // ── (7) H5P → config con contentId placeholder ──────────────────────────
  await crearLeccion({
    moduloId: m2.id, nombre: 'Interactivo H5P: anatomía', orden: 4, horas: 1, tipo: 'h5p',
    config: { contentId: 'demo-h5p-0001', titulo: 'Interactivo H5P: anatomía' },
  });

  // ── (8) xAPI → config con ref del paquete placeholder ───────────────────
  await crearLeccion({
    moduloId: m2.id, nombre: 'Paquete xAPI: repaso', orden: 5, horas: 1, tipo: 'xapi',
    config: { paqueteRef: 'demo/paquetes/repaso-xapi.zip', tipo: 'xapi', titulo: 'Paquete xAPI: repaso' },
  });

  // ── Grupos LXP (síncrono/asíncrono) de la plantilla ────────────────────
  const grupoSync = first(
    await sql<{ id: string }[]>`
      insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, docente_id)
      values (${programa.id}, 'Demo 2026-A (síncrono)', ${'sincrono'}::lxp.modalidad, '2026-02-01', ${docente})
      returning id`,
  );
  await sql`
    insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, docente_id)
    values (${programa.id}, 'Demo 2026-B (asíncrono)', ${'asincrono'}::lxp.modalidad, '2026-03-01', ${docente})`;

  // ── Foro: a2/a3/docente ya publicaron; a1 NO (para ver el muro velado → publicar
  //    lo desbloquea · gate por RLS 0030). Posts raíz con título + cuerpo rico, hilo
  //    de 2 niveles y reacciones. Todo anclado a (actForo, lForo, grupoSync).
  const postRaiz = async (autor: string, titulo: string, cuerpo: string) =>
    first(
      await sql<{ id: string }[]>`
        insert into lxp.foro_mensajes (actividad_id, leccion_id, grupo_id, autor_id, titulo, cuerpo, created_at)
        values (${actForo.id}, ${lForo}, ${grupoSync.id}, ${autor}, ${titulo}, ${cuerpo}, now() - interval '1 day')
        returning id`,
    ).id;
  const comentar = async (autor: string, parent: string, cuerpo: string) =>
    first(
      await sql<{ id: string }[]>`
        insert into lxp.foro_mensajes (actividad_id, leccion_id, grupo_id, autor_id, parent_id, cuerpo, created_at)
        values (${actForo.id}, ${lForo}, ${grupoSync.id}, ${autor}, ${parent}, ${cuerpo}, now() - interval '6 hours')
        returning id`,
    ).id;
  const reaccion = (mensaje: string, autor: string) =>
    sql`insert into lxp.foro_reacciones (mensaje_id, autor_id) values (${mensaje}, ${autor}) on conflict do nothing`;

  const pDoc = await postRaiz(
    docente,
    'Antes de discutir grados: midan la cortical en dos polos',
    '<p>Leí los primeros casos y en varios la cortical viene de una sola medida. Ese es el origen de casi todas las dudas entre II y III que están describiendo.</p><p>Cuando el polo inferior no se deja, uso una ventana intercostal posterior con el paciente en decúbito lateral. Midan los dos polos y verán que la diferencia no se sostiene.</p>',
  );
  const pA2 = await postRaiz(
    alumnos.a2,
    'Dudé por el jet ureteral, no por la cortical',
    '<p>Mi caso es distinto al de la mayoría: la cortical estaba clara en 8.4 mm, pero el jet del lado derecho no apareció en 20 minutos de observación.</p><p>¿Eso mueve el grado, o solo la sospecha de obstrucción? Me quedé en II pero con una nota de alerta.</p>',
  );
  const pA3 = await postRaiz(
    alumnos.a3,
    'Reporté III y el ultrasonido de control salió normal',
    '<p>Hombre de 52, cólico derecho de seis horas, llega de madrugada. Cálices redondeados, cortical de 8.2 mm en el polo medio. Reporté grado III y lo mandé con urología.</p><p><img src="/libros-stack-v2.png" alt="estudio del caso"></p><p>Control a los cuatro días: riñón normal. El paciente había expulsado un lito de 3 mm esa noche. ¿La gradación describe el momento o debería anticipar la evolución?</p>',
  );

  // Hilo de pA3 (2 niveles): docente (raíz) → a2 y docente (hijos); a3 (raíz).
  const cDoc = await comentar(
    docente,
    pA3,
    '<p>Su reporte estuvo bien puesto: el grado describe lo que hay en la pantalla en ese momento, no un pronóstico. Lo que sí cambiaría es la medida: 8.2 mm en agudo suele ser edema, no adelgazamiento real.</p>',
  );
  await comentar(alumnos.a2, cDoc, '<p>¿Entonces en agudo la cortical no sirve para cerrar el grado? Me pasó algo parecido con una paciente de 46.</p>');
  await comentar(docente, cDoc, '<p>Sirve, pero con reserva en las primeras horas. Apóyese en los cálices y el jet; la cortical la valora bien en el control.</p>');
  await comentar(alumnos.a3, pA3, '<p>Lo del lito de 3 mm explica la descompresión. Gracias, subo el loop del control con Doppler.</p>');
  // Hilo de pDoc (1 comentario). pA2 queda SIN respuestas (tarjeta ámbar).
  await comentar(alumnos.a2, pDoc, '<p>Probé la ventana intercostal posterior y por fin vi el polo inferior. Cambió mi lectura de III a II.</p>');

  // Reacciones "me es útil".
  await reaccion(pA3, alumnos.a2);
  await reaccion(pA3, docente);
  await reaccion(pDoc, alumnos.a3);
  await reaccion(cDoc, alumnos.a2);
  await reaccion(cDoc, alumnos.a3);

  // ── Entrega de a1 a la TAREA: anclada por leccion_id (modelo nuevo · 0026) Y
  //    por actividad_id (respaldo, NOT NULL hasta fase 3). ─────────────────
  await sql`
    insert into lxp.entregas (actividad_id, leccion_id, grupo_id, id_alumno, contenido, estado)
    values (${actTarea.id}, ${lTarea}, ${grupoSync.id}, ${alumnos.a1},
            ${sql.json({ nota_alumno: 'Adjunto 3 planos.' })}, ${'enviada'}::lxp.entrega_estado)`;

  // ── Dos intentos de a1 a la AUTOEVALUACIÓN → la portada muestra la variante
  //    "acreditada" con datos reales: 1er intento FALLIDO (60%) y 2º APROBADO con un
  //    fallo (80%, falló la del anecoico r-demo-5). El resumen alimenta `ultimoIntento`
  //    (aprobado, %, correctas, duración, intentos), y `resultados[]` alimenta
  //    `intentoPrevio` (revisión + "qué falló"). Ancladas a una actividad de respaldo
  //    (entregas.actividad_id NOT NULL), como tarea/foro.
  const actAutoeval = first(
    await sql<{ id: string }[]>`
      insert into lxp.actividades (leccion_id, tipo, titulo, instrucciones, orden)
      values (${lAutoeval}, 'autoevaluacion'::lxp.actividad_tipo, 'Autoevaluación: fundamentos',
              'Punto de control de fundamentos.', 1)
      returning id`,
  );
  // UNA entrega por (actividad, alumno) — el api hace upsert (constraint único), así
  // que el nº de intento vive en el resumen (`intentos`), no en filas separadas. Este
  // es el 2º intento, APROBADO con un fallo (r-demo-5) → portada acreditada.
  await sql`
    insert into lxp.entregas (actividad_id, leccion_id, grupo_id, id_alumno, contenido, nota, estado, created_at)
    values (${actAutoeval.id}, ${lAutoeval}, ${grupoSync.id}, ${alumnos.a1},
            ${sql.json({
              resumen: {
                aprobado: true,
                escalado: 0.8,
                correctas: 3,
                objetivas: 4,
                abiertas: 1,
                puntajeMax: 5,
                puntajeObtenido: 4,
                duracionSeg: 440, // 7:20 de reloj
                intentos: 2, // fue su segundo intento
              },
              respuestas: {
                'r-demo-1': 'b',
                'r-demo-2': 'v',
                'r-demo-3': ['a', 'b'],
                'r-demo-4':
                  'Es el producto de la densidad del medio por la velocidad del sonido; el salto de impedancia entre dos medios genera la reflexión.',
                'r-demo-5': 'a',
              },
              resultados: [
                { reactivoId: 'r-demo-1', tipo: 'opcion_multiple', veredicto: 'correcto', puntaje: 1, obtenido: 1, correcta: 'b', retro: 'La reflexión depende del salto de impedancia (Z).' },
                { reactivoId: 'r-demo-2', tipo: 'verdadero_falso', veredicto: 'correcto', puntaje: 1, obtenido: 1, correcta: 'v' },
                { reactivoId: 'r-demo-3', tipo: 'multi', veredicto: 'correcto', puntaje: 2, obtenido: 2, correcta: ['a', 'b'] },
                { reactivoId: 'r-demo-4', tipo: 'abierta', veredicto: 'pendiente', puntaje: 0, obtenido: 0, correcta: null },
                { reactivoId: 'r-demo-5', tipo: 'opcion_multiple', veredicto: 'incorrecto', puntaje: 1, obtenido: 0, correcta: 'b', retro: 'Ante un anecoico en el seno, primero Doppler color: si se llena de señal, son vasos hiliares. El quiste parapiélico se descarta después.' },
              ],
            })}, 8.0, ${'enviada'}::lxp.entrega_estado, now())`;

  // ── Inscripción de a1: señal de progreso que dispara la heurística
  //    `programasConActividad` (cursos-datos.ts) → el demo aparece en /cursos.
  //    reproduccion_progreso.contenido_id es NOT NULL FK a lxp.contenidos (modelo
  //    viejo, aún vivo), así que se crea un contenido "puente" en la lección video
  //    del demo y se ancla el progreso a ÉL y a la LECCIÓN (leccion_id · mig 0026).
  //    (La bitácora de a1 —abajo— también lo inscribe vía modulo_id; esto refuerza
  //    la rama de reproducción, que es la que valida el re-cableo de players.)
  const contPuente = first(
    await sql<{ id: string }[]>`
      insert into lxp.contenidos (leccion_id, tipo, titulo, recurso_ref, orden)
      values (${lTeoria}, ${'video'}::lxp.contenido_tipo, 'Puente de progreso (demo)',
              'demo/videos/artefactos-modo-b.mp4', 99)
      returning id`,
  );
  await sql`
    insert into lxp.reproduccion_progreso (alumno_id, contenido_id, leccion_id, porcentaje, completado)
    values (${alumnos.a1}, ${contPuente.id}, ${lTeoria}, 100, true)`;

  // ── Bitácora: casos en varios estados (para probar RLS de aislamiento) ──
  const casoAprobado = first(
    await sql<{ id: string }[]>`
      insert into lxp.bitacora_casos
        (id_alumno, modulo_id, organo, dominio_iaim, hallazgos, diagnostico_presuntivo,
         horas_estimadas, estado_validacion, origen, anonimizado_en)
      values (${alumnos.a1}, ${m2.id}, 'Abdomen', ${'adquisicion'}::lxp.dominio_iaim,
         'Líquido libre en Morrison', 'Hemoperitoneo', 1.5, ${'aprobado'}::lxp.estado_validacion,
         ${'alumno'}::lxp.origen_caso, now())
      returning id`,
  );
  await sql`
    insert into lxp.bitacora_casos
      (id_alumno, modulo_id, organo, dominio_iaim, hallazgos, horas_estimadas, estado_validacion, origen, anonimizado_en)
    values (${alumnos.a1}, ${m1.id}, 'Tórax', ${'interpretacion'}::lxp.dominio_iaim,
       'Líneas B difusas', 1.0, ${'pendiente'}::lxp.estado_validacion, ${'alumno'}::lxp.origen_caso, now())`;
  await sql`
    insert into lxp.bitacora_casos
      (id_alumno, modulo_id, organo, dominio_iaim, hallazgos, horas_estimadas, estado_validacion, origen, anonimizado_en)
    values (${alumnos.a2}, ${m1.id}, 'Riñón', ${'indicacion'}::lxp.dominio_iaim,
       'Hidronefrosis leve', 1.0, ${'pendiente'}::lxp.estado_validacion, ${'alumno'}::lxp.origen_caso, now())`;
  // Caso del alumno suspendido: ni siquiera él debe verlo (acceso_activo=false).
  await sql`
    insert into lxp.bitacora_casos
      (id_alumno, modulo_id, organo, dominio_iaim, hallazgos, horas_estimadas, estado_validacion, origen, anonimizado_en)
    values (${alumnos.a4}, ${m1.id}, 'Vejiga', ${'adquisicion'}::lxp.dominio_iaim,
       'Globo vesical', 1.0, ${'pendiente'}::lxp.estado_validacion, ${'alumno'}::lxp.origen_caso, now())`;

  // Validación del docente sobre el caso aprobado de a1.
  await sql`
    insert into lxp.validaciones (caso_id, id_docente, decision, feedback)
    values (${casoAprobado.id}, ${docente}, ${'aprobado'}::lxp.decision_validacion, 'Buen reconocimiento del espacio de Morrison.')`;

  // (La entrega de a1 a la tarea ya se sembró arriba, anclada por leccion_id · mig 0026.)

  // ── Ateneo (uno aprobado, uno pendiente) ───────────────────────────────
  await sql`
    insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, estado, visibilidad)
    values (${docente}, ${'anuncio_comunidad'}::lxp.post_ateneo_tipo,
      'Bienvenidos al Ateneo', 'Comparte tus casos.', ${'aprobado'}::lxp.estado_validacion, 'inscritos')`;
  await sql`
    insert into lxp.posts_ateneo (autor_id, tipo, titulo, vineta, estado, visibilidad)
    values (${alumnos.a1}, ${'caso'}::lxp.post_ateneo_tipo,
      'Caso FAST positivo', 'Paciente con trauma abdominal.', ${'pendiente'}::lxp.estado_validacion, 'inscritos')`;

  // ── Biblioteca: caso con VERDAD ESTRUCTURADA (habilita a Eco · §7A) ─────
  await sql`
    insert into lxp.casos_biblioteca
      (curador_id, titulo, organo, dominio_iaim, hallazgos_clave, diagnostico_correcto,
       puntos_aprendizaje, errores_comunes, publicado)
    values (${docente}, 'FAST positivo — Morrison', 'Abdomen', ${'interpretacion'}::lxp.dominio_iaim,
      ${sql.json(['Líquido anecoico en receso hepatorrenal', 'Ausencia de peristalsis'])},
      'Hemoperitoneo (FAST positivo)',
      ${sql.json(['Barrer todo el receso', 'Optimizar ganancia'])},
      ${sql.json(['Confundir grasa perirrenal con líquido'])},
      true)`;

  // ── Competencia I-AIM de a1 (normalmente la escribe el worker; aquí mock para
  //    poblar "Mi dominio" y el pulso del Home). 4 dominios; Adquisición en caída. ─
  await sql`
    insert into lxp.competencia_dominios
      (id_alumno, dominio_iaim, horas, nivel, decaimiento, proximo_repaso)
    values
      (${alumnos.a1}, ${'indicacion'}::lxp.dominio_iaim,     60, 82, 4,  null),
      (${alumnos.a1}, ${'adquisicion'}::lxp.dominio_iaim,    70, 54, 20, (now() + interval '2 days')::date),
      (${alumnos.a1}, ${'interpretacion'}::lxp.dominio_iaim, 80, 74, 3,  null),
      (${alumnos.a1}, ${'decision_medica'}::lxp.dominio_iaim, 38, 63, 0, null)`;

  // Hito de horas ya alcanzado por a1 (248 h totales → cruzó 100 h).
  await sql`
    insert into lxp.hitos (id_alumno, tipo, horas_umbral)
    values (${alumnos.a1}, 'horas_100', 100)
    on conflict (id_alumno, tipo) do nothing`;

  // ── Anuncio vigente (hero inteligente del Home) ──
  await sql`
    insert into lxp.anuncios (autor_id, titulo, cuerpo, canales, vigente_desde, vigente_hasta)
    values (${admin},
      'Ya está abierto el módulo de Doppler renal',
      'Son 88 horas acreditables y cuatro cine-loops nuevos grabados en la sede. La primera sesión en vivo es el jueves a las 19:00.',
      array['in_app'], now(), now() + interval '20 days')`;

  // ── Badge de catálogo ──────────────────────────────────────────────────
  await sql`
    insert into lxp.badges (clave, nombre, descripcion, regla)
    values ('primer_caso', 'Primer caso', 'Subió su primer caso a la bitácora',
      ${sql.json({ tipo: 'casos', umbral: 1 })})`;

  console.log('✓ Seed mock cargado.');
}

async function main(): Promise<void> {
  const soloLimpiar = process.argv.includes('--clean');
  const sql = createSql({ max: 1 });
  try {
    if (soloLimpiar) {
      await clean(sql);
      console.log('✓ Seed limpiado (BD sin datos mock).');
    } else {
      await seed(sql);
    }
  } finally {
    await sql.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✗ seed falló:', err);
    process.exit(1);
  });
