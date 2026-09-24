import { aplanarHallazgos, imagenesDe, organoDe, scrubPII } from './reportes-caso.service';

// Puente reporte→caso: las funciones de MAPEO son lógica pura y crítica (§10) — testeadas.

const estructura = {
  secciones: [
    { tipo: 'encabezado', titulo: 'Datos del estudio', campos: [{ id: 'paciente', tipo: 'texto', nombre: 'Paciente' }] },
    {
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
      tipo: 'hallazgos',
      titulo: 'Mediciones',
      campos: [{ id: 'tab', tipo: 'tabla', nombre: 'Índices', columnas: ['PSV', 'IR'], filas: ['ACC', 'ACI'] }],
    },
    { tipo: 'hallazgos', titulo: 'Imágenes', campos: [{ id: 'gal', tipo: 'galeria', nombre: 'Imágenes' }] },
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

  it('imagenesDe extrae la galería en orden', () => {
    const imgs = imagenesDe(estructura, valores);
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toEqual({ ref: 'reportes/imagenes/r1/a.jpg', ext: 'jpg', pie: 'Corte longitudinal' });
    expect(imgs[1].ext).toBe('png');
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
