'use client';

/**
 * Studio · Editor de caso — estación clínica-didáctica (§5B/§7A).
 *
 * REAL (web→Supabase bajo RLS es_staff · lxp.casos_biblioteca): catalogación (título,
 * órgano, dominio I-AIM), diagnóstico correcto, y la VERDAD ESTRUCTURADA (hallazgos
 * clave, puntos de aprendizaje, errores comunes) — lo que habilita a Eco y a los
 * simuladores. Publicar a Biblioteca alterna `publicado`.
 *
 * VISOR/ESTUDIO (§4.7 · rediseño multi-serie): el visor DICOM real (Cornerstone3D)
 * es TRANSVERSAL — el mismo que la bitácora y la Biblioteca. Si el caso ya tiene
 * estudio anonimizado se muestra; si no, el staff lo SUBE aquí con el uploader
 * multi-archivo/`.zip` (tabla casos_biblioteca), anonimizado en ingesta (§10).
 * "Anclar hallazgo a anotación" y "Marcar para Simulador" siguen pendientes (no hay
 * anotaciones ni flag en el esquema).
 */

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookCopy,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MonitorPlay,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { mono, kicker, softText, focusRing, focusRingDark } from '@/lib/studio/estilos';
import { DOMINIO_LABEL, type CasoEditor, type DominioIaim, type ModuloOpcionCaso } from '@/lib/studio/casos-contrato';
import { guardarCaso, guardarContenidoEstructuradoCaso, publicarCaso } from '@/lib/studio/acciones';
import { quitarSerieDicom } from '@/lib/dicom/acciones';
import { Select } from '@/components/ui/select';
import { VisorEstudio } from '@/components/casos/visor-estudio';
import { ContenidoEstructuradoCasoVista } from '@/components/casos/contenido-estructurado-caso';
import { tieneContenidoEstructurado, type ContenidoEstructuradoCaso } from '@campus/shared';
import {
  SelectorArchivosDicom,
  ejecutarSubidaMulti,
  ETIQUETA_FASE,
  type FaseDicom,
} from '@/components/casos/subida-dicom';

const DOMINIOS: DominioIaim[] = ['indicacion', 'adquisicion', 'interpretacion', 'decision_medica'];
const campoBase =
  'mt-1.5 w-full rounded-[10px] border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-colors focus:border-secondary placeholder:text-muted-foreground';

