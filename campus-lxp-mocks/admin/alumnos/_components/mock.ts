/** Mock general de Alumnos. En producción, todo llega de la BD (campus) y de CORA (administrativo). */

import type { AlumnosData } from "./tipos";

export const MOCK: AlumnosData = {
  totales: { activos: "1 284", enRiesgo: "232", avanceMedio: "54%", competenciaMedia: "68" },
  detalleTotales: {
    activos: "en 11 programas · 96% con actividad esta semana",
    enRiesgo: "sin actividad, rezago o reprobando · 9 grupos concentran la mitad",
    avanceMedio: "ponderado por horas acreditadas",
    competenciaMedia: "I-AIM global · Adquisición es el dominio más bajo",
  },
  alumnos: [
    { id: "u1", ini: "IT", nombre: "Dr. Iván Torres", matricula: "A-10428", programa: "Ultrasonografía Médica", grupo: "Grupo B · Nov 2026", avance: 48, competencia: 71, estado: "corriente", ultimaActividad: "hoy 10:24" },
    { id: "u2", ini: "HC", nombre: "Dr. Hugo Cuevas", matricula: "A-10431", programa: "Ultrasonografía Médica", grupo: "Grupo B · Nov 2026", avance: 34, competencia: 58, estado: "riesgo", ultimaActividad: "hace 12 días", ultimaAlerta: true, senal: "sin actividad" },
    { id: "u3", ini: "KM", nombre: "Dra. Karla Méndez", matricula: "A-10402", programa: "Ultrasonografía Médica", grupo: "Grupo B · Nov 2026", avance: 62, competencia: 78, estado: "corriente", ultimaActividad: "hoy 09:58" },
    { id: "u4", ini: "PN", nombre: "Dra. P. Navarro", matricula: "A-09877", programa: "Ultrasonografía Médica", grupo: "Grupo A · Sep 2026", avance: 74, competencia: 82, estado: "corriente", ultimaActividad: "ayer" },
    { id: "u5", ini: "LA", nombre: "Dr. Luis Arreola", matricula: "A-09902", programa: "Ultrasonografía Médica", grupo: "Grupo A · Sep 2026", avance: 71, competencia: 69, estado: "riesgo", ultimaActividad: "hace 3 días", senal: "reprobando" },
    { id: "u6", ini: "RS", nombre: "Dra. Renata Salas", matricula: "A-10510", programa: "POCUS en Urgencias", grupo: "Grupo POCUS · Oct", avance: 28, competencia: 44, estado: "riesgo", ultimaActividad: "hace 9 días", ultimaAlerta: true, senal: "rezago de 4 lecciones" },
    { id: "u7", ini: "JG", nombre: "Dr. Jorge Guzmán", matricula: "A-10388", programa: "Ultrasonografía Médica", grupo: "Grupo B · Nov 2026", avance: 52, competencia: 66, estado: "activo", ultimaActividad: "hace 2 días" },
    { id: "u8", ini: "MP", nombre: "Dra. Mariana Prado", matricula: "A-10144", programa: "Ultrasonido Obstétrico", grupo: "Grupo OB · Ago 2026", avance: 88, competencia: 91, estado: "corriente", ultimaActividad: "hoy 08:15" },
    { id: "u9", ini: "EC", nombre: "Dr. Emilio Cano", matricula: "A-09714", programa: "Doppler Vascular", grupo: "Grupo DV · Jul 2026", avance: 41, competencia: 52, estado: "suspendido", ultimaActividad: "hace 2 meses", ultimaAlerta: true, senal: "pago vencido · CORA", senalDeCORA: true },
  ],
  expediente: {
    id: "u2",
    ini: "HC",
    nombre: "Dr. Hugo Cuevas",
    matricula: "A-10431",
    programa: "Ultrasonografía Médica",
    grupo: "Grupo B · Nov 2026",
    estado: "riesgo",
    senal: "En riesgo · sin actividad 12 días",
    curso: { titulo: "Ultrasonografía Médica · 1000 h", avance: 34, esperado: 48, posicion: "Módulo 4 · Lección 3" },
    cifras: { horas: "196 h", casos: "6 / 9", casosNota: "casos validados · 3 rechazados", certificados: "1", insignias: "4" },
    iaim: {
      dominios: [
        { nombre: "Indicación", valor: 74 },
        { nombre: "Adquisición", valor: 44, nota: "el docente sugiere más práctica guiada" },
        { nombre: "Interpretación", valor: 58 },
        { nombre: "Decisión", valor: 56 },
      ],
      general: 58,
      nota: "10 puntos debajo de la media de su grupo. Los tres casos rechazados fueron por medición de cortical.",
    },
    actividad: [
      { titulo: "Última conexión", detalle: "hace 12 días · 4 sep 21:10", alerta: true, icono: "conexion" },
      { titulo: "Entregas", detalle: "4 de 6 entregadas · la última llegó tarde", icono: "entregas" },
      { titulo: "Ateneo", detalle: "2 casos presentados · 5 comentarios · no responde desde agosto", icono: "ateneo" },
      { titulo: "Consultas al docente", detalle: "1 abierta sin responder de su parte", icono: "consultas" },
    ],
    cora: {
      campos: [
        { etiqueta: "Matrícula", valor: "A-10431", mono: true },
        { etiqueta: "Inscripción", valor: "3 de noviembre de 2026" },
        { etiqueta: "Grupo asignado", valor: "Grupo B · Nov 2026" },
        { etiqueta: "Generación", valor: "1000 h · nov 2026" },
      ],
      pagoVencido: {
        titulo: "Pago vencido · 1 parcialidad",
        detalle: "venció el 5 de septiembre · se cobra en CORA",
      },
      corte: "hoy 06:00",
    },
    eco: {
      pregunta: "Resúmeme su avance",
      respuesta:
        "Se atoró en el mismo punto tres veces: medición de cortical. Sus 3 casos rechazados, la pregunta 7 del control y su consulta sin responder apuntan ahí.",
      puntos: [
        { texto: "Dejó de entrar tras el rechazo del 4 sep", tono: "warn" },
        { texto: "Adquisición 44: el más bajo de su grupo", tono: "warn" },
        { texto: "Iba al día hasta el módulo 3", tono: "ok" },
      ],
      sugerencia: "contactarlo con la lección de cortical y pedirle que reenvíe el caso.",
      cta: "Contactarlo con esa lección",
      sugerencias: ["¿Qué alumnos están así?", "¿Quién no se conectó esta semana?", "Compáralo con su grupo"],
    },
  },
};
