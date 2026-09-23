/**
 * Consultas (alumno) · tipos y mock
 *
 * Chat 1:1 entre PERSONAS: docentes, staff y colegas. Sin Eco / sin IA en esta vista.
 * Contraparte de la consola de consultas del docente (Studio).
 *
 * Los datos vienen de la BD vía props (`ConsultasData`). MOCK solo sirve para desarrollo.
 */

export type TipoContacto = "docente" | "staff" | "colega";

/** Solo docente y staff tienen ciclo de consulta; entre colegas es `null`. */
export type EstadoConsulta = "abierta" | "respondida" | "cerrada";

export type Contacto = {
  id: string;
  ini: string;
  nombre: string;
  tipo: TipoContacto;
  /** contexto corto para el chip: «Docente · Módulo 4», «Staff · Constancias», «Colega · Grupo B» */
  contexto: string;
  /** descripción larga para el buscador de nueva conversación */
  descripcion?: string;
  enLinea: boolean;
  /** texto de presencia cuando no está en línea: «Última conexión hace 18 min» */
  ultimaConexion?: string;
  /** docentes: «suele responder en el día» */
  tiempoRespuesta?: string;
};

export type Adjunto = {
  id: string;
  tipo: "imagen" | "video" | "loop" | "archivo";
  nombre: string;
  meta: string; // «4 s · de mi bitácora», «PDF · 1.2 MB»
  url?: string;
  poster?: string;
};

export type EstadoEntrega = "enviando" | "enviado" | "leido" | "error";

export type Mensaje = {
  id: string;
  deMi: boolean;
  texto?: string;
  adjuntos?: Adjunto[];
  hora: string; // ya formateada en la zona del alumno
  dia: string; // «ayer», «hoy», «22 sep» — agrupa separadores
  estado?: EstadoEntrega; // solo mensajes propios
};

export type Conversacion = {
  id: string;
  contacto: Contacto;
  ultimoMensaje: { texto: string; deMi: boolean };
  hora: string;
  noLeidos: number;
  estado: EstadoConsulta | null;
  /** contexto académico de la consulta (solo docente) */
  origen?: { etiqueta: string; href: string; abierta: string };
  cerradaEl?: string;
};

export type ConsultasData = {
  yo: { id: string; ini: string; nombre: string };
  conversaciones: Conversacion[];
  /** contactos disponibles para iniciar conversación, ya filtrados por permisos del alumno */
  contactos: Contacto[];
};

/* ─────────────── Mock de desarrollo (no usar en producción) ─────────────── */

const AS: Contacto = { id: "d1", ini: "AS", nombre: "Dr. Alejandro Sandoval", tipo: "docente", contexto: "Docente · Módulo 4", descripcion: "Módulo 4 · Interpretación renal", enLinea: false, ultimaConexion: "Última conexión hace 18 min", tiempoRespuesta: "suele responder en el día" };
const KL: Contacto = { id: "d2", ini: "KL", nombre: "Dra. Karla Lugo", tipo: "docente", contexto: "Docente · POCUS", descripcion: "Módulo 5 · POCUS", enLinea: true };
const CE: Contacto = { id: "s1", ini: "CE", nombre: "Control escolar", tipo: "staff", contexto: "Staff · Constancias", descripcion: "Constancias, horas acreditadas, inscripción", enLinea: false, ultimaConexion: "Atiende L–V de 9 a 18 h" };
const SP: Contacto = { id: "s2", ini: "SP", nombre: "Soporte técnico", tipo: "staff", contexto: "Staff · Plataforma", descripcion: "Visor, acceso, problemas de la plataforma", enLinea: false, ultimaConexion: "Atiende L–S de 8 a 20 h" };
const KM: Contacto = { id: "u2", ini: "KM", nombre: "Dra. Karla Méndez", tipo: "colega", contexto: "Colega · Grupo B", descripcion: "Grupo B · colega", enLinea: true };
const IT: Contacto = { id: "u1", ini: "IT", nombre: "Dr. Iván Torres", tipo: "colega", contexto: "Colega · Ateneo", descripcion: "Ateneo · colega", enLinea: false, ultimaConexion: "Última conexión ayer" };

