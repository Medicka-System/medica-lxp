import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Compass,
  Eye,
  Flame,
  Megaphone,
  MessageCircle,
  ScanLine,
  Video,
} from 'lucide-react';
import { getSesionAlumno } from '@/lib/session';
import { getHomeData } from '@/lib/datos';
import { fechaCorta, haceCuanto, nombreCorto } from '@/lib/format';
import { mono, kicker, softText, cardLg, focusRing } from '@/components/tokens';
import { Avatar, iniciales } from '@/components/avatar';
import { LoopFrame } from '@/components/campus/loop-frame';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

const POST_BADGE: Record<string, { etiqueta: string; variant: 'accent' | 'info' | 'neutral'; icono: typeof ScanLine }> = {
  caso: { etiqueta: 'Caso', variant: 'accent', icono: ScanLine },
  encuesta: { etiqueta: 'Encuesta', variant: 'info', icono: BarChart3 },
  anuncio_comunidad: { etiqueta: 'Anuncio', variant: 'neutral', icono: Megaphone },
};

function diasSemana(): { dd: string; nombre: string; mes: string; hoy: boolean }[] {
  const hoy = new Date();
  const lunes = new Date(hoy);
  const offset = (hoy.getDay() + 6) % 7; // 0 = lunes
  lunes.setDate(hoy.getDate() - offset);
  const nombres = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'];
  return nombres.map((nombre, i) => {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    return {
      dd: String(d.getDate()),
      nombre,
      mes: fechaCorta(d).split(' ')[1] ?? '',
      hoy: d.toDateString() === hoy.toDateString(),
    };
  });
}

