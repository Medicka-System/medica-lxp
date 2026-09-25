import { Injectable, NotFoundException } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { DbService } from '../db/db.service';
import { StorageService } from '../dicom/storage.service';
import { LOGO_MEDICA_PNG_BASE64 } from './logo-medica';

/**
 * Generación del PDF del reporte clínico del médico (§6.5 · DOMINIO §2 — NO web). Reconstruye
 * un DOCUMENTO branded desde los datos REALES del reporte (plantilla `estructura` + `valores`),
 * NO el shell del editor: membrete con el logo de Médica Capacitación, datos del estudio/paciente,
 * hallazgos como TEXTO, imágenes y zona de firma/cédula.
 *
 * IMÁGENES (§ Opción 1): galería y referencia se embeben server-side (fetch URL firmada → bytes);
 * las imágenes DICOM NO tienen raster server-side (solo el `.dcm`), así que el CLIENTE las rasteriza
 * del visor Cornerstone y las manda como PNG en el body (`imagenesDicom[campoId]`).
 *
 * PROPIEDAD (§10): filtra `id_medico = userId` (el MISMO candado que `getReporte`) — nunca genera el
 * PDF de un reporte ajeno.
 */

/* ───────────────────────── tipos jsonb laxos ───────────────────────── */
type Campo = {
  id: string;
  tipo: string;
  nombre?: string;
  unidad?: string;
  opciones?: string[];
  columnas?: string[];
  filas?: string[];
  origen?: string;
  refUrl?: string;
  span?: number;
};
type Seccion = { id?: string; tipo?: string; titulo?: string; columnas?: number; campos?: Campo[] };
type Estructura = { secciones?: Seccion[] };
type Contenido = { folio?: string; valores?: Record<string, unknown>; impresion?: string } | null;

type FilaReporte = {
  id: string;
  estado: string;
  datos_paciente: Record<string, unknown> | null;
  contenido: Contenido;
  plantilla_nombre: string | null;
  tipo_estudio: string | null;
  estructura: Estructura | null;
};

/** Imagen DICOM rasterizada en el cliente (PNG) para un campo `imagen/dicom`. */
export interface ImagenDicomReporte {
  campoId: string;
  pngBase64: string;
}

/* ───────────────────────── lectores de valores (autocontenidos) ───────────────────────── */
function leerTexto(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}
function leerBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}
function leerTabla(v: unknown, filas: number, columnas: number): string[][] {
  const base = Array.from({ length: filas }, () => Array.from({ length: columnas }, () => ''));
  if (!Array.isArray(v)) return base;
  for (let r = 0; r < filas; r++) {
    const fila = (v as unknown[])[r];
    if (Array.isArray(fila)) for (let c = 0; c < columnas; c++) base[r]![c] = leerTexto(fila[c]);
  }
  return base;
}
type ImgGaleria = { ref: string; ext: string; pie?: string };
function leerGaleria(v: unknown): ImgGaleria[] {
  const arr = Array.isArray(v)
    ? v
    : v && typeof v === 'object'
      ? (v as { imagenes?: unknown }).imagenes
      : null;
  if (!Array.isArray(arr)) return [];
  const out: ImgGaleria[] = [];
  for (const x of arr) {
    if (!x || typeof x !== 'object') continue;
    const o = x as Record<string, unknown>;
    if (typeof o.ref !== 'string' || !o.ref) continue;
    out.push({ ref: o.ref, ext: typeof o.ext === 'string' ? o.ext : 'jpg', pie: typeof o.pie === 'string' ? o.pie : undefined });
  }
  return out;
}

/** Deja solo caracteres codificables por las fuentes estándar (WinAnsi/Latin-1). */
function san(t: string): string {
  return (t ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[–—]/g, '-')
    .split(String.fromCharCode(0xa0))
    .join(' ')
    // Deja solo tab/lf/cr + Latin-1 imprimible (lo codificable por las fuentes estandar).
    .split('')
    .filter((c) => {
      const n = c.charCodeAt(0);
      return n === 9 || n === 10 || n === 13 || (n >= 32 && n <= 255);
    })
    .join('');
}

