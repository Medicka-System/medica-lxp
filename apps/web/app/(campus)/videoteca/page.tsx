import { Radio } from 'lucide-react';
import { getSesionAlumno } from '@/lib/session';
import { softText, card } from '@/components/tokens';
import { getVideoteca } from './_lib/datos';
import { VideotecaGaleria } from './_components/videoteca-galeria';

export const dynamic = 'force-dynamic';

/**
 * Videoteca del alumno (Sprint 6). Lista y reproduce **videos instruccionales**
 * (`lxp.contenidos` tipo=video, leídos con RLS como el alumno). Las **grabaciones de
 * clases** llegan solas de Zoom (`ingesta-grabacion-zoom`) y aún no tienen tabla:
 * se muestran como sección PENDIENTE DE API con su contrato.
 */
export default async function VideotecaPage() {
  const { userId } = await getSesionAlumno();
  const { videos, programas } = await getVideoteca(userId);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-12 pt-7 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">Videoteca</h1>
        <p className={`mt-1 text-[13px] ${softText}`}>
          Videos instruccionales del curso y grabaciones de las clases en vivo, en un solo lugar.
        </p>
      </div>

      <VideotecaGaleria videos={videos} programas={programas} />

      {/* Grabaciones de clases — PENDIENTE DE API (Zoom · Sprint 6) */}
      <section className="mt-10">
        <h2 className="text-[15px] font-bold">Grabaciones de clases</h2>
        <div className="mt-3 flex items-start gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-3.5">
          <Radio aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
          <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
            Las grabaciones de las clases en vivo llegan solas desde Zoom (webhook{' '}
            <span className="font-semibold">recording.completed</span> → worker{' '}
            <span className="font-semibold">ingesta-grabacion-zoom</span>) y quedan ligadas a la
            lección de su grupo. <span className="font-bold">Pendiente de API/DB</span> (tabla de
            grabaciones e ingesta · Sprint 6).
          </p>
        </div>
        <div className={`${card} mt-3 px-6 py-10 text-center text-[13px] ${softText}`}>
          Todavía no hay grabaciones de clases en su videoteca.
        </div>
      </section>
    </div>
  );
}
