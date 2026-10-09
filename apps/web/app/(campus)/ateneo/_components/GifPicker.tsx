"use client";

/**
 * Selector de GIFs de Giphy REUSABLE (composer de posts Y de comentarios). Extraído del
 * composer para no reimplementarlo: maneja su propio estado de búsqueda/fetch (debounce) y
 * avisa al padre con `onSelect(gif)`. El GIF es hotlink al CDN de Giphy (su ToS exige hotlink,
 * no re-hospedar · §3): aquí solo se previsualiza; el padre persiste `{tipo:'gif',url}`.
 */

import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { gifsBuscar, gifsTrending } from "@/lib/campus/ateneo-social-acciones";
import type { GifItem } from "./tipos";
import { focusRing } from "./ui";

export function GifPicker({
  onSelect,
  selId,
  alto = "max-h-[300px]",
}: {
  onSelect: (g: GifItem) => void;
  selId?: string;
  /** Alto máximo del grid scrolleable (ajustable según el contenedor). */
  alto?: string;
}) {
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [q, setQ] = useState("");
  const [cargando, setCargando] = useState(false);

  // Tendencias al montar; búsqueda reactiva a `q` con debounce. El fetch va al proxy del `api`
  // (la key vive en el api, nunca en el cliente · §3).
  useEffect(() => {
    let vivo = true;
    setCargando(true);
    const term = q.trim();
    const t = setTimeout(
      async () => {
        const res = term ? await gifsBuscar(term) : await gifsTrending();
        if (vivo) {
          setGifs(res);
          setCargando(false);
        }
      },
      term ? 350 : 0,
    );
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar GIFs en GIPHY…"
          aria-label="Buscar GIFs"
          className={`h-11 w-full rounded-[11px] border-[1.5px] border-border bg-card pl-9 pr-3 text-[13px] font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground ${focusRing}`}
        />
      </div>
      <div className={`mt-3 overflow-y-auto rounded-[11px] ${alto}`}>
        {cargando && gifs.length === 0 ? (
          <div className="grid h-24 place-items-center text-[12px] text-muted-foreground">Cargando GIFs…</div>
        ) : gifs.length === 0 ? (
          <div className="grid h-24 place-items-center text-[12px] text-muted-foreground">Sin resultados.</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {gifs.map((g) => {
              const sel = selId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => onSelect(g)}
                  aria-pressed={sel}
                  className={`relative overflow-hidden rounded-[10px] bg-muted ${focusRing} ${sel ? "ring-2 ring-primary ring-offset-1" : ""}`}
                  style={{ aspectRatio: "1" }}
                >
                  <img src={g.preview} alt="" loading="lazy" className="h-full w-full object-cover" />
                  {sel && (
                    <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-white">
                      <Check aria-hidden className="h-3 w-3" strokeWidth={2.6} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {/* Atribución obligatoria (ToS de Giphy) */}
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Powered by GIPHY</p>
    </>
  );
}
