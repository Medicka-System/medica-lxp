import { describe, it, expect } from 'vitest';
import { normalizarFuenteVideo } from './bloque-video';

/**
 * La fuente de YouTube/Vimeo debe convertirse al shorthand que Vidstack reproduce
 * (`youtube/<id>` · `vimeo/<id>`). Una URL cruda (p. ej. `youtu.be/ID?si=…`) deja la
 * pantalla azul — regresión real reportada. Los archivos directos van tal cual.
 */
describe('normalizarFuenteVideo', () => {
  it('youtu.be con parámetro ?si → youtube/<id> (embed)', () => {
    const f = normalizarFuenteVideo('https://youtu.be/uXDiwHgy3Fo?si=j_dkHy-9VhX-A14m');
    expect(f).toEqual({ src: 'youtube/uXDiwHgy3Fo', esEmbed: true });
  });

  it('youtube.com/watch?v=<id> → youtube/<id>', () => {
    expect(normalizarFuenteVideo('https://www.youtube.com/watch?v=uXDiwHgy3Fo').src).toBe(
      'youtube/uXDiwHgy3Fo',
    );
  });

  it('youtube shorts/embed también', () => {
    expect(normalizarFuenteVideo('https://youtube.com/shorts/uXDiwHgy3Fo').src).toBe('youtube/uXDiwHgy3Fo');
    expect(normalizarFuenteVideo('https://www.youtube.com/embed/uXDiwHgy3Fo').src).toBe('youtube/uXDiwHgy3Fo');
  });

  it('vimeo → vimeo/<id> (embed)', () => {
    expect(normalizarFuenteVideo('https://vimeo.com/123456789')).toEqual({
      src: 'vimeo/123456789',
      esEmbed: true,
    });
  });

  it('archivo directo SIN extensión (MinIO firmado) → objeto con type video/mp4', () => {
    // Sin `type` Vidstack sondea cabeceras con un HEAD que la URL firmada solo-GET
    // rechaza (403) → pantalla azul. El type explícito lo evita.
    const url = 'http://127.0.0.1:9000/campus-lxp-media/media/videos/abc/original?X-Amz-Signature=xyz';
    expect(normalizarFuenteVideo(url)).toEqual({
      src: [{ src: url, type: 'video/mp4' }],
      esEmbed: false,
    });
  });

  it('archivo directo con extensión conocida → type por extensión', () => {
    expect(normalizarFuenteVideo('https://cdn.example.com/clip.webm')).toEqual({
      src: [{ src: 'https://cdn.example.com/clip.webm', type: 'video/webm' }],
      esEmbed: false,
    });
    expect(normalizarFuenteVideo('https://cdn.example.com/stream.m3u8?token=x').src).toEqual([
      { src: 'https://cdn.example.com/stream.m3u8?token=x', type: 'application/vnd.apple.mpegurl' },
    ]);
  });
});
