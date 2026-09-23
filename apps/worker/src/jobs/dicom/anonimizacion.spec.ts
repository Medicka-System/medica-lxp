import {
  anonimizarDataset,
  anonimizarEstudio,
  esPII,
  esTagPrivado,
  MOTOR_ANON,
  verificarSinPII,
  type EstudioDicom,
} from './anonimizacion';

/** Estudio con PII a nivel estudio y en una serie multi-frame. */
function estudioConPII(): EstudioDicom {
  return {
    study_uid: '1.2.840.113619.2.55.3.1',
    dataset: {
      PatientName: 'Juan Pérez García',
      PatientID: 'MRN-00123',
      PatientBirthDate: '19800101',
      ReferringPhysicianName: 'Dra. López',
      InstitutionName: 'Hospital Central',
      AccessionNumber: 'ACC-99',
      // Clínico → se conserva
      StudyDescription: 'Ecografía abdominal FAST',
      Modality: 'US',
    },
    series: [
      {
        series_uid: '1.2.840.113619.2.55.3.1.1',
        modalidad: 'US',
        frames: 48, // cine-loop multi-frame
        instancias: 1,
        dataset: {
          OperatorsName: 'Téc. Ramírez',
          DeviceSerialNumber: 'SN-abc-123',
          SeriesDescription: 'Cine hepatorrenal',
          '0009,0010': 'PRIVADO-VENDOR', // tag privado (grupo impar)
        },
      },
    ],
  };
}

describe('esTagPrivado / esPII', () => {
  it('detecta tags privados (grupo impar) y no los públicos', () => {
    expect(esTagPrivado('0009,0010')).toBe(true);
    expect(esTagPrivado('0011,1001')).toBe(true);
    expect(esTagPrivado('0008,0018')).toBe(false); // grupo par = público
    expect(esTagPrivado('Modality')).toBe(false);
  });

  it('clasifica identificadores del paciente como PII y lo clínico no', () => {
    expect(esPII('PatientName')).toBe(true);
    expect(esPII('AccessionNumber')).toBe(true);
    expect(esPII('0009,0010')).toBe(true);
    expect(esPII('Modality')).toBe(false);
    expect(esPII('StudyDescription')).toBe(false);
    expect(esPII('SeriesDescription')).toBe(false);
  });

  it('cubre el perfil ampliado: demografía, fechas/horas, orden y equipo (§10)', () => {
    for (const t of [
      'PatientSex', 'PatientAge', 'PatientWeight', 'PatientAddress', 'AdditionalPatientHistory',
      'StudyDate', 'StudyTime', 'AcquisitionDateTime', 'ContentDate',
      'AdmissionID', 'RequestingService', 'PerformedProcedureStepDescription',
      'InstitutionName', 'StationName', 'DeviceSerialNumber', 'DeviceUID',
    ]) {
      expect(esPII(t)).toBe(true);
    }
  });

  it('conserva UIDs y datos que la app necesita (no son PII visible)', () => {
    for (const t of ['SeriesInstanceUID', 'StudyInstanceUID', 'SOPInstanceUID', 'NumberOfFrames', 'PixelSpacing', 'SequenceOfUltrasoundRegions']) {
      expect(esPII(t)).toBe(false);
    }
  });
});

describe('anonimizarDataset', () => {
  it('remueve PII y conserva lo clínico', () => {
    const { limpio, removidos } = anonimizarDataset({
      PatientName: 'X',
      PatientID: 'Y',
      Modality: 'US',
      StudyDescription: 'FAST',
    });
    expect(limpio).toEqual({ Modality: 'US', StudyDescription: 'FAST' });
    expect(removidos.sort()).toEqual(['PatientID', 'PatientName']);
  });

  it('no cuenta como removido un campo PII vacío/ausente de valor', () => {
    const { limpio, removidos } = anonimizarDataset({
      PatientName: '',
      PatientID: null,
      Modality: 'US',
    });
    expect(removidos).toEqual([]); // no había PII con valor
    expect(limpio).toEqual({ Modality: 'US' }); // la etiqueta igual se descarta
    expect('PatientName' in limpio).toBe(false);
  });
});

describe('anonimizarEstudio', () => {
  it('deja el estudio sin PII (estudio + series) y verifica', () => {
    const { estudio, traza } = anonimizarEstudio(estudioConPII());

    // Nivel estudio: PII fuera, clínico dentro.
    expect(estudio.dataset).toEqual({
      StudyDescription: 'Ecografía abdominal FAST',
      Modality: 'US',
    });
    // Serie: PII + tag privado fuera, descripción clínica dentro.
    expect(estudio.series[0]?.dataset).toEqual({
      SeriesDescription: 'Cine hepatorrenal',
    });
    // Verificación defensiva: no queda PII.
    expect(verificarSinPII(estudio)).toEqual([]);
    expect(traza.verificado).toBe(true);
  });

  it('preserva la estructura multi-frame (series y frames)', () => {
    const { estudio } = anonimizarEstudio(estudioConPII());
    expect(estudio.study_uid).toBe('1.2.840.113619.2.55.3.1');
    expect(estudio.series).toHaveLength(1);
    expect(estudio.series[0]?.frames).toBe(48);
    expect(estudio.series[0]?.modalidad).toBe('US');
    expect(estudio.series[0]?.series_uid).toBe('1.2.840.113619.2.55.3.1.1');
  });

  it('produce una traza auditable de lo removido (§10)', () => {
    const { traza } = anonimizarEstudio(estudioConPII());
    expect(traza.motor).toBe(MOTOR_ANON);
    expect(traza.series_procesadas).toBe(1);
    // 6 en estudio (Name/ID/BirthDate/Referring/Institution/Accession) + 3 en serie.
    expect(traza.removidos_n).toBe(9);
    expect(traza.campos_removidos).toContain('PatientName');
    expect(traza.campos_removidos).toContain('OperatorsName');
    expect(traza.campos_removidos).toContain('0009,0010');
  });

  it('NO muta el estudio de entrada', () => {
    const original = estudioConPII();
    const snapshot = JSON.parse(JSON.stringify(original));
    anonimizarEstudio(original);
    expect(original).toEqual(snapshot);
  });

  it('es idempotente: reanonimizar un estudio limpio no remueve nada', () => {
    const { estudio: unaVez } = anonimizarEstudio(estudioConPII());
    const { estudio: dosVeces, traza } = anonimizarEstudio(unaVez);
    expect(dosVeces).toEqual(unaVez);
    expect(traza.removidos_n).toBe(0);
    expect(traza.verificado).toBe(true);
  });
});

describe('verificarSinPII (guardia bloqueante)', () => {
  it('señala PII que sobreviva, con su ámbito', () => {
    const contaminado: EstudioDicom = {
      study_uid: 'u',
      dataset: { PatientName: 'Fulano', Modality: 'US' },
      series: [
        {
          series_uid: 's1',
          modalidad: 'US',
          frames: 1,
          dataset: { PatientID: 'Z' },
        },
      ],
    };
    const restos = verificarSinPII(contaminado);
    expect(restos).toContain('estudio:PatientName');
    expect(restos).toContain('serie:s1:PatientID');
  });
});
