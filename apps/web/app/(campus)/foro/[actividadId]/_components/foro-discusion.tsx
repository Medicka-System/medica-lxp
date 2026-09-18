'use client';

/**
 * Foro de la lección (§1) — lado del alumno. Discusión CERRADA del grupo: el alumno
 * abre un tema con el EditorRico (mismo editor rico del bloque de teoría) y responde
 * a otros. Los cuerpos se guardan como HTML y se muestran con ContenidoRico.
 *
 * CRUD directo bajo RLS (Regla de Oro §2): las server actions corren como el alumno.
 * Vive dentro del shell del Campus (app/(campus)/layout.tsx).
 */
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronLeft, CornerDownRight, MessageSquare, Send } from 'lucide-react';
import { EditorRico, ContenidoRico } from '@/components/editor-rico';
import { Avatar, iniciales } from '@/components/avatar';
import { card, kicker, softText, focusRing, mono } from '@/components/tokens';
import { haceCuanto } from '@/lib/format';
import type { ForoData, MensajeForo } from '@/lib/campus/foro-datos';
import type { ResultadoAccion } from '@/lib/campus/resultado';
import { crearPostForo, responderForo } from '@/lib/campus/foro-acciones';

export function ForoDiscusion({
  data,
  puedePublicar,
}: {
  data: ForoData;
  puedePublicar: boolean;
}) {
  const { actividad, grupoId, mensajes } = data;

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 py-8 sm:px-6">
      <Link
        href="/cursos"
        className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-secondary hover:text-sidebar ${focusRing}`}
      >
        <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
        Volver a mis cursos
      </Link>

      <p className={`${kicker} mt-4 text-secondary`}>
        {actividad.programa} · {actividad.modulo} · {actividad.leccion}
      </p>
      <h1 className="mt-1.5 flex items-center gap-2.5 text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
        <MessageSquare aria-hidden className="h-6 w-6 shrink-0 text-secondary" strokeWidth={1.75} />
        {actividad.titulo}
      </h1>
      {actividad.instrucciones && (
        <p className={`mt-2 max-w-[66ch] text-[13.5px] leading-relaxed ${softText}`}>
          {actividad.instrucciones}
        </p>
      )}

      {/* ── Composer del tema ── */}
      <section className={`${card} mt-6 p-4`}>
        <p className="text-[13.5px] font-bold">Abre un tema</p>
        <p className={`mt-0.5 text-[12px] ${softText}`}>
          Comparte tu duda o hallazgo. Puedes dar formato, insertar tablas, imágenes y fórmulas.
        </p>
        <div className="mt-3">
          {puedePublicar ? (
            <Composer
              placeholder="Escribe tu tema para el grupo…"
              cta="Publicar tema"
              minAlto={150}
              onEnviar={(html) => crearPostForo(actividad.id, grupoId!, html)}
            />
          ) : (
            <AvisoSinPublicar grupoId={grupoId} />
          )}
        </div>
      </section>

      {/* ── Hilo ── */}
      <div className="mt-7 flex items-center gap-2.5">
        <h2 className="text-[15px] font-bold tracking-[-0.01em]">Discusión</h2>
        <span className={`${mono} text-[12px] text-muted-foreground`}>
          {mensajes.length} tema{mensajes.length === 1 ? '' : 's'}
        </span>
      </div>

      {mensajes.length === 0 ? (
        <div className={`${card} mt-3 grid place-items-center px-6 py-10 text-center`}>
          <MessageSquare aria-hidden className="h-8 w-8 text-[color:var(--track)]" strokeWidth={1.5} />
          <p className="mt-3 text-[14px] font-bold">Todavía no hay temas</p>
          <p className={`mt-1 max-w-[40ch] text-[12.5px] ${softText}`}>
            Sé quien abra la conversación del grupo en esta lección.
          </p>
        </div>
      ) : (
        <ol className="mt-3 flex flex-col gap-4">
          {mensajes.map((m) => (
            <li key={m.id}>
              <Mensaje
                mensaje={m}
                actividadId={actividad.id}
                grupoId={grupoId}
                puedePublicar={puedePublicar}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ── Un mensaje (tema o respuesta) ── */
function Mensaje({
  mensaje,
  actividadId,
  grupoId,
  puedePublicar,
  anidado = false,
}: {
  mensaje: MensajeForo;
  actividadId: string;
  grupoId: string | null;
  puedePublicar: boolean;
  anidado?: boolean;
}) {
  const [respondiendo, setRespondiendo] = useState(false);

  return (
    <div className={anidado ? '' : `${card} p-4`}>
      <div className="flex items-center gap-2.5">
        <Avatar ini={iniciales(mensaje.autor)} size={anidado ? 28 : 34} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold leading-tight">
            {mensaje.autor}
            {mensaje.esPropio && (
              <span className="ml-1.5 text-[11px] font-semibold text-secondary">· tú</span>
            )}
          </p>
          <p className={`${mono} text-[11px] text-muted-foreground`}>{haceCuanto(mensaje.creadoEn)}</p>
        </div>
      </div>

      <div className="mt-2.5">
        <ContenidoRico html={mensaje.cuerpo} />
      </div>

      {puedePublicar && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setRespondiendo((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-[8px] px-1.5 py-1 text-[12px] font-semibold text-secondary hover:bg-accent ${focusRing}`}
          >
            <CornerDownRight aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            {respondiendo ? 'Cancelar' : 'Responder'}
          </button>
        </div>
      )}

      {respondiendo && grupoId && (
        <div className="mt-2">
          <Composer
            placeholder={`Responder a ${mensaje.autor}…`}
            cta="Responder"
            minAlto={110}
            onEnviar={(html) => responderForo(actividadId, grupoId, mensaje.id, html)}
            onListo={() => setRespondiendo(false)}
          />
        </div>
      )}

      {mensaje.respuestas.length > 0 && (
        <ol className="mt-3 space-y-3 border-l-2 border-border pl-3.5">
          {mensaje.respuestas.map((r) => (
            <li key={r.id}>
              <Mensaje
                mensaje={r}
                actividadId={actividadId}
                grupoId={grupoId}
                puedePublicar={puedePublicar}
                anidado
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/* ── Composer reutilizable (tema o respuesta) ── */
function Composer({
  placeholder,
  cta,
  minAlto,
  onEnviar,
  onListo,
}: {
  placeholder: string;
  cta: string;
  minAlto: number;
  onEnviar: (html: string) => Promise<ResultadoAccion>;
  onListo?: () => void;
}) {
  const [html, setHtml] = useState('');
  const [clave, setClave] = useState(0); // remonta el editor para limpiarlo
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function enviar() {
    setError(null);
    if (!html.trim()) {
      setError('Escribe tu mensaje antes de publicar.');
      return;
    }
    iniciar(async () => {
      const r = await onEnviar(html);
      if (r.ok) {
        setHtml('');
        setClave((k) => k + 1);
        onListo?.();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div>
      <EditorRico
        key={clave}
        contenidoInicial=""
        onChange={setHtml}
        minAlto={minAlto}
        placeholder={placeholder}
        ariaLabel={placeholder}
      />
      {error && (
        <p role="alert" className="mt-2 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">
          {error}
        </p>
      )}
      <div className="mt-2.5 flex justify-end">
        <button
          type="button"
          onClick={enviar}
          disabled={pendiente}
          className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--primary-foreground)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          <Send aria-hidden className="h-4 w-4" strokeWidth={2} />
          {pendiente ? 'Publicando…' : cta}
        </button>
      </div>
    </div>
  );
}

/* ── Aviso cuando no se puede publicar ── */
function AvisoSinPublicar({ grupoId }: { grupoId: string | null }) {
  return (
    <div className="rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3">
      <p className="text-[12.5px] font-semibold text-[color:var(--warning-foreground)]">
        {grupoId === null
          ? 'Este foro aún no tiene un grupo asignado; no se puede publicar por ahora.'
          : 'Tu acceso está en pausa. Ponte al corriente para participar en el foro.'}
      </p>
    </div>
  );
}
