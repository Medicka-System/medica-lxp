/**
 * Contenido ESTRUCTURADO del caso educativo (§6/§7A · "Opción B").
 *
 * El caso NO guarda la verdad del estudio como texto aplanado (lossy): guarda un
 * SNAPSHOT autocontenido de la estructura del reporte (secciones/tablas/valores),
 * la MISMA forma que `lxp.reportes.contenido` + la `estructura` de la plantilla,
 * copiada DENTRO del caso (no referencia la plantilla — sobrevive a que ésta se
 * edite o borre). Es la fuente de verdad; el texto `hallazgos` pasa a ser un índice
 * DERIVADO (búsqueda / vistas simples / compatibilidad con casos viejos).
 *
 * Un solo contrato para los tres orígenes que alimentan un caso:
 *   1) reporte → caso  (apps/api · generarCaso): pasa la estructura completa.
 *   2) bitácora del alumno (subida directa): sintetiza desde la ficha (§ fichaAContenidoCaso).
 *   3) subida en Casos (staff): misma síntesis desde la ficha del editor.
 *
 * Tipos "laxos" (string en `tipo`) a propósito: es el contrato de ALMACÉN/wire. El
 * front conserva sus uniones ricas para editar/renderizar (structuralmente compatibles).
 */
import { z } from 'zod';

/** Campo dentro de una sección estructurada (snapshot del campo del reporte). */
export const campoContenidoCasoSchema = z.object({
  id: z.string(),
  /** texto|multitexto|numero|medida|fecha|tabla|sino|opcion|imagen|galeria|guia|titulo */
  tipo: z.string(),
  nombre: z.string().default(''),
  /** `medida`: unidad (mm, cm, cc…). */
  unidad: z.string().optional(),
  /** `opcion`: valores posibles. */
  opciones: z.array(z.string()).optional(),
  /** `tabla`: encabezados de columna. */
  columnas: z.array(z.string()).optional(),
  /** `tabla`: etiquetas de fila. */
  filas: z.array(z.string()).optional(),
  span: z.number().optional(),
  origen: z.string().optional(),
  refUrl: z.string().optional(),
  guia: z.string().optional(),
  bloqueado: z.boolean().optional(),
  /** `multitexto` RICO: el valor es HTML (editor TipTap). El índice derivado lo aplana a texto. */
  rico: z.boolean().optional(),
});
export type CampoContenidoCaso = z.infer<typeof campoContenidoCasoSchema>;

/** Sección/card del estudio (encabezado o hallazgos). */
export const seccionContenidoCasoSchema = z.object({
  id: z.string(),
  /** encabezado|hallazgos */
  tipo: z.string(),
  titulo: z.string().default(''),
  columnas: z.number().default(1),
  campos: z.array(campoContenidoCasoSchema).default([]),
});
export type SeccionContenidoCaso = z.infer<typeof seccionContenidoCasoSchema>;

/** Traza del origen del snapshot (de qué reporte/plantilla salió, o si es ficha manual). */
export const fuenteContenidoCasoSchema = z.object({
  tipo: z.enum(['reporte', 'ficha']).optional(),
  reporteId: z.string().optional(),
  plantillaId: z.string().optional(),
  plantillaNombre: z.string().optional(),
  tipoEstudio: z.string().optional(),
});
export type FuenteContenidoCaso = z.infer<typeof fuenteContenidoCasoSchema>;

/** Snapshot estructurado completo del caso (lo que persiste `contenido_estructurado`). */
export const contenidoEstructuradoCasoSchema = z.object({
  secciones: z.array(seccionContenidoCasoSchema).default([]),
  /** id de campo → valor (texto, boolean, matriz de tabla `datos[fila][col]`, galería…). */
  valores: z.record(z.unknown()).default({}),
  impresion: z.string().optional(),
  fuente: fuenteContenidoCasoSchema.optional(),
});
export type ContenidoEstructuradoCaso = z.infer<typeof contenidoEstructuradoCasoSchema>;

/** true si el snapshot tiene algo que mostrar (al menos una sección con campos). */
export function tieneContenidoEstructurado(c: ContenidoEstructuradoCaso | null | undefined): boolean {
  return !!c && Array.isArray(c.secciones) && c.secciones.some((s) => (s.campos?.length ?? 0) > 0);
}

/* ───────────────────────── aplanado canónico (índice DERIVADO) ───────────────────────── */

function valorTexto(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}

/**
 * Convierte HTML (del editor rico) a TEXTO PLANO para el índice derivado (card / búsqueda /
 * Eco / Ateneo). No es un sanitizador de seguridad: solo quita etiquetas, decodifica las
 * entidades comunes y normaliza saltos de línea. Los bloques (p/div/li/tr/br/encabezados)
 * pasan a salto de línea para conservar la legibilidad de la primera línea (título de card).
 */
export function textoPlanoDeHtml(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '')) // colapsa líneas vacías repetidas
    .join('\n')
    .trim();
}

type PieGaleria = { pie?: string };
function piesGaleria(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : v && typeof v === 'object' ? (v as { imagenes?: unknown }).imagenes : null;
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x, i) => (x && typeof x === 'object' ? { i, pie: (x as PieGaleria).pie } : { i, pie: undefined }))
    .filter((x): x is { i: number; pie: string } => typeof x.pie === 'string' && x.pie.trim().length > 0)
    .map((x) => `  ${x.i + 1}. ${x.pie.trim()}`);
}

/**
 * Aplana una tabla a texto legible CONSERVANDO todos los valores (§ fix de las 3 fugas):
 *   · filas dinámicas más allá de `filas[]`  → nº de filas = máx(etiquetas, datos capturados).
 *   · tabla sin encabezados (`columnas=[]`)  → escribe solo el valor (no descarta la fila).
 *   · columnas capturadas más allá de `columnas[]` → nº de cols = máx(encabezados, celdas).
 */
