'use client';

/**
 * Columna 2 · la conversación: cabecera con el contexto de la contraparte (alumno:
 * grupo · módulo · horas; staff: área) + tiempo de espera + cerrar/reabrir; el hilo con
 * separadores de día y adjuntos; el bloque de Eco DENTRO del hilo (placeholder · §7A) y
 * el campo de respuesta que declara «responde como Dr. …». El alumno recibe el mensaje
 * del docente, nunca de Eco (§7A). SIN realtime: el hilo se recarga por navegación.
 */

import Link from 'next/link';
import {
  ChevronRight,
  Clock,
  FileText,
  Image as ImageIcon,
  Link2,
  Lock,
  MessagesSquare,
  Paperclip,
  Pencil,
  Send,
  Unlock,
  Video,
  X,
} from 'lucide-react';
import { mono, softText, focusRing, Avatar, EcoMark } from './ui';
import type { AdjuntoConsultaDoc, ConsultaDetalleDoc } from '../../../_lib/contrato';

export type HiloConsultaProps = {
  activa: ConsultaDetalleDoc | null;
  docenteNombre: string;
  respuesta: string;
  setRespuesta: (v: string) => void;
  verBorrador: boolean;
  setVerBorrador: (v: boolean) => void;
  enviando: boolean;
  error: string | null;
  aviso: string | null;
  onResponder: () => void;
  onEnlazar: () => void;
  onPedirBorrador: () => void;
  onToggleEstado: () => void;
};

function IconoAdjunto({ tipo }: { tipo: AdjuntoConsultaDoc['tipo'] }) {
  const Icono = tipo === 'imagen' ? ImageIcon : tipo === 'archivo' ? FileText : Video;
  return <Icono className="h-3.5 w-3.5" strokeWidth={1.75} />;
}

