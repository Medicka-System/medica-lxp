/**
 * ══════════════════════════════════════════════════════════════════════════════
 * MOTOR GENÉRICO de calculadoras del catálogo (§6 · lxp.calculadoras.definicion).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Las calculadoras DESTACADAS (volumen vesical, FEVI, edad gestacional) son código
 * bespoke con fórmulas fijas. Este motor cubre el CATÁLOGO configurable por la escuela:
 * cada fila trae una `definicion` (jsonb) con `entradas` (inputs), una `formula` (texto)
 * y la `salida` (unidad/decimales/bandas). El motor la valida, renderiza y CALCULA.
 *
 * SEGURIDAD (el "runner seguro" que pedía el pendiente): NO hay `eval`, `Function`, ni
 * acceso a propiedades/globales. La fórmula se compila con un parser propio de descenso
 * recursivo que SOLO admite: números, variables (= nombres de entradas + constantes),
 * operadores aritméticos `+ - * / % ^`, paréntesis y un catálogo CERRADO de funciones
 * (`sqrt`, `abs`, `ln`, `log10`, `exp`, `pow`, `min`, `max`, `round`, `floor`, `ceil`).
 * Cualquier identificador desconocido o carácter no permitido hace que la definición se
 * RECHACE al parsearla (→ la UI cae al placeholder, nunca ejecuta algo raro).
 *
 * Módulo PURO (sin React, sin `server-only`): lo usa `calculadoras-datos.ts` (parseo del
 * jsonb al leer de BD) y el componente cliente (cálculo reactivo). Testeable sin navegador.
 */

import { aNumero } from './calculadoras-formulas';

/* ─────────────────────────── Tipos de la definición ─────────────────────────── */

/** Una entrada (input numérico) de una calculadora del catálogo. */
export type EntradaCalculadora = {
  /** Identificador usado en la fórmula (`[a-zA-Z_][a-zA-Z0-9_]*`). */
  nombre: string;
  etiqueta: string;
  unidad?: string;
  min?: number;
  max?: number;
  paso?: number;
};

/** Banda de interpretación de la salida (nota + tono por rango). La 1ª que coincide gana. */
export type BandaCalculadora = {
  /** Cota inferior inclusiva; sin definir = sin cota. */
  min?: number;
  /** Cota superior inclusiva; sin definir = sin cota. */
  max?: number;
  texto: string;
  tono?: 'primary' | 'warning' | 'info';
};

/** Definición ejecutable de una calculadora (contenido de `lxp.calculadoras.definicion`). */
export type DefinicionCalculadora = {
  entradas: EntradaCalculadora[];
  formula: string;
  salida: {
    unidad?: string;
    decimales?: number;
    bandas?: BandaCalculadora[];
  };
};

/** Resultado ya formateado para pintar en la tarjeta. */
export type ResultadoCalc = {
  valor: string;
  unidad?: string;
  nota?: string;
  tono: 'primary' | 'warning' | 'info';
};

/* ─────────────────────────── Evaluador seguro ─────────────────────────── */

type Nodo =
  | { t: 'num'; v: number }
  | { t: 'var'; n: string }
  | { t: 'un'; a: Nodo }
  | { t: 'bin'; op: '+' | '-' | '*' | '/' | '%' | '^'; a: Nodo; b: Nodo }
  | { t: 'call'; fn: string; args: Nodo[] };

/** true si `obj` tiene la clave como PROPIA (no heredada de Object.prototype, p. ej.
 *  `constructor`/`toString`) — imprescindible al buscar en mapas con nombres del usuario. */
const tiene = (obj: object, k: string): boolean => Object.prototype.hasOwnProperty.call(obj, k);

/** Constantes disponibles como identificadores en la fórmula. */
const CONSTANTES: Record<string, number> = { pi: Math.PI, e: Math.E };

/** Catálogo CERRADO de funciones permitidas (no hay forma de invocar otra cosa). */
const FUNCIONES: Record<string, (args: number[]) => number> = {
  sqrt: (a) => Math.sqrt(a[0] ?? NaN),
  abs: (a) => Math.abs(a[0] ?? NaN),
  ln: (a) => Math.log(a[0] ?? NaN),
  log10: (a) => Math.log10(a[0] ?? NaN),
  exp: (a) => Math.exp(a[0] ?? NaN),
  pow: (a) => Math.pow(a[0] ?? NaN, a[1] ?? NaN),
  min: (a) => Math.min(...a),
  max: (a) => Math.max(...a),
  round: (a) => Math.round(a[0] ?? NaN),
  floor: (a) => Math.floor(a[0] ?? NaN),
  ceil: (a) => Math.ceil(a[0] ?? NaN),
};

const MAX_FORMULA = 500;

type Token = { t: 'num'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };

function tokenizar(src: string): Token[] {
  const tokens: Token[] = [];
  const esDigito = (c: string) => c >= '0' && c <= '9';
  const esAlfa = (c: string) => /[a-zA-Z_]/.test(c);
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }
    if (esDigito(c) || (c === '.' && esDigito(src[i + 1] ?? ''))) {
      let j = i + 1;
      while (j < src.length && (esDigito(src[j]!) || src[j] === '.')) j++;
      const num = Number(src.slice(i, j));
      if (!Number.isFinite(num)) throw new Error('número inválido');
      tokens.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    if (esAlfa(c)) {
      let j = i + 1;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j]!)) j++;
      tokens.push({ t: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    if ('+-*/%^(),'.includes(c)) {
      tokens.push({ t: 'op', v: c });
      i++;
      continue;
    }
    throw new Error(`carácter no permitido: ${c}`);
  }
  return tokens;
}

/** Compila una fórmula a AST. Lanza si hay sintaxis o tokens inválidos. */
function compilar(expr: string): Nodo {
  if (expr.length > MAX_FORMULA) throw new Error('fórmula demasiado larga');
  const toks = tokenizar(expr);
  let pos = 0;
  const peek = (): Token | undefined => toks[pos];
  const esOp = (v: string): boolean => {
    const t = peek();
    return !!t && t.t === 'op' && t.v === v;
  };
  const comer = (v: string): void => {
    if (!esOp(v)) throw new Error(`se esperaba "${v}"`);
    pos++;
  };

  const parseExpr = (): Nodo => {
    let n = parseTerm();
    while (esOp('+') || esOp('-')) {
      const op = (toks[pos++] as Token & { v: '+' | '-' }).v;
      n = { t: 'bin', op, a: n, b: parseTerm() };
    }
    return n;
  };
  const parseTerm = (): Nodo => {
    let n = parseFactor();
    while (esOp('*') || esOp('/') || esOp('%')) {
      const op = (toks[pos++] as Token & { v: '*' | '/' | '%' }).v;
      n = { t: 'bin', op, a: n, b: parseFactor() };
    }
    return n;
  };
  const parseFactor = (): Nodo => {
    const base = parseUnary();
    if (esOp('^')) {
      pos++;
      return { t: 'bin', op: '^', a: base, b: parseFactor() }; // ^ asociativo a la derecha
    }
    return base;
  };
  const parseUnary = (): Nodo => {
    if (esOp('-')) {
      pos++;
      return { t: 'un', a: parseUnary() };
    }
    if (esOp('+')) {
      pos++;
      return parseUnary();
    }
    return parsePrimary();
  };
  const parsePrimary = (): Nodo => {
    const t = peek();
    if (!t) throw new Error('expresión incompleta');
    if (t.t === 'num') {
      pos++;
      return { t: 'num', v: t.v };
    }
    if (t.t === 'id') {
      pos++;
      if (esOp('(')) {
        pos++;
        const args: Nodo[] = [];
        if (!esOp(')')) {
          args.push(parseExpr());
          while (esOp(',')) {
            pos++;
            args.push(parseExpr());
          }
        }
        comer(')');
        return { t: 'call', fn: t.v, args };
      }
      return { t: 'var', n: t.v };
    }
    if (esOp('(')) {
      pos++;
      const n = parseExpr();
      comer(')');
      return n;
    }
    throw new Error('token inesperado');
  };

  const nodo = parseExpr();
  if (pos !== toks.length) throw new Error('tokens sobrantes');
  return nodo;
}

function evaluar(n: Nodo, vars: Record<string, number>): number {
  switch (n.t) {
    case 'num':
      return n.v;
    case 'var': {
      if (tiene(CONSTANTES, n.n)) return CONSTANTES[n.n]!;
      const v = tiene(vars, n.n) ? vars[n.n] : undefined;
      if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`variable sin resolver: ${n.n}`);
      return v;
    }
    case 'un':
      return -evaluar(n.a, vars);
    case 'bin': {
      const a = evaluar(n.a, vars);
      const b = evaluar(n.b, vars);
      switch (n.op) {
        case '+':
          return a + b;
        case '-':
          return a - b;
        case '*':
          return a * b;
        case '/':
          return a / b;
        case '%':
          return a % b;
        case '^':
          return Math.pow(a, b);
      }
      throw new Error('operador desconocido');
    }
    case 'call': {
      if (!tiene(FUNCIONES, n.fn)) throw new Error(`función no permitida: ${n.fn}`);
      return FUNCIONES[n.fn]!(n.args.map((a) => evaluar(a, vars)));
    }
  }
}

/** Recolecta los nombres de variable usados por la fórmula (para validar contra entradas). */
function variablesDe(n: Nodo, acc: Set<string> = new Set()): Set<string> {
  switch (n.t) {
    case 'var':
      acc.add(n.n);
      break;
    case 'un':
      variablesDe(n.a, acc);
      break;
    case 'bin':
      variablesDe(n.a, acc);
      variablesDe(n.b, acc);
      break;
    case 'call':
      n.args.forEach((a) => variablesDe(a, acc));
      break;
  }
  return acc;
}

