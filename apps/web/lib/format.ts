const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "18 sep" — fecha corta en español. */
export function fechaCorta(d: Date): string {
  return `${d.getDate()} ${MESES[d.getMonth()] ?? ''}`;
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
