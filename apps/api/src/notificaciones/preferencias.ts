import {
  CANALES_NOTIFICACION,
  DEFECTOS_NOTIFICACION,
  type CanalNotificacion,
  type PreferenciasNotificacion,
  type TipoNotificacion,
} from '@campus/shared';

/**
 * Lógica PURA de selección de canal (§8): dado el tipo del evento y las preferencias
 * del usuario, ¿por qué canales se despacha? El usuario sobre-escribe la matriz de
 * DEFECTOS por (tipo, canal); lo ausente cae en el default. Sin efectos ni BD — así
 * es trivial de testear (§5).
 */
export function canalesParaTipo(
  prefs: PreferenciasNotificacion | null | undefined,
  tipo: TipoNotificacion,
): CanalNotificacion[] {
  const defaults = DEFECTOS_NOTIFICACION[tipo];
  const overrides = prefs?.[tipo] ?? {};
  return CANALES_NOTIFICACION.filter((canal) => {
    const override = overrides[canal];
    return override === undefined ? defaults[canal] : override;
  });
}
