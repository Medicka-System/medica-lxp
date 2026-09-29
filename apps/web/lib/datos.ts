import 'server-only';
import { comoAlumno } from './db.server';
import { gruposDelAlumno } from './campus/inscripcion';
import { firmarLecturaImagen } from './media/firmar-imagenes.server';

/**
 * Consultas del Campus del alumno. TODAS corren con RLS (rol authenticated) vía
 * `comoAlumno`: el alumno solo ve lo suyo + lo público, igual que en producción.
 * Devuelven datos ya listos para la UI (sin lógica de dominio en el front · §2).
 */

const DOMINIO_LABEL: Record<string, string> = {
  indicacion: 'Indicación',
  adquisicion: 'Adquisición',
  interpretacion: 'Interpretación',
  decision_medica: 'Decisión médica',
};

// ── Shell ────────────────────────────────────────────────────────────────────
export async function getShellData(
  userId: string,
): Promise<{ casosPendientes: number; avatarUrl: string | null }> {
  const { casosPendientes, avatarRef } = await comoAlumno(userId, async (sql) => {
    const rows = await sql<{ n: number }[]>`
      select count(*)::int as n from lxp.bitacora_casos where estado_validacion = 'pendiente'`;
    // Avatar del PROPIO perfil: RLS (own-or-staff) deja leerlo sin definer.
    const perfil = await sql<{ avatar_url: string | null }[]>`
      select avatar_url from lxp.perfiles where user_id = ${userId}`;
    return { casosPendientes: rows[0]?.n ?? 0, avatarRef: perfil[0]?.avatar_url ?? null };
  });
  const avatarUrl = await firmarLecturaImagen(avatarRef);
  return { casosPendientes, avatarUrl };
}

// ── Home ─────────────────────────────────────────────────────────────────────
export type HomeData = Awaited<ReturnType<typeof getHomeData>>;

