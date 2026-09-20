'use client';

/**
 * Subida DICOM MULTI-ARCHIVO / ZIP (§4.7 · rediseño multi-serie). En la práctica real
 * un estudio trae muchas series: el médico arrastra varios `.dcm` de una vez o un
 * `.zip` con el estudio completo. Este módulo cubre la CAPA VISUAL de esa subida (fiel
 * al mock de bitácora) + el runner del pipeline que YA funciona (solicitar → PUT
 * directo a storage → confirmar → sondear estado). NO toca la anonimización (worker).
 *
 * Dos piezas reutilizables (bitácora del alumno + Studio/Casos del staff):
 *   • `SelectorArchivosDicom` — dropzone controlado que muestra las series como
 *     miniaturas (LONG. DERECHO, TRANSVERSAL, VEJIGA, +N — como el mock).
 *   • `ejecutarSubidaMulti` — corre el pipeline por cada fuente (un `.dcm` = una serie;
 *     un `.zip` lo descomprime el worker server-side en N series · §10).
 *
 * El binario va cliente → object storage directo (URL firmada); nunca por el web/api.
 * Solo se procesan `.dcm` y `.zip` (la anonimización dcmjs es DICOM); JPG/MP4 sueltos
 * exigen conversión previa a DICOM y quedan fuera de este paso.
 */

import { useRef, type DragEvent } from 'react';
import { FileArchive, FileCheck2, Upload, X } from 'lucide-react';
import type { TablaEstudioDicom } from '@campus/shared';
import { mono, tramaEstilo, focusRing } from '@/components/tokens';
import {
  solicitarSubidaDicom,
  confirmarSubidaDicom,
  estadoEstudioDicom,
  type ArchivoFuente,
} from '@/lib/dicom/acciones';

export type FaseDicom =
  | 'idle'
  | 'creando'
  | 'subiendo'
  | 'procesando'
  | 'anonimizado'
  | 'error';

export const ETIQUETA_FASE: Record<Exclude<FaseDicom, 'idle'>, string> = {
  creando: 'Guardando el caso…',
  subiendo: 'Subiendo las series a storage…',
  procesando: 'Anonimizando el estudio…',
  anonimizado: 'Estudio anonimizado y listo',
  error: 'No se pudo procesar el estudio',
};

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ¿La fuente es un `.zip` (el worker lo descomprime en N series)? */
export function esZip(f: File): boolean {
  return /\.zip$/i.test(f.name) || f.type === 'application/zip' || f.type === 'application/x-zip-compressed';
}

/** Acepta solo lo que el pipeline sabe procesar: `.dcm` sueltos y `.zip` de estudio. */
export function esFuenteValida(f: File): boolean {
  return esZip(f) || /\.dcm$/i.test(f.name) || f.type === 'application/dicom';
}

/**
 * Corre el pipeline para TODAS las fuentes de un caso (multi-serie): firma N PUTs →
 * el navegador sube cada fuente directo a storage → confirma (encola procesar-dicom) →
 * sondea el estado hasta `anonimizado`/`error`. Reusa el pipeline sin modificarlo.
 */
export async function ejecutarSubidaMulti(
  casoId: string,
  tabla: TablaEstudioDicom,
  archivos: File[],
  onFase: (f: FaseDicom, msg?: string) => void,
  anexar = false,
): Promise<FaseDicom> {
  const fuentes: ArchivoFuente[] = archivos.map((f, i) => ({ indice: i, esZip: esZip(f) }));

  onFase('subiendo');
  const sol = await solicitarSubidaDicom(casoId, fuentes, tabla);
  if (!sol.ok) return onFase('error', sol.error), 'error';

  // Subir cada fuente a su URL firmada (browser → object storage directo · §2).
  for (const item of sol.datos.items) {
    const file = archivos[item.indice];
    if (!file) continue;
    const put = await fetch(item.urlSubida, {
      method: 'PUT',
      headers: { 'content-type': item.esZip ? 'application/zip' : 'application/dicom' },
      body: file,
    }).catch(() => null);
    if (!put || !put.ok) {
      return onFase('error', `No se pudo subir «${file.name}» a storage (${put?.status ?? 'sin red'}).`), 'error';
    }
  }

  const conf = await confirmarSubidaDicom(casoId, fuentes, tabla, anexar);
  if (!conf.ok) return onFase('error', conf.error), 'error';

  onFase('procesando');
  for (let i = 0; i < 60; i++) {
    await dormir(1500);
    const est = await estadoEstudioDicom(casoId, tabla);
    if (!est.ok) continue;
    if (est.datos.estado === 'anonimizado') return onFase('anonimizado'), 'anonimizado';
    if (est.datos.estado === 'error') {
      return onFase('error', 'La anonimización falló. Revisa que sean DICOM (.dcm) válidos.'), 'error';
    }
  }
  return onFase('error', 'El procesamiento está tardando más de lo esperado. Revisa el worker.'), 'error';
}

/** Etiqueta corta de una serie para la miniatura (nombre sin extensión, en corto). */
function etiquetaSerie(f: File): string {
  const base = f.name.replace(/\.(dcm|zip)$/i, '');
  return base.length > 22 ? `${base.slice(0, 20)}…` : base;
}

