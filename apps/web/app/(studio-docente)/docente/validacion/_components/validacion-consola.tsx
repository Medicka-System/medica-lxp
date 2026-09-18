'use client';

/**
 * Validación de casos — la herramienta diaria del DOCENTE (§5B). El alumno sube su
 * caso (DICOM + hallazgos) a su bitácora; el docente lo juzga: APRUEBA o RECHAZA con
 * feedback. Al aprobar se acreditan las horas y se recalcula su competencia I-AIM
 * (esto último en el worker · PENDIENTE DE API).
 *
 * Tres zonas (referencia: campus-lxp-mocks/studio/docente/validacion): bandeja
 * (izquierda, separada por confianza de Eco) · detalle del caso con el VISOR DICOM
 * real (centro) · Eco colapsable (derecha).
 *
 * CONECTADO (§7A · 5.3): la cola (RLS `es_staff`), la decisión (`validarCaso`), y el
 * PRE-ANÁLISIS de Eco: se LEE de `lxp.eco_propuestas` (en `datos.ts`), se DISPARA con
 * `analizarConEco` y, al validar, se cierra la propuesta con `confirmarPropuestaEco`
 * (loop de mejora `eco_correcciones`). El VISOR DICOM real (Cornerstone3D) reemplaza
 * al placeholder: se monta cuando el caso tiene estudio anonimizado.
 *
 * Color: violeta = Eco (nunca alerta); ámbar = lo urgente (>72 h) y "requiere criterio";
 * sin rojo — pedir corrección no es una falta (§5A).
 */

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check,
  Clock,
  ScanLine,
  Search,
  Sparkles,
  TriangleAlert,
  Wand2,
  X,
} from 'lucide-react';
import { VisorDicom } from '@/components/dicom';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import { haceCuanto } from '@/lib/format';
import { DOMINIO_LABEL, type CasoValidacion } from '../../../_lib/contrato';
import { validarCaso } from '../../../_lib/acciones';
import { analizarConEco, confirmarPropuestaEco } from '../../../_lib/eco.server';
import { EcoRailValidacion } from './eco-rail';

function metaCaso(c: CasoValidacion): string {
  return [c.modulo, c.organo, c.dominio ? DOMINIO_LABEL[c.dominio] : null]
    .filter(Boolean)
    .join(' · ');
}

/** Orden de la bandeja por confianza (§7A): listos → requieren criterio → sin analizar. */
function ordenEco(c: CasoValidacion): number {
  if (!c.eco) return 2;
  return c.eco.clasificacion === 'listo' ? 0 : 1;
}

