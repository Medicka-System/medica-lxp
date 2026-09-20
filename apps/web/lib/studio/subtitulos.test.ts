import { describe, it, expect } from 'vitest';
import { parsearSubtitulos } from './subtitulos';

describe('parsearSubtitulos', () => {
  it('parsea WebVTT con encabezado, índices y milisegundos con punto', () => {
    const vtt = [
      'WEBVTT',
      '',
      '1',
      '00:00:01.000 --> 00:00:04.000',
      'Se coloca el transductor en el flanco derecho.',
      '',
      '2',
      '00:00:04.500 --> 00:00:07.250',
      'Se identifica el receso hepatorrenal.',
    ].join('\n');

    const cues = parsearSubtitulos(vtt);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toEqual({
      inicio: 1,
      fin: 4,
      texto: 'Se coloca el transductor en el flanco derecho.',
    });
    expect(cues[1]!.inicio).toBeCloseTo(4.5);
    expect(cues[1]!.fin).toBeCloseTo(7.25);
  });

  it('parsea SRT (coma en milisegundos) y ordena por inicio', () => {
    const srt = [
      '2',
      '00:00:05,000 --> 00:00:06,000',
      'Segundo cue.',
      '',
      '1',
      '00:00:01,000 --> 00:00:02,000',
      'Primer cue.',
    ].join('\n');

    const cues = parsearSubtitulos(srt);
    expect(cues.map((c) => c.texto)).toEqual(['Primer cue.', 'Segundo cue.']);
  });

  it('extrae el locutor de la etiqueta de voz VTT y de la convención "Nombre:"', () => {
    const vtt = [
      'WEBVTT',
      '',
      '00:00:01.000 --> 00:00:03.000',
      '<v Dra. Ruiz>Observe el deslizamiento pleural.',
      '',
      '00:00:03.000 --> 00:00:05.000',
      'Alumno: ¿Es una línea B?',
    ].join('\n');

    const cues = parsearSubtitulos(vtt);
    expect(cues[0]).toMatchObject({ locutor: 'Dra. Ruiz', texto: 'Observe el deslizamiento pleural.' });
    expect(cues[1]).toMatchObject({ locutor: 'Alumno', texto: '¿Es una línea B?' });
  });

  it('tolera settings VTT tras el sello de fin y limpia etiquetas inline', () => {
    const vtt = [
      'WEBVTT',
      '',
      '00:00:10.000 --> 00:00:12.000 align:start position:10%',
      'Cine-loop del <c.medico>hígado</c>.',
    ].join('\n');

    const cues = parsearSubtitulos(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0]).toEqual({ inicio: 10, fin: 12, texto: 'Cine-loop del hígado.' });
  });

  it('devuelve [] cuando no hay cues válidos', () => {
    expect(parsearSubtitulos('WEBVTT\n\nNOTE solo una nota\n')).toEqual([]);
    expect(parsearSubtitulos('texto suelto sin tiempos')).toEqual([]);
  });
});