export function EditorCaso({
  caso,
  modulos,
  rutaBase = '/studio/casos',
}: {
  caso: CasoEditor;
  modulos: ModuloOpcionCaso[];
  /** Base para "Volver": /studio/casos (diseñador) o /docente/biblioteca (docente curador). */
  rutaBase?: string;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [titulo, setTitulo] = useState(caso.titulo);
  const [organo, setOrgano] = useState(caso.organo);
  const [patologia, setPatologia] = useState(caso.patologia);
  const [dominio, setDominio] = useState<DominioIaim | null>(caso.dominioIaim);
  const [moduloId, setModuloId] = useState<string | null>(caso.moduloId);
  const [tecnica, setTecnica] = useState(caso.tecnica);
  const [equipo, setEquipo] = useState(caso.equipo);
  const [vineta, setVineta] = useState(caso.vineta);
  const [etiquetas, setEtiquetas] = useState<string[]>(caso.etiquetas);
  const [etiquetaNueva, setEtiquetaNueva] = useState('');
  const [diagnostico, setDiagnostico] = useState(caso.diagnostico);
  const [hallazgos, setHallazgos] = useState<string[]>(caso.hallazgosClave);
  const [puntos, setPuntos] = useState<string[]>(caso.puntosAprendizaje);
  const [errores, setErrores] = useState<string[]>(caso.erroresComunes);
  const [guardadoOk, setGuardadoOk] = useState(false);

  // Verdad ESTRUCTURADA del estudio (heredada del reporte · §7A) — editable al curar.
  const [contenido, setContenido] = useState<ContenidoEstructuradoCaso | null>(caso.contenidoEstructurado);
  const [contenidoSucio, setContenidoSucio] = useState(false);
  const [contenidoOk, setContenidoOk] = useState(false);
  const cambiarValor = (id: string, v: unknown) => {
    setContenido((c) => (c ? { ...c, valores: { ...(c.valores ?? {}), [id]: v } } : c));
    setContenidoSucio(true);
    setContenidoOk(false);
  };
  const cambiarImpresion = (v: string) => {
    setContenido((c) => (c ? { ...c, impresion: v } : c));
    setContenidoSucio(true);
    setContenidoOk(false);
  };
  const guardarContenido = () =>
    iniciar(async () => {
      await guardarContenidoEstructuradoCaso(caso.id, contenido);
      setContenidoSucio(false);
      setContenidoOk(true);
    });

  // Estudio DICOM (staff → banco curado · tabla casos_biblioteca).
  const listoEstudio = caso.estudioEstado === 'anonimizado';
  const [archivos, setArchivos] = useState<File[]>([]);
  const [fase, setFase] = useState<FaseDicom>('idle');
  const [faseMsg, setFaseMsg] = useState('');
  const [verNonce, setVerNonce] = useState(0);
  const [quitando, setQuitando] = useState<number | null>(null);
  const subiendo = fase === 'subiendo' || fase === 'procesando';

  async function subirEstudio() {
    if (archivos.length === 0) return;
    // Anexa si ya hay estudio; si no, crea (reemplaza vacío).
    const final = await ejecutarSubidaMulti(
      caso.id,
      'casos_biblioteca',
      archivos,
      (f, msg) => {
        setFase(f);
        setFaseMsg(msg ?? '');
      },
      listoEstudio,
    );
    if (final === 'anonimizado') {
      setArchivos([]);
      setFase('idle');
      setVerNonce((n) => n + 1);
      router.refresh();
    }
  }

  async function quitarSerieEstudio(indice: number) {
    setQuitando(indice);
    const r = await quitarSerieDicom(caso.id, indice, 'casos_biblioteca');
    setQuitando(null);
    if (r.ok) {
      setVerNonce((n) => n + 1);
      router.refresh();
    }
  }

  const agregarEtiqueta = () => {
    const t = etiquetaNueva.trim().replace(/^#+/, '');
    if (t && !etiquetas.includes(t) && etiquetas.length < 12) setEtiquetas([...etiquetas, t]);
    setEtiquetaNueva('');
  };

  // Módulos agrupados por programa para el dropdown (§5B · lo elige el docente).
  const modulosPorPrograma = useMemo(() => {
    const m = new Map<string, ModuloOpcionCaso[]>();
    for (const mod of modulos) {
      const lista = m.get(mod.programa) ?? [];
      lista.push(mod);
      m.set(mod.programa, lista);
    }
    return [...m.entries()];
  }, [modulos]);

  const datos = () => ({
    titulo,
    organo,
    patologia,
    dominio,
    moduloId,
    tecnica,
    equipo,
    vineta,
    etiquetas: etiquetas.filter((x) => x.trim()),
    diagnostico,
    hallazgosClave: hallazgos.filter((x) => x.trim()),
    puntosAprendizaje: puntos.filter((x) => x.trim()),
    erroresComunes: errores.filter((x) => x.trim()),
  });

  function guardar() {
    setGuardadoOk(false);
    iniciar(async () => {
      await guardarCaso(caso.id, datos());
      setGuardadoOk(true);
    });
  }
  function publicar() {
    iniciar(async () => {
      await guardarCaso(caso.id, datos());
      await publicarCaso(caso.id, !caso.publicado);
    });
  }

  const listoSimulador = useMemo(
    () => hallazgos.filter((x) => x.trim()).length >= 3 && puntos.filter((x) => x.trim()).length >= 2,
    [hallazgos, puntos],
  );

  return (
    <div className="flex h-dvh flex-col bg-background font-sans text-foreground antialiased">
      {/* ───── Header contextual ───── */}
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
        <Link
          href={rutaBase}
          aria-label="Volver a Casos"
          className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-white/20 text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
        >
          <ChevronLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
        </Link>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="whitespace-nowrap text-[12.5px] font-medium text-white/60">Casos</span>
          <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/35" strokeWidth={2} />
          <span className="truncate text-[14.5px] font-bold text-sidebar-foreground">{titulo || 'Caso sin título'}</span>
          <span
            className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${
              caso.publicado
                ? 'bg-primary text-[color:var(--sidebar)]'
                : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
            }`}
          >
            {caso.publicado ? 'En Biblioteca' : 'Por curar'}
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {guardadoOk && !pendiente && (
            <span className={`${mono} inline-flex items-center gap-1.5 text-[11.5px] text-white/60`}>
              <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-primary" />
              guardado
            </span>
          )}
          <button
            type="button"
            title="Marcar para Simulador — pendiente de DB/API"
            disabled
            className="inline-flex h-[38px] cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/20 px-3.5 text-[12.5px] font-semibold text-sidebar-foreground opacity-50"
          >
            <MonitorPlay aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Marcar para Simulador
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={pendiente}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] border border-white/20 px-3.5 text-[12.5px] font-semibold text-sidebar-foreground transition-colors hover:bg-white/10 disabled:opacity-50 ${focusRingDark}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            {pendiente ? 'Guardando…' : 'Guardar borrador'}
          </button>
          <button
            type="button"
            onClick={publicar}
            disabled={pendiente}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-white disabled:opacity-60 ${focusRingDark}`}
          >
            <BookCopy aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            {caso.publicado ? 'Quitar de Biblioteca' : 'Publicar a Biblioteca'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ════════ Visor DICOM real / uploader (§4.7 multi-serie) ════════ */}
        <div className="flex min-w-0 flex-1 flex-col bg-sidebar">
          <div className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-white/10 px-4">
            <span className={`${kicker} text-white/55`}>Visor DICOM</span>
            <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full bg-white/[0.1] px-2.5 text-[11px] font-semibold text-white/70">
              Cornerstone3D
            </span>
            <span
              className={`ml-auto inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${
                listoEstudio ? 'bg-primary/[0.16] text-primary' : 'bg-white/[0.1] text-white/70'
              }`}
            >
              <ShieldCheck aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              {listoEstudio ? `Anonimizado · ${caso.series} ${caso.series === 1 ? 'serie' : 'series'}` : 'Anonimización en ingesta'}
            </span>
          </div>

          {listoEstudio ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <VisorEstudio key={verNonce} casoId={caso.id} tabla="casos_biblioteca" className="h-[64vh] min-h-[460px]" />

              {/* Gestor de series: quitar + agregar (anexa al estudio) */}
              <div className="mt-4 rounded-xl bg-card p-3.5">
                <div className="flex items-center gap-2">
                  <p className={`${kicker} text-muted-foreground`}>Series del estudio</p>
                  <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
                    {caso.series} {caso.series === 1 ? 'serie' : 'series'}
                  </span>
                </div>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {Array.from({ length: caso.series }).map((_, i) => (
                    <li
                      key={i}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-[12px] font-semibold"
                    >
                      Serie {i + 1}
                      <button
                        type="button"
                        onClick={() => quitarSerieEstudio(i)}
                        disabled={quitando !== null}
                        aria-label={`Quitar serie ${i + 1}`}
                        className={`grid h-5 w-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-[color:var(--destructive-surface)] hover:text-[color:var(--destructive-foreground)] disabled:opacity-50 ${focusRing}`}
                      >
                        {quitando === i ? (
                          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.2} />
                        ) : (
                          <Trash2 className="h-3 w-3" strokeWidth={1.9} />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mb-2 mt-3.5 text-[11.5px] font-semibold">Agregar series</p>
                {fase !== 'idle' && fase !== 'anonimizado' ? (
                  <div className="flex items-center gap-2.5 rounded-[12px] border border-border bg-muted p-4 text-[13px]">
                    {fase === 'error' ? (
                      <span className="text-[color:var(--destructive-foreground)]">{faseMsg || ETIQUETA_FASE.error}</span>
                    ) : (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-secondary" strokeWidth={2} />
                        <span className="font-semibold">{ETIQUETA_FASE[fase]}</span>
                      </>
                    )}
                  </div>
                ) : (
                  <SelectorArchivosDicom value={archivos} onChange={setArchivos} bloqueado={subiendo} />
                )}
                {archivos.length > 0 && fase === 'idle' && (
                  <button
                    type="button"
                    onClick={subirEstudio}
                    className={`mt-3 inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                  >
                    Agregar {archivos.length} {archivos.length === 1 ? 'serie' : 'series'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="relative min-h-0 flex-1 overflow-y-auto">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)' }}
              />
              <div className="relative mx-auto max-w-[520px] p-6">
                <p className="text-[15px] font-bold text-white">Suba el estudio del caso</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--hero-ink-muted)' }}>
                  Varias series (.dcm), imágenes <strong>JPG/PNG</strong> del equipo, o un{' '}
                  <strong>.zip</strong> con el estudio completo. Se anonimizan en la ingesta (§10)
                  antes de entrar al banco. El visor Cornerstone3D las muestra al terminar.
                </p>
                <div className="mt-4 rounded-xl bg-card p-3.5">
                  {fase !== 'idle' && fase !== 'anonimizado' ? (
                    <div className="flex items-center gap-2.5 rounded-[12px] border border-border bg-muted p-4 text-[13px]">
                      {fase === 'error' ? (
                        <span className="text-[color:var(--destructive-foreground)]">{faseMsg || ETIQUETA_FASE.error}</span>
                      ) : (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-secondary" strokeWidth={2} />
                          <span className="font-semibold">{ETIQUETA_FASE[fase]}</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <SelectorArchivosDicom value={archivos} onChange={setArchivos} bloqueado={subiendo} />
                  )}
                  {archivos.length > 0 && fase === 'idle' && (
                    <button
                      type="button"
                      onClick={subirEstudio}
                      className={`mt-3.5 inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                    >
                      Subir {archivos.length} {archivos.length === 1 ? 'serie' : 'series'}
                    </button>
                  )}
                  {fase === 'error' && (
                    <button
                      type="button"
                      onClick={() => {
                        setFase('idle');
                        setFaseMsg('');
                      }}
                      className={`mt-3 h-10 rounded-[9px] border border-border bg-card px-4 text-[12.5px] font-semibold ${focusRing}`}
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ════════ Panel de autoría (real) ════════ */}
        <aside className="w-[452px] shrink-0 overflow-y-auto border-l border-border bg-card">
          {/* catalogación */}
          <section className="border-b border-border px-5 py-5">
            <p className={`${kicker} text-muted-foreground`}>Catalogación</p>
            <label className="mt-3 block">
              <span className="block text-[11.5px] font-semibold">Título del caso</span>
              <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={`${campoBase} h-10`} placeholder="Diagnóstico principal" />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[11.5px] font-semibold">Órgano</span>
                <input value={organo} onChange={(e) => setOrgano(e.target.value)} className={`${campoBase} h-10`} placeholder="Riñón, Vesícula…" />
              </label>
              <label className="block">
                <span className="block text-[11.5px] font-semibold">Patología</span>
                <input value={patologia} onChange={(e) => setPatologia(e.target.value)} className={`${campoBase} h-10`} placeholder="Litiasis, colecistitis…" />
              </label>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[11.5px] font-semibold">Técnica</span>
                <input value={tecnica} onChange={(e) => setTecnica(e.target.value)} className={`${campoBase} h-10`} placeholder="Modo B, Doppler…" />
              </label>
              <label className="block">
                <span className="block text-[11.5px] font-semibold">Equipo</span>
                <input value={equipo} onChange={(e) => setEquipo(e.target.value)} className={`${campoBase} h-10`} placeholder="Convexo 3.5–5 MHz…" />
              </label>
            </div>
            <div className="mt-3">
              <span className="block text-[11.5px] font-semibold">Dominio I-AIM</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {DOMINIOS.map((d) => {
                  const on = d === dominio;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDominio(on ? null : d)}
                      aria-pressed={on}
                      className={`h-[34px] rounded-full border px-3 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                        on ? 'border-transparent bg-accent text-accent-foreground' : `border-border bg-card ${softText} hover:bg-muted`
                      }`}
                    >
                      {DOMINIO_LABEL[d]}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="mt-3 block">
              <span className="flex items-baseline gap-2">
                <span className="block text-[11.5px] font-semibold">Módulo</span>
                <span className="text-[10.5px] text-muted-foreground">lo asignas tú (no se adivina)</span>
              </span>
              <Select
                aria-label="Módulo"
                value={moduloId ?? ''}
                onChange={(v) => setModuloId(v || null)}
                className={`mt-1.5 flex h-10 w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-[13px] text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`}
                placeholder="Sin asignar"
                options={[
                  { value: '', label: 'Sin asignar' },
                  ...modulosPorPrograma.flatMap(([programa, mods]) => [
                    { value: `__grp_${programa}`, label: programa, disabled: true },
                    ...mods.map((m) => ({ value: m.id, label: m.nombre })),
                  ]),
                ]}
              />
            </label>
            <label className="mt-3 block">
              <span className="block text-[11.5px] font-semibold">Viñeta clínica</span>
              <textarea
                rows={3}
                value={vineta}
                onChange={(e) => setVineta(e.target.value)}
                placeholder="Edad, motivo de consulta y contexto — sin datos que identifiquen al paciente."
                className={`${campoBase} resize-y py-2.5 leading-relaxed`}
              />
            </label>
            <label className="mt-3 block">
              <span className="block text-[11.5px] font-semibold">Diagnóstico confirmado</span>
              <textarea
                rows={2}
                value={diagnostico}
                onChange={(e) => setDiagnostico(e.target.value)}
                placeholder="El diagnóstico con el que se cerró el caso"
                className={`${campoBase} resize-none py-2.5 leading-relaxed`}
              />
            </label>

            <div className="mt-3">
              <span className="block text-[11.5px] font-semibold">Etiquetas</span>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 rounded-[10px] border border-border bg-card p-2 focus-within:border-secondary">
                {etiquetas.map((t) => (
                  <span
                    key={t}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full bg-accent px-2.5 text-[12px] font-semibold text-accent-foreground"
                  >
                    <Tag aria-hidden className="h-3 w-3" strokeWidth={1.75} />#{t}
                    <button
                      type="button"
                      onClick={() => setEtiquetas(etiquetas.filter((x) => x !== t))}
                      aria-label={`Quitar ${t}`}
                      className={`grid h-4 w-4 place-items-center rounded-full hover:bg-[color:var(--track)] ${focusRing}`}
                    >
                      <Trash2 className="h-2.5 w-2.5" strokeWidth={2} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={etiquetaNueva}
                  onChange={(e) => setEtiquetaNueva(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      agregarEtiqueta();
                    }
                  }}
                  onBlur={agregarEtiqueta}
                  placeholder={etiquetas.length ? '' : '#litiasis, #doppler…'}
                  className="h-7 min-w-[120px] flex-1 bg-transparent px-1 text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </section>

          {/* hallazgos del estudio (verdad ESTRUCTURADA heredada del reporte · §7A) */}
          {tieneContenidoEstructurado(contenido) && (
            <section className="border-b border-border px-5 py-5">
              <div className="flex items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>Hallazgos del estudio</p>
                {contenidoOk && !pendiente && (
                  <span className={`${mono} ml-auto inline-flex items-center gap-1.5 text-[11px] text-muted-foreground`}>
                    <span aria-hidden className="h-[7px] w-[7px] rounded-full bg-primary" />
                    guardado
                  </span>
                )}
              </div>
              <p className={`mt-2 text-[12px] leading-relaxed ${softText}`}>
                Del reporte de origen — coincide con él (tablas, mediciones). Ajústalo si el
                estudio lo requiere; se guarda aparte de la catalogación.
              </p>
              <div className="mt-4">
                <ContenidoEstructuradoCasoVista
                  contenido={contenido!}
                  modo="llenar"
                  onCambioValor={cambiarValor}
                  onCambioImpresion={cambiarImpresion}
                />
              </div>
              <button
                type="button"
                onClick={guardarContenido}
                disabled={pendiente || !contenidoSucio}
                className={`mt-4 inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
              >
                <Save aria-hidden className="h-4 w-4" strokeWidth={1.9} />
                {pendiente ? 'Guardando…' : 'Guardar hallazgos'}
              </button>
            </section>
          )}

          {/* verdad del caso */}
          <section className="px-5 py-5" style={{ background: '#fbfbfd' }}>
            <div className="flex items-center gap-2.5">
              <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]">
                <Sparkles className="h-[15px] w-[15px]" strokeWidth={1.75} />
              </span>
              <p className={`${kicker} text-[color:var(--info-foreground)]`}>Verdad del caso</p>
              <span className="ml-auto inline-flex h-[22px] items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2 text-[10.5px] font-bold text-[color:var(--info-foreground)]">
                La usa Eco y el simulador
              </span>
            </div>
            <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
              No es texto libre: Eco y el simulador comparan la respuesta del alumno contra estos
              puntos. (Anclar cada hallazgo a una anotación de la imagen llega con el visor · 4.7.)
            </p>

            <ListaVerdad titulo="Hallazgos clave" items={hallazgos} onCambio={setHallazgos} color="primary" placeholder="Un hallazgo que define el caso" />
            <ListaVerdad titulo="Puntos de aprendizaje" items={puntos} onCambio={setPuntos} color="secondary" placeholder="Qué debe aprender el alumno" />
            <ListaVerdad titulo="Errores comunes a evitar" items={errores} onCambio={setErrores} color="warning" placeholder="Un error frecuente" />

            <div className="mt-5 flex items-center gap-2.5 rounded-[11px] border border-border bg-card px-3.5 py-3">
              <span className={`min-w-0 flex-1 text-[12px] leading-relaxed ${softText}`}>
                Listo para simulador con <span className="font-bold text-foreground">3 hallazgos clave</span> y{' '}
                <span className="font-bold text-foreground">2 puntos de aprendizaje</span>.
              </span>
              <span
                className={`inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-bold ${
                  listoSimulador
                    ? 'bg-accent text-accent-foreground'
                    : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                }`}
              >
                {listoSimulador && <Check aria-hidden className="h-3 w-3" strokeWidth={2.4} />}
                {listoSimulador ? 'Cumple' : 'Falta estructura'}
              </span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ───────────────────────── Lista editable de la verdad ───────────────────────── */

function ListaVerdad({
  titulo,
  items,
  onCambio,
  color,
  placeholder,
}: {
  titulo: string;
  items: string[];
  onCambio: (v: string[]) => void;
  color: 'primary' | 'secondary' | 'warning';
  placeholder: string;
}) {
  const [nuevo, setNuevo] = useState('');
  const esWarning = color === 'warning';

  function agregar() {
    const v = nuevo.trim();
    if (!v) return;
    onCambio([...items, v]);
    setNuevo('');
  }

  return (
    <div className="mt-5">
      <p className="text-[11.5px] font-semibold">{titulo}</p>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {items.map((texto, i) => (
          <li
            key={i}
            className={`flex items-start gap-2.5 rounded-[10px] border px-3 py-2 ${
              esWarning ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]' : 'border-border bg-card'
            }`}
          >
            {esWarning ? (
              <TriangleAlert aria-hidden className="mt-2 h-3.5 w-3.5 shrink-0 text-[color:var(--warning-foreground)]" strokeWidth={2} />
            ) : (
              <span
                aria-hidden
                className={`mt-3 h-[7px] w-[7px] shrink-0 rounded-full ${color === 'primary' ? 'bg-primary' : 'bg-secondary'}`}
              />
            )}
            <input
              value={texto}
              onChange={(e) => onCambio(items.map((x, j) => (j === i ? e.target.value : x)))}
              aria-label={`${titulo} ${i + 1}`}
              className={`min-w-0 flex-1 bg-transparent py-1 text-[12.5px] font-medium leading-relaxed outline-none ${
                esWarning ? 'text-[color:var(--warning-foreground)]' : ''
              }`}
            />
            <button
              type="button"
              aria-label="Quitar"
              onClick={() => onCambio(items.filter((_, j) => j !== i))}
              className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive ${focusRing}`}
            >
              <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder={placeholder}
          className="h-10 min-w-0 flex-1 rounded-[10px] border border-dashed border-[color:var(--track)] bg-card px-3 text-[12.5px] text-foreground outline-none transition-colors focus:border-primary placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={agregar}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-border bg-card text-secondary transition-colors hover:bg-accent ${focusRing}`}
          aria-label={`Agregar a ${titulo}`}
        >
          <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
