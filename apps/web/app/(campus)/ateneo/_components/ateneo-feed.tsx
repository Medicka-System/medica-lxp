'use client';

/**
 * Ateneo — comunidad abierta de interconsulta (§1/§6). Feed real por RLS
 * (lxp.posts_ateneo aprobados + los propios; lxp.comentarios_ateneo). El caso es el
 * centro: visor DICOM en miniatura (placeholder · 4.7), comentarios con la FLAG de
 * validación del docente (validado_por, real). Reacciones de post / encuestas /
 * seguir son PENDIENTE DE DB (ver ateneo-contrato) → se muestran deshabilitadas.
 *
 * Referencia visual: campus-lxp-mocks/alumno/ateneo.
 */

import { useState, useTransition } from 'react';
import {
  BadgeCheck,
  Eye,
  Image as ImageIcon,
  MessageCircle,
  Stethoscope,
  ThumbsUp,
} from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing } from '@/components/tokens';
import { Avatar, iniciales } from '@/components/avatar';
import { haceCuanto } from '@/lib/format';
import { VisorDicomPlaceholder } from '../../_components/visor-dicom';
import { comentarAteneo, crearPostAteneo } from '@/lib/campus/acciones-ateneo';
import {
  ETIQUETA_TIPO,
  type AteneoData,
  type ComentarioAteneo,
  type PostAteneo,
} from '@/lib/campus/ateneo-contrato';

/* ─────────────────── Composer (presentar caso) ─────────────────── */

function Composer({ yo }: { yo: AteneoData['yo'] }) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  const publicar = () => {
    setError(null);
    const titulo = texto.trim();
    if (!titulo) return;
    iniciar(async () => {
      const r = await crearPostAteneo({ tipo: 'caso', titulo, cuerpo: '' });
      if (r.ok) setTexto('');
      else setError(r.error);
    });
  };

  return (
    <section aria-label="Publicar en el Ateneo" className={`${card} p-5`}>
      <div className="flex items-center gap-3">
        <Avatar ini={yo.ini} />
        <label className="flex h-[52px] min-w-0 flex-1 items-center rounded-full border border-border bg-muted px-5 transition-colors focus-within:border-secondary focus-within:bg-card">
          <span className="sr-only">Qué quiere presentar</span>
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && publicar()}
            placeholder="Presente un caso o comparta una duda para interconsulta…"
            className="w-full bg-transparent text-[14.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <button
          type="button"
          onClick={publicar}
          disabled={enviando || !texto.trim()}
          className={`inline-flex h-11 items-center gap-2 rounded-full bg-accent px-3.5 text-[13px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] disabled:opacity-60 ${focusRing}`}
        >
          <ImageIcon aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
          {enviando ? 'Publicando…' : 'Presentar caso'}
        </button>
        <span className="ml-auto text-[12px] text-muted-foreground">
          Sin datos del paciente · lo revisa un docente antes de publicarse
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[12.5px] font-medium text-[color:var(--destructive-foreground)]">
          {error}
        </p>
      )}
    </section>
  );
}

/* ─────────────────── Comentarios ─────────────────── */

function Comentarios({ post }: { post: PostAteneo }) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  const fijado = post.comentarios.find((c) => c.validadoPor);
  const resto = post.comentarios.filter((c) => c !== fijado);

  const comentar = () => {
    setError(null);
    const t = texto.trim();
    if (!t) return;
    iniciar(async () => {
      const r = await comentarAteneo(post.id, t);
      if (r.ok) setTexto('');
      else setError(r.error);
    });
  };

  return (
    <>
      {fijado && <ComentarioFijado c={fijado} />}
      {resto.map((c) => (
        <div key={c.id} className="mt-3 flex gap-2.5">
          <Avatar ini={iniciales(c.autor)} size={30} />
          <div className="min-w-0 flex-1 rounded-[12px] bg-muted px-3.5 py-2.5">
            <p className={`text-[13px] leading-relaxed ${softText}`}>
              <span className="font-bold text-foreground">{c.autor}</span> {c.cuerpo}
            </p>
            <div className="mt-1.5 flex items-center gap-3">
              {c.upvotes > 0 && (
                <span className={`${mono} inline-flex items-center gap-1 text-[11px] text-muted-foreground`}>
                  <ThumbsUp aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                  {c.upvotes}
                </span>
              )}
              <span className={`${mono} text-[11px] text-muted-foreground`}>{haceCuanto(c.cuando)}</span>
            </div>
          </div>
        </div>
      ))}

      <div className="mt-3.5 flex items-center gap-2.5">
        <label className="flex h-11 min-w-0 flex-1 items-center rounded-full border border-border bg-card px-4">
          <span className="sr-only">Escriba un comentario</span>
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && comentar()}
            placeholder="Aporte a la interconsulta…"
            className="w-full bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <button
          type="button"
          onClick={comentar}
          disabled={enviando || !texto.trim()}
          className={`inline-flex h-11 shrink-0 items-center rounded-full bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:bg-muted disabled:text-muted-foreground ${focusRing}`}
        >
          {enviando ? 'Enviando…' : 'Publicar'}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12px] font-medium text-[color:var(--destructive-foreground)]">
          {error}
        </p>
      )}
    </>
  );
}

function ComentarioFijado({ c }: { c: ComentarioAteneo }) {
  return (
    <div className="mt-4 flex gap-3.5 rounded-[12px] bg-accent p-4">
      <Avatar ini={iniciales(c.autor)} size={36} />
      <div className="min-w-0">
        <p className={`${kicker} inline-flex items-center gap-1.5 text-accent-foreground`}>
          <BadgeCheck aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          Respuesta validada · {c.autor}
        </p>
        <p className={`mt-2 text-[14px] leading-relaxed ${softText}`}>{c.cuerpo}</p>
      </div>
    </div>
  );
}

