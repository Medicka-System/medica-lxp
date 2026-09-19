import { getSesionAlumno } from '@/lib/session';
import { getCatalogo } from '@/lib/campus/cursos-datos';
import { kicker } from '@/components/tokens';
import { FichaCatalogo } from './_components/ficha-catalogo';

export const dynamic = 'force-dynamic';

/**
 * Explorar / Catálogo (§ Sprint 8) — programas publicados con desglose de módulos
 * (upsell modular). Lee lxp.programas/modulos con RLS (comoAlumno). La inscripción y
 * el checkout viven en CORA (§1) — el CTA hará el deep-link (PENDIENTE · cursos-contrato).
 */
export default async function ExplorarPage() {
  const alumno = await getSesionAlumno();
  const catalogo = await getCatalogo(alumno.userId);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <header>
        <p className={`${kicker} text-secondary`}>Aprender</p>
        <h1 className="mt-1 text-[22px] font-bold leading-tight">Explorar el catálogo</h1>
        <p className="mt-1 max-w-2xl text-[13.5px] text-muted-foreground">
          Programas completos y módulos sueltos que puedes sumar a tu formación. Cada módulo
          acredita horas para tu competencia.
        </p>
      </header>

      {catalogo.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="text-[15px] font-bold">El catálogo está en preparación</p>
          <p className="mx-auto mt-1.5 max-w-md text-[13.5px] text-muted-foreground">
            Pronto encontrarás aquí los programas publicados por la escuela.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {catalogo.map((p) => (
            <FichaCatalogo key={p.programaId} programa={p} />
          ))}
        </div>
      )}
    </div>
  );
}
