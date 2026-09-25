/** Mock general de Grupos. En producción, todo llega de la BD por props. */

import type { GruposData } from "./tipos";

export const MOCK: GruposData = {
  grupos: [
    {
      id: "gb",
      nombre: "Grupo B · Nov 2026",
      programa: "Ultrasonografía Médica",
      modalidad: "En línea",
      alumnos: 28,
      avance: 48,
      enRiesgo: 4,
      estado: "requiere-atencion",
      moduloEnCurso: "M04 · Interpretación renal",
      inicio: "inició el 3 nov",
      resumenRiesgo: "2 sin actividad, 1 reprobando, 1 con casos rechazados",
    },
    {
      id: "ga",
      nombre: "Grupo A · Sep 2026",
      programa: "Ultrasonografía Médica",
      modalidad: "Mixta",
      alumnos: 24,
      avance: 72,
      enRiesgo: 0,
      estado: "al-dia",
      moduloEnCurso: "M07 · Obstétrico II",
      inicio: "inició el 8 sep",
      resumenRiesgo: "El grupo más atrasado va 2 lecciones detrás.",
    },
    {
      id: "gp",
      nombre: "Grupo POCUS · Oct 2026",
      programa: "POCUS en Urgencias",
      modalidad: "Presencial",
      alumnos: 16,
      avance: 34,
      enRiesgo: 2,
      estado: "con-rezago",
      moduloEnCurso: "M02 · Ventanas y artefactos",
      inicio: "inició el 20 oct",
      resumenRiesgo: "2 sin actividad en más de una semana",
    },
  ],
  detalle: {
    grupoId: "gb",
    conteos: { todos: 28, atencion: 4, sinActividad: 2, alDia: 24 },
    resumen: [
      { etiqueta: "Avance del grupo", valor: "48%", nota: "la mediana va en M04 · L2" },
      { etiqueta: "Requieren intervención", valor: "4", nota: "de 28 alumnos", atencion: true },
      { etiqueta: "Casos validados", valor: "38", nota: "11 en cola de validación" },
      { etiqueta: "Actividad esta semana", valor: "21", nota: "de 28 entraron al campus" },
    ],
    alumnos: [
      { id: "a1", ini: "HC", nombre: "Dr. Hugo Cuevas", moduloEnCurso: "M04 · L3", avance: 34, casosSubidos: 3, casosValidados: 1, entregas: "4 / 6", competencia: 58, ultimaActividad: "sin actividad hace 9 días", sinActividad: true, senal: { tipo: "sin-actividad", motivo: "Sin actividad · 2 casos rechazados" } },
      { id: "a2", ini: "PN", nombre: "Dra. P. Navarro", moduloEnCurso: "M03 · L5", avance: 28, casosSubidos: 2, casosValidados: 2, entregas: "3 / 6", competencia: 52, ultimaActividad: "sin actividad hace 12 días", sinActividad: true, senal: { tipo: "sin-actividad", motivo: "Sin actividad · va 2 módulos atrás" } },
      { id: "a3", ini: "JG", nombre: "Dr. Jorge Guzmán", moduloEnCurso: "M04 · L2", avance: 41, casosSubidos: 4, casosValidados: 3, entregas: "5 / 6", competencia: 61, ultimaActividad: "activo ayer", senal: { tipo: "reprobando", motivo: "Reprobó la autoevaluación 2 veces" } },
      { id: "a4", ini: "MP", nombre: "Dr. Mario Prado", moduloEnCurso: "M04 · L1", avance: 38, casosSubidos: 2, casosValidados: 0, entregas: "4 / 6", competencia: 55, ultimaActividad: "activo hace 3 días", senal: { tipo: "casos-rechazados", motivo: "2 casos rechazados seguidos" } },
      { id: "a5", ini: "IT", nombre: "Dr. Iván Torres", moduloEnCurso: "M04 · L3", avance: 52, casosSubidos: 6, casosValidados: 5, entregas: "6 / 6", competencia: 74, ultimaActividad: "activo hoy", senal: null },
      { id: "a6", ini: "KM", nombre: "Dra. Karla Méndez", moduloEnCurso: "M04 · L4", avance: 58, casosSubidos: 7, casosValidados: 7, entregas: "6 / 6", competencia: 81, ultimaActividad: "activo hoy", senal: null },
      { id: "a7", ini: "RS", nombre: "Dra. Renata Salas", moduloEnCurso: "M04 · L2", avance: 46, casosSubidos: 5, casosValidados: 4, entregas: "6 / 6", competencia: 69, ultimaActividad: "activo hoy", senal: null },
      { id: "a8", ini: "LA", nombre: "Dr. Luis Arreola", moduloEnCurso: "M04 · L1", avance: 44, casosSubidos: 4, casosValidados: 4, entregas: "5 / 6", competencia: 66, ultimaActividad: "activo hace 2 días", senal: null },
      { id: "a9", ini: "FS", nombre: "Dra. F. Solís", moduloEnCurso: "M03 · L6", avance: 40, casosSubidos: 4, casosValidados: 3, entregas: "5 / 6", competencia: 63, ultimaActividad: "activo hace 4 días", senal: null },
    ],
  },
  eco: {
    resumenGlobal:
      "el Grupo B es el que más necesita su atención —cuatro alumnos y todos atorados en el mismo tema, la medición de cortical.",
    sugerencias: ["Resúmeme el avance", "¿A quién contacto esta semana?", "Compáralo con el Grupo A"],
    conversacion: [
      { id: "e1", de: "docente", texto: "¿Quién está batallando en este grupo?" },
      {
        id: "e2",
        de: "eco",
        texto: "Cuatro, y no por la misma razón:",
        alumnos: [
          { ini: "HC", nombre: "Dr. Hugo Cuevas", motivo: "No entra desde hace 9 días y arrastra 2 casos rechazados" },
          { ini: "PN", nombre: "Dra. P. Navarro", motivo: "12 días sin actividad; va 2 módulos atrás del grupo" },
          { ini: "JG", nombre: "Dr. Jorge Guzmán", motivo: "Entra a diario pero reprobó la autoevaluación dos veces" },
          { ini: "MP", nombre: "Dr. Mario Prado", motivo: "Sube casos, se los rechazan: no ajusta la técnica" },
        ],
        destacado:
          "A Guzmán y Prado los alcanza con una consulta; a los dos que no entran, conviene llamarles.",
        acciones: [
          { etiqueta: "Mandarles consulta", primaria: true, icono: "consulta" },
          { etiqueta: "Ver sus bitácoras", icono: "bitacora" },
        ],
      },
      { id: "e3", de: "docente", texto: "¿Qué tema se les está dificultando?" },
      {
        id: "e4",
        de: "eco",
        texto: "Uno solo, y es el mismo en todas las señales: medición de cortical.",
        destacado:
          "Es la pregunta 4 de la autoevaluación (la falló el 62% del grupo), el motivo de 3 de los 5 casos rechazados y el tema de 5 consultas esta semana.",
        involucrados: ["HC", "JG", "MP", "PN", "+4"],
        acciones: [{ etiqueta: "Llevarlo a la clase del jueves", icono: "clase" }],
      },
    ],
  },
};
