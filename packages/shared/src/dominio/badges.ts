/**
 * Evaluación de reglas de badges (§6/§8). Puro y data-driven: la regla vive en
 * `lxp.badges.regla` (jsonb) y se evalúa contra el contexto del alumno.
 */
export type TipoReglaBadge = 'casos' | 'horas' | 'competencia' | 'hito' | 'racha';

export interface ReglaBadge {
  tipo: TipoReglaBadge;
  umbral?: number;
  dominio?: string; // para 'competencia' de un dominio específico
  hito?: string; // para 'hito'
}

export interface ContextoBadges {
  casosAprobados: number;
  horasTotales: number;
  nivelPorDominio: Record<string, number>;
  hitos: readonly string[];
  rachaDias?: number;
}

export interface BadgeCatalogo {
  id: string;
  clave: string;
  regla: ReglaBadge | null; // null = badge manual (no automático)
}

/** ¿El contexto del alumno cumple la regla del badge? */
export function cumpleReglaBadge(regla: ReglaBadge, ctx: ContextoBadges): boolean {
  switch (regla.tipo) {
    case 'casos':
      return ctx.casosAprobados >= (regla.umbral ?? 1);
    case 'horas':
      return ctx.horasTotales >= (regla.umbral ?? 0);
    case 'hito':
      return regla.hito ? ctx.hitos.includes(regla.hito) : false;
    case 'competencia': {
      const min = regla.umbral ?? 60;
      if (regla.dominio) return (ctx.nivelPorDominio[regla.dominio] ?? 0) >= min;
      const niveles = Object.values(ctx.nivelPorDominio);
      return niveles.length > 0 && niveles.every((v) => v >= min);
    }
    case 'racha':
      return (ctx.rachaDias ?? 0) >= (regla.umbral ?? 0);
    default:
      return false;
  }
}

/** Ids de badges automáticos a otorgar: regla cumplida y aún no otorgado. */
export function badgesAOtorgar(
  catalogo: readonly BadgeCatalogo[],
  ctx: ContextoBadges,
  yaOtorgados: readonly string[],
): string[] {
  const otorgados = new Set(yaOtorgados);
  return catalogo
    .filter((b) => b.regla !== null && !otorgados.has(b.id) && cumpleReglaBadge(b.regla, ctx))
    .map((b) => b.id);
}
