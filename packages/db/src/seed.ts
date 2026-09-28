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
import { PLANTILLAS_REALES } from './plantillas-reales';

const SEED_EMAIL_DOMINIO = '@seed.local';

type AlumnoKey = 'a1' | 'a2' | 'a3' | 'a4' | 'a5';

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
      lxp.bloques, lxp.recursos, lxp.reproduccion_progreso,
      lxp.clases, lxp.videoteca,
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

  // ── Alumnos (5) — repartidos en DOS cohortes para ver el aislamiento por grupo:
  //    a1/a2/a3/a4 → Generación 2026-A (donde vive la demo del foro velado);
  //    a5 → Generación 2026-B (activo, sin posts → su foro sale vacío, no ve el de A).
  //    a4 con pago vencido = suspendido. `coraGrupo` decide su inscripción CORA. ──────
  const alumnosSpec: {
    key: AlumnoKey;
    nombre: string;
    vencido: boolean;
    coraGrupo: 'A' | 'B';
  }[] = [
    { key: 'a1', nombre: 'Alumno Uno', vencido: false, coraGrupo: 'A' },
    { key: 'a2', nombre: 'Alumno Dos', vencido: false, coraGrupo: 'A' },
    { key: 'a3', nombre: 'Alumno Tres', vencido: false, coraGrupo: 'A' },
    { key: 'a4', nombre: 'Alumno Cuatro (suspendido)', vencido: true, coraGrupo: 'A' },
    { key: 'a5', nombre: 'Alumno Cinco (grupo B)', vencido: false, coraGrupo: 'B' },
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
  // DOS grupos CORA: la inscripción alumno↔grupo vive aquí (el seed SIMULA a CORA · §10;
  // en producción el LXP nunca escribe en public). El vínculo a lxp.grupos se hace más
  // abajo con `cora_grupo_id` (mig 0036).
  const gCoraA = first(
    await sql<{ id: string }[]>`
      insert into public.grupos (nombre, ciclo) values ('Generación 2026-A', '2026') returning id`,
  );
  const gCoraB = first(
    await sql<{ id: string }[]>`
      insert into public.grupos (nombre, ciclo) values ('Generación 2026-B', '2026') returning id`,
  );
  const coraGrupoId = { A: gCoraA.id, B: gCoraB.id } as const;
  for (const a of alumnosSpec) {
    const authId = alumnos[a.key];
    await sql`
      insert into public.estudiantes (supabase_auth_id, matricula, nombre)
      values (${authId}, ${'MAT-' + a.key.toUpperCase()}, ${a.nombre})`;
    await sql`
      insert into public.inscripciones (supabase_auth_id, grupo_id)
      values (${authId}, ${coraGrupoId[a.coraGrupo]})`;
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
      insert into lxp.programas (nombre, descripcion, publicado, estado, version, imagen_url)
      values ('Ultrasonografía Básica — Demo',
              'Curso demo del constructor nuevo: una lección de cada tipo.',
              true, 'publicado'::lxp.estado_publicacion, 1, '/libros-stack-v2.png')
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

  // ── BIBLIOTECA DE CONTENIDO (mig 0041) — acervo reutilizable ────────────
  // Recursos que se suben UNA vez y las lecciones REFERENCIAN. Uno de cada tipo para
  // probar las pestañas del Studio; `created_by` = diseñador (autoría · §5B). Dos de
  // ellos se referencian desde bloques de la lección de teoría de arriba → "dónde se
  // usa" > 0; el resto queda "sin usar" (también un estado real que la vista muestra).
  const recVideo = first(
    await sql<{ id: string }[]>`
      insert into lxp.recursos (tipo, nombre, reproduccion, meta, etiquetas, created_by)
      values ('video', 'Barrido FAST — demostración', 'Cloudflare Stream',
              ${sql.json({ duracion: '8:24', resolucion: '1080p', peso: '112 MB' })},
              ${sql.array(['fast', 'abdomen'])}, ${disenador})
      returning id`,
  );
  const recImagen = first(
    await sql<{ id: string }[]>`
      insert into lxp.recursos (tipo, nombre, meta, etiquetas, created_by)
      values ('imagen', 'Esquema de planos abdominales',
              ${sql.json({ dimensiones: '1600×900', peso: '240 KB' })},
              ${sql.array(['anatomia'])}, ${disenador})
      returning id`,
  );
  const recPdf = first(
    await sql<{ id: string }[]>`
      insert into lxp.recursos (tipo, nombre, meta, etiquetas, created_by)
      values ('pdf', 'Guía rápida POCUS abdominal',
              ${sql.json({ paginas: 12, peso: '1.4 MB' })},
              ${sql.array(['pocus', 'referencia'])}, ${disenador})
      returning id`,
  );
  await sql`
    insert into lxp.recursos (tipo, nombre, reproduccion, meta, etiquetas, created_by) values
      ('h5p', 'Interactivo: identifica el artefacto', 'Reporta progreso',
       ${sql.json({ items: 6 })}, ${sql.array(['interactivo'])}, ${disenador}),
      ('scorm', 'Módulo SCORM: seguridad del paciente', 'Reporta progreso',
       ${sql.json({ version_scorm: '1.2', peso: '8.2 MB' })}, ${sql.array(['seguridad'])}, ${disenador}),
      ('xapi', 'xAPI: checklist de adquisición', 'Reporta progreso',
       ${sql.json({ fuente: 'Articulate', peso: '5.1 MB' })}, ${sql.array(['adquisicion'])}, ${disenador})`;

  // Referencias reales desde la lección de teoría (recursoId en config del bloque):
  await sql`
    insert into lxp.bloques (leccion_id, orden, tipo_bloque, config) values
      (${lTeoria}, 5, 'video', ${sql.json({
        titulo: 'Barrido FAST — demostración', src: '', poster: '', hitos: [], recursoId: recVideo.id,
      })}),
      (${lTeoria}, 6, 'pdf', ${sql.json({
        titulo: 'Guía rápida POCUS abdominal', src: '', recursoId: recPdf.id,
      })})`;
  void recImagen; // sembrado como recurso "sin usar" (estado válido de la biblioteca)

  // ── (2) VIDEO → config (ref + transcripción + highlights) ───────────────
  const lVideo = await crearLeccion({
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
  // Cada grupo LXP INSTANCIA el programa y se enlaza a su grupo CORA vía `cora_grupo_id`
  // (mig 0036 · vínculo por valor, solo lectura · §10). Demo A ↔ CORA A, Demo B ↔ CORA B:
  // así la membresía real (cora_grupos_de) resuelve la cohorte correcta.
  const grupoSync = first(
    await sql<{ id: string }[]>`
      insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, docente_id, cora_grupo_id)
      values (${programa.id}, 'Demo 2026-A (síncrono)', ${'sincrono'}::lxp.modalidad, '2026-02-01', ${docente}, ${gCoraA.id})
      returning id`,
  );
  const grupoAsync = first(
    await sql<{ id: string }[]>`
      insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, docente_id, cora_grupo_id)
      values (${programa.id}, 'Demo 2026-B (asíncrono)', ${'asincrono'}::lxp.modalidad, '2026-03-01', ${docente}, ${gCoraB.id})
      returning id`,
  );

  // ── Clases en vivo (§9 · mig 0017) + grabaciones que alimentan la videoteca ──────
  // La agenda del docente y las grabaciones pasadas son datos REALES para /docente/clases.
  // Las grabaciones (lxp.videoteca origen 'zoom') son las MISMAS que ve el alumno en
  // «Mis clases grabadas». La asistencia va en `fuente_externa` (el reporte de Zoom aún
  // no se ingesta · §9); el `recurso_ref` es un stub (la reproducción firma URL en el api).
  const crearClaseSeed = async (p: {
    grupo: string;
    plataforma: 'zoom' | 'mico_plus';
    titulo: string;
    leccion?: string;
    inicio: string; // expresión SQL relativa a now()
    duracionMin: number;
    estado: 'agendada' | 'finalizada';
  }): Promise<string> =>
    first(
      await sql<{ id: string }[]>`
        insert into lxp.clases
          (grupo_id, leccion_id, docente_id, plataforma, titulo, inicio_programado,
           duracion_min, estado, reunion_externa_id, enlace_union, enlace_inicio)
        values (
          ${p.grupo}, ${p.leccion ?? null}, ${docente},
          ${p.plataforma}::lxp.clase_plataforma, ${p.titulo}, ${sql.unsafe(p.inicio)},
          ${p.duracionMin}, ${p.estado}::lxp.clase_estado,
          ${p.plataforma === 'zoom' ? 'seed-' + p.titulo.slice(0, 8) : null},
          ${p.plataforma === 'mico_plus' ? 'https://mico.mindray.com/s/seed-sesion' : 'https://zoom.us/j/seed-union'},
          ${p.plataforma === 'zoom' ? 'https://zoom.us/s/seed-host-start' : null}
        )
        returning id`,
    ).id;

  const crearGrabacionSeed = async (p: {
    clase: string;
    grupo: string;
    leccion?: string; // ligada si viene
    titulo: string;
    duracionSeg: number;
    asistieron: number;
    total: number;
    haceDias: number;
  }): Promise<void> => {
    await sql`
      insert into lxp.videoteca
        (titulo, origen, estado, recurso_ref, duracion_seg, grupo_id, leccion_id,
         clase_id, fuente_externa, created_by, created_at)
      values (
        ${'Grabación · ' + p.titulo}, 'zoom', 'listo',
        ${'grabaciones/seed-' + p.clase + '.mp4'}, ${p.duracionSeg},
        ${p.grupo}, ${p.leccion ?? null}, ${p.clase},
        ${sql.json({ asistieron: p.asistieron, total: p.total })},
        ${docente}, ${sql.unsafe(`now() - interval '${p.haceDias} days'`)}
      )`;
  };

  // Próximas (agendada): una es HOY (contador + "Iniciar"), el resto en días siguientes.
  await crearClaseSeed({ grupo: grupoSync.id, plataforma: 'zoom', titulo: 'Hidronefrosis: casos difíciles del módulo 4', leccion: lVideo, inicio: `now() + interval '3 hours'`, duracionMin: 90, estado: 'agendada' });
  await crearClaseSeed({ grupo: grupoSync.id, plataforma: 'zoom', titulo: 'Doppler renal: cuándo sí aporta', leccion: lTeoria, inicio: `now() + interval '2 days'`, duracionMin: 90, estado: 'agendada' });
  await crearClaseSeed({ grupo: grupoAsync.id, plataforma: 'mico_plus', titulo: 'Barrido renal en vivo con el equipo', leccion: lAutoeval, inicio: `now() + interval '3 days'`, duracionMin: 60, estado: 'agendada' });
  await crearClaseSeed({ grupo: grupoSync.id, plataforma: 'zoom', titulo: 'Informe estructurado: cómo dictarlo', leccion: lTarea, inicio: `now() + interval '5 days'`, duracionMin: 75, estado: 'agendada' });
  await crearClaseSeed({ grupo: grupoAsync.id, plataforma: 'mico_plus', titulo: 'Doppler color paso a paso (manos a la sonda)', inicio: `now() + interval '6 days'`, duracionMin: 90, estado: 'agendada' });

  // Pasadas (finalizada) + su grabación. Algunas ligadas a lección (caen en la videoteca
  // del grupo), otra SIN ligar (para el CTA "Ligar a una lección").
  const clPasada1 = await crearClaseSeed({ grupo: grupoSync.id, plataforma: 'zoom', titulo: 'Gradación de hidronefrosis I a IV', leccion: lVideo, inicio: `now() - interval '13 days'`, duracionMin: 90, estado: 'finalizada' });
  await crearGrabacionSeed({ clase: clPasada1, grupo: grupoSync.id, leccion: lVideo, titulo: 'Gradación de hidronefrosis I a IV', duracionSeg: 5050, asistieron: 26, total: 28, haceDias: 13 });
  const clPasada2 = await crearClaseSeed({ grupo: grupoAsync.id, plataforma: 'mico_plus', titulo: 'Barrido hepático con el equipo', leccion: lTeoria, inicio: `now() - interval '15 days'`, duracionMin: 60, estado: 'finalizada' });
  await crearGrabacionSeed({ clase: clPasada2, grupo: grupoAsync.id, leccion: lTeoria, titulo: 'Barrido hepático con el equipo', duracionSeg: 3512, asistieron: 21, total: 24, haceDias: 15 });
  const clPasada3 = await crearClaseSeed({ grupo: grupoSync.id, plataforma: 'zoom', titulo: 'Vía biliar: signos que no se pierden', leccion: lTarea, inicio: `now() - interval '20 days'`, duracionMin: 75, estado: 'finalizada' });
  await crearGrabacionSeed({ clase: clPasada3, grupo: grupoSync.id, leccion: lTarea, titulo: 'Vía biliar: signos que no se pierden', duracionSeg: 4365, asistieron: 24, total: 28, haceDias: 20 });
  const clPasada4 = await crearClaseSeed({ grupo: grupoSync.id, plataforma: 'zoom', titulo: 'Introducción al Doppler color', inicio: `now() - interval '22 days'`, duracionMin: 90, estado: 'finalizada' });
  await crearGrabacionSeed({ clase: clPasada4, grupo: grupoSync.id, titulo: 'Introducción al Doppler color', duracionSeg: 5462, asistieron: 19, total: 24, haceDias: 22 });

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
  await postRaiz(
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

  // ── Progreso demo: a1 completa una lección (contenido "puente" · modelo viejo aún
  //    vivo: reproduccion_progreso.contenido_id es NOT NULL FK a lxp.contenidos) y a2
  //    completa una lección ANCLADA A LA LECCIÓN (modelo nuevo · mig 0028, contenido_id
  //    NULL). Así el roster del Studio (getGrupoAlumnos) muestra avance real y variado
  //    en la cohorte A. La inscripción del alumno ya la resuelve el grupo (mig 0036).
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
  // a2: lección completada leccion-keyed (sin contenido) → avance ≠ 0 distinto al de a1.
  await sql`
    insert into lxp.reproduccion_progreso (alumno_id, leccion_id, porcentaje, completado)
    values (${alumnos.a2}, ${lVideo}, 100, true)`;

  // ── Bitácora: casos en varios estados (para probar RLS de aislamiento) ──
  const casoAprobado = first(
    await sql<{ id: string }[]>`
      insert into lxp.bitacora_casos
        (id_alumno, grupo_id, modulo_id, organo, dominio_iaim, hallazgos, diagnostico_presuntivo,
         horas_estimadas, estado_validacion, origen, anonimizado_en)
      values (${alumnos.a1}, ${grupoSync.id}, ${m2.id}, 'Abdomen', ${'adquisicion'}::lxp.dominio_iaim,
         'Líquido libre en Morrison', 'Hemoperitoneo', 1.5, ${'aprobado'}::lxp.estado_validacion,
         ${'alumno'}::lxp.origen_caso, now())
      returning id`,
  );
  // `created_at` backdateado para variar la espera de la bandeja (y mostrar el urgente >72 h).
  await sql`
    insert into lxp.bitacora_casos
      (id_alumno, grupo_id, modulo_id, organo, dominio_iaim, hallazgos, horas_estimadas, estado_validacion, origen, anonimizado_en, created_at)
    values (${alumnos.a1}, ${grupoSync.id}, ${m1.id}, 'Tórax', ${'interpretacion'}::lxp.dominio_iaim,
       'Líneas B difusas', 1.0, ${'pendiente'}::lxp.estado_validacion, ${'alumno'}::lxp.origen_caso, now(), now() - interval '4 hours')`;
  await sql`
    insert into lxp.bitacora_casos
      (id_alumno, grupo_id, modulo_id, organo, dominio_iaim, hallazgos, horas_estimadas, estado_validacion, origen, anonimizado_en, created_at)
    values (${alumnos.a2}, ${grupoSync.id}, ${m1.id}, 'Riñón', ${'indicacion'}::lxp.dominio_iaim,
       'Hidronefrosis leve', 1.0, ${'pendiente'}::lxp.estado_validacion, ${'alumno'}::lxp.origen_caso, now(), now() - interval '3 days')`;
  // Caso pendiente en la cohorte B (a5) → la bandeja muestra dos grupos y el filtro "Grupo ▾".
  await sql`
    insert into lxp.bitacora_casos
      (id_alumno, grupo_id, modulo_id, organo, dominio_iaim, hallazgos, horas_estimadas, estado_validacion, origen, anonimizado_en, created_at)
    values (${alumnos.a5}, ${grupoAsync.id}, ${m2.id}, 'Vesícula', ${'interpretacion'}::lxp.dominio_iaim,
       'Pared engrosada, Murphy ecográfico', 1.0, ${'pendiente'}::lxp.estado_validacion, ${'alumno'}::lxp.origen_caso, now(), now() - interval '6 hours')`;

  // Caso OBSTÉTRICO con VERDAD ESTRUCTURADA (§7A · Opción B): como si viniera de un reporte
  // con tabla de biometría. Sirve para demostrar el puente bitácora→banco y el render
  // coincidible (la tabla se muestra como TABLA, no aplanada). El texto `hallazgos` es el
  // índice derivado; `contenido_estructurado` es la fuente de verdad.
  const contenidoObstetrico = {
    secciones: [
      {
        id: 'biometria',
        tipo: 'hallazgos',
        titulo: 'Biometría fetal',
        columnas: 1,
        campos: [
          {
            id: 'tab_bio',
            tipo: 'tabla',
            nombre: 'Mediciones',
            columnas: ['Medida (mm)', 'Percentil'],
            filas: ['DBP', 'CC', 'CA', 'LF'],
          },
          { id: 'peso', tipo: 'medida', nombre: 'Peso fetal estimado', unidad: 'g' },
          { id: 'previa', tipo: 'sino', nombre: 'Placenta previa' },
        ],
      },
      {
        id: 'anexos',
        tipo: 'hallazgos',
        titulo: 'Líquido y presentación',
        columnas: 2,
        campos: [
          { id: 'ila', tipo: 'medida', nombre: 'Índice de líquido amniótico', unidad: 'cm' },
          { id: 'fcf', tipo: 'medida', nombre: 'Frecuencia cardiaca fetal', unidad: 'lpm' },
          { id: 'presentacion', tipo: 'opcion', nombre: 'Presentación', opciones: ['Cefálica', 'Pélvica', 'Transversa'] },
        ],
      },
    ],
    valores: {
      tab_bio: [['82', '55'], ['295', '60'], ['320', '58'], ['64', '52']],
      peso: '2450',
      previa: false,
      ila: '12.5',
      fcf: '148',
      presentacion: 'Cefálica',
    },
    impresion:
      'Embarazo único, viable, de 31.4 semanas por biometría. Crecimiento y líquido amniótico dentro de percentiles normales.',
    fuente: { tipo: 'reporte', plantillaNombre: 'Obstétrico · segundo trimestre', tipoEstudio: 'Obstétrico' },
  };
  await sql`
    insert into lxp.bitacora_casos
      (id_alumno, grupo_id, modulo_id, organo, dominio_iaim, hallazgos, contenido_estructurado,
       horas_estimadas, estado_validacion, origen, anonimizado_en)
    values (${alumnos.a1}, ${grupoSync.id}, ${m1.id}, 'Obstétrico', ${'interpretacion'}::lxp.dominio_iaim,
       'Biometría fetal acorde a 31.4 semanas; ILA normal.', ${sql.json(contenidoObstetrico)},
       1.5, ${'pendiente'}::lxp.estado_validacion, ${'alumno'}::lxp.origen_caso, now())`;

  // Caso del alumno suspendido: ni siquiera él debe verlo (acceso_activo=false).
  await sql`
    insert into lxp.bitacora_casos
      (id_alumno, grupo_id, modulo_id, organo, dominio_iaim, hallazgos, horas_estimadas, estado_validacion, origen, anonimizado_en, created_at)
    values (${alumnos.a4}, ${grupoSync.id}, ${m1.id}, 'Vejiga', ${'adquisicion'}::lxp.dominio_iaim,
       'Globo vesical', 1.0, ${'pendiente'}::lxp.estado_validacion, ${'alumno'}::lxp.origen_caso, now(), now() - interval '26 hours')`;

  // Validación del docente sobre el caso aprobado de a1.
  await sql`
    insert into lxp.validaciones (caso_id, id_docente, decision, feedback)
    values (${casoAprobado.id}, ${docente}, ${'aprobado'}::lxp.decision_validacion, 'Buen reconocimiento del espacio de Morrison.')`;

  // Estudios ya resueltos (aprobado/devuelto) de a1 → llenan la rejilla "Estudios del alumno"
  // para ver el grid RESPONSIVO con varias columnas en pantallas anchas (no tocan la cola).
  const estudiosResueltos: {
    organo: string;
    dominio: 'indicacion' | 'adquisicion' | 'interpretacion' | 'decision_medica';
    hallazgos: string;
    estado: 'aprobado' | 'rechazado';
    dias: number;
    feedback: string;
  }[] = [
    { organo: 'Hígado', dominio: 'interpretacion', hallazgos: 'Esteatosis leve, ecoestructura homogénea', estado: 'aprobado', dias: 5, feedback: 'Buen barrido, mediciones correctas.' },
    { organo: 'Aorta', dominio: 'adquisicion', hallazgos: 'Diámetro 1.8 cm, sin aneurisma', estado: 'aprobado', dias: 8, feedback: 'Cortes adecuados en los tres niveles.' },
    { organo: 'Vía biliar', dominio: 'interpretacion', hallazgos: 'Colédoco 5 mm, sin dilatación', estado: 'aprobado', dias: 11, feedback: 'Bien documentado.' },
    { organo: 'Bazo', dominio: 'adquisicion', hallazgos: 'Esplenomegalia leve 13 cm', estado: 'rechazado', dias: 14, feedback: 'Falta medir el eje largo en el corte correcto; vuelve a subirlo.' },
  ];
  for (const e of estudiosResueltos) {
    const caso = first(
      await sql<{ id: string }[]>`
        insert into lxp.bitacora_casos
          (id_alumno, grupo_id, modulo_id, organo, dominio_iaim, hallazgos, horas_estimadas,
           estado_validacion, origen, anonimizado_en, created_at)
        values (${alumnos.a1}, ${grupoSync.id}, ${m1.id}, ${e.organo}, ${e.dominio}::lxp.dominio_iaim,
           ${e.hallazgos}, 1.0, ${e.estado}::lxp.estado_validacion, ${'alumno'}::lxp.origen_caso,
           now(), now() - (${e.dias} || ' days')::interval)
        returning id`,
    );
    await sql`
      insert into lxp.validaciones (caso_id, id_docente, decision, feedback)
      values (${caso.id}, ${docente}, ${e.estado}::lxp.decision_validacion, ${e.feedback})`;
  }

  // (La entrega de a1 a la tarea ya se sembró arriba, anclada por leccion_id · mig 0026.)

  // ── Ateneo (red social · §1): perfiles con especialidad/sede, posts de cada tipo,
  //    reacciones, encuesta con votos, hilo anidado y colegas (mig 0032). ──────────
  await sql`update lxp.perfiles set especialidad = 'Ultrasonografía', sede = 'Guadalajara' where user_id = ${alumnos.a1}`;
  // Bio + intereses + WhatsApp de a1 para poblar Mi perfil (/perfil · mig 0056).
  await sql`
    update lxp.perfiles
    set sobre_mi = ${'Médica general en formación POCUS. Me interesa el ultrasonido a pie de cama en urgencias y el seguimiento obstétrico. Practico en el Hospital Civil de Guadalajara.'},
        intereses = ${sql.array(['#pocus', '#obstetricia', '#urgencias', '#abdomen'])},
        whatsapp = ${'+52 33 1234 5678'}
    where user_id = ${alumnos.a1}`;
  await sql`update lxp.perfiles set especialidad = 'Urgencias', sede = 'Puebla' where user_id = ${alumnos.a2}`;
  await sql`update lxp.perfiles set especialidad = 'Medicina interna', sede = 'Monterrey' where user_id = ${alumnos.a3}`;
  await sql`update lxp.perfiles set especialidad = 'Renal y abdomen', sede = 'Docente' where user_id = ${docente}`;

  const postAteneo = async (
    autor: string,
    tipo: string,
    campos: { titulo: string; cuerpo?: string; temas?: string[]; media?: { tipo: string; url?: string }[]; casoOrigen?: string; cierraDias?: number },
    hace: string,
  ) =>
    first(
      await sql<{ id: string }[]>`
        insert into lxp.posts_ateneo
          (autor_id, tipo, titulo, cuerpo, temas, media, caso_origen_id, cierra_en, estado, visibilidad, created_at)
        values (${autor}, ${tipo}::lxp.post_ateneo_tipo, ${campos.titulo}, ${campos.cuerpo ?? null},
                ${sql.json(campos.temas ?? [])}, ${sql.json(campos.media ?? [])},
                ${campos.casoOrigen ?? null},
                ${campos.cierraDias ? sql`now() + (${campos.cierraDias} || ' days')::interval` : null},
                'aprobado'::lxp.estado_validacion, 'inscritos', now() - ${hace}::interval)
        returning id`,
    ).id;
  const reac = (post: string, usuario: string, tipo: string) =>
    sql`insert into lxp.reacciones_ateneo (post_id, usuario_id, tipo) values (${post}, ${usuario}, ${tipo}::lxp.reaccion_ateneo_tipo) on conflict do nothing`;
  const comAteneo = async (post: string, autor: string, cuerpo: string, parent?: string) =>
    first(
      await sql<{ id: string }[]>`
        insert into lxp.comentarios_ateneo (post_id, autor_id, cuerpo, parent_id)
        values (${post}, ${autor}, ${cuerpo}, ${parent ?? null}) returning id`,
    ).id;

  // CASO (a1 presenta su caso validado de la bitácora → abre el visor real).
  const pCaso = await postAteneo(alumnos.a1, 'caso',
    { titulo: '¿Asimetría cortical crónica o me está ganando el ángulo?',
      cuerpo: 'Mujer de 46, dolor lumbar derecho de 3 días, creatinina normal. Traigo el estudio completo de mi bitácora.',
      casoOrigen: casoAprobado.id }, '2 hours');
  const kDoc = await comAteneo(pCaso, docente, 'Mida la cortical en los dos polos y en el mismo plano. Si la diferencia se sostiene, es real; si no, es el ángulo.');
  await comAteneo(pCaso, alumnos.a2, 'Polo superior derecho: 9.4. Se sostiene.', kDoc);
  await comAteneo(pCaso, alumnos.a3, '¿Tiene el contralateral en el mismo plano? Sin eso no me animo a llamarlo crónico.');
  await reac(pCaso, alumnos.a2, 'util'); await reac(pCaso, alumnos.a3, 'ojo'); await reac(pCaso, docente, 'aclara');

  // PREGUNTA (a3).
  const pPreg = await postAteneo(alumnos.a3, 'pregunta',
    { titulo: '¿Alguien sigue midiendo el diámetro AP de la pelvis renal para graduar?',
      cuerpo: 'En la residencia lo usábamos para decidir. Aquí nadie lo menciona y quiero saber si quedó en desuso.',
      temas: ['#renal', '#gradación'] }, '3 hours');
  await reac(pPreg, alumnos.a1, 'duda'); await reac(pPreg, alumnos.a2, 'util');

  // ENCUESTA (a2) + opciones + votos.
  const pEnc = await postAteneo(alumnos.a2, 'encuesta',
    { titulo: 'En equipos portátiles, ¿qué preset usan de entrada para riñón?', cierraDias: 2 }, '4 hours');
  const o1 = first(await sql<{ id: string }[]>`insert into lxp.encuesta_opciones (post_id, orden, texto) values (${pEnc}, 0, 'Abdomen general, bajando ganancia') returning id`).id;
  const o2 = first(await sql<{ id: string }[]>`insert into lxp.encuesta_opciones (post_id, orden, texto) values (${pEnc}, 1, 'Preset renal del fabricante') returning id`).id;
  const o3 = first(await sql<{ id: string }[]>`insert into lxp.encuesta_opciones (post_id, orden, texto) values (${pEnc}, 2, 'Uno propio guardado') returning id`).id;
  await sql`insert into lxp.encuesta_votos (post_id, usuario_id, opcion_id) values (${pEnc}, ${alumnos.a1}, ${o1}), (${pEnc}, ${alumnos.a3}, ${o1}), (${pEnc}, ${docente}, ${o2})`;
  void o3;
  await reac(pEnc, alumnos.a1, 'util'); await reac(pEnc, alumnos.a3, 'aclara');

  // MEDIA (a3, imágenes placeholder que renderizan).
  const pMedia = await postAteneo(alumnos.a3, 'media',
    { titulo: 'Tres cortes de vesícula con el preset abdomen',
      cuerpo: 'Mi equipo portátil nuevo en la sede: tres cortes de vesícula con el preset abdomen, sin tocar nada.',
      media: [{ tipo: 'imagen', url: '/libros-stack-v2.png' }, { tipo: 'imagen', url: '/libros-stack-v2.png' }, { tipo: 'video' }] }, '1 day');
  await reac(pMedia, alumnos.a1, 'util'); await reac(pMedia, alumnos.a2, 'bien');

  // TEXTO (docente).
  const pTexto = await postAteneo(docente, 'texto',
    { titulo: 'Recordatorio del jet ureteral',
      cuerpo: 'Recordatorio para quien arranca el módulo 5: el jet ureteral se busca con Doppler color a baja escala. Si no lo ve en 5 minutos, no concluya ausencia — espere o pida al paciente que tome agua.' }, '5 hours');
  await reac(pTexto, alumnos.a1, 'util'); await reac(pTexto, alumnos.a2, 'aclara'); await reac(pTexto, alumnos.a3, 'bien');

  // COLEGAS: a1 ↔ a2 y a1 ↔ a3 (aceptadas); docente/a4 quedan como sugerencias.
  await sql`insert into lxp.conexiones_ateneo (solicitante_id, receptor_id, estado) values (${alumnos.a2}, ${alumnos.a1}, 'colegas'), (${alumnos.a1}, ${alumnos.a3}, 'colegas')`;

  // ── Consultas (chat 1:1 · §Sprint 5.5 · mig 0034): staff con especialidad + una
  //    conversación de cada tipo (docente con origen-lección, staff, colega). ────────
  await sql`update lxp.perfiles set nombre = 'Control escolar', especialidad = 'Constancias y horas' where user_id = ${admin}`;
  await sql`update lxp.perfiles set nombre = 'Soporte técnico', especialidad = 'Plataforma y visor' where user_id = ${superAdmin}`;

  const crearConsulta = async (
    contacto: string,
    tipo: 'docente' | 'staff' | 'colega',
    asunto: string,
    origenLeccion: string | null,
    leidoHace: string, // intervalo p.ej. '5 minutes' — alumno_leido_en = now() - X
  ) =>
    first(
      await sql<{ id: string }[]>`
        insert into lxp.consultas
          (id_alumno, contacto_id, tipo_contacto, id_docente, asunto, estado, origen_leccion_id, alumno_leido_en)
        values (${alumnos.a1}, ${contacto}, ${tipo}::lxp.consulta_tipo_contacto,
                ${tipo === 'docente' ? contacto : null}, ${asunto}, 'abierta', ${origenLeccion},
                now() - ${leidoHace}::interval)
        returning id`,
    ).id;
  const msgConsulta = (consulta: string, autor: string, cuerpo: string, hace: string) =>
    sql`insert into lxp.consulta_mensajes (consulta_id, autor_id, cuerpo, created_at)
        values (${consulta}, ${autor}, ${cuerpo}, now() - ${hace}::interval)`;

  // DOCENTE (con origen-lección) — la docente respondió después de que a1 leyó → 2 no leídos.
  const conDoc = await crearConsulta(docente, 'docente', 'Dónde medir la cortical', lTeoria, '20 hours');
  await msgConsulta(conDoc, alumnos.a1, 'Doctor, buenas tardes. En el caso del riñón derecho no me queda claro dónde medir la cortical. ¿Basta con el polo medio?', '20 hours');
  await msgConsulta(conDoc, docente, 'Buen día, doctora. Mídala en los dos polos y en el mismo plano; con una sola medida el ángulo puede engañarla. Si el polo inferior no se deja, cambie a un corte coronal por flanco.', '2 hours');
  await msgConsulta(conDoc, docente, 'Le dejo la lectura del módulo donde está explicado con imágenes.', '90 minutes');

  // STAFF (control escolar) — a1 ya lo leyó → 0 no leídos.
  const conStaff = await crearConsulta(admin, 'staff', 'Constancia de horas', null, '1 minute');
  await msgConsulta(conStaff, alumnos.a1, 'Buenas, ¿cómo va mi constancia de 500 horas?', '1 day');
  await msgConsulta(conStaff, admin, 'Su constancia de 500 h ya está en trámite; le llega por correo esta semana.', '9 hours');

  // COLEGA (a2) — sin ciclo de consulta (estado null derivado).
  const conCol = await crearConsulta(alumnos.a2, 'colega', 'Loop del jet', null, '30 minutes');
  await msgConsulta(conCol, alumnos.a2, 'Oye, vi tu caso en el Ateneo. ¿Cómo sacaste la ventana del polo inferior?', '18 hours');
  await msgConsulta(conCol, alumnos.a1, 'Coronal por flanco, bajando ganancia. Me lo sugirió Sandoval en una consulta.', '17 hours');
  await msgConsulta(conCol, alumnos.a2, 'Genial, gracias. ¿Me pasas el loop cuando puedas?', '20 minutes');

  // ── Bandeja del DOCENTE (§5B): consultas dirigidas a él, de ALUMNOS y STAFF, en
  //    varios estados. Alimenta la consola /docente/consultas (contraparte del chat
  //    del alumno). Estado 'sin-responder/respondida/cerrada' se DERIVA del último
  //    mensaje; a2 y a3 comparten el módulo de `lTeoria` → dispara el "patrón" de Eco. ──
  // El CONTACTO siempre es la docente (tipo_contacto='docente'); que la contraparte sea
  // alumno o staff lo decide el ROL del opener (op_rol) al leerse en la consola.
  const crearConsultaDoc = async (
    opener: string,
    asunto: string,
    estado: 'abierta' | 'cerrada',
    origenLeccion: string | null,
  ) =>
    first(
      await sql<{ id: string }[]>`
        insert into lxp.consultas
          (id_alumno, contacto_id, tipo_contacto, id_docente, asunto, estado, origen_leccion_id, alumno_leido_en)
        values (${opener}, ${docente}, 'docente'::lxp.consulta_tipo_contacto,
                ${docente}, ${asunto}, ${estado}, ${origenLeccion}, now())
        returning id`,
    ).id;
  const msgAdj = (
    consulta: string,
    autor: string,
    cuerpo: string,
    hace: string,
    adj: { id: string; tipo: string; nombre: string; meta: string }[],
  ) =>
    sql`insert into lxp.consulta_mensajes (consulta_id, autor_id, cuerpo, adjuntos, created_at)
        values (${consulta}, ${autor}, ${cuerpo}, ${sql.json(adj)}, now() - ${hace}::interval)`;

  // a2 — SIN RESPONDER (último del alumno) · mismo módulo que a1 · adjunta un loop.
  const conA2 = await crearConsultaDoc(alumnos.a2, '¿Por qué mi caso salió como quiste?', 'abierta', lTeoria);
  await msgConsulta(conA2, alumnos.a2, 'Doctor, ¿por qué mi caso del riñón derecho salió como quiste? Yo veía el cáliz dilatado.', '5 hours');
  await msgAdj(conA2, alumnos.a2, 'Le dejo el loop para que lo revise cuando pueda.', '5 hours', [
    { id: 'loop-a2', tipo: 'loop', nombre: 'loop_rinon_der.dcm', meta: '4 s · de su bitácora' },
  ]);

  // a3 — SIN RESPONDER · mismo módulo (refuerza el patrón de Eco).
  const conA3 = await crearConsultaDoc(alumnos.a3, 'Dónde medir la cortical', 'abierta', lTeoria);
  await msgConsulta(conA3, alumnos.a3, 'Doctor, ¿la cortical se mide en los dos polos o basta con el polo medio?', '3 hours');

  // a5 (grupo B) — RESPONDIDA (la docente contestó al final; el alumno ya lo leyó).
  const conA5 = await crearConsultaDoc(alumnos.a5, 'Informe estructurado de vía biliar', 'abierta', null);
  await msgConsulta(conA5, alumnos.a5, '¿El informe estructurado que vimos aplica igual para la vía biliar?', '2 days');
  await msgConsulta(conA5, docente, 'Sí: la estructura es la misma, solo cambian los hallazgos esperables. Lo vemos en la próxima clase.', '1 day');

  // a4 — CERRADA (resuelta).
  const conA4 = await crearConsultaDoc(alumnos.a4, 'Entrega de la tarea del módulo 7', 'cerrada', null);
  await msgConsulta(conA4, alumnos.a4, 'Doctora, ¿puedo entregar la tarea del módulo 7 el lunes? Estoy de guardia el fin de semana.', '3 days');
  await msgConsulta(conA4, docente, 'Claro, se la reabro hasta el lunes. Suba lo que tenga.', '2 days');
  await msgConsulta(conA4, alumnos.a4, 'Gracias, con eso me queda claro. Subo el caso el lunes sin falta.', '2 days');
  await sql`update lxp.consultas set cerrada_el = now() - interval '2 days' where id = ${conA4}`;

  // STAFF → DOCENTE: control escolar coordina con la docente (contraparte = staff).
  const conStaffDoc = await crearConsultaDoc(admin, 'Alumno con acceso en pausa', 'abierta', null);
  await msgConsulta(conStaffDoc, admin, 'Doctora, el alumno Cuatro quedó suspendido por pago. ¿Le extiendo la entrega cuando regularice?', '4 hours');

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

  // ── Anuncios (§6) — 3 ejemplos para poblar las tabs del gestor admin: publicado
  //    (hero vigente del Home), programado (aún no sale) y vencido (ya caducó).
  //    `alcance` guarda { tipo, prioridad } (lo que el gestor lee); comunidad/alumnos reales.
  await sql`
    insert into lxp.anuncios (autor_id, titulo, cuerpo, alcance, canales, vigente_desde, vigente_hasta)
    values (${admin},
      'Ya está abierto el módulo de Doppler renal',
      'Son 88 horas acreditables y cuatro cine-loops nuevos grabados en la sede. La primera sesión en vivo es el jueves a las 19:00.',
      ${sql.json({ tipo: 'comunidad', prioridad: 'importante' })},
      array['in_app', 'correo'], now(), now() + interval '20 days')`;
  await sql`
    insert into lxp.anuncios (autor_id, titulo, cuerpo, alcance, canales, vigente_desde, vigente_hasta)
    values (${admin},
      'Cierre de inscripciones de la generación de enero',
      'Las inscripciones de la próxima generación cierran a fin de mes. Recuerden completar su documentación.',
      ${sql.json({ tipo: 'alumnos', prioridad: 'normal' })},
      array['in_app'], now() + interval '5 days', now() + interval '30 days')`;
  await sql`
    insert into lxp.anuncios (autor_id, titulo, cuerpo, alcance, canales, vigente_desde, vigente_hasta)
    values (${admin},
      'Mantenimiento del campus del domingo pasado',
      'El campus estuvo en mantenimiento programado. Ya quedó todo restablecido; gracias por su paciencia.',
      ${sql.json({ tipo: 'comunidad', prioridad: 'normal' })},
      array['in_app'], now() - interval '30 days', now() - interval '5 days')`;

  // ── Badge de catálogo ──────────────────────────────────────────────────
  await sql`
    insert into lxp.badges (clave, nombre, descripcion, regla)
    values ('primer_caso', 'Primer caso', 'Subió su primer caso a la bitácora',
      ${sql.json({ tipo: 'casos', umbral: 1 })})`;

  // ═══════════════════════════════════════════════════════════════════════════
  // PANORAMA DEL ADMIN (Inicio · centro de control) — datos REALISTAS que el SQL lee.
  // Puebla las métricas de DOMINIO del dashboard (tendencia 6m/12m, avance, riesgo,
  // actividad de staff, decisiones y alertas) sin números inventados del mock.
  //
  //   • Casos históricos → grupo_id/modulo_id NULL + estado 'aprobado': NUNCA aparecen
  //     en la bandeja del docente (filtra 'pendiente') ni en vistas por grupo; solo
  //     cuentan en los agregados globales (es_staff ve todo · bitacora_select 0010).
  //   • No tocan a1..a5 (los tests de RLS cuentan sus casos exactos: a1=7, a2=1).
  // ═══════════════════════════════════════════════════════════════════════════

  // (1) Dos docentes más → la "Actividad del staff" muestra varios miembros (como el mock).
  const docSandoval = await altaCora(sql, { email: `sandoval${SEED_EMAIL_DOMINIO}`, nombre: 'Dr. Sandoval', coraRol: 'docente' });
  await crearPerfil(sql, docSandoval, { lxpRol: 'docente', acceso: true });
  const docLugo = await altaCora(sql, { email: `lugo${SEED_EMAIL_DOMINIO}`, nombre: 'Dra. Lugo', coraRol: 'docente' });
  await crearPerfil(sql, docLugo, { lxpRol: 'docente', acceso: true });

  // (2) Cohortes históricas: altas repartidas en 12 meses (curva de crecimiento) para
  //     que la tendencia (6m y 12m) rinda poblada. acceso_activo=true, SIN inscripción
  //     CORA (no entran a rosters). ~80% con un caso aprobado reciente (→ "al día"); el
  //     resto sin actividad reciente (→ "en riesgo", realista ~20%).
  const altasPorMes = [4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 6]; // meses 11→0 (el actual, parcial)
  let hist = 0;
  for (let mIdx = 0; mIdx < altasPorMes.length; mIdx++) {
    const mesesAtras = altasPorMes.length - 1 - mIdx;
    for (let i = 0; i < altasPorMes[mIdx]!; i++) {
      hist++;
      const uid = await altaCora(sql, {
        email: `hist${hist}${SEED_EMAIL_DOMINIO}`,
        nombre: `Alumno Histórico ${hist}`,
        coraRol: 'alumno',
      });
      await crearPerfil(sql, uid, { lxpRol: 'alumno', acceso: true });
      // created_at backdateado al mes correspondiente (día variado; nunca en el futuro).
      const dia = 3 + (i % 22);
      await sql`
        update lxp.perfiles
        set created_at = least(
          now() - interval '1 hour',
          date_trunc('month', now()) - (${mesesAtras} || ' months')::interval + (${dia} || ' days')::interval
        )
        where user_id = ${uid}`;
      // 80% con un caso aprobado reciente (dentro de 14 días) → "al día". grupo/modulo NULL.
      if (hist % 5 !== 0) {
        const dias = 1 + (hist % 13);
        const horas = 1 + (hist % 3) * 0.5;
        const casoHist = first(
          await sql<{ id: string }[]>`
            insert into lxp.bitacora_casos
              (id_alumno, grupo_id, modulo_id, organo, dominio_iaim, hallazgos, horas_estimadas,
               estado_validacion, origen, anonimizado_en, created_at)
            values (${uid}, null, null, 'Abdomen', ${'adquisicion'}::lxp.dominio_iaim,
               'Estudio histórico acreditado', ${horas}, ${'aprobado'}::lxp.estado_validacion,
               ${'alumno'}::lxp.origen_caso, now(), now() - (${dias} || ' days')::interval)
            returning id`,
        );
        // Un tercio de esos casos lleva validación de Sandoval/Lugo (dentro de 3 días) →
        // la actividad del staff muestra 3 docentes distintos.
        if (hist % 3 === 0) {
          const quien = hist % 2 === 0 ? docSandoval : docLugo;
          await sql`
            insert into lxp.validaciones (caso_id, id_docente, decision, feedback, created_at)
            values (${casoHist.id}, ${quien}, ${'aprobado'}::lxp.decision_validacion,
                    'Estudio correcto.', now() - ((${hist % 3}) || ' hours')::interval - interval '10 minutes')`;
        }
      }
    }
  }

  // (3) Un programa en BORRADOR → decisión "programas en borrador" (defaults: estado 'borrador').
  await sql`
    insert into lxp.programas (nombre, descripcion, publicado, version)
    values ('POCUS Avanzado — Borrador', 'En construcción por el equipo de diseño.', false, 1)`;

  // (4) Un post del Ateneo PENDIENTE → decisión "posts del Ateneo por moderar" (visible
  //     solo a su autor y al staff · posts_ateneo_select 0010; no aparece en el feed).
  await sql`
    insert into lxp.posts_ateneo (autor_id, tipo, titulo, cuerpo, estado, visibilidad)
    values (${alumnos.a3}, 'caso'::lxp.post_ateneo_tipo, 'Caso para el Ateneo (en revisión)',
            'Propongo este caso para la discusión del grupo.', 'pendiente'::lxp.estado_validacion, 'inscritos')`;

  // ═══════════════════════════════════════════════════════════════════════════
  // ALUMNOS (admin) — competencia I-AIM AMPLIA + reconocimiento de a1.
  // La proyección I-AIM la escribe el worker en prod; aquí es seed para que la columna
  // I-AIM de la lista y "Competencia media" rindan (no solo a1) y el expediente sea rico.
  // ═══════════════════════════════════════════════════════════════════════════
  const DOMS_IAIM = ['indicacion', 'adquisicion', 'interpretacion', 'decision_medica'] as const;
  /** Siembra los 4 dominios I-AIM de un alumno con niveles dados (decaimiento derivado). */
  async function sembrarCompetencia(alumno: string, niveles: [number, number, number, number]): Promise<void> {
    for (let i = 0; i < 4; i++) {
      const nivel = niveles[i]!;
      const decaimiento = nivel < 55 ? 8 + (nivel % 12) : 0;
      const horas = 20 + (nivel % 30);
      await sql`
        insert into lxp.competencia_dominios (id_alumno, dominio_iaim, horas, nivel, decaimiento, proximo_repaso)
        values (${alumno}, ${DOMS_IAIM[i]!}::lxp.dominio_iaim, ${horas}, ${nivel}, ${decaimiento},
                ${nivel < 55 ? sql`(now() + interval '3 days')::date` : sql`null`})
        on conflict (id_alumno, dominio_iaim) do nothing`;
    }
  }

  // a2/a3/a5 (a1 ya la tiene arriba, con Adquisición en caída).
  await sembrarCompetencia(alumnos.a2, [68, 60, 72, 64]);
  await sembrarCompetencia(alumnos.a3, [55, 48, 61, 58]);
  await sembrarCompetencia(alumnos.a5, [80, 72, 78, 75]);

  // ~2/3 de los alumnos históricos con I-AIM (niveles variados); el resto queda "sin
  // proyección aún" (estado real que la vista también muestra).
  const historicos = await sql<{ user_id: string }[]>`
    select user_id from lxp.perfiles where email like ${'hist%' + SEED_EMAIL_DOMINIO} order by email`;
  for (let i = 0; i < historicos.length; i++) {
    if (i % 3 === 0) continue; // ~1/3 sin competencia
    const base = 50 + ((i * 7) % 45); // 50..94, pseudo-variado
    await sembrarCompetencia(historicos[i]!.user_id, [
      Math.min(100, base + 5),
      Math.max(30, base - 10),
      base,
      Math.max(35, base - 4),
    ]);
  }

  // Expediente rico de a1: 1 certificado (ligado a su hito de 100 h) + 1 insignia.
  await sql`
    insert into lxp.certificados (id_alumno, hito_id, folio, titulo)
    values (${alumnos.a1},
            (select id from lxp.hitos where id_alumno = ${alumnos.a1} and tipo = 'horas_100' limit 1),
            'CERT-A1-100H', 'Certificado · 100 horas acreditadas')
    on conflict (folio) do nothing`;
  await sql`
    insert into lxp.badges_otorgados (badge_id, id_perfil, otorgado_por)
    values ((select id from lxp.badges where clave = 'primer_caso' limit 1), ${alumnos.a1}, null)
    on conflict (badge_id, id_perfil) do nothing`;

  // ═══════════════════════════════════════════════════════════════════════════
  // STAFF (admin) — sobrecarga visible en Diego + detalle no-vacío para Sandoval/Lugo.
  // ═══════════════════════════════════════════════════════════════════════════
  // Área/especialidad para Sandoval y Lugo (Diego/admin/super ya la tienen).
  await sql`update lxp.perfiles set especialidad = 'Renal y abdomen' where user_id = ${docSandoval}`;
  await sql`update lxp.perfiles set especialidad = 'Urgencias y POCUS' where user_id = ${docLugo}`;

  // 1 grupo a Sandoval → su detalle muestra "Grupos que imparte".
  await sql`
    insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, docente_id)
    values (${programa.id}, 'Grupo Renal · 2026 (Sandoval)', 'sincrono'::lxp.modalidad, '2026-04-01', ${docSandoval})`;

  // ~4 casos pendientes extra en grupoSync (docente = Diego) → su cola llega a ≥8 = sobrecarga.
  // Asignados a alumnos HISTÓRICOS (no tocan a1/a2/a3/a5 · tests de RLS cuentan sus casos exactos).
  const histParaCola = await sql<{ user_id: string }[]>`
    select user_id from lxp.perfiles where email like ${'hist%' + SEED_EMAIL_DOMINIO} order by email limit 4`;
  for (let i = 0; i < histParaCola.length; i++) {
    await sql`
      insert into lxp.bitacora_casos
        (id_alumno, grupo_id, modulo_id, organo, dominio_iaim, hallazgos, horas_estimadas,
         estado_validacion, origen, anonimizado_en, created_at)
      values (${histParaCola[i]!.user_id}, ${grupoSync.id}, ${m1.id}, 'Riñón', ${'adquisicion'}::lxp.dominio_iaim,
         'Caso en cola de validación (demo carga)', 1.0, ${'pendiente'}::lxp.estado_validacion,
         ${'alumno'}::lxp.origen_caso, now(), now() - ((${i} + 1) || ' days')::interval)`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALÍTICA (admin) — serie temporal poblada + loop de mejora de Eco.
  // ═══════════════════════════════════════════════════════════════════════════
  // (a) Casos backdateados por mes → "Casos subidos por mes" no sale plana (grupo/modulo
  //     NULL, aprobados, en alumnos históricos: no tocan a1..a5 ni la bandeja docente).
  const histCasos = await sql<{ user_id: string }[]>`
    select user_id from lxp.perfiles where email like ${'hist%' + SEED_EMAIL_DOMINIO} order by email limit 10`;
  if (histCasos.length > 0) {
    const mesesAtrasCaso = [1, 1, 2, 2, 3, 3, 4, 4]; // 2 casos por cada uno de los últimos 4 meses
    for (let i = 0; i < mesesAtrasCaso.length; i++) {
      const uid = histCasos[i % histCasos.length]!.user_id;
      await sql`
        insert into lxp.bitacora_casos
          (id_alumno, grupo_id, modulo_id, organo, dominio_iaim, hallazgos, horas_estimadas,
           estado_validacion, origen, anonimizado_en, created_at)
        values (${uid}, null, null, 'Abdomen', ${'interpretacion'}::lxp.dominio_iaim,
           'Estudio histórico (serie mensual)', 1.0, ${'aprobado'}::lxp.estado_validacion,
           ${'alumno'}::lxp.origen_caso, now(),
           date_trunc('month', now()) - ((${mesesAtrasCaso[i]!}) || ' months')::interval + interval '10 days')`;
    }
  }

  // (b) Correcciones docente→Eco (loop de mejora · §7A) → "Uso y calidad de Eco".
  for (let i = 0; i < 4; i++) {
    await sql`
      insert into lxp.eco_correcciones (id_docente, objeto_tipo, objeto_id, sugerencia_eco, correccion)
      values (${docente}, 'caso', null,
        ${sql.json({ nota_sugerida: 8, feedback: 'Sugerencia de Eco (borrador)' })},
        ${sql.json({ nota_final: 7, feedback: 'Ajuste del docente sobre la sugerencia' })})`;
  }

  // ── Plantillas de reporte (constructor Studio ↔ generador médico · §6.5) ──
  // Las "plantillas de prueba" ahora viven en la BD (no hardcodeadas): el constructor
  // las abre/edita y el médico las usa. Estructura = contrato `reportes/estructura`.
  await seedPlantillasReporte(sql);

  console.log('✓ Seed mock cargado.');
}

/**
 * Modelo de tabla (§6.5): `columnas[0]` = columna de ETIQUETAS DE FILA (antes se inyectaba en el
 * render como columna fantasma sin existir en `columnas`). Las PLANTILLAS_REALES se convirtieron con
 * el modelo viejo (columnas = solo datos), así que al sembrar anteponemos "" a `columnas` de cada
 * campo tabla — misma migración que la 0048 aplica a las plantillas ya guardadas. Idempotente por
 * corrida: opera sobre la fuente (modelo viejo) en cada re-seed.
 */
function conColumnaEtiqueta(estructura: unknown): unknown {
  if (!estructura || typeof estructura !== 'object') return estructura;
  const e = estructura as { secciones?: unknown };
  if (!Array.isArray(e.secciones)) return estructura;
  return {
    ...e,
    secciones: e.secciones.map((s) => {
      if (!s || typeof s !== 'object' || !Array.isArray((s as { campos?: unknown }).campos)) return s;
      const sec = s as { campos: unknown[] };
      return {
        ...sec,
        campos: sec.campos.map((c) => {
          if (!c || typeof c !== 'object' || (c as { tipo?: unknown }).tipo !== 'tabla') return c;
          const campo = c as { columnas?: unknown };
          const columnas = Array.isArray(campo.columnas) ? campo.columnas : [];
          return { ...campo, columnas: ['', ...columnas] };
        }),
      };
    }),
  };
}

/** Siembra las plantillas de reporte REALES (Fase 2, convertidas) — publicadas. */
async function seedPlantillasReporte(sql: Sql): Promise<void> {
  const plantillas = PLANTILLAS_REALES;

  for (const p of plantillas) {
    await sql`
      insert into lxp.plantillas_reporte (nombre, tipo_estudio, estructura, publicado)
      values (${p.nombre}, ${p.tipo}, ${sql.json(conColumnaEtiqueta(p.estructura) as never)}, true)`;
  }
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
