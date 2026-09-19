import { canalesParaTipo } from './preferencias';

describe('canalesParaTipo (selección de canal · §8)', () => {
  it('sin preferencias usa la matriz de DEFECTOS por tipo', () => {
    // certificado_emitido: in_app + correo + whatsapp por defecto.
    expect(canalesParaTipo(null, 'certificado_emitido')).toEqual([
      'in_app',
      'correo',
      'whatsapp',
    ]);
    // badge_otorgado: solo in_app por defecto.
    expect(canalesParaTipo(undefined, 'badge_otorgado')).toEqual(['in_app']);
  });

  it('un override por (tipo, canal) gana sobre el default', () => {
    // El usuario apaga el correo de caso_validado pero deja in_app.
    const prefs = { caso_validado: { correo: false } };
    expect(canalesParaTipo(prefs, 'caso_validado')).toEqual(['in_app']);
  });

  it('un override puede ENCENDER un canal apagado por defecto', () => {
    // badge por defecto no manda correo; el usuario lo activa.
    const prefs = { badge_otorgado: { correo: true } };
    expect(canalesParaTipo(prefs, 'badge_otorgado')).toEqual([
      'in_app',
      'correo',
    ]);
  });

  it('overrides de otro tipo no afectan al tipo consultado', () => {
    const prefs = { anuncio: { in_app: false } };
    expect(canalesParaTipo(prefs, 'caso_validado')).toEqual([
      'in_app',
      'correo',
    ]);
  });

  it('el usuario puede quedarse SIN canales para un tipo (silenciarlo)', () => {
    const prefs = { repaso_sugerido: { in_app: false, correo: false } };
    expect(canalesParaTipo(prefs, 'repaso_sugerido')).toEqual([]);
  });
});
