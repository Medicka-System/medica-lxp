'use client';

/**
 * Studio · Editor del bloque de TEORÍA (§5B). Editor a fondo del contenido `texto`
 * de una lección: el diseñador redacta la teoría con el EditorRico (formato, tablas,
 * imágenes, embeds, fórmulas KaTeX, importar Word…). El cuerpo se guarda como HTML
 * en `lxp.contenidos.cuerpo` (CRUD directo bajo RLS · Regla de Oro §2).
 *
 * Header contextual a pantalla completa (route group (studio-editor), sin el shell
 * general): breadcrumb + estado + guardado. Autosave con rebote + botón Guardar.
 *
 * La NARRACIÓN (TTS) queda como gancho PENDIENTE DE API (contrato en teoria-acciones):
 * el editor NO sintetiza voz; solo expone el punto de entrada.
 */
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronLeft, Lightbulb, Pencil, Save, Volume2 } from 'lucide-react';
import { EditorRico } from '@/components/editor-rico';
import { mono, kicker, softText, focusRingDark } from '@/lib/studio/estilos';
import { haceCuanto } from '@/lib/format';
import type { ContenidoTeoria } from '@/lib/studio/teoria-datos';
import { guardarTeoriaCuerpo, renombrarTeoria } from '@/lib/studio/teoria-acciones';