export async function getHomeData(userId: string) {
  return comoAlumno(userId, async (sql) => {
    const anuncios = await sql<{ id: string; titulo: string; cuerpo: string; vigente_hasta: Date | null }[]>`
      select id, titulo, cuerpo, vigente_hasta from lxp.anuncios
      where vigente_hasta is null or vigente_hasta > now()
      order by vigente_desde desc limit 1`;

    const biblioteca = await sql<{ titulo: string; diagnostico_correcto: string | null; organo: string | null }[]>`
      select titulo, diagnostico_correcto, organo from lxp.casos_biblioteca
      where publicado order by created_at desc limit 1`;

    // ── "Siga donde se quedó": la ÚLTIMA lección con progreso real del alumno ──
    // Señal real = lxp.reproduccion_progreso (mig 0028, re-llaveado por leccion_id).
    // NOTA (gap conocido): el progreso solo se registra al MARCAR completada (o al
    // reproducir media); no hay un "visto sin completar" fino. Derivamos la mejor
    // señal: la última fila tocada (por actualizado_en). Si esa lección ya está
    // completa, apuntamos a la SIGUIENTE pendiente del programa; si no hay progreso,
    // a la primera lección del programa publicado.
    type LecCont = {
      id: string;
      leccion: string;
      tipo: string;
      modulo: string;
      programa: string;
      programa_id: string;
      imagen: string | null;
    };

    const ultima = await sql<(LecCont & { mo: number; lo: number; completado: boolean })[]>`
      select l.id, l.nombre as leccion, l.tipo::text as tipo, m.nombre as modulo,
             pr.nombre as programa, pr.imagen_url as imagen,
             m.orden as mo, l.orden as lo, rp.completado, pr.id as programa_id
      from lxp.reproduccion_progreso rp
      join lxp.lecciones l on l.id = rp.leccion_id
      join lxp.modulos m on m.id = l.modulo_id
      join lxp.programas pr on pr.id = m.programa_id
      where rp.alumno_id = ${userId} and rp.leccion_id is not null
      order by rp.actualizado_en desc
      limit 1`;

    let continuar: LecCont | null = null;
    if (ultima[0]) {
      const u = ultima[0];
      if (!u.completado) {
        continuar = { id: u.id, leccion: u.leccion, tipo: u.tipo, modulo: u.modulo, programa: u.programa, programa_id: u.programa_id, imagen: u.imagen };
      } else {
        const sig = await sql<LecCont[]>`
          select l.id, l.nombre as leccion, l.tipo::text as tipo, m.nombre as modulo,
                 pr.nombre as programa, pr.id as programa_id, pr.imagen_url as imagen
          from lxp.lecciones l
          join lxp.modulos m on m.id = l.modulo_id
          join lxp.programas pr on pr.id = m.programa_id
          where pr.id = ${u.programa_id}
            and (m.orden > ${u.mo} or (m.orden = ${u.mo} and l.orden > ${u.lo}))
            and not exists (
              select 1 from lxp.reproduccion_progreso rp2
              where rp2.leccion_id = l.id and rp2.alumno_id = ${userId} and rp2.completado)
          order by m.orden, l.orden
          limit 1`;
        continuar = sig[0] ?? { id: u.id, leccion: u.leccion, tipo: u.tipo, modulo: u.modulo, programa: u.programa, programa_id: u.programa_id, imagen: u.imagen };
      }
    } else {
      const primera = await sql<LecCont[]>`
        select l.id, l.nombre as leccion, l.tipo::text as tipo, m.nombre as modulo,
               pr.nombre as programa, pr.id as programa_id, pr.imagen_url as imagen
        from lxp.programas pr
        join lxp.modulos m on m.programa_id = pr.id
        join lxp.lecciones l on l.modulo_id = m.id
        where pr.publicado
        order by m.orden, l.orden
        limit 1`;
      continuar = primera[0] ?? null;
    }

    // Portada: preferir la `imagen_portada` del GRUPO del alumno (mig 0036) sobre la del
    // programa. Es una ref de storage → URL firmada (best-effort, no rompe el home).
    if (continuar) {
      const grupos = await gruposDelAlumno(sql, userId);
      const refGrupo = grupos.find((g) => g.programaId === continuar!.programa_id)?.imagenPortada ?? null;
      const portadaGrupo = await firmarLecturaImagen(refGrupo);
      if (portadaGrupo) continuar.imagen = portadaGrupo;
    }

    const competencia = await sql<
      { dominio_iaim: string; nivel: number; decaimiento: number; horas: number }[]
    >`
      select dominio_iaim, nivel::float8 as nivel, decaimiento::float8 as decaimiento, horas::float8 as horas
      from lxp.competencia_dominios order by dominio_iaim`;

    const posts = await sql<
      { id: string; tipo: string; titulo: string; vineta: string | null; autor: string | null; cuando: Date }[]
    >`
      select id, tipo, titulo, vineta, lxp.nombre_de(autor_id) as autor, created_at as cuando
      from lxp.posts_ateneo where estado = 'aprobado'
      order by created_at desc limit 4`;

    const loops = await sql<{ id: string; titulo: string; organo: string | null; autor: string | null }[]>`
      select id, titulo, organo, lxp.nombre_de(curador_id) as autor
      from lxp.casos_biblioteca where publicado
      order by created_at desc limit 4`;

    const horasTotales = competencia.reduce((s, c) => s + c.horas, 0);
    const nivelGeneral = competencia.length
      ? Math.round(competencia.reduce((s, c) => s + c.nivel, 0) / competencia.length)
      : 0;
    const dominiosPulso = competencia
      .map((c) => ({
        nombre: DOMINIO_LABEL[c.dominio_iaim] ?? c.dominio_iaim,
        valor: Math.round(c.nivel),
        enRepaso: c.decaimiento >= 15,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 2);

    return {
      anuncio: anuncios[0] ?? null,
      casoSemana: biblioteca[0] ?? null,
      continuar,
      pulso: {
        horasTotales: Math.round(horasTotales),
        nivelGeneral,
        avancePct: Math.min(100, Math.round((horasTotales / 1000) * 100)),
        dominios: dominiosPulso,
      },
      posts: posts.map((p) => ({
        id: p.id,
        tipo: p.tipo,
        titulo: p.titulo,
        vineta: p.vineta,
        autor: p.autor ?? 'Colega',
        cuando: p.cuando,
      })),
      loops: loops.map((l) => ({
        id: l.id,
        titulo: l.titulo,
        area: l.organo ?? 'ultrasonido',
        autor: l.autor ?? 'Docente',
      })),
    };
  });
}

// ── Anuncio (detalle · /anuncio/[id]) ────────────────────────────────────────
export type AnuncioDetalle = Awaited<ReturnType<typeof getAnuncio>>;

/**
 * Un anuncio por id, con su cuerpo completo. Corre bajo RLS (`comoAlumno`): la
 * policy `anuncios_select` deja leer a cualquier autenticado (§6). El nombre del
 * autor se resuelve por la función SECURITY DEFINER `lxp.nombre_de` (§ perfil público).
 */
export async function getAnuncio(userId: string, id: string) {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<
      {
        id: string;
        titulo: string;
        cuerpo: string;
        vigente_desde: Date;
        vigente_hasta: Date | null;
        created_at: Date;
        autor: string | null;
      }[]
    >`
      select a.id, a.titulo, a.cuerpo, a.vigente_desde, a.vigente_hasta, a.created_at,
             lxp.nombre_de(a.autor_id) as autor
      from lxp.anuncios a
      where a.id = ${id}
      limit 1`;
    return rows[0] ?? null;
  });
}

