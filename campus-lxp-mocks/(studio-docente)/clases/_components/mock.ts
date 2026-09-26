/** Mock general de Clases. En producción, todo llega de la BD por props. */

import type { ClasesData } from "./tipos";

export const MOCK: ClasesData = {
  totalGrabaciones: 18,
  gruposFiltro: ["Todas", "Grupo B", "Grupo A", "POCUS"],
  clases: [
    {
      id: "cl1",
      tipo: "zoom",
      tema: "Hidronefrosis: casos difíciles del módulo 4",
      grupo: "Grupo B · Nov 2026",
      alumnos: 28,
      dia: "hoy",
      hora: "19:00",
      duracion: "90 min",
      leccion: "M04 · L3",
      hoy: true,
      empiezaEn: "2 h 40 min",
      materialAdjunto: 2,
    },
    { id: "cl2", tipo: "zoom", tema: "Doppler renal: cuándo sí aporta", grupo: "Grupo A · Sep 2026", alumnos: 24, dia: "jue 18 sep", hora: "19:00", duracion: "90 min", leccion: "M08 · L1" },
    { id: "cl3", tipo: "mico", tema: "Barrido renal en vivo con el equipo", grupo: "Grupo POCUS · Oct 2026", alumnos: 16, dia: "vie 19 sep", hora: "18:30", duracion: "60 min", leccion: "M02 · L4" },
    { id: "cl4", tipo: "zoom", tema: "Informe estructurado: cómo dictarlo", grupo: "Grupo B · Nov 2026", alumnos: 28, dia: "lun 22 sep", hora: "19:00", duracion: "75 min", leccion: "M04 · L6" },
    { id: "cl5", tipo: "mico", tema: "Doppler color paso a paso (manos a la sonda)", grupo: "Grupo A · Sep 2026", alumnos: 24, dia: "mié 24 sep", hora: "20:00", duracion: "90 min", leccion: "M08 · L3" },
    { id: "cl6", tipo: "zoom", tema: "Ateneo de urgencias: casos de guardia", grupo: "Grupo POCUS · Oct 2026", alumnos: 16, dia: "jue 25 sep", hora: "19:00", duracion: "60 min" },
  ],
  grabaciones: [
    { id: "g1", tipo: "zoom", tema: "Gradación de hidronefrosis I a IV", grupo: "Grupo B · Nov 2026", fecha: "11 sep", duracion: "1:24:10", asistieron: 26, total: 28, ligada: true },
    { id: "g2", tipo: "mico", tema: "Barrido hepático con el equipo", grupo: "Grupo A · Sep 2026", fecha: "9 sep", duracion: "58:32", asistieron: 21, total: 24, ligada: true },
    { id: "g3", tipo: "zoom", tema: "Vía biliar: signos que no se pierden", grupo: "Grupo B · Nov 2026", fecha: "4 sep", duracion: "1:12:45", asistieron: 24, total: 28, ligada: true },
    { id: "g4", tipo: "zoom", tema: "Introducción al Doppler color", grupo: "Grupo A · Sep 2026", fecha: "2 sep", duracion: "1:31:02", asistieron: 19, total: 24, ligada: false },
  ],
  resumenMes: [
    { titulo: "Clases dadas", valor: "7", detalle: "de 9 programadas" },
    { titulo: "Horas en vivo", valor: "9.5 h", detalle: "4 en MiCo+" },
    { titulo: "Asistencia media", valor: "88%", detalle: "sube 4 pts vs agosto" },
    { titulo: "Grabaciones ligadas", valor: "17 de 18", detalle: "1 pendiente" },
  ],
  eco: {
    respuesta: {
      pregunta: "¿Qué temas cubrí este mes con el Grupo B?",
      intro: "Tres sesiones, todas del módulo 4:",
      temas: [
        { fecha: "11 sep", tema: "Gradación I a IV", asistencia: "26/28" },
        { fecha: "4 sep", tema: "Vía biliar", asistencia: "24/28" },
        { fecha: "28 ago", tema: "Anatomía renal", asistencia: "27/28" },
      ],
      remate: "No ha tocado Doppler renal con este grupo, y la lección 5 ya está abierta.",
      acciones: [{ etiqueta: "Programar esa clase", primaria: true }, { etiqueta: "Copiar el resumen" }],
    },
    sugerencias: [
      "Prepárame un resumen de la última clase",
      "¿Quién ha faltado más?",
      "Sugiéreme el tema del jueves",
    ],
  },
};
