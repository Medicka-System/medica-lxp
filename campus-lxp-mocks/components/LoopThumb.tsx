import { Play, Video } from "lucide-react";
import { mono, trama } from "./tokens";

/**
 * Miniatura de cine-loop / imagen DICOM. El visor real es Cornerstone3D; esto es el marco y el
 * gancho visual. Sin poster cae en la trama diagonal sobre navy, nunca en un gris vacío.
 */
export function LoopThumb({
  poster,
  etiqueta,
  duracion,
  esquina,
  ratio = "16 / 10",
  tamanoPlay = 46,
  claro = false,
  className = "",
}: {
  poster?: string;
  /** rótulo del corte: "riñón derecho · longitudinal" */
  etiqueta?: string;
  duracion?: string;
  /** distintivo superior izquierdo: "cine-loop · 4 s" */
  esquina?: string;
  ratio?: string;
  tamanoPlay?: number;
  /** botón de play blanco en vez de teal (para fondos teal) */
  claro?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`relative grid w-full place-items-center overflow-hidden ${className}`}
      style={{ aspectRatio: ratio, background: "var(--sidebar)" }}
    >
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span className="absolute inset-0" style={{ background: trama }} />
      )}

      <span
        style={{ width: tamanoPlay, height: tamanoPlay }}
        className={`relative grid place-items-center rounded-full ${
          claro ? "bg-white/[0.92]" : "bg-primary"
        } text-[color:var(--sidebar)]`}
      >
        <Play style={{ width: tamanoPlay * 0.42, height: tamanoPlay * 0.42 }} strokeWidth={2} />
      </span>

      {esquina && (
        <span
          className="absolute left-3 top-3 inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-bold text-white"
          style={{ background: "rgba(15,45,82,.85)" }}
        >
          <Video className="h-3 w-3" strokeWidth={1.75} />
          {esquina}
        </span>
      )}
      {etiqueta && (
        <span
          className={`${mono} absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.14em]`}
          style={{ color: "var(--hero-ink-muted)" }}
        >
          {etiqueta}
        </span>
      )}
      {duracion && (
        <span
          className={`${mono} absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-white`}
          style={{ background: "rgba(15,45,82,.85)" }}
        >
          {duracion}
        </span>
      )}
    </span>
  );
}