/** Miniatura de una serie/fuente seleccionada (navy con trama, como el mock). */
function MiniaturaSerie({
  file,
  onQuitar,
  bloqueado,
}: {
  file: File;
  onQuitar: () => void;
  bloqueado?: boolean;
}) {
  const zip = esZip(file);
  return (
    <div className="group relative w-[104px] shrink-0">
      <div
        className="relative grid aspect-video w-full place-items-center overflow-hidden rounded-[9px] border border-border"
        style={{ background: 'var(--wave-0)' }}
      >
        <span aria-hidden className="absolute inset-0" style={{ background: tramaEstilo }} />
        {zip ? (
          <FileArchive aria-hidden className="relative h-5 w-5 text-[color:var(--hero-ink-muted)]" strokeWidth={1.75} />
        ) : (
          <span
            className={`relative ${mono} px-1 text-center text-[8px] uppercase tracking-[0.12em]`}
            style={{ color: 'var(--hero-ink-muted)' }}
          >
            {etiquetaSerie(file)}
          </span>
        )}
        {zip && (
          <span
            className={`absolute bottom-1 left-1 rounded-full px-1.5 py-[1px] text-[8px] font-bold ${mono}`}
            style={{ background: 'rgba(15,45,82,.82)', color: 'var(--hero-ink)' }}
          >
            varias series
          </span>
        )}
      </div>
      {!bloqueado && (
        <button
          type="button"
          onClick={onQuitar}
          aria-label={`Quitar ${file.name}`}
          className={`absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      )}
      <p className="mt-1 truncate text-[10px] font-medium text-muted-foreground" title={file.name}>
        {zip ? 'estudio .zip' : etiquetaSerie(file)}
      </p>
    </div>
  );
}

/**
 * Dropzone CONTROLADO multi-archivo. Muestra las fuentes elegidas como una tira de
 * miniaturas de series. `value`/`onChange` para que el padre (hoja de subida / editor)
 * cree el caso y luego dispare `ejecutarSubidaMulti`.
 */
export function SelectorArchivosDicom({
  value,
  onChange,
  bloqueado = false,
}: {
  value: File[];
  onChange: (files: File[]) => void;
  bloqueado?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);

  const agregar = (lista: FileList | null) => {
    if (!lista) return;
    const nuevos = Array.from(lista).filter(esFuenteValida);
    // Evita duplicados por nombre+tamaño.
    const clave = (f: File) => `${f.name}:${f.size}`;
    const vistos = new Set(value.map(clave));
    onChange([...value, ...nuevos.filter((f) => !vistos.has(clave(f)))]);
  };

  const soltar = (e: DragEvent) => {
    e.preventDefault();
    if (bloqueado) return;
    agregar(e.dataTransfer.files);
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept=".dcm,application/dicom,.zip,application/zip"
        multiple
        className="sr-only"
        onChange={(e) => {
          agregar(e.target.files);
          e.target.value = '';
        }}
      />

      {value.length === 0 ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={soltar}
          className="rounded-[12px] border-[1.5px] border-dashed border-[color:var(--track)] bg-muted p-6 text-center"
        >
          <span
            aria-hidden
            className="mx-auto grid h-[46px] w-[46px] place-items-center rounded-full bg-card text-secondary"
          >
            <Upload className="h-[22px] w-[22px]" strokeWidth={1.75} />
          </span>
          <p className="mt-3 text-[14px] font-bold">Arrastre las series del estudio o un .zip</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Varios <strong>.dcm</strong> a la vez o un <strong>.zip</strong> con el estudio completo.
            Se anonimizan al procesarse (§10) · sin datos del paciente.
          </p>
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={`mt-3.5 h-11 rounded-full border border-border bg-card px-5 text-[13.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
          >
            Elegir archivos
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={soltar}
          className="rounded-[12px] border border-border bg-card p-3.5"
        >
          <div className="flex items-center gap-2">
            <FileCheck2 aria-hidden className="h-4 w-4 text-secondary" strokeWidth={1.9} />
            <p className="text-[12.5px] font-bold">
              {value.length} {value.length === 1 ? 'serie/fuente' : 'series/fuentes'} por subir
            </p>
            {!bloqueado && (
              <button
                type="button"
                onClick={() => onChange([])}
                className={`ml-auto text-[12px] font-semibold text-secondary ${focusRing}`}
              >
                Quitar todo
              </button>
            )}
          </div>
          <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
            {value.map((f, i) => (
              <MiniaturaSerie
                key={`${f.name}:${f.size}:${i}`}
                file={f}
                bloqueado={bloqueado}
                onQuitar={() => onChange(value.filter((_, j) => j !== i))}
              />
            ))}
            {!bloqueado && (
              <button
                type="button"
                onClick={() => input.current?.click()}
                className={`grid aspect-video w-[104px] shrink-0 place-items-center gap-1 self-start rounded-[9px] border-[1.5px] border-dashed border-[color:var(--track)] text-secondary transition-colors hover:border-primary hover:bg-accent ${focusRing}`}
              >
                <Upload className="h-[18px] w-[18px]" strokeWidth={2} />
                <span className="text-[10px] font-semibold">Agregar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