/* ─────────────────── Reacción (placeholder · PENDIENTE DE DB) ─────────────────── */

function Reaccion({ icono: Icono, etiqueta }: { icono: typeof ThumbsUp; etiqueta: string }) {
  return (
    <button
      type="button"
      disabled
      title="Las reacciones llegan pronto"
      className="inline-flex h-10 cursor-not-allowed items-center gap-[7px] rounded-full border border-border bg-card px-3.5 text-[13px] font-semibold text-muted-foreground opacity-70"
    >
      <Icono aria-hidden className="h-4 w-4" strokeWidth={1.75} />
      {etiqueta}
    </button>
  );
}

/* ─────────────────── Post ─────────────────── */

function Post({ post }: { post: PostAteneo }) {
  return (
    <li className={`${card} p-5`}>
      {/* cabeza */}
      <div className="flex items-center gap-3">
        <Avatar ini={iniciales(post.autor)} />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold leading-snug">{post.autor}</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{haceCuanto(post.cuando)}</p>
        </div>
        <span className="flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-semibold text-accent-foreground">
            {ETIQUETA_TIPO[post.tipo]}
          </span>
          {post.esMioPendiente && (
            <span className="inline-flex h-6 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11.5px] font-semibold text-[color:var(--warning-foreground)]">
              En revisión
            </span>
          )}
        </span>
      </div>

      {/* cuerpo */}
      <p className="mt-4 text-[17px] font-bold leading-relaxed" style={{ textWrap: 'pretty' }}>
        {post.titulo}
      </p>
      {(post.vineta || post.cuerpo) && (
        <p className={`mt-2 text-[14px] leading-relaxed ${softText}`}>{post.vineta ?? post.cuerpo}</p>
      )}

      {post.tipo === 'caso' && (
        <div className="mt-4">
          <VisorDicomPlaceholder
            etiqueta={post.dicomRef ? 'estudio del caso' : 'estudio DICOM pendiente'}
            alto={200}
            loop={!!post.dicomRef}
            radio="rounded-[10px]"
          />
        </div>
      )}

      {/* reacciones (PENDIENTE DE DB) */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Reaccion icono={ThumbsUp} etiqueta="Útil" />
        {post.tipo === 'caso' && (
          <>
            <Reaccion icono={Eye} etiqueta="Buen ojo" />
            <Reaccion icono={Stethoscope} etiqueta="Sugerir diagnóstico" />
          </>
        )}
        <span className={`${mono} ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground`}>
          <MessageCircle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          {post.totalComentarios} {post.totalComentarios === 1 ? 'comentario' : 'comentarios'}
        </span>
      </div>

      {/* comentarios */}
      <div className="mt-1">
        <Comentarios post={post} />
      </div>
    </li>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export function AteneoFeed({ data }: { data: AteneoData }) {
  const { yo, posts } = data;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Ateneo</h1>
        <p className={`mt-1 text-[13px] ${softText}`}>
          La comunidad abierta del campus: presente casos, pida interconsulta y aprenda de sus
          colegas. El docente valida las respuestas clínicas.
        </p>
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_316px]">
        {/* ══════════ MURO ══════════ */}
        <div className="min-w-0">
          <Composer yo={yo} />

          {posts.length === 0 ? (
            <div className={`${card} mt-5 px-8 py-14 text-center`}>
              <p className="text-[16px] font-bold">El muro está en silencio</p>
              <p className={`mx-auto mt-2 max-w-[52ch] text-[13.5px] leading-relaxed ${softText}`}>
                Sea quien lo empiece: presente un caso o una duda. Cuando un docente lo apruebe,
                aparecerá aquí para toda la comunidad.
              </p>
            </div>
          ) : (
            <ul className="mt-5 flex flex-col gap-5">
              {posts.map((p) => (
                <Post key={p.id} post={p} />
              ))}
            </ul>
          )}
        </div>

        {/* ══════════ RAIL SOCIAL ══════════ */}
        <aside className="flex min-w-0 flex-col gap-5">
          <section className={`${card} overflow-hidden`}>
            <div className="relative h-16" style={{ background: 'var(--sidebar)' }}>
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    'repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 2px, transparent 2px 9px)',
                }}
              />
            </div>
            <div className="-mt-7 px-5 pb-5">
              <span
                aria-hidden
                className={`${mono} grid h-14 w-14 place-items-center rounded-full border-[3px] border-card bg-sidebar text-[18px] font-bold text-sidebar-foreground`}
              >
                {yo.ini}
              </span>
              <p className="mt-3 text-[15.5px] font-bold">{yo.nombre}</p>
              <div className="mt-3.5 flex items-center gap-5 border-t border-border pt-3.5">
                {[
                  [yo.casos, 'casos'],
                  [yo.aportes, 'aportes'],
                ].map(([v, l]) => (
                  <span key={String(l)}>
                    <span className={`block text-[16px] font-extrabold ${mono}`}>{v}</span>
                    <span className="block text-[11.5px] text-muted-foreground">{l}</span>
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className={`${card} p-5`}>
            <h2 className={`${kicker} text-muted-foreground`}>Reglas de la comunidad</h2>
            <ul className={`mt-3 flex flex-col gap-2.5 text-[13px] leading-snug ${softText}`}>
              <li>Nunca publique datos que identifiquen al paciente.</li>
              <li>Argumente con el hallazgo, no con la intuición.</li>
              <li>La respuesta validada del docente es la referencia.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
