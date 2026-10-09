/**
 * Backfill one-time de THUMBNAILS de caso/estudio (§5A/§10) — mig 0078.
 *
 * Para cada caso ya ANONIMIZADO sin `estudio_thumb_ref` (bitácora + biblioteca), genera el
 * thumb server-side REUSANDO el pipeline existente, sin tocar el binario del estudio:
 *   1) api  POST /dicom/casos/:id/ingesta/estudio          → URL firmada de la serie 0 (anonimizada)
 *   2) descarga esa serie (ya SIN PII · §10) de object storage
 *   3) redactor POST /redact                                → header X-Thumb-B64 (thumb del frame YA
 *      redactado; el .dcm anonimizado no tiene nombre → redacciones 0, pero igual emite el thumb)
 *   4) api  POST /dicom/casos/:id/ingesta/firmar-anonimizados → URL firmada de ESCRITURA del thumb
 *   5) PUT del JPEG a `media/imagenes/casos/{id}/thumb.jpg`
 *   6) update `estudio_thumb_ref` = esa ref
 *
 * IDEMPOTENTE: solo toca casos con `estudio_thumb_ref is null`; re-ejecutar no duplica. Un caso
 * que falle (sin series, redactor caído, sin thumb) se SALTA y se reporta — no aborta el lote.
 * §10: el thumb sale de la serie ANONIMIZADA (salida del redactor), jamás del original.
 *
 * DÓNDE CORRERLO: en la MISMA red que el worker (las URLs firmadas de ESCRITURA del thumb/series
 * apuntan al endpoint INTERNO de storage — `minio:9000` en local — igual que las que usa el worker;
 * desde el host NO resuelven). Plain Node (sin tsx): solo necesita el módulo `postgres` y `fetch`.
 *   · LOCAL (red del compose):
 *       docker run --rm --network campus-lxp_default -v "<repo>/packages/db":/w -w /w \
 *         -e DATABASE_URL=postgresql://lxp:lxp_dev_password@postgres:5432/campus_lxp \
 *         -e API_URL=http://api:8000 -e REDACTOR_URL=http://redactor-dicom:8002 \
 *         node:20 sh -c "npm i --no-save --silent postgres@3 && node backfill-thumbs.mjs"
 *   · PROD (en el VPS, dentro de la red de contenedores del LXP): mismas envs apuntando a los
 *     servicios internos. Son ~2 casos (medición read-only previa).
 *
 * Config por env (defaults = nombres de servicio del compose):
 *   DATABASE_URL (postgres:5432) · API_URL (http://api:8000) · REDACTOR_URL (http://redactor-dicom:8002)
 */
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://lxp:lxp_dev_password@postgres:5432/campus_lxp';
const API_URL = process.env.API_URL ?? 'http://api:8000';
const REDACTOR_URL = process.env.REDACTOR_URL ?? 'http://redactor-dicom:8002';

const sql = postgres(DATABASE_URL, { prepare: false, max: 4 });

/** Lista los casos anonimizados SIN thumb (con al menos una serie) en ambas tablas. */
async function pendientes() {
  const q = (tabla) => sql`
    select id, (estudio_series->0->>'tipo') as tipo0
    from lxp.${sql(tabla)}
    where estudio_estado = 'anonimizado'
      and estudio_thumb_ref is null
      and jsonb_array_length(coalesce(estudio_series, '[]'::jsonb)) >= 1`;
  const bc = await q('bitacora_casos');
  const cb = await q('casos_biblioteca');
  const map = (rows, tabla) =>
    rows.map((r) => ({ id: r.id, tabla, tipo0: r.tipo0 === 'imagen' ? 'imagen' : 'dicom' }));
  return [...map(bc, 'bitacora_casos'), ...map(cb, 'casos_biblioteca')];
}