function hex(h: string) {
  const n = parseInt(h.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/* ───────────────────────── paleta §5A ───────────────────────── */
const C = {
  teal: hex('#1a8880'),
  ink: hex('#111827'),
  soft: hex('#374151'),
  muted: hex('#6b7280'),
  border: hex('#e5e7eb'),
  navy: hex('#0f2d52'),
  accent: hex('#f0fafa'),
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 48;
const CONTENT_W = PAGE_W - 2 * M;

/** Cursor de composición del documento con salto de página automático. */
class Doc {
  page: PDFPage;
  y = PAGE_H - M;
  constructor(
    readonly pdf: PDFDocument,
    readonly font: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.page = pdf.addPage([PAGE_W, PAGE_H]);
  }
  nueva() {
    this.page = this.pdf.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - M;
  }
  asegurar(alto: number) {
    if (this.y - alto < M) this.nueva();
  }
  wrap(texto: string, font: PDFFont, size: number, maxW: number): string[] {
    const lineas: string[] = [];
    for (const crudo of san(texto).split('\n')) {
      const palabras = crudo.split(/\s+/).filter(Boolean);
      if (palabras.length === 0) {
        lineas.push('');
        continue;
      }
      let linea = '';
      for (const p of palabras) {
        const prueba = linea ? `${linea} ${p}` : p;
        if (font.widthOfTextAtSize(prueba, size) <= maxW || !linea) linea = prueba;
        else {
          lineas.push(linea);
          linea = p;
        }
      }
      if (linea) lineas.push(linea);
    }
    return lineas;
  }
  texto(
    texto: string,
    opts: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; maxW?: number; gap?: number } = {},
  ) {
    const x = opts.x ?? M;
    const size = opts.size ?? 10.5;
    const font = opts.font ?? this.font;
    const color = opts.color ?? C.ink;
    const maxW = opts.maxW ?? PAGE_W - M - x;
    const alto = size * 1.42;
    for (const linea of this.wrap(texto, font, size, maxW)) {
      this.asegurar(alto);
      if (linea) this.page.drawText(linea, { x, y: this.y - size, size, font, color });
      this.y -= alto;
    }
    if (opts.gap) this.y -= opts.gap;
  }
  linea(color = C.border, thickness = 0.75) {
    this.asegurar(8);
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: PAGE_W - M, y: this.y }, thickness, color });
    this.y -= 8;
  }
  espacio(h: number) {
    this.y -= h;
  }
}

@Injectable()
export class ReportesPdfService {
  constructor(
    private readonly db: DbService,
    private readonly storage: StorageService,
  ) {}

  async generar(reporteId: string, userId: string, imagenesDicom: ImagenDicomReporte[]): Promise<Uint8Array> {
    const sql = this.db.sql;
    // Candado de propiedad: id_medico = usuario (mismo filtro que getReporte). Si no es suyo
    // (o no existe) → 404, sin revelar existencia.
    const [r] = await sql<FilaReporte[]>`
      select r.id, r.estado, r.datos_paciente, r.contenido,
             p.nombre as plantilla_nombre, p.tipo_estudio, p.estructura
      from lxp.reportes r
      left join lxp.plantillas_reporte p on p.id = r.plantilla_id
      where r.id = ${reporteId} and r.id_medico = ${userId}
      limit 1`;
    if (!r) throw new NotFoundException('Reporte no encontrado.');

    const estructura: Estructura = r.estructura ?? { secciones: [] };
    const valores = r.contenido?.valores ?? {};
    const impresion = r.contenido?.impresion ?? '';
    const paciente = r.datos_paciente ?? {};
    const folio = typeof r.contenido?.folio === 'string' ? r.contenido.folio : 'RPT-0000';
    const dicomPorCampo = new Map(imagenesDicom.map((i) => [i.campoId, i.pngBase64]));

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const doc = new Doc(pdf, font, bold);

    await this.membrete(doc, r, folio);
    this.datosEstudio(doc, estructura, paciente);
    await this.hallazgos(doc, estructura, valores, dicomPorCampo);
    this.impresionDiagnostica(doc, impresion);
    this.firma(doc, paciente);
    this.pieDePagina(doc);

    return pdf.save();
  }

