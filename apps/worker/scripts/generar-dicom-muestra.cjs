/**
 * Genera un `.dcm` P10 de MUESTRA (ultrasonido sintético 256×256, MONOCHROME2 8-bit)
 * CON PII del paciente, para probar el pipeline de ingesta en local (§4.7). El worker
 * `procesar-dicom` debe removerle toda la PII y dejar el estudio educativo.
 *
 * Uso:  node apps/worker/scripts/generar-dicom-muestra.cjs [ruta-salida.dcm]
 * Def.: muestras/estudio-muestra.dcm (en la raíz del repo).
 *
 * Nota: dcmjs emite warnings de VR al escribir un dataset hecho a mano — son
 * inofensivos (el archivo se re-lee correcto); los silenciamos para no ensuciar.
 */
const fs = require('node:fs');
const path = require('node:path');
const dcmjs = require('dcmjs');

// NOTA: al escribir un dataset hecho a mano, dcmjs imprime unos avisos
// "Invalid vr type … - using UN/OW". Son INOFENSIVOS (el archivo se re-lee correcto
// y se verificó de punta a punta); no se pueden silenciar sin parchear la librería.

const { DicomMetaDictionary, DicomDict } = dcmjs.data;

const W = 256;
const H = 256;

// Imagen tipo "sector" de ultrasonido: abanico claro sobre fondo oscuro.
const pixels = new Uint8Array(W * H);
const cx = W / 2;
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - cx;
    const dy = y; // vértice arriba
    const r = Math.hypot(dx, dy);
    const ang = Math.abs(Math.atan2(dx, dy)); // 0 = hacia abajo
    const dentro = ang < 0.62 && r > 24 && r < 232;
    if (!dentro) {
      pixels[y * W + x] = 0;
      continue;
    }
    // Textura moteada (speckle) + atenuación con la profundidad.
    const speckle = ((x * 13 + y * 7 + ((x * y) % 17)) % 64) - 32;
    const base = 210 - (r / 232) * 150;
    pixels[y * W + x] = Math.max(0, Math.min(255, Math.round(base + speckle)));
  }
}

const meta = {
  FileMetaInformationVersion: new Uint8Array([0, 1]).buffer,
  MediaStorageSOPClassUID: '1.2.840.10008.5.1.4.1.1.6.1', // US Image Storage
  MediaStorageSOPInstanceUID: DicomMetaDictionary.uid(),
  TransferSyntaxUID: '1.2.840.10008.1.2.1', // Explicit VR Little Endian (sin comprimir)
  ImplementationClassUID: DicomMetaDictionary.uid(),
};

const dataset = {
  // ── PII del paciente / personal (DEBE desaparecer al anonimizar · §10) ──
  PatientName: 'PEREZ^GARCIA^JUANA',
  PatientID: 'MRN-0099887',
  PatientBirthDate: '19850317',
  PatientSex: 'F',
  ReferringPhysicianName: 'LOPEZ^ANA',
  PerformingPhysicianName: 'RAMIREZ^C',
  OperatorsName: 'TEC^MARTINEZ',
  InstitutionName: 'Hospital Central de Prueba',
  InstitutionAddress: 'Av. Siempre Viva 123',
  StationName: 'US-ROOM-2',
  DeviceSerialNumber: 'SN-ABC-123456',
  AccessionNumber: 'ACC-778899',
  StudyID: 'STID-42',

  // ── Clínico / técnico (DEBE conservarse) · solo ASCII (charset DICOM por defecto) ──
  Modality: 'US',
  StudyDescription: 'POCUS Abdomen - FAST',
  SeriesDescription: 'Rinon derecho - longitudinal',
  BodyPartExamined: 'ABDOMEN',
  StudyInstanceUID: DicomMetaDictionary.uid(),
  SeriesInstanceUID: DicomMetaDictionary.uid(),
  SOPInstanceUID: meta.MediaStorageSOPInstanceUID,
  SOPClassUID: '1.2.840.10008.5.1.4.1.1.6.1',

  // ── Imagen ──
  Rows: H,
  Columns: W,
  SamplesPerPixel: 1,
  PhotometricInterpretation: 'MONOCHROME2',
  BitsAllocated: 8,
  BitsStored: 8,
  HighBit: 7,
  PixelRepresentation: 0,
  NumberOfFrames: 1,
  PixelData: [pixels.buffer],
};

const dict = new DicomDict(meta);
dict.dict = DicomMetaDictionary.denaturalizeDataset(dataset);
// Etiqueta privada (grupo impar 0009) inyectada como tag crudo — así queda REALMENTE
// en el binario para que el worker la remueva (§10). denaturalize la descartaría.
dict.dict['00090010'] = { vr: 'LO', Value: ['VENDOR-PRIVADO-XYZ'] };
const p10 = Buffer.from(dict.write());

const salida = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, '../../../muestras/estudio-muestra.dcm');
fs.mkdirSync(path.dirname(salida), { recursive: true });
fs.writeFileSync(salida, p10);

console.log(`✅ Muestra DICOM generada: ${salida} (${p10.length} bytes)`);
console.log('   PII incluida (a remover): PatientName, PatientID, ReferringPhysicianName,');
console.log('   InstitutionName, AccessionNumber, StudyID, tag privado 0009,0010 …');
console.log('   Clínico (a conservar): Modality=US, StudyDescription, SeriesDescription, imagen 256×256.');
