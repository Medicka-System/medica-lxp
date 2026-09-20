import { notFound } from 'next/navigation';
import { Check, Clock, Stethoscope, TriangleAlert } from 'lucide-react';
import { getSesionAlumno } from '@/lib/session';
import { getCasoBitacora } from '@/lib/campus/bitacora-datos';
import { DOMINIO_LABEL, ETIQUETA_ESTADO, type EstadoCaso } from '@/lib/campus/bitacora-contrato';
import { mono, kickerWide as kicker, softText, card } from '@/components/tokens';
import { fechaCorta } from '@/lib/format';
import { VisorEstudio } from '@/components/casos/visor-estudio';
import { VisorDicomPlaceholder } from '../../_components/visor-dicom';
import { VistaCasoEstudio } from '@/components/casos/vista-caso-estudio';

export const dynamic = 'force-dynamic';

const claseEstado: Record<EstadoCaso, string> = {
  pendiente:
    'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  aprobado: 'bg-accent text-accent-foreground',
  rechazado:
    'border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]',
};

/** Detalle de un caso de la bitácora (§4.7) — visor grande + panel del caso. */
export default async function CasoBitacoraPage({
  params,
}: {
  params: Promise<{ casoId: string }>;
}) {
  const { casoId } = await params;
  const alumno = await getSesionAlumno();
  const caso = await getCasoBitacora(alumno.userId, casoId);
  if (!caso) notFound();

  const listo = caso.estudioEstado === 'anonimizado';
  const etiquetaVisor =
    caso.organo ??
    (caso.estudioEstado === 'procesando'
      ? 'anonimizando el estudio…'
      : caso.estudioEstado === 'error'
        ? 'error al procesar el estudio'
        : caso.estudioEstado
          ? 'estudio DICOM en cola'
          : 'sin estudio');

  return (
    <VistaCasoEstudio
      volverHref="/bitacora"
      volverLabel="Volver a mi bitácora"
      visor={
        listo ? (
          <VisorEstudio casoId={caso.id} tabla="bitacora_casos" />
        ) : (
          <div className={`${card} overflow-hidden`}>
            <VisorDicomPlaceholder etiqueta={etiquetaVisor} alto={430} loop={caso.cineLoop} piezas={caso.series} />
          </div>
        )
      }
      debajoDelVisor={
        <>
          <section className={`${card} p-6`}>
            <p className={`${kicker} text-muted-foreground`}>Mis hallazgos</p>
            <p className={`mt-3 max-w-[70ch] whitespace-pre-line text-[15px] leading-[1.75] ${softText}`}>
              {caso.hallazgos?.trim() || 'Sin hallazgos capturados.'}
            </p>
          </section>
          {caso.presuntivo && (
            <section className={`${card} p-6`}>
              <p className={`${kicker} text-muted-foreground`}>Diagnóstico presuntivo</p>
              <p className="mt-3 flex items-start gap-2.5 text-[15px] font-semibold leading-relaxed">
                <Stethoscope aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-secondary" strokeWidth={1.75} />
                {caso.presuntivo}
              </p>
            </section>
          )}
        </>
      }
      panel={
        <>
          <section className={`${card} p-6`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${claseEstado[caso.estado]}`}
              >
                {ETIQUETA_ESTADO[caso.estado]}
              </span>
              {caso.dominio && (
                <span className="inline-flex h-6 items-center rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold text-[color:var(--foreground-soft)]">
                  I-AIM · {DOMINIO_LABEL[caso.dominio]}
                </span>
              )}
            </div>
            <h1 className="mt-3.5 text-[22px] font-extrabold leading-tight tracking-[-0.02em]" style={{ textWrap: 'pretty' }}>
              {caso.hallazgoCorto}
            </h1>
            <p className={`${mono} mt-2.5 text-[12.5px] text-muted-foreground`}>
              {[caso.modulo, caso.organo].filter(Boolean).join(' · ') || 'Sin catalogar'} · {fechaCorta(caso.fecha)}
            </p>
          </section>

          <section className={`${card} p-6`}>
            <p className={`${kicker} text-muted-foreground`}>Seguimiento</p>
            <ul className="mt-3.5 flex flex-col gap-3 text-[13.5px]">
              <li className="flex items-start gap-2.5">
                <span aria-hidden className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                Caso registrado en su bitácora.
              </li>
              <li className={`flex items-start gap-2.5 ${listo ? '' : 'text-muted-foreground'}`}>
                <span
                  aria-hidden
                  className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                    listo ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {listo ? <Check className="h-3 w-3" strokeWidth={3} /> : <Clock className="h-3 w-3" strokeWidth={2.2} />}
                </span>
                {listo
                  ? `Estudio anonimizado · ${caso.series} ${caso.series === 1 ? 'serie' : 'series'}.`
                  : caso.estudioEstado === 'error'
                    ? 'El estudio no se pudo anonimizar.'
                    : caso.estudioEstado
                      ? 'Estudio en anonimización…'
                      : 'Sin estudio adjunto.'}
              </li>
              <li className={`flex items-start gap-2.5 ${caso.estado === 'aprobado' ? '' : 'text-muted-foreground'}`}>
                <span
                  aria-hidden
                  className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                    caso.estado === 'aprobado' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {caso.estado === 'aprobado' ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    <Clock className="h-3 w-3" strokeWidth={2.2} />
                  )}
                </span>
                {caso.estado === 'aprobado'
                  ? 'Validado por su docente · acredita horas.'
                  : 'A la espera de la validación del docente.'}
              </li>
            </ul>
          </section>

          {caso.feedback && (
            <section
              className={`rounded-xl border p-6 ${
                caso.estado === 'rechazado'
                  ? 'border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)]'
                  : 'border-border bg-accent'
              }`}
            >
              <p className={`${kicker} flex items-center gap-2 ${caso.estado === 'rechazado' ? 'text-[color:var(--destructive-foreground)]' : 'text-secondary'}`}>
                {caso.estado === 'rechazado' && <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2} />}
                Revisión del docente
              </p>
              <p
                className={`mt-3 text-[14px] leading-relaxed ${
                  caso.estado === 'rechazado' ? 'text-[color:var(--destructive-foreground)]' : softText
                }`}
              >
                {caso.feedback}
              </p>
            </section>
          )}

          <section className="rounded-xl bg-muted p-5">
            <p className={`text-[12.5px] leading-relaxed ${softText}`}>
              Su bitácora es privada. Los estudios se guardan siempre <strong>anonimizados</strong>: la
              PII del paciente se remueve al procesarlos (§10).
            </p>
          </section>
        </>
      }
    />
  );
}