  /* ── membrete: logo + título del estudio + folio ── */
  private async membrete(doc: Doc, r: FilaReporte, folio: string) {
    let logoAlto = 0;
    try {
      const logo = await doc.pdf.embedPng(Buffer.from(LOGO_MEDICA_PNG_BASE64, 'base64'));
      const w = 150;
      const h = (logo.height / logo.width) * w;
      logoAlto = h;
      doc.page.drawImage(logo, { x: M, y: doc.y - h, width: w, height: h });
    } catch {
      /* si el logo falla, el membrete sigue con el texto */
    }
    // Título + folio alineados a la derecha del membrete.
    const titulo = san(r.plantilla_nombre || 'Reporte clínico');
    const tSize = 15;
    const tW = bold_width(doc.bold, titulo, tSize, PAGE_W - M);
    doc.page.drawText(tW.texto, { x: PAGE_W - M - tW.ancho, y: doc.y - 13, size: tSize, font: doc.bold, color: C.navy });
    const meta = san(`${folio}${r.tipo_estudio ? ` · ${r.tipo_estudio}` : ''}`);
    const mSize = 9.5;
    doc.page.drawText(meta, {
      x: PAGE_W - M - doc.font.widthOfTextAtSize(meta, mSize),
      y: doc.y - 28,
      size: mSize,
      font: doc.font,
      color: C.muted,
    });
    doc.y -= Math.max(logoAlto, 34) + 12;
    doc.linea(C.teal, 1.5);
    doc.espacio(6);
  }

  /* ── datos del estudio / paciente (dos columnas label:valor) ── */
  private datosEstudio(doc: Doc, estructura: Estructura, paciente: Record<string, unknown>) {
    const enc = (estructura.secciones ?? []).find((s) => s.tipo === 'encabezado');
    const campos: { etiqueta: string; valor: string }[] = [];
    const vistos = new Set<string>();
    for (const c of enc?.campos ?? []) {
      const val = leerTexto(paciente[c.id]);
      vistos.add(c.id);
      if (val) campos.push({ etiqueta: c.nombre || c.id, valor: val });
    }
    // Cualquier dato de paciente que no venía en el encabezado (ej. defaults del catálogo).
    const nombresCatalogo: Record<string, string> = {
      paciente: 'Paciente',
      edad: 'Edad',
      sexo: 'Sexo',
      expediente: 'Expediente',
      fechaEstudio: 'Fecha del estudio',
      solicitante: 'Médico solicitante',
      equipo: 'Equipo',
      motivo: 'Motivo del estudio',
    };
    for (const [k, etiqueta] of Object.entries(nombresCatalogo)) {
      if (vistos.has(k)) continue;
      const val = leerTexto(paciente[k]);
      if (val) campos.push({ etiqueta, valor: val });
    }
    if (campos.length === 0) return;

    doc.texto('DATOS DEL ESTUDIO', { size: 9, font: doc.bold, color: C.teal, gap: 4 });

    // Rejilla de 2 columnas.
    const colW = (CONTENT_W - 20) / 2;
    for (let i = 0; i < campos.length; i += 2) {
      const par = [campos[i], campos[i + 1]].filter(Boolean) as { etiqueta: string; valor: string }[];
      const alturas = par.map((c) => {
        const lv = doc.wrap(c.valor, doc.font, 10, colW);
        return 11 + lv.length * 13 + 6;
      });
      const alto = Math.max(...alturas);
      doc.asegurar(alto);
      const yTop = doc.y;
      par.forEach((c, j) => {
        const x = M + j * (colW + 20);
        doc.page.drawText(san(c.etiqueta), { x, y: yTop - 9, size: 8.5, font: doc.bold, color: C.muted });
        let yy = yTop - 22;
        for (const linea of doc.wrap(c.valor, doc.font, 10, colW)) {
          doc.page.drawText(linea, { x, y: yy, size: 10, font: doc.font, color: C.ink });
          yy -= 13;
        }
      });
      doc.y = yTop - alto;
    }
    doc.espacio(6);
    doc.linea();
    doc.espacio(4);
  }

