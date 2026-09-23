'use client';

/**
 * Ateneo — red social del alumno (cliente). Composición del mock cableada a datos y
 * acciones REALES: reacción y voto son OPTIMISTAS (ajuste local + server + revertir si
 * falla); publicar/comentar/conectar recargan con router.refresh(). El hilo del detalle
 * se pide bajo demanda. "Abrir caso" navega al visor Cornerstone3D del caso.
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ComposerModal, EntradaComposer, type BorradorPost } from './Composer';
import { DetallePost } from './DetallePost';
import { PostCard } from './PostCard';
import { PerfilColega, RailSocial, type ListaPerfil } from './Social';
import type { AteneoData, Comentario, ModoComposer, Post, TipoReaccion, PerfilResumen } from './tipos';
import { focusRing, mono } from './ui';
import {
  publicarPostAteneo,
  reaccionarAteneo,
  comentarAteneoSocial,
  votarEncuesta,
  compartirAteneo,
  conectarColega,
  buscarColegas,
  getHiloAteneo,
} from '@/lib/campus/ateneo-social-acciones';

type Feed = 'global' | 'colegas';
type Filtro = 'todo' | 'caso' | 'pregunta' | 'encuesta';

export function AteneoCliente({ data, colegaIds }: { data: AteneoData; colegaIds: string[] }) {
  const router = useRouter();
  const { yo, misCasos, colegasConPosts } = data;
  const [posts, setPosts] = useState<Post[]>(data.posts);
  const [sugerencias, setSugerencias] = useState(data.sugerencias);
  const [feed, setFeed] = useState<Feed>('global');
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const [composer, setComposer] = useState<ModoComposer | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [hilo, setHilo] = useState<Comentario[]>([]);
  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  // La copia local `posts` se re-sincroniza si el server manda datos nuevos.
  const colegasSet = useMemo(() => new Set(colegaIds), [colegaIds]);

  const onPublicar = (b: BorradorPost) => {
    setComposer(null);
    iniciar(async () => {
      const r = await publicarPostAteneo(b);
      if (r.ok) router.refresh();
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
      if (!res.ok) router.refresh(); // revertir al estado real
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
      if (!res.ok) router.refresh();
    });
  };

  const onCompartir = (id: string) => {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, compartidos: p.compartidos + 1 } : p)));
    iniciar(async () => {
      await compartirAteneo(id);
    });
  };

  const onComentar = (postId: string, texto: string, parentId?: string) => {
    iniciar(async () => {
      const r = await comentarAteneoSocial(postId, texto, parentId);
      if (r.ok) {
        const nuevo = await getHiloAteneo(postId);
        setHilo(nuevo);
        router.refresh();
      }
    });
  };

  const onAbrirCaso = (casoId: string) => {
    if (casoId) router.push(`/bitacora/${casoId}`);
  };

  const onBuscarColegas = (q: string) => {
    iniciar(async () => {
      const res = await buscarColegas(q);
      if (res.length) setSugerencias(res.map((s) => ({ ...s, colegas: s.colegas })));
    });
  };

  const onConectar = (id: string) => {
    setSugerencias((ss) =>
      ss.map((s) => (s.id === id ? { ...s, estadoConexion: s.estadoConexion === 'ninguna' ? 'pendiente' : 'colegas' } : s)),
    );
    iniciar(async () => {
      const r = await conectarColega(id);
      if (r.ok && r.estado) {
        setSugerencias((ss) => ss.map((s) => (s.id === id ? { ...s, estadoConexion: r.estado! } : s)));
      } else {
        router.refresh();
      }
    });
  };

  const onVerLista = (_l: ListaPerfil) => {
    // Las listas completas (colegas/casos/aportes) se cargan bajo demanda · pendiente.
  };
  const onMensaje = (_id: string) => {
    // Mensajería directa · pendiente.
  };

  const abrirDetalle = (postId: string) => {
    setAbierto(postId);
    getHiloAteneo(postId).then(setHilo).catch(() => setHilo([]));
  };

  const visibles = useMemo(
    () =>
      posts.filter(
        (p) => (filtro === 'todo' || p.tipo === filtro) && (feed === 'global' || colegasSet.has(p.autor.id)),
      ),
    [posts, filtro, feed, colegasSet],
  );

  const postAbierto = posts.find((p) => p.id === abierto);
  const perfil: (PerfilResumen & { motivo: string }) | undefined = sugerencias.find((s) => s.id === perfilId);

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-7 sm:px-6 lg:px-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_316px]">
        <div className="min-w-0">
          <EntradaComposer yo={yo} onAbrir={setComposer} />

          <div className="mt-[18px] flex flex-wrap items-center gap-2.5">
            <div role="tablist" aria-label="Feed" className="flex gap-1 rounded-full border border-border bg-card p-1">
              {(
                [
                  ['global', 'Todo el Ateneo'],
                  ['colegas', 'Mis colegas'],
                ] as const
              ).map(([id, t]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={feed === id}
                  onClick={() => setFeed(id)}
                  className={`inline-flex h-[38px] items-center gap-[7px] rounded-full px-[18px] text-[13px] transition-colors ${
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

          <ul className="mt-4 flex flex-col gap-4">
            {visibles.map((p) => (
              <li key={p.id}>
                <PostCard
                  post={p}
                  yo={yo}
                  onAbrir={abrirDetalle}
                  onReaccionar={onReaccionar}
                  onCompartir={onCompartir}
                  onVotar={onVotar}
                  onAbrirCaso={onAbrirCaso}
                />
              </li>
            ))}
          </ul>

          {visibles.length === 0 && (
            <div className="mt-4 rounded-[14px] border border-border bg-card px-6 py-10 text-center">
              <p className="text-[14.5px] font-bold">Nada por aquí todavía</p>
              <p className="mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed text-[color:var(--foreground-soft)]">
                {feed === 'colegas' ? 'Sus colegas aún no publican con este filtro. Pruebe «Todo el Ateneo».' : 'Cambie el filtro o sea el primero en publicar.'}
              </p>
            </div>
          )}
        </div>

        <RailSocial
          yo={yo}
          sugerencias={sugerencias}
          onVerLista={onVerLista}
          onBuscar={onBuscarColegas}
          onAbrirPerfil={setPerfilId}
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
          onCompartir={onCompartir}
          onVotar={onVotar}
          onAbrirCaso={onAbrirCaso}
          onComentar={onComentar}
        />
      )}

      {perfil && (
        <PerfilColega
          perfil={perfil}
          casos={[]}
          onCerrar={() => setPerfilId(null)}
          onConectar={onConectar}
          onMensaje={onMensaje}
          onAbrirCaso={onAbrirCaso}
        />
      )}
    </div>
  );
}
