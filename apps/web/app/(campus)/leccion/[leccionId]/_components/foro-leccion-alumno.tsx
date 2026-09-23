'use client';

/**
 * FORO de la lección — experiencia del alumno (§5C · mock leccion-foro). Tres estados
 * en una card:
 *   entrada  → instrucciones + rúbrica + composer; los posts de los compañeros están
 *              BLOQUEADOS (muro velado). El desbloqueo NO es solo UI: la RLS (0030)
 *              esconde los posts ajenos hasta que el alumno publica el suyo.
 *   listado  → ya publicó → posts del grupo desbloqueados, composer fuera (uno por alumno).
 *   post     → interior: cuerpo rico + reacción + hilo de 2 niveles + comentar/editar.
 *
 * Publicar/responder/reaccionar/editar corren server-side (foro-acciones) y el estado
 * se recarga con `router.refresh()` (no un setState optimista): así la vista siempre
 * refleja lo que la RLS permite ver.
 */

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  Eye,
  Flag,
  Image as ImageIcon,
  Lock,
  Maximize2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Reply,
  Save,
  Send,
  Target,
  ThumbsUp,
  Users,
  Video,
  X,
} from 'lucide-react';
import { EditorRico } from '@/components/editor-rico/editor-rico';
import { ContenidoRico } from '@/components/editor-rico/contenido-rico';
import { focusRing, mono } from '@/components/tokens';
import {
  crearPostForo,
  responderForo,
  reaccionarForo,
  editarMensajeForo,
} from '@/lib/campus/foro-acciones';
import type {
  AutorForo,
  ComentarioForo,
  ForoLeccionData,
  PostForo,
} from '@/lib/campus/foro-leccion';

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** ISO → "12 sep · 18:02" (mono, sin locale · SSR estable, componentes UTC). */
function fmtFecha(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return '';
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1] ?? ''} · ${m[4]}:${m[5]}`;
}
/** ISO YYYY-MM-DD → "30 sep". */
function fmtDia(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${Number(m[3])} ${MESES[Number(m[2]) - 1] ?? ''}` : iso;
}

const kicker = 'text-[10.5px] font-semibold uppercase tracking-[0.14em]';
const softText = 'text-foreground-soft';

function Avatar({ autor, size = 38 }: { autor: AutorForo; size?: number }) {
  return (
    <span className="relative shrink-0 self-start leading-none">
      <span
        aria-hidden
        style={{ width: size, height: size, fontSize: size * 0.34 }}
        className="grid place-items-center rounded-full bg-sidebar font-bold text-sidebar-foreground"
      >
        {autor.ini}
      </span>
      {autor.docente && (
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-card bg-primary text-[color:var(--sidebar)]"
        >
          <Check className="h-2 w-2" strokeWidth={3} />
        </span>
      )}
    </span>
  );
}

function ChipRol({ rol }: { rol: 'Usted' | 'Docente' }) {
  return (
    <span
      className={`inline-flex h-[19px] items-center whitespace-nowrap rounded-full px-[7px] text-[9.5px] font-bold ${
        rol === 'Usted' ? 'bg-primary text-[color:var(--sidebar)]' : 'bg-sidebar text-sidebar-foreground'
      }`}
    >
      {rol}
    </span>
  );
}

function Adjuntos({ a }: { a: { tipo: 'imagen' | 'loop'; cantidad: number } }) {
  const plural = a.tipo === 'loop' ? (a.cantidad === 1 ? 'loop' : 'loops') : a.cantidad === 1 ? 'imagen' : 'imágenes';
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
      {a.tipo === 'loop' ? (
        <Video aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
      ) : (
        <ImageIcon aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
      )}
      {a.cantidad} {plural}
    </span>
  );
}