  /* ── hallazgos por sección: valores como TEXTO + imágenes embebidas ── */
  private async hallazgos(
    doc: Doc,
    estructura: Estructura,
    valores: Record<string, unknown>,
    dicomPorCampo: Map<string, string>,
  ) {
    const secciones = (estructura.secciones ?? []).filter((s) => s.tipo !== 'encabezado');
    if (secciones.length === 0) return;
    doc.texto('HALLAZGOS', { size: 9, font: doc.bold, color: C.teal, gap: 6 });

    for (const s of secciones) {
      doc.asegurar(24);
      doc.texto(san(s.titulo || 'Sección'), { size: 12, font: doc.bold, color: C.navy, gap: 2 });

      for (const c of s.campos ?? []) {
        if (c.tipo === 'guia' || c.tipo === 'titulo') {
          if (c.tipo === 'titulo' && c.nombre) doc.texto(san(c.nombre), { size: 10.5, font: doc.bold, color: C.soft, gap: 1 });
          continue;
        }
        if (c.tipo === 'imagen') {
          await this.dibujarImagenCampo(doc, c, valores[c.id], dicomPorCampo);
          continue;
        }
        if (c.tipo === 'galeria') {
          for (const img of leerGaleria(valores[c.id])) await this.dibujarGaleria(doc, img);
          continue;
        }
        this.campoTexto(doc, c, valores[c.id]);
      }
      doc.espacio(8);
    }
  }

  private campoTexto(doc: Doc, c: Campo, valor: unknown) {
    const etiqueta = san(c.nombre || '').trim();
    if (c.tipo === 'sino') {
      const b = leerBool(valor);
      if (b === null) return;
      doc.texto(`${etiqueta ? etiqueta + ': ' : ''}${b ? 'Sí' : 'No'}`, { size: 10.5, gap: 2 });
      return;
    }
    if (c.tipo === 'tabla') {
      const filas = c.filas ?? [];
      const columnas = c.columnas ?? [];
      const datos = leerTabla(valor, filas.length, columnas.length);
      const tieneDato = datos.some((f) => f.some((x) => x.trim() !== ''));
      if (!tieneDato) return;
      if (etiqueta) doc.texto(etiqueta, { size: 10.5, font: doc.bold, color: C.soft, gap: 2 });
      this.dibujarTabla(doc, columnas, filas, datos);
      return;
    }
    const txt = leerTexto(valor).trim();
    if (!txt) return;
    const unidad = c.tipo === 'medida' && c.unidad ? ` ${c.unidad}` : '';
    if (etiqueta) {
      // Etiqueta en negrita + valor en la misma corrida cuando es corto; párrafo si es largo.
      doc.texto(`${etiqueta}: ${txt}${unidad}`, { size: 10.5, gap: 2 });
    } else {
      doc.texto(`${txt}${unidad}`, { size: 10.5, gap: 2 });
    }
  }

  private dibujarTabla(doc: Doc, columnas: string[], filas: string[], datos: string[][]) {
    const nCols = columnas.length + 1; // 1ª columna = etiqueta de fila
    const colW = CONTENT_W / nCols;
    const rowH = 16;
    const encabezados = ['', ...columnas];
    const cuerpo = filas.map((f, r) => [f, ...(datos[r] ?? [])]);
    const pintarFila = (celdas: string[], negrita: boolean, fondo?: boolean) => {
      doc.asegurar(rowH);
      const yTop = doc.y;
      if (fondo) doc.page.drawRectangle({ x: M, y: yTop - rowH, width: CONTENT_W, height: rowH, color: C.accent });
      celdas.forEach((celda, i) => {
        const t = doc.wrap(celda, negrita ? doc.bold : doc.font, 8.5, colW - 8)[0] ?? '';
        doc.page.drawText(t, { x: M + i * colW + 4, y: yTop - 11, size: 8.5, font: negrita ? doc.bold : doc.font, color: negrita ? C.soft : C.ink });
      });
      doc.page.drawLine({ start: { x: M, y: yTop - rowH }, end: { x: PAGE_W - M, y: yTop - rowH }, thickness: 0.5, color: C.border });
      doc.y = yTop - rowH;
    };
    pintarFila(encabezados, true, true);
    for (const fila of cuerpo) pintarFila(fila, false);
    doc.espacio(6);
  }