export function EditorTeoria({ contenido }: { contenido: ContenidoTeoria }) {
  const { id, contexto } = contenido;
  const programaId = contexto.programaId;

  const [cuerpo, setCuerpo] = useState(contenido.cuerpo);
  const [guardando, setGuardando] = useState(false);
  const [guardadoEn, setGuardadoEn] = useState<string | null>(null);
  const [sucio, setSucio] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef(contenido.cuerpo);

  const guardar = useCallback(
    async (html: string) => {
      if (html === ultimo.current) {
        setSucio(false);
        return;
      }
      setGuardando(true);
      try {
        await guardarTeoriaCuerpo(id, html, programaId);
        ultimo.current = html;
        setGuardadoEn(haceCuanto(new Date()));
        setSucio(false);
      } finally {
        setGuardando(false);
      }
    },
    [id, programaId],
  );

  function alCambiar(html: string) {
    setCuerpo(html);
    setSucio(html !== ultimo.current);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => guardar(html), 1200);
  }

  function guardarYa() {
    if (timer.current) clearTimeout(timer.current);
    void guardar(cuerpo);
  }

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const publicado = contexto.publicado;
  const estadoTexto = guardando
    ? 'guardando…'
    : sucio
      ? 'cambios sin guardar'
      : guardadoEn
        ? `guardado ${guardadoEn}`
        : 'sin cambios';

  return (
    <div className="flex h-dvh flex-col bg-background font-sans text-foreground antialiased">
      {/* ───── Header contextual ───── */}
      <header className="relative z-20 flex h-[60px] shrink-0 items-center gap-3 bg-sidebar px-5">
        <Link
          href={`/programas/${programaId}`}
          aria-label="Volver al programa"
          className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-white/20 text-sidebar-foreground transition-colors hover:bg-white/10 ${focusRingDark}`}
        >
          <ChevronLeft aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
        </Link>

        <div className="flex min-w-0 items-center gap-2">
          <span className="hidden whitespace-nowrap text-[12.5px] font-medium text-white/60 sm:inline">
            {contexto.programa}
          </span>
          <span aria-hidden className="hidden text-white/35 sm:inline">
            /
          </span>
          <span className="hidden whitespace-nowrap text-[12.5px] font-medium text-white/60 md:inline">
            {contexto.modulo} · {contexto.leccion}
          </span>
          <span aria-hidden className="hidden text-white/35 md:inline">
            /
          </span>
          <TituloEditable id={id} programaId={programaId} tituloInicial={contenido.titulo} />
          <span
            className={`ml-1 inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-bold ${
              publicado
                ? 'bg-primary text-[color:var(--primary-foreground)]'
                : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
            }`}
          >
            {publicado ? 'Publicado' : 'Borrador'}
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span className={`${mono} inline-flex items-center gap-1.5 whitespace-nowrap text-[11.5px] text-white/60`}>
            <span
              aria-hidden
              className={`h-[7px] w-[7px] rounded-full ${
                guardando ? 'bg-[color:var(--warning)]' : sucio ? 'bg-[color:var(--warning)]' : 'bg-primary'
              }`}
            />
            {estadoTexto}
          </span>
          <button
            type="button"
            onClick={guardarYa}
            disabled={guardando || !sucio}
            className={`inline-flex h-[38px] items-center gap-2 whitespace-nowrap rounded-[9px] bg-primary px-4 text-[13px] font-bold text-[color:var(--primary-foreground)] transition-colors hover:bg-white disabled:opacity-50 disabled:hover:bg-primary ${focusRingDark}`}
          >
            <Save aria-hidden className="h-4 w-4" strokeWidth={2} />
            Guardar
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ════════ Lienzo de teoría ════════ */}
        <div className="min-w-0 flex-1 overflow-y-auto px-6 py-7">
          <div className="mx-auto w-full max-w-[820px]">
            <p className={`${kicker} text-secondary`}>Bloque de teoría · lectura</p>
            <h1 className="mt-2 text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
              {contenido.titulo}
            </h1>
            <p className={`mt-1.5 text-[12.5px] ${softText}`}>
              Redacta la teoría de la lección. Se guarda sola mientras escribes.
            </p>

            <div className="mt-5">
              <EditorRico
                contenidoInicial={contenido.cuerpo}
                onChange={alCambiar}
                minAlto={420}
                placeholder="Escribe la teoría de esta lección: usa títulos, listas, imágenes, tablas y fórmulas. Puedes importar un .docx desde la barra."
                ariaLabel="Cuerpo de la teoría"
              />
            </div>
          </div>
        </div>

        {/* ════════ Panel lateral ════════ */}
        <aside className="hidden w-[316px] shrink-0 overflow-y-auto border-l border-border bg-card p-5 lg:block">
          {/* Narración TTS — pendiente de API */}
          <p className={`${kicker} text-muted-foreground`}>Narración</p>
          <div className="mt-3 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-3.5">
            <div className="flex items-center gap-2">
              <Volume2 aria-hidden className="h-4 w-4 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
              <p className="text-[12px] font-bold text-[color:var(--info-foreground)]">
                Audio narrado — pendiente de API
              </p>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-[color:var(--info-foreground)]">
              La síntesis de voz del cuerpo se resuelve en el dominio (worker de TTS · apps/api).
              El editor solo dejará el gancho para generarla.
            </p>
            <button
              type="button"
              disabled
              title="Disponible cuando se cablee el servicio de narración (apps/api)"
              className="mt-3 inline-flex h-9 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[9px] border border-[color:var(--info-border)] bg-card/60 px-3 text-[12.5px] font-semibold text-[color:var(--info-foreground)] opacity-70"
            >
              <Volume2 aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Generar narración
            </button>
          </div>

          {/* Tips */}
          <p className={`${kicker} mt-6 text-muted-foreground`}>Consejos</p>
          <div className="mt-3 space-y-2.5">
            {[
              'Usa títulos (H1–H3) para que el alumno pueda escanear la lección.',
              'Fórmulas: escribe $x^2$ para inline o $$…$$ para bloque, o usa el botón Σ.',
              'Importa un .docx desde la barra para traer material que ya tienes en Word.',
              'Ver/editar HTML te deja pegar contenido rico desde otra fuente.',
            ].map((t) => (
              <div key={t} className="flex gap-2.5">
                <Lightbulb aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} />
                <p className={`text-[12px] leading-relaxed ${softText}`}>{t}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ── Título editable inline (en el header navy) ── */
function TituloEditable({
  id,
  programaId,
  tituloInicial,
}: {
  id: string;
  programaId: string;
  tituloInicial: string;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(tituloInicial);
  const [, iniciar] = useTransition();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editando) ref.current?.select();
  }, [editando]);

  function confirmar() {
    setEditando(false);
    const limpio = texto.trim();
    if (limpio && limpio !== tituloInicial) iniciar(() => renombrarTeoria(id, limpio, programaId));
    else setTexto(tituloInicial);
  }

  if (editando) {
    return (
      <input
        ref={ref}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={confirmar}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmar();
          if (e.key === 'Escape') {
            setTexto(tituloInicial);
            setEditando(false);
          }
        }}
        aria-label="Renombrar el bloque de teoría"
        className="min-w-0 rounded-[7px] border border-white/40 bg-white/10 px-1.5 py-0.5 text-[14.5px] font-bold text-sidebar-foreground outline-none placeholder:text-white/40"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      title={`Renombrar: ${texto}`}
      className={`group/inline inline-flex min-w-0 items-center gap-1.5 rounded-[7px] px-1 text-left text-[14.5px] font-bold text-sidebar-foreground hover:bg-white/10 ${focusRingDark}`}
    >
      <span className="min-w-0 truncate">{texto}</span>
      <Pencil
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 text-white/50 opacity-0 transition-opacity group-hover/inline:opacity-100"
        strokeWidth={1.75}
      />
    </button>
  );
}
