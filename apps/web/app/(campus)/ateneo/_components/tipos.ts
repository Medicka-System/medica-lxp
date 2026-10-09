/**
 * Ateneo · tipos y datos mock
 *
 * El Ateneo es la comunidad ABIERTA de todo el campus (el foro es cerrado por grupo).
 * El caso clínico es el contenido rey: se ve más grande que cualquier otro tipo de post.
 */

export type Rol = "alumno" | "docente";

export type Persona = {
  id: string;
  ini: string;
  nombre: string;
  rol: Rol;
  /** especialidad · sede */
  meta: string;
  /**
   * Foto de perfil LISTA para `<img>` (URL ya firmada; el data layer resuelve el `avatar_url`
   * cross-user vía `perfil_publico_de` · §10 y la firma). `null`/`undefined` → iniciales.
   */
  avatarUrl?: string | null;
};

/** Reacciones clínicas, no el repertorio de Facebook. */
export type TipoReaccion = "util" | "ojo" | "aclara" | "bien" | "duda" | "gracias";

export const REACCIONES: Record<TipoReaccion, { emoji: string; etiqueta: string; fondo: string }> = {
  util: { emoji: "👍", etiqueta: "Útil", fondo: "var(--accent)" },
  ojo: { emoji: "👁️", etiqueta: "Buen ojo", fondo: "var(--info-surface)" },
  aclara: { emoji: "💡", etiqueta: "Me aclara", fondo: "var(--warning-surface)" },
  bien: { emoji: "👏", etiqueta: "Bien hecho", fondo: "#fef3f2" },
  duda: { emoji: "🤔", etiqueta: "Lo dudo", fondo: "var(--muted)" },
  gracias: { emoji: "❤️", etiqueta: "Gracias", fondo: "#fef2f2" },
};

export type Reacciones = {
  top: TipoReaccion[]; // las 1–3 más usadas, para las burbujas
  total: number;
  mia?: TipoReaccion;
};

export type Comentario = {
  id: string;
  parentId?: string; // plano; se anida al render, 2 niveles máximo
  autor: Persona;
  texto: string;
  cuando: string;
  /** Reacciones del comentario (6 tipos · mig 0075). Igual forma que las del post. */
  reacciones?: Reacciones;
};

export type CasoBitacora = {
  id: string;
  titulo: string;
  area: string;
  organo: string;
  dominio: string;
  piezas: number;
  loops: number;
  fecha: string;
  validado: boolean;
  poster?: string;
};

/**
 * Bloque pedagógico de un caso para el DETALLE del post (viñeta + hallazgos + diagnóstico
 * presuntivo). Solo lo PEDAGÓGICO — nunca ficha/metadata del paciente (§10). Lo resuelve una
 * server action bajo RLS (dueño del caso); `null` para casos ajenos → el bloque no se muestra.
 */
export type BloquePedagogicoCasoData = {
  vineta: string | null;
  hallazgos: string | null;
  presuntivo: string | null;
  contenidoEstructurado: import("@campus/shared").ContenidoEstructuradoCaso | null;
};

/** Snapshot OG de un enlace pegado en el composer (se congela al publicar, no se re-fetchea). */
export type EnlacePreview = {
  url: string;
  titulo: string | null;
  descripcion: string | null;
  imagen: string | null;
  sitio: string | null;
};

type PostBase = {
  id: string;
  autor: Persona;
  cuando: string;
  reacciones: Reacciones;
  comentarios: number;
  compartidos: number;
  preview: Comentario[]; // 2–3 comentarios recientes/relevantes
  // Tarjeta de enlace (OpenGraph) — ortogonal al tipo de post; se persiste como snapshot.
  enlace?: EnlacePreview | null;
};

export type PostTexto = PostBase & { tipo: "texto"; texto: string };
export type PostCaso = PostBase & { tipo: "caso"; titulo: string; texto: string; caso: CasoBitacora };
export type PostPregunta = PostBase & {
  tipo: "pregunta";
  pregunta: string;
  contexto?: string;
  temas: string[];
  seguidores: number;
};
export type PostMedia = PostBase & {
  tipo: "media";
  texto: string;
  // "gif" = hotlink al CDN de Giphy (src = URL externa tal cual, no ref de storage).
  piezas: { tipo: "imagen" | "video" | "gif"; src?: string }[];
};

