/** Mock general de Consultas. En producción, todo llega de la BD por props. */

import type { ConsultasData } from "./tipos";

export const MOCK: ConsultasData = {
  docente: { nombre: "Dr. Sandoval" },
  grupos: ["Grupo B · Nov 2026", "Grupo A · Sep 2026", "Grupo POCUS · Oct 2026"],
  sinResponder: 5,
  conversaciones: [
    {
      id: "c1",
      alumno: { id: "u1", ini: "IT", nombre: "Dr. Iván Torres", grupo: "Grupo B · Nov 2026", moduloEnCurso: "M04 · L3", horas: 248 },
      estado: "sin-responder",
      esperando: "2 h",
      hora: "10:24",
      ultimoMensaje:
        "¿La cortical se mide en los dos polos o basta el medio? En mi caso no logro la ventana…",
      mensajes: [
        { id: "m1", de: "alumno", dia: "ayer", texto: "Doctor, buenas tardes. Estoy con el caso del riñón derecho de la lección 3 y no me queda claro dónde medir la cortical.", hora: "18:42" },
        { id: "m2", de: "docente", texto: "Buenas tardes, doctor. Mándeme el loop y lo vemos juntos.", hora: "19:10", leido: true },
        {
          id: "m3",
          de: "alumno",
          dia: "hoy",
          texto:
            "¿La cortical se mide en los dos polos o basta el medio? En mi caso no logro la ventana del polo inferior y me da 7.2 mm en el medio. Le dejo el loop.",
          hora: "10:24",
          adjunto: { nombre: "loop_rinon_der.dcm", meta: "4 s · de su bitácora", tipo: "loop" },
        },
      ],
      eco: {
        resumen:
          "Dónde medir la cortical cuando no hay ventana del polo inferior. Ya trae una medida (7.2 mm en el polo medio) y quiere saber si le basta para cerrar el grado.",
        metaHilo: "4 mensajes · 2 días · adjuntó 1 loop",
        borrador:
          "Doctor: mídala en los dos polos y en el mismo plano. Si la ventana no le da, cambie a un corte coronal por flanco y baje la ganancia — el borde cortical se define mejor. Con una sola medida en el polo medio el ángulo puede engañarlo, y ahí se le va el grado.",
        cita: "cita la lección 3 del módulo 4",
        patron: {
          cuantos: 5,
          inis: ["HC", "JG", "PN", "RS", "MP"],
          texto:
            "Todos del módulo 4 y todos por lo mismo: la medición de cortical. También fue la pregunta que más falló el grupo en la autoevaluación.",
        },
        recursos: [
          { clave: "M04 · L3", titulo: "Hidronefrosis: gradación y trampas", meta: "video · 18:40" },
          { clave: "Biblioteca", titulo: "Riñón poliquístico: conteo y medición", meta: "caso curado" },
          { clave: "M04 · L3", titulo: "Lectura: dónde se mide la cortical", meta: "lectura · 10 min" },
        ],
        ajustes: ["Hazla más breve", "Explícalo con un ejemplo", "¿Qué le contesté antes?"],
      },
    },
    {
      id: "c2",
      alumno: { id: "u2", ini: "HC", nombre: "Dr. Hugo Cuevas", grupo: "Grupo B · Nov 2026", moduloEnCurso: "M04 · L3", horas: 196 },
      estado: "sin-responder",
      hora: "09:58",
      ultimoMensaje: "Doctor, ¿por qué mi caso salió como quiste? Yo veía el cáliz dilatado.",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
    {
      id: "c3",
      alumno: { id: "u3", ini: "PN", nombre: "Dra. P. Navarro", grupo: "Grupo A · Sep 2026", moduloEnCurso: "M07 · L2", horas: 512 },
      estado: "sin-responder",
      hora: "ayer",
      ultimoMensaje: "¿Puedo entregar la tarea del módulo 7 el lunes? Estoy de guardia el fin.",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
    {
      id: "c4",
      alumno: { id: "u4", ini: "KM", nombre: "Dra. Karla Méndez", grupo: "Grupo B · Nov 2026", moduloEnCurso: "M04 · L4", horas: 264 },
      estado: "respondida",
      hora: "ayer",
      ultimoMensaje: "Gracias, con eso me queda claro. Subo el caso hoy mismo.",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
    {
      id: "c5",
      alumno: { id: "u5", ini: "JG", nombre: "Dr. Jorge Guzmán", grupo: "Grupo B · Nov 2026", moduloEnCurso: "M03 · L6", horas: 188 },
      estado: "respondida",
      hora: "lun",
      ultimoMensaje: "¿El informe estructurado que vimos aplica igual para vía biliar?",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
    {
      id: "c6",
      alumno: { id: "u6", ini: "RS", nombre: "Dra. Renata Salas", grupo: "Grupo POCUS · Oct 2026", moduloEnCurso: "M02 · L1", horas: 84 },
      estado: "sin-responder",
      hora: "lun",
      ultimoMensaje: "Le mandé el loop del Doppler, ¿lo pudo ver?",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
    {
      id: "c7",
      alumno: { id: "u7", ini: "LA", nombre: "Dr. Luis Arreola", grupo: "Grupo A · Sep 2026", moduloEnCurso: "M07 · L1", horas: 486 },
      estado: "respondida",
      hora: "vie",
      ultimoMensaje: "Listo, ya corregí la medición como me dijo.",
      mensajes: [],
      eco: { resumen: "", metaHilo: "", borrador: "", cita: "", recursos: [], ajustes: [] },
    },
  ],
};
