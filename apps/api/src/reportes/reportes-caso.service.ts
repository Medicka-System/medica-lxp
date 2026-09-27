import { Injectable, NotFoundException } from '@nestjs/common';
import {
  QUEUE_PROCESAR_DICOM,
  aplanarContenidoCaso,
  type ContenidoEstructuradoCaso,
  type FuenteDicom,
  type ProcesarDicomJob,
} from '@campus/shared';
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
type Seccion = { id?: string; tipo?: string; titulo?: string; campos?: Campo[] };
type Estructura = { secciones?: Seccion[] };
/** Imagen de galería del reporte + la sección de la que salió (fidelidad reporte↔caso). */
type ImagenGaleria = { ref: string; ext: string; pie?: string; seccionId: string };

/* ───────────────────────── funciones puras (testeables) ───────────────────────── */

/** Dominio I-AIM del caso (enum lxp.dominio_iaim). */
export type DominioIaimCaso = 'indicacion' | 'adquisicion' | 'interpretacion' | 'decision_medica';

/**
 * Dominio I-AIM inferido del tipo de estudio / órgano (AUTO-map · editable al curar).
 * Un reporte clínico es la LECTURA de un estudio ya adquirido → 'interpretacion' por
 * defecto; el docente puede reasignarlo en la curaduría. Centralizado aquí para que el
 * mapeo (hoy trivial) tenga un solo lugar si mañana se afina por tipo.
 */
export function dominioDe(_tipoEstudio: string | null, _organo: string | null): DominioIaimCaso {
  return 'interpretacion';
}

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

/**
 * Lee la galería de un mapa de valores según la estructura (campos tipo `galeria`),
 * conservando la SECCIÓN de origen de cada imagen (`seccionId`) — fidelidad reporte↔caso.
 */
export function imagenesDe(estructura: Estructura, valores: Record<string, unknown>): ImagenGaleria[] {
  const out: ImagenGaleria[] = [];
  for (const s of estructura.secciones ?? []) {
    const seccionId = typeof s.id === 'string' ? s.id : '';
    for (const c of s.campos ?? []) {
      if (c.tipo !== 'galeria') continue;
      const v = valores[c.id];
      const arr = Array.isArray(v) ? v : v && typeof v === 'object' ? (v as { imagenes?: unknown }).imagenes : null;
      if (!Array.isArray(arr)) continue;
      for (const x of arr) {
        if (x && typeof x === 'object' && typeof (x as ImagenGaleria).ref === 'string') {
          const o = x as ImagenGaleria;
          out.push({
            ref: o.ref,
            ext: typeof o.ext === 'string' ? o.ext : 'jpg',
            pie: typeof o.pie === 'string' ? o.pie : undefined,
            seccionId,
          });
        }
      }
    }
  }
  return out;
}