/** Un GIF de Giphy en el picker (lo entrega el proxy /media/gifs del api). */
export type GifItem = { id: string; url: string; preview: string; width: number; height: number };
export type PostEncuesta = PostBase & {
  tipo: "encuesta";
  pregunta: string;
  opciones: { id: string; texto: string; votos: number }[];
  miVoto?: string;
  cierra: string;
};

export type Post = PostTexto | PostCaso | PostPregunta | PostMedia | PostEncuesta;

export type ModoComposer = "texto" | "caso" | "pregunta" | "media" | "encuesta" | "gif";

export type PerfilResumen = Persona & {
  colegas: number;
  casos: number;
  aportes: number;
  enComun?: { total: number; inis: string[] };
  estadoConexion?: "ninguna" | "pendiente" | "colegas";
  /** Privacidad (Bloque 4): si el colega acepta solicitudes. undefined = sí (compat). */
  aceptaColegas?: boolean;
  /** Portada (pleca) LISTA para `<img>` — URL ya firmada (`perfil_publico_de.portada_url`). null → degradado navy. */
  portadaUrl?: string | null;
};

export type AteneoData = {
  yo: PerfilResumen;
  posts: Post[];
  misCasos: CasoBitacora[];
  sugerencias: (PerfilResumen & { motivo: string })[];
  colegasConPosts: number;
};

/** Un aporte del alumno al Ateneo (publicación o comentario), para la lista del perfil. */
export type ItemAporte = { id: string; clase: "publicación" | "comentario"; texto: string; cuando: string; postId: string };

/** Contenido de una de las 3 listas del perfil (se carga bajo demanda al clic en la cifra). */
export type ListaPerfilData =
  | { tipo: "casos"; casos: CasoBitacora[] }
  | { tipo: "colegas"; colegas: Persona[] }
  | { tipo: "aportes"; aportes: ItemAporte[] };

/** Perfil de un colega abierto desde el feed: resumen + sus casos presentados (visibles). */
export type PerfilColegaData = { perfil: PerfilResumen & { motivo?: string }; casos: CasoBitacora[] };

/* ───────────────────────────── Mock ───────────────────────────── */

const P = {
  sr: { id: "u0", ini: "SR", nombre: "Dra. Sofía Ramírez", rol: "alumno", meta: "Ultrasonografía · Guadalajara" },
  it: { id: "u1", ini: "IT", nombre: "Dr. Iván Torres", rol: "alumno", meta: "Urgencias · Puebla" },
  as: { id: "d1", ini: "AS", nombre: "Dr. Alejandro Sandoval", rol: "docente", meta: "Renal y abdomen" },
  km: { id: "u2", ini: "KM", nombre: "Dra. Karla Méndez", rol: "alumno", meta: "Medicina interna · Monterrey" },
  pn: { id: "u3", ini: "PN", nombre: "Dra. P. Navarro", rol: "alumno", meta: "Medicina familiar · Monterrey" },
  la: { id: "u4", ini: "LA", nombre: "Dr. Luis Arreola", rol: "alumno", meta: "Medicina familiar · CDMX" },
  kl: { id: "d2", ini: "KL", nombre: "Dra. Karla Lugo", rol: "docente", meta: "Urgencias y POCUS" },
} satisfies Record<string, Persona>;

const casoHidro: CasoBitacora = {
  id: "c1",
  titulo: "Hidronefrosis con adelgazamiento cortical",
  area: "Renal",
  organo: "Riñón",
  dominio: "Interpretación",
  piezas: 4,
  loops: 1,
  fecha: "12 sep",
  validado: true,
};