export const MOCK: ConsultasData = {
  yo: { id: "u0", ini: "SR", nombre: "Dra. Sofía Ramírez" },
  contactos: [AS, KL, CE, SP, KM, IT],
  conversaciones: [
    { id: "c1", contacto: AS, ultimoMensaje: { texto: "Sí: mídala en los dos polos. Le dejo la lectura…", deMi: false }, hora: "10:42", noLeidos: 2, estado: "respondida", origen: { etiqueta: "Módulo 4 · Lección 3 · Hidronefrosis", href: "/leccion/m4-l3", abierta: "22 sep" } },
    { id: "c2", contacto: CE, ultimoMensaje: { texto: "Su constancia de 500 h ya está en trámite.", deMi: false }, hora: "09:15", noLeidos: 0, estado: "abierta" },
    { id: "c3", contacto: KM, ultimoMensaje: { texto: "¿Me pasas el loop del jet?", deMi: true }, hora: "ayer", noLeidos: 0, estado: null },
    { id: "c4", contacto: KL, ultimoMensaje: { texto: "¡Con gusto! Nos vemos el jueves.", deMi: false }, hora: "lun", noLeidos: 0, estado: "cerrada", cerradaEl: "el lunes" },
    { id: "c5", contacto: SP, ultimoMensaje: { texto: "El visor ya carga en Safari. ¿Lo pudo probar?", deMi: false }, hora: "lun", noLeidos: 1, estado: "respondida" },
    { id: "c6", contacto: IT, ultimoMensaje: { texto: "¡Gracias por la ventana alterna!", deMi: false }, hora: "vie", noLeidos: 0, estado: null },
  ],
};

export const MENSAJES_MOCK: Record<string, Mensaje[]> = {
  c1: [
    { id: "m1", deMi: true, dia: "ayer", hora: "18:42", estado: "leido", texto: "Doctor, buenas tardes. En el caso del riñón derecho no me queda claro dónde medir la cortical. ¿Basta con el polo medio?" },
    { id: "m2", deMi: true, dia: "ayer", hora: "18:43", estado: "leido", adjuntos: [{ id: "a1", tipo: "loop", nombre: "loop_rinon_der.dcm", meta: "4 s · de mi bitácora" }] },
    { id: "m3", deMi: false, dia: "hoy", hora: "10:40", texto: "Buen día, doctora. Mídala en los dos polos y en el mismo plano; con una sola medida el ángulo puede engañarla. Si el polo inferior no se deja, cambie a un corte coronal por flanco." },
    { id: "m4", deMi: false, dia: "hoy", hora: "10:42", texto: "Le dejo la lectura del módulo donde está explicado con imágenes.", adjuntos: [{ id: "a2", tipo: "archivo", nombre: "Lectura · dónde se mide la cortical.pdf", meta: "PDF · 1.2 MB" }] },
  ],
  c3: [
    { id: "n1", deMi: false, dia: "ayer", hora: "20:10", texto: "Oye, vi tu caso en el Ateneo. ¿Cómo sacaste la ventana del polo inferior?" },
    { id: "n2", deMi: true, dia: "ayer", hora: "20:14", estado: "leido", texto: "Coronal por flanco, bajando ganancia. Me lo sugirió Sandoval en una consulta." },
    { id: "n3", deMi: true, dia: "ayer", hora: "20:15", estado: "leido", texto: "¿Me pasas el loop del jet? El tuyo se ve mucho más limpio que el mío." },
    { id: "n4", deMi: false, dia: "hoy", hora: "11:02", texto: "Claro, aquí va. Lo grabé con Doppler a baja escala.", adjuntos: [{ id: "a3", tipo: "video", nombre: "jet_ureteral.mp4", meta: "0:14 · video" }] },
  ],
};