  private async dibujarImagenCampo(doc: Doc, c: Campo, valor: unknown, dicomPorCampo: Map<string, string>) {
    if (c.origen === 'referencia' && c.refUrl) {
      const bytes = await this.fetchBytes(c.refUrl);
      if (bytes) await this.embeber(doc, bytes, extDeUrl(c.refUrl), c.nombre);
      return;
    }
    // origen dicom: el cliente mandó el PNG rasterizado del visor.
    const b64 = dicomPorCampo.get(c.id);
    if (b64) {
      const bytes = Buffer.from(b64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      await this.embeber(doc, bytes, 'png', c.nombre);
    }
  }

  private async dibujarGaleria(doc: Doc, img: ImgGaleria) {
    if (img.ext === 'dcm') return; // .dcm no es embebible server-side (sin raster)
    const url = this.storage.firmarLectura(img.ref);
    const bytes = await this.fetchBytes(url);
    if (bytes) await this.embeber(doc, bytes, img.ext, img.pie);
  }

  /** Embebe una imagen (PNG/JPG) escalada al ancho del contenido, con pie opcional. */
  private async embeber(doc: Doc, bytes: Uint8Array | Buffer, ext: string, pie?: string) {
    let img: PDFImage;
    try {
      img = ext === 'png' ? await doc.pdf.embedPng(bytes) : await doc.pdf.embedJpg(bytes);
    } catch {
      try {
        img = await doc.pdf.embedPng(bytes); // último intento como PNG
      } catch {
        return; // imagen ilegible: se omite antes que romper el PDF
      }
    }
    const maxW = Math.min(CONTENT_W, 360);
    const maxH = 260;
    let w = img.width;
    let h = img.height;
    const escala = Math.min(maxW / w, maxH / h, 1);
    w *= escala;
    h *= escala;
    const pieAlto = pie ? 13 : 0;
    doc.asegurar(h + pieAlto + 8);
    doc.page.drawImage(img, { x: M, y: doc.y - h, width: w, height: h });
    doc.y -= h + 2;
    if (pie) {
      doc.page.drawText(san(pie), { x: M, y: doc.y - 9, size: 8.5, font: doc.font, color: C.muted });
      doc.y -= pieAlto;
    }
    doc.espacio(8);
  }

  private impresionDiagnostica(doc: Doc, impresion: string) {
    const t = san(impresion).trim();
    if (!t) return;
    doc.espacio(2);
    doc.linea();
    doc.espacio(4);
    doc.texto('IMPRESIÓN DIAGNÓSTICA', { size: 9, font: doc.bold, color: C.teal, gap: 4 });
    doc.texto(t, { size: 11, color: C.ink, gap: 4 });
  }

  private firma(doc: Doc, paciente: Record<string, unknown>) {
    doc.asegurar(72);
    doc.espacio(24);
    const solicitante = leerTexto(paciente.solicitante).trim();
    const anchoFirma = 240;
    const xFirma = PAGE_W - M - anchoFirma;
    const yLinea = doc.y - 24;
    doc.page.drawLine({ start: { x: xFirma, y: yLinea }, end: { x: PAGE_W - M, y: yLinea }, thickness: 0.75, color: C.soft });
    doc.page.drawText(san(solicitante || 'Médico responsable'), {
      x: xFirma,
      y: yLinea - 13,
      size: 10,
      font: doc.bold,
      color: C.ink,
    });
    doc.page.drawText('Cédula profesional: ______________', {
      x: xFirma,
      y: yLinea - 27,
      size: 9,
      font: doc.font,
      color: C.muted,
    });
    doc.y = yLinea - 34;
  }

  private pieDePagina(doc: Doc) {
    const paginas = doc.pdf.getPages();
    const total = paginas.length;
    paginas.forEach((p, i) => {
      p.drawText(san(`Médica Capacitación · Reporte clínico · página ${i + 1} de ${total}`), {
        x: M,
        y: 28,
        size: 8,
        font: doc.font,
        color: C.muted,
      });
    });
  }

  private async fetchBytes(url: string): Promise<Uint8Array | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch {
      return null;
    }
  }
}

/** Recorta el título si no cabe en el ancho disponible (membrete). */
function bold_width(font: PDFFont, texto: string, size: number, xLimite: number): { texto: string; ancho: number } {
  const maxW = xLimite - M;
  let t = texto;
  while (t.length > 4 && font.widthOfTextAtSize(t, size) > maxW) t = t.slice(0, -2);
  const ancho = font.widthOfTextAtSize(t === texto ? t : t + '…', size);
  return { texto: t === texto ? t : san(t + '...'), ancho };
}

function extDeUrl(url: string): string {
  const limpio = url.split('?')[0] ?? '';
  const m = /\.(png|jpg|jpeg)$/i.exec(limpio);
  return m ? (m[1]!.toLowerCase() === 'png' ? 'png' : 'jpg') : 'jpg';
}
