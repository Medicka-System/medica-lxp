import type { ClasesData } from './tipos';

/**
 * Eco en Clases — PLACEHOLDER (§7A). Sin endpoint ni conexión: solo el espacio (violeta)
 * donde vivirá el asistente. Eco se conecta al final en TODAS las secciones; aquí no se
 * pre-analiza nada. El rail muestra esta conversación de ejemplo tal cual el mock.
 */
export const ECO_PLACEHOLDER: ClasesData['eco'] = {
  respuesta: {
    pregunta: '¿Qué temas cubrí este mes con el Grupo B?',
    intro: 'Tres sesiones, todas del módulo 4:',
    temas: [
      { fecha: '11 sep', tema: 'Gradación I a IV', asistencia: '26/28' },
      { fecha: '4 sep', tema: 'Vía biliar', asistencia: '24/28' },
      { fecha: '28 ago', tema: 'Anatomía renal', asistencia: '27/28' },
    ],
    remate: 'No ha tocado Doppler renal con este grupo, y la lección 5 ya está abierta.',
    acciones: [
      { etiqueta: 'Programar esa clase', primaria: true },
      { etiqueta: 'Copiar el resumen' },
    ],
  },
  sugerencias: [
    'Prepárame un resumen de la última clase',
    '¿Quién ha faltado más?',
    'Sugiéreme el tema del jueves',
  ],
};
