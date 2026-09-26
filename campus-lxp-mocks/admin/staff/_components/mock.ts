/** Mock general de Staff. En producción, todo llega de la BD por props. */

import type { StaffData } from "./tipos";

export const MOCK: StaffData = {
  totales: { activo: "34", sobrecarga: "3", validados: "128", respuesta: "9 h" },
  detalleTotales: {
    activo: "18 docentes · 9 diseñadores · 6 admins · 1 súper admin",
    sobrecarga: "más de 8 casos en cola o respuesta arriba de 36 h",
    validados: "el 32% los validó una sola persona",
    respuesta: "de consulta del alumno a respuesta del docente",
  },
  conteos: { todos: 34, docentes: 18, disenadores: 9, admins: 7 },
  staff: [
    { id: "s1", ini: "AS", nombre: "Dr. Alejandro Sandoval", rol: "docente", activo: true, area: "Renal y abdomen", cargo: "3 grupos · 68 alumnos", actividad: "41 casos validados esta semana", senal: "sobrecarga: 9 casos en cola", ultimaSesion: "hoy 10:40" },
    { id: "s2", ini: "KL", nombre: "Dra. Karla Lugo", rol: "docente", activo: true, area: "Urgencias y POCUS", cargo: "2 grupos · 44 alumnos", actividad: "12 entregas calificadas", ultimaSesion: "hoy 09:12" },
    { id: "s3", ini: "MP", nombre: "Dra. Mariana Peña", rol: "docente", activo: true, area: "Obstétrico", cargo: "1 grupo · 24 alumnos", actividad: "6 casos validados", senal: "responde en 38 h", ultimaSesion: "ayer" },
    { id: "s4", ini: "HC", nombre: "Hugo Cuevas", rol: "disenador", activo: true, area: "Contenido y casos", cargo: "4 programas", actividad: "curó 4 casos a Biblioteca", ultimaSesion: "hace 5 h" },
    { id: "s5", ini: "MV", nombre: "Mariana Valdés", rol: "disenador", activo: true, area: "Diseño instruccional", cargo: "6 programas", actividad: "publicó la v4 de Ultrasonografía", ultimaSesion: "hace 2 h" },
    { id: "s6", ini: "SG", nombre: "Sandra Godoy", rol: "admin", activo: true, area: "Operación académica", cargo: "11 programas · 38 grupos", actividad: "abrió 3 grupos", ultimaSesion: "hoy 08:05" },
    { id: "s7", ini: "RV", nombre: "Rodrigo Vargas", rol: "super", activo: true, area: "Gobierno", cargo: "Toda la plataforma", actividad: "4 cambios de configuración", ultimaSesion: "hoy 12:40" },
    { id: "s8", ini: "JD", nombre: "Dr. Javier Duarte", rol: "docente", activo: false, area: "Doppler", cargo: "sin grupos asignados", actividad: "sin actividad desde julio", senal: "inactivo 2 meses", ultimaSesion: "hace 2 meses", ultimaAlerta: true },
  ],
  detalle: {
    id: "s1",
    ini: "AS",
    nombre: "Dr. Alejandro Sandoval",
    rol: "docente",
    activo: true,
    area: "Renal y abdomen",
    desde: "marzo de 2024",
    correo: "a.sandoval@medicacapacitacion.mx",
    telefono: "+52 33 1188 4420",
    senal: "Sobrecarga · 9 casos en cola",
    cifras: [
      { etiqueta: "grupos · 68 alumnos", valor: "3", icono: "grupos" },
      { etiqueta: "casos en cola · 3 con más de 72 h", valor: "9", icono: "casos", alerta: true },
      { etiqueta: "tiempo medio de respuesta", valor: "6 h", icono: "reloj" },
      { etiqueta: "consultas atendidas este mes", valor: "24", icono: "consultas" },
    ],
    aviso: {
      titulo: "Valida el 32% de los casos de la escuela.",
      detalle:
        "Tiene 9 en cola y es el único docente de renal; considere repartir el área o abrirle apoyo.",
    },
    grupos: [
      { nombre: "Grupo B · Nov 2026", alumnos: 28, avance: 48, cola: "4 casos en cola" },
      { nombre: "Grupo A · Sep 2026", alumnos: 24, avance: 72 },
      { nombre: "Grupo POCUS · Oct 2026", alumnos: 16, avance: 34, cola: "2 alumnos atrasados" },
    ],
    registro: [
      { titulo: "Casos validados", detalle: "41 esta semana · 186 en el mes", icono: "casos" },
      { titulo: "Casos en cola", detalle: "9 esperando · el más antiguo lleva 4 días", alerta: true, icono: "cola" },
      { titulo: "Entregas calificadas", detalle: "38 en el mes · 6 con nota corregida a Eco", icono: "entregas" },
      { titulo: "Consultas", detalle: "24 atendidas · 1 sin responder desde ayer", icono: "consultas" },
    ],
    permisos: [
      { etiqueta: "Rol", valor: "Docente" },
      { etiqueta: "Alcance", valor: "Solo sus 3 grupos" },
      { etiqueta: "Desde", valor: "marzo de 2024" },
      { etiqueta: "Última sesión", valor: "hoy 10:40" },
    ],
    eco: {
      pregunta: "¿Qué docente tiene más carga?",
      respuesta:
        "Sandoval, y no por número de grupos sino por concentración: es el único de renal, el área con más casos.",
      comparativa: [
        { quien: "Sandoval", detalle: "9 en cola · 68 alumnos", pct: 100, alerta: true },
        { quien: "Lugo", detalle: "3 en cola · 44 alumnos", pct: 42 },
        { quien: "Peña", detalle: "1 en cola · 24 alumnos", pct: 18 },
      ],
      sugerencia:
        "los 3 casos de más de 72 h son de vías urinarias; Lugo podría validarlos sin perder contexto.",
      cta: "Ver esos 3 casos",
      sugerencias: ["¿Quién tiene casos acumulados?", "¿Quién responde más lento?", "Reparte la carga de renal"],
    },
  },
};