/** true si TODA función invocada por el AST pertenece al catálogo cerrado permitido. */
function funcionesValidas(n: Nodo): boolean {
  switch (n.t) {
    case 'num':
    case 'var':
      return true;
    case 'un':
      return funcionesValidas(n.a);
    case 'bin':
      return funcionesValidas(n.a) && funcionesValidas(n.b);
    case 'call':
      return tiene(FUNCIONES, n.fn) && n.args.every(funcionesValidas);
  }
}

/* ─────────────────────────── Parseo de la definición (borde BD) ─────────────────────────── */

const ID_ENTRADA = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Valida y normaliza el jsonb `definicion` de una calculadora. Devuelve `null` si la
 * forma es inválida, la fórmula no compila, o usa una variable que no es entrada ni
 * constante. Nunca lanza. `null` ⇒ la calculadora se muestra pero no se ejecuta.
 */
export function parseDefinicion(raw: unknown): DefinicionCalculadora | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const entradasRaw = o.entradas;
  const formula = o.formula;
  if (!Array.isArray(entradasRaw) || entradasRaw.length === 0) return null;
  if (typeof formula !== 'string' || formula.trim() === '' || formula.length > MAX_FORMULA) return null;

  const entradas: EntradaCalculadora[] = [];
  const nombres = new Set<string>();
  for (const e of entradasRaw) {
    if (!e || typeof e !== 'object') return null;
    const eo = e as Record<string, unknown>;
    const nombre = eo.nombre;
    const etiqueta = eo.etiqueta;
    if (typeof nombre !== 'string' || !ID_ENTRADA.test(nombre) || tiene(CONSTANTES, nombre)) return null;
    if (typeof etiqueta !== 'string' || etiqueta.trim() === '') return null;
    if (nombres.has(nombre)) return null;
    nombres.add(nombre);
    entradas.push({
      nombre,
      etiqueta,
      unidad: typeof eo.unidad === 'string' ? eo.unidad : undefined,
      min: typeof eo.min === 'number' ? eo.min : undefined,
      max: typeof eo.max === 'number' ? eo.max : undefined,
      paso: typeof eo.paso === 'number' ? eo.paso : undefined,
    });
  }

  const salida: DefinicionCalculadora['salida'] = {};
  const salidaRaw = o.salida;
  if (salidaRaw && typeof salidaRaw === 'object') {
    const so = salidaRaw as Record<string, unknown>;
    if (typeof so.unidad === 'string') salida.unidad = so.unidad;
    if (typeof so.decimales === 'number' && so.decimales >= 0 && so.decimales <= 6) {
      salida.decimales = Math.floor(so.decimales);
    }
    if (Array.isArray(so.bandas)) {
      const bandas: BandaCalculadora[] = [];
      for (const b of so.bandas) {
        if (!b || typeof b !== 'object') continue;
        const bo = b as Record<string, unknown>;
        if (typeof bo.texto !== 'string' || bo.texto.trim() === '') continue;
        bandas.push({
          texto: bo.texto,
          min: typeof bo.min === 'number' ? bo.min : undefined,
          max: typeof bo.max === 'number' ? bo.max : undefined,
          tono: bo.tono === 'warning' || bo.tono === 'info' || bo.tono === 'primary' ? bo.tono : undefined,
        });
      }
      if (bandas.length) salida.bandas = bandas;
    }
  }

  // Compila la fórmula (rechaza sintaxis inválida / caracteres no permitidos) y verifica
  // que toda variable usada exista como entrada o constante.
  let nodo: Nodo;
  try {
    nodo = compilar(formula);
  } catch {
    return null;
  }
  if (!funcionesValidas(nodo)) return null; // ninguna función fuera del catálogo cerrado
  for (const v of variablesDe(nodo)) {
    if (!tiene(CONSTANTES, v) && !nombres.has(v)) return null;
  }

  return { entradas, formula, salida };
}

/* ─────────────────────────── Cálculo reactivo ─────────────────────────── */

/**
 * Resuelve el resultado de una calculadora con los valores (texto) del formulario.
 * Devuelve `null` si falta alguna entrada, no es numérica, o el cálculo no es finito
 * (p. ej. división entre cero) — la UI muestra entonces el aviso "ingresa los valores".
 */
export function resolverCalculo(
  def: DefinicionCalculadora,
  valores: Record<string, string>,
): ResultadoCalc | null {
  const vars: Record<string, number> = {};
  for (const ent of def.entradas) {
    const n = aNumero(valores[ent.nombre] ?? '');
    if (n === null) return null;
    vars[ent.nombre] = n;
  }
  let nodo: Nodo;
  try {
    nodo = compilar(def.formula);
  } catch {
    return null;
  }
  let r: number;
  try {
    r = evaluar(nodo, vars);
  } catch {
    return null;
  }
  if (!Number.isFinite(r)) return null;

  const dec = def.salida.decimales ?? 2;
  const banda = (def.salida.bandas ?? []).find(
    (b) => (b.min === undefined || r >= b.min) && (b.max === undefined || r <= b.max),
  );
  return {
    valor: r.toFixed(dec),
    unidad: def.salida.unidad,
    nota: banda?.texto,
    tono: banda?.tono ?? 'primary',
  };
}
