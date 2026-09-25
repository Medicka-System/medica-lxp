'use client';

/**
 * Studio · Expediente del alumno (consulta y seguimiento). El avance en el campus
 * —competencia I-AIM (del LRS), casos, actividad— es REAL vía RLS. El bloque
 * administrativo (matrícula, inscripción, pago) es de CORA: placeholder marcado en
 * local, solo lectura en producción (§10/§11). Eco (sobre el alumno) = placeholder.
 */
import Link from 'next/link';
import {
  AlertTriangle,
  Award,
  ChevronLeft,
  Clock,
  ExternalLink,
  History,
  Lock,
  MessageCircle,
  NotebookText,
  ScanLine,
} from 'lucide-react';
import { mono, kicker, softText, card, focusRing } from '@/components/tokens';
import { Avatar } from '@/components/avatar';
import { ChatEco } from '../../../../_components/chat-eco';
import type { Expediente, EstadoAlumno } from '../../_components/contrato';

const ESTADO: Record<EstadoAlumno, string> = {
  corriente: 'bg-accent text-accent-foreground',
  riesgo:
    'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  suspendido: 'border border-border bg-muted text-muted-foreground',
};

const ESTADO_CASO: Record<'pendiente' | 'aprobado' | 'rechazado', string> = {
  aprobado: 'bg-accent text-accent-foreground',
  pendiente: 'bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  rechazado: 'bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]',
};

