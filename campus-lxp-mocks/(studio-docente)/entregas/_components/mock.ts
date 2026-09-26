/** Datos de ejemplo. En producción, todo llega de la BD por props. */

import type { Actividad, EntregasData } from "./tipos";

const RESPUESTA = [
  "La paciente presenta dilatación del sistema pielocalicial derecho. Los cálices se ven redondeados y comunican entre sí, lo que descarta quistes. Por la forma de los cálices y porque el seno renal está ocupado, lo clasifico como grado III.",
  "Para cerrar el grado mediría el espesor de la cortical, porque si está adelgazada el cuadro ya es crónico. También revisaría el jet ureteral del lado afectado para saber si hay obstrucción.",
  "No medí la cortical en este estudio porque la ventana no me lo permitió, pero por la imagen se ve delgada. Tampoco valoré el riñón contralateral.",
];

export const MOCK: EntregasData = {
  grupo: "Grupo B · Nov 2026",
  grupos: ["Grupo B · Nov 2026", "Grupo A · Sep 2026", "Grupo POCUS · Oct 2026"],
  actividades: [],
  actividad: {
    id: "a1",
    clave: "M04 · L3",
    titulo: "Gradación de hidronefrosis",
    tipo: "abierta",
    consigna:
      "Explique cómo graduaría la hidronefrosis del caso y qué mediría antes de cerrar el grado.",
  },
  resumen: {
    entregadas: 24,
    delGrupo: 28,
    autoCalificadas: 14,
    porConfirmar: 6,
    promedio: 8.4,
    sinEntregar: 4,
    vencio: "venció ayer",
  },
  altaConfianza: 2,
  entregas: [
    {
      id: "e1",
      alumno: { id: "u1", ini: "KM", nombre: "Dra. Karla Méndez" },
      tipo: "abierta",
      estado: "sugerida",
      entregadaHace: "hace 4 h",
      nota: 9.2,
      detalleCorto: "confianza alta",
    },
    {
      id: "e2",
      alumno: { id: "u2", ini: "LA", nombre: "Dr. Luis Arreola" },
      tipo: "abierta",
      estado: "sugerida",
      entregadaHace: "hace 6 h",
      nota: 8.6,
      detalleCorto: "confianza alta",
    },
    {
      id: "e3",
      alumno: { id: "u3", ini: "IT", nombre: "Dr. Iván Torres" },
      tipo: "abierta",
      estado: "sugerida",
      entregadaHace: "hace 1 día",
      nota: 7.5,
      detalleCorto: "confianza media · revísela",
      respuesta: RESPUESTA,
      rubrica: [
        { id: "c1", texto: "Identifica el grado correcto", peso: 30, nivelAlcanzado: "Acertó: grado III, con el argumento de cálices comunicantes", puntaje: 0.95 },
        { id: "c2", texto: "Justifica con hallazgos de imagen", peso: 30, nivelAlcanzado: "Parcial: describe el seno ocupado, pero no aporta la medida", puntaje: 0.7 },
        { id: "c3", texto: "Menciona la medición de cortical", peso: 25, nivelAlcanzado: "Parcial: la menciona como plan, no la ejecuta", puntaje: 0.6 },
        { id: "c4", texto: "Valora el riñón contralateral", peso: 15, nivelAlcanzado: "No lo hizo", puntaje: 0.2 },
      ],
      ia: {
        notaSugerida: 7.5,
        confianza: "media",
        sustento: [
          { clase: "ok", texto: "Grado correcto y bien argumentado (criterio 1, 30%)" },
          { clase: "ok", texto: "Reconoce que la cortical define la cronicidad (criterio 3)" },
          { clase: "falta", texto: "No ejecuta la medición que él mismo propone" },
          { clase: "falta", texto: "Omite el riñón contralateral (criterio 4, 15%)" },
        ],
        comentario:
          "Doctor: la gradación es correcta y su razonamiento sobre los cálices comunicantes es el adecuado. Le falta ejecutar lo que usted mismo plantea — mida la cortical en ambos polos aunque la ventana sea difícil, y valore el riñón contralateral: sin eso no puede afirmar cronicidad. Buen análisis, incompleto en la ejecución.",
      },
    },
    {
      id: "e4",
      alumno: { id: "u4", ini: "HC", nombre: "Dr. Hugo Cuevas" },
      tipo: "abierta",
      estado: "requiere-lectura",
      entregadaHace: "hace 1 día",
      nota: null,
      detalleCorto: "Eco no pudo juzgarla: respuesta fuera de la rúbrica",
    },
    {
      id: "e5",
      alumno: { id: "u5", ini: "RS", nombre: "Dra. Renata Salas" },
      tipo: "autoevaluacion",
      estado: "auto",
      entregadaHace: "hace 2 días",
      nota: 10,
      detalleCorto: "10 de 10 aciertos",
    },
    {
      id: "e6",
      alumno: { id: "u6", ini: "MP", nombre: "Dra. Mariana Peña" },
      tipo: "autoevaluacion",
      estado: "auto",
      entregadaHace: "hace 2 días",
      nota: 8,
      detalleCorto: "8 de 10 aciertos",
    },
    {
      id: "e7",
      alumno: { id: "u7", ini: "JG", nombre: "Dr. Jorge Guzmán" },
      tipo: "autoevaluacion",
      estado: "auto",
      entregadaHace: "hace 3 días",
      nota: 7,
      detalleCorto: "7 de 10 aciertos",
    },
  ],
  sinEntregar: [
    { id: "u8", ini: "FI", nombre: "Dr. F. Ibarra" },
    { id: "u9", ini: "PN", nombre: "Dra. P. Navarro" },
    { id: "u10", ini: "SB", nombre: "Dr. S. Beltrán" },
    { id: "u11", ini: "LO", nombre: "Dra. L. Ortega" },
  ],
  asistente: {
    sugerencias: [
      "Resume las entregas del Grupo B",
      "¿Quién está batallando?",
      "Redacta feedback para los de nota baja",
      "¿Qué tema conviene repasar?",
    ],
    conversacion: [
      { id: "m1", de: "docente", texto: "¿Quién está batallando?" },
      {
        id: "m2",
        de: "ia",
        texto: "Tres alumnos del Grupo B, y los tres por lo mismo: no miden la cortical.",
        alumnos: [
          { ini: "HC", nombre: "Dr. Hugo Cuevas", porque: "2 tareas por debajo de 7 · falló las preguntas 4 y 7", chip: "Fuera de rúbrica" },
          { ini: "JG", nombre: "Dr. Jorge Guzmán", porque: "autoevaluación 7.0 · entrega tarde 3 de 4 veces", chip: "Se atrasa" },
          { ini: "IT", nombre: "Dr. Iván Torres", porque: "entiende el grado, no ejecuta la medición", chip: "Ejecución" },
        ],
        acciones: [{ etiqueta: "Redactar feedback a los 3", primaria: true }, { etiqueta: "Abrir sus entregas" }],
      },
      { id: "m3", de: "docente", texto: "Redacta feedback para los de nota baja" },
      {
        id: "m4",
        de: "ia",
        texto: "Tres borradores, cada uno apuntando a lo que le faltó a ese alumno. Empiezo con Cuevas:",
        borrador:
          "Doctor: confunde el quiste parapiélico con un cáliz dilatado, y de ahí se desordena todo el análisis. La prueba está en si comunica o no con el resto del sistema. Repase la lección 3 y vuelva a enviarme la tarea; el resto de su razonamiento está bien encaminado.",
        acciones: [{ etiqueta: "Usar los 3", primaria: true }, { etiqueta: "Ver los otros dos" }],
      },
    ],
  },
};