/** URL firmada de lectura de la serie 0 del estudio anonimizado. */
async function urlSerie0(id, tabla) {
  const r = await fetch(`${API_URL}/dicom/casos/${encodeURIComponent(id)}/ingesta/estudio`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tabla }),
  });
  if (!r.ok) return null;
  const d = await r.json();
  const s = d.series?.[0];
  return s ? { url: s.urlLectura, tipo: s.tipo === 'imagen' ? 'imagen' : 'dicom' } : null;
}

async function descargar(url) {
  const r = await fetch(url);
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.byteLength > 0 ? buf : null;
}

/** Manda la serie al redactor y devuelve el thumb JPEG del header X-Thumb-B64 (o null). */
async function thumbDelRedactor(buf, tipo) {
  const contentType = tipo === 'imagen' ? 'image/jpeg' : 'application/dicom';
  const r = await fetch(`${REDACTOR_URL}/redact`, {
    method: 'POST', headers: { 'content-type': contentType },
    body: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
  });
  if (!r.ok) return null;
  if (r.headers.get('x-revision-manual') === '1') return null; // cuarentena → sin thumb
  const b64 = r.headers.get('x-thumb-b64') ?? '';
  return b64 ? Buffer.from(b64, 'base64') : null;
}

/** URL firmada de ESCRITURA del thumb del caso (api = único firmante · §3). */
async function firmarThumb(id, tabla) {
  const r = await fetch(`${API_URL}/dicom/casos/${encodeURIComponent(id)}/ingesta/firmar-anonimizados`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tabla, cantidad: 1 }),
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.thumb ?? null;
}

async function main() {
  let hechos = 0, saltados = 0;
  try {
    const lista = await pendientes();
    console.log(`\n  Backfill de thumbs — ${lista.length} caso(s) anonimizado(s) sin thumb\n  ${'─'.repeat(52)}`);
    for (const p of lista) {
      const etiqueta = `${p.tabla.slice(0, 3)}:${p.id.slice(0, 8)}`;
      try {
        const serie = await urlSerie0(p.id, p.tabla);
        if (!serie) { console.log(`  ⊘ ${etiqueta}  sin serie legible`); saltados++; continue; }
        const bin = await descargar(serie.url);
        if (!bin) { console.log(`  ⊘ ${etiqueta}  no se pudo descargar la serie`); saltados++; continue; }
        const thumb = await thumbDelRedactor(bin, serie.tipo);
        if (!thumb) { console.log(`  ⊘ ${etiqueta}  el redactor no emitió thumb`); saltados++; continue; }
        const dest = await firmarThumb(p.id, p.tabla);
        if (!dest) { console.log(`  ⊘ ${etiqueta}  el api no firmó el destino del thumb`); saltados++; continue; }
        const put = await fetch(dest.urlSubida, {
          method: 'PUT', headers: { 'content-type': 'image/jpeg' },
          body: new Uint8Array(thumb.buffer, thumb.byteOffset, thumb.byteLength),
        });
        if (!put.ok) { console.log(`  ⊘ ${etiqueta}  PUT del thumb falló (${put.status})`); saltados++; continue; }
        if (p.tabla === 'casos_biblioteca') {
          await sql`update lxp.casos_biblioteca set estudio_thumb_ref = ${dest.ref} where id = ${p.id}`;
        } else {
          await sql`update lxp.bitacora_casos set estudio_thumb_ref = ${dest.ref} where id = ${p.id}`;
        }
        console.log(`  ✓ ${etiqueta}  → ${dest.ref} (${thumb.byteLength} B)`);
        hechos++;
      } catch (e) {
        console.log(`  ⊘ ${etiqueta}  error: ${String(e)}`);
        saltados++;
      }
    }
    console.log(`  ${'─'.repeat(52)}\n  ${hechos} con thumb · ${saltados} saltados\n`);
  } finally {
    await sql.end();
  }
}

main().catch((err) => { console.error('✗ backfill-thumbs falló:', err); process.exit(1); });
