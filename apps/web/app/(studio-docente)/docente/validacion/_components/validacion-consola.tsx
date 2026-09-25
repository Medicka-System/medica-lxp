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

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  BookCopy,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  ListTree,
  Minus,
  Pencil,
  Plus,
  ScanLine,
  Search,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react';
import { tieneContenidoEstructurado } from '@campus/shared';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import { ContenidoEstructuradoCasoVista } from '@/components/casos/contenido-estructurado-caso';
import { VisorEstudio } from '@/components/casos/visor-estudio';
import { DOMINIO_LABEL, type CasoValidacion, type CifrasAprobacion, type EstudiosAlumnoData } from '../../../_lib/contrato';
import {
  aprobarCaso,
  aprobarCasosLote,
  cargarCasoValidacion,
  cargarEstudiosAlumno,
  validarCaso,
} from '../../../_lib/acciones';
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
  const [nota, setNota] = useState('');
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ecoAbierta, setEcoAbierta] = useState(false);
  const [enviando, startTransition] = useTransition();
  // Modal de confirmación al aprobar UN caso: el impacto se confirma con cifras reales.
  const [aprobacion, setAprobacion] = useState<{ caso: CasoValidacion; cifras: CifrasAprobacion } | null>(null);

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

  // Al cambiar de caso, prellena el feedback y la nota con el BORRADOR de Eco (PLACEHOLDER · §7A).
  useEffect(() => {
    if (!casoActivo) return;
    const eco = preAnalisisEco(casoActivo);
    setFeedback(eco.borradorFeedback);
    setNota(eco.notaSugerida);
    setResultado(null);
  }, [casoActivo?.id]);

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

  // Cola PLANA en el orden de la bandeja (listos → criterio) para "Caso anterior / Siguiente".
  const colaFlat = useMemo(() => [...listos, ...criterio].map((x) => x.c), [listos, criterio]);
  const idxActivo = casoActivo ? colaFlat.findIndex((c) => c.id === casoActivo.id) : -1;
  const hayAnterior = idxActivo > 0;
  const haySiguiente = idxActivo >= 0 && idxActivo < colaFlat.length - 1;
  const irAOtroCaso = (delta: number) => {
    if (idxActivo < 0) return;
    const sig = colaFlat[idxActivo + delta];
    if (sig) abrirCaso(sig.id, false);
  };

  /** APROBAR un caso: flujo real (firma + acredita horas) y modal con las cifras del backend. */
  function aprobar() {
    if (!casoActivo) return;
    const caso = casoActivo;
    startTransition(async () => {
      const r = await aprobarCaso({ casoId: caso.id, feedback });
      if (!r.ok) {
        setResultado({ ok: false, texto: r.error });
        return;
      }
      // Sale de la cola local; el modal muestra el impacto con cifras reales.
      setPendientes((prev) => prev.filter((c) => c.id !== caso.id));
      setResultado(null);
      if (r.cifras) setAprobacion({ caso, cifras: r.cifras });
      else setCasoSel(null);
      router.refresh();
    });
  }

  /** RECHAZAR un caso: devuelve al alumno con feedback obligatorio, NO acredita horas. */
  function rechazar() {
    if (!casoActivo) return;
    const casoId = casoActivo.id;
    startTransition(async () => {
      const r = await validarCaso({ casoId, decision: 'rechazado', feedback });
      if (!r.ok) {
        setResultado({ ok: false, texto: r.error });
        return;
      }
      setResultado({ ok: true, texto: 'Caso devuelto al alumno con su feedback para corrección.' });
      setPendientes((prev) => prev.filter((c) => c.id !== casoId));
      setCasoSel(null);
      router.refresh();
    });
  }

  /** Cierra el modal de aprobación y navega (a la bandeja o al siguiente caso de la cola). */
  function cerrarAprobacion(siguiente: boolean) {
    const sig = siguiente ? colaFlat.find((c) => c.id !== aprobacion?.caso.id) : null;
    setAprobacion(null);
    if (sig) abrirCaso(sig.id, false);
    else setCasoSel(null);
  }

  /** Curaduría (PLACEHOLDER): el editor de la verdad del caso se conecta con Eco más adelante. */
  function avisoCuraduria() {
    setResultado({
      ok: true,
      texto: 'El editor de la verdad del caso (curaduría clínica) se conecta con Eco en una fase posterior.',
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
            nota={nota}
            setNota={setNota}
            resultado={resultado}
            enviando={enviando}
            volverEtiqueta={alumnoParam ? 'Volver a sus estudios' : 'Volver a la bandeja'}
            onVolver={volverAlAlumno}
            hayAnterior={hayAnterior}
            haySiguiente={haySiguiente}
            onAnterior={() => irAOtroCaso(-1)}
            onSiguiente={() => irAOtroCaso(1)}
            onAprobar={aprobar}
            onRechazar={rechazar}
            onBiblioteca={avisoCuraduria}
            onEstructurar={avisoCuraduria}
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

      {/* Modal de confirmación al aprobar UN caso: el impacto con CIFRAS reales del backend. */}
      {aprobacion && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Caso aprobado"
          className="fixed inset-0 z-50 grid place-items-center p-9"
          style={{ background: 'rgba(15,45,82,.52)' }}
        >
          <div className="w-full max-w-[560px] overflow-hidden rounded-2xl bg-card shadow-[0_24px_60px_rgba(17,24,39,0.28)]">
            <div className="px-6 pb-[22px] pt-6">
              <span aria-hidden className="inline-grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
                <Check className="h-[26px] w-[26px]" strokeWidth={2.4} />
              </span>
              <h2 className="mt-3.5 text-[20px] font-extrabold leading-snug tracking-[-0.02em]">
                Caso aprobado y firmado por usted
              </h2>
              <p className={`mt-2 text-[13.5px] leading-relaxed ${softText}`}>
                {aprobacion.caso.alumno} · {metaCaso(aprobacion.caso) || 'Sin módulo'}. Ya puede verlo en su
                bitácora con su feedback.
              </p>

              <div className="mt-[18px] grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-[11px] border border-border bg-muted p-3.5">
                  <Clock aria-hidden className="h-[18px] w-[18px] text-secondary" strokeWidth={1.75} />
                  <p className={`${mono} mt-2 text-[22px] font-extrabold leading-none`}>
                    +{aprobacion.cifras.horasAcreditadas} h
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
                    acreditadas · lleva{' '}
                    <span className={`${mono} font-bold text-foreground`}>
                      {aprobacion.cifras.horasTotales} / {aprobacion.cifras.horasPrograma} h
                    </span>
                  </p>
                </div>
                <div className="rounded-[11px] border border-border bg-muted p-3.5">
                  <BarChart3 aria-hidden className="h-[18px] w-[18px] text-secondary" strokeWidth={1.75} />
                  <p className={`${mono} mt-2 text-[15px] font-extrabold leading-tight`}>
                    {aprobacion.cifras.dominioLabel ?? 'Competencia'}
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
                    I-AIM · se recalcula en segundo plano
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 border-t border-border bg-muted px-6 py-4">
              <span className={`${mono} min-w-0 flex-1 text-[11.5px] text-muted-foreground`}>
                quedan {aprobacion.cifras.casosRestantes} caso{aprobacion.cifras.casosRestantes === 1 ? '' : 's'} en su bandeja
              </span>
              <button
                type="button"
                onClick={() => cerrarAprobacion(false)}
                className={`h-11 shrink-0 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Volver a la bandeja
              </button>
              <button
                type="button"
                onClick={() => cerrarAprobacion(true)}
                disabled={aprobacion.cifras.casosRestantes === 0}
                className={`h-12 shrink-0 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
              >
                Siguiente caso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pre-análisis de Eco del detalle (PLACEHOLDER · §7A) ───────────────────────────
type HallazgoClaveEco = { texto: string; ancla?: string; medidoPorEco?: boolean };
type PreAnalisisEco = {
  escalado: boolean;
  confianza: 'alta' | 'media' | 'baja';
  acerto: string[];
  omitio: string[];
  confundio: string[];
  veredicto: string;
  porque: string;
  notaSugerida: string;
  borradorFeedback: string;
  verdad: { hallazgosClave: HallazgoClaveEco[]; puntosAprendizaje: number; erroresComunes: number };
};

/**
 * Pre-análisis del detalle. **PLACEHOLDER determinista** por id (Eco NO conectado · §7A):
 * acertó/omitió/confundió, veredicto, nota y borrador son MOCK, con la estructura lista para
 * enchufar el pipeline real (`lxp.eco_propuestas`) al final. Eco propone; el docente firma.
 */
function preAnalisisEco(caso: CasoValidacion): PreAnalisisEco {
  const v = veredictoBandeja(caso);
  const organo = caso.organo ?? 'el estudio';
  const dx = caso.presuntivo ?? 'el diagnóstico propuesto';
  const escalado = v.grupo === 'criterio';
  const notaBase = v.confianza === 'alta' ? 8.8 : v.confianza === 'media' ? 8.0 : 7.0;
  return {
    escalado,
    confianza: v.confianza,
    acerto: [
      `Identificó ${organo} y describió el hallazgo principal`,
      'La técnica de adquisición es adecuada para el corte',
    ],
    omitio: [
      'No consignó una medición clave para sostener el grado',
      'Falta documentar la segunda proyección',
    ],
    confundio: escalado ? [`Sostiene ${dx} sin el dato que lo respalda`] : [],
    veredicto: escalado ? 'Rechazar y pedir corrección' : 'Aprobar con observaciones',
    porque: escalado
      ? 'El diagnóstico no se sostiene sin la medición faltante'
      : 'Cumple la rúbrica; quedan detalles menores',
    notaSugerida: notaBase.toFixed(1),
    borradorFeedback:
      caso.eco?.feedbackBorrador ??
      `Doctor(a): el reconocimiento de ${organo} es correcto y la descripción es clara. Antes de cerrar el caso, agregue la medición que falta y documente la segunda proyección; eso sostiene su diagnóstico. Corrija esos puntos y vuelva a subir el estudio.`,
    verdad: {
      hallazgosClave: [
        { texto: `Hallazgo principal en ${organo}`, ancla: 'Hallazgo clave' },
        { texto: 'Medición de referencia dentro de rango', ancla: 'Medida', medidoPorEco: true },
      ],
      puntosAprendizaje: 2,
      erroresComunes: 3,
    },
  };
}

/** Fecha corta "13 nov" para el pie del reporte del alumno. */
function fechaCorta(d: Date): string {
  return new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
}

/** Un corte del pre-análisis (Acertó / Omitió / Confundió) — MOCK de Eco. */
function BloqueAnalisis({
  clase,
  titulo,
  items,
}: {
  clase: 'ok' | 'omitio' | 'confundio';
  titulo: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  const color =
    clase === 'ok'
      ? 'text-secondary'
      : clase === 'omitio'
        ? 'text-[color:var(--warning-foreground)]'
        : 'text-[color:var(--info-foreground)]';
  const Icono = clase === 'ok' ? Check : clase === 'omitio' ? Minus : TriangleAlert;
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icono aria-hidden className={`h-3.5 w-3.5 shrink-0 ${color}`} strokeWidth={2.4} />
        <p className={`text-[11px] font-bold uppercase tracking-[0.08em] ${color}`}>{titulo}</p>
      </div>
      <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-[21px]">
        {items.map((t) => (
          <li key={t} className={`text-[12.5px] leading-relaxed ${softText}`}>
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Detalle del caso — interior EXACTO a la spec (frames 24a/24b/24c del mock) ─────
// REUSA: VisorEstudio (Cornerstone3D + herramientas Fase 2 anotar/medir) para el estudio;
// ContenidoEstructuradoCasoVista/CampoReporte para "lo que reportó el alumno"; el flujo real
// de aprobar/rechazar. ECO = PLACEHOLDER (pre-análisis, veredicto, nota, borrador, verdad).
function DetalleCaso({
  caso,
  soloLectura,
  urge,
  feedback,
  setFeedback,
  nota,
  setNota,
  resultado,
  enviando,
  volverEtiqueta,
  onVolver,
  hayAnterior,
  haySiguiente,
  onAnterior,
  onSiguiente,
  onAprobar,
  onRechazar,
  onBiblioteca,
  onEstructurar,
}: {
  caso: CasoValidacion;
  soloLectura: boolean;
  urge: boolean;
  feedback: string;
  setFeedback: (v: string) => void;
  nota: string;
  setNota: (v: string) => void;
  resultado: { ok: boolean; texto: string } | null;
  enviando: boolean;
  volverEtiqueta: string;
  onVolver: () => void;
  hayAnterior: boolean;
  haySiguiente: boolean;
  onAnterior: () => void;
  onSiguiente: () => void;
  onAprobar: () => void;
  onRechazar: () => void;
  onBiblioteca: () => void;
  onEstructurar: () => void;
}) {
  const eco = preAnalisisEco(caso);
  const estructurado = tieneContenidoEstructurado(caso.contenidoEstructurado);
  const verdadRef = useRef<HTMLDivElement>(null);
  const irAVerdad = () => verdadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const estadoBadge =
    caso.estado === 'aprobado'
      ? { texto: 'Aprobado', clase: 'border-[#a8e0dc] bg-accent text-accent-foreground' }
      : caso.estado === 'rechazado'
        ? { texto: 'Devuelto con feedback', clase: 'border-border bg-muted text-[color:var(--foreground-soft)]' }
        : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      {/* 1 · CABECERA (fija) — barra full-bleed, contenido pineado a 1240 */}
      <div className="shrink-0 border-b border-border bg-card px-5 py-3.5">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-3">
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
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {[caso.grupo, caso.modulo, caso.dominio ? DOMINIO_LABEL[caso.dominio] : null]
              .filter(Boolean)
              .join(' · ') || 'Sin módulo'}
          </p>
        </div>
        {estadoBadge && (
          <span className={`inline-flex h-[26px] items-center rounded-full border px-2.5 text-[11.5px] font-bold ${estadoBadge.clase}`}>
            {estadoBadge.texto}
          </span>
        )}
        {urge && (
          <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--warning-foreground)]">
            <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2} />
            {esperaCorta(caso.horasEnCola)} esperando
          </span>
        )}
        {!soloLectura && eco.escalado && (
          <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11.5px] font-bold text-[color:var(--info-foreground)]">
            <Sparkles aria-hidden className="h-3 w-3" strokeWidth={1.75} />
            Escalado por Eco · confianza {eco.confianza}
          </span>
        )}
        {!soloLectura && (hayAnterior || haySiguiente) && (
          <span className="ml-auto flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={onAnterior}
              disabled={!hayAnterior}
              className={`h-9 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${focusRing}`}
            >
              Caso anterior
            </button>
            <button
              type="button"
              onClick={onSiguiente}
              disabled={!haySiguiente}
              className={`h-9 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${focusRing}`}
            >
              Siguiente
            </button>
          </span>
        )}
        </div>
      </div>

      {/* 2 · CUERPO con scroll: visor → dos columnas → feedback — pineado a 1240 */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-[18px]">
        <div className="mx-auto w-full max-w-[1240px]">
        {/* VISOR real (Cornerstone3D · Fase 2: anotar/medir) — se monta bajo demanda */}
        {caso.estudio ? (
          <VisorEstudio
            casoId={caso.id}
            tabla="bitacora_casos"
            soloLectura={soloLectura}
            className="h-[58vh] min-h-[480px] w-full rounded-xl"
          />
        ) : (
          <section className="overflow-hidden rounded-xl" style={{ background: 'var(--sidebar)' }}>
            <div className="relative grid h-[300px] place-items-center" style={{ background: '#0a2140' }}>
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
          </section>
        )}

        {/* 3 · DOS COLUMNAS: alumno (1fr) · Eco (1.1fr) */}
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* a) LO QUE REPORTÓ EL ALUMNO (solo lectura · verdad estructurada / texto) */}
          <section className="rounded-xl border border-border bg-card p-[18px] shadow-rest">
            <p className={`${kicker} text-muted-foreground`}>Lo que reportó el alumno</p>
            {estructurado ? (
              <ContenidoEstructuradoCasoVista
                contenido={caso.contenidoEstructurado!}
                modo="previa"
                className="mt-3.5"
              />
            ) : (
              (
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
              ))
            )}
            <p className={`${mono} mt-4 border-t border-border pt-3 text-[11.5px] text-muted-foreground`}>
              subido el {fechaCorta(caso.creadoEn)} · {caso.series} {caso.series === 1 ? 'pieza' : 'piezas'}
              {caso.cineLoop ? ' · 1 loop' : ''}
            </p>
          </section>

          {/* b) PRE-ANÁLISIS DE ECO (PLACEHOLDER) */}
          <section
            className="rounded-xl border border-[color:var(--info-border)] p-[18px] shadow-rest"
            style={{ background: '#fbfbff' }}
          >
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
              >
                <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </span>
              <p className={`${kicker} text-[color:var(--info-foreground)]`}>Pre-análisis de Eco</p>
              <span className="ml-auto inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                Contra la verdad del caso
              </span>
            </div>

            <div className="mt-3.5 flex flex-col gap-3.5">
              <BloqueAnalisis clase="ok" titulo="Acertó" items={eco.acerto} />
              <BloqueAnalisis clase="omitio" titulo="Omitió" items={eco.omitio} />
              <BloqueAnalisis clase="confundio" titulo="Confundió" items={eco.confundio} />
            </div>

            {/* Veredicto sugerido */}
            <div className="mt-4 flex items-center gap-3 rounded-[11px] border border-border bg-card px-3.5 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  Veredicto sugerido
                </span>
                <span className="mt-1 block text-[13.5px] font-bold">{eco.veredicto}</span>
                <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{eco.porque}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`${mono} block text-[26px] font-extrabold leading-none`}>{eco.notaSugerida}</span>
                <span className={`${mono} mt-1 block text-[10.5px] text-muted-foreground`}>nota sugerida</span>
              </span>
            </div>

            {/* Verdad del caso (la usa el simulador) */}
            <div ref={verdadRef} className="mt-4 scroll-mt-4 border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em]">Verdad del caso</p>
                <span className="inline-flex h-[21px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10px] font-bold text-[color:var(--info-foreground)]">
                  La usa el simulador
                </span>
                {!soloLectura && (
                  <button
                    type="button"
                    onClick={onEstructurar}
                    className={`ml-auto inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                  >
                    <ListTree aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Estructurar
                  </button>
                )}
              </div>
              <p className={`mt-2 text-[11.5px] leading-relaxed ${softText}`}>
                Usted es quien tiene el criterio: confirme lo que midió Eco o corríjalo. Esto es contra lo
                que se juzgan los próximos casos y lo que entrena al simulador.
              </p>

              <p className="mt-3.5 text-[11px] font-bold">Hallazgos clave</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {eco.verdad.hallazgosClave.map((hc, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2.5"
                  >
                    <span aria-hidden className="mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-medium leading-relaxed">{hc.texto}</span>
                      {hc.ancla && (
                        <span
                          className={`mt-1.5 inline-flex h-5 items-center gap-1.5 rounded-full px-1.5 text-[10px] font-bold ${
                            hc.medidoPorEco
                              ? 'bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]'
                              : 'bg-accent text-accent-foreground'
                          }`}
                        >
                          {hc.medidoPorEco && <Sparkles aria-hidden className="h-[11px] w-[11px]" strokeWidth={1.75} />}
                          {hc.ancla}
                          {hc.medidoPorEco && ' · medida por Eco'}
                        </span>
                      )}
                    </span>
                    {!soloLectura && (
                      <button
                        type="button"
                        aria-label={`Editar: ${hc.texto}`}
                        onClick={onEstructurar}
                        className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                      >
                        <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                  </li>
                ))}
                {!soloLectura && (
                  <li>
                    <button
                      type="button"
                      onClick={onEstructurar}
                      className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--track)] bg-card text-[12px] font-semibold text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
                    >
                      <Plus aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
                      Agregar hallazgo clave
                    </button>
                  </li>
                )}
              </ul>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onEstructurar}
                  disabled={soloLectura}
                  className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 ${focusRing}`}
                >
                  {eco.verdad.puntosAprendizaje} puntos de aprendizaje
                </button>
                <button
                  type="button"
                  onClick={onEstructurar}
                  disabled={soloLectura}
                  className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[12px] font-semibold text-[color:var(--warning-foreground)] disabled:opacity-60 ${focusRing}`}
                >
                  <TriangleAlert aria-hidden className="h-3 w-3" strokeWidth={2} />
                  {eco.verdad.erroresComunes} errores comunes
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* 4 · FEEDBACK PARA EL ALUMNO */}
        {soloLectura ? (
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
          <section className="mt-4 rounded-xl border border-border bg-card p-[18px] shadow-rest">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className={`${kicker} text-muted-foreground`}>Feedback para el alumno</p>
              <span className="inline-flex h-[22px] items-center gap-1.5 rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                <Sparkles aria-hidden className="h-[11px] w-[11px]" strokeWidth={1.75} />
                Borrador de Eco
              </span>
              {/* PLACEHOLDER: reescribir con Eco (pendiente de conectar el pipeline · §7A). */}
              <span className="ml-auto flex gap-1.5">
                {(['Más breve', 'Más exigente'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFeedback(reescribirBorrador(feedback, t))}
                    className={`h-8 rounded-lg border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                  >
                    {t}
                  </button>
                ))}
              </span>
            </div>
            <textarea
              rows={4}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Escriba su devolución. Al rechazar es obligatoria: dígale al alumno qué corregir."
              className="mt-3 w-full resize-none rounded-[11px] border border-border bg-muted px-3.5 py-3 text-[13px] leading-[1.65] text-foreground outline-none transition-colors focus:border-secondary"
            />
            <p className="mt-2.5 text-[11.5px] text-muted-foreground">
              Puede editarlo libremente: el alumno recibe exactamente lo que usted firme.
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
      </div>

      {/* 5 · BARRA DE FIRMA (fija) — barra full-bleed, contenido pineado a 1240 */}
      {!soloLectura && (
        <div className="shrink-0 border-t border-border bg-card px-5 py-3.5">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center gap-3.5">
          <label className="flex shrink-0 items-center gap-2.5">
            <span className="text-[11.5px] font-bold">Nota</span>
            <input
              type="text"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              aria-label="Nota del caso"
              className={`${mono} h-11 w-[74px] rounded-[10px] border border-border bg-card px-3 text-center text-[15px] font-bold text-foreground outline-none transition-colors focus:border-secondary`}
            />
          </label>
          <p className="min-w-[180px] flex-1 text-[11.5px] leading-snug text-muted-foreground">
            <Sparkles aria-hidden className="mr-1 inline h-3 w-3 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
            Eco propone; <span className="font-bold text-foreground">usted firma</span>. Al aprobar se
            acreditan <span className={`${mono} font-bold text-foreground`}>{caso.horas} h</span> y se
            actualiza su competencia I-AIM.
          </p>
          {/* Curaduría (agrupada; nunca entre la nota y la decisión) */}
          <span className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={irAVerdad}
              className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <ListTree aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Verdad del caso
            </button>
            <button
              type="button"
              onClick={onBiblioteca}
              className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <BookCopy aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Agregar a Biblioteca
            </button>
          </span>
          {/* Decisión (siempre a la derecha) */}
          <span className="ml-auto flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={onRechazar}
              disabled={enviando}
              className={`inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-bold text-foreground transition-colors hover:bg-muted disabled:opacity-50 ${focusRing}`}
            >
              <X aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              Rechazar y pedir corrección
            </button>
            <button
              type="button"
              onClick={onAprobar}
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
        </div>
      )}
    </div>
  );
}

/**
 * Reescritura del borrador (PLACEHOLDER de "Más breve / Más exigente"): un ajuste local del
 * texto, sin llamar a Eco. Cuando Eco se conecte (§7A), esto pasará por el pipeline real.
 */
function reescribirBorrador(texto: string, modo: 'Más breve' | 'Más exigente'): string {
  const base = texto.trim();
  if (modo === 'Más breve') {
    const primera = base.split(/(?<=\.)\s+/)[0] ?? base;
    return primera;
  }
  return base
    ? `${base}\n\nSea riguroso: no cierre el caso hasta corregir cada punto señalado y volver a subir el estudio.`
    : base;
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
      <div className="px-7 pb-7 pt-5">
        <div className="h-9 w-64 animate-pulse rounded-full bg-muted" />
        <div
          className="mt-4 grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))" }}
        >
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
