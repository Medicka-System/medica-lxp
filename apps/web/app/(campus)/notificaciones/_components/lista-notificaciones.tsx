'use client';

/**
 * Centro de notificaciones (§8 job #12 · Sprint 8.5) — lado del alumno. Lista el
 * historial (no leídas resaltadas), permite marcar una o todas como leídas y hace
 * deep-link a la entidad que originó el aviso. CRUD bajo RLS vía server actions
 * (Regla de Oro §2). Vive dentro del shell del Campus.
 */
import { useTransition } from 'react';
import Link from 'next/link';
import {
  Award,
  BellOff,
  CheckCheck,
  FileCheck2,
  FileX2,
  Medal,
  MessageSquare,
  Megaphone,
  RefreshCw,
  Settings,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import type { TipoNotificacion } from '@campus/shared';
import { card, kicker, focusRing } from '@/components/tokens';
import { EntradaLista } from '@/components/ui/entrada-lista';
import { haceCuanto } from '@/lib/format';
import type { NotificacionItem } from '@/lib/campus/notificaciones-datos';
import {
  marcarLeida,
  marcarTodasLeidas,
} from '@/lib/campus/notificaciones-acciones';

/** Ícono + tono por tipo (§5A: un solo color de atención; nada de rojo fuera de dinero). */
const META: Record<TipoNotificacion, { icono: LucideIcon; tono: string }> = {
  caso_validado: { icono: FileCheck2, tono: 'text-[color:var(--secondary)]' },
  caso_rechazado: { icono: FileX2, tono: 'text-[color:var(--warning-foreground)]' },
  hito_alcanzado: { icono: Trophy, tono: 'text-[color:var(--secondary)]' },
  certificado_emitido: { icono: Award, tono: 'text-[color:var(--secondary)]' },
  badge_otorgado: { icono: Medal, tono: 'text-[color:var(--secondary)]' },
  repaso_sugerido: { icono: RefreshCw, tono: 'text-[color:var(--warning-foreground)]' },
  nueva_consulta: { icono: MessageSquare, tono: 'text-[color:var(--info-foreground)]' },
  respuesta_consulta: { icono: MessageSquare, tono: 'text-[color:var(--info-foreground)]' },
  entrega_calificada: { icono: FileCheck2, tono: 'text-[color:var(--secondary)]' },
  anuncio: { icono: Megaphone, tono: 'text-[color:var(--info-foreground)]' },
};

/** Deep-link a la entidad que originó la notificación (null si no aplica). */
function hrefDe(n: NotificacionItem): string | null {
  switch (n.entidadTipo) {
    case 'caso':
      return '/bitacora';
    case 'certificado':
    case 'badge':
      return '/certificados';
    case 'dominio_iaim':
      return '/dominio';
    case 'consulta':
      return '/consultas';
    default:
      return null;
  }
}

export function ListaNotificaciones({
  notificaciones,
}: {
  notificaciones: NotificacionItem[];
}) {
  const [pendiente, startTransition] = useTransition();
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`${kicker} text-muted-foreground`}>Actividad</p>
          <h1 className="mt-1 text-[22px] font-bold leading-tight">Notificaciones</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {noLeidas > 0
              ? `Tienes ${noLeidas} sin leer.`
              : 'Estás al día.'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/ajustes#notificaciones"
            className={`inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent ${focusRing}`}
          >
            <Settings aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
            <span className="hidden sm:inline">Preferencias</span>
          </Link>
          <button
            type="button"
            disabled={pendiente || noLeidas === 0}
            onClick={() => startTransition(() => void marcarTodasLeidas())}
            className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-3 text-[13px] font-bold text-[color:var(--sidebar)] transition-opacity hover:opacity-90 disabled:opacity-40 ${focusRing}`}
          >
            <CheckCheck aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
            <span className="hidden sm:inline">Marcar todas</span>
          </button>
        </div>
      </div>

      {notificaciones.length === 0 ? (
        <div className={`${card} mt-6 grid place-items-center gap-3 px-6 py-16 text-center`}>
          <BellOff aria-hidden className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-[14px] font-semibold">Sin notificaciones todavía</p>
          <p className="max-w-[42ch] text-[13px] text-muted-foreground">
            Aquí verás avisos de tus casos validados, hitos, certificados, repasos y consultas.
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {/* Entrada escalonada del historial (§5A · EntradaLista). */}
          <EntradaLista>
          {notificaciones.map((n) => {
            const meta = META[n.tipo];
            const Icono = meta.icono;
            const href = hrefDe(n);
            const cuerpo = (
              <div
                className={`${card} flex items-start gap-3.5 px-4 py-3.5 transition-colors ${
                  n.leida ? '' : 'border-l-[3px] border-l-primary bg-accent/40'
                } ${href ? 'hover:bg-accent' : ''}`}
              >
                <span
                  aria-hidden
                  className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted ${meta.tono}`}
                >
                  <Icono className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`min-w-0 flex-1 truncate text-[14px] ${n.leida ? 'font-semibold' : 'font-bold'}`}>
                      {n.titulo}
                    </p>
                    {!n.leida && (
                      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">{n.cuerpo}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {haceCuanto(new Date(n.creadaEn))}
                  </p>
                </div>
                {!n.leida && (
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={(e) => {
                      e.preventDefault();
                      startTransition(() => void marcarLeida(n.id));
                    }}
                    aria-label="Marcar como leída"
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-secondary ${focusRing}`}
                  >
                    <CheckCheck className="h-[16px] w-[16px]" strokeWidth={2} />
                  </button>
                )}
              </div>
            );
            return (
              <li key={n.id}>
                {href ? (
                  <Link
                    href={href}
                    onClick={() => {
                      if (!n.leida) startTransition(() => void marcarLeida(n.id));
                    }}
                    className={`block ${focusRing} rounded-xl`}
                  >
                    {cuerpo}
                  </Link>
                ) : (
                  cuerpo
                )}
              </li>
            );
          })}
          </EntradaLista>
        </ul>
      )}
    </div>
  );
}
