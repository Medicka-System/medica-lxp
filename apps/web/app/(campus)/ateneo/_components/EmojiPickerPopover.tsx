"use client";

/**
 * Popover de EMOJI (estilo FB: buscador + categorías + recientes), sobre `emoji-picker-react`.
 * · LAZY + sin SSR (`next/dynamic`): la data de emojis NO infla el bundle inicial ni corre en el
 *   server (usa `window`). Se carga al abrir el composer/comentario.
 * · `emojiStyle="native"`: renderiza el glifo Unicode nativo → SIN CDN de imágenes (robusto,
 *   funciona tras el túnel). Los "recientes" los guarda la lib en localStorage.
 * · Se cierra por clic afuera / Esc (patrón del resto de overlays del Ateneo).
 * Devuelve el carácter del emoji al padre; el padre decide dónde insertarlo (cursor del textarea/input).
 */

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { focusRing } from "./ui";

// Props mínimas que usamos (evita importar los tipos/enum de la lib en el módulo del wrapper,
// lo que rompería el lazy-loading al arrastrar la lib al bundle del componente).
type PickerProps = {
  onEmojiClick: (e: { emoji: string }) => void;
  emojiStyle?: string;
  theme?: string;
  width?: number;
  height?: number;
  lazyLoadEmojis?: boolean;
  searchPlaceHolder?: string;
  autoFocusSearch?: boolean;
  skinTonesDisabled?: boolean;
  previewConfig?: { showPreview?: boolean };
};

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((m) => m.default as unknown as React.ComponentType<PickerProps>),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-[380px] w-[320px] place-items-center rounded-[12px] border border-border bg-card text-[12px] text-muted-foreground">
        Cargando emojis…
      </div>
    ),
  },
);

export function EmojiPickerPopover({
  abierto,
  onCerrar,
  onEmoji,
  posicion = "left",
  direccion = "up",
}: {
  abierto: boolean;
  onCerrar: () => void;
  onEmoji: (emoji: string) => void;
  /** Anclaje horizontal del popover respecto al botón que lo abre. */
  posicion?: "left" | "right";
  /** Abre hacia arriba (barra de comentario, al pie) o hacia abajo (editor arriba). */
  direccion?: "up" | "down";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onCerrar();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    // `capture` para ganarle al stopPropagation de los tiles internos del picker.
    document.addEventListener("pointerdown", fuera, true);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera, true);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;
  return (
    <div
      ref={ref}
      className={`absolute z-50 overflow-hidden rounded-[12px] shadow-[0_10px_30px_rgba(17,24,39,0.18)] ${direccion === "down" ? "top-[calc(100%+8px)]" : "bottom-[calc(100%+8px)]"} ${posicion === "right" ? "right-0" : "left-0"} ${focusRing}`}
    >
      <EmojiPicker
        onEmojiClick={(e) => onEmoji(e.emoji)}
        emojiStyle="native"
        theme="light"
        width={320}
        height={380}
        lazyLoadEmojis
        skinTonesDisabled
        searchPlaceHolder="Buscar emoji…"
        previewConfig={{ showPreview: false }}
      />
    </div>
  );
}
