/**
 * Taxonomía de notificaciones de /ajustes (§4.2). El usuario ve 6 CATEGORÍAS; cada una
 * expande a los `TipoNotificacion` reales del motor (mig 0020 · `preferencias_notificaciones`).
 * `contraer` deriva los toggles de la categoría desde las preferencias guardadas (override ??
 * DEFECTOS); `expandir` vuelca los toggles a las preferencias por tipo que consume
 * `canalesParaTipo`. In-app NO se toca aquí (siempre on por contrato). Puro (client+server).
 */
import {
  DEFECTOS_NOTIFICACION,
  type PreferenciasNotificacion,
  type TipoNotificacion,
} from '@campus/shared';

export type CategoriaNotif =
  | 'misCasos'
  | 'consultas'
  | 'entregas'
  | 'logros'
  | 'aprendizaje'
  | 'anuncios';

export type CanalOptIn = 'correo' | 'whatsapp';
export const CANALES_OPTIN: CanalOptIn[] = ['correo', 'whatsapp'];

/** Toggles por categoría (los dos canales opt-in; in-app siempre on). */
export type NotifToggles = Record<CategoriaNotif, Record<CanalOptIn, boolean>>;

/** Definición de las categorías visibles y su expansión a tipos del motor. */
export const CATEGORIAS_NOTIF: {
  id: CategoriaNotif;
  titulo: string;
  detalle: string;
  tipos: TipoNotificacion[];
}[] = [
  { id: 'misCasos', titulo: 'Mis casos', detalle: 'Cuando su docente valida o rechaza un caso.', tipos: ['caso_validado', 'caso_rechazado'] },
  { id: 'consultas', titulo: 'Consultas', detalle: 'Nuevas consultas y respuestas del docente.', tipos: ['nueva_consulta', 'respuesta_consulta'] },
  { id: 'entregas', titulo: 'Entregas y evaluación', detalle: 'Cuando califican una tarea o entrega.', tipos: ['entrega_calificada'] },
  { id: 'logros', titulo: 'Logros', detalle: 'Hitos de horas, certificados e insignias.', tipos: ['hito_alcanzado', 'certificado_emitido', 'badge_otorgado'] },
  { id: 'aprendizaje', titulo: 'Aprendizaje', detalle: 'Repaso sugerido cuando una competencia decae.', tipos: ['repaso_sugerido'] },
  { id: 'anuncios', titulo: 'Anuncios', detalle: 'Anuncios de la escuela.', tipos: ['anuncio'] },
];

/** Valor EFECTIVO de un canal para un tipo: override del usuario o el defecto del contrato. */
function efectivo(prefs: PreferenciasNotificacion, tipo: TipoNotificacion, canal: CanalOptIn): boolean {
  const ov = prefs[tipo]?.[canal];
  return ov === undefined ? DEFECTOS_NOTIFICACION[tipo][canal] : ov;
}

/**
 * Deriva los toggles por categoría desde las preferencias del motor. Como al guardar
 * mantenemos todos los tipos de una categoría en sincronía, el tipo representativo (el
 * primero) refleja el estado de la categoría.
 */
export function contraer(prefs: PreferenciasNotificacion): NotifToggles {
  const out = {} as NotifToggles;
  for (const cat of CATEGORIAS_NOTIF) {
    const rep = cat.tipos[0]!;
    out[cat.id] = { correo: efectivo(prefs, rep, 'correo'), whatsapp: efectivo(prefs, rep, 'whatsapp') };
  }
  return out;
}

/**
 * Vuelca los toggles a preferencias por TIPO (lo que consume `canalesParaTipo`). Cada tipo de
 * la categoría recibe el mismo par correo/whatsapp; in-app se omite (cae en su defecto = on).
 */
export function expandir(toggles: NotifToggles): PreferenciasNotificacion {
  const out: PreferenciasNotificacion = {};
  for (const cat of CATEGORIAS_NOTIF) {
    const t = toggles[cat.id];
    for (const tipo of cat.tipos) {
      out[tipo] = { correo: t.correo, whatsapp: t.whatsapp };
    }
  }
  return out;
}
