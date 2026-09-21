import { describe, it, expect, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import {
  ModoLecturaProvider,
  useModoLectura,
  type TemaLectura,
} from './modo-lectura';

/**
 * Verifica el AUTO-ENCENDIDO del modo lectura: al entrar a una lectura
 * (teoría/autoevaluación) el tema debe forzarse a sepia AUNQUE haya una preferencia
 * guardada previa (bug: la condición solo aplicaba el inicial si no había tema).
 * El wrapper del provider marca `data-tema-lectura` con el tema efectivo.
 */

// Consumidor mínimo que enciende el modo lectura al montar, como hace la lección.
function LeccionFalsa({ inicial, forzar }: { inicial: TemaLectura; forzar: boolean }) {
  const { activar } = useModoLectura();
  useEffect(() => {
    activar(inicial, forzar);
  }, [activar, inicial, forzar]);
  return <p>contenido</p>;
}

function wrapper(): HTMLElement | null {
  return document.querySelector('[data-tema-lectura]');
}

describe('ModoLecturaProvider · auto-encendido', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('teoría/autoeval FUERZA sepia al entrar aunque haya un tema guardado (claro)', async () => {
    localStorage.setItem('lxp:lectura:tema', 'claro');
    render(
      <ModoLecturaProvider>
        <LeccionFalsa inicial="sepia" forzar />
      </ModoLecturaProvider>,
    );
    expect(await screen.findByText('contenido')).toBeInTheDocument();
    expect(wrapper()?.getAttribute('data-tema-lectura')).toBe('sepia');
  });

  it('sin forzar respeta la preferencia guardada (oscuro)', async () => {
    localStorage.setItem('lxp:lectura:tema', 'oscuro');
    render(
      <ModoLecturaProvider>
        <LeccionFalsa inicial="sepia" forzar={false} />
      </ModoLecturaProvider>,
    );
    expect(await screen.findByText('contenido')).toBeInTheDocument();
    expect(wrapper()?.getAttribute('data-tema-lectura')).toBe('oscuro');
  });

  it('fuera de una lección no pinta ningún tema (shell en navy por defecto)', () => {
    render(
      <ModoLecturaProvider>
        <p>inicio</p>
      </ModoLecturaProvider>,
    );
    expect(screen.getByText('inicio')).toBeInTheDocument();
    expect(wrapper()).toBeNull();
  });
});