/** actividad de autoevaluación, para la vista de auditoría */
export const MOCK_AUTOEVALUACION: Actividad = {
  id: "a2",
  clave: "M04 · L3",
  titulo: "Autoevaluación de la lección",
  tipo: "autoevaluacion",
  contestada: "14 de 28 la han contestado",
  estadisticas: { promedio: 8.1, mediana: 8, masBaja: 6, masAlta: 10 },
  preguntas: [
    { n: "01", texto: "Grados de hidronefrosis: ¿cuál deforma los cálices?", aciertoPct: 93, aciertos: "13 de 14" },
    { n: "02", texto: "Plano de corte para valorar el seno renal", aciertoPct: 86, aciertos: "12 de 14" },
    { n: "03", texto: "Qué descarta que los cálices comuniquen entre sí", aciertoPct: 79, aciertos: "11 de 14" },
    { n: "04", texto: "Espesor de cortical que ya indica cronicidad", aciertoPct: 43, aciertos: "6 de 14" },
    { n: "05", texto: "Cuándo aporta el Doppler en obstrucción", aciertoPct: 71, aciertos: "10 de 14" },
    { n: "06", texto: "Significado del jet ureteral ausente", aciertoPct: 86, aciertos: "12 de 14" },
    { n: "07", texto: "Dónde se mide la cortical en el riñón", aciertoPct: 50, aciertos: "7 de 14" },
  ],
};

