'use client';

/**
 * Validación de casos — la herramienta diaria del DOCENTE (§5B). El alumno sube su caso
 * (DICOM + hallazgos) a su bitácora; el docente lo juzga: APRUEBA o RECHAZA con feedback.
 * Al aprobar se acreditan las horas y se recalcula su competencia I-AIM (en el worker).
 *
 * Tres zonas: BANDEJA agrupada por alumno (izquierda) · área principal (centro) · Eco
 * colapsable (derecha). El área principal muestra:
 *   • al elegir un ALUMNO (cabecera del grupo o link ?alumno) → la REJILLA de todos sus
 *     estudios (`EstudiosAlumno`);
 *   • al elegir un CASO (sub-fila de la bandeja o card de la rejilla) → el DETALLE con el
 *     visor DICOM real, de solo lectura si el estudio ya está aprobado/devuelto.
 *
 * CONECTADO (§7A · 5.3): la cola (RLS `es_staff`), la decisión (`validarCaso`), y el
 * PRE-ANÁLISIS de Eco del DETALLE (se lee de `lxp.eco_propuestas`, se dispara con
 * `analizarConEco`, se cierra con `confirmarPropuestaEco`). El VISOR DICOM real
 * (Cornerstone3D) se monta cuando el caso tiene estudio anonimizado.
 *
 * PLACEHOLDER de Eco (esta fase): la sugerencia de Eco de la REJILLA (chip del card) es un
 * stub del cliente, y el CHAT conversacional (`eco-rail`) sigue en modo demostración —
 * ninguno consulta el api real. Se conectan en una fase posterior.
 *
 * Color: violeta = Eco (nunca alerta); ámbar = lo urgente (>72 h) y "requiere criterio";
 * sin rojo — pedir corrección no es una falta (§5A).
 */

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronDown,
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
import { DOMINIO_LABEL, type CasoValidacion, type EstudiosAlumnoData } from '../../../_lib/contrato';
import {
  aprobarCasosLote,
  cargarCasoValidacion,
  cargarEstudiosAlumno,
  validarCaso,
} from '../../../_lib/acciones';
import { analizarConEco, confirmarPropuestaEco } from '../../../_lib/eco.server';
import { EcoRailValidacion } from './eco-rail';
import { EstudiosAlumno } from './estudios-alumno/estudios-alumno';

function metaCaso(c: CasoValidacion): string {
  return [c.modulo, c.organo, c.dominio ? DOMINIO_LABEL[c.dominio] : null]
    .filter(Boolean)
    .join(' · ');
}

/** Espera del caso en la cola, corta: "4 h", "1 día", "3 días". */
function esperaCorta(horas: number): string {
  if (horas < 24) return `${horas} h`;
  const d = Math.floor(horas / 24);
  return `${d} ${d === 1 ? 'día' : 'días'}`;
}

// ── Veredicto de Eco para la bandeja (PLACEHOLDER · §7A) ──────────────────────────
type GrupoBandeja = 'listo' | 'criterio';
type VeredictoBandeja = { grupo: GrupoBandeja; veredicto: 'aprobar' | 'revisar'; confianza: 'alta' | 'media' | 'baja' };

/**
 * Separa la cola por confianza para la bandeja. **PLACEHOLDER determinista** por id: Eco NO
 * está conectado a la bandeja en esta fase (§7A) — el veredicto/confianza son mock, con la
 * ESTRUCTURA lista para enchufar Eco real al final. Si el caso YA trae propuesta real de Eco
 * (`c.eco`, de `lxp.eco_propuestas`), se usa esa. Eco propone; el docente firma.
 */
function veredictoBandeja(c: CasoValidacion): VeredictoBandeja {
  if (c.eco) {
    const listo = c.eco.clasificacion === 'listo';
    const confianza = c.eco.confianza >= 0.82 ? 'alta' : c.eco.confianza >= 0.6 ? 'media' : 'baja';
    return { grupo: listo ? 'listo' : 'criterio', veredicto: listo ? 'aprobar' : 'revisar', confianza };
  }
  let h = 0;
  for (let i = 0; i < c.id.length; i++) h = (h * 31 + c.id.charCodeAt(i)) >>> 0;
  const listo = h % 10 < 7; // ~70% listos (mock: 7 de 9)
  const confianza: VeredictoBandeja['confianza'] = listo ? (h % 3 === 0 ? 'media' : 'alta') : 'baja';
  return { grupo: listo ? 'listo' : 'criterio', veredicto: listo ? 'aprobar' : 'revisar', confianza };
}

