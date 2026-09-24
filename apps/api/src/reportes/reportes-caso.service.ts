import { Injectable, NotFoundException } from '@nestjs/common';
import { QUEUE_PROCESAR_DICOM, type FuenteDicom, type ProcesarDicomJob } from '@campus/shared';
import { DbService } from '../db/db.service';
import { ColasProducer } from '../colas/colas-producer';
import { StorageService } from '../dicom/storage.service';

/**
 * PUENTE reporte → caso educativo (§6/§10). DOMINIO (§2 — NO en web): al confirmar el
 * médico, deriva de un reporte clínico un caso de bitácora ANONIMIZADO para que el docente
 * lo cure. Mapea el contenido (aplana valores + impresión → hallazgos), infiere órgano y
 * dominio I-AIM, y REUSA el pipeline del caso (`procesar-dicom`) para las imágenes: encola
 * el job con las imágenes del reporte como fuentes → el worker limpia TAGS (dcmjs) + PÍXELES
 * (Presidio) + escribe `estudio_series` + traza `anonimizacion`/`anonimizado_en` en el caso
 * (§10), copiándolas a `dicom/casos/…`. Las imágenes del REPORTE no se borran (el borrado
 * del crudo apunta a una clave temporal inexistente).
 *
 * `datos_paciente` (PII) NUNCA cruza al caso; además se hace un scrub de nombre/expediente
 * por si el médico los tecleó en texto libre.
 */

/* ───────────────────────── tipos jsonb laxos ───────────────────────── */
type Campo = {
  id: string;
  tipo: string;
  nombre?: string;
  unidad?: string;
  columnas?: string[];
  filas?: string[];
};
type Seccion = { tipo?: string; titulo?: string; campos?: Campo[] };
type Estructura = { secciones?: Seccion[] };
type ImagenGaleria = { ref: string; ext: string; pie?: string };

/* ───────────────────────── funciones puras (testeables) ───────────────────────── */

/** Órgano inferido del tipo de estudio de la plantilla (fallback: el nombre). */
export function organoDe(tipoEstudio: string | null, plantillaNombre: string | null): string {
  const t = (tipoEstudio ?? '').toLowerCase();
  const mapa: Record<string, string> = {
    abdominal: 'Abdomen',
    renal: 'Riñón y vías urinarias',
    mama: 'Mama',
    tiroideo: 'Tiroides y cuello',
    obstétrico: 'Obstétrico',
    obstetrico: 'Obstétrico',
    pélvico: 'Pelvis',
    pelvico: 'Pelvis',
    doppler: 'Vascular (Doppler)',
    msk: 'Musculoesquelético',
  };
  return mapa[t] ?? (tipoEstudio || plantillaNombre || 'Estudio general');
}

/** Lee la galería de un mapa de valores según la estructura (campos tipo `galeria`). */
export function imagenesDe(estructura: Estructura, valores: Record<string, unknown>): ImagenGaleria[] {
  const out: ImagenGaleria[] = [];
  for (const s of estructura.secciones ?? []) {
    for (const c of s.campos ?? []) {
      if (c.tipo !== 'galeria') continue;
      const v = valores[c.id];
      const arr = Array.isArray(v) ? v : v && typeof v === 'object' ? (v as { imagenes?: unknown }).imagenes : null;
      if (!Array.isArray(arr)) continue;
      for (const x of arr) {
        if (x && typeof x === 'object' && typeof (x as ImagenGaleria).ref === 'string') {
          const o = x as ImagenGaleria;
          out.push({ ref: o.ref, ext: typeof o.ext === 'string' ? o.ext : 'jpg', pie: typeof o.pie === 'string' ? o.pie : undefined });
        }
      }
    }
  }
  return out;
}

function valorTexto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Aplana valores + impresión + leyendas de imagen a un solo texto de hallazgos. */
export function aplanarHallazgos(
  estructura: Estructura,
  valores: Record<string, unknown>,
  impresion: string,
  imagenes: ImagenGaleria[],
): string {
  const partes: string[] = [];
  for (const s of estructura.secciones ?? []) {
    if (s.tipo === 'encabezado') continue;
    const lineas: string[] = [];
    for (const c of s.campos ?? []) {
      const nombre = (c.nombre ?? '').trim();
      const v = valores[c.id];
      if (c.tipo === 'galeria' || c.tipo === 'guia' || c.tipo === 'titulo') continue;
      if (c.tipo === 'sino') {
        if (typeof v === 'boolean') lineas.push(`${nombre}: ${v ? 'Sí' : 'No'}`);
        continue;
      }
      if (c.tipo === 'tabla') {
        const cols = c.columnas ?? [];
        const filas = c.filas ?? [];
        const datos = Array.isArray(v) ? (v as unknown[][]) : [];
        const rows: string[] = [];
        for (let r = 0; r < filas.length; r++) {
          const celdas = cols
            .map((col, ci) => ({ col, val: valorTexto(datos[r]?.[ci]) }))
            .filter((x) => x.val)
            .map((x) => `${x.col}: ${x.val}`);
          if (celdas.length) rows.push(`  ${filas[r]} — ${celdas.join(', ')}`);
        }
        if (rows.length) lineas.push(`${nombre}:\n${rows.join('\n')}`);
        continue;
      }
      const txt = valorTexto(v);
      if (!txt) continue;
      const unidad = c.tipo === 'medida' && c.unidad ? ` ${c.unidad}` : '';
      // multitexto = párrafo (sin repetir el nombre si es el bloque principal de la sección)
      lineas.push(c.tipo === 'multitexto' && (s.campos ?? []).length === 1 ? `${txt}` : `${nombre}: ${txt}${unidad}`);
    }
    if (lineas.length) {
      const titulo = (s.titulo ?? '').trim();
      partes.push(titulo ? `${titulo.toUpperCase()}\n${lineas.join('\n')}` : lineas.join('\n'));
    }
  }
  const imp = valorTexto(impresion);
  if (imp) partes.push(`IMPRESIÓN DIAGNÓSTICA\n${imp}`);
  const pies = imagenes.map((im, i) => ({ i, pie: (im.pie ?? '').trim() })).filter((x) => x.pie);
  if (pies.length) partes.push(`IMÁGENES\n${pies.map((x) => `  ${x.i + 1}. ${x.pie}`).join('\n')}`);
  return partes.join('\n\n').trim();
}

