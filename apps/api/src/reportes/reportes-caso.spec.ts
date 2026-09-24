import {
  aplanarHallazgos,
  estructurarContenido,
  imagenesDe,
  organoDe,
  scrubPII,
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
      campos: [{ id: 'tab', tipo: 'tabla', nombre: 'Índices', columnas: ['PSV', 'IR'], filas: ['ACC', 'ACI'] }],
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
