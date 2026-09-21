import { describe, expect, it } from 'vitest';
import { normalizarConfigVideo } from './leccion-video-contrato';

describe('normalizarConfigVideo', () => {
  it('config vacía → sin fuente, sin hitos ni transcripción', () => {
    const c = normalizarConfigVideo({});
    expect(c.videotecaId).toBeNull();
    expect(c.recursoRef).toBeNull();
    expect(c.reproducible).toBe(false);
    expect(c.hitos).toEqual([]);
    expect(c.transcripcion).toEqual([]);
  });

  it('config null/undefined no rompe', () => {
    expect(normalizarConfigVideo(null).reproducible).toBe(false);
    expect(normalizarConfigVideo(undefined).hitos).toEqual([]);
  });

  it('forma del EDITOR: videotecaId reproducible + cues + hitos ordenados', () => {
    const c = normalizarConfigVideo({
      videotecaId: 'vid-1',
      recursoRef: 'videos/vid-1.mp4',
      estado: 'listo',
      duracionSeg: 300,
      hitos: [
        { id: 'b', tiempo: 90, titulo: 'Segundo' },
        { id: 'a', tiempo: 10, titulo: 'Primero', nota: 'ojo' },
      ],
      transcripcion: [
        { inicio: 5, fin: 8, texto: 'hola', locutor: 'Dr.' },
        { inicio: 1, fin: 4, texto: 'antes' },
      ],
    });
    expect(c.videotecaId).toBe('vid-1');
    expect(c.recursoRef).toBe('videos/vid-1.mp4');
    expect(c.duracionSeg).toBe(300);
    expect(c.reproducible).toBe(true);
    // hitos ordenados por tiempo
    expect(c.hitos.map((h) => h.id)).toEqual(['a', 'b']);
    expect(c.hitos[0]?.nota).toBe('ojo');
    // cues ordenados por inicio, conservando locutor
    expect(c.transcripcion.map((t) => t.texto)).toEqual(['antes', 'hola']);
    expect(c.transcripcion[1]?.locutor).toBe('Dr.');
  });

  it('forma del SEED: ref (no videotecaId) → no reproducible; highlights→hitos; texto→1 cue', () => {
    const c = normalizarConfigVideo({
      ref: 'demo/videos/artefactos-modo-b.mp4',
      titulo: 'Artefactos en modo B',
      transcripcion: 'En esta clase revisamos los artefactos más comunes...',
      highlights: [
        { t: 174, titulo: 'Reverberación' },
        { t: 15, titulo: 'Sombra acústica' },
      ],
    });
    expect(c.videotecaId).toBeNull();
    expect(c.recursoRef).toBe('demo/videos/artefactos-modo-b.mp4');
    expect(c.reproducible).toBe(false);
    // highlights → hitos ordenados por tiempo, con id sintético
    expect(c.hitos.map((h) => h.tiempo)).toEqual([15, 174]);
    expect(c.hitos[0]?.titulo).toBe('Sombra acústica');
    // texto plano → un único cue no sincronizado en 0
    expect(c.transcripcion).toHaveLength(1);
    expect(c.transcripcion[0]?.inicio).toBe(0);
    expect(c.transcripcion[0]?.texto).toContain('artefactos');
  });

  it('descarta hitos/cues malformados sin romper', () => {
    const c = normalizarConfigVideo({
      hitos: [{ titulo: 'sin tiempo' }, { tiempo: 5, titulo: 'ok' }, null],
      transcripcion: [{ inicio: 'x', texto: 'malo' }, { inicio: 2, texto: 'bueno' }],
    });
    expect(c.hitos.map((h) => h.titulo)).toEqual(['ok']);
    expect(c.transcripcion.map((t) => t.texto)).toEqual(['bueno']);
  });

  it('prefiere `hitos` sobre `highlights` cuando ambos existen', () => {
    const c = normalizarConfigVideo({
      hitos: [{ id: 'x', tiempo: 1, titulo: 'del editor' }],
      highlights: [{ t: 2, titulo: 'del seed' }],
    });
    expect(c.hitos).toHaveLength(1);
    expect(c.hitos[0]?.titulo).toBe('del editor');
  });
});
