import {
  aplanarHallazgos,
  dominioDe,
  esCampoPacientePII,
  estructurarContenido,
  imagenesDe,
  organoDe,
  scrubPII,
  snapshotContenidoCaso,
} from './reportes-caso.service';

// Puente reporte→caso: las funciones de MAPEO son lógica pura y crítica (§10) — testeadas.

const estructura = {
  secciones: [
    { id: 's0', tipo: 'encabezado', titulo: 'Datos del estudio', campos: [{ id: 'paciente', tipo: 'texto', nombre: 'Paciente' }] },
    {
      id: 's1',
      tipo: 'hallazgos',
      titulo: 'Riñones',
      campos: [
        { id: 'rd', tipo: 'medida', nombre: 'Longitud riñón derecho', unidad: 'cm' },
        { id: 'eco', tipo: 'opcion', nombre: 'Ecogenicidad' },
        { id: 'dil', tipo: 'sino', nombre: 'Dilatación' },
        { id: 'guia1', tipo: 'guia', nombre: 'no debe salir' },
      ],
    },
    {
      id: 's2',
      tipo: 'hallazgos',
      titulo: 'Mediciones',
      // columnas[0] = columna de etiquetas de fila (vacía); columnas[1..] = columnas de datos.
      campos: [{ id: 'tab', tipo: 'tabla', nombre: 'Índices', columnas: ['', 'PSV', 'IR'], filas: ['ACC', 'ACI'] }],
    },
    { id: 's3', tipo: 'hallazgos', titulo: 'Imágenes', campos: [{ id: 'gal', tipo: 'galeria', nombre: 'Imágenes' }] },
  ],
};

const valores = {
  rd: '10.2',
  eco: 'normal',
  dil: false,
  tab: [['80', '0.6'], ['', '']],
  gal: [
    { ref: 'reportes/imagenes/r1/a.jpg', ext: 'jpg', pie: 'Corte longitudinal' },
    { ref: 'reportes/imagenes/r1/b.png', ext: 'png' },
  ],
};

describe('puente reporte→caso · mapeo', () => {
  it('aplanarHallazgos concatena secciones, tabla, sino, impresión y leyendas de imagen', () => {
    const imgs = imagenesDe(estructura, valores);
    const t = aplanarHallazgos(estructura, valores, 'Estudio sin hallazgos patológicos.', imgs);
    expect(t).toContain('RIÑONES');
    expect(t).toContain('Longitud riñón derecho: 10.2 cm');
    expect(t).toContain('Ecogenicidad: normal');
    expect(t).toContain('Dilatación: No');
    expect(t).toContain('ACC — PSV: 80, IR: 0.6'); // fila con datos
    expect(t).not.toContain('ACI —'); // fila vacía se omite
    expect(t).toContain('IMPRESIÓN DIAGNÓSTICA');
    expect(t).toContain('1. Corte longitudinal'); // leyenda de imagen
    expect(t).not.toContain('no debe salir'); // guia se omite
  });

  it('imagenesDe extrae la galería en orden, con la sección de origen (seccionId)', () => {
    const imgs = imagenesDe(estructura, valores);
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toEqual({ ref: 'reportes/imagenes/r1/a.jpg', ext: 'jpg', pie: 'Corte longitudinal', seccionId: 's3' });
    expect(imgs[1].ext).toBe('png');
    expect(imgs[1].seccionId).toBe('s3'); // fidelidad reporte↔caso
  });

  it('scrubPII borra nombre/expediente del paciente del texto libre', () => {
    const dp = { paciente: 'Juan Pérez López', expediente: '654321' };
    const t = scrubPII('Paciente Juan Pérez López, exp 654321, sin hallazgos.', dp);
    expect(t).not.toContain('Juan Pérez López');
    expect(t).not.toContain('654321');
    expect(t).toContain('[dato removido]');
  });

  it('scrubPII NO sobre-redacta texto clínico que coincide con un nombre corto (BUG 1)', () => {
    // Nombre de prueba de UNA palabra corta ("Test") = la impresión → no debe borrarla.
    expect(scrubPII('Test', { paciente: 'Test' })).toBe('Test');
    expect(scrubPII('Quiste simple, sin cambios.', { paciente: 'Ana' })).toBe('Quiste simple, sin cambios.');
    // El médico solicitante NO es PII del paciente → no se redacta.
    expect(scrubPII('Estudio normal.', { solicitante: 'Dr. Casos Uno' })).toBe('Estudio normal.');
    // Pero un nombre real (con apellido) sí se remueve.
    expect(scrubPII('Impresión: Ana López sana', { paciente: 'Ana López' })).toContain('[dato removido]');
  });

  it('organoDe infiere del tipo de estudio', () => {
    expect(organoDe('Renal', 'x')).toBe('Riñón y vías urinarias');
    expect(organoDe('Doppler', 'x')).toBe('Vascular (Doppler)');
    expect(organoDe(null, 'Plantilla X')).toBe('Plantilla X');
  });
});

