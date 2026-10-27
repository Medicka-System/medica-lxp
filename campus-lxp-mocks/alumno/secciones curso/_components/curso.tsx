/**
 * Interior del curso · tipos, datos de ejemplo y piezas compartidas.
 * Lo usan las 5 secciones: Contenido · Tareas · Foros · Calificaciones · Alumnos
 * (y las subpáginas Historial de envíos y Comentarios).
 * Solo tokens de globals.css; sin hex salvo donde se indica.
 */

import type { ReactNode } from "react";

/* ───────────── estilo ───────────── */
export const mono = "font-mono tabular-nums";
export const kicker = "text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
export const th = "text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground whitespace-nowrap";
export const softText = "text-[color:var(--foreground-soft)]";
export const card = "rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(17,24,39,0.06)]";
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

export type Tono = "ok" | "warn" | "neutro" | "info" | "navy";
const TONO: Record<Tono, string> = {
  ok: "bg-accent text-accent-foreground",
  warn: "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  neutro: "border border-border bg-muted text-muted-foreground",
  info: "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
  navy: "bg-sidebar text-sidebar-foreground",
};
export function Chip({ tono, icono, children }: { tono: Tono; icono?: ReactNode; children: ReactNode }) {
  return (
    <span className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${TONO[tono]}`}>
      {icono}
      {children}
    </span>
  );
}

export function Avatar({ ini, size = 36, staff }: { ini: string; size?: number; staff?: boolean }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className={`grid shrink-0 place-items-center rounded-full font-bold ${
        staff ? "bg-sidebar text-sidebar-foreground" : `bg-[color:var(--track)] ${softText}`
      }`}
    >
      {ini}
    </span>
  );
}

/** Segmentado de filtro: activo navy, con conteo opcional en mono. */
export function Segmentado<T extends string>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: { id: T; etiqueta: string; n?: number }[];
  valor: T;
  onCambio: (v: T) => void;
}) {
  return (
    <div role="radiogroup" className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
      {opciones.map((o) => {
        const on = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onCambio(o.id)}
            className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
              on ? "bg-sidebar text-sidebar-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.etiqueta}
            {o.n !== undefined && <span className={`${mono} font-bold ${on ? "text-white/70" : ""}`}>{o.n}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Cabecera de página: contexto (o migas) · H1 · subtítulo · acciones a la derecha. */
export function CabeceraPagina({
  titulo,
  sub,
  acciones,
  migas,
  contexto = "Ultrasonografía Médica · Grupo B · Nov 2026",
}: {
  titulo: string;
  sub?: string;
  acciones?: ReactNode;
  migas?: { etiqueta: string; href?: string }[];
  contexto?: string;
}) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-0">
        {migas ? (
          <nav aria-label="Migas" className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            {migas.map((m, i) => (
              <span key={m.etiqueta} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>›</span>}
                {m.href ? (
                  <a href={m.href} className="font-semibold text-secondary no-underline">
                    {m.etiqueta}
                  </a>
                ) : (
                  <span>{m.etiqueta}</span>
                )}
              </span>
            ))}
          </nav>
        ) : (
          <p className={`${kicker} mb-2`}>{contexto}</p>
        )}
        <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em]">{titulo}</h1>
        {sub && <p className={`mt-1.5 text-[13.5px] ${softText}`}>{sub}</p>}
      </div>
      {acciones && <div className="ml-auto flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

export function BotonSec({ icono, children, onClick }: { icono?: ReactNode; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
    >
      {icono}
      {children}
    </button>
  );
}

/* ───────────── tipos ───────────── */

export type EstadoModulo = "completado" | "actual" | "en-curso" | "por-empezar" | "bloqueado";
export type Modulo = {
  id: string;
  numero?: number; // si no hay, es Inicio / Preliminar / Cierre y lleva ícono
  icono?: "bombilla" | "entrada" | "birrete";
  kicker: string;
  titulo: string;
  meta: string;
  hechos: number;
  total: number;
  estado: EstadoModulo;
  /** origen del degradado de la banda, p. ej. "20% 0%" — distinto por módulo */
  luz: string;
  portadaUrl?: string;
};

export type EstadoEntrega = "enviada" | "pendiente" | "no-disponible";
export type Tarea = {
  id: string;
  clave: string; // "Tarea 1 · M1"
  descripcion: string;
  vence: string; // "23 ago 2026 · 23:00"
  ventana: string; // "17 ago – 20 sep"
  estado: EstadoEntrega;
  envios: number;
  archivos: number;
  diasParaVencer?: number;
  puntos?: number;
  puntosMax: number;
  comentarios: "sin-leer" | "leidos" | "ninguno";
};

export type Envio = { id: string; archivo: string; peso: string; fecha: string; estado: "calificado" | "reemplazado" | "recibido" };

export type Nivel = { puntos: number; texto: string };
export type Criterio = { id: string; nombre: string; niveles: Nivel[]; elegido: number };
export type Rubrica = { titulo: string; niveles: string[]; criterios: Criterio[] };

export type Respuesta = { id: string; ini: string; autor: string; docente?: boolean; texto: string; cuando: string; nivel: 0 | 1 | 2 };
export type ForoParticipado = {
  id: string;
  leccion: string;
  titulo: string;
  resumen: string;
  nuevas: number;
  miPublicacion?: { texto: string; cuando: string };
  hilo?: Respuesta[];
};

export type TipoCalificable = "tarea" | "foro" | "autoevaluacion" | "caso";
export type Calificacion = {
  id: string;
  clave: string;
  descripcion: string;
  tipo: TipoCalificable;
  puntos: string; // "15 / 15" · "4 h"
  resultado: string; // "100%" · "validado" · "sin calificar"
  comentario?: string;
  tieneRubrica?: boolean;
};

export type RolGrupo = "alumno" | "tutor" | "coordinacion" | "control-escolar";
export type Integrante = { id: string; ini: string; nombre: string; rol: RolGrupo; detalle: string; enLinea: boolean; ultima: string };

/* ───────────── mock ───────────── */

export const MODULOS: Modulo[] = [
  { id: "intro", icono: "bombilla", kicker: "Antes de empezar", titulo: "Conozca su programa", meta: "guía del diplomado · 12 min", hechos: 1, total: 1, estado: "completado", luz: "12% 100%" },
  { id: "pre", icono: "entrada", kicker: "Información preliminar", titulo: "Reglas, calendario y acreditación", meta: "8 temas", hechos: 4, total: 8, estado: "en-curso", luz: "88% 0%" },
  { id: "m1", numero: 1, kicker: "Módulo 1", titulo: "Fundamentos y modo B", meta: "64 h · 6 lecciones", hechos: 6, total: 6, estado: "completado", luz: "20% 0%" },
  { id: "m2", numero: 2, kicker: "Módulo 2", titulo: "Abdomen y retroperitoneo", meta: "96 h · 7 lecciones", hechos: 7, total: 7, estado: "completado", luz: "80% 100%" },
  { id: "m3", numero: 3, kicker: "Módulo 3", titulo: "Hígado y vía biliar", meta: "120 h · 8 lecciones", hechos: 8, total: 8, estado: "completado", luz: "50% 0%" },
  { id: "m4", numero: 4, kicker: "Módulo 4", titulo: "Interpretación renal", meta: "88 h · 6 lecciones", hechos: 2, total: 6, estado: "actual", luz: "90% 10%" },
  { id: "m5", numero: 5, kicker: "Módulo 5", titulo: "Vías urinarias y vejiga", meta: "72 h · 5 lecciones", hechos: 0, total: 5, estado: "por-empezar", luz: "10% 90%" },
  { id: "fin", icono: "birrete", kicker: "Cierre", titulo: "Despedida y certificado", meta: "se abre al acreditar las 1000 h", hechos: 0, total: 0, estado: "bloqueado", luz: "60% 100%" },
];

export const TAREAS: Tarea[] = [
  { id: "t1", clave: "Tarea 1 · M1", descripcion: "Informe estructurado de un riñón normal", vence: "23 ago 2026 · 23:00", ventana: "17 ago – 20 sep", estado: "enviada", envios: 1, archivos: 1, puntos: 15, puntosMax: 15, comentarios: "sin-leer" },
  { id: "t2", clave: "Tarea 2 · M2", descripcion: "Caso de litiasis con sombra acústica", vence: "30 ago 2026 · 23:00", ventana: "21 ago – 20 sep", estado: "enviada", envios: 1, archivos: 1, puntos: 13, puntosMax: 15, comentarios: "leidos" },
  { id: "t3", clave: "Tarea 3 · M3", descripcion: "Colecistitis: pared y signo de Murphy", vence: "6 sep 2026 · 23:00", ventana: "28 ago – 20 sep", estado: "enviada", envios: 1, archivos: 1, puntos: 20, puntosMax: 20, comentarios: "leidos" },
  { id: "t4", clave: "Tarea 4 · M4", descripcion: "Caso propio con gradación argumentada", vence: "1 oct 2026 · 23:00", ventana: "22 sep – 5 oct", estado: "pendiente", envios: 0, archivos: 0, diasParaVencer: 3, puntosMax: 25, comentarios: "ninguno" },
  { id: "t5", clave: "Tarea 5 · M5", descripcion: "Vejiga: residuo posmiccional", vence: "15 oct 2026 · 23:00", ventana: "se abre el 6 oct", estado: "no-disponible", envios: 0, archivos: 0, puntosMax: 25, comentarios: "ninguno" },
];

export const ENVIOS: Envio[] = [
  { id: "1214023", archivo: "informe_rinon_normal_v2.pdf", peso: "412.8 KB", fecha: "23 ago 2026 · 21:05", estado: "calificado" },
  { id: "1213871", archivo: "informe_rinon_normal.pdf", peso: "398.1 KB", fecha: "22 ago 2026 · 18:40", estado: "reemplazado" },
];

export const RUBRICA: Rubrica = {
  titulo: "Informe estructurado de ultrasonido",
  niveles: ["Excelente", "Bueno", "Regular", "Deficiente"],
  criterios: [
    { id: "c1", nombre: "Técnica y ventana", elegido: 0, niveles: [{ puntos: 3, texto: "Corte longitudinal completo, ganancia y profundidad correctas." }, { puntos: 2, texto: "Corte adecuado con ajustes menores." }, { puntos: 1, texto: "Ventana parcial del órgano." }, { puntos: 0, texto: "No se reconoce el órgano." }] },
    { id: "c2", nombre: "Hallazgos descritos", elegido: 0, niveles: [{ puntos: 4, texto: "Describe forma, eco y cortical con precisión." }, { puntos: 3, texto: "Describe lo principal con claridad." }, { puntos: 2, texto: "Descripción vaga o incompleta." }, { puntos: 1, texto: "Hallazgos ausentes o erróneos." }] },
    { id: "c3", nombre: "Medidas", elegido: 0, niveles: [{ puntos: 3, texto: "Longitud y cortical medidas en el plano correcto." }, { puntos: 2, texto: "Mide lo necesario con errores menores." }, { puntos: 1, texto: "Medidas fuera de plano." }, { puntos: 0, texto: "Sin medidas." }] },
    { id: "c4", nombre: "Impresión diagnóstica", elegido: 0, niveles: [{ puntos: 3, texto: "Conclusión coherente con lo descrito." }, { puntos: 2, texto: "Conclusión correcta pero escueta." }, { puntos: 1, texto: "Conclusión débil." }, { puntos: 0, texto: "Sin conclusión." }] },
    { id: "c5", nombre: "Redacción del informe", elegido: 0, niveles: [{ puntos: 2, texto: "Estructura completa, sin errores." }, { puntos: 1, texto: "Comprensible con errores mínimos." }, { puntos: 0.5, texto: "Errores que dificultan la lectura." }, { puntos: 0, texto: "No sigue el formato." }] },
  ],
};

export const FOROS: ForoParticipado[] = [
  {
    id: "f1",
    leccion: "Módulo 4 · Lección 3 · Hidronefrosis",
    titulo: "¿Qué los hace dudar entre grado II y III?",
    resumen: "1 publicación · 5 respuestas · última hace 2 h",
    nuevas: 2,
    miPublicacion: { texto: "Me cuesta cerrar el grado cuando la cortical mide entre 8 y 10 mm. En mis casos de guardia termino reportando \"II–III\" y siento que no es un informe útil.", cuando: "18 sep · 21:40" },
    hilo: [
      { id: "r1", ini: "AS", autor: "Dr. Alejandro Sandoval", docente: true, texto: "Buena pregunta. Mida en los dos polos y en el mismo plano: si la cortical se sostiene bajo 10 mm, es III. El \"II–III\" no ayuda al clínico.", cuando: "hace 3 h", nivel: 0 },
      { id: "r2", ini: "SR", autor: "Dra. Sofía Ramírez", texto: "Gracias, doctor. ¿Y si solo tengo ventana del polo superior?", cuando: "hace 2 h", nivel: 1 },
      { id: "r3", ini: "AS", autor: "Dr. Alejandro Sandoval", docente: true, texto: "Entonces repórtelo explícito: \"medido en polo superior\". Es honesto y útil.", cuando: "hace 2 h", nivel: 2 },
      { id: "r4", ini: "KM", autor: "Dra. Karla Méndez", texto: "A mí me ayudó cambiar a corte coronal por flanco para el polo inferior.", cuando: "hace 1 h", nivel: 0 },
    ],
  },
  { id: "f2", leccion: "Módulo 1 · Lección 6 · Cierre", titulo: "Presente su primer caso de modo B", resumen: "1 publicación · 8 respuestas · cerrado el 30 ago", nuevas: 0 },
  { id: "f3", leccion: "Módulo 2 · Lección 4", titulo: "Litiasis sin sombra: ¿qué la delata?", resumen: "1 publicación · 3 respuestas · última ayer", nuevas: 1 },
  { id: "f4", leccion: "Módulo 3 · Lección 2", titulo: "Vesícula en paciente en ayuno prolongado", resumen: "1 publicación · 6 respuestas · cerrado el 12 sep", nuevas: 0 },
];

export const CALIFICACIONES: Calificacion[] = [
  { id: "g1", clave: "Tarea 1 · M1", descripcion: "Informe estructurado de un riñón normal", tipo: "tarea", puntos: "15 / 15", resultado: "100%", comentario: "Muy buen informe, Sofía. Agregue el IR cuando use Doppler.", tieneRubrica: true },
  { id: "g2", clave: "Foro · M1 · L6", descripcion: "Presente su primer caso de modo B", tipo: "foro", puntos: "10 / 10", resultado: "100%", comentario: "Aporte claro y bien argumentado." },
  { id: "g3", clave: "Autoevaluación · M2", descripcion: "Punto de control: litiasis", tipo: "autoevaluacion", puntos: "4 / 5", resultado: "80%" },
  { id: "g4", clave: "Tarea 2 · M2", descripcion: "Caso de litiasis con sombra acústica", tipo: "tarea", puntos: "13 / 15", resultado: "87%", comentario: "Faltó describir el tamaño del cálculo.", tieneRubrica: true },
  { id: "g5", clave: "Caso · Bitácora", descripcion: "Riñón derecho · corte longitudinal", tipo: "caso", puntos: "4 h", resultado: "validado", comentario: "Buena ventana; cortical bien medida." },
  { id: "g6", clave: "Tarea 3 · M3", descripcion: "Colecistitis: pared y signo de Murphy", tipo: "tarea", puntos: "20 / 20", resultado: "100%", tieneRubrica: true },
  { id: "g7", clave: "Tarea 4 · M4", descripcion: "Caso propio con gradación argumentada", tipo: "tarea", puntos: "— / 25", resultado: "sin calificar" },
];

export const INTEGRANTES: Integrante[] = [
  { id: "p1", ini: "AS", nombre: "Dr. Alejandro Sandoval", rol: "tutor", detalle: "Renal y abdomen · titular del grupo", enLinea: true, ultima: "en línea" },
  { id: "p2", ini: "GH", nombre: "Mtro. Gustavo Hernández", rol: "coordinacion", detalle: "avales, calendario y acreditación", enLinea: false, ultima: "hace 3 h" },
  { id: "p3", ini: "LP", nombre: "Lic. Laura Pineda", rol: "control-escolar", detalle: "inscripción, pagos y matrícula", enLinea: true, ultima: "en línea" },
  { id: "a1", ini: "EA", nombre: "Dra. Estefany Aguilar", rol: "alumno", detalle: "Medicina familiar · Monterrey", enLinea: false, ultima: "hace 3 h" },
  { id: "a2", ini: "AA", nombre: "Dr. Alexander Aldrete", rol: "alumno", detalle: "Urgencias · Puebla", enLinea: true, ultima: "en línea" },
  { id: "a3", ini: "JA", nombre: "Dr. Josué Arango", rol: "alumno", detalle: "Medicina interna · Guadalajara", enLinea: false, ultima: "ayer" },
  { id: "a4", ini: "KM", nombre: "Dra. Karla Méndez", rol: "alumno", detalle: "Medicina interna · Monterrey", enLinea: true, ultima: "en línea" },
  { id: "a5", ini: "PB", nombre: "Dr. Pedro Budib", rol: "alumno", detalle: "Radiología · Mérida", enLinea: false, ultima: "hace 2 días" },
];
