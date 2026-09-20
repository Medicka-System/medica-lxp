'use client';

/**
 * Editor de la LECCIÓN tipo xAPI (§5C · §7 · §9 · mig 0023). La lección ES un paquete
 * empaquetado (SCORM/xAPI exportado de Articulate Rise/Storyline): el diseñador sube el
 * .zip y lo gestiona. No es un bloque dentro de teoría.
 *
 * Reusa `BloquePaquete` para la zona de subida. La ingesta (descompresión con adm-zip +
 * validación del manifiesto con fast-xml-parser + subida a object storage) es DOMINIO y
 * vive en apps/api (`POST /paquetes`); el web NO descomprime ni valida (§2). La CONFIG
 * de la lección guarda el puntero al contenido registrado:
 *   { contenidoId, tipo, titulo, entryPoint }   (== `lecciones.config`, contrato §5C)
 *
 * Reproducción in-Studio del paquete = players del Sprint 6 (aún sin endpoint que sirva
 * el lanzador): se declara con dignidad, no se inventa.
 */

import { useState } from 'react';
import { Boxes, FileArchive, Loader2, RefreshCw } from 'lucide-react';
import { card, focusRing, kicker, mono, softText } from '@/lib/studio/estilos';
import { BloquePaquete } from '@/components/bloques/paquetes/bloque-paquete';
import type { EditorLeccionProps } from '@/lib/studio/leccion-tipos';
import { guardarConfigLeccion } from '@/lib/studio/acciones';
import { ingestarPaquete } from '@/lib/studio/media-acciones';

/** Forma de la config de una lección xAPI (la posee este editor · §5C). */
type ConfigXapi = {
  contenidoId?: string;
  tipo?: string;
  titulo?: string;
  entryPoint?: string | null;
};

function normalizar(config: Record<string, unknown>): ConfigXapi {
  const c = config as ConfigXapi;
  return {
    contenidoId: typeof c.contenidoId === 'string' ? c.contenidoId : undefined,
    tipo: typeof c.tipo === 'string' ? c.tipo : undefined,
    titulo: typeof c.titulo === 'string' ? c.titulo : undefined,
    entryPoint: typeof c.entryPoint === 'string' ? c.entryPoint : null,
  };
}

const ROTULO: Record<string, string> = { scorm: 'SCORM', xapi: 'xAPI (Tin Can)' };

export function EditorXapi({ programaId, leccionId, titulo, config, correr }: EditorLeccionProps) {
  const [cfg, setCfg] = useState<ConfigXapi>(() => normalizar(config));
  const [subiendo, setSubiendo] = useState(false);
  const [reemplazando, setReemplazando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargado = !!cfg.contenidoId && !reemplazando;

  async function subir(file: File) {
    setError(null);
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.set('archivo', file);
      fd.set('leccionId', leccionId);
      if (titulo) fd.set('titulo', titulo);
      const r = await ingestarPaquete(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const nueva: ConfigXapi = {
        contenidoId: r.datos.contenidoId,
        tipo: r.datos.tipo,
        titulo: r.datos.titulo,
        entryPoint: r.datos.entryPoint,
      };
      setCfg(nueva);
      setReemplazando(false);
      correr(() => guardarConfigLeccion(programaId, leccionId, nueva as Record<string, unknown>));
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[11px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-4 py-3"
        >
          <p className="text-[12.5px] font-medium leading-relaxed text-[color:var(--destructive-foreground)]">
            {error}
          </p>
        </div>
      )}

      {subiendo ? (
        <div className={`${card} flex items-center gap-3 px-5 py-8`}>
          <Loader2 aria-hidden className="h-5 w-5 shrink-0 animate-spin text-secondary" strokeWidth={2} />
          <p className={`text-[13px] leading-relaxed ${softText}`}>
            Subiendo el paquete y validando el manifiesto en el dominio… no cierres esta pantalla.
          </p>
        </div>
      ) : cargado ? (
        <PaqueteCargado
          tipo={cfg.tipo}
          titulo={cfg.titulo ?? titulo}
          entryPoint={cfg.entryPoint ?? null}
          onReemplazar={() => {
            setError(null);
            setReemplazando(true);
          }}
        />
      ) : (
        <BloquePaquete
          modo="editar"
          titulo={titulo}
          contexto="Paquete SCORM / xAPI · exportado de Articulate Rise / Storyline"
          onSubir={subir}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Paquete ya ingerido ───────────────────────── */

function PaqueteCargado({
  tipo,
  titulo,
  entryPoint,
  onReemplazar,
}: {
  tipo?: string;
  titulo?: string;
  entryPoint: string | null;
  onReemplazar: () => void;
}) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3.5">
        <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-accent-foreground">
          <FileArchive className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold leading-snug">{titulo ?? 'Paquete'}</span>
          {entryPoint && (
            <span className={`${mono} mt-0.5 block truncate text-[11px] text-muted-foreground`}>{entryPoint}</span>
          )}
        </span>
        {tipo && (
          <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-muted px-2.5 text-[11px] font-bold text-muted-foreground">
            {ROTULO[tipo] ?? tipo}
          </span>
        )}
        <button
          type="button"
          onClick={onReemplazar}
          className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-[9px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <RefreshCw aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          Reemplazar
        </button>
      </div>

      <div className="px-5 py-4">
        <p className={`${kicker} text-secondary`}>Paquete registrado</p>
        <p className={`mt-1.5 text-[13px] leading-relaxed ${softText}`}>
          El paquete se descomprimió, se validó su manifiesto y quedó ligado a esta lección. El alumno
          lo verá como una lección íntegra de tipo {tipo === 'xapi' ? 'xAPI' : 'SCORM'}.
        </p>
      </div>

      <div className="flex items-start gap-3 border-t border-border bg-[color:var(--info-surface)] px-5 py-3.5">
        <Boxes aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
        <p className="text-[12px] leading-relaxed text-[color:var(--info-foreground)]">
          {tipo === 'xapi'
            ? 'Al reproducirse, el paquete xAPI reporta la actividad al LRS por la cola envio-xapi.'
            : 'El player SCORM captura el progreso (CMI) que el dominio traduce a statements.'}{' '}
          <span className="font-bold">Reproducción in-Studio pendiente de API</span> (servir el lanzador · Sprint 6 players).
        </p>
      </div>
    </div>
  );
}
