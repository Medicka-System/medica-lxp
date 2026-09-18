/**
 * Motor de competencia I-AIM (§1/§6). LÓGICA CRÍTICA — tiene tests obligatorios.
 * Pura y determinista: recibe casos aprobados + `ahora`, devuelve la proyección
 * por dominio (horas, nivel, decaimiento). NO toca BD (eso es del worker).
 */
import { NIVEL_POR_HORA, TAU_DIAS, DOMINIOS_IAIM, DIA_MS, type DominioIaim } from './iaim';
import { retencion } from './repaso';

export interface CasoParaCompetencia {
  dominio_iaim: DominioIaim;
  horas_estimadas: number;
  /** Fecha de la práctica (ISO 8601), típicamente la validación del caso. */
  fecha: string;
}

export interface CompetenciaCalculada {
  dominio_iaim: DominioIaim;
  horas: number;
  nivel: number; // 0..100, ya con decaimiento aplicado
  decaimiento: number; // puntos de nivel perdidos por el paso del tiempo
  ultima_practica: string; // ISO de la práctica más reciente del dominio
}

function redondea2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Agrega horas por dominio, calcula el nivel bruto (satura en 100) y le aplica la
 * curva de olvido según la última práctica y el τ del dominio.
 */
export function calcularCompetencia(
  casos: readonly CasoParaCompetencia[],
  ahora: Date,
): CompetenciaCalculada[] {
  const porDominio = new Map<DominioIaim, CasoParaCompetencia[]>();
  for (const c of casos) {
    const lista = porDominio.get(c.dominio_iaim) ?? [];
    lista.push(c);
    porDominio.set(c.dominio_iaim, lista);
  }

  const salida: CompetenciaCalculada[] = [];
  for (const [dominio, lista] of porDominio) {
    const horas = lista.reduce((s, c) => s + c.horas_estimadas, 0);
    const nivelBruto = Math.min(100, Math.round(horas * NIVEL_POR_HORA));

    const fechasOrdenadas = lista.map((c) => c.fecha).sort();
    const ultima = fechasOrdenadas[fechasOrdenadas.length - 1] ?? ahora.toISOString();

    const deltaDias = Math.max(0, (ahora.getTime() - new Date(ultima).getTime()) / DIA_MS);
    const ret = retencion(deltaDias, TAU_DIAS[dominio]);
    const nivel = Math.round(nivelBruto * ret);
    const decaimiento = Math.max(0, nivelBruto - nivel);

    salida.push({
      dominio_iaim: dominio,
      horas: redondea2(horas),
      nivel,
      decaimiento,
      ultima_practica: ultima,
    });
  }

  return salida.sort(
    (a, b) => DOMINIOS_IAIM.indexOf(a.dominio_iaim) - DOMINIOS_IAIM.indexOf(b.dominio_iaim),
  );
}

/** Total de horas de práctica (suma de todos los casos) — base de los hitos. */
export function horasTotales(casos: readonly CasoParaCompetencia[]): number {
  return redondea2(casos.reduce((s, c) => s + c.horas_estimadas, 0));
}
