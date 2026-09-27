import { describe, it, expect } from 'vitest';
import { columnasDatos, conDefectos, inicialesDesde, type CampoPlantilla, type EstructuraPlantilla } from './estructura';

/**
 * Boilerplate clínico (§6.5): el `valorDefecto` de un campo debe PRECARGARSE en el reporte del
 * médico. `inicialesDesde` lo hace al crear; `conDefectos` lo hace al ABRIR (rellena solo lo vacío,
 * nunca pisa lo escrito) — así un default añadido a la plantilla DESPUÉS de crear el reporte, o un
 * reporte creado antes de configurarlo, igual muestra el texto. Regresión real: multitexto vacío.
 */
const estructura: EstructuraPlantilla = {
  secciones: [
    {
      id: 'enc',
      tipo: 'encabezado',
      titulo: 'Datos del estudio',
      columnas: 3,
      campos: [
        { id: 'tecnica', tipo: 'multitexto', nombre: 'Técnica', valorDefecto: 'Se realizó USG Doppler.' },
        { id: 'expediente', tipo: 'texto', nombre: 'Expediente' },
      ],
    },
    {
      id: 'hall',
      tipo: 'hallazgos',
      titulo: 'Hallazgos',
      columnas: 1,
      campos: [
        { id: 'derecho', tipo: 'multitexto', nombre: 'Lado derecho', valorDefecto: 'Sin alteraciones.' },
        { id: 'izquierdo', tipo: 'multitexto', nombre: 'Lado izquierdo' },
      ],
    },
  ],
};

describe('inicialesDesde', () => {
  it('rutea el default del encabezado a datosPaciente y el de hallazgos a valores', () => {
    const { valores, datosPaciente } = inicialesDesde(estructura);
    expect(datosPaciente.tecnica).toBe('Se realizó USG Doppler.');
    expect(valores.derecho).toBe('Sin alteraciones.');
    // Campos sin valorDefecto no aparecen.
    expect(datosPaciente.expediente).toBeUndefined();
    expect(valores.izquierdo).toBeUndefined();
  });
});

describe('conDefectos (precarga al ABRIR)', () => {
  it('rellena un multitexto de HALLAZGOS vacío con su valorDefecto', () => {
    const { valores } = conDefectos(estructura, { derecho: '' }, {});
    expect(valores.derecho).toBe('Sin alteraciones.');
  });

  it('rellena un multitexto del ENCABEZADO vacío (regresión: reporte creado antes del default)', () => {
    // Reproduce el reporte real: datos_paciente traía la técnica como "" (guardada vacía).
    const { datosPaciente } = conDefectos(estructura, {}, { tecnica: '', expediente: '846060' });
    expect(datosPaciente.tecnica).toBe('Se realizó USG Doppler.');
    expect(datosPaciente.expediente).toBe('846060');
  });

  it('NUNCA pisa un valor ya escrito por el médico', () => {
    const { valores, datosPaciente } = conDefectos(
      estructura,
      { derecho: 'Placa calcificada en bulbo.' },
      { tecnica: 'Técnica modificada por el médico.' },
    );
    expect(valores.derecho).toBe('Placa calcificada en bulbo.');
    expect(datosPaciente.tecnica).toBe('Técnica modificada por el médico.');
  });

  it('un campo ausente (sin clave) también recibe el default', () => {
    const { valores } = conDefectos(estructura, {}, {});
    expect(valores.derecho).toBe('Sin alteraciones.');
  });
});

describe('columnasDatos (columna 0 = etiquetas de fila)', () => {
  it('devuelve columnas[1..] (las de datos), excluyendo la columna de etiquetas', () => {
    const campo = { id: 't', tipo: 'tabla', nombre: 'T', columnas: ['', 'PSV', 'IR'], filas: ['ACC'] } as CampoPlantilla;
    expect(columnasDatos(campo)).toEqual(['PSV', 'IR']);
  });

  it('columna de etiquetas nombrada: sigue siendo columnas[0], no cuenta como dato', () => {
    const campo = { id: 't', tipo: 'tabla', nombre: 'T', columnas: ['Territorio', 'PSV'], filas: ['ACC'] } as CampoPlantilla;
    expect(campo.columnas?.[0]).toBe('Territorio');
    expect(columnasDatos(campo)).toEqual(['PSV']);
  });

  it('sin columnas → sin columnas de datos', () => {
    const campo = { id: 't', tipo: 'tabla', nombre: 'T', columnas: [], filas: [] } as CampoPlantilla;
    expect(columnasDatos(campo)).toEqual([]);
  });
});
