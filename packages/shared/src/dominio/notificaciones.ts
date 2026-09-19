/**
 * Contrato del MOTOR DE NOTIFICACIONES (§8, job #12 · Sprint 8.5). Un evento
 * "para este usuario, de este tipo" se despacha por uno o más CANALES (in-app,
 * correo, WhatsApp) según la PREFERENCIA del usuario. Nombres y formas compartidos
 * entre el productor de eventos (`api`/`worker`), el motor (`api/src/notificaciones`)
 * y el front (campana + pantalla de preferencias), para no desincronizarse.
 *
 * Solo el CONTRATO vive aquí (tipos, canales, defaults). La lógica de selección de
 * canal y el envío viven en `apps/api/src/notificaciones` (testables · §5).
 */

/** Tipos de notificación del LXP. Cada uno mapea a un evento de dominio (§8). */
export const TIPOS_NOTIFICACION = [
  'caso_validado', // el docente aprobó un caso de la bitácora
  'caso_rechazado', // el docente rechazó un caso (con feedback)
  'hito_alcanzado', // 100/500/1000 h de práctica
  'certificado_emitido', // certificado generado al cumplir hito
  'badge_otorgado', // insignia otorgada (regla automática o manual)
  'repaso_sugerido', // decaimiento detectado → repaso espaciado
  'nueva_consulta', // el alumno abrió una consulta 1:1 (avisa al docente)
  'respuesta_consulta', // respuesta en una consulta (avisa a la otra parte)
  'entrega_calificada', // el docente calificó una tarea/entrega
  'anuncio', // anuncio segmentado (admin/docente)
] as const;

export type TipoNotificacion = (typeof TIPOS_NOTIFICACION)[number];

/** Canales de entrega. `in_app` siempre existe (la campana); el resto es opt-in. */
export const CANALES_NOTIFICACION = ['in_app', 'correo', 'whatsapp'] as const;
export type CanalNotificacion = (typeof CANALES_NOTIFICACION)[number];

/** Preferencia de un usuario: por cada tipo, qué canales quiere recibir. */
export type PreferenciasNotificacion = Partial<
  Record<TipoNotificacion, Partial<Record<CanalNotificacion, boolean>>>
>;

/**
 * Matriz de canales POR DEFECTO (cuando el usuario no configuró nada). in-app
 * siempre encendido; correo para lo relevante; WhatsApp solo para avisos clave
 * (§8 "WhatsApp: avisos clave"). El usuario puede sobre-escribir por tipo/canal.
 */
export const DEFECTOS_NOTIFICACION: Record<
  TipoNotificacion,
  Record<CanalNotificacion, boolean>
> = {
  caso_validado: { in_app: true, correo: true, whatsapp: false },
  caso_rechazado: { in_app: true, correo: true, whatsapp: false },
  hito_alcanzado: { in_app: true, correo: true, whatsapp: true },
  certificado_emitido: { in_app: true, correo: true, whatsapp: true },
  badge_otorgado: { in_app: true, correo: false, whatsapp: false },
  repaso_sugerido: { in_app: true, correo: true, whatsapp: false },
  nueva_consulta: { in_app: true, correo: true, whatsapp: false },
  respuesta_consulta: { in_app: true, correo: true, whatsapp: false },
  entrega_calificada: { in_app: true, correo: true, whatsapp: false },
  anuncio: { in_app: true, correo: true, whatsapp: false },
};