export const MOCK: AteneoData = {
  yo: { ...P.sr, colegas: 128, casos: 3, aportes: 18 },
  colegasConPosts: 6,
  misCasos: [
    casoHidro,
    { id: "c2", titulo: "Vesícula con pared engrosada", area: "Hígado", organo: "Vesícula", dominio: "Indicación", piezas: 3, loops: 0, fecha: "4 sep", validado: true },
    { id: "c3", titulo: "Riñón derecho sin ventana", area: "Renal", organo: "Riñón", dominio: "Adquisición", piezas: 2, loops: 0, fecha: "28 ago", validado: false },
  ],
  sugerencias: [
    { id: "u9", ini: "RS", nombre: "Dra. Renata Salas", rol: "alumno", meta: "Radiología · Guadalajara", colegas: 214, casos: 9, aportes: 46, motivo: "4 colegas en común", estadoConexion: "ninguna", enComun: { total: 4, inis: ["KM", "LA"] } },
    { id: "u5", ini: "HC", nombre: "Dr. Hugo Cuevas", rol: "alumno", meta: "Mismo diplomado · Grupo B", colegas: 88, casos: 2, aportes: 11, motivo: "solicitud enviada", estadoConexion: "pendiente" },
    { id: "d3", ini: "MP", nombre: "Dra. Mariana Peña", rol: "docente", meta: "Obstétrico · docente", colegas: 402, casos: 31, aportes: 190, motivo: "sigue su bitácora", estadoConexion: "ninguna" },
  ],
  posts: [
    {
      id: "p1", tipo: "caso", autor: P.it, cuando: "hace 2 h",
      titulo: "¿Asimetría cortical crónica o me está ganando el ángulo?",
      texto: "Mujer de 46, dolor lumbar derecho de 3 días, creatinina normal. Traigo el estudio completo de mi bitácora.",
      caso: casoHidro,
      reacciones: { top: ["util", "ojo", "aclara"], total: 24, mia: "util" }, comentarios: 7, compartidos: 3,
      preview: [
        { id: "k1", autor: P.as, texto: "Mida la cortical en los dos polos y en el mismo plano. Si la diferencia se sostiene, es real.", cuando: "hace 1 h" },
        { id: "k2", autor: P.km, texto: "¿Tiene el contralateral para comparar?", cuando: "hace 1 h" },
      ],
    },
    {
      id: "p2", tipo: "pregunta", autor: P.pn, cuando: "hace 3 h",
      pregunta: "¿Alguien sigue midiendo el diámetro AP de la pelvis renal para graduar?",
      contexto: "En la residencia lo usábamos para decidir. Aquí nadie lo menciona y quiero saber si quedó en desuso.",
      temas: ["#renal", "#gradación"], seguidores: 2,
      reacciones: { top: ["duda", "util"], total: 5 }, comentarios: 0, compartidos: 1, preview: [],
    },
    {
      id: "p3", tipo: "encuesta", autor: P.km, cuando: "hace 4 h",
      pregunta: "En equipos portátiles, ¿qué preset usan de entrada para riñón?",
      opciones: [
        { id: "o1", texto: "Abdomen general, bajando ganancia", votos: 46 },
        { id: "o2", texto: "Preset renal del fabricante", votos: 27 },
        { id: "o3", texto: "Uno propio guardado", votos: 13 },
      ],
      miVoto: "o1", cierra: "cierra en 2 días",
      reacciones: { top: ["util", "aclara"], total: 11 }, comentarios: 14, compartidos: 2, preview: [],
    },
    {
      id: "p4", tipo: "media", autor: P.la, cuando: "ayer",
      texto: "Mi equipo portátil nuevo en la sede: tres cortes de vesícula con el preset abdomen, sin tocar nada.",
      piezas: [{ tipo: "imagen" }, { tipo: "imagen" }, { tipo: "video" }],
      reacciones: { top: ["util", "bien"], total: 17 }, comentarios: 2, compartidos: 0, preview: [],
    },
    {
      id: "p5", tipo: "texto", autor: P.kl, cuando: "hace 5 h",
      texto: "Recordatorio para quien arranca el módulo 5: el jet ureteral se busca con Doppler color a baja escala. Si no lo ve en 5 minutos, no concluya ausencia — espere o pida al paciente que tome agua.",
      reacciones: { top: ["util", "aclara", "bien"], total: 41 }, comentarios: 6, compartidos: 12, preview: [],
    },
  ],
};

export const HILO_MOCK: Comentario[] = [
  { id: "h1", autor: P.as, texto: "Mida la cortical en los dos polos y en el mismo plano. Si la diferencia se sostiene, es real; si no, es el ángulo.", cuando: "hace 1 h" },
  { id: "h2", parentId: "h1", autor: P.it, texto: "Polo superior derecho: 9.4. Se sostiene.", cuando: "hace 40 min" },
  { id: "h3", autor: P.km, texto: "¿Tiene el contralateral en el mismo plano? Sin eso no me animo a llamarlo crónico.", cuando: "hace 1 h" },
];
