import 'server-only';
import { comoStaff } from '@/lib/db.server';
import type { GastoEco, GastoEcoDesglose, GastoEcoPunto } from './gasto-eco-contrato';

/**
 * Loader del GASTO DE ECO (§7A). Lee AGREGADOS de `lxp.eco_uso` CON RLS (`comoStaff`
 * → policy `eco_uso_select`/`es_staff()` · mig 0097) — CRUD/lectura directa web→Supabase
 * (Regla de Oro §2). Solo costos/tokens sumados; nunca el contenido de las llamadas. La
 * UI que lo usa está gateada a admin/súper admin por su route-group.
 *
 * Periodo = mes en curso para los totales/desgloses; serie = últimos 30 días. Con la
 * tabla vacía devuelve 0 REAL (no placeholder) y se puebla solo cuando haya uso.
 */

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Rótulos legibles de los pasos del pipeline (`paso` crudo → etiqueta). */
const ETIQUETA_PASO: Record<string, string> = {
  clasificador: 'Clasificación (Haiku)',
  juicio: 'Evaluación (juicio)',
  excepcion: 'Excepción',
  chat: 'Chat con Eco',
  borrador_consulta: 'Borrador de consulta',
  borrador_anuncio: 'Borrador de anuncio',
};

/** Formatea USD con 2–4 decimales (los costos de TTS/LLM son fracciones de centavo). */
function usd(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
}

export async function getGastoEco(userId: string): Promise<GastoEco> {
  const hoy = new Date();
  const periodo = `${MESES[hoy.getMonth()]} ${hoy.getFullYear()}`;

  const raw = await comoStaff(userId, async (sql) => {
    const [tot, porPaso, porModelo, serie] = await Promise.all([
      sql<{ usd: number; llamadas: number; tokens: number }[]>`
        select
          coalesce(sum(costo_usd), 0)::float8 as usd,
          count(*)::int as llamadas,
          coalesce(sum(tokens_entrada + tokens_salida + tokens_cache_write + tokens_cache_read), 0)::int as tokens
        from lxp.eco_uso
        where created_at >= date_trunc('month', now())`,
      sql<{ paso: string; usd: number }[]>`
        select paso, coalesce(sum(costo_usd), 0)::float8 as usd
        from lxp.eco_uso
        where created_at >= date_trunc('month', now())
        group by paso order by usd desc`,
      sql<{ modelo: string; usd: number; tokens: number }[]>`
        select modelo,
               coalesce(sum(costo_usd), 0)::float8 as usd,
               coalesce(sum(tokens_entrada + tokens_salida + tokens_cache_write + tokens_cache_read), 0)::int as tokens
        from lxp.eco_uso
        where created_at >= date_trunc('month', now())
        group by modelo order by usd desc`,
      // Serie diaria de los últimos 30 días, con días sin uso en 0 (generate_series).
      sql<{ dia: string; usd: number }[]>`
        select to_char(d, 'YYYY-MM-DD') as dia, coalesce(sum(u.costo_usd), 0)::float8 as usd
        from generate_series(
          date_trunc('day', now()) - interval '29 days',
          date_trunc('day', now()),
          interval '1 day'
        ) d
        left join lxp.eco_uso u on date_trunc('day', u.created_at) = d
        group by d order by d`,
    ]);
    return { tot: tot[0]!, porPaso, porModelo, serie };
  });

  const totalUsd = raw.tot.usd;
  const pct = (v: number) => (totalUsd > 0 ? Math.round((v / totalUsd) * 100) : 0);

  const porPaso: GastoEcoDesglose[] = raw.porPaso.map((r) => ({
    etiqueta: ETIQUETA_PASO[r.paso] ?? r.paso,
    usd: r.usd,
    fmt: usd(r.usd),
    pct: pct(r.usd),
  }));

  const porModelo: GastoEcoDesglose[] = raw.porModelo.map((r) => ({
    etiqueta: r.modelo,
    usd: r.usd,
    fmt: usd(r.usd),
    pct: pct(r.usd),
    tokens: r.tokens,
  }));

  const serie: GastoEcoPunto[] = raw.serie.map((r) => ({
    // Etiqueta corta "dd/mm" para el eje (la serie ya viene ordenada por día).
    x: `${r.dia.slice(8, 10)}/${r.dia.slice(5, 7)}`,
    v: Number(r.usd),
  }));

  return {
    periodo,
    moneda: 'USD',
    totalUsd,
    totalFmt: usd(totalUsd),
    llamadas: raw.tot.llamadas,
    tokens: raw.tot.tokens,
    porPaso,
    porModelo,
    serie,
  };
}
