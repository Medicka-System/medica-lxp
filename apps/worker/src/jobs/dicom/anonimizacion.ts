/**
 * Anonimización DICOM — lógica PURA (§10 · Sprint 4.7). Quita la PII del paciente
 * de un estudio (dataset a nivel estudio + cada serie), deja intactos los datos
 * clínicos (modalidad, descripciones, frames), y produce una TRAZA auditable de
 * qué se removió. No hace I/O: el worker `procesar-dicom` la usa antes de persistir.
 *
 * INVARIANTE §10: ningún caso educativo persiste con PII. El worker anonimiza de
 * forma BLOQUEANTE y VERIFICA con `verificarSinPII` antes de guardar; si algo de
 * PII sobrevive, no se persiste (el job falla y reintenta).
 *
 * No parsea el binario P10 (eso requeriría un parser DICOM, dependencia a acordar):
 * opera sobre el dataset ya parseado (tag→valor por keyword DICOM canónico).
 */

export const MOTOR_ANON = 'lxp-dicom-anon';
export const VERSION_ANON = '1';

/** Dataset DICOM parseado: keyword canónico (o "gggg,eeee") → valor. */
export type DicomDataset = Record<string, string | number | null>;

/** Serie del estudio (multi-frame / cine-loop). */
export interface SerieDicom {
  series_uid: string;
  modalidad: string;
  frames: number;
  instancias?: number;
  dataset: DicomDataset;
}

/** Estudio DICOM parseado (nivel estudio + series). */
export interface EstudioDicom {
  study_uid: string;
  dataset: DicomDataset;
  series: SerieDicom[];
}

/** Traza auditable de la anonimización (§10). */
export interface TrazaAnonimizacion {
  motor: string;
  version: string;
  /** Keywords/tag únicos removidos en todo el estudio. */
  campos_removidos: string[];
  /** Total de ocurrencias removidas (estudio + series). */
  removidos_n: number;
  /** Cuántas series se procesaron. */
  series_procesadas: number;
  /** ¿La verificación posterior confirmó que no queda PII? */
  verificado: boolean;
}

/**
 * Identificadores directos del paciente y personas/instituciones (subconjunto del
 * perfil de confidencialidad DICOM, PS3.15). Se REMUEVEN. Lo clínico
 * (StudyDescription, SeriesDescription, hallazgos, modalidad, frames) se CONSERVA.
 */
export const PII_KEYWORDS: ReadonlySet<string> = new Set([
  // Paciente
  'PatientName',
  'PatientID',
  'IssuerOfPatientID',
  'OtherPatientIDs',
  'OtherPatientIDsSequence',
  'OtherPatientNames',
  'PatientBirthDate',
  'PatientBirthTime',
  'PatientBirthName',
  'PatientMotherBirthName',
  'PatientAddress',
  'PatientTelephoneNumbers',
  'PatientInsurancePlanCodeSequence',
  'PatientReligiousPreference',
  'MilitaryRank',
  'BranchOfService',
  'ResponsiblePerson',
  'ResponsiblePersonRole',
  'ResponsibleOrganization',
  'PatientComments',
  // Personal clínico / institución
  'ReferringPhysicianName',
  'ReferringPhysicianAddress',
  'ReferringPhysicianTelephoneNumbers',
  'PerformingPhysicianName',
  'NameOfPhysiciansReadingStudy',
  'PhysiciansOfRecord',
  'RequestingPhysician',
  'ScheduledPerformingPhysicianName',
  'OperatorsName',
  'InstitutionName',
  'InstitutionAddress',
  'InstitutionalDepartmentName',
  'StationName',
  'DeviceSerialNumber',
  // Identificadores de orden/estudio ligados a la persona
  'AccessionNumber',
  'StudyID',
]);

/**
 * ¿La clave es una etiqueta privada DICOM (grupo impar)? Se remueve. Acepta ambas
 * formas: puntuada "gggg,eeee" (pipeline JSON) y contigua "ggggeeee" (así naturaliza
 * dcmjs las etiquetas privadas/desconocidas al leer un binario P10 · anonimización real).
 */
export function esTagPrivado(clave: string): boolean {
  const m = /^([0-9a-fA-F]{4}),?([0-9a-fA-F]{4})$/.exec(clave);
  if (!m) return false;
  const grupo = parseInt(m[1] as string, 16);
  return grupo % 2 === 1; // grupos impares = privados (PS3.5)
}

/** ¿La clave debe removerse por ser PII o etiqueta privada? */
export function esPII(clave: string): boolean {
  return PII_KEYWORDS.has(clave) || esTagPrivado(clave);
}

/** Anonimiza un dataset: devuelve copia sin PII + las claves removidas. Puro. */
export function anonimizarDataset(ds: DicomDataset): {
  limpio: DicomDataset;
  removidos: string[];
} {
  const limpio: DicomDataset = {};
  const removidos: string[] = [];
  for (const [clave, valor] of Object.entries(ds)) {
    // Solo cuenta como removido si realmente había un valor presente.
    if (esPII(clave)) {
      if (valor !== null && valor !== undefined && valor !== '') {
        removidos.push(clave);
      }
      continue; // se descarta la etiqueta (esté vacía o no)
    }
    limpio[clave] = valor;
  }
  return { limpio, removidos };
}

/**
 * Anonimiza un estudio completo (dataset de estudio + cada serie). Conserva la
 * estructura (series, frames) y produce la traza. NO muta el estudio de entrada.
 */
export function anonimizarEstudio(estudio: EstudioDicom): {
  estudio: EstudioDicom;
  traza: TrazaAnonimizacion;
} {
  const removidosTotales: string[] = [];

  const estudioNivel = anonimizarDataset(estudio.dataset);
  removidosTotales.push(...estudioNivel.removidos);

  const series: SerieDicom[] = estudio.series.map((s) => {
    const r = anonimizarDataset(s.dataset);
    removidosTotales.push(...r.removidos);
    return {
      series_uid: s.series_uid,
      modalidad: s.modalidad,
      frames: s.frames,
      ...(s.instancias !== undefined ? { instancias: s.instancias } : {}),
      dataset: r.limpio,
    };
  });

  const limpio: EstudioDicom = {
    study_uid: estudio.study_uid,
    dataset: estudioNivel.limpio,
    series,
  };

  const verificado = verificarSinPII(limpio).length === 0;

  return {
    estudio: limpio,
    traza: {
      motor: MOTOR_ANON,
      version: VERSION_ANON,
      campos_removidos: [...new Set(removidosTotales)].sort(),
      removidos_n: removidosTotales.length,
      series_procesadas: series.length,
      verificado,
    },
  };
}

/**
 * Verificación defensiva: devuelve las claves PII que AÚN sobreviven en el estudio
 * (estudio + series). Vacío ⇒ limpio. El worker la usa como guardia bloqueante.
 */
export function verificarSinPII(estudio: EstudioDicom): string[] {
  const restos: string[] = [];
  const escanear = (ds: DicomDataset, ambito: string): void => {
    for (const [clave, valor] of Object.entries(ds)) {
      if (esPII(clave) && valor !== null && valor !== undefined && valor !== '') {
        restos.push(`${ambito}:${clave}`);
      }
    }
  };
  escanear(estudio.dataset, 'estudio');
  for (const s of estudio.series) escanear(s.dataset, `serie:${s.series_uid}`);
  return restos;
}
