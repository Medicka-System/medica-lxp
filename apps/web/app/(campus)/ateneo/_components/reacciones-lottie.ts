/**
 * Assets Lottie de las reacciones del Ateneo (§3 · lottie-react). SOLO capa visual: los 6
 * tipos y el modelo (`reacciones_ateneo`, 1 por usuario) NO cambian — el emoji sigue viniendo
 * de `REACCIONES[tipo].emoji` en `tipos.ts`.
 *
 * Cada asset es un Lottie LIGERO (~1 KB) generado por `lottieDeEmoji`: una capa de TEXTO con
 * el glifo emoji + un rebote de escala en bucle. Se autora aquí (no se descarga de lottiefiles)
 * para no depender de red en el build. Para pasar a animaciones premium de lottiefiles, basta
 * reemplazar las entradas de `LOTTIE_REACCION` por el JSON importado del .lottie/.json — el
 * player (`EmojiReaccion`) no cambia.
 *
 * El módulo lo consume solo el componente cliente `EmojiReaccion` (lazy), así que su peso no
 * entra al bundle inicial.
 */
import { REACCIONES, type TipoReaccion } from './tipos';

/** Familia con emojis a color en los tres SO (lottie-web pinta el `<text>` con esta font). */
const FONT_EMOJI =
  "system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

/**
 * Lottie mínimo: una capa de texto (`ty:5`) con el glifo `char`, centrada, con un rebote de
 * escala 85→115→100→85 en 45 frames (bucle suave). Lienzo 64×64.
 */
export function lottieDeEmoji(char: string): object {
  const easeIn = { x: [0.6], y: [1] };
  const easeOut = { x: [0.4], y: [0] };
  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 45,
    w: 64,
    h: 64,
    nm: 'reaccion',
    ddd: 0,
    assets: [],
    fonts: {
      list: [
        { fName: 'EmojiFont', fFamily: FONT_EMOJI, fStyle: 'Regular', fWeight: '400', ascent: 68 },
      ],
    },
    layers: [
      {
        ddd: 0,
        ind: 1,
        ty: 5,
        nm: 'e',
        sr: 1,
        ks: {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [32, 46, 0] },
          a: { a: 0, k: [0, 0, 0] },
          s: {
            a: 1,
            k: [
              { i: easeIn, o: easeOut, t: 0, s: [85, 85, 100] },
              { i: easeIn, o: easeOut, t: 11, s: [115, 115, 100] },
              { i: easeIn, o: easeOut, t: 22, s: [100, 100, 100] },
              { t: 45, s: [85, 85, 100] },
            ],
          },
        },
        t: {
          d: {
            k: [
              {
                s: { s: 42, f: 'EmojiFont', t: char, j: 2, tr: 0, lh: 50, ls: 0, fc: [0, 0, 0] },
                t: 0,
              },
            ],
          },
          p: {},
          m: { g: 1, a: { a: 0, k: [0, 0] } },
          a: [],
        },
        ip: 0,
        op: 45,
        st: 0,
        bm: 0,
      },
    ],
  };
}

/** Un asset Lottie por tipo de reacción (derivado del glifo de `REACCIONES`). */
export const LOTTIE_REACCION: Record<TipoReaccion, object> = Object.fromEntries(
  (Object.keys(REACCIONES) as TipoReaccion[]).map((k) => [k, lottieDeEmoji(REACCIONES[k].emoji)]),
) as Record<TipoReaccion, object>;
