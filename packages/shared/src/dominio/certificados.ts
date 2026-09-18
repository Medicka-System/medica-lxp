/**
 * Folios y títulos de certificados (§6/§8). Puro y DETERMINISTA: el mismo alumno
 * y tipo de hito producen el mismo folio, lo que da idempotencia en la emisión
 * (la columna `lxp.certificados.folio` es única).
 */
export function generarFolio(alumnoId: string, tipo: string): string {
  const corto = alumnoId.replace(/-/g, '').slice(0, 8).toUpperCase();
  return `MC-${tipo.toUpperCase()}-${corto}`;
}

export function tituloCertificado(tipo: string): string {
  const horas = tipo.replace('horas_', '');
  return `Certificado de ${horas} horas de práctica`;
}
