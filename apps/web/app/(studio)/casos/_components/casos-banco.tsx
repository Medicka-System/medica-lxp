'use client';

/**
 * Studio · Casos — curaduría del banco (§5B/§7A). Curar = catalogar + estructurar la
 * VERDAD del caso; solo después se publica a la Biblioteca. Datos reales por RLS
 * desde lxp.casos_biblioteca; bandejas derivadas de `publicado` (Por curar vs En
 * Biblioteca). "Subir caso" crea un caso de staff y abre el editor.
 *
 * PENDIENTE (ver lib/studio/casos-contrato.ts): puente bitácora→banco (origen
 * alumno/staff), estados Simulador/Archivado, y el DICOM (visor + anonimización, 4.7).
 */

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BookCopy, Info, Search, Sparkles, TriangleAlert, Upload } from 'lucide-react';
import { mono, kicker, softText, focusRing } from '@/lib/studio/estilos';
import { fechaCorta } from '@/lib/format';
import { DOMINIO_LABEL, type CasoResumen, type DominioIaim, type EstadoCaso } from '@/lib/studio/casos-contrato';
import { crearCaso } from '@/lib/studio/acciones';

type Bandeja = 'por-curar' | 'todo' | 'biblioteca';

function ChipEstado({ estado }: { estado: EstadoCaso }) {
  if (estado === 'biblioteca') {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 text-[11px] font-bold text-accent-foreground">
        <BookCopy aria-hidden className="h-3 w-3" strokeWidth={1.75} />
        En Biblioteca
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
      Por curar
    </span>
  );
}

