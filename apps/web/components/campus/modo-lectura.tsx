'use client';

/**
 * Modo lectura GLOBAL (§5A) — el tema (claro/sepia/oscuro) tiñe TODA la plataforma,
 * no solo el contenedor de la lección. El provider se monta envolviendo el shell del
 * campus (sidebar + header + contenido); cuando una lección de lectura lo activa,
 * reescribe los tokens del sistema (`data-tema-lectura` + `--lectura-fs`) en ese
 * ancestro común, así el lateral navy y el header adoptan el tono en vez de quedarse
 * brillantes. La transición es suave (definida en globals.css) y respeta
 * prefers-reduced-motion. El tema y el tamaño de letra se recuerdan (localStorage).
 *
 * Fuera del campus (p. ej. la vista previa del Studio) NO hay provider: los lectores
 * usan un fallback local (ver `lector-leccion`), así el modo lectura sigue funcionando
 * aislado sin teñir un shell que no existe ahí.
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type TemaLectura = 'claro' | 'sepia' | 'oscuro';

export const CLAVE_TEMA = 'lxp:lectura:tema';
export const CLAVE_FS = 'lxp:lectura:fs';
export const FS_MIN = 13.5;
export const FS_MAX = 24;
export const FS_PASO = 1.5;
export const FS_DEFECTO = 16.5;

export function esTemaLectura(v: string | null): v is TemaLectura {
  return v === 'claro' || v === 'sepia' || v === 'oscuro';
}

export type ModoLecturaCtx = {
  /** Modo lectura activo (una lección de lectura lo encendió). */
  activo: boolean;
  tema: TemaLectura;
  fs: number;
  setTema: (t: TemaLectura) => void;
  /** Ajusta el tamaño de letra con un delta (respeta los límites). */
  ajustarFs: (delta: number) => void;
  /**
   * Enciende el modo lectura con `inicial` como tema de entrada. Si `forzar`, lo
   * aplica siempre (teoría/autoevaluación entran SIEMPRE en sepia); si no, solo cuando
   * el alumno aún no ha elegido un tema. El cambio manual posterior manda igual.
   */
  activar: (inicial: TemaLectura, forzar?: boolean) => void;
  desactivar: () => void;
};

export const ModoLecturaContext = createContext<ModoLecturaCtx | null>(null);

/** Acceso obligatorio (lanza fuera del provider). */
export function useModoLectura(): ModoLecturaCtx {
  const v = useContext(ModoLecturaContext);
  if (!v) throw new Error('useModoLectura debe usarse dentro de <ModoLecturaProvider>');
  return v;
}

export function ModoLecturaProvider({ children }: { children: React.ReactNode }) {
  const [activo, setActivo] = useState(false);
  const [tema, setTemaState] = useState<TemaLectura>('claro');
  const [fs, setFsState] = useState<number>(FS_DEFECTO);
  // Hasta leer localStorage no pintamos el tema, para no provocar mismatch de hidratación.
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem(CLAVE_TEMA);
    if (esTemaLectura(t)) setTemaState(t);
    const f = Number(localStorage.getItem(CLAVE_FS));
    if (Number.isFinite(f) && f >= FS_MIN && f <= FS_MAX) setFsState(f);
    setListo(true);
  }, []);

  const setTema = useCallback((t: TemaLectura) => {
    setTemaState(t);
    localStorage.setItem(CLAVE_TEMA, t);
  }, []);

  const ajustarFs = useCallback((delta: number) => {
    setFsState((prev) => {
      const v = Math.min(FS_MAX, Math.max(FS_MIN, prev + delta));
      localStorage.setItem(CLAVE_FS, String(v));
      return v;
    });
  }, []);

  const activar = useCallback(
    (inicial: TemaLectura, forzar = false) => {
      setActivo(true);
      // Las lecturas (teoría/autoeval) FUERZAN sepia al entrar; los demás tipos solo
      // fijan el inicial si el alumno todavía no eligió tema.
      if (forzar || localStorage.getItem(CLAVE_TEMA) == null) setTema(inicial);
    },
    [setTema],
  );

  const desactivar = useCallback(() => setActivo(false), []);

  const pintar = activo && listo;

  return (
    <ModoLecturaContext.Provider value={{ activo, tema, fs, setTema, ajustarFs, activar, desactivar }}>
      <div
        // Solo cuando el modo lectura está activo se reescriben los tokens (si no, el
        // shell queda en su navy por defecto). Los tokens viven en globals.css.
        data-tema-lectura={pintar ? tema : undefined}
        style={pintar ? ({ ['--lectura-fs']: `${fs}px` } as React.CSSProperties) : undefined}
        className="min-h-dvh transition-colors duration-[750ms] motion-reduce:transition-none"
      >
        {children}
      </div>
    </ModoLecturaContext.Provider>
  );
}