// ── Mi dominio ───────────────────────────────────────────────────────────────
export type DominioData = Awaited<ReturnType<typeof getDominioData>>;

const UMBRALES = [100, 500, 1000];

export async function getDominioData(userId: string) {
  return comoAlumno(userId, async (sql) => {
    const rows = await sql<
      {
        dominio_iaim: string;
        nivel: number;
        decaimiento: number;
        horas: number;
        proximo_repaso: Date | null;
      }[]
    >`
      select dominio_iaim, nivel::float8 as nivel, decaimiento::float8 as decaimiento,
             horas::float8 as horas, proximo_repaso
      from lxp.competencia_dominios order by dominio_iaim`;

    const hitosRows = await sql<{ tipo: string; horas_umbral: number }[]>`
      select tipo, horas_umbral::float8 as horas_umbral from lxp.hitos order by horas_umbral`;
    const hitosAlcanzados = new Set(hitosRows.map((h) => h.tipo));

    const dominios = rows.map((r) => {
      const nivel = Math.round(r.nivel);
      const decaimiento = Math.round(r.decaimiento);
      const estado: 'solido' | 'repaso' | 'caida' =
        decaimiento >= 15 ? 'caida' : r.proximo_repaso ? 'repaso' : 'solido';
      return {
        dominio: DOMINIO_LABEL[r.dominio_iaim] ?? r.dominio_iaim,
        nivel,
        decaimiento,
        estado,
        // Serie de 2 puntos: nivel bruto (antes del olvido) → nivel actual.
        serie: [nivel + decaimiento, nivel],
        proximoRepaso: r.proximo_repaso,
      };
    });

    const horas = Math.round(rows.reduce((s, r) => s + r.horas, 0));
    const nivelGeneral = dominios.length
      ? Math.round(dominios.reduce((s, d) => s + d.nivel, 0) / dominios.length)
      : 0;

    const repasos = rows
      .filter((r) => r.proximo_repaso || r.decaimiento >= 15)
      .map((r) => ({
        dominio: DOMINIO_LABEL[r.dominio_iaim] ?? r.dominio_iaim,
        cuando: r.proximo_repaso,
        decaimiento: Math.round(r.decaimiento),
      }));

    const siguiente = UMBRALES.find((u) => horas < u) ?? 1000;
    const hitos = UMBRALES.map((u) => ({
      horas: `${u} h`,
      alcanzado: hitosAlcanzados.has(`horas_${u}`) || horas >= u,
      cerca: horas < u && u === siguiente,
    }));

    return {
      general: { nivel: nivelGeneral },
      dominios,
      repasos,
      horas: { acreditadas: horas, meta: 1000, siguiente, faltan: Math.max(0, siguiente - horas) },
      hitos,
    };
  });
}
