import type { CanalNotificacion } from '@campus/shared';

/** Mensaje de correo a enviar por un adaptador (Resend/Mock/…). */
export interface CorreoMensaje {
  /** Destinatario. */
  to: string;
  asunto: string;
  /** Cuerpo en texto plano (fallback). */
  texto: string;
  /** Cuerpo HTML (plantilla transaccional); opcional. */
  html?: string;
}

/**
 * Adaptador de correo INTERCAMBIABLE (§3, mismo patrón modelo-agnóstico que Eco/TTS):
 * el proveedor (Resend hoy) es una pieza reemplazable por config, no cableada. El
 * `nombre` identifica al proveedor activo en los logs.
 */
export interface CorreoAdaptador {
  readonly nombre: string;
  enviar(mensaje: CorreoMensaje): Promise<{ id: string }>;
}

/** Adaptador de WhatsApp (avisos clave · §8). Hoy stub; infra real por confirmar (§9). */
export interface WhatsAppAdaptador {
  readonly nombre: string;
  enviar(destinatario: string, texto: string): Promise<{ id: string }>;
}

/** Resultado de despachar una notificación: por qué canales se entregó. */
export interface ResultadoDespacho {
  /** Id de la fila in-app creada (si el canal in_app estaba activo). */
  notificacionId?: string;
  /** Canales por los que EFECTIVAMENTE se envió. */
  canales: CanalNotificacion[];
}