export function ExpedienteAlumno({ e }: { e: Expediente }) {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      {/* identidad + acciones */}
      <div className="flex flex-wrap items-start gap-4">
        <Link
          href="/admin/alumnos"
          aria-label="Volver a Alumnos"
          className={`mt-1.5 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
        </Link>

        <Avatar ini={e.ini} size={52} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[21px] font-extrabold leading-tight tracking-[-0.02em]">{e.nombre}</h1>
            <span className={`inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO[e.estado]}`}>
              {e.estado !== 'corriente' && <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />}
              {e.senal ?? 'Al corriente'}
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            {e.email ?? 'sin correo'} · en la escuela desde <span className={mono}>{e.desde}</span>
          </p>
        </div>

        <div className="mt-1.5 flex shrink-0 gap-2.5">
          <button
            type="button"
            disabled
            title="Ver su bitácora — próximamente"
            className={`inline-flex h-11 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-muted-foreground opacity-70 ${focusRing}`}
          >
            <NotebookText aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Ver su bitácora
          </button>
          <button
            type="button"
            disabled
            title="Historial — próximamente"
            className={`inline-flex h-11 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-muted-foreground opacity-70 ${focusRing}`}
          >
            <History aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Historial
          </button>
          <button
            type="button"
            disabled
            title="Contactar — próximamente"
            className={`inline-flex h-11 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] opacity-70 ${focusRing}`}
          >
            <MessageCircle aria-hidden className="h-4 w-4" strokeWidth={1.75} />
            Contactarlo
          </button>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* cifras del campus */}
          <section className={`${card} p-[18px]`}>
            <p className={`${kicker} text-muted-foreground`}>Avance en el campus</p>

            {/* Avance del curso vs. lo esperado + posición: depende de la inscripción al
                grupo (CORA · §11). Layout listo; se cablea con la integración del ERP. */}
            <div className="mt-3.5">
              <div className="flex items-baseline gap-2">
                <span className="text-[13.5px] font-bold text-muted-foreground">Avance del curso</span>
                <span className="ml-auto inline-flex h-[21px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground">
                  <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                  Requiere inscripción · CORA
                </span>
              </div>
              <div
                aria-hidden
                className="mt-2 h-2 rounded-full border border-dashed border-border bg-[color:var(--track)]"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                El avance contra lo esperado y la posición (módulo · lección) se calculan con la
                inscripción del alumno al grupo; se conectan con la integración del ERP (§11).
              </p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {(
                [
                  [Clock, e.cifras.horas, 'horas acreditadas', false],
                  [ScanLine, e.cifras.casosValidados, 'casos validados', false],
                  [
                    AlertTriangle,
                    String(e.cifras.casosRechazados),
                    'casos rechazados',
                    e.cifras.casosRechazados > 0,
                  ],
                  [Award, String(e.cifras.certificados), 'certificados', false],
                  [Award, String(e.cifras.insignias), 'insignias', false],
                ] as const
              ).map(([Icono, v, t, warn], i) => (
                <div
                  key={i}
                  className={`min-w-[120px] flex-1 rounded-[11px] border p-3 ${
                    warn ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]' : 'border-border bg-muted'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-[26px] w-[26px] place-items-center rounded-lg bg-card ${
                      warn ? 'text-[color:var(--warning-foreground)]' : 'text-accent-foreground'
                    }`}
                  >
                    <Icono className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </span>
                  <p className={`${mono} mt-2.5 text-[19px] font-extrabold leading-none`}>{v}</p>
                  <p className={`mt-1 text-[10.5px] leading-snug ${warn ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'}`}>
                    {t}
                  </p>
                </div>
              ))}
            </div>
            {e.cifras.casosPendientes > 0 && (
              <p className="mt-3 text-[11.5px] text-[color:var(--warning-foreground)]">
                {e.cifras.casosPendientes} caso{e.cifras.casosPendientes === 1 ? '' : 's'} en cola de validación.
              </p>
            )}
          </section>

          {/* competencia I-AIM (del LRS) */}
          <section className={`${card} p-[18px]`}>
            <div className="flex flex-wrap items-center gap-2.5">
              <p className={`${kicker} text-muted-foreground`}>Competencia I-AIM</p>
              <span className={`${mono} ml-auto inline-flex h-[21px] items-center whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] text-muted-foreground`}>
                del LRS · xAPI
              </span>
            </div>
            <div className="mt-3.5 flex flex-col gap-3.5">
              {e.iaim.dominios.map((d) => (
                <div key={d.nombre}>
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 text-[12px] font-semibold">{d.nombre}</span>
                    {d.decaimiento > 0 && (
                      <span className="inline-flex h-5 items-center rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2 text-[10px] font-bold text-[color:var(--warning-foreground)]">
                        decae {d.decaimiento}
                      </span>
                    )}
                    <span className={`${mono} shrink-0 text-[13px] font-bold ${d.valor < 55 ? 'text-[color:var(--warning-foreground)]' : ''}`}>
                      {d.valor}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                    <span
                      className={`block h-full rounded-full ${d.valor < 55 ? 'bg-[color:var(--warning)]' : 'bg-primary'}`}
                      style={{ width: `${d.valor}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className={`mt-3.5 border-t border-border pt-3 text-[11.5px] leading-relaxed ${softText}`}>
              Competencia general{' '}
              <span className={`${mono} font-bold text-foreground`}>{e.iaim.general ?? '—'}</span>
              {e.iaim.general === null && ' · aún sin proyección (el worker la calcula al aprobar casos)'}
            </p>
          </section>

          {/* actividad reciente (últimos casos) */}
          <section className={`${card} p-[18px]`}>
            <p className={`${kicker} text-muted-foreground`}>Actividad reciente</p>
            {e.actividad.length > 0 ? (
              <ul className="mt-2.5 flex flex-col gap-0.5">
                {e.actividad.map((a) => (
                  <li key={a.id} className="flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5">
                    <NotebookText aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{a.titulo}</span>
                    <span className={`inline-flex h-[20px] items-center rounded-full px-2 text-[10px] font-bold ${ESTADO_CASO[a.estado]}`}>
                      {a.estado}
                    </span>
                    <span className={`${mono} shrink-0 text-[10.5px] text-muted-foreground`}>{a.cuando}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[12px] text-muted-foreground">Sin casos subidos todavía.</p>
            )}
            {e.consultasAbiertas > 0 && (
              <p className="mt-3 border-t border-border pt-3 text-[11.5px] text-[color:var(--warning-foreground)]">
                {e.consultasAbiertas} consulta{e.consultasAbiertas === 1 ? '' : 's'} 1:1 abierta con el docente.
              </p>
            )}
          </section>
        </div>

        {/* rail: CORA (placeholder) + Eco (placeholder) */}
        <div className="flex min-w-0 flex-col gap-3.5">
          <section className={`${card} overflow-hidden`}>
            <div className="flex items-center gap-2.5 border-b border-border bg-muted px-4 py-3.5">
              <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Administrativo · CORA</p>
              <span className="inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 text-[10px] font-bold text-muted-foreground">
                <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                Solo lectura
              </span>
            </div>
            <div className="p-4">
              <dl className="flex flex-col gap-2.5">
                {['Matrícula', 'Inscripción', 'Grupo asignado', 'Estado de pago'].map((c) => (
                  <div key={c} className="flex items-baseline gap-2.5">
                    <dt className="w-[104px] shrink-0 text-[11.5px] text-muted-foreground">{c}</dt>
                    <dd className="min-w-0 flex-1 text-right text-[12.5px] font-semibold text-muted-foreground">—</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Alta, inscripción, matrícula y cobranza se editan en CORA. Aquí solo se reflejan; el enlace real se conecta en la integración con el ERP (§11).
              </p>
              <button
                type="button"
                disabled
                title="Abrir en CORA — próximamente"
                className={`mt-2.5 inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-muted-foreground ${focusRing}`}
              >
                <ExternalLink aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                Abrir su ficha en CORA
              </button>
            </div>
          </section>

          <ChatEco
            surface="alumno"
            entidadId={e.id}
            intro="Pregúntale a Eco sobre este alumno. Cruza sus datos reales —competencia I-AIM, casos, avance— y el acervo del campus (RAG) para responder. Eco propone; usted confirma."
            sugerencias={['¿Cómo va este alumno?', '¿En qué dominio está más flojo?', '¿Por qué le rechazaron casos?']}
          />
        </div>
      </div>
    </div>
  );
}