/**
 * Fila de caso de la bandeja (§ spec Claude Design · barra lateral de Validación). El clic en
 * la fila abre el DETALLE del caso; el clic en el NOMBRE abre los Estudios del alumno. Se logra
 * con un botón-cobertura absoluto (caso) + el nombre como botón por encima (estudios), sin
 * anidar interactivos.
 */
function FilaCola({
  c,
  v,
  seleccionado,
  onAbrirCaso,
  onAbrirEstudios,
}: {
  c: CasoValidacion;
  v: VeredictoBandeja;
  seleccionado: boolean;
  onAbrirCaso: (id: string) => void;
  onAbrirEstudios: (alumnoId: string) => void;
}) {
  const urge = c.horasEnCola >= 72;
  const meta = [c.grupo, c.modulo, c.organo].filter(Boolean).join(' · ') || 'Sin módulo';
  return (
    <li className="group relative">
      {/* Cobertura: clic en cualquier punto de la fila → detalle del caso. */}
      <button
        type="button"
        onClick={() => onAbrirCaso(c.id)}
        aria-current={seleccionado ? 'true' : undefined}
        aria-label={`Validar el caso de ${c.alumno}`}
        className={`absolute inset-0 rounded-r-[10px] border-l-[3px] transition-colors ${focusRing} ${
          seleccionado ? 'border-primary bg-accent' : 'border-transparent group-hover:bg-muted'
        }`}
      />
      <div className="pointer-events-none relative flex gap-[11px] p-3">
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sidebar text-[11px] font-bold text-sidebar-foreground"
        >
          {c.iniciales}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            {/* Nombre: clic → Estudios del alumno (por encima de la cobertura). */}
            <button
              type="button"
              onClick={() => onAbrirEstudios(c.alumnoId)}
              className={`pointer-events-auto min-w-0 flex-1 truncate rounded-sm text-left text-[12.5px] hover:underline ${focusRing} ${
                seleccionado ? 'font-bold text-secondary' : 'font-semibold text-foreground'
              }`}
            >
              {c.alumno}
            </button>
            <span
              className={`${mono} inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[10.5px] ${
                urge ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'
              }`}
            >
              {urge && <TriangleAlert aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />}
              {esperaCorta(c.horasEnCola)}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{meta}</span>
          <span className="mt-[7px] flex items-center gap-1.5">
            <span
              className={`inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-full px-[7px] text-[10px] font-bold ${
                v.veredicto === 'aprobar'
                  ? 'bg-accent text-accent-foreground'
                  : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
              }`}
            >
              {v.veredicto === 'aprobar' ? (
                <Check aria-hidden className="h-2.5 w-2.5" strokeWidth={2.6} />
              ) : (
                <TriangleAlert aria-hidden className="h-2.5 w-2.5" strokeWidth={2.2} />
              )}
              Eco: {v.veredicto === 'aprobar' ? 'aprobar' : 'revisar'}
            </span>
            <span className={`${mono} text-[10px] text-muted-foreground`}>confianza {v.confianza}</span>
          </span>
        </span>
      </div>
    </li>
  );
}

/** Selección de caso en el detalle: id + si se abre de solo lectura (aprobado/devuelto). */
type CasoSel = { casoId: string; soloLectura: boolean };

