/** Mock general de Analítica (series de negocio, LRS, I-AIM, staff y Eco). En producción, de la BD / LRS. */

import type { AnaliticaData } from "./tipos";

export const MOCK: AnaliticaData = {
  periodo: "trimestre",
  negocio: {
    activos: {
      valor: "1 284",
      unidad: "en 11 programas",
      delta: "+35.7% vs abril",
      serie: [
        { x: "abr", v: 946 },
        { x: "may", v: 1012 },
        { x: "jun", v: 1044 },
        { x: "jul", v: 1118 },
        { x: "ago", v: 1220 },
        { x: "sep", v: 1284 },
      ],
      senal: { texto: "Crece sostenido: el cuello ya no es demanda, es capacidad docente.", tono: "ok" },
    },
    altasBajas: {
      valor: "87 / 14",
      unidad: "últimos 30 días",
      delta: "churn 1.1%",
      barras: [
        { etiqueta: "Altas", pct: 86, valor: "87" },
        { etiqueta: "Bajas", pct: 14, valor: "14", alerta: true },
        { etiqueta: "Netas", pct: 73, valor: "+73" },
      ],
      senal: { texto: "9 de las 14 bajas venían de Grupo POCUS → revisar arranque.", tono: "warn" },
    },
    retencion: {
      valor: "88%",
      unidad: "promedio a 6 meses",
      delta: "-4 pts",
      barras: [
        { etiqueta: "Sep 2026", pct: 94, valor: "94%" },
        { etiqueta: "Jul 2026", pct: 90, valor: "90%" },
        { etiqueta: "May 2026", pct: 86, valor: "86%" },
        { etiqueta: "Mar 2026", pct: 71, valor: "71%", alerta: true },
      ],
      senal: { texto: "Mar 2026 cae a 71%: la generación sin docente fijo.", tono: "warn" },
    },
    llenado: {
      valor: "82%",
      unidad: "de los cupos abiertos",
      delta: "+6 pts",
      barras: [
        { etiqueta: "Ultrasonografía", pct: 96, valor: "96%" },
        { etiqueta: "Obstétrico", pct: 88, valor: "88%" },
        { etiqueta: "POCUS", pct: 64, valor: "64%", alerta: true },
        { etiqueta: "MSK", pct: 41, valor: "41%", alerta: true },
      ],
      senal: { texto: "MSK al 41%: cupos abiertos sin conversión → revisar oferta.", tono: "warn" },
    },
    embudo: {
      etapas: [
        { etapa: "Prospectos", valor: 640, pct: 100 },
        { etapa: "Inscritos en CORA", valor: 186, pct: 29 },
        { etapa: "Provisionados en campus", valor: 178, pct: 28 },
        { etapa: "Con actividad en 7 días", valor: 152, pct: 24 },
      ],
      senal: {
        texto: "26 provisionados nunca entraron: el correo de bienvenida no basta.",
        tono: "warn",
      },
    },
    cartera: {
      valor: "94.2%",
      unidad: "al corriente",
      delta: "22 vencidos",
      barras: [
        { etiqueta: "Al corriente", pct: 94, valor: "1 210" },
        { etiqueta: "Por vencer 7 días", pct: 4, valor: "52", alerta: true },
        { etiqueta: "Vencido", pct: 2, valor: "22", alerta: true },
      ],
      senal: {
        texto: "La cobranza se opera en CORA; aquí solo se mide su efecto en bajas.",
        tono: "info",
      },
    },
    ingreso: {
      filas: [
        { etiqueta: "Ultrasonografía Médica", pct: 58, valor: "$4.9 M" },
        { etiqueta: "Ultrasonido Obstétrico", pct: 21, valor: "$1.8 M" },
        { etiqueta: "POCUS en Urgencias", pct: 12, valor: "$1.0 M" },
        { etiqueta: "Otros 8 programas", pct: 9, valor: "$0.8 M" },
      ],
      senal: { texto: "El 58% del ingreso depende de un solo programa.", tono: "warn" },
    },
  },
  aprendizaje: {
    eco: {
      pregunta: "¿Qué módulo hay que revisar?",
      intro:
        "Módulo 04 · Interpretación renal, y el patrón es uno solo: la medición de cortical.",
      evidencias: [
        { titulo: "62% falla la pregunta 4", detalle: "del punto de control, en los 3 grupos que lo cursan" },
        { titulo: "3 de 5 casos rechazados", detalle: "por el mismo error de medición" },
        { titulo: "5 consultas esta semana", detalle: "todas preguntando lo mismo al docente" },
      ],
      accion:
        "El video explica el grado pero no la técnica de medición. Agregue una lectura corta con la maniobra y una autoevaluación de dos ítems; con eso debería caer el rezago del módulo.",
      botones: ["Abrir el módulo 04", "Avisar al diseñador", "Ver el dato crudo"],
    },
    atoros: [
      { id: "a1", modulo: "M04 · Interpretación renal", leccion: "L3 · Hidronefrosis: gradación", rezago: 40, detalle: "40% rezago · 62% falla el control", critico: true },
      { id: "a2", modulo: "M08 · Doppler y hemodinamia", leccion: "L2 · Índices y ventana", rezago: 31, detalle: "31% rezago · 44% falla", critico: true },
      { id: "a3", modulo: "M07 · Obstétrico II", leccion: "L5 · Biometría del tercer trimestre", rezago: 22, detalle: "22% rezago" },
      { id: "a4", modulo: "M03 · Hígado y vía biliar", leccion: "L6 · Informe estructurado", rezago: 12, detalle: "12% rezago" },
      { id: "a5", modulo: "M01 · Fundamentos", leccion: "L4 · Artefactos", rezago: 7, detalle: "7% rezago" },
    ],
    iaim: {
      dominios: [
        { dominio: "Indicación", valor: 82, nota: "sólida" },
        { dominio: "Adquisición", valor: 54, nota: "el punto flojo", flojo: true },
        { dominio: "Interpretación", valor: 71, nota: "estable" },
        { dominio: "Decisión", valor: 63, nota: "sube 4 pts" },
      ],
      senal: {
        texto:
          "Adquisición 28 pts por debajo de Indicación: es técnica de manos, no teoría → más práctica guiada.",
        tono: "warn",
      },
    },
    avance: {
      programas: [
        { programa: "Ultrasonografía Médica", real: 54, esperado: 48, horas: "248 / 460 h" },
        { programa: "Ultrasonido Obstétrico", real: 71, esperado: 68, horas: "312 / 440 h" },
        { programa: "POCUS en Urgencias", real: 38, esperado: 52, horas: "84 / 220 h", alerta: true },
        { programa: "Doppler Vascular", real: 62, esperado: 60, horas: "148 / 240 h" },
      ],
      senal: {
        texto: "POCUS va 14 pts abajo de lo esperado: arranque lento, no deserción.",
        tono: "warn",
      },
    },
    repaso: {
      serie: [
        { x: "día 1", sinRepaso: 100, conRepaso: 100 },
        { x: "día 7", sinRepaso: 74, conRepaso: 88 },
        { x: "día 14", sinRepaso: 58, conRepaso: 84 },
        { x: "día 30", sinRepaso: 45, conRepaso: 79 },
        { x: "día 60", sinRepaso: 38, conRepaso: 74 },
      ],
      retSin: "retiene 38%",
      retCon: "retiene 74%",
      senal: {
        texto:
          "El repaso duplica la retención a 60 días, pero solo lo usa el 41% de los grupos → activarlo por defecto.",
        tono: "warn",
      },
    },
  },
  operacion: {
    docentes: {
      filas: [
        { id: "d1", ini: "AS", nombre: "Dr. Sandoval", grupos: "2 grupos", validados: 41, respuesta: "4 h", consultas: 18, estado: "Al día" },
        { id: "d2", ini: "KL", nombre: "Dra. Lugo", grupos: "3 grupos", validados: 36, respuesta: "7 h", consultas: 12, estado: "Al día" },
        { id: "d3", ini: "HC", nombre: "Dr. Cuevas", grupos: "1 grupo", validados: 12, respuesta: "38 h", consultas: 3, alerta: true, estado: "9 en cola" },
        { id: "d4", ini: "MP", nombre: "Dra. Peña", grupos: "2 grupos", validados: 28, respuesta: "11 h", consultas: 9, estado: "Al día" },
      ],
      senal: {
        texto:
          "Cuevas responde en 38 h contra 7 h del resto y tiene 9 casos en cola → reasignar o apoyar.",
        tono: "warn",
      },
    },
    diseno: {
      valor: "34",
      delta: "+9",
      barras: [
        { etiqueta: "Lecciones nuevas", pct: 62, valor: "21" },
        { etiqueta: "Casos curados a Biblioteca", pct: 26, valor: "9" },
        { etiqueta: "Plantillas y evaluaciones", pct: 12, valor: "4" },
      ],
      nota: "3 programas sin tocar en 60 días · 1 borrador sin publicar",
      senal: {
        texto: "El módulo 04 que más rezago causa no ha tenido cambios en 4 meses.",
        tono: "warn",
      },
    },
    ateneo: {
      tarjetas: [
        { titulo: "Casos presentados", valor: "28", sub: "esta semana", ok: true },
        { titulo: "Participación", valor: "41%", sub: "de los alumnos activos", ok: false },
        { titulo: "Interconsultas resueltas", valor: "86%", sub: "en menos de 48 h", ok: true },
        { titulo: "Sin respuesta", valor: "4", sub: "llevan más de 2 días", ok: false },
      ],
      senal: {
        texto: "El 59% nunca ha publicado: la comunidad vive de un núcleo pequeño.",
        tono: "warn",
      },
    },
    eco: {
      global: "83%",
      tareas: [
        { tarea: "Pre-análisis de casos", aprobadoSinCambios: 91, nota: "el docente corrige 9%" },
        { tarea: "Nota sugerida en tareas", aprobadoSinCambios: 78, nota: "corrige 22%" },
        { tarea: "Borradores de respuesta", aprobadoSinCambios: 86, nota: "edita 14%" },
        { tarea: "Resúmenes de grupo", aprobadoSinCambios: 95, nota: "corrige 5%" },
      ],
      gasto: "$1 840 de $3 000 en septiembre · 61% del tope",
      porCaso: "$0.43 por caso",
      senal: {
        texto:
          "La nota sugerida es la más corregida (22%): vale reentrenar con las rúbricas nuevas.",
        tono: "info",
      },
    },
  },
};
