'use client';

/**
 * Eco en la pantalla de Entregas — PLACEHOLDER (§7A · «Eco propone; el humano decide»).
 *
 * El ESPACIO donde Eco vivirá está listo y cableado a stubs; NO hay pipeline conectado
 * (ni `analizarConEco`, ni chat conversacional). Los datos son de EJEMPLO. Eco se
 * enchufa AL FINAL: cuando exista, esta capa se reemplaza por lecturas de
 * `lxp.eco_propuestas` (pre-análisis) y por el endpoint conversacional del `api`.
 *
 * Todo lo real (bandeja, rúbrica, asentar nota) vive fuera de este archivo. Aquí solo
 * el hueco de Eco. VIOLETA = Eco, nunca alerta (§5A).
 */

import { useState } from 'react';
import { Check, Copy, Send, Sparkles, TriangleAlert, X } from 'lucide-react';
import { kicker, softText, mono, focusRing } from '@/lib/studio/estilos';
import { Avatar } from '@/components/avatar';
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

/** Conversación de EJEMPLO del panel de Eco (misma del mock aprobado). */
const CONVERSACION = [
  { id: 'm1', de: 'docente' as const, texto: '¿Quién está batallando?' },
  {
    id: 'm2',
    de: 'ia' as const,
    texto: 'Tres alumnos del grupo, y los tres por lo mismo: no miden la cortical.',
    alumnos: [
      { ini: 'HC', nombre: 'Dr. Hugo Cuevas', porque: '2 tareas por debajo de 7 · falló las preguntas 4 y 7', chip: 'Fuera de rúbrica' },
      { ini: 'JG', nombre: 'Dr. Jorge Guzmán', porque: 'autoevaluación 7.0 · entrega tarde 3 de 4 veces', chip: 'Se atrasa' },
      { ini: 'IT', nombre: 'Dr. Iván Torres', porque: 'entiende el grado, no ejecuta la medición', chip: 'Ejecución' },
    ],
    acciones: [{ etiqueta: 'Redactar feedback a los 3', primaria: true }, { etiqueta: 'Abrir sus entregas' }],
  },
];

const SUGERENCIAS = [
  'Resume las entregas del grupo',
  '¿Quién está batallando?',
  'Redacta feedback para los de nota baja',
  '¿Qué tema conviene repasar?',
];

/**
 * Panel de Eco: riel colapsado (56px) ↔ panel de chat. PLACEHOLDER — la conversación es
 * de ejemplo y el envío es un stub (no llama a ningún endpoint). Se enchufa al final.
 */
export function PanelEco() {
  const [abierta, setAbierta] = useState(false);
  const [peticion, setPeticion] = useState('');
  const [aviso, setAviso] = useState(false);

  if (!abierta) {
    return (
      <aside
        aria-label="Eco"
        className="flex w-14 shrink-0 flex-col items-center gap-3 rounded-[14px] border border-[color:var(--info-border)] bg-card py-3.5 shadow-rest"
      >
        <button
          type="button"
          onClick={() => setAbierta(true)}
          aria-label="Abrir Eco"
          className={`grid h-9 w-9 place-items-center rounded-[10px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)] transition-colors hover:bg-[color:var(--info-foreground)] hover:text-white ${focusRing}`}
        >
          <Sparkles className="h-[19px] w-[19px]" strokeWidth={1.75} />
        </button>
        <span
          aria-hidden
          className={`${kicker} text-[color:var(--info-foreground)]`}
          style={{ writingMode: 'vertical-rl' }}
        >
          Asistente
        </span>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Eco"
      className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card shadow-rest"
    >
      <div className="flex items-center gap-2.5 border-b border-border bg-[color:var(--info-surface)] px-4 py-3.5">
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-[color:var(--info-foreground)] text-white"
        >
          <Sparkles className="h-[17px] w-[17px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold leading-tight">Eco</p>
          <p className="mt-0.5 text-[11px] text-[color:var(--info-foreground)]">Propone · usted confirma</p>
        </div>
        <button
          type="button"
          onClick={() => setAbierta(false)}
          aria-label="Cerrar Eco"
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
        >
          <X aria-hidden className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div className="flex items-center gap-2 rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 py-2">
          <Sparkles aria-hidden className="h-3.5 w-3.5 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
          <p className="text-[11px] leading-snug text-[color:var(--info-foreground)]">
            Conversación de ejemplo — Eco todavía no está conectado.
          </p>
        </div>

        {CONVERSACION.map((m) =>
          m.de === 'docente' ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[84%] rounded-[14px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-sidebar-foreground">
                {m.texto}
              </p>
            </div>
          ) : (
            <div key={m.id} className="flex gap-2.5">
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
              >
                <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] leading-relaxed ${softText}`}>{m.texto}</p>
                {m.alumnos && (
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {m.alumnos.map((a) => (
                      <li key={a.ini} className="flex gap-2.5 rounded-[10px] border border-border px-2.5 py-2.5">
                        <Avatar ini={a.ini} size={30} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[12px] font-bold">{a.nombre}</span>
                            <span className="inline-flex h-[18px] items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-1.5 text-[9.5px] font-bold text-[color:var(--warning-foreground)]">
                              {a.chip}
                            </span>
                          </span>
                          <span className={`mt-1 block text-[11.5px] leading-relaxed ${softText}`}>{a.porque}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {m.acciones && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.acciones.map((a) => (
                      <button
                        key={a.etiqueta}
                        type="button"
                        disabled
                        title="Eco aún no está conectado"
                        className={`inline-flex h-9 cursor-not-allowed items-center gap-1.5 rounded-[9px] px-3 text-[12.5px] font-semibold opacity-60 ${
                          a.primaria
                            ? 'bg-primary font-bold text-[color:var(--sidebar)]'
                            : 'border border-border bg-card text-foreground'
                        }`}
                      >
                        {a.primaria ? (
                          <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                        ) : (
                          <Copy aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                        )}
                        {a.etiqueta}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ),
        )}

        {aviso && (
          <p className="rounded-[10px] border border-border bg-muted px-3 py-2 text-[11.5px] leading-snug text-muted-foreground">
            Eco todavía no está conectado. Cuando lo esté, responderá aquí con trabajo hecho y usted decidirá qué
            hacer con él.
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-4 pb-4 pt-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {SUGERENCIAS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setAviso(true)}
              className={`h-8 shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11.5px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="mt-2.5 flex h-11 items-center gap-2.5 rounded-full border border-border bg-muted px-4"
          onSubmit={(e) => {
            e.preventDefault();
            setAviso(true);
            setPeticion('');
          }}
        >
          <span className="sr-only">Pedirle trabajo a Eco</span>
          <input
            type="text"
            value={peticion}
            onChange={(e) => setPeticion(e.target.value)}
            placeholder="Pídale trabajo a Eco…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Enviar"
            className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
          >
            <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </aside>
  );
}