export function ValidacionConsola({ casos }: { casos: CasoValidacion[] }) {
  const router = useRouter();
  const [pendientes, setPendientes] = useState(casos);
  const [seleccionId, setSeleccionId] = useState<string | null>(casos[0]?.id ?? null);
  const [filtro, setFiltro] = useState('');
  const [feedback, setFeedback] = useState('');
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ecoAviso, setEcoAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ecoAbierta, setEcoAbierta] = useState(false);
  const [enviando, startTransition] = useTransition();
  const [analizando, startAnalisis] = useTransition();

  // Sincroniza la lista si el servidor revalida (aprobar/rechazar/analizar → revalidatePath).
  useEffect(() => {
    setPendientes(casos);
    setSeleccionId((prev) => (prev && casos.some((c) => c.id === prev) ? prev : casos[0]?.id ?? null));
  }, [casos]);

  const seleccion = pendientes.find((c) => c.id === seleccionId) ?? null;

  // Al cambiar de caso, prellena el feedback con el BORRADOR de Eco (si lo dejó · §7A).
  useEffect(() => {
    setFeedback(seleccion?.eco?.feedbackBorrador ?? '');
    setResultado(null);
    setEcoAviso(null);
  }, [seleccionId, seleccion?.eco?.feedbackBorrador]);

  const listaFiltrada = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const base = q
      ? pendientes.filter(
          (c) =>
            c.alumno.toLowerCase().includes(q) ||
            (c.organo ?? '').toLowerCase().includes(q) ||
            (c.presuntivo ?? '').toLowerCase().includes(q),
        )
      : pendientes;
    return [...base].sort((a, b) => ordenEco(a) - ordenEco(b));
  }, [pendientes, filtro]);

  const conteos = useMemo(() => {
    let listos = 0;
    let criterio = 0;
    let sin = 0;
    for (const c of pendientes) {
      if (!c.eco) sin += 1;
      else if (c.eco.clasificacion === 'listo') listos += 1;
      else criterio += 1;
    }
    return { listos, criterio, sin };
  }, [pendientes]);

  function analizar() {
    if (!seleccion) return;
    const grupoId = seleccion.grupoId;
    startAnalisis(async () => {
      const r = await analizarConEco({ grupoId, modo: 'casos' });
      if (!r.ok) {
        setEcoAviso({ ok: false, texto: r.error });
        return;
      }
      setEcoAviso({
        ok: true,
        texto: `Eco pre-analizó ${r.resumen?.total ?? 0} caso(s): ${r.resumen?.listos ?? 0} listos · ${r.resumen?.requierenCriterio ?? 0} requieren tu criterio.`,
      });
      router.refresh();
    });
  }

  function decidir(decision: 'aprobado' | 'rechazado') {
    if (!seleccion) return;
    const casoId = seleccion.id;
    const propuestaId = seleccion.eco?.propuestaId ?? null;
    startTransition(async () => {
      const r = await validarCaso({ casoId, decision, feedback });
      if (!r.ok) {
        setResultado({ ok: false, texto: r.error });
        return;
      }
      // Cierre humano de la propuesta de Eco (loop de mejora · §7A). Best-effort: el
      // asiento clínico ya quedó; no bloqueamos la UI si Eco no responde.
      if (propuestaId) {
        await confirmarPropuestaEco({ propuestaId, feedback });
      }
      setResultado({
        ok: true,
        texto:
          decision === 'aprobado'
            ? `Caso aprobado y firmado. +${seleccion.horas} h acreditadas · su competencia I-AIM se recalcula en segundo plano.`
            : 'Caso devuelto al alumno con su feedback para corrección.',
      });
      // Quita el caso de la cola local y avanza al siguiente.
      setPendientes((prev) => {
        const resto = prev.filter((c) => c.id !== casoId);
        setSeleccionId(resto[0]?.id ?? null);
        return resto;
      });
      router.refresh();
    });
  }

  return (
    <div className="flex h-[calc(100dvh-60px)] min-h-0">
      {/* ════════ 1 · BANDEJA ════════ */}
      <aside className="flex w-[340px] shrink-0 flex-col overflow-hidden border-r border-border bg-card">
        <div className="shrink-0 border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[15px] font-extrabold tracking-[-0.015em]">Por validar</h1>
            <span className={`${mono} text-[13px] font-bold text-muted-foreground`}>
              {pendientes.length}
            </span>
          </div>
          <label className="mt-2.5 flex h-9 items-center gap-2 rounded-[9px] border border-border bg-muted px-2.5 transition-colors focus-within:border-secondary">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno u órgano</span>
            <input
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar alumno u órgano…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          {/* Bandeja separada por confianza de Eco (§7A). */}
          {conteos.listos + conteos.criterio > 0 ? (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold">
              <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-accent px-2 text-accent-foreground">
                <Check aria-hidden className="h-3 w-3" strokeWidth={2.4} /> {conteos.listos} listos
              </span>
              <span className="inline-flex h-[22px] items-center gap-1 rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2 text-[color:var(--warning-foreground)]">
                <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2} /> {conteos.criterio} criterio
              </span>
              {conteos.sin > 0 && (
                <span className="text-muted-foreground">· {conteos.sin} sin analizar</span>
              )}
            </div>
          ) : (
            <div className="mt-2.5 flex items-center gap-1.5 rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 py-2">
              <Sparkles aria-hidden className="h-3.5 w-3.5 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 text-[11px] font-semibold leading-snug text-[color:var(--info-foreground)]">
                Pide a Eco que pre-analice el grupo para ordenar por confianza
              </span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-2">
          {listaFiltrada.length === 0 ? (
            <p className={`px-4 py-6 text-center text-[12.5px] ${softText}`}>
              {pendientes.length === 0 ? 'No hay casos por validar.' : 'Sin coincidencias.'}
            </p>
          ) : (
            listaFiltrada.map((c) => {
              const on = c.id === seleccionId;
              const urge = c.horasEnCola >= 72;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSeleccionId(c.id)}
                  aria-current={on ? 'true' : undefined}
                  className={`flex w-full gap-2.5 rounded-r-[10px] border-l-[3px] p-3 text-left transition-colors ${focusRing} ${
                    on ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted'
                  }`}
                >
                  <span
                    aria-hidden
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar text-[11px] font-bold text-sidebar-foreground"
                  >
                    {c.iniciales}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={`min-w-0 flex-1 truncate text-[12.5px] ${on ? 'font-bold text-accent-foreground' : 'font-semibold text-foreground'}`}>
                        {c.alumno}
                      </span>
                      <span className={`${mono} inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[10.5px] ${urge ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'}`}>
                        {urge && <TriangleAlert aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />}
                        {haceCuanto(c.creadoEn)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {metaCaso(c) || 'Sin módulo'}
                    </span>
                    {c.eco && (
                      <span
                        className={`mt-1.5 inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[10px] font-bold ${
                          c.eco.clasificacion === 'listo'
                            ? 'bg-accent text-accent-foreground'
                            : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                        }`}
                      >
                        <Sparkles aria-hidden className="h-2.5 w-2.5" strokeWidth={2} />
                        {c.eco.clasificacion === 'listo' ? 'Listo' : 'Requiere criterio'}
                        <span className={mono}>· {Math.round(c.eco.confianza * 100)}%</span>
                      </span>
                    )}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ════════ 2 · DETALLE ════════ */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {seleccion ? (
          <>
            <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3.5">
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar text-[12px] font-bold text-sidebar-foreground"
              >
                {seleccion.iniciales}
              </span>
              <div className="min-w-0">
                <p className="text-[14.5px] font-bold leading-tight">{seleccion.alumno}</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{metaCaso(seleccion) || 'Sin módulo'}</p>
              </div>
              {seleccion.horasEnCola >= 72 && (
                <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
                  <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2} />
                  {Math.floor(seleccion.horasEnCola / 24)} días esperando
                </span>
              )}
              {/* Disparar el pre-análisis de Eco del grupo (§7A). */}
              <button
                type="button"
                onClick={analizar}
                disabled={analizando || !seleccion.grupoId}
                title={seleccion.grupoId ? undefined : 'El caso no tiene grupo asociado'}
                className={`ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-[color:var(--info-foreground)] hover:text-white disabled:opacity-50 ${focusRing}`}
              >
                {analizando ? (
                  <Clock aria-hidden className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                ) : (
                  <Wand2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                {seleccion.eco ? 'Re-analizar con Eco' : 'Analizar con Eco'}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-4">
              {ecoAviso && (
                <div
                  role="status"
                  className={`mb-4 flex items-start gap-2.5 rounded-[11px] border px-3.5 py-3 text-[12.5px] font-medium ${
                    ecoAviso.ok
                      ? 'border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
                      : 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                  }`}
                >
                  <Sparkles aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span>{ecoAviso.texto}</span>
                </div>
              )}

              {/* ── VISOR DICOM real (Cornerstone3D · §4.7) ─────────────────────── */}
              <section className="overflow-hidden rounded-xl border border-border" style={{ background: 'var(--sidebar)' }}>
                <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
                  <span className={`${kicker} text-white/55`}>Estudio DICOM</span>
                  <span className="ml-auto flex items-center gap-2.5">
                    <span className={`${mono} text-[11px] text-white/60`}>
                      {seleccion.series} {seleccion.series === 1 ? 'pieza' : 'piezas'}
                      {seleccion.cineLoop ? ' · cine-loop' : ''}
                    </span>
                    <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary/[0.16] px-2.5 text-[10.5px] font-bold text-primary">
                      <Check aria-hidden className="h-2.5 w-2.5" strokeWidth={2.6} />
                      Anonimizado
                    </span>
                  </span>
                </div>
                {seleccion.estudio ? (
                  <VisorDicom estudio={seleccion.estudio} className="h-[360px] w-full" />
                ) : (
                  <div className="relative grid h-[260px] place-items-center" style={{ background: '#0a2140' }}>
                    <span
                      aria-hidden
                      className="absolute inset-0"
                      style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)' }}
                    />
                    <div className="relative flex flex-col items-center gap-2 text-center">
                      <ScanLine aria-hidden className="h-7 w-7 text-white/45" strokeWidth={1.5} />
                      <p className={`${mono} text-[11px] uppercase tracking-[0.14em] text-white/55`}>
                        Sin estudio anonimizado
                      </p>
                      <p className="max-w-[40ch] text-[11.5px] leading-relaxed text-white/45">
                        El visor Cornerstone3D se monta en cuanto el pipeline de ingesta
                        (`procesar-dicom`) deja el estudio anonimizado del caso.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* ── Pre-análisis de Eco (real · §7A) ────────────────────────────── */}
              {seleccion.eco && (
                <section
                  className="mt-4 rounded-xl border border-[color:var(--info-border)] p-[18px] shadow-rest"
                  style={{ background: '#fbfbff' }}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]">
                      <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
                    </span>
                    <p className={`${kicker} text-[color:var(--info-foreground)]`}>Pre-análisis de Eco</p>
                    <span
                      className={`inline-flex h-[22px] items-center gap-1 rounded-full px-2 text-[10.5px] font-bold ${
                        seleccion.eco.clasificacion === 'listo'
                          ? 'bg-accent text-accent-foreground'
                          : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                      }`}
                    >
                      {seleccion.eco.clasificacion === 'listo' ? 'Listo para confirmar' : 'Requiere tu criterio'}
                    </span>
                    <span className={`ml-auto ${mono} text-[11.5px] text-muted-foreground`}>
                      confianza {Math.round(seleccion.eco.confianza * 100)}%
                      {seleccion.eco.notaSugerida != null
                        ? ` · coincide ${Math.round(seleccion.eco.notaSugerida)}/100`
                        : ''}
                    </span>
                  </div>

                  {seleccion.eco.criterios.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {seleccion.eco.criterios.map((cr, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px]">
                          <span className={`${mono} mt-0.5 shrink-0 font-bold text-secondary`}>{Math.round(cr.puntaje)}</span>
                          <span className={softText}>
                            <span className="font-semibold text-foreground">{cr.criterio}</span>
                            {cr.comentario ? ` — ${cr.comentario}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {seleccion.eco.omisiones.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {seleccion.eco.omisiones.map((o, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--warning-foreground)]"
                        >
                          Omisión: {o}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className={`mt-3 text-[11.5px] leading-snug text-muted-foreground`}>
                    <Sparkles aria-hidden className="mr-1 inline h-3 w-3 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
                    Eco propone contra la verdad del caso; usted firma. El borrador de abajo se
                    prellenó con su devolución{seleccion.eco.modelo ? ` (${seleccion.eco.modelo})` : ''}.
                  </p>
                </section>
              )}

              {/* lo que reportó el alumno */}
              <section className="mt-4 rounded-xl border border-border bg-card p-[18px] shadow-rest">
                <p className={`${kicker} text-muted-foreground`}>Lo que reportó el alumno</p>
                {(
                  [
                    ['Hallazgos', seleccion.hallazgos],
                    ['Diagnóstico presuntivo', seleccion.presuntivo],
                  ] as const
                ).map(([t, v]) => (
                  <div key={t} className="mt-3.5">
                    <p className="text-[11px] font-bold">{t}</p>
                    <p className={`mt-1.5 text-[13px] leading-relaxed ${softText}`}>
                      {v || <span className="italic text-muted-foreground">Sin capturar</span>}
                    </p>
                  </div>
                ))}
                <p className={`${mono} mt-4 border-t border-border pt-3 text-[11.5px] text-muted-foreground`}>
                  en cola desde {haceCuanto(seleccion.creadoEn)} · acredita {seleccion.horas} h
                </p>
              </section>

              {/* feedback editable */}
              <section className="mt-4 rounded-xl border border-border bg-card p-[18px] shadow-rest">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className={`${kicker} text-muted-foreground`}>Feedback para el alumno</p>
                  {seleccion.eco?.feedbackBorrador && (
                    <button
                      type="button"
                      onClick={() => setFeedback(seleccion.eco!.feedbackBorrador ?? '')}
                      className={`inline-flex h-[22px] items-center gap-1.5 rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-[color:var(--info-foreground)] hover:text-white ${focusRing}`}
                    >
                      <Sparkles aria-hidden className="h-[11px] w-[11px]" strokeWidth={1.75} />
                      Usar borrador de Eco
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Escriba su devolución. Al rechazar es obligatoria: dígale al alumno qué corregir."
                  className="mt-3 w-full resize-none rounded-[11px] border border-border bg-muted px-3.5 py-3 text-[13px] leading-relaxed text-foreground outline-none transition-colors focus:border-secondary"
                />
                <p className="mt-2.5 text-[11.5px] text-muted-foreground">
                  El alumno recibe exactamente lo que usted firme.
                </p>
              </section>

              {resultado && (
                <div
                  role="status"
                  className={`mt-4 flex items-start gap-2.5 rounded-[11px] border px-3.5 py-3 text-[12.5px] font-medium ${
                    resultado.ok
                      ? 'border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
                      : 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                  }`}
                >
                  {resultado.ok ? (
                    <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} />
                  ) : (
                    <TriangleAlert aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
                  )}
                  <span>{resultado.texto}</span>
                </div>
              )}
            </div>

            {/* barra de firma */}
            <div className="flex shrink-0 flex-wrap items-center gap-3.5 border-t border-border bg-card px-5 py-3.5">
              <p className="min-w-[200px] flex-1 text-[11.5px] leading-snug text-muted-foreground">
                <Sparkles aria-hidden className="mr-1 inline h-3 w-3 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
                Eco propone; <span className="font-bold text-foreground">usted firma</span>. Al aprobar
                se acreditan <span className={`${mono} font-bold text-foreground`}>{seleccion.horas} h</span> y se
                recalcula su competencia I-AIM.
              </p>
              <span className="ml-auto flex shrink-0 items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => decidir('rechazado')}
                  disabled={enviando}
                  className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50 ${focusRing}`}
                >
                  <X aria-hidden className="h-4 w-4" strokeWidth={2.2} />
                  Rechazar y pedir corrección
                </button>
                <button
                  type="button"
                  onClick={() => decidir('aprobado')}
                  disabled={enviando}
                  className={`inline-flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
                >
                  {enviando ? (
                    <Clock aria-hidden className="h-[17px] w-[17px] animate-spin" strokeWidth={2} />
                  ) : (
                    <Check aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.4} />
                  )}
                  Aprobar y acreditar
                </button>
              </span>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div>
              <span aria-hidden className="inline-grid h-[52px] w-[52px] place-items-center rounded-full bg-accent text-accent-foreground">
                <Check className="h-[26px] w-[26px]" strokeWidth={2.2} />
              </span>
              <h2 className="mt-3.5 text-[18px] font-extrabold tracking-[-0.015em]">Bandeja al día</h2>
              <p className={`mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed ${softText}`}>
                No hay casos esperando su validación. Cuando un alumno suba un caso, aparecerá en esta
                cola.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ════════ 3 · ECO (colapsable) ════════ */}
      <EcoRailValidacion abierta={ecoAbierta} onAbrir={() => setEcoAbierta(true)} onCerrar={() => setEcoAbierta(false)} />
    </div>
  );
}
