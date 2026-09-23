import { afterEach, describe, expect, it } from 'vitest';
import {
  _limpiarEspaciado,
  imagePlaneModuleDe,
  registrarEspaciadoImagen,
  registrarEspaciadoUltrasonido,
} from './espaciado-ultrasonido';

afterEach(() => _limpiarEspaciado());

describe('registro de espaciado de ultrasonido (aspect ratio)', () => {
  it('registra y devuelve el imagePlaneModule con el espaciado', () => {
    registrarEspaciadoImagen('wadouri:http://x/0.dcm', 2, 1);
    expect(imagePlaneModuleDe('wadouri:http://x/0.dcm')).toMatchObject({
      rowPixelSpacing: 2,
      columnPixelSpacing: 1,
      pixelSpacing: [2, 1],
      usingDefaultValues: false,
    });
  });

  it('los frames de un multi-frame comparten el espaciado de su URL base', () => {
    registrarEspaciadoImagen('wadouri:http://x/0.dcm', 0.3, 0.2);
    // El frame N (imageId con &frame=) resuelve por la clave base.
    expect(imagePlaneModuleDe('wadouri:http://x/0.dcm&frame=7')).toMatchObject({
      rowPixelSpacing: 0.3,
      columnPixelSpacing: 0.2,
    });
  });

  it('ignora espaciado 1:1 (nada que corregir) y valores no positivos', () => {
    registrarEspaciadoImagen('wadouri:a', 1, 1);
    registrarEspaciadoImagen('wadouri:b', 0, 2);
    registrarEspaciadoImagen('wadouri:c', 2, -1);
    expect(imagePlaneModuleDe('wadouri:a')).toBeNull();
    expect(imagePlaneModuleDe('wadouri:b')).toBeNull();
    expect(imagePlaneModuleDe('wadouri:c')).toBeNull();
  });

  it('imagen sin espaciado registrado → null', () => {
    expect(imagePlaneModuleDe('wadouri:http://y/1.dcm')).toBeNull();
  });

  it('el proveedor registra en metaData y responde solo a imagePlaneModule de wadouri', () => {
    let provider: ((type: string, imageId: string) => unknown) | null = null;
    const md = { addProvider: (p: (type: string, id: string) => unknown) => { provider = p; } };
    registrarEspaciadoUltrasonido(md);
    expect(provider).toBeTypeOf('function');
    registrarEspaciadoImagen('wadouri:http://z/0.dcm', 2, 1);
    const fn = provider as unknown as (type: string, imageId: string) => unknown;
    expect(fn('imagePlaneModule', 'wadouri:http://z/0.dcm')).toMatchObject({ rowPixelSpacing: 2, columnPixelSpacing: 1 });
    expect(fn('voiLutModule', 'wadouri:http://z/0.dcm')).toBeUndefined();
    expect(fn('imagePlaneModule', 'wadors:http://z/0.dcm')).toBeUndefined();
  });
});
