/**
 * Parseo PURO de reactivos de autoevaluación desde una matriz (filas de CSV/Excel).
 * Sin IO: recibe la matriz ya leída (por exceljs en el servicio) y produce reactivos
 * normalizados + una lista de errores por fila. Es lo que hace valioso el import en
 * el `api` (§2): valida y estructura antes de poblar el banco `lxp.reactivos`.
 *
 * Formato esperado (primera fila = encabezado, orden libre):
 *   enunciado | tipo | opciones | correcta | puntaje | dominio | retro
 *   · opciones: "texto1 | texto2 | texto3"  o  "a) texto1 | b) texto2"
 *   · correcta: clave o texto de la(s) opción(es) correcta(s); varias → "a,c"
 *   · tipo: opcion_multiple | multi | verdadero_falso | abierta (se infiere si falta)
 */

export type ReactivoTipo = 'opcion_multiple' | 'multi' | 'verdadero_falso' | 'abierta';

export interface OpcionReactivo {
  clave: string;
  texto: string;
}

export interface ReactivoImport {
  orden: number;
  tipo: ReactivoTipo;
  enunciado: string;
  opciones: OpcionReactivo[];
  correcta: string | string[] | null;
  puntaje: number;
  dominio?: string;
  retro?: string;
}

export interface ResultadoImport {
  reactivos: ReactivoImport[];
  errores: string[];
}

const CLAVES = 'abcdefghijklmnopqrstuvwxyz';

/** Normaliza a minúsculas sin acentos (para casar encabezados y claves). */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

/** Dominios I-AIM válidos (enum `lxp.dominio_iaim`). Mapea texto libre → enum. */
const DOMINIOS = new Set(['indicacion', 'adquisicion', 'interpretacion', 'decision_medica']);
function normalizarDominio(v: string): string | undefined {
  const n = norm(v).replace(/\s+/g, '_');
  if (!n) return undefined;
  if (DOMINIOS.has(n)) return n;
  if (n === 'i' || n.startsWith('indic')) return 'indicacion';
  if (n === 'a' || n.startsWith('adquis')) return 'adquisicion';
  if (n.startsWith('interp')) return 'interpretacion';
  if (n === 'm' || n.startsWith('decision') || n.startsWith('medica')) return 'decision_medica';
  return undefined;
}

const SINONIMOS: Record<string, string> = {
  enunciado: 'enunciado',
  pregunta: 'enunciado',
  tipo: 'tipo',
  opciones: 'opciones',
  opcion: 'opciones',
  correcta: 'correcta',
  correctas: 'correcta',
  respuesta: 'correcta',
  puntaje: 'puntaje',
  puntos: 'puntaje',
  valor: 'puntaje',
  dominio: 'dominio',
  dominio_iaim: 'dominio',
  iaim: 'dominio',
  retro: 'retro',
  retroalimentacion: 'retro',
  feedback: 'retro',
};

function mapaEncabezado(fila: string[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  fila.forEach((celda, i) => {
    const campo = SINONIMOS[norm(String(celda ?? ''))];
    if (campo && !(campo in mapa)) mapa[campo] = i;
  });
  return mapa;
}

function separarOpciones(celda: string): OpcionReactivo[] {
  if (!celda.trim()) return [];
  const partes = celda
    .split(/[|;]/)
    .map((p) => p.trim())
    .filter(Boolean);
  return partes.map((p, i) => {
    // "a) texto" o "a. texto" → clave explícita; si no, clave automática a,b,c…
    const m = p.match(/^([A-Za-z])[).:-]\s*(.+)$/);
    if (m) return { clave: m[1].toLowerCase(), texto: m[2].trim() };
    return { clave: CLAVES[i] ?? String(i + 1), texto: p };
  });
}

/** Resuelve la(s) correcta(s) a clave(s), casando por clave o por texto de opción. */
function resolverCorrecta(
  celda: string,
  opciones: OpcionReactivo[],
): string[] {
  const tokens = celda
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean);
  const claves: string[] = [];
  for (const t of tokens) {
    const porClave = opciones.find((o) => o.clave === norm(t));
    if (porClave) {
      claves.push(porClave.clave);
      continue;
    }
    const porTexto = opciones.find((o) => norm(o.texto) === norm(t));
    if (porTexto) claves.push(porTexto.clave);
  }
  return claves;
}

function inferirTipo(explicito: string, opciones: OpcionReactivo[], correctas: string[]): ReactivoTipo {
  const t = norm(explicito);
  if (t.startsWith('abie')) return 'abierta';
  if (t.includes('verdadero') || t === 'vf' || t.includes('falso')) return 'verdadero_falso';
  if (t === 'multi' || t.includes('multiple_respuesta') || correctas.length > 1) return 'multi';
  if (t === 'opcion_multiple' || t === 'opcion' || opciones.length > 0) return 'opcion_multiple';
  return 'abierta';
}

/** Convierte la matriz (con encabezado) en reactivos normalizados + errores por fila. */
export function parsearReactivos(filas: string[][]): ResultadoImport {
  const errores: string[] = [];
  if (!filas.length) return { reactivos: [], errores: ['El archivo no tiene filas.'] };

  const encabezado = mapaEncabezado(filas[0]);
  if (!('enunciado' in encabezado)) {
    return { reactivos: [], errores: ['Falta la columna "enunciado" en el encabezado.'] };
  }

  const cel = (fila: string[], campo: string): string => {
    const i = encabezado[campo];
    return i === undefined ? '' : String(fila[i] ?? '').trim();
  };

  const reactivos: ReactivoImport[] = [];
  for (let r = 1; r < filas.length; r++) {
    const fila = filas[r];
    if (!fila || fila.every((c) => String(c ?? '').trim() === '')) continue; // fila vacía

    const enunciado = cel(fila, 'enunciado');
    if (!enunciado) {
      errores.push(`Fila ${r + 1}: sin enunciado, se omite.`);
      continue;
    }
    const opciones = separarOpciones(cel(fila, 'opciones'));
    const correctas = resolverCorrecta(cel(fila, 'correcta'), opciones);
    const tipo = inferirTipo(cel(fila, 'tipo'), opciones, correctas);

    if (tipo !== 'abierta' && opciones.length === 0) {
      errores.push(`Fila ${r + 1}: "${enunciado.slice(0, 40)}" sin opciones; se omite.`);
      continue;
    }
    if (tipo !== 'abierta' && correctas.length === 0) {
      errores.push(`Fila ${r + 1}: "${enunciado.slice(0, 40)}" sin respuesta correcta válida; se omite.`);
      continue;
    }

    const puntajeRaw = Number(cel(fila, 'puntaje'));
    const puntaje = Number.isFinite(puntajeRaw) && puntajeRaw > 0 ? puntajeRaw : 1;
    const dominio = normalizarDominio(cel(fila, 'dominio'));
    const retro = cel(fila, 'retro') || undefined;

    reactivos.push({
      orden: reactivos.length + 1,
      tipo,
      enunciado,
      opciones,
      correcta: tipo === 'abierta' ? null : tipo === 'multi' ? correctas : correctas[0],
      puntaje,
      dominio,
      retro,
    });
  }

  return { reactivos, errores };
}
