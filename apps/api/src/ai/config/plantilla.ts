/**
 * Renderizador de plantillas de prompt de Eco (§7A). Puro, sin infra: reemplaza
 * `{{variable}}` por su valor. Es lo que hace CONFIGURABLE al user prompt — el
 * texto vive en `lxp.eco_config`, las variables (verdad, rúbrica, respuesta) las
 * interpola el pipeline en tiempo real.
 *
 * Diseño defensivo: una variable no provista se reemplaza por cadena vacía (no deja
 * el literal `{{x}}` colándose al modelo), y se registran las claves faltantes para
 * que el llamador decida si es un error de config.
 */
export interface ResultadoRender {
  texto: string;
  /** Variables que la plantilla pedía y no venían en `vars`. */
  faltantes: string[];
}

const PATRON_VAR = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Interpola `{{var}}` con `vars[var]`. Objetos/arreglos se serializan a JSON. */
export function renderizarPlantilla(
  plantilla: string,
  vars: Record<string, unknown>,
): ResultadoRender {
  const faltantes = new Set<string>();
  const texto = plantilla.replace(PATRON_VAR, (_m, clave: string) => {
    if (!(clave in vars) || vars[clave] == null) {
      faltantes.add(clave);
      return '';
    }
    const v = vars[clave];
    return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  });
  return { texto, faltantes: [...faltantes] };
}