export default async function InicioPage() {
  // Home del alumno: hero contenido + "siga donde se quedó" con progreso real (datos.ts).
  const alumno = await getSesionAlumno();
  const data = await getHomeData(alumno.userId);
  const { anuncio, casoSemana, continuar, pulso, posts, loops } = data;

  return (
    <div className="pb-10">
      {/* ══ 1 · HERO INTELIGENTE (contenido al ancho del campus, no full-bleed) ══ */}
      <section aria-label="Hero" className="mx-auto w-full max-w-[1240px] px-5 pt-7 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl shadow-rest" style={{ background: 'var(--sidebar)' }}>
        <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 150% at 88% 0%, rgba(26,136,128,.62) 0%, rgba(15,45,82,0) 62%)' }} />
        <div className="relative grid items-center gap-10 px-6 py-9 sm:px-8 lg:grid-cols-[minmax(0,1fr)_440px]">
          <div className="min-w-0">
            <span className="inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-2.5 text-[11.5px] font-bold text-[color:var(--sidebar)]">
              {anuncio ? <Megaphone aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} /> : <Compass aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />}
              {anuncio ? 'Anuncio de la escuela' : 'Caso de la semana'}
            </span>
            <h1 className="mt-4 text-[26px] font-extrabold leading-[1.18] tracking-[-0.025em] sm:text-[31px]" style={{ color: 'var(--hero-ink)', textWrap: 'pretty' }}>
              {anuncio?.titulo ?? casoSemana?.titulo ?? 'Bienvenido a su Campus'}
            </h1>
            <p className="mt-3 max-w-[58ch] text-[14.5px] leading-relaxed" style={{ color: 'var(--hero-ink-muted)', textWrap: 'pretty' }}>
              {anuncio?.cuerpo ?? casoSemana?.diagnostico_correcto ?? 'Sus cursos, casos y comunidad, en un solo lugar.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href={anuncio ? '/ateneo' : '/biblioteca'} className={`inline-flex h-12 items-center gap-2 whitespace-nowrap rounded-[11px] bg-card px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-primary ${focusRing}`}>
                {anuncio ? 'Ver el anuncio' : 'Ver el caso'}
                <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />
              </Link>
              {anuncio?.vigente_hasta && (
                <span className={`${mono} text-[11.5px]`} style={{ color: 'var(--hero-ink-muted)' }}>
                  vigente hasta el {fechaCorta(new Date(anuncio.vigente_hasta))}
                </span>
              )}
            </div>
          </div>

          <div className="relative hidden aspect-[16/10] w-full place-items-center overflow-hidden rounded-2xl border border-white/20 lg:grid" style={{ background: '#0a2140' }}>
            <LoopFrame etiqueta={casoSemana?.organo ?? 'ultrasonido'} duracion="cine-loop" tamano={62} />
          </div>
        </div>
        </div>
      </section>

      {/* saludo */}
      <div className="mx-auto w-full max-w-[1240px] px-5 pt-7 sm:px-6 lg:px-8">
        <h2 className="text-[20px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[23px]">Buen día, {nombreCorto(alumno.nombre)}</h2>
        <p className={`mt-1.5 text-[13.5px] ${softText}`}>
          {continuar ? `Continúe en ${continuar.modulo}: "${continuar.leccion}".` : 'Explore el catálogo para empezar su primer curso.'}
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-5 pt-6 sm:px-6 lg:px-8">
        {/* ══ 2 · ¿DÓNDE ME QUEDÉ? + PULSO ══ */}
        <section aria-label="Dónde se quedó" className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_316px]">
          <article className="relative overflow-hidden rounded-2xl shadow-rest" style={{ background: 'var(--secondary)' }}>
            <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 150% at 92% 0%, rgba(83,195,190,.5) 0%, rgba(26,136,128,0) 60%)' }} />
            <div className="relative flex flex-wrap items-center gap-6 p-6">
              {/* Portada del curso (imagen del programa · mig 0031), no un video */}
              <div className="relative aspect-[16/10] w-[196px] shrink-0 overflow-hidden rounded-xl border border-white/20" style={{ background: '#0a2140' }}>
                {continuar?.imagen ? (
                  // <img> directo: la portada del curso es un asset estático/URL del programa.
                  <img src={continuar.imagen} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center"><LoopFrame tamano={46} claro /></span>
                )}
              </div>
              <div className="min-w-[260px] flex-1">
                <span className={kicker} style={{ color: '#a8e0dc' }}>Siga donde se quedó</span>
                <p className="mt-2.5 text-[20px] font-extrabold leading-[1.28] tracking-[-0.015em]" style={{ color: 'var(--hero-ink)', textWrap: 'pretty' }}>
                  {continuar?.leccion ?? 'Empiece su primer curso'}
                </p>
                <p className="mt-1.5 text-[12.5px]" style={{ color: '#d3f1ef' }}>
                  {continuar ? `${continuar.programa} · ${continuar.modulo}` : 'Ultrasonografía Médica'}
                </p>
                <Link href={continuar ? `/leccion/${continuar.id}` : '/explorar'} className={`mt-5 inline-flex h-12 items-center gap-2 rounded-[11px] bg-card px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-primary ${focusRing}`}>
                  {continuar ? 'Continuar' : 'Explorar'}
                  <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={2} />
                </Link>
              </div>
            </div>
          </article>

          <aside className={`${cardLg} flex flex-col p-5`}>
            <div className="flex items-center gap-2.5">
              <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Cómo va</p>
              <Link href="/dominio" className="whitespace-nowrap text-[11.5px] font-semibold text-secondary">Ver a detalle</Link>
            </div>
            <div className="mt-4 flex gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className={`${mono} text-[22px] font-extrabold leading-none tracking-[-0.02em]`}>{pulso.avancePct}%</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">del diplomado</span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{pulso.horasTotales} de 1000 h</p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className={`${mono} text-[22px] font-extrabold leading-none tracking-[-0.02em]`}>{pulso.nivelGeneral}</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">competencia</span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">promedio I-AIM</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2.5 border-t border-border pt-4">
              {pulso.dominios.length > 0 ? pulso.dominios.map((d) => (
                <div key={d.nombre}>
                  <div className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 text-[11.5px] font-semibold">{d.nombre}</span>
                    {d.enRepaso && <Badge variant="warning" size="sm">en repaso</Badge>}
                    <span className={`${mono} shrink-0 text-[11.5px] font-bold`}>{d.valor}</span>
                  </div>
                  <span className="mt-1.5 block h-[5px] overflow-hidden rounded-full bg-[color:var(--track)]">
                    <span aria-hidden className={`block h-full rounded-full ${d.enRepaso ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${d.valor}%` }} />
                  </span>
                </div>
              )) : <p className="text-[12px] text-muted-foreground">Aún sin competencia registrada. Suba su primer caso.</p>}
            </div>
            <div className="mt-auto flex items-center gap-2.5 pt-4">
              <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-warning-surface text-warning-foreground">
                <Flame className="h-4 w-4" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold">Su bitácora lo espera</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">registre un caso hoy</span>
              </span>
            </div>
          </aside>
        </section>

        {/* ══ 3 · COMUNIDAD VIVA ══ */}
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          {/* Ateneo */}
          <Card className="flex min-w-0 flex-col overflow-hidden">
            <div className="flex items-center gap-2.5 px-[18px] pb-3.5 pt-[18px]">
              <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
                <MessageCircle className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15.5px] font-bold leading-tight">Lo nuevo en el Ateneo</h3>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{posts.length} publicaciones recientes</p>
              </div>
              <Link href="/ateneo" className={`inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}>
                Ver todo <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
            {posts.length > 0 ? (
              <ul>
                {posts.map((p) => {
                  const t = POST_BADGE[p.tipo] ?? POST_BADGE.caso;
                  const Icono = t.icono;
                  return (
                    <li key={p.id}>
                      <Link href="/ateneo" className={`flex w-full gap-3.5 border-t border-border p-[15px] text-left transition-colors hover:bg-muted ${focusRing}`}>
                        <Avatar ini={iniciales(p.autor)} size={38} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-bold">{p.autor}</span>
                            <Badge variant={t.variant} size="sm"><Icono aria-hidden className="h-[11px] w-[11px]" strokeWidth={1.75} />{t.etiqueta}</Badge>
                            <span className={`${mono} ml-auto whitespace-nowrap text-[10.5px] text-muted-foreground`}>{haceCuanto(new Date(p.cuando))}</span>
                          </span>
                          <span className={`mt-1.5 block text-[13.5px] font-medium leading-relaxed ${softText}`} style={{ textWrap: 'pretty' }}>
                            {p.vineta ?? p.titulo}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="border-t border-border p-[15px] text-[13px] text-muted-foreground">Todavía no hay publicaciones. Sé el primero en el Ateneo.</p>
            )}
          </Card>

          {/* cine-loops */}
          <Card className="flex min-w-0 flex-col overflow-hidden">
            <div className="flex items-center gap-2.5 px-[18px] pb-3.5 pt-[18px]">
              <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
                <Video className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15.5px] font-bold leading-tight">Cine-loops de la semana</h3>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">Curados de la Biblioteca</p>
              </div>
              <Link href="/biblioteca" className={`inline-flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}>
                Biblioteca <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
            {loops.length > 0 ? (
              <ul className="flex flex-col gap-2.5 px-[18px] pb-[18px]">
                {loops.map((l) => (
                  <li key={l.id}>
                    <Link href="/biblioteca" className={`flex w-full gap-3.5 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary ${focusRing}`}>
                      <span aria-hidden className="relative grid aspect-[16/10] w-[108px] shrink-0 place-items-center overflow-hidden rounded-[9px]" style={{ background: 'var(--sidebar)' }}>
                        <LoopFrame tamano={30} claro />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`${mono} block text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground`}>{l.area}</span>
                        <span className="mt-1 block text-[12.5px] font-bold leading-snug" style={{ textWrap: 'pretty' }}>{l.titulo}</span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <span className="truncate text-[10.5px] text-muted-foreground">{l.autor}</span>
                          <span className={`${mono} ml-auto inline-flex items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground`}>
                            <Eye aria-hidden className="h-[11px] w-[11px]" strokeWidth={1.75} />—
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-[18px] pb-[18px] text-[13px] text-muted-foreground">Aún no hay casos publicados en la Biblioteca.</p>
            )}
          </Card>
        </div>

        {/* ══ 4 · LO QUE VIENE ══ */}
        <Card className="px-5 pb-5 pt-5 sm:px-[22px]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
              <CalendarDays className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h3 className="text-[15.5px] font-bold leading-tight">Lo que viene esta semana</h3>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">Su calendario de clases y entregas</p>
            </div>
            <Link href="/calendario" className={`ml-auto inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}>
              Mi calendario <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            </Link>
          </div>
          <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {diasSemana().map((d) => (
              <div key={d.dd} className="flex min-w-0 flex-col gap-2.5">
                <div className={`flex items-center gap-2 border-b-2 pb-2.5 ${d.hoy ? 'border-primary' : 'border-border'}`}>
                  <span className={`${mono} text-[17px] font-extrabold leading-none ${d.hoy ? 'text-secondary' : 'text-foreground'}`}>{d.dd}</span>
                  <span className="flex flex-col leading-[1.15]">
                    <span className={`text-[10.5px] font-bold ${d.hoy ? 'text-secondary' : 'text-foreground'}`}>{d.nombre}</span>
                    <span className={`${mono} text-[9.5px] text-muted-foreground`}>{d.mes}</span>
                  </span>
                  {d.hoy && <Badge variant="primary" size="sm" className="ml-auto">hoy</Badge>}
                </div>
                <div className="rounded-[11px] border-[1.5px] border-dashed border-border px-2.5 py-4 text-center">
                  <span className="text-[11px] text-muted-foreground">Libre</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
