/**
 * Validación/normalización de criterios de rúbrica (§5B · course builder). PURO y
 * sin IO: es lo que justifica que las rúbricas pasen por el `api` y no sean CRUD
 * directo (§2) — se valida la estructura y que los pesos sumen 100 antes de guardar,
 * y al guardar se dispara la (re)indexación RAG para que Eco use la rúbrica (§7A).
 */

export interface CriterioRubrica {
  criterio: string;
  descripcion?: string;
  peso: number;
}

const TOLERANCIA = 0.5;

/**
 * Valida y normaliza los criterios. Reglas:
 *  · debe ser un arreglo no vacío;
 *  · cada criterio tiene nombre no vacío y `peso` numérico en [0, 100];
 *  · si hay pesos > 0, la suma debe ser 100 (±0.5) — una rúbrica ponderada coherente.
 * Lanza `Error` con mensaje claro si algo no cumple (el servicio lo vuelve 400).
 */
export function validarCriterios(criterios: unknown): CriterioRubrica[] {
  if (!Array.isArray(criterios) || criterios.length === 0) {
    throw new Error('La rúbrica necesita al menos un criterio.');
  }

  const normalizados: CriterioRubrica[] = criterios.map((c, i) => {
    if (!c || typeof c !== 'object') {
      throw new Error(`Criterio ${i + 1} inválido: se esperaba un objeto.`);
    }
    const obj = c as Record<string, unknown>;
    const nombre = typeof obj.criterio === 'string' ? obj.criterio.trim() : '';
    if (!nombre) {
      throw new Error(`Criterio ${i + 1} sin nombre ("criterio").`);
    }
    const peso = Number(obj.peso);
    if (!Number.isFinite(peso) || peso < 0 || peso > 100) {
      throw new Error(`Criterio "${nombre}": peso debe ser un número entre 0 y 100.`);
    }
    const out: CriterioRubrica = { criterio: nombre, peso };
    if (typeof obj.descripcion === 'string' && obj.descripcion.trim()) {
      out.descripcion = obj.descripcion.trim();
    }
    return out;
  });

  const suma = normalizados.reduce((acc, c) => acc + c.peso, 0);
  if (suma > 0 && Math.abs(suma - 100) > TOLERANCIA) {
    throw new Error(`Los pesos de la rúbrica deben sumar 100 (suman ${suma}).`);
  }
  return normalizados;
}