export function ValidacionConsola({ casos }: { casos: CasoValidacion[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const alumnoParam = params.get('alumno');

  const [pendientes, setPendientes] = useState(casos);
  const [filtro, setFiltro] = useState('');

  // Bandeja: filtro por grupo (selector "Grupo ▾"), "ver los otros N" listos y el lote.
  const [grupoFiltro, setGrupoFiltro] = useState<string | null>(null);
  const [grupoAbierto, setGrupoAbierto] = useState(false);
  const [verTodosListos, setVerTodosListos] = useState(false);
  const [loteModal, setLoteModal] = useState(false);
  const [loteResult, setLoteResult] = useState<{ ok: boolean; texto: string } | null>(null);
  const [aprobandoLote, startLote] = useTransition();

  // Caso abierto en el detalle (ephemeral). El alumno elegido vive en la URL (?alumno=ID).
  const [casoSel, setCasoSel] = useState<CasoSel | null>(null);
  const [casoCargado, setCasoCargado] = useState<CasoValidacion | null>(null);
  const [, startCargaCaso] = useTransition();

  // Rejilla de estudios del alumno (cargada bajo demanda).
  const [datosAlumno, setDatosAlumno] = useState<EstudiosAlumnoData | null>(null);
  const [cargandoAlumno, startCargaAlumno] = useTransition();
  const [avisoAlumno, setAvisoAlumno] = useState<string | null>(null);

  const [feedback, setFeedback] = useState('');
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ecoAviso, setEcoAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ecoAbierta, setEcoAbierta] = useState(false);
  const [enviando, startTransition] = useTransition();
  const [analizando, startAnalisis] = useTransition();

  // Sincroniza la lista si el servidor revalida (aprobar/rechazar/analizar → revalidatePath).
  useEffect(() => {
    setPendientes(casos);
  }, [casos]);

  // Carga la rejilla del alumno cuando cambia ?alumno (link/atrás del navegador incluidos).
  useEffect(() => {
    if (!alumnoParam) {
      setDatosAlumno(null);
      return;
    }
    let vivo = true;
    setDatosAlumno(null);
    setAvisoAlumno(null);
    startCargaAlumno(async () => {
      const d = await cargarEstudiosAlumno(alumnoParam);
      if (vivo) setDatosAlumno(d);
    });
    return () => {
      vivo = false;
    };
  }, [alumnoParam]);

  // Caso pendiente → ya está en la cola; aprobado/devuelto → se carga aparte (solo lectura).
  useEffect(() => {
    if (!casoSel || pendientes.some((c) => c.id === casoSel.casoId)) {
      setCasoCargado(null);
      return;
    }
    let vivo = true;
    startCargaCaso(async () => {
      const c = await cargarCasoValidacion(casoSel.casoId);
      if (vivo) setCasoCargado(c);
    });
    return () => {
      vivo = false;
    };
  }, [casoSel, pendientes]);

  const casoActivo = casoSel
    ? pendientes.find((c) => c.id === casoSel.casoId) ?? casoCargado
    : null;
  const soloLectura = casoSel?.soloLectura ?? false;

  // Al cambiar de caso, prellena el feedback con el BORRADOR de Eco (si lo dejó · §7A).
  useEffect(() => {
    setFeedback(casoActivo?.eco?.feedbackBorrador ?? '');
    setResultado(null);
    setEcoAviso(null);
  }, [casoActivo?.id, casoActivo?.eco?.feedbackBorrador]);

  // Filtra por grupo (server-side conceptual · aquí sobre el set ya cargado con RLS) y por
  // texto (alumno o diagnóstico presuntivo), en el cliente.
  const listaFiltrada = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return pendientes.filter((c) => {
      if (grupoFiltro && c.grupo !== grupoFiltro) return false;
      if (!q) return true;
      return (
        c.alumno.toLowerCase().includes(q) ||
        (c.presuntivo ?? '').toLowerCase().includes(q) ||
        (c.organo ?? '').toLowerCase().includes(q)
      );
    });
  }, [pendientes, filtro, grupoFiltro]);

  // Cola SEPARADA por confianza de Eco (§7A): listos para confirmar vs requieren criterio.
  // Dentro de cada grupo, primero el que lleva más tiempo esperando. El veredicto es un
  // PLACEHOLDER determinista hoy (Eco no conectado) con la estructura lista para el real.
  const conVeredicto = useMemo(
    () => listaFiltrada.map((c) => ({ c, v: veredictoBandeja(c) })),
    [listaFiltrada],
  );
  const listos = useMemo(
    () => conVeredicto.filter((x) => x.v.grupo === 'listo').sort((a, b) => b.c.horasEnCola - a.c.horasEnCola),
    [conVeredicto],
  );
  const criterio = useMemo(
    () => conVeredicto.filter((x) => x.v.grupo === 'criterio').sort((a, b) => b.c.horasEnCola - a.c.horasEnCola),
    [conVeredicto],
  );

  // Grupos del docente presentes en la cola (para el selector "Grupo ▾").
  const gruposDisponibles = useMemo(() => {
    const s = new Set<string>();
    for (const c of pendientes) if (c.grupo) s.add(c.grupo);
    return [...s].sort((a, b) => a.localeCompare(b, 'es'));
  }, [pendientes]);

  function abrirAlumno(alumnoId: string) {
    setCasoSel(null);
    router.push(`${pathname}?alumno=${encodeURIComponent(alumnoId)}`);
  }

  function abrirCaso(casoId: string, lectura: boolean) {
    setCasoSel({ casoId, soloLectura: lectura });
  }

  function volverAlAlumno() {
    setCasoSel(null);
  }

  /** Abrir un estudio desde la rejilla: pendiente = validar; aprobado/devuelto = solo lectura. */
  function abrirEstudioDeRejilla(id: string) {
    const est = datosAlumno?.estudios.find((e) => e.id === id);
    abrirCaso(id, est ? est.estado !== 'pendiente' : true);
  }

  /** Aprueba en lote los "listos", tras la confirmación del docente (Eco propone, él firma). */
  function confirmarLote() {
    const ids = listos.map((x) => x.c.id);
    startLote(async () => {
      const r = await aprobarCasosLote(ids);
      if (!r.ok) {
        setLoteResult({ ok: false, texto: r.error });
        return;
      }
      setPendientes((prev) => prev.filter((c) => !ids.includes(c.id)));
      setLoteModal(false);
      setLoteResult({
        ok: true,
        texto: `${r.aprobados ?? ids.length} caso(s) aprobados y firmados. Sus horas se acreditan y la competencia I-AIM se recalcula en segundo plano.`,
      });
      router.refresh();
    });
  }

  function analizar() {
    if (!casoActivo) return;
    const grupoId = casoActivo.grupoId;
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
    if (!casoActivo) return;
    const casoId = casoActivo.id;
    const horas = casoActivo.horas;
    const propuestaId = casoActivo.eco?.propuestaId ?? null;
    startTransition(async () => {
      const r = await validarCaso({ casoId, decision, feedback });
      if (!r.ok) {
        setResultado({ ok: false, texto: r.error });
        return;
      }
      // Cierre humano de la propuesta de Eco (loop de mejora · §7A). Best-effort.
      if (propuestaId) {
        await confirmarPropuestaEco({ propuestaId, feedback });
      }
      setResultado({
        ok: true,
        texto:
          decision === 'aprobado'
            ? `Caso aprobado y firmado. +${horas} h acreditadas · su competencia I-AIM se recalcula en segundo plano.`
            : 'Caso devuelto al alumno con su feedback para corrección.',
      });
      // Quita el caso de la cola local y vuelve a la vista previa (rejilla o bandeja).
      setPendientes((prev) => prev.filter((c) => c.id !== casoId));
      setCasoSel(null);
      router.refresh();
    });
  }

  const urgeActivo = !!casoActivo && casoActivo.horasEnCola >= 72 && casoActivo.estado === 'pendiente';

  return (
    <div className="flex h-[calc(100dvh-60px)] min-h-0">
      {/* ════════ 1 · BANDEJA: cola separada por confianza de Eco (§7A · spec) ════════ */}
      <aside className="flex w-[344px] shrink-0 flex-col overflow-hidden border-r border-border bg-card">
        {/* A · Cabecera (fija) */}
        <div className="shrink-0 border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-[9px]">
            <h1 className="text-[15px] font-extrabold tracking-[-0.015em]">Por validar</h1>
            <span className={`${mono} text-[13px] font-bold text-muted-foreground`}>
              {listaFiltrada.length}
            </span>
            {/* Selector de grupo (filtra la cola por grupo del docente). */}
            {gruposDisponibles.length > 0 && (
              <div className="relative ml-auto">
                <button
                  type="button"
                  onClick={() => setGrupoAbierto((v) => !v)}
                  aria-haspopup="listbox"
                  aria-expanded={grupoAbierto}
                  className={`inline-flex h-[30px] items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  {grupoFiltro ?? 'Todos los grupos'}
                  <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
                </button>
                {grupoAbierto && (
                  <>
                    <button
                      type="button"
                      aria-hidden
                      tabIndex={-1}
                      onClick={() => setGrupoAbierto(false)}
                      className="fixed inset-0 z-10 cursor-default"
                    />
                    <ul
                      role="listbox"
                      className="absolute right-0 top-[34px] z-20 max-h-64 w-52 overflow-y-auto rounded-[10px] border border-border bg-card py-1 shadow-[0_8px_24px_rgba(15,45,82,0.10)]"
                    >
                      {[null, ...gruposDisponibles].map((g) => {
                        const activo = grupoFiltro === g;
                        return (
                          <li key={g ?? '__todos'}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={activo}
                              onClick={() => {
                                setGrupoFiltro(g);
                                setGrupoAbierto(false);
                                setVerTodosListos(false);
                              }}
                              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] transition-colors hover:bg-muted ${
                                activo ? 'font-bold text-secondary' : 'font-medium text-foreground'
                              }`}
                            >
                              {activo && <Check aria-hidden className="h-3.5 w-3.5 shrink-0" strokeWidth={2.4} />}
                              <span className={activo ? '' : 'pl-[22px]'}>{g ?? 'Todos los grupos'}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>

          <label className="mt-2.5 flex h-9 items-center gap-2 rounded-[9px] border border-border bg-muted px-[11px] transition-colors focus-within:border-secondary">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno o diagnóstico</span>
            <input
              type="search"
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              placeholder="Buscar alumno o diagnóstico…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>

          {/* Aviso de Eco: explica por qué la cola va por criterio y no cronológica. PLACEHOLDER. */}
          <div className="mt-2.5 flex items-center gap-1.5 rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 py-2">
            <Sparkles aria-hidden className="h-3.5 w-3.5 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 text-[11px] font-semibold leading-[1.45] text-[color:var(--info-foreground)]">
              Eco pre-analizó los {listaFiltrada.length} y los ordenó por criterio requerido
            </span>
          </div>
        </div>

        {/* B · Lista (con scroll) — dos grupos: listos · requieren criterio */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {listaFiltrada.length === 0 ? (
            <p className={`px-4 py-6 text-center text-[12.5px] ${softText}`}>
              {pendientes.length === 0 ? 'No hay casos por validar.' : 'Sin coincidencias.'}
            </p>
          ) : (
            <>
              {/* ── Listos para confirmar ── */}
              {listos.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-4 pb-2 pt-3">
                    <span aria-hidden className="h-2 w-2 rounded-full bg-primary" />
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-secondary">
                      Listos para confirmar
                    </h2>
                    <span className={`${mono} text-[11px] font-bold text-muted-foreground`}>{listos.length}</span>
                  </div>
                  <ul className="list-none pr-4">
                    {(verTodosListos ? listos : listos.slice(0, 5)).map(({ c, v }) => (
                      <FilaCola
                        key={c.id}
                        c={c}
                        v={v}
                        seleccionado={casoSel?.casoId === c.id}
                        onAbrirCaso={(id) => abrirCaso(id, false)}
                        onAbrirEstudios={abrirAlumno}
                      />
                    ))}
                  </ul>
                  {listos.length > 5 && !verTodosListos && (
                    <button
                      type="button"
                      onClick={() => setVerTodosListos(true)}
                      className={`mx-4 mt-1 h-[34px] text-[12px] font-semibold text-muted-foreground transition-colors hover:text-secondary ${focusRing}`}
                    >
                      Ver los otros {listos.length - 5}
                    </button>
                  )}
                </>
              )}

              {/* ── Requieren su criterio ── */}
              {criterio.length > 0 && (
                <>
                  <div
                    className={`flex items-center gap-2 px-4 pb-2 pt-4 ${
                      listos.length > 0 ? 'mt-1.5 border-t border-border' : 'pt-3'
                    }`}
                  >
                    <span aria-hidden className="h-2 w-2 rounded-full bg-[color:var(--warning)]" />
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[color:var(--warning-foreground)]">
                      Requieren su criterio
                    </h2>
                    <span className={`${mono} text-[11px] font-bold text-muted-foreground`}>{criterio.length}</span>
                  </div>
                  <ul className="list-none pb-4 pr-4">
                    {criterio.map(({ c, v }) => (
                      <FilaCola
                        key={c.id}
                        c={c}
                        v={v}
                        seleccionado={casoSel?.casoId === c.id}
                        onAbrirCaso={(id) => abrirCaso(id, false)}
                        onAbrirEstudios={abrirAlumno}
                      />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>

        {/* C · Pie (fijo) — aprobar el lote de listos, tras confirmar el resumen */}
        {listos.length > 0 && (
          <div className="shrink-0 border-t border-border bg-muted px-4 py-3.5">
            <button
              type="button"
              onClick={() => {
                setLoteResult(null);
                setLoteModal(true);
              }}
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <Check aria-hidden className="h-4 w-4" strokeWidth={2.4} />
              Aprobar los {listos.length} listos
            </button>
            <p className="mt-[9px] text-[11px] leading-[1.5] text-muted-foreground">
              Revisará un resumen antes de firmar. Su aprobación acredita las horas.
            </p>
          </div>
        )}
      </aside>

      {/* ════════ 2 · ÁREA PRINCIPAL ════════ */}
      {casoSel ? (
        casoActivo ? (
          <DetalleCaso
            caso={casoActivo}
            soloLectura={soloLectura}
            urge={urgeActivo}
            feedback={feedback}
            setFeedback={setFeedback}
            resultado={resultado}
            ecoAviso={ecoAviso}
            analizando={analizando}
            enviando={enviando}
            volverEtiqueta={alumnoParam ? 'Volver a sus estudios' : 'Volver a la bandeja'}
            onVolver={volverAlAlumno}
            onAnalizar={analizar}
            onDecidir={decidir}
          />
        ) : (
          <MainCargando />
        )
      ) : alumnoParam ? (
        datosAlumno ? (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
            {avisoAlumno && (
              <div
                role="status"
                className="flex items-start gap-2.5 border-b border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-7 py-2.5 text-[12px] font-medium text-[color:var(--info-foreground)]"
              >
                <BookOpen aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span>{avisoAlumno}</span>
              </div>
            )}
            <EstudiosAlumno
              alumno={datosAlumno.alumno}
              estudios={datosAlumno.estudios}
              onAbrirEstudio={abrirEstudioDeRejilla}
              onEnviarConsulta={(id) => router.push(`/docente/consultas?alumno=${encodeURIComponent(id)}`)}
              onVerBitacora={() =>
                setAvisoAlumno(
                  'Aquí ves todos los estudios que el alumno ha subido. La bitácora completa con su curva de competencia llega en una fase posterior.',
                )
              }
            />
          </div>
        ) : cargandoAlumno ? (
          <RejillaCargando />
        ) : (
          <MainVacio titulo="No se encontró al alumno" texto="Puede que ya no tengas acceso a sus casos o que el enlace esté desactualizado." />
        )
      ) : pendientes.length === 0 ? (
        <MainVacio
          icono
          titulo="Bandeja al día"
          texto="No hay casos esperando tu validación. Cuando un alumno suba un caso, aparecerá en esta cola."
        />
      ) : (
        <MainVacio
          titulo="Elige a quién revisar"
          texto="Abre un alumno de la bandeja para ver todos sus estudios, o un caso concreto para validarlo."
        />
      )}

      {/* ════════ 3 · ECO (colapsable · PLACEHOLDER conversacional) ════════ */}
      <EcoRailValidacion abierta={ecoAbierta} onAbrir={() => setEcoAbierta(true)} onCerrar={() => setEcoAbierta(false)} />

      {/* Confirmación del lote: el resumen antes de firmar (Eco propone, el docente firma). */}
      {loteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Aprobar casos listos"
          className="fixed inset-0 z-50 grid place-items-center p-9"
          style={{ background: 'rgba(15,45,82,.52)' }}
        >
          <div className="flex max-h-[80vh] w-full max-w-[520px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="shrink-0 px-6 pb-4 pt-6">
              <span
                aria-hidden
                className="inline-grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-foreground"
              >
                <Check className="h-6 w-6" strokeWidth={2.4} />
              </span>
              <h2 className="mt-3 text-[19px] font-extrabold leading-snug tracking-[-0.02em]">
                Aprobar {listos.length} caso{listos.length === 1 ? '' : 's'} listo{listos.length === 1 ? '' : 's'}
              </h2>
              <p className={`mt-2 text-[13px] leading-relaxed ${softText}`}>
                Eco los clasificó como listos para confirmar. Revíselos: su firma acredita las horas
                de cada uno. Nada se asienta hasta que confirme.
              </p>
            </div>
            <ul className="min-h-0 flex-1 list-none overflow-y-auto border-y border-border">
              {listos.map(({ c }) => (
                <li key={c.id} className="flex items-center gap-2.5 px-6 py-2.5 [&+&]:border-t [&+&]:border-border">
                  <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sidebar text-[10px] font-bold text-sidebar-foreground"
                  >
                    {c.iniciales}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold text-foreground">{c.alumno}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{metaCaso(c) || 'Sin módulo'}</span>
                  </span>
                  <span className={`${mono} shrink-0 text-[11.5px] font-bold text-secondary`}>+{c.horas} h</span>
                </li>
              ))}
            </ul>
            {loteResult && !loteResult.ok && (
              <p className="shrink-0 bg-[color:var(--warning-surface)] px-6 py-2.5 text-[12px] font-medium text-[color:var(--warning-foreground)]">
                {loteResult.texto}
              </p>
            )}
            <div className="flex shrink-0 items-center gap-2.5 bg-muted px-6 py-4">
              <span className={`${mono} min-w-0 flex-1 text-[11.5px] text-muted-foreground`}>
                {listos.reduce((s, x) => s + x.c.horas, 0)} h en total
              </span>
              <button
                type="button"
                onClick={() => setLoteModal(false)}
                disabled={aprobandoLote}
                className={`h-11 shrink-0 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 ${focusRing}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarLote}
                disabled={aprobandoLote}
                className={`inline-flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
              >
                {aprobandoLote ? (
                  <Clock aria-hidden className="h-[17px] w-[17px] animate-spin" strokeWidth={2} />
                ) : (
                  <Check aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.4} />
                )}
                Aprobar y firmar los {listos.length}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultado del lote (éxito): aviso breve sobre la bandeja. */}
      {loteResult?.ok && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-start gap-2.5 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-3 text-[12.5px] font-medium text-[color:var(--info-foreground)] shadow-[0_8px_24px_rgba(15,45,82,0.10)]"
        >
          <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2.4} />
          <span className="max-w-[52ch]">{loteResult.texto}</span>
          <button
            type="button"
            onClick={() => setLoteResult(null)}
            aria-label="Cerrar aviso"
            className={`ml-1 shrink-0 rounded-md text-[color:var(--info-foreground)] transition-opacity hover:opacity-70 ${focusRing}`}
          >
            <X aria-hidden className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Detalle del caso (reusa el visor + validación existentes) ─────────────────────
function DetalleCaso({
  caso,
  soloLectura,
  urge,
  feedback,
  setFeedback,
  resultado,
  ecoAviso,
  analizando,
  enviando,
  volverEtiqueta,
  onVolver,
  onAnalizar,
  onDecidir,
}: {
  caso: CasoValidacion;
  soloLectura: boolean;
  urge: boolean;
  feedback: string;
  setFeedback: (v: string) => void;
  resultado: { ok: boolean; texto: string } | null;
  ecoAviso: { ok: boolean; texto: string } | null;
  analizando: boolean;
  enviando: boolean;
  volverEtiqueta: string;
  onVolver: () => void;
  onAnalizar: () => void;
  onDecidir: (d: 'aprobado' | 'rechazado') => void;
}) {
  const estadoBadge =
    caso.estado === 'aprobado'
      ? { texto: 'Aprobado', clase: 'border-[#a8e0dc] bg-accent text-accent-foreground' }
      : caso.estado === 'rechazado'
        ? { texto: 'Devuelto con feedback', clase: 'border-border bg-muted text-[color:var(--foreground-soft)]' }
        : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-card px-5 py-3.5">
        <button
          type="button"
          onClick={onVolver}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[9px] border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted ${focusRing}`}
        >
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          {volverEtiqueta}
        </button>
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar text-[12px] font-bold text-sidebar-foreground"
        >
          {caso.iniciales}
        </span>
        <div className="min-w-0">
          <p className="text-[14.5px] font-bold leading-tight">{caso.alumno}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{metaCaso(caso) || 'Sin módulo'}</p>
        </div>
        {estadoBadge && (
          <span className={`inline-flex h-[26px] items-center rounded-full border px-2.5 text-[11.5px] font-bold ${estadoBadge.clase}`}>
            {estadoBadge.texto}
          </span>
        )}
        {urge && (
          <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
            <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2} />
            {Math.floor(caso.horasEnCola / 24)} días esperando
          </span>
        )}
        {!soloLectura && (
          <button
            type="button"
            onClick={onAnalizar}
            disabled={analizando || !caso.grupoId}
            title={caso.grupoId ? undefined : 'El caso no tiene grupo asociado'}
            className={`ml-auto inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 text-[12.5px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-[color:var(--info-foreground)] hover:text-white disabled:opacity-50 ${focusRing}`}
          >
            {analizando ? (
              <Clock aria-hidden className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            ) : (
              <Wand2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            )}
            {caso.eco ? 'Re-analizar con Eco' : 'Analizar con Eco'}
          </button>
        )}
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
                {caso.series} {caso.series === 1 ? 'pieza' : 'piezas'}
                {caso.cineLoop ? ' · cine-loop' : ''}
              </span>
              <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary/[0.16] px-2.5 text-[10.5px] font-bold text-primary">
                <Check aria-hidden className="h-2.5 w-2.5" strokeWidth={2.6} />
                Anonimizado
              </span>
            </span>
          </div>
          {caso.estudio ? (
            <VisorDicom estudio={caso.estudio} className="h-[360px] w-full" />
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
        {caso.eco && (
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
                  caso.eco.clasificacion === 'listo'
                    ? 'bg-accent text-accent-foreground'
                    : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                }`}
              >
                {caso.eco.clasificacion === 'listo' ? 'Listo para confirmar' : 'Requiere tu criterio'}
              </span>
              <span className={`ml-auto ${mono} text-[11.5px] text-muted-foreground`}>
                confianza {Math.round(caso.eco.confianza * 100)}%
                {caso.eco.notaSugerida != null
                  ? ` · coincide ${Math.round(caso.eco.notaSugerida)}/100`
                  : ''}
              </span>
            </div>

            {caso.eco.criterios.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {caso.eco.criterios.map((cr, i) => (
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

            {caso.eco.omisiones.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {caso.eco.omisiones.map((o, i) => (
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
              Eco propone contra la verdad del caso; usted firma.
            </p>
          </section>
        )}

        {/* lo que reportó el alumno */}
        <section className="mt-4 rounded-xl border border-border bg-card p-[18px] shadow-rest">
          <p className={`${kicker} text-muted-foreground`}>Lo que reportó el alumno</p>
          {(
            [
              ['Hallazgos', caso.hallazgos],
              ['Diagnóstico presuntivo', caso.presuntivo],
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
            en cola desde {haceCuanto(caso.creadoEn)} · acredita {caso.horas} h
          </p>
        </section>

        {soloLectura ? (
          /* Devolución YA asentada (estudio aprobado/devuelto): solo lectura. */
          <section className="mt-4 rounded-xl border border-border bg-card p-[18px] shadow-rest">
            <p className={`${kicker} text-muted-foreground`}>
              {caso.estado === 'aprobado' ? 'Comentario al validar' : 'Feedback para el alumno'}
            </p>
            <p className={`mt-3 text-[13px] leading-relaxed ${softText}`}>
              {caso.notaValidacion || (
                <span className="italic text-muted-foreground">
                  {caso.estado === 'aprobado' ? 'Se aprobó sin comentario.' : 'Se devolvió sin nota.'}
                </span>
              )}
            </p>
          </section>
        ) : (
          /* feedback editable */
          <section className="mt-4 rounded-xl border border-border bg-card p-[18px] shadow-rest">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className={`${kicker} text-muted-foreground`}>Feedback para el alumno</p>
              {caso.eco?.feedbackBorrador && (
                <button
                  type="button"
                  onClick={() => setFeedback(caso.eco!.feedbackBorrador ?? '')}
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
        )}

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

      {/* barra de firma (solo si el estudio sigue pendiente) */}
      {!soloLectura && (
        <div className="flex shrink-0 flex-wrap items-center gap-3.5 border-t border-border bg-card px-5 py-3.5">
          <p className="min-w-[200px] flex-1 text-[11.5px] leading-snug text-muted-foreground">
            <Sparkles aria-hidden className="mr-1 inline h-3 w-3 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
            Eco propone; <span className="font-bold text-foreground">usted firma</span>. Al aprobar
            se acreditan <span className={`${mono} font-bold text-foreground`}>{caso.horas} h</span> y se
            recalcula su competencia I-AIM.
          </p>
          <span className="ml-auto flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => onDecidir('rechazado')}
              disabled={enviando}
              className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50 ${focusRing}`}
            >
              <X aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              Rechazar y pedir corrección
            </button>
            <button
              type="button"
              onClick={() => onDecidir('aprobado')}
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
      )}
    </div>
  );
}

// ── Estados del área principal ────────────────────────────────────────────────────
function MainVacio({ titulo, texto, icono }: { titulo: string; texto: string; icono?: boolean }) {
  return (
    <div className="grid min-w-0 flex-1 place-items-center bg-background p-8 text-center">
      <div>
        {icono && (
          <span aria-hidden className="inline-grid h-[52px] w-[52px] place-items-center rounded-full bg-accent text-accent-foreground">
            <Check className="h-[26px] w-[26px]" strokeWidth={2.2} />
          </span>
        )}
        <h2 className="mt-3.5 text-[18px] font-extrabold tracking-[-0.015em]">{titulo}</h2>
        <p className={`mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed ${softText}`}>{texto}</p>
      </div>
    </div>
  );
}

function MainCargando() {
  return (
    <div className="grid min-w-0 flex-1 place-items-center bg-background">
      <Clock aria-hidden className="h-7 w-7 animate-spin text-muted-foreground" strokeWidth={1.75} />
    </div>
  );
}

/** Rejilla esqueleto mientras carga los estudios del alumno (§7 del mock). */
function RejillaCargando() {
  return (
    <div className="min-w-0 flex-1 overflow-y-auto bg-background">
      <div className="h-[128px] animate-pulse bg-sidebar/90" />
      <div className="max-w-[838px] px-7 pb-7 pt-5">
        <div className="h-9 w-64 animate-pulse rounded-full bg-muted" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-[14px] border border-border bg-card">
              <div className="aspect-[755/570] animate-pulse bg-muted" />
              <div className="space-y-2 p-[15px]">
                <div className="h-4 w-24 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-8 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
