/** Mock general del Inicio del súper admin. En producción, todo llega de la BD por props. */

import type { AdminHomeData } from "./tipos";

export const MOCK: AdminHomeData = {
  fecha: "Martes 16 de septiembre",
  kpis: [
    { id: "k1", titulo: "Alumnos activos", valor: "1 284", unidad: "en 11 programas", delta: "+64 este mes", deltaPositivo: true, pie: "96% con actividad esta semana", icono: "alumnos" },
    { id: "k2", titulo: "Grupos abiertos", valor: "38", unidad: "de 46 creados", delta: "+3", deltaPositivo: true, pie: "8 cierran en diciembre", icono: "grupos" },
    { id: "k3", titulo: "Programas activos", valor: "11", unidad: "plantillas vivas", delta: "2 en revisión", pie: "1 borrador sin publicar", icono: "programas" },
    { id: "k4", titulo: "Inscripciones", valor: "87", unidad: "últimos 30 días", delta: "+18%", deltaPositivo: true, pie: "llegan de CORA cada noche", icono: "inscripciones" },
  ],
  tendencia: {
    puntos: [
      { mes: "abr", valor: "946", altura: 52 },
      { mes: "may", valor: "1 012", altura: 61 },
      { mes: "jun", valor: "1 044", altura: 58 },
      { mes: "jul", valor: "1 118", altura: 74 },
      { mes: "ago", valor: "1 220", altura: 86 },
      { mes: "sep", valor: "1 284", altura: 100 },
    ],
    resumen: [
      { valor: "+35.7%", etiqueta: "alumnos vs abril" },
      { valor: "412", etiqueta: "casos subidos en septiembre" },
      { valor: "9 840 h", etiqueta: "acreditadas este ciclo" },
    ],
  },
  avance: [
    { titulo: "Avance medio de los 38 grupos", pct: 54, detalle: "ponderado por horas acreditadas" },
    { titulo: "Alumnos al día", pct: 82, detalle: "1 052 de 1 284" },
  ],
  riesgo: {
    n: 232,
    detalle: "sin actividad 14+ días o reprobando · 9 grupos concentran la mitad",
  },
  cartera: {
    pctAlCorriente: "94.2%",
    cortes: [
      { etiqueta: "Al corriente", valor: "1 210", tono: "ok" },
      { etiqueta: "Por vencer (7 días)", valor: "52", tono: "porVencer" },
      { etiqueta: "Vencido", valor: "22", tono: "vencido" },
    ],
    ultimoCorte: "hoy 06:00",
  },
  integraciones: [
    { id: "i1", nombre: "MiCo+ · Mindray", estado: "caida", detalle: "Sin respuesta desde las 11:42. La sesión de mañana está en riesgo.", meta: "hace 2 h", icono: "mico" },
    { id: "i2", nombre: "Zoom", estado: "ok", detalle: "Salas y grabaciones al día", meta: "18 sesiones hoy", icono: "zoom" },
    { id: "i3", nombre: "CORA · ERP", estado: "ok", detalle: "Último sync completo", meta: "hoy 06:00", icono: "cora" },
    { id: "i4", nombre: "Pasarela de pagos", estado: "degradada", detalle: "Latencia alta en los cobros recurrentes", meta: "2.8 s medio", icono: "pagos" },
    { id: "i5", nombre: "Correo transaccional", estado: "ok", detalle: "1 284 envíos, 0.4% de rebote", meta: "últimas 24 h", icono: "correo" },
  ],
  gastoIA: {
    monto: "$ 1 840",
    moneda: "MXN",
    periodo: "septiembre",
    pctTope: 61,
    tope: "$3 000",
    desglose: [
      { tarea: "Pre-análisis de casos", monto: "$ 842", pct: "46%" },
      { tarea: "Borradores de respuesta", monto: "$ 513", pct: "28%" },
      { tarea: "Resúmenes y consultas", monto: "$ 312", pct: "17%" },
      { tarea: "Calificación sugerida", monto: "$ 173", pct: "9%" },
    ],
  },
  sistema: [
    { titulo: "Almacenamiento DICOM y video", valor: "4.8 / 8 TB", pct: 60, detalle: "crece 240 GB al mes · alcanza para 13 meses", icono: "almacenamiento" },
    { titulo: "Colas y workers", valor: "3 en cola", detalle: "transcodificación al día · 0 trabajos fallidos", icono: "colas" },
    { titulo: "LRS · xAPI", valor: "1.2 M eventos", detalle: "último evento hace 4 s", icono: "lrs" },
  ],
  alertas: [
    { id: "a1", titulo: "MiCo+ sin respuesta desde las 11:42", detalle: "La sesión de mañana 18:30 con el Grupo POCUS depende del equipo. Revise credenciales o avise al docente.", gravedad: "critica" },
    { id: "a2", titulo: "Pasarela con latencia alta", detalle: "Los cobros recurrentes tardan 2.8 s; no hay pagos perdidos.", gravedad: "media" },
    { id: "a3", titulo: "Aval académico por renovar", detalle: "El aval de Ultrasonografía Médica vence en 38 días.", gravedad: "media" },
    { id: "a4", titulo: "2 claves de API sin rotar", detalle: "Zoom y CORA llevan 11 meses con la misma clave.", gravedad: "media" },
  ],
  decisiones: [
    { id: "d1", n: 14, titulo: "certificados por emitir", detalle: "alumnos que ya acreditaron las 1000 h · avala Dr. Lugo", cta: "Revisar", icono: "certificados" },
    { id: "d2", n: 3, titulo: "solicitudes de acceso", detalle: "2 docentes nuevos y 1 cambio de rol a diseñador", cta: "Ver", icono: "accesos" },
    { id: "d3", n: 2, titulo: "aprobaciones escaladas", detalle: "un caso rechazado dos veces y una baja de grupo", cta: "Resolver", icono: "escaladas" },
  ],
  actividad: [
    { id: "s1", ini: "AS", nombre: "Dr. Sandoval", accion: "validó 7 casos", meta: "Grupo B · hace 40 min", rol: "docente" },
    { id: "s2", ini: "MV", nombre: "Mariana V.", accion: "publicó la v4 de Ultrasonografía Médica", meta: "8 grupos actualizados · hace 2 h", rol: "diseñador" },
    { id: "s3", ini: "KL", nombre: "Dra. Lugo", accion: "calificó 12 entregas", meta: "Grupo A · hace 3 h", rol: "docente" },
    { id: "s4", ini: "HC", nombre: "Hugo C.", accion: "curó 4 casos a la Biblioteca", meta: "hace 5 h", rol: "diseñador" },
  ],
  ateneo: { casos: 28, comentarios: 196, sinResponder: 4 },
  eco: {
    pregunta: "Resúmeme la semana",
    intro: "La escuela creció +22 alumnos y se acreditaron 640 h. Tres cosas que sí piden su atención:",
    puntos: [
      { titulo: "MiCo+ caída", detalle: "desde las 11:42; mañana hay sesión", tono: "critica" },
      { titulo: "9 grupos concentran el riesgo", detalle: "116 de los 232 alumnos en riesgo", tono: "media" },
      { titulo: "Gasto de IA al 61%", detalle: "proyecta $2 410 al cierre, dentro del tope", tono: "info" },
    ],
    cierre: "Lo demás va bien: cartera al 94.2% y el staff validó 41 casos.",
    sugerencias: ["¿Qué grupos van en riesgo?", "¿Cómo va el gasto de IA?", "¿Qué staff está más cargado?"],
  },
};
