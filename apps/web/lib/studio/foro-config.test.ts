import { describe, expect, it } from 'vitest';
import {
  CONFIG_FORO_DEFAULT,
  comoConfigForo,
  estadoVentanaForo,
  type ConfigForo,
} from './foro-config';

describe('comoConfigForo', () => {
  it('devuelve los defaults ante entrada vacía/basura', () => {
    expect(comoConfigForo(undefined)).toEqual(CONFIG_FORO_DEFAULT);
    expect(comoConfigForo(null)).toEqual(CONFIG_FORO_DEFAULT);
    expect(comoConfigForo('no soy objeto')).toEqual(CONFIG_FORO_DEFAULT);
  });

  it('normaliza campos y filtra reglas vacías', () => {
    const cfg = comoConfigForo({
      instrucciones: '<p>Discute</p>',
      reglas: ['  cita fuentes  ', '', 123, 'sé respetuoso'],
      modalidad: 'sincrono',
      aperturaEn: '2026-09-20T09:00',
      cierreEn: '',
      participacion: { califica: true, puntos: 10, minPosts: 2, minComentarios: 3 },
      actividadId: 'act-1',
    });
    expect(cfg.instrucciones).toBe('<p>Discute</p>');
    expect(cfg.reglas).toEqual(['cita fuentes', 'sé respetuoso']);
    expect(cfg.modalidad).toBe('sincrono');
    expect(cfg.aperturaEn).toBe('2026-09-20T09:00');
    expect(cfg.cierreEn).toBeNull();
    expect(cfg.participacion).toEqual({ califica: true, puntos: 10, minPosts: 2, minComentarios: 3 });
    expect(cfg.actividadId).toBe('act-1');
  });

  it('rechaza puntos/mínimos negativos o no numéricos', () => {
    const cfg = comoConfigForo({
      participacion: { califica: true, puntos: -5, minPosts: -1, minComentarios: 'x' },
    });
    expect(cfg.participacion.puntos).toBeNull();
    expect(cfg.participacion.minPosts).toBe(1); // default
    expect(cfg.participacion.minComentarios).toBe(0); // default
  });

  it('modalidad desconocida cae a asíncrona', () => {
    expect(comoConfigForo({ modalidad: 'otra' }).modalidad).toBe('asincrono');
  });
});

describe('estadoVentanaForo', () => {
  const base: ConfigForo = { ...CONFIG_FORO_DEFAULT };

  it('sin fechas → siempre abierto', () => {
    const v = estadoVentanaForo(base, new Date('2026-09-20T12:00'));
    expect(v.estado).toBe('siempre');
    expect(v.abierto).toBe(true);
  });

  it('antes de la apertura → programado y cerrado', () => {
    const cfg = { ...base, aperturaEn: '2026-09-20T09:00' };
    const v = estadoVentanaForo(cfg, new Date('2026-09-20T08:00'));
    expect(v.estado).toBe('programado');
    expect(v.abierto).toBe(false);
  });

  it('después del cierre → cerrado', () => {
    const cfg = { ...base, cierreEn: '2026-09-20T18:00' };
    const v = estadoVentanaForo(cfg, new Date('2026-09-20T19:00'));
    expect(v.estado).toBe('cerrado');
    expect(v.abierto).toBe(false);
  });

  it('dentro de la ventana → abierto', () => {
    const cfg = { ...base, aperturaEn: '2026-09-20T09:00', cierreEn: '2026-09-20T18:00' };
    const v = estadoVentanaForo(cfg, new Date('2026-09-20T12:00'));
    expect(v.estado).toBe('abierto');
    expect(v.abierto).toBe(true);
  });

  it('ignora fechas inválidas (no cierra el foro por un dato mal escrito)', () => {
    const cfg = { ...base, aperturaEn: 'no-es-fecha', cierreEn: 'tampoco' };
    const v = estadoVentanaForo(cfg, new Date('2026-09-20T12:00'));
    expect(v.estado).toBe('siempre');
    expect(v.abierto).toBe(true);
  });
});
