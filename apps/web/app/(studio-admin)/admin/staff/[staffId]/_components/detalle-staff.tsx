'use client';

/**
 * Studio · Detalle de un miembro del staff. Su carga (grupos, cola, validaciones,
 * curaciones) es REAL vía RLS. El rol y los permisos se EDITAN en Configuración →
 * Usuarios y roles (frontera §5B): aquí solo se leen. Eco (carga del equipo) = placeholder.
 */
import Link from 'next/link';
import { AlertTriangle, ChevronLeft, ClipboardCheck, ExternalLink, Lock, ScanLine, Users } from 'lucide-react';
import { mono, kicker, softText, card, focusRing } from '@/components/tokens';
import { Avatar } from '@/components/avatar';
import { EcoMark } from '../../../../_components/eco-mark';
import { ChipRol } from '../../_components/rol-chip';
import type { DetalleStaff, CifraCarga } from '../../_components/contrato';

const ICONO: Record<CifraCarga['icono'], typeof Users> = {
  grupos: Users,
  cola: AlertTriangle,
  validaciones: ClipboardCheck,
  curados: ScanLine,
};

export function DetalleStaffVista({ d }: { d: DetalleStaff }) {
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-start gap-4">
        <Link
          href="/admin/staff"
          aria-label="Volver a Staff"
          className={`mt-1.5 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
        </Link>

        <Avatar ini={d.ini} size={52} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[21px] font-extrabold leading-tight tracking-[-0.02em]">{d.nombre}</h1>
            <ChipRol rol={d.rol} />
            {d.senal && (
              <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[10.5px] font-bold text-[color:var(--warning-foreground)]">
                <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                {d.senal}
              </span>
            )}
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            {d.email ?? 'sin correo'} · en la escuela desde <span className={mono}>{d.desde}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* carga y desempeño */}
          <section className={`${card} p-[18px]`}>
            <p className={`${kicker} text-muted-foreground`}>Carga y desempeño</p>
            <div className="mt-3.5 flex flex-wrap gap-2.5">
              {d.cifras.map((c) => {
                const Icono = ICONO[c.icono];
                return (
                  <div
                    key={c.etiqueta}
                    className={`min-w-[130px] flex-1 rounded-[11px] border p-3 ${
                      c.alerta ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]' : 'border-border bg-muted'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-[26px] w-[26px] place-items-center rounded-lg bg-card ${
                        c.alerta ? 'text-[color:var(--warning-foreground)]' : 'text-accent-foreground'
                      }`}
                    >
                      <Icono className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </span>
                    <p className={`${mono} mt-2.5 text-[19px] font-extrabold leading-none`}>{c.valor}</p>
                    <p className={`mt-1 text-[10.5px] leading-snug ${c.alerta ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'}`}>
                      {c.etiqueta}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* grupos que imparte (docente) */}
          {d.grupos.length > 0 && (
            <section className={`${card} p-[18px]`}>
              <p className={`${kicker} text-muted-foreground`}>Grupos que imparte</p>
              <ul className="mt-1.5">
                {d.grupos.map((g) => (
                  <li key={g.id} className="flex items-center gap-3.5 border-t border-border py-3">
                    <span className="min-w-0 flex-1 text-[12.5px] font-bold">{g.nombre}</span>
                    {g.cola > 0 ? (
                      <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                        <AlertTriangle aria-hidden className="h-3 w-3" strokeWidth={2} />
                        {g.cola} en cola
                      </span>
                    ) : (
                      <span className={`${mono} text-[11px] text-muted-foreground`}>sin cola</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* rail: rol/permisos (edita en Configuración) + Eco placeholder */}
        <div className="flex min-w-0 flex-col gap-3.5">
          <section className={`${card} overflow-hidden`}>
            <div className="flex items-center gap-2.5 border-b border-border bg-muted px-4 py-3.5">
              <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Rol y permisos</p>
              <span className="inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 text-[10px] font-bold text-muted-foreground">
                <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                Se edita en Configuración
              </span>
            </div>
            <div className="p-4">
              <dl className="flex flex-col gap-2.5">
                {d.permisos.map((p) => (
                  <div key={p.etiqueta} className="flex items-baseline gap-2.5">
                    <dt className="w-[110px] shrink-0 text-[11.5px] text-muted-foreground">{p.etiqueta}</dt>
                    <dd className="min-w-0 flex-1 text-right text-[12.5px] font-semibold">{p.valor}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                Para cambiar su rol o permisos se pasa a Configuración → Usuarios y roles; el cambio queda en auditoría (§9).
              </p>
              <button
                type="button"
                disabled
                title="Usuarios y roles — próximamente (Configuración)"
                className={`mt-2.5 inline-flex h-10 w-full cursor-not-allowed items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-muted-foreground ${focusRing}`}
              >
                <ExternalLink aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                Abrir Usuarios y roles
              </button>
            </div>
          </section>

          <section className={`${card} overflow-hidden border-[color:var(--info-border)]`}>
            <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-4 py-3.5">
              <EcoMark size={32} invertido />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold leading-tight">Eco</p>
                <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">Carga del equipo · placeholder</p>
              </div>
            </div>
            <div className="px-4 py-3.5">
              <p className={`text-[12.5px] leading-relaxed ${softText}`}>
                Con su API, Eco comparará la carga de este miembro contra el resto del equipo y sugerirá cómo repartir. Por ahora, las cifras de la izquierda son el dato duro.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
