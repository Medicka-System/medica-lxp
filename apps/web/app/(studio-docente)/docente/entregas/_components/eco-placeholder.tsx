'use client';

/**
 * Eco en la pantalla de Entregas — PRE-ANÁLISIS placeholder (§7A · «Eco propone; el
 * humano decide»).
 *
 * Esto es SOLO el hueco del pre-análisis en lote (la tarjeta de nota/comentario
 * sugeridos contra la rúbrica): datos de EJEMPLO hasta que el pipeline deje propuestas
 * en `lxp.eco_propuestas`. El CHAT conversacional de esta pantalla ya NO vive aquí: usa
 * el componente real <ChatEco> (endpoint `POST /ai/eco`), montado en `vista-actividad`.
 *
 * Todo lo real (bandeja, rúbrica, asentar nota) vive fuera de este archivo. VIOLETA =
 * Eco, nunca alerta (§5A).
 */

import { Check, Sparkles, TriangleAlert } from 'lucide-react';
import { kicker, softText, mono } from '@/lib/studio/estilos';
import type { CriterioRubricaVista, PreAnalisisEcoPlaceholder } from '../../../_lib/contrato';

/** Nº de entregas que Eco confirmaría en lote — EJEMPLO (no hay pipeline). */
export const ECO_LOTE_EJEMPLO = 2;

/**
 * Arma un pre-análisis de EJEMPLO plausible contra la rúbrica real de la actividad, para
 * que el hueco de Eco se vea con su estructura. `esPlaceholder: true` lo marca. Cuando
 * Eco se conecte, esto lo reemplaza la propuesta real (`lxp.eco_propuestas`).
 */
export function preAnalisisEjemplo(
  rubrica: CriterioRubricaVista[] | null,
): PreAnalisisEcoPlaceholder {
  const sustento: PreAnalisisEcoPlaceholder['sustento'] = (rubrica ?? []).map((c, i) => ({
    clase: i % 2 === 0 ? 'ok' : 'falta',
    texto:
      i % 2 === 0
        ? `Cumple «${c.texto}» (${c.peso}%)`
        : `Le falta afianzar «${c.texto}» (${c.peso}%)`,
  }));
  if (sustento.length === 0) {
    sustento.push(
      { clase: 'ok', texto: 'El razonamiento principal es correcto.' },
      { clase: 'falta', texto: 'Faltan detalles de la ejecución.' },
    );
  }
  return {
    notaSugerida: 8.5,
    confianza: 'media',
    sustento,
    comentario:
      'Doctor: el análisis va bien encaminado; complete lo que quedó pendiente y afine la ejecución. (Comentario de ejemplo — Eco aún no está conectado.)',
    esPlaceholder: true,
  };
}

/** Cinta que deja claro, en cualquier superficie de Eco, que es un placeholder. */
function CintaPlaceholder() {
  return (
    <span
      className={`${mono} inline-flex h-[18px] items-center rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[9.5px] font-bold text-[color:var(--info-foreground)]`}
    >
      ejemplo · sin conectar
    </span>
  );
}

/** Tarjeta de pre-análisis de Eco (violeta) — placeholder con la estructura del mock. */
export function TarjetaPreAnalisisEco({ pre }: { pre: PreAnalisisEcoPlaceholder }) {
  return (
    <section className="rounded-xl border border-[color:var(--info-border)] bg-card p-5 shadow-rest">
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <p className={`${kicker} text-[color:var(--info-foreground)]`}>Pre-análisis de Eco</p>
        <span className="ml-auto">
          <CintaPlaceholder />
        </span>
      </div>

      <div className="mt-3.5 flex items-end gap-3">
        <span className={`${mono} text-[40px] font-extrabold leading-none tracking-[-0.03em]`}>
          {pre.notaSugerida.toFixed(1)}
        </span>
        <span className="pb-1">
          <span className="block text-[11.5px] font-bold text-[color:var(--info-foreground)]">nota sugerida</span>
          <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>confianza {pre.confianza}</span>
        </span>
      </div>

      <p className="mt-3.5 text-[11px] font-bold">En qué se basó</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {pre.sustento.map((s, i) => (
          <li key={i} className="flex items-start gap-2">
            {s.clase === 'ok' ? (
              <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={2.6} />
            ) : (
              <TriangleAlert
                aria-hidden
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--warning-foreground)]"
                strokeWidth={2}
              />
            )}
            <span
              className={`min-w-0 flex-1 text-[12px] font-medium leading-relaxed ${
                s.clase === 'ok' ? softText : 'text-[color:var(--warning-foreground)]'
              }`}
            >
              {s.texto}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[11px] font-bold">Comentario redactado</p>
      <div className="mt-2 rounded-[10px] border border-border bg-muted p-3">
        <p className={`text-[12.5px] leading-relaxed ${softText}`}>{pre.comentario}</p>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {['Más breve', 'Más exigente', 'Editar'].map((t) => (
          <button
            key={t}
            type="button"
            disabled
            title="Eco aún no está conectado"
            className={`h-8 cursor-not-allowed rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold opacity-60 ${softText}`}
          >
            {t}
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-[11px] leading-snug text-muted-foreground">
        Eco propondrá aquí la nota y el comentario contra la rúbrica; usted confirma abajo. Nada se asienta sin
        usted (§7A).
      </p>
    </section>
  );
}
