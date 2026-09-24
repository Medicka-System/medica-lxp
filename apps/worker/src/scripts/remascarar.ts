/**
 * Re-redacción ONE-SHOT de la PII quemada en píxeles (§10) para estudios YA ingeridos,
 * ahora con el servicio Presidio (OCR+NER) — reemplaza el enmascarado por región anterior.
 *
 * El crudo se borró tras la anonimización, pero el `.dcm` anonimizado conserva los tags
 * limpios + los píxeles quemados. Baja cada serie (URL firmada del `api`, único firmante
 * §3), la pasa por `redactor-dicom` (tapa SOLO la caja del nombre) y la re-sube a la MISMA
 * ref. Imprime un resumen para actualizar la traza en la BD.
 *
 *   node <tsx> apps/worker/src/scripts/remascarar.ts <casoId> <bitacora_casos|casos_biblioteca>
 */
interface SerieLectura {
  urlLectura: string;
}

async function main(): Promise<void> {
  const [casoId, tabla = 'bitacora_casos'] = process.argv.slice(2);
  if (!casoId) throw new Error('Uso: remascarar.ts <casoId> [tabla]');
  const api = process.env.API_URL ?? 'http://localhost:8000';
  const redactor = process.env.REDACTOR_URL ?? 'http://localhost:8002';

  const lect = await fetch(`${api}/dicom/casos/${casoId}/ingesta/estudio`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tabla }),
  });
  if (!lect.ok) throw new Error(`/estudio HTTP ${lect.status}`);
  const { series } = (await lect.json()) as { series: SerieLectura[] };
  if (series.length === 0) throw new Error('El estudio no tiene series.');

  const firma = await fetch(`${api}/dicom/casos/${casoId}/ingesta/firmar-anonimizados`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tabla, cantidad: series.length, desde: 0 }),
  });
  if (!firma.ok) throw new Error(`/firmar-anonimizados HTTP ${firma.status}`);
  const { destinos } = (await firma.json()) as { destinos: { urlSubida: string }[] };

  let totalCajas = 0;
  let revisionManual = false;

  for (let i = 0; i < series.length; i++) {
    const bin = await (await fetch(series[i]!.urlLectura)).arrayBuffer();
    // Presidio: tapa SOLO el nombre.
    const red = await fetch(`${redactor}/redact`, {
      method: 'POST',
      headers: { 'content-type': 'application/dicom' },
      body: new Uint8Array(bin),
    });
    if (!red.ok) throw new Error(`redactor-dicom serie ${i} HTTP ${red.status}`);
    const redactado = Buffer.from(await red.arrayBuffer());
    const cajas = Number(red.headers.get('x-redacciones') ?? '0');
    const revision = red.headers.get('x-revision-manual') === '1';
    totalCajas += cajas;
    if (revision) revisionManual = true;

    const put = await fetch(destinos[i]!.urlSubida, {
      method: 'PUT',
      headers: { 'content-type': 'application/dicom' },
      body: new Uint8Array(redactado.buffer, redactado.byteOffset, redactado.byteLength),
    });
    if (!put.ok) throw new Error(`PUT serie ${i} HTTP ${put.status}`);
    process.stdout.write(`  serie ${i}: ${cajas} caja(s) de nombre${revision ? ' · REVISIÓN' : ''}\n`);
  }

  console.log(
    JSON.stringify({ casoId, tabla, series: series.length, cajas_redactadas: totalCajas, revision_manual: revisionManual }),
  );
}

main().catch((e) => {
  console.error('✗ remascarar falló:', e);
  process.exit(1);
});