export function ForoLeccionAlumno({ data, preview = false }: { data: ForoLeccionData; preview?: boolean }) {
  const router = useRouter();
  const [postAbiertoId, setPostAbiertoId] = useState<string | null>(null);
  const [orden, setOrden] = useState<'recientes' | 'sin-responder' | 'docente'>('recientes');

  const puedePublicar = data.puedePublicar && !preview;

  // Vista derivada: si hay post abierto → interior; si no, entrada/listado por yaPublico.
  const todos = useMemo(() => (data.miPost ? [data.miPost, ...data.posts] : data.posts), [data.miPost, data.posts]);
  const postAbierto = postAbiertoId ? todos.find((p) => p.id === postAbiertoId) ?? null : null;

  const visibles = useMemo(() => {
    if (orden === 'sin-responder') return data.posts.filter((p) => p.respuestas === 0);
    if (orden === 'docente') return data.posts.filter((p) => p.autor.docente);
    return data.posts;
  }, [data.posts, orden]);

  const totalPublicaciones = data.posts.length + (data.miPost ? 1 : 0);
  const totalRespuestas =
    data.posts.reduce((s, p) => s + p.respuestas, 0) + (data.miPost?.respuestas ?? 0);

  /* ═══════════ Header navy (los tres estados) ═══════════ */
  const HeaderCard = () => (
    <div className="relative overflow-hidden px-6 py-6 sm:px-[30px]" style={{ background: 'var(--sidebar)' }}>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 150% at 88% 0%, color-mix(in srgb, var(--secondary) 60%, transparent) 0%, transparent 62%)' }}
      />
      <div className="relative">
        <p className={`${kicker} inline-flex items-center gap-[7px] text-[11px]`} style={{ color: 'var(--primary)' }}>
          <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          Foro de la lección · {data.tema.grupo}
        </p>
        <h1 className="mt-2.5 text-[26px] font-extrabold leading-[1.22] tracking-[-0.02em]" style={{ color: 'var(--hero-ink)', textWrap: 'pretty' }}>
          {data.tema.titulo}
        </h1>
        <p className="mt-2.5 text-[13.5px] leading-relaxed" style={{ color: 'var(--hero-ink-muted)' }}>
          {data.tema.modulo} · {data.tema.leccion} · discusión cerrada de su grupo
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-[7px] text-[12.5px]" style={{ color: 'var(--hero-ink-muted)' }}>
            <Users aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            {data.tema.grupo}
          </span>
          {data.tema.cierra && (
            <>
              <span aria-hidden className="h-3.5 w-px bg-white/20" />
              <span className="inline-flex items-center gap-[7px] text-[12.5px]" style={{ color: 'var(--hero-ink-muted)' }}>
                Abierto hasta el <span className={mono}>{fmtDia(data.tema.cierra)}</span>
              </span>
            </>
          )}
          <span aria-hidden className="h-3.5 w-px bg-white/20" />
          {data.yaPublico ? (
            <span className="inline-flex items-center gap-[7px] text-[12.5px]" style={{ color: 'var(--hero-ink-muted)' }}>
              <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
              {totalPublicaciones} publicaciones · {totalRespuestas} respuestas
            </span>
          ) : (
            <span className="inline-flex h-6 items-center gap-[7px] whitespace-nowrap rounded-full bg-white/[0.14] px-2.5 text-[11.5px] font-bold text-white">
              <Lock aria-hidden className="h-3 w-3" strokeWidth={2} />
              {data.ocultos} posts esperando
            </span>
          )}
        </div>
      </div>
    </div>
  );

  /* ═══════════════ 3 · INTERIOR DEL POST ═══════════════ */
  if (postAbierto) {
    const indice = `${todos.findIndex((x) => x.id === postAbierto.id) + 1} de ${todos.length}`;
    const hilo = data.hilos[postAbierto.id] ?? [];
    const raices = hilo.filter((c) => !c.parentId);
    const hijosDe = (id: string) => hilo.filter((c) => c.parentId === id);
    return (
      <div className="mx-auto w-full max-w-[880px] px-5 py-7 sm:px-6 lg:px-8">
        <section aria-label="Publicación del foro" className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
          {/* miga */}
          <div className="flex flex-wrap items-center gap-3.5 border-b border-border px-6 py-4 sm:px-[30px]">
            <button
              type="button"
              onClick={() => setPostAbiertoId(null)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card pl-2.5 pr-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <ArrowLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
              Volver al foro
            </button>
            <span className="flex min-w-0 flex-col leading-[1.25]">
              <span className="truncate text-[12.5px] font-bold">{data.tema.titulo}</span>
              <span className="text-[11px] text-muted-foreground">
                Foro · {data.tema.modulo} · {data.tema.leccion} · {data.tema.grupo}
              </span>
            </span>
            <span className={`${mono} ml-auto whitespace-nowrap text-[11.5px] text-muted-foreground`}>{indice}</span>
          </div>

          <PostInterior
            post={postAbierto}
            actividadId={data.actividadId}
            grupo={data.tema.grupo}
            puedePublicar={puedePublicar}
            onCambio={() => router.refresh()}
          />

          {/* hilo · 2 niveles */}
          <section className="px-6 pt-6 sm:px-[30px]">
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${kicker} text-muted-foreground`}>{postAbierto.respuestas} respuestas</p>
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>
            <ul className="mt-1.5">
              {raices.map((c) => (
                <li key={c.id}>
                  <Comentario c={c} actividadId={data.actividadId} grupoId={data.grupoId} raizId={c.id} puedePublicar={puedePublicar} onCambio={() => router.refresh()} />
                  {hijosDe(c.id).length > 0 && (
                    <ul className="ml-[26px] border-l-2 border-border pl-5">
                      {hijosDe(c.id).map((h) => (
                        <li key={h.id}>
                          <Comentario c={h} nivel={1} actividadId={data.actividadId} grupoId={data.grupoId} raizId={c.id} puedePublicar={puedePublicar} onCambio={() => router.refresh()} />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              {raices.length === 0 && (
                <p className={`py-3 text-[13px] ${softText}`}>Sé el primero en responder este caso.</p>
              )}
            </ul>
          </section>

          {/* responder al post */}
          {puedePublicar && (
            <section className="px-6 pb-7 pt-5 sm:px-[30px]">
              <div className="flex gap-3.5">
                <Avatar autor={{ ...data.yo, rol: 'Usted', docente: false, esYo: true }} size={36} />
                <div className="min-w-0 flex-1">
                  <ComposerRespuesta
                    actividadId={data.actividadId}
                    grupoId={data.grupoId}
                    parentId={postAbierto.id}
                    pendientes={data.respuestasPendientes}
                    onListo={() => router.refresh()}
                  />
                </div>
              </div>
            </section>
          )}
        </section>
      </div>
    );
  }

  /* ═══════════════ 1 y 2 · ENTRADA / LISTADO ═══════════════ */
  return (
    <div className="mx-auto w-full max-w-[880px] px-5 py-7 sm:px-6 lg:px-8">
      <section aria-label="Foro de la lección" className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <HeaderCard />

        {/* ── ya publicó: tira de confirmación ── */}
        {data.yaPublico && (
          <div className="mx-6 mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-primary bg-accent px-4 py-3.5 sm:mx-[30px]">
            <span aria-hidden className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-card text-accent-foreground">
              <Check className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <p className={`min-w-[260px] flex-1 text-[13px] leading-relaxed ${softText}`}>
              <span className="font-bold text-foreground">Ya publicó su caso.</span> Cada quien publica una
              vez: de aquí en adelante participa respondiendo a sus compañeros
              {data.respuestasPendientes > 0 ? (
                <>
                  {' '}— le faltan <span className="font-bold text-foreground">{data.respuestasPendientes} respuestas</span> para completar la rúbrica.
                </>
              ) : (
                '.'
              )}
            </p>
          </div>
        )}

        {/* ── entrada: instrucciones ── */}
        {!data.yaPublico && data.instruccionesHtml && (
          <section className="px-6 pt-6 sm:px-[30px]">
            <div className="flex items-center gap-2.5">
              <p className={`${kicker} text-muted-foreground`}>Lo que pide el docente</p>
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>
            <div className="mt-3.5 max-w-[66ch] text-[15px] leading-[1.75]">
              <ContenidoRico html={data.instruccionesHtml} />
            </div>
          </section>
        )}

        {/* ── entrada: rúbrica ── */}
        {!data.yaPublico && data.rubrica && data.rubrica.criterios.length > 0 && (
          <section className="px-6 pt-5 sm:px-[30px]">
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2.5 bg-muted px-3.5 py-3.5">
                <p className="min-w-0 flex-1 text-[12.5px] font-bold">Cómo se evalúa su participación</p>
                <span className={`${mono} inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-bold text-muted-foreground`}>
                  {data.rubrica.total} pts
                </span>
              </div>
              <ul>
                {data.rubrica.criterios.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 border-t border-border px-3.5 py-3.5">
                    <span aria-hidden className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                      <Target className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold">{c.criterio}</span>
                      {c.descripcion && <span className={`mt-1 block text-[12.5px] leading-relaxed ${softText}`}>{c.descripcion}</span>}
                    </span>
                    {c.puntos != null && (
                      <span className={`${mono} shrink-0 whitespace-nowrap text-[12.5px] font-bold text-muted-foreground`}>{c.puntos} pts</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── entrada: composer del post ── */}
        {!data.yaPublico && (
          <section className="px-6 pt-5 sm:px-[30px]">
            <div className="flex items-center gap-2.5">
              <p className={`${kicker} text-secondary`}>Su publicación</p>
              <span aria-hidden className="h-px flex-1 bg-border" />
              <span className="whitespace-nowrap text-[11.5px] text-muted-foreground">
                se publica con su nombre ante el {data.tema.grupo}
              </span>
            </div>
            <div className="mt-3.5 flex gap-3.5">
              <Avatar autor={{ ...data.yo, rol: 'Usted', docente: false, esYo: true }} size={36} />
              <div className="min-w-0 flex-1">
                <ComposerPost
                  actividadId={data.actividadId}
                  grupoId={data.grupoId}
                  puedePublicar={puedePublicar}
                  onListo={() => router.refresh()}
                />
              </div>
            </div>
          </section>
        )}

        {/* ── entrada: muro bloqueado ── */}
        {!data.yaPublico && (
          <section className="px-6 pb-7 pt-6 sm:px-[30px]">
            <div className="relative overflow-hidden rounded-[14px] border-[1.5px] border-dashed border-[color:var(--track)] bg-muted p-[18px]">
              <div aria-hidden className="flex flex-col gap-2.5 opacity-[0.55] blur-[2.5px]">
                {[148, 186, 132].map((w, i) => (
                  <div key={w} className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
                    <span className="h-[34px] w-[34px] shrink-0 rounded-full bg-[color:var(--track)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block h-[11px] rounded-full bg-[color:var(--track)]" style={{ width: w }} />
                      <span className="mt-2.5 block h-[9px] w-full rounded-full bg-[color:var(--track)] opacity-60" />
                      <span className="mt-[7px] block h-[9px] rounded-full bg-[color:var(--track)] opacity-60" style={{ width: `${[72, 54, 84][i]}%` }} />
                    </span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-0 grid place-items-center p-5" style={{ background: 'linear-gradient(180deg, color-mix(in srgb, var(--muted) 55%, transparent) 0%, var(--muted) 46%)' }}>
                <div className="max-w-[52ch] text-center">
                  <span aria-hidden className="inline-grid h-[46px] w-[46px] place-items-center rounded-full border border-border bg-card text-accent-foreground">
                    <Lock className="h-[21px] w-[21px]" strokeWidth={1.75} />
                  </span>
                  <p className="mt-3 text-[16px] font-bold leading-snug">
                    {data.ocultos > 0 ? `Sus ${data.ocultos} compañeros ya publicaron` : 'Aún nadie ha publicado'}
                  </p>
                  <p className={`mt-2 text-[13px] leading-relaxed ${softText}`}>
                    Al publicar el suyo se abre el foro y podrá leerlos. Así nadie escribe condicionado por lo que ya dijeron los demás.
                  </p>
                </div>
              </div>
            </div>
            <BotonReportar />
          </section>
        )}

        {/* ── listado: su post ── */}
        {data.yaPublico && data.miPost && (
          <section className="px-6 pt-5 sm:px-[30px]">
            <div className="flex items-center gap-2.5">
              <p className={`${kicker} text-secondary`}>Su publicación</p>
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>
            <article className="mt-3.5 flex gap-3.5 rounded-xl border-[1.5px] border-primary bg-accent p-4">
              <Avatar autor={data.miPost.autor} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[13.5px] font-bold">{data.miPost.autor.nombre}</span>
                  <ChipRol rol="Usted" />
                  <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>{fmtFecha(data.miPost.creadoEn)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPostAbiertoId(data.miPost!.id)}
                  className={`mt-2.5 block w-full text-left text-[15px] font-bold leading-snug ${focusRing}`}
                  style={{ textWrap: 'pretty' }}
                >
                  {data.miPost.titulo}
                </button>
                <p className={`mt-1.5 line-clamp-2 text-[13.5px] leading-relaxed ${softText}`}>{data.miPost.extracto}</p>
                <div className="mt-3 flex flex-wrap items-center gap-3.5">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-accent-foreground">
                    <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {data.miPost.respuestas} {data.miPost.respuestas === 1 ? 'respuesta' : 'respuestas'}
                  </span>
                  {data.miPost.adjuntos && <Adjuntos a={data.miPost.adjuntos} />}
                  <button
                    type="button"
                    onClick={() => setPostAbiertoId(data.miPost!.id)}
                    className={`ml-auto inline-flex h-9 items-center gap-[7px] whitespace-nowrap rounded-[9px] bg-card px-3 text-[12.5px] font-semibold text-accent-foreground ${focusRing}`}
                  >
                    <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Editar
                  </button>
                </div>
              </div>
            </article>
          </section>
        )}

        {/* ── listado: del grupo ── */}
        {data.yaPublico && (
          <section className="px-6 pb-7 pt-6 sm:px-[30px]">
            <div className="flex flex-wrap items-center gap-3">
              <p className={`${kicker} text-muted-foreground`}>Lo que escribió su grupo</p>
              <span className={`${mono} text-[12px] text-muted-foreground`}>{data.posts.length} publicaciones</span>
              <div className="ml-auto flex gap-[3px] rounded-full border border-border bg-muted p-[3px]">
                {(
                  [
                    ['recientes', 'Recientes'],
                    ['sin-responder', 'Sin responder'],
                    ['docente', 'Del docente'],
                  ] as const
                ).map(([id, etiqueta]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setOrden(id)}
                    aria-pressed={orden === id}
                    className={`h-[30px] whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition-colors ${focusRing} ${orden === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground'}`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </div>

            <ul className="mt-3.5 flex flex-col gap-2.5">
              {visibles.map((p) => {
                const sinResp = p.respuestas === 0;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setPostAbiertoId(p.id)}
                      className={`flex w-full gap-3.5 rounded-xl border p-4 text-left transition-colors hover:border-primary ${focusRing} ${sinResp ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]' : 'border-border bg-card'}`}
                    >
                      <Avatar autor={p.autor} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2.5">
                          <span className="text-[13.5px] font-bold">{p.autor.nombre}</span>
                          {p.autor.rol && <ChipRol rol={p.autor.rol} />}
                          {sinResp && (
                            <span className="inline-flex h-5 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2 text-[10px] font-bold text-[color:var(--warning-foreground)]">
                              Sin respuestas
                            </span>
                          )}
                          <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>{fmtFecha(p.creadoEn)}</span>
                        </span>
                        <span className="mt-2.5 block text-[15px] font-bold leading-snug" style={{ textWrap: 'pretty' }}>{p.titulo}</span>
                        <span className={`mt-1.5 line-clamp-2 block text-[13.5px] leading-relaxed ${softText}`}>{p.extracto}</span>
                        <span className="mt-3 flex flex-wrap items-center gap-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-[12px] font-semibold ${p.respuestas ? 'text-secondary' : 'text-muted-foreground'}`}>
                            <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                            {p.respuestas} {p.respuestas === 1 ? 'respuesta' : 'respuestas'}
                          </span>
                          {p.adjuntos && <Adjuntos a={p.adjuntos} />}
                          <ChevronRight aria-hidden className="ml-auto h-4 w-4 text-[color:var(--track)]" strokeWidth={2} />
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {visibles.length === 0 && (
              <div className="mt-3.5 rounded-xl border border-border bg-card px-6 py-10 text-center">
                <p className="text-[14.5px] font-bold">Nada con ese filtro</p>
                <p className={`mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed ${softText}`}>
                  {data.posts.length > 0
                    ? `Vuelva a «Recientes» para ver las ${data.posts.length} publicaciones del grupo.`
                    : 'Todavía nadie más ha publicado en su grupo.'}
                </p>
              </div>
            )}
            <BotonReportar />
          </section>
        )}
      </section>
    </div>
  );
}

function BotonReportar() {
  return (
    <button
      type="button"
      className={`mt-[18px] inline-flex h-9 items-center gap-[7px] text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
    >
      <Flag aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
      Informar de un problema
    </button>
  );
}

/* ───────────────────── Post interior (cuerpo + reacción + editar) ───────────────────── */

function PostInterior({
  post,
  actividadId,
  grupo,
  puedePublicar,
  onCambio,
}: {
  post: PostForo;
  actividadId: string;
  grupo: string;
  puedePublicar: boolean;
  onCambio: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const reaccionar = () =>
    iniciar(async () => {
      const r = await reaccionarForo(actividadId, post.id);
      if (r.ok) onCambio();
    });

  if (editando) {
    return (
      <article className="px-6 pt-6 sm:px-[30px]">
        <EditorPost
          actividadId={actividadId}
          mensajeId={post.id}
          tituloInicial={post.titulo}
          cuerpoInicial={post.cuerpo}
          onListo={() => {
            setEditando(false);
            onCambio();
          }}
          onCancelar={() => setEditando(false)}
        />
      </article>
    );
  }

  return (
    <article className="px-6 pt-6 sm:px-[30px]">
      <div className="flex items-center gap-3.5">
        <Avatar autor={post.autor} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[14.5px] font-bold">{post.autor.nombre}</span>
            <span className="inline-flex h-5 items-center rounded-full border border-border bg-muted px-2 text-[10.5px] font-semibold text-foreground-soft">
              {grupo}
            </span>
            {post.autor.rol && <ChipRol rol={post.autor.rol} />}
          </div>
          <p className={`${mono} mt-1 text-[11.5px] text-muted-foreground`}>
            {fmtFecha(post.creadoEn)}
            {post.editadoEn ? ` · editado ${fmtFecha(post.editadoEn)}` : ''}
          </p>
        </div>
        {post.mio && puedePublicar ? (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className={`inline-flex h-9 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
          >
            <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            Editar mi publicación
          </button>
        ) : (
          <button
            type="button"
            aria-label="Más opciones"
            className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
          >
            <MoreHorizontal aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        )}
      </div>

      <h2 className="mt-[18px] text-[22px] font-extrabold leading-snug tracking-[-0.02em]" style={{ textWrap: 'pretty' }}>
        {post.titulo}
      </h2>

      <div className="mt-3.5 max-w-[66ch] text-[15px] leading-[1.75]">
        <ContenidoRico html={post.cuerpo} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-border pt-[18px]">
        <button
          type="button"
          onClick={reaccionar}
          disabled={pendiente || !puedePublicar}
          aria-pressed={post.miReaccion}
          className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] border px-3.5 text-[13.5px] transition-colors disabled:opacity-60 ${focusRing} ${post.miReaccion ? 'border-transparent bg-accent font-bold text-accent-foreground' : 'border-border bg-card font-semibold text-foreground-soft hover:bg-muted'}`}
        >
          <ThumbsUp aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Me es útil
          <span className={mono}>{post.utiles}</span>
        </button>
        <span className="inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[11px] border border-border bg-card px-3.5 text-[13.5px] font-semibold text-foreground-soft">
          <MessageCircle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          {post.respuestas} <span className={`${mono} text-muted-foreground`}>respuestas</span>
        </span>
        <button
          type="button"
          aria-label="Guardar la publicación"
          className={`grid h-11 w-11 place-items-center rounded-[11px] border border-border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <Bookmark aria-hidden className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <span className={`${mono} ml-auto whitespace-nowrap text-[11.5px] text-muted-foreground`}>
          <Eye aria-hidden className="mr-1 inline h-3.5 w-3.5 align-[-2px]" strokeWidth={1.75} />
          {post.respuestas + post.utiles} interacciones
        </span>
      </div>
    </article>
  );
}