export function CasosBanco({ casos }: { casos: CasoResumen[] }) {
  const router = useRouter();
  const [bandeja, setBandeja] = useState<Bandeja>('por-curar');
  const [busca, setBusca] = useState('');
  const [dominios, setDominios] = useState<DominioIaim[]>([]);
  const [creando, iniciar] = useTransition();

  const totales = useMemo(
    () => ({
      todo: casos.length,
      'por-curar': casos.filter((c) => c.estado === 'por_curar').length,
      biblioteca: casos.filter((c) => c.estado === 'biblioteca').length,
    }),
    [casos],
  );
  const porCurar = totales['por-curar'];

  const facetaDominios = useMemo(() => {
    const m = new Map<DominioIaim, number>();
    for (const c of casos) if (c.dominio) m.set(c.dominio, (m.get(c.dominio) ?? 0) + 1);
    return [...m.entries()];
  }, [casos]);

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return casos.filter((c) => {
      const enBandeja =
        bandeja === 'todo' ||
        (bandeja === 'por-curar' && c.estado === 'por_curar') ||
        (bandeja === 'biblioteca' && c.estado === 'biblioteca');
      const enDominio = dominios.length === 0 || (c.dominio && dominios.includes(c.dominio));
      const enBusca = !q || c.titulo.toLowerCase().includes(q) || (c.curador ?? '').toLowerCase().includes(q);
      return enBandeja && enDominio && enBusca;
    });
  }, [casos, bandeja, dominios, busca]);

  const alternarDominio = (d: DominioIaim) =>
    setDominios((a) => (a.includes(d) ? a.filter((x) => x !== d) : [...a, d]));

  return (
    <div className="mx-auto w-full max-w-[1240px] px-8 pb-10 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Casos</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>
            Curar = catalogar y estructurar la verdad del caso. Después se publica a la Biblioteca.
          </p>
        </div>
        <button
          type="button"
          onClick={() => iniciar(() => crearCaso())}
          disabled={creando}
          className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          <Upload aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
          {creando ? 'Creando…' : 'Subir caso'}
        </button>
      </div>

      {/* bandejas + búsqueda */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ['por-curar', 'Por curar'],
              ['todo', 'Todo el banco'],
              ['biblioteca', 'En Biblioteca'],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setBandeja(id)}
              aria-pressed={bandeja === id}
              className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors ${focusRing} ${
                bandeja === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${bandeja === id ? 'text-white/70' : 'text-muted-foreground'}`}>
                {totales[id]}
              </span>
            </button>
          ))}
        </div>
        <label className="flex h-10 w-[260px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar caso</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por diagnóstico o curador…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {/* aviso: puente bitácora→banco pendiente */}
      <div className="mt-4 flex items-start gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-4 py-3">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
          El banco muestra los casos curados (lxp.casos_biblioteca). El puente que trae los casos del
          alumno validados por un docente desde su bitácora, el origen y los estados Simulador/Archivado
          son <span className="font-bold">pendientes de DB/API</span>; el DICOM (visor + anonimización)
          es el Sprint 4.7.
        </p>
      </div>

      {porCurar > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3.5 rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-5 py-3.5">
          <span aria-hidden className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]">
            <TriangleAlert className="h-[17px] w-[17px]" strokeWidth={2} />
          </span>
          <p className="min-w-[280px] flex-1 text-[13px] leading-relaxed text-[color:var(--warning-foreground)]">
            <span className="font-bold">{porCurar} {porCurar === 1 ? 'caso espera' : 'casos esperan'} curaduría</span> —
            catalogar y estructurar la verdad del caso. Hasta entonces no llegan a la Biblioteca ni al
            simulador.
          </p>
        </div>
      )}

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* facetas (dominio I-AIM real) */}
        <aside className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-rest">
          <p className={`${kicker} mb-2 text-muted-foreground`}>Dominio I-AIM</p>
          {facetaDominios.length === 0 && <p className="text-[12px] text-muted-foreground">Sin casos aún</p>}
          {facetaDominios.map(([d, n]) => {
            const on = dominios.includes(d);
            return (
              <label
                key={d}
                className={`flex h-[34px] cursor-pointer items-center gap-2.5 rounded-lg px-1.5 transition-colors ${on ? 'bg-accent' : 'hover:bg-muted'}`}
              >
                <input type="checkbox" checked={on} onChange={() => alternarDominio(d)} className="h-4 w-4 shrink-0 accent-[color:var(--secondary)]" />
                <span className={`flex-1 text-[12.5px] ${on ? 'font-semibold text-accent-foreground' : `font-medium ${softText}`}`}>
                  {DOMINIO_LABEL[d]}
                </span>
                <span className={`${mono} text-[11px] text-muted-foreground`}>{n}</span>
              </label>
            );
          })}
          {dominios.length > 0 && (
            <button
              type="button"
              onClick={() => setDominios([])}
              className={`mt-3 h-9 w-full rounded-[9px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
            >
              Limpiar
            </button>
          )}
        </aside>

        {/* galería */}
        <div className="min-w-0">
          {visibles.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-6 py-14 text-center">
              <p className="text-[15px] font-bold">
                {casos.length === 0 ? 'El banco está vacío' : 'Ningún caso con estos filtros'}
              </p>
              <p className={`mx-auto mt-2 max-w-[52ch] text-[13px] leading-relaxed ${softText}`}>
                {casos.length === 0
                  ? 'Sube un caso propio o espera a que un docente valide casos de la bitácora. Todo estudio se anonimiza al cargarse.'
                  : 'Quita una faceta o cambia de bandeja.'}
              </p>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibles.map((c) => (
                <li key={c.id}>
                  <article
                    className={`overflow-hidden rounded-xl border bg-card shadow-rest transition-colors hover:border-primary ${
                      c.estado === 'por_curar' ? 'border-[color:var(--warning-border)]' : 'border-border'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/casos/${c.id}`)}
                      aria-label={`Abrir ${c.titulo}`}
                      className={`relative grid w-full place-items-center ${focusRing}`}
                      style={{ aspectRatio: '4 / 3', background: 'var(--sidebar)' }}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-0"
                        style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,.08) 0 2px, transparent 2px 9px)' }}
                      />
                      <span className={`${mono} relative px-3 text-center text-[9px] uppercase tracking-[0.14em]`} style={{ color: 'var(--hero-ink-muted)' }}>
                        {c.organo ?? 'DICOM pendiente'}
                      </span>
                      <span className="absolute left-2 top-2">
                        <ChipEstado estado={c.estado} />
                      </span>
                    </button>
                    <div className="px-3.5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-muted-foreground">
                          {c.curador ?? 'Staff'}
                        </span>
                        {c.verdadCompleta && (
                          <span className="inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-1.5 text-[10px] font-bold text-[color:var(--info-foreground)]">
                            <Sparkles aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                            Verdad lista
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 text-[13.5px] font-bold leading-relaxed" style={{ textWrap: 'pretty' }}>
                        {c.titulo}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        {c.organo && (
                          <span className={`inline-flex h-[22px] items-center rounded-full border border-border bg-muted px-2 text-[10.5px] font-semibold ${softText}`}>
                            {c.organo}
                          </span>
                        )}
                        {c.dominio && (
                          <span className={`${mono} inline-flex h-[22px] items-center rounded-full border border-border bg-muted px-2 text-[10.5px] font-semibold ${softText}`}>
                            {DOMINIO_LABEL[c.dominio]}
                          </span>
                        )}
                      </div>
                      <p className={`${mono} mt-2.5 border-t border-border pt-2.5 text-[11px] text-muted-foreground`}>
                        {c.estado === 'biblioteca' ? 'publicado' : 'creado'} {fechaCorta(c.cuando)}
                      </p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
