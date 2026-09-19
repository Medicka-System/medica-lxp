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

  // ── Contenido (1 programa · 2 módulos · lecciones · actividad · rúbrica) ─
  const programa = first(
    await sql<{ id: string }[]>`
      insert into lxp.programas (nombre, descripcion, publicado, version)
      values ('POCUS Esencial', 'Ultrasonido diagnóstico a pie de cama', true, 1)
      returning id`,
  );

  // Las horas se definen POR LECCIÓN (mig 0022); el módulo las SUMA solo (trigger).
  // Se dejan las horas del módulo en 0: el trigger las recalcula al insertar lecciones.
  const m1 = first(
    await sql<{ id: string }[]>`
      insert into lxp.modulos (programa_id, nombre, orden)
      values (${programa.id}, 'Fundamentos y física', 1) returning id`,
  );
  const m2 = first(
    await sql<{ id: string }[]>`
      insert into lxp.modulos (programa_id, nombre, orden)
      values (${programa.id}, 'Abdomen y FAST', 2) returning id`,
  );

  // Horas por lección → el módulo 1 suma 8 h (4+4) y el módulo 2 suma 12 h.
  const l1 = first(
    await sql<{ id: string }[]>`
      insert into lxp.lecciones (modulo_id, nombre, orden, horas)
      values (${m1.id}, 'Principios de la imagen', 1, 4) returning id`,
  );
  await sql`
    insert into lxp.lecciones (modulo_id, nombre, orden, horas)
    values (${m1.id}, 'Artefactos', 2, 4)`;
  await sql`
    insert into lxp.lecciones (modulo_id, nombre, orden, horas)
    values (${m2.id}, 'Protocolo FAST', 1, 12)`;

  await sql`
    insert into lxp.contenidos (leccion_id, tipo, titulo, cuerpo, orden)
    values
      (${l1.id}, ${'video'}::lxp.contenido_tipo, 'Cómo se forma la imagen', null, 1),
      (${l1.id}, ${'texto'}::lxp.contenido_tipo, 'Lectura: impedancia acústica', 'Contenido de ejemplo.', 2)`;

  const act1 = first(
    await sql<{ id: string }[]>`
      insert into lxp.actividades (leccion_id, tipo, titulo, instrucciones, orden)
      values (${l1.id}, ${'tarea'}::lxp.actividad_tipo, 'Identifica los planos', 'Sube 3 imágenes.', 1)
      returning id`,
  );
  await sql`
    insert into lxp.rubricas (actividad_id, criterios)
    values (${act1.id}, ${sql.json([
      { criterio: 'Plano correcto', peso: 0.5 },
      { criterio: 'Calidad de imagen', peso: 0.5 },
    ])})`;

  // ── Grupos LXP (síncrono/asíncrono) de la plantilla ────────────────────
  await sql`
    insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, docente_id)
    values (${programa.id}, 'POCUS 2026-A (síncrono)', ${'sincrono'}::lxp.modalidad, '2026-02-01', ${docente})`;
  await sql`
    insert into lxp.grupos (programa_id, nombre, modalidad, fecha_inicio, docente_id)
    values (${programa.id}, 'POCUS 2026-B (asíncrono)', ${'asincrono'}::lxp.modalidad, '2026-03-01', ${docente})`;

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

  // Entrega de a1 a la tarea.
  await sql`
    insert into lxp.entregas (actividad_id, id_alumno, contenido, estado)
    values (${act1.id}, ${alumnos.a1}, ${sql.json({ nota_alumno: 'Adjunto 3 planos.' })}, ${'enviada'}::lxp.entrega_estado)`;

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
