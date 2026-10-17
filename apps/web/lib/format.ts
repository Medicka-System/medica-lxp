const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "18 sep" — fecha corta en español. */
export function fechaCorta(d: Date): string {
  return `${d.getDate()} ${MESES[d.getMonth()] ?? ''}`;
}

/**
 * "18 sep 2026" — fecha corta de una columna DATE (sin hora). Usa componentes UTC: las
 * columnas `date` de Postgres llegan como medianoche UTC; formatearlas con getters LOCALES
 * (fechaCorta) las corre un día atrás en zonas al oeste de UTC (off-by-one). Para fechas de
 * calendario (inicio/fin de grupo) el día es lo único que importa → se lee en UTC, estable
 * en cualquier TZ del contenedor.
 */
export function fechaCortaDia(d: Date): string {
  return `${d.getUTCDate()} ${MESES[d.getUTCMonth()] ?? ''} ${d.getUTCFullYear()}`;
}

/** "27/09/2026 14:05" — fecha completa DD/MM/AAAA HH:MM (mismo formato local que el PDF). */
export function fechaLargaHora(d: Date): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** "hace 2 h" / "ayer" / "18 sep" — antigüedad legible. */
export function haceCuanto(d: Date, ahora: Date = new Date()): string {
  const min = Math.round((ahora.getTime() - d.getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  if (h < 48) return 'ayer';
  return fechaCorta(d);
}

/** Primer nombre visible ("Dra. Sofía Ramírez" → "Dra. Ramírez"). */
export function nombreCorto(nombre: string): string {
  const partes = nombre.split(/\s+/).filter(Boolean);
  if (partes.length <= 2) return nombre;
  const tratamiento = /^(Dr\.|Dra\.)$/.test(partes[0] ?? '') ? partes[0] : '';
  const apellido = partes[partes.length - 1];
  return [tratamiento, apellido].filter(Boolean).join(' ');
}
