import 'server-only';
import { comoAlumno } from '@/lib/db.server';
import { type DominioIaim } from '@/lib/campus/bitacora-contrato';
import {
  dificultadDeDominio,
  labelDominio,
  type CasoSim,
  type Desempeno,
  type Repaso,
  type SimuladoresData,
  type TipoSim,
} from './_contrato';

/**
 * Lectura del catálogo/progreso de simuladores CON RLS (§2/§10). CRUD simple
 * `web → Supabase` — NO pasa por NestJS (Regla de Oro §2). La EVALUACIÓN sí es
 * dominio (juicio de Eco) y vive en `api` (ver `_acciones.ts`).
 *
 * El catálogo sale del BANCO CURADO (`casos_biblioteca` publicados); el progreso, de
 * `sesiones_simulador` del propio alumno; los repasos, de `competencia_dominios`
 * (proyección del worker). La verdad del caso (diagnóstico) NO se lee aquí — se revela
 * solo tras responder, desde el `api`.
 */

type FilaCaso = { id: string; titulo: string; organo: string | null; dominio_iaim: DominioIaim | null };
type FilaSesion = { caso_biblioteca_id: string | null; puntaje: number | null; created_at: Date; tipo: TipoSim };
type FilaRepaso = { dominio_iaim: DominioIaim; proximo_repaso: string };

/** Historial legible de un caso a partir de las sesiones del alumno. */
function historialDe(sesiones: FilaSesion[]): { texto: string; mejor: number | null } {
  if (sesiones.length === 0) return { texto: 'Sin practicar', mejor: null };
  const puntajes = sesiones.map((s) => s.puntaje).filter((p): p is number => p != null);
  const mejor = puntajes.length ? Math.round(Math.max(...puntajes)) : null;
  const veces = sesiones.length === 1 ? '1 vez' : `${sesiones.length} veces`;
  return { texto: mejor != null ? `Practicado ${veces} · mejor ${mejor}` : `Practicado ${veces}`, mejor };
}

/** Días entre hoy y una fecha ISO (negativo = pasado). */
function diasHasta(iso: string, ahora: Date): number {
  const dia = 86_400_000;
  return Math.round((new Date(iso).getTime() - ahora.getTime()) / dia);
}

function cuandoRepaso(dias: number): string {
  if (dias <= 0) return 'toca hoy';
  if (dias === 1) return 'mañana';
  return `en ${dias} días`;
}

export async function getSimuladores(userId: string): Promise<SimuladoresData> {
  const [casos, sesiones, repasos] = await comoAlumno(userId, async (sql) => {
    const casos = await sql<FilaCaso[]>`
      select id, titulo, organo, dominio_iaim::text as dominio_iaim
      from lxp.casos_biblioteca
      where publicado
      order by created_at desc`;
    const sesiones = await sql<FilaSesion[]>`
      select caso_biblioteca_id, puntaje::float8 as puntaje, created_at, tipo::text as tipo
      from lxp.sesiones_simulador
      where id_alumno = ${userId}
      order by created_at desc`;
    const repasos = await sql<FilaRepaso[]>`
      select dominio_iaim::text as dominio_iaim, proximo_repaso::text as proximo_repaso
      from lxp.competencia_dominios
      where id_alumno = ${userId} and proximo_repaso is not null
      order by proximo_repaso asc`;
    return [casos, sesiones, repasos] as const;
  });

  const ahora = new Date();

  // Progreso por caso.
  const porCaso = new Map<string, FilaSesion[]>();
  for (const s of sesiones) {
    if (!s.caso_biblioteca_id) continue;
    const arr = porCaso.get(s.caso_biblioteca_id) ?? [];
    arr.push(s);
    porCaso.set(s.caso_biblioteca_id, arr);
  }

  const items: CasoSim[] = casos.map((c) => {
    const { texto, mejor } = historialDe(porCaso.get(c.id) ?? []);
    // "Sugerido" si nunca se practicó o si el dominio tiene repaso pendiente hoy.
    const repasoHoy = repasos.some(
      (r) => r.dominio_iaim === c.dominio_iaim && diasHasta(r.proximo_repaso, ahora) <= 0,
    );
    return {
      id: c.id,
      titulo: c.titulo,
      area: c.organo ?? labelDominio(c.dominio_iaim),
      dominio: c.dominio_iaim,
      dificultad: dificultadDeDominio(c.dominio_iaim),
      historial: texto,
      mejor,
      sugerido: mejor == null || repasoHoy,
    };
  });

  // Desempeño (agregados reales de las sesiones).
  const puntajes = sesiones.map((s) => s.puntaje).filter((p): p is number => p != null);
  const promedio = puntajes.length ? Math.round(puntajes.reduce((a, b) => a + b, 0) / puntajes.length) : 0;
  const mejorGlobal = puntajes.length ? Math.round(Math.max(...puntajes)) : 0;
  const semana = 7 * 86_400_000;
  const estaSemana = sesiones.filter((s) => ahora.getTime() - new Date(s.created_at).getTime() < semana).length;
  const desempeno: Desempeno[] = [
    { etiqueta: 'Puntaje promedio', valor: `${promedio}`, pct: promedio, tono: 'bien' },
    { etiqueta: 'Mejor puntaje', valor: `${mejorGlobal}`, pct: mejorGlobal, tono: 'neutro' },
    {
      etiqueta: 'Sesiones esta semana',
      valor: `${estaSemana}`,
      pct: Math.min(100, estaSemana * 20),
      tono: estaSemana > 0 ? 'bien' : 'aviso',
    },
  ];

  const repasosUi: Repaso[] = repasos.map((r) => {
    const dias = diasHasta(r.proximo_repaso, ahora);
    return {
      dominio: r.dominio_iaim,
      tema: labelDominio(r.dominio_iaim),
      cuando: cuandoRepaso(dias),
      hoy: dias <= 0,
    };
  });

  const areas = ['Todas las áreas', ...Array.from(new Set(items.map((i) => i.area))).sort()];

  const ultima = sesiones[0];
  const ultimaSesion = ultima
    ? `Tu sesión más reciente fue de ${ultima.tipo === 'reporte' ? 'reporte' : 'interpretación'}` +
      (ultima.puntaje != null ? `, con ${Math.round(ultima.puntaje)} de puntaje.` : '.')
    : 'Aún no has practicado. Elige un caso y estrénate con el tutor.';

  return {
    practicados: sesiones.length,
    ultimaSesion,
    desempeno,
    repasos: repasosUi,
    disponibles: items.length,
    areas,
    casos: items,
  };
}