describe('puente reporte→caso · contenido ESTRUCTURADO (§7A)', () => {
  it('preserva secciones/campos tipados; salta encabezado, guía y vacíos', () => {
    const imgs = imagenesDe(estructura, valores);
    const ce = estructurarContenido(estructura, valores, 'Sin hallazgos.', imgs)!;
    expect(ce.version).toBe(1);
    // NO incluye el encabezado (PII).
    expect(ce.secciones.find((s) => s.id === 's0')).toBeUndefined();
    const rinones = ce.secciones.find((s) => s.id === 's1')!;
    expect(rinones.titulo).toBe('Riñones');
    // medida con unidad, opción y sino booleano; guía omitida.
    expect(rinones.campos).toContainEqual({ id: 'rd', tipo: 'medida', nombre: 'Longitud riñón derecho', valor: '10.2', unidad: 'cm' });
    expect(rinones.campos).toContainEqual({ id: 'eco', tipo: 'opcion', nombre: 'Ecogenicidad', valor: 'normal' });
    expect(rinones.campos).toContainEqual({ id: 'dil', tipo: 'sino', nombre: 'Dilatación', valor: false });
    expect(rinones.campos.find((c) => c.id === 'guia1')).toBeUndefined();
    expect(ce.impresion).toBe('Sin hallazgos.');
    expect(ce.imagenes).toHaveLength(2);
    expect(ce.imagenes[0].seccionId).toBe('s3');
  });

  it('conserva la TABLA como matriz estructurada (columnas/filas/celdas), NO aplanada', () => {
    const imgs = imagenesDe(estructura, valores);
    const ce = estructurarContenido(estructura, valores, '', imgs)!;
    const med = ce.secciones.find((s) => s.id === 's2')!;
    const tabla = med.campos.find((c) => c.id === 'tab');
    expect(tabla).toEqual({
      id: 'tab',
      tipo: 'tabla',
      nombre: 'Índices',
      columnas: ['PSV', 'IR'],
      filas: ['ACC', 'ACI'],
      celdas: [
        ['80', '0.6'],
        ['', ''],
      ],
    });
  });

  it('aplica scrubPII a los valores de texto (§10)', () => {
    const est = {
      secciones: [
        { id: 's1', tipo: 'hallazgos', titulo: 'Nota', campos: [{ id: 'n', tipo: 'multitexto', nombre: 'Nota' }] },
      ],
    };
    const ce = estructurarContenido(est, { n: 'Paciente Juan Pérez, riñón normal.' }, '', [], { paciente: 'Juan Pérez' })!;
    const campo = ce.secciones[0].campos[0];
    expect(campo.tipo === 'multitexto' && campo.valor.includes('[dato removido]')).toBe(true);
    expect(campo.tipo === 'multitexto' && campo.valor.includes('Juan Pérez')).toBe(false);
  });

  it('devuelve null cuando no hay nada estructurable (fallback a texto derivado)', () => {
    expect(estructurarContenido({ secciones: [] }, {}, '', [])).toBeNull();
  });
});