function aplanarTabla(nombre: string, columnas: string[], filas: string[], v: unknown): string {
  const datos: unknown[][] = Array.isArray(v) ? (v as unknown[][]) : [];
  const nFilas = Math.max(filas.length, datos.length);
  const rows: string[] = [];
  for (let r = 0; r < nFilas; r++) {
    const fila = Array.isArray(datos[r]) ? (datos[r] as unknown[]) : [];
    const nCols = Math.max(columnas.length, fila.length);
    const celdas: string[] = [];
    for (let ci = 0; ci < nCols; ci++) {
      const val = valorTexto(fila[ci]);
      if (!val) continue;
      const col = (columnas[ci] ?? '').trim();
      celdas.push(col ? `${col}: ${val}` : val);
    }
    if (!celdas.length) continue;
    const etiqueta = (filas[r] ?? '').trim() || `Fila ${r + 1}`;
    rows.push(`  ${etiqueta} — ${celdas.join(', ')}`);
  }
  if (!rows.length) return '';
  return `${(nombre || 'Tabla').trim()}:\n${rows.join('\n')}`;
}

/**
 * Aplana el contenido estructurado a texto legible y COMPLETO (índice derivado). No es la
 * fuente de verdad — es para búsqueda, vistas simples y compatibilidad. Ningún valor de
 * tabla se pierde (a diferencia del aplanado previo). Salta guía/título/imagen del informe.
 */
export function aplanarContenidoCaso(contenido: ContenidoEstructuradoCaso | null | undefined): string {
  const secciones = contenido?.secciones ?? [];
  const valores = contenido?.valores ?? {};
  const partes: string[] = [];
  for (const s of secciones) {
    if (s.tipo === 'encabezado') continue;
    const soloCampo = (s.campos ?? []).length === 1;
    const lineas: string[] = [];
    for (const c of s.campos ?? []) {
      const nombre = (c.nombre ?? '').trim();
      const v = valores[c.id];
      if (c.tipo === 'guia' || c.tipo === 'titulo' || c.tipo === 'imagen') continue;
      if (c.tipo === 'galeria') {
        for (const linea of piesGaleria(v)) lineas.push(linea);
        continue;
      }
      if (c.tipo === 'sino') {
        if (typeof v === 'boolean') lineas.push(`${nombre}: ${v ? 'Sí' : 'No'}`);
        continue;
      }
      if (c.tipo === 'tabla') {
        const linea = aplanarTabla(nombre, c.columnas ?? [], c.filas ?? [], v);
        if (linea) lineas.push(linea);
        continue;
      }
      // Campo RICO (HTML del editor): se aplana a texto plano para el índice derivado.
      const txt = c.rico ? textoPlanoDeHtml(valorTexto(v)) : valorTexto(v);
      if (!txt) continue;
      const unidad = c.tipo === 'medida' && c.unidad ? ` ${c.unidad}` : '';
      lineas.push((c.tipo === 'multitexto' || c.rico) && soloCampo ? txt : `${nombre}: ${txt}${unidad}`);
    }
    if (lineas.length) {
      const titulo = (s.titulo ?? '').trim();
      partes.push(titulo ? `${titulo.toUpperCase()}\n${lineas.join('\n')}` : lineas.join('\n'));
    }
  }
  const imp = valorTexto(contenido?.impresion);
  if (imp) partes.push(`IMPRESIÓN DIAGNÓSTICA\n${imp}`);
  return partes.join('\n\n').trim();
}

/* ───────────────────────── síntesis desde la ficha (orígenes manuales) ───────────────────────── */

/** Ficha capturable de un caso manual (bitácora del alumno / subida directa del staff). */
export type FichaCaso = {
  organo?: string | null;
  patologia?: string | null;
  tecnica?: string | null;
  equipo?: string | null;
  vineta?: string | null;
  hallazgos?: string | null;
  /** Diagnóstico: presuntivo (alumno) o correcto (staff). */
  diagnostico?: string | null;
};

/**
 * Sintetiza un `ContenidoEstructuradoCaso` UNIFORME desde la ficha de un caso manual (sin
 * reporte de origen). Así los tres orígenes convergen a la misma forma y los consumidores
 * leen una sola estructura. Solo declara los campos con valor.
 */
export function fichaAContenidoCaso(ficha: FichaCaso): ContenidoEstructuradoCaso {
  const campos: CampoContenidoCaso[] = [];
  const valores: Record<string, unknown> = {};
  const put = (id: string, nombre: string, tipo: string, val: string | null | undefined) => {
    const t = (val ?? '').trim();
    if (!t) return;
    campos.push({ id, nombre, tipo });
    valores[id] = t;
  };
  put('organo', 'Órgano / región', 'texto', ficha.organo);
  put('patologia', 'Patología', 'texto', ficha.patologia);
  put('tecnica', 'Técnica', 'texto', ficha.tecnica);
  put('equipo', 'Equipo', 'texto', ficha.equipo);
  put('vineta', 'Viñeta clínica', 'multitexto', ficha.vineta);
  put('hallazgos', 'Hallazgos', 'multitexto', ficha.hallazgos);
  put('diagnostico', 'Diagnóstico', 'texto', ficha.diagnostico);
  return {
    secciones: campos.length
      ? [{ id: 'ficha', tipo: 'hallazgos', titulo: 'Ficha del caso', columnas: 1, campos }]
      : [],
    valores,
    fuente: { tipo: 'ficha' },
  };
}
