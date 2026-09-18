'use client';

/**
 * Studio · Alumnos — lista global de CONSULTA Y SEGUIMIENTO (§5B). Transversal a
 * todos los programas. El avance en el campus (competencia I-AIM, casos, actividad)
 * es REAL vía RLS; alta/inscripción/matrícula/cobranza viven en CORA (frontera §1/§10).
 *
 * Color (§5A): ÁMBAR es el único color de atención (riesgo), siempre con su motivo
 * escrito. El rojo se reserva a pago vencido (dato de CORA, en el expediente).
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Download, Lock, Search, Sparkles } from 'lucide-react';
import { mono, softText, focusRing } from '@/components/tokens';
import { Avatar } from '@/components/avatar';
import type { AlumnosData, EstadoAlumno } from './contrato';

const ESTADO: Record<EstadoAlumno, { etiqueta: string; clase: string }> = {
  corriente: { etiqueta: 'Al corriente', clase: 'bg-accent text-accent-foreground' },
  riesgo: {
    etiqueta: 'En riesgo',
    clase:
      'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  },
  suspendido: { etiqueta: 'Suspendido', clase: `border border-border bg-muted text-muted-foreground` },
};

function Barra({ pct }: { pct: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className="h-[5px] w-[86px] overflow-hidden rounded-full bg-[color:var(--track)]">
        <span aria-hidden className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
      <span className={`${mono} text-[12px] font-bold`}>{pct}%</span>
    </span>
  );
}

export function AlumnosLista({ data }: { data: AlumnosData }) {
  const { totales, alumnos } = data;
  const [soloRiesgo, setSoloRiesgo] = useState(false);
  const [busca, setBusca] = useState('');

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return alumnos.filter(
      (a) => (!q || a.nombre.toLowerCase().includes(q)) && (!soloRiesgo || a.estado === 'riesgo'),
    );
  }, [alumnos, busca, soloRiesgo]);

  const tarjetas: [string, string, string, boolean][] = [
    ['Alumnos activos', String(totales.activos), 'con acceso al día', false],
    ['En riesgo', String(totales.enRiesgo), 'sin actividad en 14+ días', true],
    ['Suspendidos', String(totales.suspendidos), 'acceso en pausa · CORA', false],
    [
      'Competencia media',
      totales.competenciaMedia === null ? '—' : String(totales.competenciaMedia),
      'I-AIM global (del LRS)',
      false,
    ],
  ];

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Alumnos</h1>
            <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[10.5px] font-bold text-muted-foreground">
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Alta e inscripción: CORA
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Los alumnos de la escuela, de todos los programas. Aquí se consulta y se da seguimiento a su avance en el campus.
          </p>
        </div>
        <div className="ml-auto flex gap-2.5">
          <button
            type="button"
            disabled
            title="Eco analista — próximamente (por API)"
            className={`inline-flex h-10 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-[10px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 text-[12.5px] font-bold text-[color:var(--info-foreground)] opacity-70 ${focusRing}`}
          >
            <Sparkles aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Preguntar a Eco
          </button>
          <button
            type="button"
            disabled
            title="Exportar — próximamente"
            className={`inline-flex h-10 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-muted-foreground ${focusRing}`}
          >
            <Download aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Exportar
          </button>
        </div>
      </div>

      <ul className="mt-5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {tarjetas.map(([t, v, s, warn]) => (
          <li
            key={t}
            className={`rounded-xl border p-4 shadow-rest ${
              warn ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]' : 'border-border bg-card'
            }`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${warn ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'}`}>
              {t}
            </p>
            <p className={`${mono} mt-2.5 text-[26px] font-extrabold leading-none tracking-[-0.02em]`}>{v}</p>
            <p className={`mt-1.5 text-[11px] leading-snug ${warn ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'}`}>
              {s}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <label className="flex h-10 w-[270px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar por nombre</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nombre…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>

        <button
          type="button"
          onClick={() => setSoloRiesgo((v) => !v)}
          aria-pressed={soloRiesgo}
          className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border px-3.5 text-[12.5px] font-bold transition-colors ${focusRing} ${
            soloRiesgo
              ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
              : `border-border bg-card ${softText}`
          }`}
        >
          <AlertTriangle aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
          Solo en riesgo · {totales.enRiesgo}
        </button>

        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {visibles.length} de {alumnos.length}
        </span>
      </div>

      <section className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <div className="flex items-center gap-3.5 bg-muted px-[18px] py-2.5">
          {(
            [
              ['Alumno', 'flex-[1.6]'],
              ['Casos validados', 'shrink-0 w-[132px]'],
              ['I-AIM', 'shrink-0 w-[74px] text-center'],
              ['Estado y señal', 'shrink-0 w-[210px]'],
              ['Última actividad', 'shrink-0 w-[128px]'],
            ] as const
          ).map(([t, cls]) => (
            <span key={t} className={`${cls} whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}>
              {t}
            </span>
          ))}
        </div>

        {visibles.length === 0 ? (
          <p className="border-t border-border px-[18px] py-8 text-center text-[12.5px] text-muted-foreground">
            No hay alumnos que coincidan con el filtro.
          </p>
        ) : (
          visibles.map((a) => (
            <Link
              key={a.id}
              href={`/admin/alumnos/${a.id}`}
              className={`flex items-center gap-3.5 border-t border-border px-[18px] py-3.5 transition-colors hover:bg-muted ${focusRing} ${
                a.estado === 'riesgo' ? 'bg-[color:var(--warning-surface)]/40' : ''
              }`}
            >
              <span className="flex min-w-0 flex-[1.6] items-center gap-2.5">
                <Avatar ini={a.ini} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold leading-snug">{a.nombre}</span>
                  <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                    {a.casosAprobados} de {a.casosTotal} casos aprobados
                  </span>
                </span>
              </span>

              <span className="w-[132px] shrink-0">
                <Barra pct={a.casosTotal ? Math.round((a.casosAprobados / a.casosTotal) * 100) : 0} />
              </span>

              <span className="w-[74px] shrink-0 text-center">
                {a.competencia === null ? (
                  <span className={`${mono} text-[11px] text-muted-foreground`}>—</span>
                ) : (
                  <span
                    className={`${mono} inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-bold ${
                      a.competencia >= 70
                        ? 'bg-accent text-accent-foreground'
                        : a.competencia >= 55
                          ? `bg-muted ${softText}`
                          : 'bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                    }`}
                  >
                    {a.competencia}
                  </span>
                )}
              </span>

              <span className="w-[210px] shrink-0">
                <span className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO[a.estado].clase}`}>
                  {a.estado === 'riesgo' && <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />}
                  {ESTADO[a.estado].etiqueta}
                </span>
                {a.senal && (
                  <span className="mt-1 block text-[10.5px] text-[color:var(--warning-foreground)]">{a.senal}</span>
                )}
              </span>

              <span
                className={`${mono} w-[128px] shrink-0 whitespace-nowrap text-[11px] ${
                  a.sinActividad ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'
                }`}
              >
                {a.ultimaActividad}
              </span>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