function valorTexto(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/**
 * Aplana valores + impresión + leyendas de imagen a un solo texto de hallazgos (índice
 * DERIVADO · Opción B). Delega en el aplanador CANÓNICO de packages/shared, que conserva
 * todos los valores de tabla (arregla filas dinámicas / tablas sin encabezado / columnas
 * extra). El 4º parámetro `imagenes` se mantiene por compatibilidad de firma: las leyendas
 * de galería salen de `valores` dentro del propio aplanador.
 */
export function aplanarHallazgos(
  estructura: Estructura,
  valores: Record<string, unknown>,
  impresion: string,
  _imagenes: ImagenGaleria[] = [],
): string {
  return aplanarContenidoCaso(aContenidoEstructurado(estructura, valores, impresion));
}

/**
 * Deja cada tabla con sus columnas de DATOS (`columnas[1..]`); `columnas[0]` es la columna de
 * ETIQUETAS DE FILA y sus valores por fila viajan en `filas`. Así el contrato del caso
 * (estructurado / snapshot / aplanado) usa SIEMPRE columnas de datos, alineado con la matriz de
 * valores `filas × columnasDatos` — igual que los casos ya guardados (columnas = datos).
 */
function seccionColumnasDatos(s: Seccion): Seccion {
  if (!Array.isArray(s.campos)) return s;
  return {
    ...s,
    campos: s.campos.map((c) => (c.tipo === 'tabla' ? { ...c, columnas: (c.columnas ?? []).slice(1) } : c)),
  };
}

/** Arma el snapshot estructurado (contrato compartido) desde la estructura + valores. */
export function aContenidoEstructurado(
  estructura: Estructura,
  valores: Record<string, unknown>,
  impresion: string,
  fuente?: ContenidoEstructuradoCaso['fuente'],
): ContenidoEstructuradoCaso {
  return {
    // La estructura de la plantilla (jsonb) ya trae la forma completa de secciones/campos; el tipo
    // laxo la sub-describe, por eso el cast al contrato. La tabla se pasa con columnas de DATOS
    // (columnas[0] = etiquetas de fila → sus valores están en `filas`), alineada con la matriz.
    secciones: (estructura.secciones ?? []).map(seccionColumnasDatos) as unknown as ContenidoEstructuradoCaso['secciones'],
    valores,
    impresion,
    ...(fuente ? { fuente } : {}),
  };
}

/** Scrub de PII recursivo de un valor (texto o matriz de tabla); deja bool/número intactos. */
function scrubValor(v: unknown, dp: Record<string, unknown>): unknown {
  if (typeof v === 'string') return scrubPII(v, dp);
  if (Array.isArray(v)) return v.map((x) => scrubValor(x, dp));
  return v;
}

/**
 * SNAPSHOT ESTRUCTURADO del reporte para el caso (contrato compartido
 * `ContenidoEstructuradoCaso` · §7A · Opción B · lo que persiste `contenido_estructurado`).
 *
 * Copia VERBATIM las secciones de HALLAZGOS de la plantilla (conserva la tabla como
 * matriz, la medida con unidad, la opción/sino tipados) + los valores del médico con la
 * PII removida. SALTA el encabezado (PII → datos_paciente, nunca cruza) y las imágenes
 * (`galeria`/`imagen`: van al VISOR anonimizado, no al texto — evita filtrar refs crudas).
 * Es la MISMA forma que `reportes.contenido` + `estructura`, por eso se renderiza idéntico
 * con `CampoReporte` (reporte ↔ caso coincidibles, tabla como TABLA). Devuelve secciones
 * vacías si no hay nada estructurable → el consumidor cae al texto derivado `hallazgos`.
 */
export function snapshotContenidoCaso(
  estructura: Estructura,
  valores: Record<string, unknown>,
  impresion: string,
  datosPaciente: Record<string, unknown>,
  fuente?: ContenidoEstructuradoCaso['fuente'],
): ContenidoEstructuradoCaso {
  const secciones: ContenidoEstructuradoCaso['secciones'] = [];
  const valoresLimpios: Record<string, unknown> = {};
  for (const s of estructura.secciones ?? []) {
    if (s.tipo === 'encabezado') continue;
    const campos = (s.campos ?? []).filter((c) => c.tipo !== 'galeria' && c.tipo !== 'imagen');
    if (!campos.length) continue;
    // La tabla se copia con las columnas de DATOS (columnas[1..]); columnas[0] es la columna de
    // etiquetas de fila y sus valores ya viajan en `filas` — así el contrato del caso queda alineado
    // con la matriz de valores (`filas × columnasDatos`), sin la columna de etiquetas duplicada.
    const camposSnap = campos.map((c) =>
      c.tipo === 'tabla' ? { ...c, columnas: (c.columnas ?? []).slice(1) } : c,
    );
    const columnas = (s as { columnas?: number }).columnas;
    secciones.push({
      id: typeof s.id === 'string' ? s.id : '',
      tipo: s.tipo ?? 'hallazgos',
      titulo: (s.titulo ?? '').trim(),
      columnas: typeof columnas === 'number' ? columnas : 1,
      // Los campos se copian con TODA su metadata de runtime (opciones/span/filas/columnas
      // de tabla…), no solo el subconjunto del tipo laxo — por eso el cast al contrato.
      campos: camposSnap as unknown as ContenidoEstructuradoCaso['secciones'][number]['campos'],
    });
    for (const c of campos) {
      if (Object.prototype.hasOwnProperty.call(valores, c.id)) {
        valoresLimpios[c.id] = scrubValor(valores[c.id], datosPaciente);
      }
    }
  }
  return {
    secciones,
    valores: valoresLimpios,
    impresion: scrubPII(typeof impresion === 'string' ? impresion : '', datosPaciente),
    ...(fuente ? { fuente } : {}),
  };
}

/* ───────────────────── contenido ESTRUCTURADO (verdad para Eco · §7A) ─────────────────────
 * El caso ADOPTA la estructura del reporte (fuente de verdad): secciones → campos tipados,
 * conservando la TABLA como matriz (no aplanada), el sí/no como booleano y la medida con
 * unidad. `aplanarHallazgos` se mantiene como TEXTO DERIVADO para búsqueda y fallback de
 * casos viejos. Esto es lo que habilita a Eco a comparar CAMPO-POR-CAMPO (§7A), en vez de
 * diff de texto libre. PII nunca cruza: se aplica `scrubPII` a los valores de texto.
 */
export type CampoEstructurado =
  | { id: string; tipo: 'texto' | 'multitexto' | 'numero' | 'medida' | 'fecha' | 'opcion'; nombre: string; valor: string; unidad?: string }
  | { id: string; tipo: 'sino'; nombre: string; valor: boolean }
  | { id: string; tipo: 'tabla'; nombre: string; columnas: string[]; filas: string[]; celdas: string[][] };

export type SeccionEstructurada = { id: string; titulo: string; campos: CampoEstructurado[] };

export type ImagenEstructurada = { ref: string; ext: string; pie?: string; seccionId: string };

/** Contenido estructurado del caso, derivado del reporte (fuente de verdad · §7A). */
export type ContenidoEstructurado = {
  version: 1;
  secciones: SeccionEstructurada[];
  impresion: string;
  imagenes: ImagenEstructurada[];
};

/**
 * Estructura el contenido del reporte SIN aplanar: preserva secciones/campos tipados
 * (tabla como matriz, sino como bool, medida con unidad). Salta encabezado (PII),
 * `guia`/`titulo` (presentación), `galeria`/`imagen` (van en `imagenes`) y campos vacíos.
 * Aplica `scrubPII` a todo texto (§10). Devuelve `null` si no hay nada estructurable
 * (el consumidor cae al texto derivado · fallback).
 */
export function estructurarContenido(
  estructura: Estructura,
  valores: Record<string, unknown>,
  impresion: string,
  imagenes: ImagenGaleria[],
  datosPaciente: Record<string, unknown> = {},
): ContenidoEstructurado | null {
  const limpia = (t: string): string => scrubPII(t, datosPaciente);
  const secciones: SeccionEstructurada[] = [];

  for (const s of estructura.secciones ?? []) {
    if (s.tipo === 'encabezado') continue;
    const campos: CampoEstructurado[] = [];
    for (const c of s.campos ?? []) {
      const nombre = (c.nombre ?? '').trim();
      const v = valores[c.id];
      if (c.tipo === 'galeria' || c.tipo === 'guia' || c.tipo === 'titulo' || c.tipo === 'imagen') continue;

      if (c.tipo === 'sino') {
        if (typeof v === 'boolean') campos.push({ id: c.id, tipo: 'sino', nombre, valor: v });
        continue;
      }

      if (c.tipo === 'tabla') {
        // columnas[0] = columna de etiquetas de fila (sus celdas son `filas`); las columnas de DATOS
        // del caso son columnas[1..]. La matriz de valores del médico es `filas × columnasDatos`.
        const columnas = (c.columnas ?? []).slice(1);
        const filas = c.filas ?? [];
        const datos = Array.isArray(v) ? (v as unknown[][]) : [];
        const celdas = filas.map((_, r) =>
          columnas.map((_, ci) => limpia(valorTexto(datos[r]?.[ci]))),
        );
        // Conserva la tabla si tiene al menos una celda con dato (matriz completa · §Fase 4).
        if (celdas.some((fila) => fila.some((x) => x !== ''))) {
          campos.push({ id: c.id, tipo: 'tabla', nombre, columnas: [...columnas], filas: [...filas], celdas });
        }
        continue;
      }

      const txt = limpia(valorTexto(v));
      if (!txt) continue;
      if (c.tipo === 'medida') {
        campos.push({ id: c.id, tipo: 'medida', nombre, valor: txt, unidad: c.unidad?.trim() || undefined });
      } else {
        const tipo = c.tipo === 'texto' || c.tipo === 'multitexto' || c.tipo === 'numero' || c.tipo === 'fecha' || c.tipo === 'opcion'
          ? c.tipo
          : 'texto';
        campos.push({ id: c.id, tipo, nombre, valor: txt });
      }
    }
    if (campos.length) {
      secciones.push({ id: typeof s.id === 'string' ? s.id : '', titulo: (s.titulo ?? '').trim(), campos });
    }
  }

  const imp = limpia(valorTexto(impresion));
  const imgs: ImagenEstructurada[] = imagenes.map((im) => ({
    ref: im.ref,
    ext: im.ext,
    pie: im.pie ? limpia(im.pie) : undefined,
    seccionId: im.seccionId,
  }));

  if (!secciones.length && !imp && !imgs.length) return null;
  return { version: 1, secciones, impresion: imp, imagenes: imgs };
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
  plantilla_id: string | null;
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
             r.plantilla_id, p.tipo_estudio, p.nombre as plantilla_nombre, p.estructura
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
    const dominio = dominioDe(r.tipo_estudio, organo);

    // Verdad ESTRUCTURADA del caso (§7A · Opción B): snapshot de la estructura del reporte
    // (tablas/valores tipados, PII removida) para mostrarse coincidible con el reporte y
    // habilitar a Eco. Secciones vacías → null (el consumidor cae al texto `hallazgos`).
    const snapshot = snapshotContenidoCaso(estructura, valores, impresion, datosPaciente, {
      tipo: 'reporte',
      reporteId: r.id,
      ...(r.plantilla_id ? { plantillaId: r.plantilla_id } : {}),
      ...(r.plantilla_nombre ? { plantillaNombre: r.plantilla_nombre } : {}),
      ...(r.tipo_estudio ? { tipoEstudio: r.tipo_estudio } : {}),
    });
    const contenidoEstructurado = snapshot.secciones.length ? snapshot : null;

    // Crea el caso + enlaza el reporte de forma atómica.
    const casoId = await sql.begin(async (tx) => {
      const [caso] = await tx<{ id: string }[]>`
        insert into lxp.bitacora_casos
          (id_alumno, organo, dominio_iaim, hallazgos, contenido_estructurado,
           horas_estimadas, estado_validacion, origen, estudio_estado)
        values (${r.id_medico}, ${organo}, ${dominio}::lxp.dominio_iaim, ${hallazgos},
                ${contenidoEstructurado ? tx.json(contenidoEstructurado as never) : null},
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
