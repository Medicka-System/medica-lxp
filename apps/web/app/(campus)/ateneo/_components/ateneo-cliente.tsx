'use client';

/**
 * Ateneo — red social del alumno (cliente). Composición cableada a datos y acciones REALES.
 * Feed PAGINADO por cursor (scroll infinito · sentinel + IntersectionObserver + "cargar más"),
 * en 3 conjuntos server-side: Todo el Ateneo / Mis colegas / Mi grupo (mig 0055). Skeletons en
 * la carga inicial de un feed y en el lote siguiente (sin shimmer si prefers-reduced-motion).
 * Reacción/voto OPTIMISTAS; publicar/comentar/conectar recargan el feed o el hilo.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useCanalRealtime } from '@/lib/realtime/use-canal';
import { ComposerModal, EntradaComposer, type BorradorPost } from './Composer';
import { DetallePost } from './DetallePost';
import { PostCard } from './PostCard';
import { PerfilColega, RailSocial, ListaPerfilModal, type ListaPerfil } from './Social';
import type { AteneoData, Comentario, ListaPerfilData, ModoComposer, PerfilColegaData, Post, TipoReaccion } from './tipos';
import type { CursorFeed, FeedAteneo } from '@/lib/campus/ateneo-social';
import { EntradaLista } from '@/components/ui/entrada-lista';
import { FeedSkeleton, PostCardSkeleton, focusRing, mono } from './ui';
import {
  publicarPostAteneo,
  reaccionarAteneo,
  reaccionarComentarioAteneo,
  comentarAteneoSocial,
  votarEncuesta,
  compartirAteneo,
  conectarColega,
  buscarColegas,
  getHiloAteneo,
  getFeedAteneo,
  getListaPerfil,
  getPerfilColega,
} from '@/lib/campus/ateneo-social-acciones';

type Filtro = 'todo' | 'caso' | 'pregunta' | 'encuesta';

const FEEDS: { id: FeedAteneo; t: string }[] = [
  { id: 'global', t: 'Todo el Ateneo' },
  { id: 'colegas', t: 'Mis colegas' },
  { id: 'grupo', t: 'Mi grupo' },
];

export function AteneoCliente({
  data,
  siguienteCursor,
}: {
  data: AteneoData;
  colegaIds: string[];
  siguienteCursor: CursorFeed | null;
}) {
  const { yo, misCasos, colegasConPosts } = data;
  const [posts, setPosts] = useState<Post[]>(data.posts);
  const [cursor, setCursor] = useState<CursorFeed | null>(siguienteCursor);
  const [feed, setFeed] = useState<FeedAteneo>('global');
  const [cargandoMas, setCargandoMas] = useState(false);
  const [cambiandoFeed, setCambiandoFeed] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const [sugerencias, setSugerencias] = useState(data.sugerencias);
  const [composer, setComposer] = useState<ModoComposer | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [hilo, setHilo] = useState<Comentario[]>([]);
  const [lista, setLista] = useState<ListaPerfil | null>(null);
  const [listaData, setListaData] = useState<ListaPerfilData | null>(null);
  const [perfil, setPerfil] = useState<PerfilColegaData | null>(null);
  // Aviso de error de publicación (toast): el fallo del server action ya no es silencioso.
  const [avisoError, setAvisoError] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  // ── Feed paginado ──────────────────────────────────────────────────────────
  const cambiarFeed = (f: FeedAteneo) => {
    if (f === feed) return;
    setFeed(f);
    setCambiandoFeed(true);
    getFeedAteneo(f, null)
      .then((r) => {
        setPosts(r.posts);
        setCursor(r.siguienteCursor);
      })
      .catch(() => {})
      .finally(() => setCambiandoFeed(false));
  };

  const recargarFeed = useCallback(() => {
    getFeedAteneo(feed, null)
      .then((r) => {
        setPosts(r.posts);
        setCursor(r.siguienteCursor);
      })
      .catch(() => {});
  }, [feed]);

  // Realtime (§7): post/comentario nuevo en la comunidad → re-consulta el primer lote
  // (la visibilidad por post la re-aplica la RLS de posts_ateneo). No-op sin Supabase.
  useCanalRealtime('ateneo:feed', () => recargarFeed());

  const cargarMas = useCallback(() => {
    if (cargandoMas || cursor === null) return;
    setCargandoMas(true);
    getFeedAteneo(feed, cursor)
      .then((r) => {
        setPosts((ps) => {
          const vistos = new Set(ps.map((p) => p.id));
          return [...ps, ...r.posts.filter((p) => !vistos.has(p.id))];
        });
        setCursor(r.siguienteCursor);
      })
      .catch(() => {})
      .finally(() => setCargandoMas(false));
  }, [feed, cursor, cargandoMas]);

  // Sentinel + IntersectionObserver: dispara `cargarMas` al acercarse al final.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || cursor === null || cambiandoFeed) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) cargarMas();
      },
      { rootMargin: '600px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [cargarMas, cursor, cambiandoFeed]);

  // ── Interacciones (optimistas) ──────────────────────────────────────────────
  const onPublicar = (b: BorradorPost) => {
    setComposer(null);
    iniciar(async () => {
      const r = await publicarPostAteneo(b);
      if (r.ok) recargarFeed();
      // Antes el fallo era invisible (modal cerrado, sin aviso) → "no pasa nada".
      else setAvisoError(r.error ?? 'No se pudo publicar. Inténtalo de nuevo.');
    });
  };

  const onReaccionar = (id: string, r: TipoReaccion | null) => {
    setPosts((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        const antes = p.reacciones.mia;
        const total = p.reacciones.total + (r && !antes ? 1 : !r && antes ? -1 : 0);
        return { ...p, reacciones: { ...p.reacciones, mia: r ?? undefined, total } };
      }),
    );
    iniciar(async () => {
      const res = await reaccionarAteneo(id, r);
      if (!res.ok) recargarFeed();
    });
  };

  const onVotar = (postId: string, opcionId: string) => {
    setPosts((ps) =>
      ps.map((p) => {
        if (p.id !== postId || p.tipo !== 'encuesta') return p;
        const opciones = p.opciones.map((o) => ({
          ...o,
          votos: o.votos + (o.id === opcionId ? 1 : 0) - (o.id === p.miVoto ? 1 : 0),
        }));
        return { ...p, opciones, miVoto: opcionId };
      }),
    );
    iniciar(async () => {
      const res = await votarEncuesta(postId, opcionId);
      if (!res.ok) recargarFeed();
    });
  };

  const onCompartir = (id: string) => {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, compartidos: p.compartidos + 1 } : p)));
    iniciar(async () => {
      await compartirAteneo(id);
    });
  };

  // Reacción a un COMENTARIO (optimista): voltea `mia`/`total` al instante y luego recarga el
  // hilo para reconciliar el `top` exacto (que no se puede recalcular sin los conteos por tipo).
  const onReaccionarComentario = (comentarioId: string, tipo: TipoReaccion | null) => {
    setHilo((hs) =>
      hs.map((c) => {
        if (c.id !== comentarioId) return c;
        const prev = c.reacciones ?? { top: [], total: 0 };
        const antes = prev.mia;
        const total = prev.total + (tipo && !antes ? 1 : !tipo && antes ? -1 : 0);
        return { ...c, reacciones: { ...prev, mia: tipo ?? undefined, total } };
      }),
    );
    iniciar(async () => {
      await reaccionarComentarioAteneo(comentarioId, tipo);
      // Reconcilia desde el servidor (éxito o fallo) para dejar top/total/mia exactos.
      if (abierto) {
        const nuevo = await getHiloAteneo(abierto);
        setHilo(nuevo);
      }
    });
  };

  const onComentar = (postId: string, texto: string, parentId?: string) => {
    iniciar(async () => {
      const r = await comentarAteneoSocial(postId, texto, parentId);
      if (r.ok) {
        const nuevo = await getHiloAteneo(postId);
        setHilo(nuevo);
        recargarFeed();
      }
    });
  };

  const onAbrirCaso = (casoId: string) => {
    const post = posts.find((p) => p.tipo === 'caso' && p.caso.id === casoId);
    if (post) {
      setAbierto(post.id);
      getHiloAteneo(post.id).then(setHilo).catch(() => setHilo([]));
    }
  };

  const onBuscarColegas = (q: string) => {
    iniciar(async () => {
      const res = await buscarColegas(q);
      setSugerencias(res.map((s) => ({ ...s })));
    });
  };

  const onConectar = (id: string) => {
    setSugerencias((ss) =>
      ss.map((s) => (s.id === id ? { ...s, estadoConexion: s.estadoConexion === 'ninguna' ? 'pendiente' : 'colegas' } : s)),
    );
    setPerfil((pf) => (pf && pf.perfil.id === id ? { ...pf, perfil: { ...pf.perfil, estadoConexion: pf.perfil.estadoConexion === 'ninguna' ? 'pendiente' : 'colegas' } } : pf));
    iniciar(async () => {
      const r = await conectarColega(id);
      if (!r.ok) recargarFeed();
    });
  };

  // A · listas del perfil propio (bajo demanda).
  const onVerLista = (l: ListaPerfil) => {
    setLista(l);
    setListaData(null);
    getListaPerfil(l).then(setListaData).catch(() => setListaData(null));
  };

  // C · perfil de CUALQUIER autor del feed (o sugerido).
  const abrirPerfil = (userId: string) => {
    if (userId === yo.id) return; // el perfil propio se ve por sus cifras (A)
    getPerfilColega(userId).then((p) => { if (p) setPerfil(p); }).catch(() => {});
  };

  const abrirDetalle = (postId: string) => {
    setAbierto(postId);
    getHiloAteneo(postId).then(setHilo).catch(() => setHilo([]));
  };

  // El filtro por TIPO es sobre lo ya cargado (el feed sigue paginando al scrollear).
  const visibles = useMemo(() => posts.filter((p) => filtro === 'todo' || p.tipo === filtro), [posts, filtro]);

  const postAbierto = posts.find((p) => p.id === abierto);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-7 sm:px-6 lg:px-8">
      {/* Toast de error de publicación (§5A · estado warning). Descartable; antes el fallo era mudo. */}
      {avisoError && (
        <div
          role="alert"
          className="fixed inset-x-0 top-4 z-50 mx-auto flex w-[min(92vw,420px)] items-start gap-2.5 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3 shadow-[0_6px_20px_rgba(17,24,39,0.12)]"
        >
          <p className="min-w-0 flex-1 text-[12.5px] font-semibold text-[color:var(--warning-foreground)]">{avisoError}</p>
          <button
            type="button"
            onClick={() => setAvisoError(null)}
            aria-label="Descartar"
            className={`shrink-0 text-[12.5px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
          >
            Cerrar
          </button>
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_316px]">
        <div className="min-w-0">
          <EntradaComposer yo={yo} onAbrir={setComposer} />

          <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
            <div role="tablist" aria-label="Feed" className="flex gap-1 rounded-full border border-border bg-card p-1">
              {FEEDS.map(({ id, t }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={feed === id}
                  onClick={() => cambiarFeed(id)}
                  className={`inline-flex h-[38px] items-center gap-[7px] rounded-full px-[16px] text-[13px] transition-colors ${
                    feed === id ? 'bg-sidebar font-bold text-sidebar-foreground' : 'font-semibold text-muted-foreground'
                  } ${focusRing}`}
                >
                  {t}
                  {id === 'colegas' && colegasConPosts > 0 && (
                    <span className={`${mono} grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-[5px] text-[10px] font-bold text-[color:var(--sidebar)]`}>
                      {colegasConPosts}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <span className="ml-auto flex flex-wrap gap-1.5">
              {(
                [
                  ['todo', 'Todo'],
                  ['caso', 'Casos'],
                  ['pregunta', 'Preguntas'],
                  ['encuesta', 'Encuestas'],
                ] as const
              ).map(([id, t]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filtro === id}
                  onClick={() => setFiltro(id)}
                  className={`h-[34px] rounded-full border px-3 text-[12.5px] font-semibold transition-colors ${
                    filtro === id ? 'border-transparent bg-accent text-accent-foreground' : 'border-border bg-card text-[color:var(--foreground-soft)]'
                  } ${focusRing}`}
                >
                  {t}
                </button>
              ))}
            </span>
          </div>

          {cambiandoFeed ? (
            <div className="mt-4">
              <FeedSkeleton n={3} />
            </div>
          ) : (
            <>
              <ul className="mt-4 flex flex-col gap-4">
                {/* Entrada escalonada (§5A): continuidad skeleton→feed, sin re-animar al paginar
                    (los <li> ya montados conservan su key). */}
                <EntradaLista>
                  {visibles.map((p) => (
                    <li key={p.id}>
                      <PostCard
                        post={p}
                        yo={yo}
                        onAbrir={abrirDetalle}
                        onReaccionar={onReaccionar}
                        onCompartir={onCompartir}
                        onVotar={onVotar}
                        onAbrirPerfil={abrirPerfil}
                      />
                    </li>
                  ))}
                </EntradaLista>
              </ul>

              {cargandoMas && (
                <div className="mt-4">
                  <PostCardSkeleton />
                </div>
              )}

              {/* Sentinel de scroll infinito + fallback "cargar más". */}
              {cursor !== null && !cargandoMas && (
                <div ref={sentinelRef} className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={cargarMas}
                    className={`h-10 rounded-full border border-border bg-card px-5 text-[12.5px] font-semibold text-secondary ${focusRing}`}
                  >
                    Cargar más
                  </button>
                </div>
              )}

              {visibles.length === 0 && (
                <div className="mt-4 rounded-[14px] border border-border bg-card px-6 py-10 text-center">
                  <p className="text-[14.5px] font-bold">Nada por aquí todavía</p>
                  <p className="mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed text-[color:var(--foreground-soft)]">
                    {feed === 'colegas'
                      ? 'Sus colegas aún no publican. Pruebe «Todo el Ateneo».'
                      : feed === 'grupo'
                        ? 'Su grupo aún no publica. Pruebe «Todo el Ateneo».'
                        : 'Cambie el filtro o sea el primero en publicar.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <RailSocial
          yo={yo}
          sugerencias={sugerencias}
          onVerLista={onVerLista}
          onBuscar={onBuscarColegas}
          onAbrirPerfil={abrirPerfil}
          onConectar={onConectar}
          onVerTodos={() => onBuscarColegas('')}
        />
      </div>

      {composer && (
        <ComposerModal yo={yo} modoInicial={composer} misCasos={misCasos} onCerrar={() => setComposer(null)} onPublicar={onPublicar} />
      )}

      {postAbierto && (
        <DetallePost
          post={postAbierto}
          hilo={hilo}
          yo={yo}
          onCerrar={() => setAbierto(null)}
          onReaccionar={onReaccionar}
          onReaccionarComentario={onReaccionarComentario}
          onCompartir={onCompartir}
          onVotar={onVotar}
          onComentar={onComentar}
          onAbrirPerfil={abrirPerfil}
        />
      )}

      {lista && (
        <ListaPerfilModal
          tipo={lista}
          data={listaData}
          cargando={listaData === null}
          onCerrar={() => setLista(null)}
          onAbrirCaso={(id) => {
            setLista(null);
            onAbrirCaso(id);
          }}
        />
      )}

      {perfil && (
        <PerfilColega
          perfil={perfil.perfil}
          casos={perfil.casos.map((c) => ({ id: c.id, titulo: c.titulo, meta: `${c.organo} · ${c.dominio}`, validado: c.validado }))}
          colegasComun={perfil.colegasComun}
          aportes={perfil.aportes}
          onCerrar={() => setPerfil(null)}
          onConectar={onConectar}
          onAbrirCaso={onAbrirCaso}
        />
      )}
    </div>
  );
}
