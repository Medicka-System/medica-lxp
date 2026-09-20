import { notFound } from 'next/navigation';
import { Check, TriangleAlert } from 'lucide-react';
import { getSesionAlumno } from '@/lib/session';
import { getCasoAcervo } from '@/lib/campus/biblioteca-datos';
import { DOMINIO_LABEL } from '@/lib/campus/bitacora-contrato';
import { mono, kickerWide as kicker, softText, card } from '@/components/tokens';
import { fechaCorta } from '@/lib/format';
import { VisorEstudio } from '@/components/casos/visor-estudio';
import { VisorDicomPlaceholder } from '../../_components/visor-dicom';
import { VistaCasoEstudio } from '@/components/casos/vista-caso-estudio';

export const dynamic = 'force-dynamic';

/**
 * Detalle de un caso de la Biblioteca (§6/§7A · 4.7). Material de estudio: el
 * diagnóstico SÍ se revela, tras los hallazgos. Visor DICOM real (transversal) a la
 * izquierda; verdad estructurada + ficha a la derecha. Fiel al mock detalle-caso.
 */
export default async function CasoBibliotecaPage({
  params,
}: {
  params: Promise<{ casoId: string }>;
}) {
  const { casoId } = await params;
  const alumno = await getSesionAlumno();
  const caso = await getCasoAcervo(alumno.userId, casoId);
  if (!caso) notFound();

  return (
    <VistaCasoEstudio
      volverHref="/biblioteca"
      volverLabel="Volver a la biblioteca"
      visor={
        caso.tieneDicom ? (
          <VisorEstudio casoId={caso.id} tabla="casos_biblioteca" soloLectura />
        ) : (
          <div className={`${card} overflow-hidden`}>
            <VisorDicomPlaceholder etiqueta={caso.organo ?? caso.titulo} alto={430} />
            <p className="px-4 py-3 text-center text-[12px] text-muted-foreground">
              Este caso aún no tiene estudio DICOM asociado.
            </p>
          </div>
        )
      }
      debajoDelVisor={
        <>
          <section className={`${card} p-6`}>
            <p className={`${kicker} text-muted-foreground`}>Hallazgos clave</p>
            {caso.hallazgosClave.length > 0 ? (
              <ul className="mt-3.5 flex max-w-[70ch] flex-col gap-3">
                {caso.hallazgosClave.map((h, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-accent text-accent-foreground"
                    >
                      <Check className="h-[13px] w-[13px]" strokeWidth={2.2} />
                    </span>
                    <span className={`text-[14.5px] leading-relaxed ${softText}`}>{h}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-muted-foreground">Sin hallazgos capturados.</p>
            )}
          </section>

          {caso.diagnostico && (
            <section className="relative overflow-hidden rounded-xl p-6" style={{ background: 'var(--sidebar)' }}>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(120% 150% at 88% 0%, rgba(26,136,128,.55) 0%, rgba(15,45,82,0) 62%)',
                }}
              />
              <div className="relative">
                <p className={`${kicker} text-primary`}>Diagnóstico confirmado</p>
                <p
                  className="mt-3 max-w-[56ch] text-[22px] font-extrabold leading-snug tracking-[-0.02em]"
                  style={{ color: 'var(--hero-ink)' }}
                >
                  {caso.diagnostico}
                </p>
              </div>
            </section>
          )}

          {caso.puntosAprendizaje.length > 0 && (
            <section className={`${card} p-6`}>
              <p className={`${kicker} text-muted-foreground`}>Puntos clave de aprendizaje</p>
              <ol className="mt-3.5 flex max-w-[70ch] flex-col gap-2.5">
                {caso.puntosAprendizaje.map((p, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      aria-hidden
                      className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-sidebar text-[11px] font-bold text-sidebar-foreground ${mono}`}
                    >
                      {i + 1}
                    </span>
                    <span className={`text-[14px] leading-relaxed ${softText}`}>{p}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {caso.erroresComunes.length > 0 && (
            <section className={`${card} p-6`}>
              <p className={`${kicker} text-[color:var(--warning-foreground)]`}>Errores comunes a evitar</p>
              <ul className="mt-3.5 flex max-w-[70ch] flex-col gap-2.5">
                {caso.erroresComunes.map((e, i) => (
                  <li key={i} className="flex gap-3">
                    <TriangleAlert
                      aria-hidden
                      className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--warning-foreground)]"
                      strokeWidth={2}
                    />
                    <span className={`text-[14px] leading-relaxed ${softText}`}>{e}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      }
      panel={
        <>
          <section className={`${card} p-6`}>
            <div className="flex flex-wrap items-center gap-1.5">
              {caso.organo && (
                <span className="inline-flex h-6 items-center rounded-full bg-accent px-2.5 text-[11.5px] font-semibold text-accent-foreground">
                  {caso.organo}
                </span>
              )}
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-sidebar px-2.5 text-[11.5px] font-bold text-sidebar-foreground">
                <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.2} />
                Validado
              </span>
            </div>
            <h1 className="mt-3.5 text-[24px] font-extrabold leading-tight tracking-[-0.02em]" style={{ textWrap: 'pretty' }}>
              {caso.titulo}
            </h1>
            <p className={`${mono} mt-2.5 text-[12.5px] text-muted-foreground`}>
              {caso.curador ? `Curado por ${caso.curador} · ` : ''}
              {fechaCorta(caso.fecha)}
            </p>
          </section>

          <section className={`${card} p-6`}>
            <p className={`${kicker} text-muted-foreground`}>Ficha del caso</p>
            <dl className="mt-3.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
              {caso.organo && (
                <div className="contents">
                  <dt className="text-[13px] text-muted-foreground">Órgano</dt>
                  <dd className="text-[13.5px] font-semibold">{caso.organo}</dd>
                </div>
              )}
              {caso.dominio && (
                <div className="contents">
                  <dt className="text-[13px] text-muted-foreground">Dominio I-AIM</dt>
                  <dd className="text-[13.5px] font-semibold">{DOMINIO_LABEL[caso.dominio]}</dd>
                </div>
              )}
              <div className="contents">
                <dt className="text-[13px] text-muted-foreground">Estudio</dt>
                <dd className="text-[13.5px] font-semibold">
                  {caso.tieneDicom ? 'DICOM anonimizado' : 'Sin estudio'}
                </dd>
              </div>
            </dl>
          </section>
        </>
      }
    />
  );
}
