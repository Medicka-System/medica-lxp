import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CalendarClock, Megaphone } from 'lucide-react';
import { getSesionAlumno } from '@/lib/session';
import { getAnuncio } from '@/lib/datos';
import { fechaCorta, fechaLargaHora } from '@/lib/format';
import { mono, focusRing } from '@/components/tokens';

// Detalle por usuario (RLS) → dinámico. Vive en el shell del campus (route group).
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Anuncio · Campus Médica' };

export default async function AnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const alumno = await getSesionAlumno();
  const anuncio = await getAnuncio(alumno.userId, id);
  if (!anuncio) notFound();

  return (
    <div className="mx-auto w-full max-w-[820px] px-5 pb-16 pt-6 sm:px-6 lg:px-8">
      <Link
        href="/inicio"
        className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] px-2 text-[13px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
      >
        <ArrowLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
        Volver al inicio
      </Link>

      <article className="mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-rest">
        {/* Cabecera navy */}
        <header className="relative overflow-hidden px-6 py-7 sm:px-8" style={{ background: 'var(--sidebar)' }}>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: 'radial-gradient(120% 150% at 90% 0%, rgba(26,136,128,.55) 0%, rgba(15,45,82,0) 60%)' }}
          />
          <div className="relative">
            <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-2.5 text-[11.5px] font-bold text-[color:var(--sidebar)]">
              <Megaphone aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
              Anuncio de la escuela
            </span>
            <h1
              className="mt-3.5 text-[24px] font-extrabold leading-[1.2] tracking-[-0.02em] sm:text-[28px]"
              style={{ color: 'var(--hero-ink)', textWrap: 'pretty' }}
            >
              {anuncio.titulo}
            </h1>
            <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]" style={{ color: 'var(--hero-ink-muted)' }}>
              {anuncio.autor && <span>Publicado por {anuncio.autor}</span>}
              <span className={mono}>{fechaLargaHora(new Date(anuncio.created_at))}</span>
            </p>
          </div>
        </header>

        {/* Cuerpo completo */}
        <div className="px-6 py-7 sm:px-8">
          <div className="max-w-[68ch] whitespace-pre-line text-[15px] leading-relaxed text-foreground [text-wrap:pretty]">
            {anuncio.cuerpo}
          </div>

          {anuncio.vigente_hasta && (
            <p className="mt-7 inline-flex items-center gap-2 rounded-[10px] bg-muted px-3.5 py-2.5 text-[12.5px] text-muted-foreground">
              <CalendarClock aria-hidden className="h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} />
              Vigente hasta el <span className={`${mono} font-semibold text-foreground`}>{fechaCorta(new Date(anuncio.vigente_hasta))}</span>
            </p>
          )}
        </div>
      </article>
    </div>
  );
}