export function HiloConsulta({
  activa,
  docenteNombre,
  respuesta,
  setRespuesta,
  verBorrador,
  setVerBorrador,
  enviando,
  error,
  aviso,
  onResponder,
  onEnlazar,
  onPedirBorrador,
  onToggleEstado,
}: HiloConsultaProps) {
  if (!activa) {
    return (
      <section className="grid min-w-0 flex-1 place-items-center rounded-[14px] border border-border bg-card p-8 text-center shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
        <div>
          <span aria-hidden className="inline-grid h-[52px] w-[52px] place-items-center rounded-full bg-accent text-accent-foreground">
            <MessagesSquare className="h-[26px] w-[26px]" strokeWidth={1.75} />
          </span>
          <h2 className="mt-3.5 text-[18px] font-extrabold tracking-[-0.015em]">Elija una consulta</h2>
          <p className={`mx-auto mt-2 max-w-[46ch] text-[13.5px] leading-relaxed ${softText}`}>
            Cuando un alumno o el staff le escriba, aparecerá en la lista. Seleccione un hilo para leerlo y responder.
          </p>
        </div>
      </section>
    );
  }

  const { contraparte, estado } = activa;
  const esAlumno = contraparte.tipo === 'alumno';
  const sinResponder = estado === 'sin-responder';
  const cerrada = estado === 'cerrada';

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[14px] border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
      {/* contexto de la contraparte, siempre visible */}
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-[18px] py-3.5">
        <Avatar ini={contraparte.ini} size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold leading-tight">{contraparte.nombre}</p>
          <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
            {esAlumno ? (
              <>
                {contraparte.grupo ?? 'Sin grupo'}
                {contraparte.moduloEnCurso && (
                  <>
                    {' · cursando '}
                    <span className={`${mono} font-semibold text-[color:var(--foreground-soft)]`}>
                      {contraparte.moduloEnCurso}
                    </span>
                  </>
                )}
                {contraparte.horas != null && ` · ${contraparte.horas} h acumuladas`}
              </>
            ) : (
              contraparte.contexto
            )}
          </p>
        </div>
        {sinResponder && (
          <span className="inline-flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
            <Clock aria-hidden className="h-3 w-3" strokeWidth={1.75} />
            Sin responder{activa.esperando ? ` · ${activa.esperando}` : ''}
          </span>
        )}
        <button
          type="button"
          onClick={onToggleEstado}
          disabled={enviando}
          className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50 ${focusRing}`}
        >
          {cerrada ? (
            <><Unlock aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /> Reabrir</>
          ) : (
            <><Lock aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /> Cerrar</>
          )}
        </button>
        {esAlumno && (
          <Link
            href="/docente/validacion"
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Ver su expediente
            <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        )}
      </div>

      {/* hilo */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-[18px]">
        {activa.mensajes.length === 0 && (
          <p className={`py-8 text-center text-[12.5px] ${softText}`}>Aún no hay mensajes en esta consulta.</p>
        )}
        {activa.mensajes.map((m, i) => {
          const nuevoDia = m.dia && m.dia !== activa.mensajes[i - 1]?.dia;
          return (
            <div key={m.id} className="flex shrink-0 flex-col gap-4">
              {nuevoDia && (
                <div className="flex shrink-0 items-center gap-2.5">
                  <span aria-hidden className="h-px flex-1 bg-border" />
                  <span className={`${mono} text-[10.5px] text-muted-foreground`}>{m.dia}</span>
                  <span aria-hidden className="h-px flex-1 bg-border" />
                </div>
              )}

              {m.de === 'contraparte' ? (
                <div className="flex max-w-[78%] shrink-0 gap-2.5">
                  <Avatar ini={contraparte.ini} size={30} />
                  <div className="min-w-0">
                    {m.texto && (
                      <p className="rounded-[14px] rounded-bl-[4px] border border-border bg-muted px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[color:var(--foreground-soft)]">
                        {m.texto}
                      </p>
                    )}
                    {m.adjunto && (
                      <div className="mt-1.5 flex items-center gap-2.5 rounded-[10px] border border-border bg-card px-2.5 py-2">
                        <span
                          aria-hidden
                          className="grid h-[26px] w-[34px] shrink-0 place-items-center rounded-[5px] bg-sidebar"
                          style={{ color: 'var(--hero-ink-muted)' }}
                        >
                          <IconoAdjunto tipo={m.adjunto.tipo} />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[11.5px] font-semibold">{m.adjunto.nombre}</span>
                          <span className={`${mono} block text-[10px] text-muted-foreground`}>{m.adjunto.meta}</span>
                        </span>
                      </div>
                    )}
                    <span className={`${mono} mt-1 block text-[10.5px] text-muted-foreground`}>{m.hora}</span>
                  </div>
                </div>
              ) : (
                <div className="flex shrink-0 justify-end">
                  <div className="min-w-0 max-w-[78%]">
                    <p className="rounded-[14px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[13.5px] leading-relaxed text-sidebar-foreground">
                      {m.texto}
                    </p>
                    <span className={`${mono} mt-1 block text-right text-[10.5px] text-muted-foreground`}>
                      {m.hora}
                      {m.leido ? ' · leído' : ''}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Eco DENTRO del hilo (placeholder · §7A): contexto listo, la redacción por LLM
            espera el endpoint conversacional. No se fabrica una respuesta clínica. */}
        {sinResponder && activa.eco.borrador && !verBorrador && (
          <button
            type="button"
            onClick={onPedirBorrador}
            className={`flex shrink-0 items-center gap-2.5 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-3 text-left transition-colors hover:bg-card ${focusRing}`}
          >
            <EcoMark size={28} />
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] font-bold text-[color:var(--info-foreground)]">
                Eco preparó el contexto de esta duda
              </span>
              <span className="mt-0.5 block text-[11.5px] text-[color:var(--info-foreground)]">
                {activa.eco.cita ? `${activa.eco.cita} · ` : ''}usted redacta y decide
              </span>
            </span>
            <span className="inline-flex h-[34px] shrink-0 items-center whitespace-nowrap rounded-[9px] bg-[color:var(--info-foreground)] px-3 text-[12px] font-bold text-white">
              Verlo
            </span>
          </button>
        )}

        {sinResponder && activa.eco.borrador && verBorrador && (
          <div className="shrink-0 overflow-hidden rounded-[14px] border border-[color:var(--info-border)] bg-card">
            <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-3.5 py-3">
              <EcoMark size={28} />
              <p className="min-w-0 flex-1 text-[12.5px] font-bold text-[color:var(--info-foreground)]">Eco · borrador</p>
              <span className="inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-card px-[7px] text-[9.5px] font-bold text-[color:var(--info-foreground)]">
                Pendiente de endpoint · §7A
              </span>
            </div>
            <div className="p-3.5">
              <p className={`text-[13px] leading-[1.7] ${softText}`}>{activa.eco.borrador}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5 border-t border-border pt-3">
                {activa.eco.cita && (
                  <span className={`${mono} inline-flex items-center gap-1.5 text-[11px] text-muted-foreground`}>
                    <Link2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {activa.eco.cita}
                  </span>
                )}
                <span className="ml-auto flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setRespuesta(respuesta ? `${respuesta}\n` : '');
                      setVerBorrador(false);
                    }}
                    className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                  >
                    <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Redactar mi respuesta
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerBorrador(false)}
                    className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-[12.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
                  >
                    <X aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Descartar
                  </button>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* responder: la autoría es del docente */}
      <div className="shrink-0 border-t border-border px-[18px] pb-4 pt-3.5">
        {aviso && (
          <p className="mb-2 flex items-start gap-1.5 text-[11.5px] font-medium text-[color:var(--info-foreground)]">
            <EcoMark size={16} />
            {aviso}
          </p>
        )}
        {error && <p className="mb-2 text-[11.5px] font-medium text-[color:var(--warning-foreground)]">{error}</p>}
        <div className="rounded-xl border border-border bg-muted px-3.5 py-3">
          <label>
            <span className="sr-only">Escriba su respuesta</span>
            <textarea
              rows={2}
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  onResponder();
                }
              }}
              placeholder={cerrada ? 'Consulta cerrada — reábrala para responder' : 'Escriba su respuesta…'}
              disabled={cerrada || enviando}
              className="w-full resize-none bg-transparent text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEnlazar}
              disabled={activa.eco.recursos.length === 0}
              className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-2.5 text-[12px] font-semibold ${softText} transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 ${focusRing}`}
            >
              <Link2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
              Enlazar lección o caso
            </button>
            <button
              type="button"
              aria-label="Adjuntar (próximamente)"
              title="Adjuntar archivos: próximamente (subida real pendiente)"
              disabled
              className={`grid h-9 w-9 place-items-center rounded-[9px] border border-border bg-card ${softText} opacity-40 ${focusRing}`}
            >
              <Paperclip aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={onPedirBorrador}
              disabled={cerrada || !activa.eco.disponible}
              className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[12px] font-bold text-[color:var(--info-foreground)] transition-colors hover:bg-card disabled:opacity-40 ${focusRing}`}
            >
              <EcoMark size={18} />
              Pedirle a Eco un borrador
            </button>
            <span className="ml-auto flex items-center gap-2.5">
              <span className={`${mono} hidden text-[11px] text-muted-foreground sm:inline`}>
                responde como {docenteNombre}
              </span>
              <button
                type="button"
                onClick={onResponder}
                disabled={cerrada || enviando || !respuesta.trim()}
                className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-50 ${focusRing}`}
              >
                <Send aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                Responder
              </button>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
