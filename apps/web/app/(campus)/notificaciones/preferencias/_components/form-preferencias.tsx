'use client';

/**
 * Preferencias de notificación del alumno (§8 job #12 · Sprint 8.5). Por cada tipo de
 * aviso, elige por qué canales recibirlo (in-app / correo / WhatsApp). El valor inicial
 * = override guardado ?? matriz de DEFECTOS del contrato compartido. Guarda con un server
 * action bajo RLS (Regla de Oro §2). El campus refleja el cambio en el próximo despacho.
 */
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronLeft, Check } from 'lucide-react';
import {
  CANALES_NOTIFICACION,
  DEFECTOS_NOTIFICACION,
  TIPOS_NOTIFICACION,
  type CanalNotificacion,
  type PreferenciasNotificacion,
  type TipoNotificacion,
} from '@campus/shared';
import { card, kicker, focusRing } from '@/components/tokens';
import { guardarPreferencias } from '@/lib/campus/notificaciones-acciones';

const TIPO_LABEL: Record<TipoNotificacion, string> = {
  caso_validado: 'Caso aprobado',
  caso_rechazado: 'Caso con ajustes',
  hito_alcanzado: 'Hito de práctica',
  certificado_emitido: 'Certificado emitido',
  badge_otorgado: 'Insignia otorgada',
  repaso_sugerido: 'Repaso sugerido',
  nueva_consulta: 'Nueva consulta',
  respuesta_consulta: 'Respuesta a tu consulta',
  entrega_calificada: 'Entrega calificada',
  anuncio: 'Anuncios',
};

const CANAL_LABEL: Record<CanalNotificacion, string> = {
  in_app: 'App',
  correo: 'Correo',
  whatsapp: 'WhatsApp',
};

/** Construye el estado inicial explícito: override guardado ?? default. */
function estadoInicial(
  guardadas: PreferenciasNotificacion,
): Record<TipoNotificacion, Record<CanalNotificacion, boolean>> {
  const estado = {} as Record<
    TipoNotificacion,
    Record<CanalNotificacion, boolean>
  >;
  for (const tipo of TIPOS_NOTIFICACION) {
    estado[tipo] = { ...DEFECTOS_NOTIFICACION[tipo] };
    const over = guardadas[tipo];
    if (over) {
      for (const canal of CANALES_NOTIFICACION) {
        if (over[canal] !== undefined) estado[tipo][canal] = over[canal]!;
      }
    }
  }
  return estado;
}

export function FormPreferencias({
  guardadas,
}: {
  guardadas: PreferenciasNotificacion;
}) {
  const [estado, setEstado] = useState(() => estadoInicial(guardadas));
  const [pendiente, startTransition] = useTransition();
  const [guardado, setGuardado] = useState(false);

  const toggle = (tipo: TipoNotificacion, canal: CanalNotificacion) => {
    setGuardado(false);
    setEstado((prev) => ({
      ...prev,
      [tipo]: { ...prev[tipo], [canal]: !prev[tipo][canal] },
    }));
  };

  const guardar = () => {
    startTransition(async () => {
      const res = await guardarPreferencias(estado as PreferenciasNotificacion);
      if (res.ok) setGuardado(true);
    });
  };

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-8 sm:px-6">
      <Link
        href="/notificaciones"
        className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-secondary hover:text-sidebar ${focusRing}`}
      >
        <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
        Volver a notificaciones
      </Link>

      <p className={`${kicker} mt-4 text-muted-foreground`}>Preferencias</p>
      <h1 className="mt-1 text-[22px] font-bold leading-tight">Cómo quieres que te avisemos</h1>
      <p className="mt-1 max-w-[54ch] text-[13px] text-muted-foreground">
        Elige por qué canales recibir cada tipo de aviso. La app siempre conserva el
        historial en tu campana.
      </p>

      <div className={`${card} mt-6 overflow-hidden`}>
        <div className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-3 sm:px-5">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Tipo de aviso
          </span>
          <div className="flex gap-2">
            {CANALES_NOTIFICACION.map((canal) => (
              <span
                key={canal}
                className="w-[64px] text-center text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground sm:w-[76px]"
              >
                {CANAL_LABEL[canal]}
              </span>
            ))}
          </div>
        </div>

        <ul>
          {TIPOS_NOTIFICACION.map((tipo) => (
            <li
              key={tipo}
              className="grid grid-cols-[1fr_auto] items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 sm:px-5"
            >
              <span className="text-[13.5px] font-semibold">{TIPO_LABEL[tipo]}</span>
              <div className="flex gap-2">
                {CANALES_NOTIFICACION.map((canal) => {
                  const on = estado[tipo][canal];
                  return (
                    <div key={canal} className="grid w-[64px] place-items-center sm:w-[76px]">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`${CANAL_LABEL[canal]} · ${TIPO_LABEL[tipo]}`}
                        onClick={() => toggle(tipo, canal)}
                        className={`grid h-7 w-7 place-items-center rounded-[8px] border transition-colors ${focusRing} ${
                          on
                            ? 'border-primary bg-primary text-[color:var(--sidebar)]'
                            : 'border-border bg-card text-transparent hover:border-secondary'
                        }`}
                      >
                        <Check className="h-[15px] w-[15px]" strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          disabled={pendiente}
          onClick={guardar}
          className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-opacity hover:opacity-90 disabled:opacity-50 ${focusRing}`}
        >
          {pendiente ? 'Guardando…' : 'Guardar preferencias'}
        </button>
        {guardado && (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-secondary">
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Guardado
          </span>
        )}
      </div>
    </div>
  );
}
