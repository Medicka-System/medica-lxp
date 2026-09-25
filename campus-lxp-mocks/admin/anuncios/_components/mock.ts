/** Mock general de Anuncios. En producción, todo llega de la BD por props. */

import type { AnunciosData } from "./tipos";

export const MOCK: AnunciosData = {
  rol: "superadmin",
  conteos: { publicado: 3, programado: 2, borrador: 1, vencido: 8 },
  resumen: "14 anuncios · 86% de la comunidad vio el último urgente",
  anuncios: [
    { id: "a1", titulo: "Sesión de mañana movida a las 20:00", prioridad: "urgente", estado: "publicado", alcance: { tipo: "comunidad", etiqueta: "Toda la comunidad", personas: "1 284 personas" }, canales: ["app", "correo", "whatsapp"], publicacion: "hoy 09:12", vigencia: "vence hoy 23:59", vistas: "1 108", pctVisto: "86%" },
    { id: "a2", titulo: "Nuevo módulo de Doppler renal disponible", prioridad: "importante", estado: "publicado", alcance: { tipo: "generacion", etiqueta: "Generación 1000 h", personas: "412 alumnos" }, canales: ["app", "correo"], publicacion: "14 sep", vigencia: "vence el 30 sep", vistas: "386", pctVisto: "94%" },
    { id: "a3", titulo: "Cambio de sede para las prácticas de octubre", prioridad: "normal", estado: "publicado", alcance: { tipo: "programa", etiqueta: "Programa POCUS", personas: "96 alumnos" }, canales: ["app", "correo"], publicacion: "12 sep", vigencia: "vence el 5 oct", vistas: "71", pctVisto: "74%" },
    { id: "a4", titulo: "Cierre de inscripciones de la generación de enero", prioridad: "importante", estado: "programado", alcance: { tipo: "comunidad", etiqueta: "Toda la comunidad", personas: "1 284 personas" }, canales: ["app", "correo", "whatsapp"], publicacion: "sale el 20 sep 08:00", vigencia: "vence el 15 oct", vistas: "—", pctVisto: "—" },
    { id: "a5", titulo: "Mantenimiento del campus el domingo", prioridad: "normal", estado: "programado", alcance: { tipo: "comunidad", etiqueta: "Toda la comunidad", personas: "1 284 personas" }, canales: ["app"], publicacion: "sale el 21 sep 18:00", vigencia: "vence el 22 sep", vistas: "—", pctVisto: "—" },
    { id: "a6", titulo: "Convocatoria al Ateneo de casos difíciles", prioridad: "normal", estado: "borrador", alcance: { tipo: "alumnos", etiqueta: "Solo alumnos", personas: "sin definir" }, canales: ["app"], publicacion: "sin fecha", vigencia: "sin caducidad", vistas: "—", pctVisto: "—" },
    { id: "a7", titulo: "Bienvenida a la generación de septiembre", prioridad: "normal", estado: "vencido", alcance: { tipo: "generacion", etiqueta: "Generación sep 2026", personas: "186 alumnos" }, canales: ["app", "correo"], publicacion: "1 sep", vigencia: "venció el 10 sep", vistas: "178", pctVisto: "96%" },
  ],
};
