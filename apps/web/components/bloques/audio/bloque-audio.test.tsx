import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BloqueAudio } from './bloque-audio';

// Smoke test del bloque AUDIO. Ruta `src=null`: valida que el import de wavesurfer.js
// resuelve y que el aviso de contrato (TTS vs media) se muestra sin montar el canvas
// de la onda en jsdom.
describe('BloqueAudio', () => {
  it('avisa que el TTS está pendiente cuando no hay fuente y el origen es tts', () => {
    render(<BloqueAudio src={null} origen="tts" titulo="Narración lección 1" textoTts="El higado se explora…" />);
    expect(screen.getByText('Narración lección 1')).toBeInTheDocument();
    expect(screen.getByText(/POST \/media\/tts/i)).toBeInTheDocument();
  });

  it('avisa que el media está pendiente para audio subido sin fuente', () => {
    render(<BloqueAudio src={null} origen="subido" titulo="Audio del caso" />);
    expect(screen.getByText(/GET \/media\/url/i)).toBeInTheDocument();
  });
});