/* ───────────────────── Comentario del hilo ───────────────────── */

function Comentario({
  c,
  nivel = 0,
  actividadId,
  grupoId,
  raizId,
  puedePublicar,
  onCambio,
}: {
  c: ComentarioForo;
  nivel?: number;
  actividadId: string;
  grupoId: string | null;
  raizId: string;
  puedePublicar: boolean;
  onCambio: () => void;
}) {
  const [respondiendo, setRespondiendo] = useState(false);
  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();

  const reaccionar = () =>
    iniciar(async () => {
      const r = await reaccionarForo(actividadId, c.id);
      if (r.ok) onCambio();
    });

  return (
    <div className={`flex gap-3 ${nivel ? 'pt-3.5' : 'pt-4'}`}>
      <Avatar autor={c.autor} size={nivel ? 32 : 36} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-bold">{c.autor.nombre}</span>
          {c.autor.rol && <ChipRol rol={c.autor.rol} />}
          <span className={`${mono} ml-auto text-[10.5px] text-muted-foreground`}>
            {fmtFecha(c.creadoEn)}
            {c.editadoEn ? ' · editado' : ''}
          </span>
        </div>

        {editando ? (
          <div className="mt-2">
            <EditorComentario
              actividadId={actividadId}
              mensajeId={c.id}
              cuerpoInicial={c.cuerpo}
              onListo={() => {
                setEditando(false);
                onCambio();
              }}
              onCancelar={() => setEditando(false)}
            />
          </div>
        ) : (
          <div className="mt-1.5 text-[13.5px] leading-[1.65] text-foreground-soft">
            <ContenidoRico html={c.cuerpo} />
          </div>
        )}

        {!editando && (
          <div className="mt-2 flex items-center gap-3.5">
            <button
              type="button"
              onClick={reaccionar}
              disabled={pendiente || !puedePublicar}
              aria-pressed={c.miReaccion}
              className={`inline-flex h-8 items-center gap-1.5 text-[12px] font-semibold transition-colors hover:text-secondary disabled:opacity-60 ${focusRing} ${c.miReaccion || c.utiles ? 'text-secondary' : 'text-muted-foreground'}`}
            >
              <ThumbsUp aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
              Me es útil
              {c.utiles > 0 && <span className={mono}>{c.utiles}</span>}
            </button>
            {puedePublicar && nivel === 0 && (
              <button
                type="button"
                onClick={() => setRespondiendo((v) => !v)}
                className={`inline-flex h-8 items-center gap-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-secondary ${focusRing}`}
              >
                <Reply aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                Responder
              </button>
            )}
            {c.mio && puedePublicar && (
              <button
                type="button"
                onClick={() => setEditando(true)}
                className={`h-8 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
              >
                Editar
              </button>
            )}
          </div>
        )}

        {respondiendo && (
          <div className="mt-2.5">
            <ComposerRespuesta
              actividadId={actividadId}
              grupoId={grupoId}
              parentId={raizId}
              compacto
              onListo={() => {
                setRespondiendo(false);
                onCambio();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────── Composers (reusan EditorRico) ───────────────────── */

function ComposerPost({
  actividadId,
  grupoId,
  puedePublicar,
  onListo,
}: {
  actividadId: string;
  grupoId: string | null;
  puedePublicar: boolean;
  onListo: () => void;
}) {
  const [titulo, setTitulo] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [clave, setClave] = useState(0);
  const [expandido, setExpandido] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const cuerpoRef = useRef(cuerpo);
  cuerpoRef.current = cuerpo;

  const publicar = () => {
    setError(null);
    if (!titulo.trim()) return setError('Ponle un título a tu caso.');
    if (!cuerpoRef.current.trim()) return setError('Cuenta el caso antes de publicar.');
    if (!grupoId) return setError('Este foro aún no tiene un grupo asignado.');
    iniciar(async () => {
      const r = await crearPostForo(actividadId, grupoId, titulo, cuerpoRef.current);
      if (r.ok) {
        setTitulo('');
        setCuerpo('');
        setClave((k) => k + 1);
        setExpandido(false);
        onListo();
      } else setError(r.error);
    });
  };

  const editor = (
    <EditorRico
      key={clave}
      contenidoInicial=""
      onChange={setCuerpo}
      minAlto={expandido ? 340 : 150}
      ariaLabel="Cuerpo de su publicación"
    />
  );

  const cuerpoCard = (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border bg-muted px-3.5 py-2">
        <span className="inline-flex items-center gap-[7px] text-[11.5px] text-muted-foreground">
          <BookOpen aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          Sin datos que identifiquen al paciente
        </span>
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          {expandido ? <X aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /> : <Maximize2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />}
          {expandido ? 'Cerrar' : 'Pantalla completa'}
        </button>
      </div>
      <div className="px-4 pt-3.5">
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label="Título de su caso"
          className="w-full bg-transparent text-[16px] font-bold text-foreground outline-none placeholder:font-bold placeholder:text-muted-foreground"
        />
        <div aria-hidden className="my-3 h-px bg-border" />
      </div>
      <div className="px-2 pb-2">{editor}</div>
      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border bg-muted px-4 py-3">
        <button
          type="button"
          disabled={pendiente}
          className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 ${focusRing}`}
        >
          <Save aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
          Guardar borrador
        </button>
        <button
          type="button"
          onClick={publicar}
          disabled={pendiente || !puedePublicar}
          className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[11px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          {pendiente ? 'Publicando…' : 'Publicar y ver el foro'}
          <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {error && <p role="alert" className="mb-2 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">{error}</p>}
      {expandido ? (
        <>
          <div className="rounded-xl border border-dashed border-border bg-muted px-4 py-6 text-center text-[12.5px] text-muted-foreground">
            Editando a pantalla completa…
          </div>
          <div className="fixed inset-0 z-[60] flex flex-col bg-background/80 p-4 backdrop-blur-sm sm:p-8">
            <div className="mx-auto flex w-full max-w-[880px] flex-1 flex-col overflow-y-auto">{cuerpoCard}</div>
          </div>
        </>
      ) : (
        cuerpoCard
      )}
    </>
  );
}

function ComposerRespuesta({
  actividadId,
  grupoId,
  parentId,
  pendientes,
  compacto = false,
  onListo,
}: {
  actividadId: string;
  grupoId: string | null;
  parentId: string;
  pendientes?: number;
  compacto?: boolean;
  onListo: () => void;
}) {
  const [cuerpo, setCuerpo] = useState('');
  const [clave, setClave] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const cuerpoRef = useRef(cuerpo);
  cuerpoRef.current = cuerpo;

  const responder = () => {
    setError(null);
    if (!cuerpoRef.current.trim()) return setError('Escribe tu respuesta.');
    if (!grupoId) return setError('Este foro aún no tiene un grupo asignado.');
    iniciar(async () => {
      const r = await responderForo(actividadId, grupoId, parentId, cuerpoRef.current);
      if (r.ok) {
        setCuerpo('');
        setClave((k) => k + 1);
        onListo();
      } else setError(r.error);
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="px-2 pt-2">
        <EditorRico
          key={clave}
          contenidoInicial=""
          onChange={setCuerpo}
          minAlto={compacto ? 90 : 110}
          ariaLabel="Su respuesta"
        />
      </div>
      {error && <p role="alert" className="px-4 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">{error}</p>}
      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted px-3.5 py-2.5">
        {pendientes != null && pendientes > 0 && (
          <span className="text-[11.5px] text-muted-foreground">Le faltan {pendientes} respuestas para completar la rúbrica</span>
        )}
        <button
          type="button"
          onClick={responder}
          disabled={pendiente}
          className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-[18px] text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
          {pendiente ? 'Enviando…' : 'Responder'}
        </button>
      </div>
    </div>
  );
}

function EditorPost({
  actividadId,
  mensajeId,
  tituloInicial,
  cuerpoInicial,
  onListo,
  onCancelar,
}: {
  actividadId: string;
  mensajeId: string;
  tituloInicial: string;
  cuerpoInicial: string;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(tituloInicial);
  const [cuerpo, setCuerpo] = useState(cuerpoInicial);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const cuerpoRef = useRef(cuerpo);
  cuerpoRef.current = cuerpo;

  const guardar = () => {
    setError(null);
    if (!titulo.trim()) return setError('El título no puede quedar vacío.');
    iniciar(async () => {
      const r = await editarMensajeForo(actividadId, mensajeId, cuerpoRef.current, titulo);
      if (r.ok) onListo();
      else setError(r.error);
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-primary bg-card">
      <div className="px-4 pt-3.5">
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-label="Título de su caso"
          className="w-full bg-transparent text-[16px] font-bold text-foreground outline-none"
        />
        <div aria-hidden className="my-3 h-px bg-border" />
      </div>
      <div className="px-2 pb-2">
        <EditorRico contenidoInicial={cuerpoInicial} onChange={setCuerpo} minAlto={160} ariaLabel="Cuerpo de su publicación" />
      </div>
      {error && <p role="alert" className="px-4 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">{error}</p>}
      <div className="flex items-center justify-end gap-2.5 border-t border-border bg-muted px-4 py-3">
        <button type="button" onClick={onCancelar} className={`h-10 rounded-[10px] px-3.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground ${focusRing}`}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={pendiente}
          className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          <Check aria-hidden className="h-4 w-4" strokeWidth={2} />
          {pendiente ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}

function EditorComentario({
  actividadId,
  mensajeId,
  cuerpoInicial,
  onListo,
  onCancelar,
}: {
  actividadId: string;
  mensajeId: string;
  cuerpoInicial: string;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [cuerpo, setCuerpo] = useState(cuerpoInicial);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const cuerpoRef = useRef(cuerpo);
  cuerpoRef.current = cuerpo;

  const guardar = () => {
    setError(null);
    if (!cuerpoRef.current.trim()) return setError('El comentario no puede quedar vacío.');
    iniciar(async () => {
      const r = await editarMensajeForo(actividadId, mensajeId, cuerpoRef.current, null);
      if (r.ok) onListo();
      else setError(r.error);
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-primary bg-card">
      <div className="px-2 pt-2">
        <EditorRico contenidoInicial={cuerpoInicial} onChange={setCuerpo} minAlto={90} ariaLabel="Editar comentario" />
      </div>
      {error && <p role="alert" className="px-4 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">{error}</p>}
      <div className="flex items-center justify-end gap-2.5 border-t border-border bg-muted px-3.5 py-2.5">
        <button type="button" onClick={onCancelar} className={`h-9 rounded-[9px] px-3 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground ${focusRing}`}>
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={pendiente}
          className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] bg-primary px-3.5 text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          {pendiente ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
