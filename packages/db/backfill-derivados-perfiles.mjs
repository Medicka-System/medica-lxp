/**
 * Backfill one-time de DERIVADOS responsivos de AVATARES y PORTADAS (perfil + grupo).
 * Para cada imagen que aún NO tiene su primer derivado, encola la generación con su TIPO
 * (avatar 48/96/192 · portada 640/1280). IDEMPOTENTE: re-ejecutar cuando ya existen → 0.
 *
 * Fuentes: lxp.perfiles.avatar_url (avatar) · lxp.perfiles.portada_url (portada) ·
 * lxp.grupos.imagen_portada (portada). (Portadas de programa/módulo: si existen columnas, se
 * añaden aquí; hoy el flujo con upload+encolado es grupo.) Solo `media/imagenes/{uuid}.{ext}`.
 *
 * DÓNDE CORRERLO: donde resuelvan el `api` interno y el storage (igual que el worker).
 *   LOCAL: API_URL=http://localhost:8000, DATABASE_URL local. PROD: red del compose.
 * Plain Node (sin tsx): `postgres` + `fetch`.
 */
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://lxp:lxp_dev_password@127.0.0.1:5432/campus_lxp';
const API_URL = process.env.API_URL ?? 'http://api:8000';
const sql = postgres(DATABASE_URL, { prepare: false, max: 4 });

const ANCHO_CHECK = { avatar: 48, portada: 640 }; // primer derivado por tipo (para existencia)

function claveDerivado(ref, ancho) {
  if (typeof ref !== 'string' || !ref.startsWith('media/imagenes/')) return null;
  const resto = ref.slice('media/imagenes/'.length);
  if (resto.includes('/')) return null;
  const m = /\.([a-z0-9]+)$/i.exec(resto);
  if (!m || !['jpg', 'jpeg', 'png', 'webp'].includes(m[1].toLowerCase())) return null;
  return `media/imagenes/${resto.replace(/\.[^.]+$/, '')}/${ancho}.webp`;
}

async function existeDerivado(ref, tipo) {
  const k = claveDerivado(ref, ANCHO_CHECK[tipo]);
  if (!k) return true; // no derivable → nada que hacer
  const f = await (await fetch(`${API_URL}/media/imagenes/firmar-lectura`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refs: [k] }),
  })).json();
  const u = f.urls?.[k];
  if (!u) return false;
  return (await fetch(u)).status === 200;
}

async function main() {
  let hechos = 0, pendientes = 0;
  try {
    // { ref, tipo } de todas las imágenes de perfil/grupo
    const av = await sql`select avatar_url ref, 'avatar' tipo from lxp.perfiles where avatar_url like 'media/imagenes/%'`;
    const po = await sql`select portada_url ref, 'portada' tipo from lxp.perfiles where portada_url like 'media/imagenes/%'`;
    const gp = await sql`select imagen_portada ref, 'portada' tipo from lxp.grupos where imagen_portada like 'media/imagenes/%'`;
    const items = [...av, ...po, ...gp].filter((i) => claveDerivado(i.ref, 48));
    console.log(`\n  Backfill derivados perfil/grupo — ${items.length} imagen(es)\n  ${'─'.repeat(52)}`);
    // Agrupar por tipo los pendientes para encolar en lote
    const porTipo = { avatar: [], portada: [] };
    for (const it of items) {
      if (await existeDerivado(it.ref, it.tipo)) {
        console.log(`  ✓ ya tiene derivados [${it.tipo}]  ${it.ref}`);
      } else {
        porTipo[it.tipo].push(it.ref);
        pendientes++;
        console.log(`  … pendiente [${it.tipo}]  ${it.ref}`);
      }
    }
    for (const tipo of ['avatar', 'portada']) {
      if (porTipo[tipo].length) {
        const r = await (await fetch(`${API_URL}/media/imagenes/derivar`, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ refs: porTipo[tipo], tipo }),
        })).json();
        console.log(`  → encolados ${r.encolados} [${tipo}]`);
        hechos += r.encolados ?? 0;
      }
    }
    console.log(`  ${'─'.repeat(52)}\n  ${items.length - pendientes} con derivados · ${hechos} encolados\n`);
  } finally {
    await sql.end();
  }
}

main().catch((e) => { console.error('✗ backfill-derivados-perfiles falló:', e); process.exit(1); });