/** Scrub de PII conocida (nombre/expediente/solicitante del paciente) en texto libre (§10). */
export function scrubPII(texto: string, datosPaciente: Record<string, unknown>): string {
  let out = texto;
  for (const clave of ['paciente', 'expediente', 'solicitante']) {
    const v = datosPaciente[clave];
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (t.length < 3) continue;
    const escapado = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escapado, 'gi'), '[dato removido]');
  }
  return out;
}

/* ───────────────────────── servicio ───────────────────────── */
type FilaReporte = {
  id: string;
  id_medico: string;
  datos_paciente: Record<string, unknown> | null;
  contenido: { valores?: Record<string, unknown>; impresion?: string } | null;
  caso_generado_id: string | null;
  tipo_estudio: string | null;
  plantilla_nombre: string | null;
  estructura: Estructura | null;
};

@Injectable()
export class ReportesCasoService {
  constructor(
    private readonly db: DbService,
    private readonly colas: ColasProducer,
    private readonly storage: StorageService,
  ) {}

  async generarCaso(reporteId: string): Promise<{ casoId: string; yaExistia: boolean; conEstudio: boolean }> {
    const sql = this.db.sql;
    const [r] = await sql<FilaReporte[]>`
      select r.id, r.id_medico, r.datos_paciente, r.contenido, r.caso_generado_id,
             p.tipo_estudio, p.nombre as plantilla_nombre, p.estructura
      from lxp.reportes r
      left join lxp.plantillas_reporte p on p.id = r.plantilla_id
      where r.id = ${reporteId}
      limit 1`;
    if (!r) throw new NotFoundException('Reporte no encontrado.');
    if (r.caso_generado_id) return { casoId: r.caso_generado_id, yaExistia: true, conEstudio: false };

    const estructura: Estructura = r.estructura ?? {};
    const valores = r.contenido?.valores ?? {};
    const impresion = r.contenido?.impresion ?? '';
    const datosPaciente = r.datos_paciente ?? {};

    const imagenes = imagenesDe(estructura, valores);
    const hallazgos = scrubPII(aplanarHallazgos(estructura, valores, impresion, imagenes), datosPaciente);
    const organo = organoDe(r.tipo_estudio, r.plantilla_nombre);

    // Crea el caso + enlaza el reporte de forma atómica.
    const casoId = await sql.begin(async (tx) => {
      const [caso] = await tx<{ id: string }[]>`
        insert into lxp.bitacora_casos
          (id_alumno, organo, dominio_iaim, hallazgos, horas_estimadas, estado_validacion, origen, estudio_estado)
        values (${r.id_medico}, ${organo}, 'interpretacion'::lxp.dominio_iaim, ${hallazgos},
                0, 'pendiente', 'alumno',
                ${imagenes.length ? 'recibido' : null}::lxp.estudio_dicom_estado)
        returning id`;
      await tx`update lxp.reportes set caso_generado_id = ${caso.id} where id = ${reporteId}`;
      return caso.id;
    });

    // Imágenes: REUSA `procesar-dicom` (tags dcmjs + píxeles Presidio + traza §10 + copia a
    // dicom/casos). Lectura = imagen del reporte; borrado = clave temporal inexistente
    // (204 idempotente) para NO borrar las imágenes del reporte.
    if (imagenes.length) {
      const fuentes: FuenteDicom[] = imagenes.map((img, i) => ({
        indice: i,
        refCrudo: img.ref,
        urlLecturaCrudo: this.storage.firmarLectura(img.ref),
        urlBorradoCrudo: this.storage.firmarBorrado(`reportes/caso-tmp/${casoId}/${i}.${img.ext}`),
        esZip: false,
      }));
      const job: ProcesarDicomJob = { casoId, tabla: 'bitacora_casos', fuentes };
      await this.colas.encolar(QUEUE_PROCESAR_DICOM, job);
    }

    return { casoId, yaExistia: false, conEstudio: imagenes.length > 0 };
  }
}
