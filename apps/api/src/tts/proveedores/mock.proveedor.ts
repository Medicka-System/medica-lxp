import { Injectable } from '@nestjs/common';
import type { RespuestaTTS, SolicitudTTS, TTSProvider } from './tts-proveedor.interface';

/**
 * Proveedor TTS de desarrollo/tests. NO llama a ninguna API: genera un WAV
 * DETERMINISTA (silencio proporcional al texto) para poder probar todo el flujo
 * (encolar → renderizar → subir → reproducir) sin key ni red. Es el fallback del
 * factory cuando `TTS_PROVIDER=mock` o falta la key real (igual que Eco · §7A).
 */
@Injectable()
export class MockTtsProvider implements TTSProvider {
  readonly nombre = 'mock';

  sintetizar(solicitud: SolicitudTTS): Promise<RespuestaTTS> {
    // Longitud determinista y acotada a partir del texto (44.1 kHz mono 16-bit).
    const muestras = Math.min(44_100, Math.max(1, solicitud.texto.length) * 160);
    return Promise.resolve({
      audio: wavSilencio(muestras),
      mime: 'audio/wav',
      proveedor: this.nombre,
      formato: 'wav',
    });
  }
}

/** Construye un WAV PCM mono 16-bit válido de `muestras` de silencio. */
function wavSilencio(muestras: number): Buffer {
  const sampleRate = 44_100;
  const bytesPorMuestra = 2;
  const dataLen = muestras * bytesPorMuestra;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16); // tamaño del sub-chunk fmt
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // canales = 1
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * bytesPorMuestra, 28); // byte rate
  buf.writeUInt16LE(bytesPorMuestra, 32); // block align
  buf.writeUInt16LE(16, 34); // bits por muestra
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataLen, 40);
  // El resto ya es 0x00 (silencio) por Buffer.alloc.
  return buf;
}
