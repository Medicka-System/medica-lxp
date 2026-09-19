import type { NotificacionJob, TipoNotificacion } from '@campus/shared';

/** Contenido resuelto de una notificación: título + cuerpo (texto plano). */
export interface ContenidoNotificacion {
  titulo: string;
  cuerpo: string;
}

type Datos = Record<string, unknown>;

const texto = (d: Datos, clave: string, fallback = ''): string => {
  const v = d[clave];
  return typeof v === 'string' || typeof v === 'number' ? String(v) : fallback;
};

/**
 * Plantillas transaccionales por tipo (§8 "plantillas: validación lista, repaso,
 * certificado, anuncio, nueva consulta"). PURO: sin BD ni PII de paciente (§10) —
 * solo los `datos` que el evento adjunta (folio, dominio, asunto…).
 */
const PLANTILLAS: Record<
  TipoNotificacion,
  (d: Datos) => ContenidoNotificacion
> = {
  caso_validado: (d) => ({
    titulo: 'Tu caso fue aprobado',
    cuerpo: `El docente aprobó tu caso${d.organo ? ` de ${texto(d, 'organo')}` : ''}. Suma a tu competencia y bitácora.`,
  }),
  caso_rechazado: (d) => ({
    titulo: 'Tu caso necesita ajustes',
    cuerpo: `El docente revisó tu caso y dejó feedback${d.feedback ? `: “${texto(d, 'feedback')}”` : '.'} Revísalo en tu bitácora.`,
  }),
  hito_alcanzado: (d) => ({
    titulo: '¡Alcanzaste un nuevo hito!',
    cuerpo: `Llegaste a ${texto(d, 'horas_umbral', 'un nuevo')} horas de práctica. Sigue así.`,
  }),
  certificado_emitido: (d) => ({
    titulo: 'Tu certificado está listo',
    cuerpo: `Emitimos tu ${texto(d, 'titulo', 'certificado')}${d.folio ? ` (folio ${texto(d, 'folio')})` : ''}. Descárgalo desde Certificados.`,
  }),
  badge_otorgado: (d) => ({
    titulo: 'Ganaste una insignia',
    cuerpo: `Obtuviste la insignia ${texto(d, 'badge', '')}. Míralas en tu perfil.`,
  }),
  repaso_sugerido: (d) => ({
    titulo: 'Es momento de repasar',
    cuerpo: `Detectamos decaimiento en ${texto(d, 'dominio', 'un dominio')}. Te agendamos un repaso para mantener tu competencia.`,
  }),
  nueva_consulta: (d) => ({
    titulo: 'Nueva consulta de un alumno',
    cuerpo: `Un alumno abrió la consulta “${texto(d, 'asunto', 'sin asunto')}”. Respóndela desde el Studio.`,
  }),
  respuesta_consulta: (d) => ({
    titulo: 'Respondieron tu consulta',
    cuerpo: `Hay una nueva respuesta en “${texto(d, 'asunto', 'tu consulta')}”.`,
  }),
  entrega_calificada: (d) => ({
    titulo: 'Calificaron tu entrega',
    cuerpo: `El docente calificó tu entrega${d.nota !== undefined ? ` con ${texto(d, 'nota')}` : ''}. Revisa el feedback.`,
  }),
  anuncio: (d) => ({
    titulo: texto(d, 'titulo', 'Anuncio'),
    cuerpo: texto(d, 'cuerpo', ''),
  }),
};

/**
 * Resuelve el contenido de una notificación: usa `titulo`/`cuerpo` explícitos del job
 * si vienen (ej. anuncios ya redactados); si no, deriva de la plantilla del `tipo`.
 */
export function resolverContenido(job: NotificacionJob): ContenidoNotificacion {
  const plantilla = PLANTILLAS[job.tipo](job.datos ?? {});
  return {
    titulo: job.titulo?.trim() || plantilla.titulo,
    cuerpo: job.cuerpo?.trim() || plantilla.cuerpo,
  };
}

/** Envuelve el cuerpo en un HTML transaccional sobrio (marca del campus · §5A). */
export function correoHtml(contenido: ContenidoNotificacion): string {
  const { titulo, cuerpo } = contenido;
  return [
    '<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;color:#111827">',
    '<div style="background:#0f2d52;padding:20px 24px;border-radius:12px 12px 0 0">',
    '<span style="color:#fff;font-weight:700;font-size:16px">Campus Virtual · Médica Capacitación</span>',
    '</div>',
    '<div style="border:1px solid #E5E7EB;border-top:0;border-radius:0 0 12px 12px;padding:24px">',
    `<h1 style="font-size:20px;margin:0 0 12px">${escapar(titulo)}</h1>`,
    `<p style="font-size:14px;line-height:1.6;color:#374151;margin:0">${escapar(cuerpo)}</p>`,
    '</div></div>',
  ].join('');
}

function escapar(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
