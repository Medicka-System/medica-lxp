/**
 * Backfill one-time de DERIVADOS responsivos (Fase 2 entrega) de las imágenes de CONTENIDO de
 * posts del Ateneo (`media/imagenes/{id}.{ext}`). Para cada imagen de post que aún NO tiene su
 * derivado `640.webp`, encola la generación vía `POST /media/imagenes/derivar` (el worker genera
 * 640/1080/1600 webp). IDEMPOTENTE: re-ejecutar cuando ya existen → 0 pendientes.
 *
 * Alcance: SOLO imágenes de contenido de posts (`posts_ateneo.media[].tipo='imagen'`). Avatares/
 * portadas (chicas) y `.dcm` del visor quedan fuera (§10). No toca el original.
 *
 * DÓNDE CORRERLO: donde resuelvan el `api` interno y el storage (igual que el worker).
 *   · LOCAL (host; api/minio publicados): API_URL=http://localhost:8000, DATABASE_URL local.
 *   · PROD: en la red del compose (netns del worker), API_URL=http://api:8000, DB = Supabase.
 * Plain Node (sin tsx): solo `postgres` + `fetch`.
 */
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://lxp:lxp_dev_password@127.0.0.1:5432/campus_lxp';
const API_URL = process.env.API_URL ?? 'http://api:8000';
const sql = postgres(DATABASE_URL, { prepare: false, max: 4 });

/** Clave del derivado {ancho} de un original de contenido, o null si no es derivable. */
function claveDerivado(ref, ancho) {
  if (typeof ref !== 'string' || !ref.startsWith('media/imagenes/')) return null;
  const resto = ref.slice('media/imagenes/'.length);
  if (resto.includes('/')) return null; // subpaths (casos/, {id}/{w}.webp) fuera
  const m = /\.([a-z0-9]+)$/i.exec(resto);
  if (!m || !['jpg', 'jpeg', 'png', 'webp'].includes(m[1].toLowerCase())) return null;
  return `media/imagenes/${resto.replace(/\.[^.]+$/, '')}/${ancho}.webp`;
}

/** ¿existe ya el derivado 640.webp? (firma lectura + GET). */
async function existeDerivado(ref) {
  const k = claveDerivado(ref, 640);
  if (!k) return true; // no derivable → se trata como "nada que hacer"
  const f = await (await fetch(`${API_URL}/media/imagenes/firmar-lectura`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refs: [k] }),
  })).json();
  const u = f.urls?.[k];
  if (!u) return false;
  const g = await fetch(u);
  return g.status === 200;
}

async function main() {
  try {
    const filas = await sql`
      select distinct elem->>'url' as ref
      from lxp.posts_ateneo p, jsonb_array_elements(p.media) elem
      where p.media is not null
        and elem->>'tipo' = 'imagen'
        and elem->>'url' like 'media/imagenes/%'`;
    const refs = filas.map((f) => f.ref).filter((r) => claveDerivado(r, 640));
    console.log(`\n  Backfill derivados — ${refs.length} imagen(es) de contenido en posts\n  ${'─'.repeat(52)}`);
    const pendientes = [];
    for (const ref of refs) {
      if (await existeDerivado(ref)) {
        console.log(`  ✓ ya tiene derivados  ${ref}`);
      } else {
        pendientes.push(ref);
        console.log(`  … pendiente           ${ref}`);
      }
    }
    if (pendientes.length) {
      const r = await (await fetch(`${API_URL}/media/imagenes/derivar`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refs: pendientes }),
      })).json();
      console.log(`  → encolados ${r.encolados} job(s) de derivados (el worker los genera)`);
    }
    console.log(`  ${'─'.repeat(52)}\n  ${refs.length - pendientes.length} con derivados · ${pendientes.length} encolados\n`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => { console.error('✗ backfill-derivados falló:', e); process.exit(1); });