describe('puente reporte→caso · SNAPSHOT para la columna contenido_estructurado (§7A · Opción B)', () => {
  it('copia secciones de hallazgos VERBATIM (tabla/opción/sino) + valores, salta encabezado e imágenes', () => {
    const s = snapshotContenidoCaso(estructura, valores, 'Sin hallazgos patológicos.', {}, {
      tipo: 'reporte',
      reporteId: 'rep-1',
    });
    // No incluye el encabezado (PII) ni la sección de galería (va al visor).
    expect(s.secciones.find((x) => x.id === 's0')).toBeUndefined();
    expect(s.secciones.find((x) => x.id === 's3')).toBeUndefined();
    // La sección de mediciones conserva la TABLA como campo tipado (columnas/filas).
    const med = s.secciones.find((x) => x.id === 's2')!;
    const tabla = med.campos.find((c) => c.id === 'tab')!;
    expect(tabla.tipo).toBe('tabla');
    expect(tabla.columnas).toEqual(['PSV', 'IR']);
    expect(tabla.filas).toEqual(['ACC', 'ACI']);
    // Los valores viajan como matriz (NO aplanada a texto).
    expect(s.valores.tab).toEqual([['80', '0.6'], ['', '']]);
    expect(s.valores.dil).toBe(false);
    expect(s.impresion).toBe('Sin hallazgos patológicos.');
    expect(s.fuente).toEqual({ tipo: 'reporte', reporteId: 'rep-1' });
  });

  it('remueve PII de los valores de texto y de las celdas de tabla (§10)', () => {
    const est = {
      secciones: [
        {
          id: 's1',
          tipo: 'hallazgos',
          titulo: 'Nota',
          columnas: 1,
          campos: [
            { id: 'n', tipo: 'multitexto', nombre: 'Nota' },
            { id: 't', tipo: 'tabla', nombre: 'T', columnas: ['', 'A'], filas: ['f1'] },
          ],
        },
      ],
    };
    const s = snapshotContenidoCaso(
      est,
      { n: 'Paciente Juan Pérez, normal.', t: [['exp Juan Pérez']] },
      '',
      { paciente: 'Juan Pérez' },
    );
    expect(String(s.valores.n)).toContain('[dato removido]');
    expect(String(s.valores.n)).not.toContain('Juan Pérez');
    expect((s.valores.t as string[][])[0][0]).toContain('[dato removido]');
  });

  it('secciones vacías → snapshot sin secciones (el caller guarda null → fallback)', () => {
    const s = snapshotContenidoCaso({ secciones: [] }, {}, '', {});
    expect(s.secciones).toHaveLength(0);
  });

  it('dominioDe: un reporte es una interpretación por defecto (editable al curar)', () => {
    expect(dominioDe('Renal', 'Riñón')).toBe('interpretacion');
    expect(dominioDe(null, null)).toBe('interpretacion');
  });

  it('DATOS DEL ESTUDIO viajan al caso EXCEPTO Nombre y Fecha de nacimiento (§10)', () => {
    const est = {
      secciones: [
        {
          id: 's0',
          tipo: 'encabezado',
          titulo: 'Datos del estudio',
          columnas: 3,
          campos: [
            { id: 'paciente', tipo: 'texto', nombre: 'Paciente' }, // EXCLUIDO (nombre)
            { id: 'fnac', tipo: 'fecha', nombre: 'Fecha de nacimiento' }, // EXCLUIDO
            { id: 'expediente', tipo: 'texto', nombre: 'Expediente' }, // sí va
            { id: 'solicitante', tipo: 'texto', nombre: 'Médico tratante' }, // sí va
            { id: 'fechaEstudio', tipo: 'fecha', nombre: 'Fecha del estudio' }, // sí va
            { id: 'fum', tipo: 'fecha', nombre: 'FUM' }, // sí va
          ],
        },
        { id: 's1', tipo: 'hallazgos', titulo: 'Hallazgos', columnas: 1, campos: [{ id: 'h', tipo: 'multitexto', nombre: 'Hallazgos' }] },
      ],
    };
    const dp = {
      paciente: 'Juan Pérez',
      fnac: '1990-05-10',
      expediente: 'EXP-123',
      solicitante: 'Dra. Ruiz',
      fechaEstudio: '2026-09-27',
      fum: '2026-01-01',
    };
    const s = snapshotContenidoCaso(est, { h: 'Normal.' }, '', dp, { tipo: 'reporte' });
    // La sección de encabezado ahora SÍ está (con los campos permitidos).
    const enc = s.secciones.find((x) => x.id === 's0')!;
    expect(enc).toBeDefined();
    const ids = enc.campos.map((c) => c.id);
    expect(ids).toEqual(['expediente', 'solicitante', 'fechaEstudio', 'fum']); // sin paciente ni fnac
    // Valores: los permitidos viajan VERBATIM desde datos_paciente; los dos PII no.
    expect(s.valores.expediente).toBe('EXP-123');
    expect(s.valores.solicitante).toBe('Dra. Ruiz');
    expect(s.valores.fechaEstudio).toBe('2026-09-27');
    expect(s.valores.fum).toBe('2026-01-01');
    expect(s.valores.paciente).toBeUndefined();
    expect(s.valores.fnac).toBeUndefined();
  });

  it('esCampoPacientePII: identifica solo Nombre del paciente y Fecha de nacimiento', () => {
    expect(esCampoPacientePII({ id: 'paciente', tipo: 'texto', nombre: 'Paciente' })).toBe(true);
    expect(esCampoPacientePII({ id: 'x1', tipo: 'texto', nombre: 'Nombre del paciente' })).toBe(true);
    expect(esCampoPacientePII({ id: 'fnac', tipo: 'fecha', nombre: 'Fecha de nacimiento' })).toBe(true);
    expect(esCampoPacientePII({ id: 'x2', tipo: 'fecha', nombre: 'F. Nacimiento' })).toBe(true);
    // NO son PII a excluir:
    expect(esCampoPacientePII({ id: 'expediente', tipo: 'texto', nombre: 'Expediente' })).toBe(false);
    expect(esCampoPacientePII({ id: 'solicitante', tipo: 'texto', nombre: 'Médico tratante' })).toBe(false);
    expect(esCampoPacientePII({ id: 'fechaEstudio', tipo: 'fecha', nombre: 'Fecha del estudio' })).toBe(false);
    expect(esCampoPacientePII({ id: 'edad', tipo: 'numero', nombre: 'Edad' })).toBe(false);
  });
});
