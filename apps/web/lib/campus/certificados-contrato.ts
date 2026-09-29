/**
 * ══════════════════════════════════════════════════════════════════════════════
 * Certificados y badges (§ Sprint 8, §6/§8). Reconocimiento del alumno. Qué es REAL
 * (lectura RLS de proyecciones) y qué es PENDIENTE (emisión = dominio/worker).
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * REAL (web→Supabase, SOLO LECTURA):
 *   • Certificados del alumno (lxp.certificados · policy certificados_select: propios,
 *     comoAlumno).
 *   • Hitos alcanzados (lxp.hitos) y horas acreditadas (competencia_dominios) para el
 *     avance hacia el siguiente hito.
 *   • Badges: catálogo (lxp.badges, legible por todos) cruzado con los otorgados al
 *     alumno (lxp.badges_otorgados · propios) → logrados vs en-progreso.
 *   • Verificación PÚBLICA de folio (sin sesión): `verificarFolio` corre como `anon` y
 *     llama a la función SECURITY DEFINER `lxp.verificar_folio_publico` (mig 0060), que
 *     valida CUALQUIER folio y devuelve solo lo impreso en el certificado (título +
 *     fecha, sin PII). No es un proxy de CRUD en el `api` (§2): definer en `lxp`.
 *
 * PENDIENTE DE worker / api (fuera de apps/web · §8):
 *   • Emisión de certificados y otorgamiento de badges: los ESCRIBE el worker
 *     (deteccion-hito → emision-certificado / otorgar-badges) con service_role. Aquí
 *     todo es SOLO LECTURA (0010 revoca insert/update/delete a authenticated).
 *   • PDF del certificado (`tienePdf` ← `pdf_ref`): HOY el worker `emision-certificado`
 *     NO genera ningún PDF (nunca escribe `pdf_ref`), así que `tienePdf` es siempre
 *     false y el botón muestra "PDF en preparación". Falta (a) generar el PDF en el
 *     worker (pdf-lib · §3, como reportes) y escribir `pdf_ref`, y (b) servirlo con URL
 *     firmada del `api` (único firmante · §3). Ambas son trabajo de worker/api.
 */

/** Certificado emitido al alumno. */
export type CertificadoItem = {
  id: string;
  folio: string;
  titulo: string;
  emitidoEn: Date;
  /** Tiene PDF generado en object storage (pdf_ref no nulo). */
  tienePdf: boolean;
};

/** Peldaño de la escalera de hitos de horas (100/500/1000…). */
export type HitoPeldano = {
  umbral: number;
  etiqueta: string;
  alcanzado: boolean;
  alcanzadoEn: Date | null;
};

/** Badge del catálogo, con si el alumno lo tiene. */
export type BadgeItem = {
  clave: string;
  nombre: string;
  descripcion: string | null;
  otorgado: boolean;
  otorgadoEn: Date | null;
};

export type ReconocimientoData = {
  horasAcreditadas: number;
  certificados: CertificadoItem[];
  hitos: HitoPeldano[];
  /** Siguiente hito por alcanzar (null si ya alcanzó el máximo). */
  siguienteHito: HitoPeldano | null;
  badges: BadgeItem[];
};

/** Resultado de verificar un folio (público · definer verificar_folio_publico · mig 0060). */
export type VerificacionFolio =
  | { estado: 'valido'; folio: string; titulo: string; emitidoEn: string }
  | { estado: 'no_encontrado' }
  | { estado: 'vacio' };
