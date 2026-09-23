/**
 * Re-enmascarado ONE-SHOT de la PII quemada en píxeles (§10) para estudios YA ingeridos.
 *
 * El crudo se borró tras la anonimización, pero el `.dcm` anonimizado conserva los tags
 * limpios + la región de ultrasonido + los píxeles quemados. Este script los re-procesa
 * IN-PLACE: baja cada serie (URL firmada del `api`, único firmante §3), redacta lo exterior
 * a la región (`redactarPixeles`) y la vuelve a subir a la MISMA ref. No toca la BD (la
 * traza se actualiza aparte). Los estudios NUEVOS ya salen redactados por el pipeline.
 *
 *   pnpm --filter worker exec tsx src/scripts/remascarar.ts <casoId> <bitacora_casos|casos_biblioteca>
 */
import * as dcmjs from 'dcmjs';
import { redactarPixeles } from '../jobs/dicom/redaccion-pixeles';

const { DicomMessage, DicomMetaDictionary, DicomDict } = dcmjs.data;

interface SerieLectura {
  urlLectura: string;
}

async function main(): Promise<void> {
  const [casoId, tabla = 'bitacora_casos'] = process.argv.slice(2);
  if (!casoId) throw new Error('Uso: remascarar.ts <casoId> [tabla]');
  const api = process.env.API_URL ?? 'http://localhost:8000';

  // URLs firmadas de LECTURA por serie.
  const lect = await fetch(`${api}/dicom/casos/${casoId}/ingesta/estudio`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tabla }),
  });
  if (!lect.ok) throw new Error(`/estudio HTTP ${lect.status}`);
  const { series } = (await lect.json()) as { series: SerieLectura[] };
  if (series.length === 0) throw new Error('El estudio no tiene series.');

  // URLs firmadas de ESCRITURA a las MISMAS refs (0.dcm..N-1.dcm).
  const firma = await fetch(`${api}/dicom/casos/${casoId}/ingesta/firmar-anonimizados`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tabla, cantidad: series.length, desde: 0 }),
  });
  if (!firma.ok) throw new Error(`/firmar-anonimizados HTTP ${firma.status}`);
  const { destinos } = (await firma.json()) as { destinos: { urlSubida: string }[] };

  let totalRedactados = 0;
  let revisionManual = false;
  const metodos = new Set<string>();

  for (let i = 0; i < series.length; i++) {
    const bin = await (await fetch(series[i]!.urlLectura)).arrayBuffer();
    const leido = DicomMessage.readFile(bin, { ignoreErrors: true }) as {
      dict: Record<string, unknown>;
      meta: Record<string, unknown>;
    };
    const dataset = DicomMetaDictionary.naturalizeDataset(leido.dict) as Record<string, unknown>;
    const r = redactarPixeles(dataset);
    totalRedactados += r.pixeles_redactados;
    if (r.revision_manual) revisionManual = true;
    metodos.add(r.metodo);

    const dict = new DicomDict(leido.meta);
    dict.dict = DicomMetaDictionary.denaturalizeDataset(dataset);
    const buffer = Buffer.from(dict.write());
    const put = await fetch(destinos[i]!.urlSubida, {
      method: 'PUT',
      headers: { 'content-type': 'application/dicom' },
      body: new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    });
    if (!put.ok) throw new Error(`PUT serie ${i} HTTP ${put.status}`);
    process.stdout.write(`  serie ${i}: ${r.metodo} · ${r.pixeles_redactados} px${r.revision_manual ? ' · REVISIÓN' : ''}\n`);
  }

  // Resumen JSON (lo consume el orquestador para actualizar la traza en la BD).
  console.log(
    JSON.stringify({
      casoId,
      tabla,
      series: series.length,
      redaccion_pixel: metodos.size > 1 ? 'mixto' : [...metodos][0],
      revision_manual: revisionManual,
      pixeles_redactados: totalRedactados,
    }),
  );
}

main().catch((e) => {
  console.error('✗ remascarar falló:', e);
  process.exit(1);
});
