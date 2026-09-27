'use client';

/**
 * REGISTRO DE UI por `TipoCampo` (§6.5) — paralelo al `REGISTRO_CAMPOS` de LÓGICA
 * (`lib/reportes/estructura.ts`). Consolida los DOS dispatch JSX por tipo:
 *   · `render`  — el control del REPORTE (lo que el médico llena).
 *   · `preview` — la vista NO interactiva del LIENZO del constructor.
 *   · `editor`  — el editor de CONFIG del tipo en el panel de Propiedades.
 *
 * 1b-2: cada tipo trae su CONFIG RICA (llaves opcionales del contrato · AUSENTE = idéntico a hoy):
 *   texto/multitexto → placeholder, frasesRapidas · numero/medida → min/max/decimales, rangoNormal,
 *   percentilCurva, fórmula (se guarda; sin cálculo vivo aún) · fecha → formatoFecha · opcion →
 *   permiteOtro · imagen/galeria → imagenProporcion/imagenMin/imagenMax/permiteAnotaciones.
 *   El render USA la config (placeholder, frases rápidas, fuera-de-rango en ÁMBAR, "Otro", etc.).
 *
 * El visor DICOM NO se importa aquí (WASM de Cornerstone fuera del bundle del Studio): el editor
 * del médico lo inyecta por `renderVisorDicom`.
 */

import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Calendar, Check, ChevronDown, ImageOff, ImagePlus, Info, Loader2, Plus, Upload, X } from 'lucide-react';
import { softText, focusRing } from '@/components/tokens';
import { GaleriaReporte, GaleriaPlaceholder } from '@/components/reportes/galeria-reporte';
import { firmarLecturaImagenReferencia, firmarSubidaImagenContenido } from '@/lib/studio/media-acciones';
import {
  columnasDatos,
  fueraDeRango,
  leerBool,
  leerDimensiones,
  leerMultiseleccion,
  leerTabla,
  leerTexto,
  type CampoPlantilla,
  type ImagenGaleria,
  type RefDicom,
  type TipoCampo,
} from '@/lib/reportes/estructura';

export type ModoCampo = 'llenar' | 'previa';

/* ═══════════════════ contexto de cada faceta ═══════════════════ */

export type RenderCtx = {
  campo: CampoPlantilla;
  valor: unknown;
  modo: ModoCampo;
  deshabilitado: boolean;
  soloLectura: boolean;
  cambia: (v: unknown) => void;
  onElegirEstudio?: () => void;
  onQuitarEstudio?: () => void;
  renderVisorDicom?: (ref: RefDicom) => ReactNode;
  reporteId?: string;
};

export type EditorCtx = {
  campo: CampoPlantilla;
  onCambio: (patch: Partial<CampoPlantilla>) => void;
};

export type DefUICampo = {
  render: (ctx: RenderCtx) => ReactNode;
  preview: (campo: CampoPlantilla) => ReactNode;
  editor?: (ctx: EditorCtx) => ReactNode;
};

const inputBase =
  'w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary disabled:opacity-70';
const previewBox =
  'flex h-10 items-center rounded-[9px] border border-border bg-card px-3 text-[12.5px] text-muted-foreground';
const cfgInput =
  'h-9 w-full rounded-[8px] border border-border bg-card px-2.5 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary';
const rangoAmbar = 'mt-1.5 block text-[11px] font-semibold text-[color:var(--warning-foreground)]';

/* ═══════════════════ piezas del editor de config (Propiedades) ═══════════════════ */

function ECampo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-semibold">{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}
function ENum({ valor, onCambio }: { valor?: number; onCambio: (v: number | undefined) => void }) {
  return (
    <input
      inputMode="decimal"
      value={valor ?? ''}
      onChange={(e) => {
        const v = e.target.value.trim();
        onCambio(v === '' ? undefined : Number(v));
      }}
      className={`${cfgInput} font-mono tabular-nums`}
    />
  );
}
function ESeg<T extends string | number>({
  opciones,
  valor,
  onCambio,
}: {
  opciones: [T, string][];
  valor: T | undefined;
  onCambio: (v: T) => void;
}) {
  return (
    <span role="radiogroup" className="mt-1.5 flex gap-1 rounded-[10px] bg-muted p-[3px]">
      {opciones.map(([v, t]) => {
        const on = v === valor;
        return (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onCambio(v)}
            className={`h-8 flex-1 rounded-lg text-[11.5px] transition-colors ${focusRing} ${
              on ? 'bg-card font-bold text-foreground shadow-[0_1px_2px_rgba(17,24,39,.1)]' : 'font-semibold text-muted-foreground'
            }`}
          >
            {t}
          </button>
        );
      })}
    </span>
  );
}
function EToggle({ titulo, on, onCambio }: { titulo: string; on: boolean; onCambio: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="min-w-0 flex-1 text-[12.5px] font-semibold">{titulo}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={titulo}
        onClick={() => onCambio(!on)}
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${focusRing} ${on ? 'bg-primary' : 'bg-[color:var(--track)]'}`}
      >
        <span aria-hidden className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-card shadow-[0_1px_2px_rgba(17,24,39,.2)] transition-all ${on ? 'right-0.5' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
/** Lista editable (opciones/columnas/filas/frases). `chips` = compacta en línea. */
function EListaEditable({
  items,
  onCambio,
  placeholder,
  chips,
}: {
  items: string[];
  onCambio: (v: string[]) => void;
  placeholder: string;
  chips?: boolean;
}) {
  const [nuevo, setNuevo] = useState('');
  const agregar = () => {
    const v = nuevo.trim();
    if (!v) return;
    onCambio([...items, v]);
    setNuevo('');
  };
  return (
    <div>
      <div className={chips ? 'flex flex-wrap gap-1.5' : 'flex flex-col gap-1.5'}>
        {items.map((it, i) =>
          chips ? (
            <span key={i} className="inline-flex h-[26px] items-center gap-1.5 rounded-[7px] border border-border bg-muted px-2 text-[11px] font-semibold text-[color:var(--foreground-soft)]">
              {it}
              <button type="button" aria-label={`Quitar ${it}`} onClick={() => onCambio(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                <X aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              </button>
            </span>
          ) : (
            <span key={i} className="flex items-center gap-2 rounded-[9px] border border-border px-2.5 py-1.5">
              <input
                value={it}
                onChange={(e) => onCambio(items.map((x, j) => (j === i ? e.target.value : x)))}
                className="min-w-0 flex-1 bg-transparent text-[12px] text-foreground outline-none"
              />
              <button type="button" aria-label={`Quitar ${it}`} onClick={() => onCambio(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </span>
          ),
        )}
      </div>
      <span className="mt-1.5 flex gap-1.5">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregar())}
          placeholder={placeholder}
          className={cfgInput}
        />
        <button type="button" onClick={agregar} aria-label="Agregar" className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground ${focusRing}`}>
          <Plus aria-hidden className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </span>
    </div>
  );
}

/* ═══════════════════ imagen de referencia fija (subir | link) ═══════════════════ */

/**
 * Muestra una imagen de REFERENCIA de la plantilla. `src` es un LINK http(s) (se usa tal cual) o
 * una REF interna `media/imagenes/…` — subida al object storage (§5C) — que se firma bajo demanda
 * (URL de vida corta, 1 h). Así el constructor, la vista previa y el editor del médico la ven igual
 * sin persistir URLs firmadas que caducan: en BD se guarda la ref DURABLE (§6.5). No es imagen de
 * paciente → sin Presidio (§10).
 */
function ImgReferencia({ src, alt, className }: { src?: string; alt: string; className: string }) {
  const esRef = typeof src === 'string' && src.startsWith('media/imagenes/');
  const [firmada, setFirmada] = useState<string | null>(null);
  useEffect(() => {
    if (!esRef || !src) return;
    let vivo = true;
    void firmarLecturaImagenReferencia([src]).then((urls) => {
      if (vivo) setFirmada(urls[src] ?? null);
    });
    return () => {
      vivo = false;
    };
  }, [esRef, src]);
  const url = esRef ? firmada : src;
  if (!url) {
    return (
      <div className={`grid min-h-[120px] place-items-center bg-muted text-muted-foreground ${className}`}>
        {esRef ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} /> : <ImageOff className="h-5 w-5" strokeWidth={1.5} />}
      </div>
    );
  }
  return <img src={url} alt={alt} className={className} />;
}

/**
 * Editor de la IMAGEN DE REFERENCIA fija (§6.5, §5C): el diseñador SUBE un archivo (diagrama de la
 * plantilla → object storage vía `/media/imagenes`, reusando el flujo del constructor de teoría; NO
 * pasa por Presidio porque no es imagen de paciente · §10) o PEGA un link. En `refUrl` se guarda la
 * ref durable (subida) o la URL (link).
 */
function EImagenReferencia({ campo, onCambio }: EditorCtx) {
  const refUrl = campo.refUrl ?? '';
  const [modo, setModo] = useState<'subir' | 'link'>(
    refUrl && !refUrl.startsWith('media/imagenes/') ? 'link' : 'subir',
  );
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function subir(file: File) {
    setError(null);
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    setSubiendo(true);
    try {
      const firma = await firmarSubidaImagenContenido(ext);
      if (!firma.ok) {
        setError(firma.error);
        return;
      }
      const put = await fetch(firma.datos.urlSubida, {
        method: 'PUT',
        headers: { 'content-type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!put.ok) {
        setError('No se pudo subir la imagen a object storage.');
        return;
      }
      onCambio({ refUrl: firma.datos.ref });
    } catch {
      setError('Error al subir la imagen.');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <ECampo label="Imagen de referencia">
      <ESeg<'subir' | 'link'>
        opciones={[
          ['subir', 'Subir archivo'],
          ['link', 'Pegar link'],
        ]}
        valor={modo}
        onCambio={setModo}
      />
      {modo === 'subir' ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), inputRef.current?.click())}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) void subir(f);
          }}
          className={`mt-2 grid cursor-pointer place-items-center rounded-[9px] border-[1.5px] border-dashed border-border bg-card px-3 py-4 text-center transition-colors hover:border-secondary hover:bg-accent ${focusRing}`}
        >
          <span className="text-[11.5px] font-semibold text-secondary">
            {subiendo ? <Loader2 className="mx-auto h-5 w-5 animate-spin" strokeWidth={1.75} /> : <Upload className="mx-auto h-5 w-5" strokeWidth={1.75} />}
            {subiendo ? 'Subiendo…' : 'Sube un diagrama o haz click'}
          </span>
          <span className="mt-0.5 text-[10.5px] text-muted-foreground">JPG, PNG, WEBP o GIF</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void subir(f);
              e.target.value = '';
            }}
          />
        </div>
      ) : (
        <input
          value={refUrl}
          onChange={(e) => onCambio({ refUrl: e.target.value })}
          placeholder="https://…"
          className={`${cfgInput} mt-2`}
        />
      )}
      {error && <span className="mt-1.5 block text-[11px] font-semibold text-[color:var(--warning-foreground)]">{error}</span>}
      {campo.refUrl && (
        <ImgReferencia src={campo.refUrl} alt={campo.nombre || 'Imagen de referencia'} className="mt-2 max-h-[140px] w-full rounded-[8px] border border-border object-contain" />
      )}
    </ECampo>
  );
}

/* Editor común numero/medida (min/max/decimales + rango normal + percentil + fórmula). */
function EditorNumerico({ campo, onCambio }: EditorCtx) {
  const esMedida = campo.tipo === 'medida';
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2.5">
        {esMedida && (
          <ECampo label="Unidad">
            <input value={campo.unidad ?? ''} onChange={(e) => onCambio({ unidad: e.target.value })} placeholder="mm · cm · cc" className={`${cfgInput} font-mono`} />
          </ECampo>
        )}
        <ECampo label="Decimales">
          <ENum valor={campo.decimales} onCambio={(v) => onCambio({ decimales: v })} />
        </ECampo>
        <ECampo label="Mínimo">
          <ENum valor={campo.min} onCambio={(v) => onCambio({ min: v })} />
        </ECampo>
        <ECampo label="Máximo">
          <ENum valor={campo.max} onCambio={(v) => onCambio({ max: v })} />
        </ECampo>
      </div>
      <p className="text-[11px] leading-snug text-muted-foreground">Fuera de rango se marca en ámbar al médico; no bloquea el reporte.</p>
      {esMedida && (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <ECampo label="Referencia normal · mín">
              <ENum valor={campo.rangoNormalMin} onCambio={(v) => onCambio({ rangoNormalMin: v })} />
            </ECampo>
            <ECampo label="· máx">
              <ENum valor={campo.rangoNormalMax} onCambio={(v) => onCambio({ rangoNormalMax: v })} />
            </ECampo>
          </div>
          <ECampo label="Curva de percentiles (opcional)">
            <input value={campo.percentilCurva ?? ''} onChange={(e) => onCambio({ percentilCurva: e.target.value })} placeholder="p. ej. Hadlock" className={cfgInput} />
          </ECampo>
        </>
      )}
      <ECampo label="Fórmula (opcional)">
        <input
          value={campo.formulaExpresion ?? ''}
          onChange={(e) => onCambio({ formulaExpresion: e.target.value })}
          placeholder="fecha_estudio - fum"
          className={`${cfgInput} font-mono`}
        />
      </ECampo>
      <EListaEditable
        items={campo.formulaCamposFuente ?? []}
        onCambio={(formulaCamposFuente) => onCambio({ formulaCamposFuente })}
        placeholder="id de campo fuente…"
        chips
      />
      <p className="text-[11px] leading-snug text-muted-foreground">
        La fórmula se guarda; el cálculo automático se conecta en una fase posterior.
      </p>
    </div>
  );
}

/* ═══════════════════ controles del REPORTE ═══════════════════ */

/** texto/multitexto con placeholder + chips de frases rápidas (solo modo llenar). */
function TextoControl({ campo, valor, deshabilitado, cambia, multi }: RenderCtx & { multi: boolean }) {
  const texto = leerTexto(valor);
  const frases = campo.frasesRapidas ?? [];
  const insertar = (f: string) => cambia(texto ? `${texto} ${f}` : f);
  return (
    <>
      {multi ? (
        // Auto-crece a la altura del contenido (sin scroll): grid con un DIV espejo que replica
        // el texto y fija la altura; el textarea se superpone en la misma celda. Funciona con el
        // valor inicial (no solo al teclear), sin JS ni parpadeo. Mín ~3 líneas, sin máximo.
        <div className="mt-1.5 grid min-h-[92px] w-full rounded-[10px] border border-border bg-card transition-colors focus-within:border-secondary">
          <div
            aria-hidden
            className="invisible col-start-1 row-start-1 whitespace-pre-wrap px-3.5 py-3 text-[14px] leading-[1.7] [overflow-wrap:anywhere]"
          >
            {texto + '\n'}
          </div>
          <textarea
            disabled={deshabilitado}
            value={texto}
            onChange={(e) => cambia(e.target.value)}
            placeholder={campo.placeholder || undefined}
            className="col-start-1 row-start-1 resize-none overflow-hidden bg-transparent px-3.5 py-3 text-[14px] leading-[1.7] text-foreground outline-none [overflow-wrap:anywhere] placeholder:text-muted-foreground disabled:opacity-70"
          />
        </div>
      ) : (
        <input
          type="text"
          disabled={deshabilitado || campo.bloqueado}
          value={texto}
          onChange={(e) => cambia(e.target.value)}
          placeholder={campo.bloqueado ? 'Se asigna al crear el reporte' : campo.placeholder || undefined}
          className={`${inputBase} mt-1.5 h-11 ${campo.bloqueado ? 'bg-muted font-mono tracking-wide text-muted-foreground' : ''}`}
        />
      )}
      {!deshabilitado && frases.length > 0 && (
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          {frases.map((f, i) => (
            <button
              key={i}
              type="button"
              onClick={() => insertar(f)}
              className={`inline-flex h-7 items-center rounded-full border border-border bg-card px-2.5 text-[11.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              {f}
            </button>
          ))}
        </span>
      )}
    </>
  );
}

/** numero/medida con formato de decimales, sufijo de unidad (medida) y aviso fuera-de-rango. */
function NumeroControl({ campo, valor, deshabilitado, cambia, medida }: RenderCtx & { medida: boolean }) {
  const fuera = fueraDeRango(campo, valor);
  const control = medida ? (
    <span className="mt-1.5 flex items-stretch">
      <input
        type="number"
        step={campo.decimales ? Number(`1e-${campo.decimales}`) : undefined}
        disabled={deshabilitado}
        value={leerTexto(valor)}
        onChange={(e) => cambia(e.target.value)}
        className={`${inputBase} sin-spinner h-11 rounded-r-none`}
      />
      <span className="inline-flex items-center rounded-r-[10px] border border-l-0 border-border bg-muted px-3 text-[12.5px] font-semibold text-muted-foreground">
        {campo.unidad || '—'}
      </span>
    </span>
  ) : (
    <input
      type="number"
      step={campo.decimales ? Number(`1e-${campo.decimales}`) : undefined}
      disabled={deshabilitado}
      value={leerTexto(valor)}
      onChange={(e) => cambia(e.target.value)}
      className={`${inputBase} sin-spinner mt-1.5 h-11`}
    />
  );
  return (
    <>
      {control}
      {fuera && (
        <span className={rangoAmbar}>
          Fuera del rango {campo.rangoNormalMin ?? campo.min ?? '—'}–{campo.rangoNormalMax ?? campo.max ?? '—'}
          {campo.unidad ? ` ${campo.unidad}` : ''}.
        </span>
      )}
    </>
  );
}

/** dimensiones: N inputs numéricos separados por "×" con sufijo de unidad (estilo medida). */
function DimensionesControl({ campo, valor, deshabilitado, cambia }: RenderCtx) {
  const ejes = campo.ejes === 2 ? 2 : 3;
  const arr = leerDimensiones(valor, ejes);
  const set = (i: number, s: string) => {
    const next = arr.slice();
    next[i] = s.trim() === '' ? '' : Number.isFinite(Number(s)) ? Number(s) : '';
    cambia(next);
  };
  return (
    <span className="mt-1.5 flex items-stretch gap-1.5">
      {arr.map((x, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="flex items-center text-[13px] font-semibold text-muted-foreground">×</span>}
          <input
            type="number"
            step={campo.decimales ? Number(`1e-${campo.decimales}`) : undefined}
            disabled={deshabilitado}
            value={x === '' ? '' : x}
            onChange={(e) => set(i, e.target.value)}
            aria-label={`Eje ${i + 1}`}
            className={`${inputBase} sin-spinner h-11 min-w-0 flex-1 text-center`}
          />
        </Fragment>
      ))}
      <span className="inline-flex items-center rounded-[10px] border border-border bg-muted px-3 text-[12.5px] font-semibold text-muted-foreground">
        {campo.unidad || '—'}
      </span>
    </span>
  );
}

/** opcion con soporte de "Otro" (texto libre) cuando `permiteOtro`. */
function OpcionControl({ campo, valor, deshabilitado, cambia }: RenderCtx) {
  const opts = campo.opciones ?? [];
  const v = leerTexto(valor);
  const valorEsOtro = campo.permiteOtro === true && v !== '' && !opts.includes(v);
  const [otroActivo, setOtroActivo] = useState(valorEsOtro);
  return (
    <>
      <select
        disabled={deshabilitado}
        value={otroActivo ? '__otro__' : v}
        onChange={(e) => {
          if (e.target.value === '__otro__') {
            setOtroActivo(true);
            cambia('');
          } else {
            setOtroActivo(false);
            cambia(e.target.value);
          }
        }}
        className={`${inputBase} mt-1.5 h-11 appearance-none`}
      >
        <option value="">Seleccione…</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        {campo.permiteOtro && <option value="__otro__">Otro…</option>}
      </select>
      {campo.permiteOtro && otroActivo && (
        <input
          type="text"
          disabled={deshabilitado}
          value={v}
          onChange={(e) => cambia(e.target.value)}
          placeholder="Especifique…"
          className={`${inputBase} mt-1.5 h-11`}
        />
      )}
    </>
  );
}

/** Casilla individual (§5A · teal al marcar, no rojo). */
function Casilla({ marcada, disabled, onToggle, children }: { marcada: boolean; disabled?: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={marcada}
      disabled={disabled}
      // preventDefault: dentro de un <label>, sin esto el label redispara el click a la PRIMERA
      // casilla y la selección se vuelve errática. Cancela esa activación por defecto.
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
      className={`flex w-full items-center gap-2.5 rounded-[10px] border px-3 py-2.5 text-left text-[13px] transition-colors disabled:opacity-50 ${focusRing} ${
        marcada ? 'border-primary bg-accent text-accent-foreground font-semibold' : 'border-border bg-card text-foreground hover:bg-muted'
      }`}
    >
      <span aria-hidden className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border-[1.5px] ${marcada ? 'border-primary bg-primary text-[color:var(--sidebar)]' : 'border-[color:var(--track)] bg-card'}`}>
        {marcada && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{children}</span>
    </button>
  );
}

/** multiseleccion: lista de casillas (valor = string[]); "Otro" con texto libre; respeta maxSel. */
function MultiseleccionControl({ campo, valor, deshabilitado, cambia }: RenderCtx) {
  const opts = campo.opciones ?? [];
  const sel = leerMultiseleccion(valor);
  const customs = sel.filter((s) => !opts.includes(s));
  const [otroActivo, setOtroActivo] = useState(customs.length > 0);
  const tope = typeof campo.maxSel === 'number' ? campo.maxSel : Infinity;
  const enTope = sel.length >= tope;
  const otroVal = customs[0] ?? '';

  const toggle = (o: string) => {
    if (sel.includes(o)) cambia(sel.filter((x) => x !== o));
    else if (!enTope) cambia([...sel, o]);
  };
  const setOtroTexto = (t: string) => {
    const base = sel.filter((s) => opts.includes(s)); // conserva las marcadas del catálogo
    cambia(t.trim() ? [...base, t] : base);
  };

  return (
    <div className="mt-1.5 flex flex-col gap-1.5">
      {opts.map((o) => {
        const marcada = sel.includes(o);
        return (
          <Casilla key={o} marcada={marcada} disabled={deshabilitado || (!marcada && enTope)} onToggle={() => toggle(o)}>
            {o}
          </Casilla>
        );
      })}
      {campo.permiteOtro && (
        <>
          <Casilla
            marcada={otroActivo}
            disabled={deshabilitado || (!otroActivo && enTope)}
            onToggle={() => {
              if (otroActivo) {
                setOtroActivo(false);
                cambia(sel.filter((s) => opts.includes(s)));
              } else {
                setOtroActivo(true);
              }
            }}
          >
            Otro…
          </Casilla>
          {otroActivo && (
            <input
              type="text"
              disabled={deshabilitado}
              value={otroVal}
              onChange={(e) => setOtroTexto(e.target.value)}
              placeholder="Especifique…"
              className={`${inputBase} h-11`}
            />
          )}
        </>
      )}
      {typeof campo.maxSel === 'number' && (
        <span className="text-[11px] text-muted-foreground">
          {sel.length}/{campo.maxSel} seleccionadas
        </span>
      )}
    </div>
  );
}

function TablaCampoControl({ campo, valor, deshabilitado, onCambio }: { campo: CampoPlantilla; valor: unknown; deshabilitado: boolean; onCambio: (v: unknown) => void }) {
  const cols = campo.columnas ?? [];
  const filas = campo.filas ?? [];
  // `columnas[0]` = columna de etiquetas de fila (celdas = `filas`, no editables); `columnas[1..]`
  // = columnas de datos que el médico llena. La matriz de valores es `filas × columnasDatos`.
  const dataCols = columnasDatos(campo);
  const datos = leerTabla(valor, filas.length, dataCols.length);
  function editar(r: number, c: number, v: string) {
    const copia = datos.map((f) => [...f]);
    copia[r][c] = v;
    onCambio(copia);
  }
  // Sin columnas = tabla vacía: no hay nada que pintar (ni la columna de etiquetas existe).
  if (cols.length === 0) {
    return <p className="mt-1.5 text-[12px] text-muted-foreground">Tabla sin columnas.</p>;
  }
  return (
    <div className="mt-1.5 overflow-x-auto rounded-[10px] border border-border">
      <table className="w-full border-collapse text-[12.5px]">
        <thead>
          <tr className="bg-muted">
            {cols.map((c, i) => (
              <th
                key={i}
                className={`border-b border-border px-2 py-1.5 text-left text-[11px] font-bold text-muted-foreground ${i > 0 ? 'border-l' : ''}`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, r) => (
            <tr key={r}>
              <th className="border-t border-border bg-muted/50 px-2 py-1 text-left text-[11.5px] font-semibold">{f}</th>
              {dataCols.map((_, c) => (
                <td key={c} className="border-l border-t border-border p-0">
                  <input
                    type="text"
                    disabled={deshabilitado}
                    value={datos[r]?.[c] ?? ''}
                    onChange={(e) => editar(r, c, e.target.value)}
                    className="h-9 w-full min-w-[72px] bg-card px-2 text-[12.5px] text-foreground outline-none focus:bg-accent disabled:opacity-70"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** aspecto del recuadro de imagen según `imagenProporcion` (preview). */
function aspecto(campo: CampoPlantilla): string {
  return campo.imagenProporcion === '16:9' ? '16 / 9' : campo.imagenProporcion === '4:3' ? '4 / 3' : '3 / 2';
}

/* ═══════════════════════════ EL REGISTRO ═══════════════════════════ */

export const REGISTRO_UI: Record<TipoCampo, DefUICampo> = {
  titulo: {
    render: ({ campo }) => <p className="text-[15px] font-bold tracking-[-0.01em] text-foreground">{campo.nombre || 'Subtítulo'}</p>,
    preview: (campo) => <p className="mt-2 truncate text-[14.5px] font-extrabold">{campo.nombre || 'Subtítulo'}</p>,
  },
  guia: {
    render: ({ campo }) => (
      <div
        className="rounded-[11px] border-[1.5px] border-dashed p-4"
        style={{
          borderColor: 'color-mix(in oklab, var(--secondary) 35%, white)',
          backgroundImage: 'repeating-linear-gradient(135deg, color-mix(in oklab, var(--secondary) 7%, transparent) 0 6px, transparent 6px 13px)',
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-secondary">Guía de la plantilla</p>
        <p className={`mt-1.5 text-[12.5px] leading-relaxed ${softText}`}>{campo.nombre || 'Sugerencias y recordatorios de esta sección.'}</p>
      </div>
    ),
    preview: (campo) => (
      <div className="mt-2 flex gap-2.5">
        <Info aria-hidden className="mt-px h-[15px] w-[15px] shrink-0 text-secondary" strokeWidth={1.75} />
        <span className="min-w-0">
          <span className="block text-[11px] font-bold">Guía · no sale en el informe</span>
          <span className={`mt-0.5 block line-clamp-3 text-[11.5px] leading-relaxed [overflow-wrap:anywhere] ${softText}`}>
            {campo.nombre || 'Sugerencias y recordatorios de esta sección.'}
          </span>
        </span>
      </div>
    ),
  },
  texto: {
    render: (ctx) => <TextoControl {...ctx} multi={false} />,
    // Vista del lienzo: 1 línea, recorta con elipsis y no rompe el ancho (texto largo sin espacios).
    preview: (campo) => (
      <div className={previewBox}>
        <span className="min-w-0 truncate">{campo.valorDefecto || campo.placeholder || ''}</span>
      </div>
    ),
    editor: ({ campo, onCambio }) => (
      <div className="flex flex-col gap-3">
        <ECampo label="Placeholder">
          <input value={campo.placeholder ?? ''} onChange={(e) => onCambio({ placeholder: e.target.value })} className={cfgInput} />
        </ECampo>
        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold">Frases rápidas</p>
          <EListaEditable items={campo.frasesRapidas ?? []} onCambio={(frasesRapidas) => onCambio({ frasesRapidas })} placeholder="Nueva frase…" />
          <p className="mt-1.5 text-[11px] text-muted-foreground">El médico las inserta con un clic.</p>
        </div>
        <ECampo label="Contenido predeterminado">
          <textarea rows={1} value={campo.valorDefecto ?? ''} onChange={(e) => onCambio({ valorDefecto: e.target.value })} className={`${cfgInput} h-auto resize-y py-2 leading-relaxed`} />
        </ECampo>
      </div>
    ),
  },
  multitexto: {
    render: (ctx) => <TextoControl {...ctx} multi={true} />,
    // Vista del lienzo: caja fija tipo textarea (64–88px), recorta a ~4 líneas y NUNCA crece con
    // el contenido de ejemplo; texto largo sin espacios se parte para no romper el ancho.
    preview: (campo) => (
      <div className="min-h-[64px] max-h-[88px] overflow-hidden rounded-[9px] border border-border bg-card px-3 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
        <p className="line-clamp-4 [overflow-wrap:anywhere]">{campo.valorDefecto || campo.placeholder || ''}</p>
      </div>
    ),
    editor: ({ campo, onCambio }) => (
      <div className="flex flex-col gap-3">
        <ECampo label="Placeholder">
          <input value={campo.placeholder ?? ''} onChange={(e) => onCambio({ placeholder: e.target.value })} className={cfgInput} />
        </ECampo>
        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold">Frases rápidas</p>
          <EListaEditable items={campo.frasesRapidas ?? []} onCambio={(frasesRapidas) => onCambio({ frasesRapidas })} placeholder="Nueva frase…" />
        </div>
        <ECampo label="Contenido predeterminado">
          <textarea rows={3} value={campo.valorDefecto ?? ''} onChange={(e) => onCambio({ valorDefecto: e.target.value })} className={`${cfgInput} h-auto resize-y py-2 leading-relaxed`} />
        </ECampo>
      </div>
    ),
  },
  numero: {
    render: (ctx) => <NumeroControl {...ctx} medida={false} />,
    preview: () => <div className={`${previewBox} font-mono tabular-nums`}>0</div>,
    editor: (ctx) => (
      <div className="flex flex-col gap-3">
        <ECampo label="Placeholder">
          <input value={ctx.campo.placeholder ?? ''} onChange={(e) => ctx.onCambio({ placeholder: e.target.value })} className={cfgInput} />
        </ECampo>
        <EditorNumerico {...ctx} />
      </div>
    ),
  },
  medida: {
    render: (ctx) => <NumeroControl {...ctx} medida={true} />,
    preview: (campo) => (
      <div className={`${previewBox} overflow-hidden p-0`}>
        <span className="flex-1 px-3 font-mono tabular-nums">{(0).toFixed(campo.decimales ?? 1)}</span>
        <span className="flex h-full items-center border-l border-border bg-muted px-[11px] text-[11.5px] font-semibold text-[color:var(--foreground-soft)]">{campo.unidad || '—'}</span>
      </div>
    ),
    editor: (ctx) => <EditorNumerico {...ctx} />,
  },
  dimensiones: {
    render: (ctx) => <DimensionesControl {...ctx} />,
    preview: (campo) => {
      const ejes = campo.ejes === 2 ? 2 : 3;
      return (
        <div className="flex items-stretch gap-1.5">
          {Array.from({ length: ejes }).map((_, i) => (
            <Fragment key={i}>
              {i > 0 && <span className="flex items-center text-[12px] font-semibold text-muted-foreground">×</span>}
              <span className={`${previewBox} min-w-0 flex-1 justify-center font-mono tabular-nums`}>
                {(0).toFixed(campo.decimales ?? 1)}
              </span>
            </Fragment>
          ))}
          <span className="inline-flex items-center rounded-[9px] border border-border bg-muted px-[11px] text-[11.5px] font-semibold text-[color:var(--foreground-soft)]">
            {campo.unidad || '—'}
          </span>
        </div>
      );
    },
    editor: ({ campo, onCambio }) => (
      <div className="flex flex-col gap-3">
        <ECampo label="Ejes">
          <ESeg
            opciones={[
              [2, '2 ejes'],
              [3, '3 ejes'],
            ]}
            valor={campo.ejes ?? 3}
            onCambio={(v) => onCambio({ ejes: v as 2 | 3 })}
          />
        </ECampo>
        <div className="grid grid-cols-2 gap-2.5">
          <ECampo label="Unidad">
            <input value={campo.unidad ?? ''} onChange={(e) => onCambio({ unidad: e.target.value })} placeholder="mm · cm" className={`${cfgInput} font-mono`} />
          </ECampo>
          <ECampo label="Decimales">
            <ENum valor={campo.decimales} onCambio={(v) => onCambio({ decimales: v })} />
          </ECampo>
        </div>
      </div>
    ),
  },
  fecha: {
    render: ({ campo, valor, deshabilitado, cambia }) => (
      <input
        type={campo.formatoFecha === 'fecha-hora' ? 'datetime-local' : 'date'}
        disabled={deshabilitado}
        value={leerTexto(valor)}
        onChange={(e) => cambia(e.target.value)}
        className={`${inputBase} mt-1.5 h-11`}
      />
    ),
    preview: (campo) => (
      <div className={`${previewBox} font-mono tabular-nums`}>
        {campo.formatoFecha === 'fecha-hora' ? 'dd / mm / aaaa · hh:mm' : 'dd / mm / aaaa'}
        <Calendar aria-hidden className="ml-auto h-3.5 w-3.5" strokeWidth={1.75} />
      </div>
    ),
    editor: ({ campo, onCambio }) => (
      <ECampo label="Formato">
        <ESeg
          opciones={[
            ['fecha', 'Fecha'],
            ['fecha-hora', 'Fecha y hora'],
          ]}
          valor={campo.formatoFecha ?? 'fecha'}
          onCambio={(v) => onCambio({ formatoFecha: v })}
        />
      </ECampo>
    ),
  },
  tabla: {
    render: ({ campo, valor, deshabilitado, cambia }) => <TablaCampoControl campo={campo} valor={valor} deshabilitado={deshabilitado} onCambio={cambia} />,
    preview: (campo) => {
      const cols = campo.columnas ?? [];
      const filas = campo.filas ?? [];
      // Sin columnas = tabla vacía: sin columna fantasma, se ve vacía hasta que el diseñador agregue
      // columnas (la 1a será la de etiquetas de fila) — todas nombrables/borrables en Config.
      if (cols.length === 0) {
        return (
          <div className="rounded-[9px] border border-dashed border-border px-3 py-4 text-center text-[11.5px] text-muted-foreground">
            Tabla vacía — agrega columnas en la configuración.
          </div>
        );
      }
      // `columnas[0]` = columna de etiquetas de fila (celdas = `filas`); `columnas[1..]` = datos. La
      // tabla pinta EXACTAMENTE las columnas de la config (incluida la 0), sin columna inyectada.
      const dataCols = columnasDatos(campo);
      const grid = `1.3fr ${dataCols.map(() => '1fr').join(' ')}`;
      return (
        <div className="overflow-hidden rounded-[9px] border border-border text-[11.5px]">
          <div className="grid bg-muted" style={{ gridTemplateColumns: grid }}>
            <span className="px-[11px] py-[9px] font-bold text-[color:var(--foreground-soft)]">{cols[0]}</span>
            {dataCols.map((c, i) => (
              <span key={i} className="border-l border-border px-[11px] py-[9px] font-bold text-[color:var(--foreground-soft)]">
                {c}
              </span>
            ))}
          </div>
          {filas.map((f, r) => (
            <div key={r} className="grid border-t border-border" style={{ gridTemplateColumns: grid }}>
              <span className="truncate px-[11px] py-2 font-semibold">{f}</span>
              {dataCols.map((_, i) => (
                <span key={i} className="border-l border-border px-[11px] py-2 text-muted-foreground">
                  —
                </span>
              ))}
            </div>
          ))}
        </div>
      );
    },
    editor: ({ campo, onCambio }) => (
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold">Columnas</p>
          <EListaEditable items={campo.columnas ?? []} onCambio={(columnas) => onCambio({ columnas })} placeholder="Nueva columna…" />
        </div>
        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold">Filas</p>
          <EListaEditable items={campo.filas ?? []} onCambio={(filas) => onCambio({ filas })} placeholder="Nueva fila…" chips />
        </div>
      </div>
    ),
  },
  sino: {
    render: ({ valor, deshabilitado, cambia }) => (
      <span className="mt-1.5 flex gap-2">
        {(
          [
            ['Sí', true],
            ['No', false],
          ] as const
        ).map(([txt, val]) => {
          const on = leerBool(valor) === val;
          return (
            <button
              key={txt}
              type="button"
              disabled={deshabilitado}
              // preventDefault: el control va dentro de un <label>; sin esto, el label redispara
              // el click a su PRIMER botón asociado y el valor termina mal (siempre "Sí").
              onClick={(e) => {
                e.preventDefault();
                cambia(on ? null : val);
              }}
              className={`h-10 flex-1 rounded-[10px] border text-[13px] font-bold transition-colors disabled:opacity-70 ${focusRing} ${
                on ? 'border-primary bg-accent text-accent-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              {txt}
            </button>
          );
        })}
      </span>
    ),
    preview: () => (
      <div className="flex gap-1.5">
        {['Sí', 'No'].map((t) => (
          <span key={t} className="grid h-10 flex-1 place-items-center rounded-[9px] border border-border bg-card text-[12px] font-semibold text-[color:var(--foreground-soft)]">
            {t}
          </span>
        ))}
      </div>
    ),
  },
  opcion: {
    render: (ctx) => <OpcionControl {...ctx} />,
    preview: (campo) => (
      <div className={previewBox}>
        {campo.opciones?.[0] ?? 'Seleccione'}
        <ChevronDown aria-hidden className="ml-auto h-3.5 w-3.5" strokeWidth={2} />
      </div>
    ),
    editor: ({ campo, onCambio }) => (
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold">Opciones</p>
          <EListaEditable items={campo.opciones ?? []} onCambio={(opciones) => onCambio({ opciones })} placeholder="Nueva opción…" />
        </div>
        <EToggle titulo="Incluir “Otro” (texto libre)" on={!!campo.permiteOtro} onCambio={(v) => onCambio({ permiteOtro: v })} />
      </div>
    ),
  },
  multiseleccion: {
    render: (ctx) => <MultiseleccionControl {...ctx} />,
    // Vista del lienzo: casillas NO interactivas (las 2 primeras opciones a modo de muestra).
    preview: (campo) => (
      <div className="flex flex-col gap-1.5">
        {(campo.opciones ?? ['Opción 1', 'Opción 2']).slice(0, 4).map((o, i) => (
          <span key={i} className="flex items-center gap-2.5 text-[12px] text-[color:var(--foreground-soft)]">
            <span aria-hidden className="h-4 w-4 rounded-[5px] border-[1.5px] border-[color:var(--track)]" />
            <span className="min-w-0 truncate">{o}</span>
          </span>
        ))}
      </div>
    ),
    editor: ({ campo, onCambio }) => (
      <div className="flex flex-col gap-3">
        <div>
          <p className="mb-1.5 text-[11.5px] font-semibold">Opciones</p>
          <EListaEditable items={campo.opciones ?? []} onCambio={(opciones) => onCambio({ opciones })} placeholder="Nueva opción…" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <ECampo label="Mínimo a marcar">
            <ENum valor={campo.minSel} onCambio={(v) => onCambio({ minSel: v })} />
          </ECampo>
          <ECampo label="Máximo a marcar">
            <ENum valor={campo.maxSel} onCambio={(v) => onCambio({ maxSel: v })} />
          </ECampo>
        </div>
        <EToggle titulo="Incluir “Otro” (texto libre)" on={!!campo.permiteOtro} onCambio={(v) => onCambio({ permiteOtro: v })} />
      </div>
    ),
  },
  imagen: {
    render: ({ campo, valor, modo, soloLectura, reporteId, cambia }) => {
      // (1) Referencia FIJA de la plantilla (ilustración/diagrama). No es imagen de paciente.
      if (campo.origen === 'referencia') {
        return campo.refUrl ? (
          <ImgReferencia
            src={campo.refUrl}
            alt={campo.nombre || 'Imagen de referencia'}
            className="mt-1.5 max-h-[320px] w-full rounded-[11px] border border-border object-contain"
          />
        ) : (
          <div className="mt-1.5 grid h-[160px] place-items-center rounded-[11px] border border-dashed border-border bg-muted text-center text-[12px] text-muted-foreground">
            <span>
              <ImageOff className="mx-auto h-5 w-5" strokeWidth={1.5} />
              Imagen de referencia (sin URL)
            </span>
          </div>
        );
      }
      // (2) Imagen del MÉDICO: SUBE UNA imagen (JPG/PNG/.dcm) — MISMO flujo que la galería (uploader
      // + anonimización Presidio al subir + firma de lectura), LIMITADO A 1 (estudios de precisión).
      return modo === 'llenar' && reporteId ? (
        <GaleriaReporte reporteId={reporteId} max={1} valor={valor} soloLectura={soloLectura} onCambio={(imgs: ImagenGaleria[]) => cambia(imgs)} />
      ) : (
        <div className="mt-1.5 grid h-[160px] place-items-center rounded-[11px] border-[1.5px] border-dashed border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-center">
          <span className="text-[12px] font-semibold text-[color:var(--info-foreground)]">
            <ImagePlus className="mx-auto h-5 w-5" strokeWidth={1.75} />
            El médico sube aquí una imagen (JPG, PNG o .dcm)
          </span>
        </div>
      );
    },
    preview: (campo) =>
      campo.origen === 'referencia' && campo.refUrl ? (
        <ImgReferencia src={campo.refUrl} alt={campo.nombre || 'Imagen de referencia'} className="max-h-[200px] w-full rounded-[10px] border border-border object-contain" />
      ) : (
        <div
          className="grid place-items-center rounded-[10px] border-[1.5px] border-dashed border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
          style={{ aspectRatio: aspecto(campo) }}
        >
          <span className="flex flex-col items-center gap-2 text-center">
            <ImagePlus aria-hidden className="h-6 w-6" strokeWidth={1.75} />
            <span className="text-[12px] font-bold">
              {campo.origen === 'referencia' ? 'Imagen de referencia (sin URL)' : 'El médico sube aquí una imagen'}
            </span>
          </span>
        </div>
      ),
    editor: ({ campo, onCambio }) => (
      <div className="flex flex-col gap-3">
        <ECampo label="Origen">
          <select value={campo.origen ?? 'dicom'} onChange={(e) => onCambio({ origen: e.target.value === 'referencia' ? 'referencia' : 'dicom' })} className={cfgInput}>
            <option value="dicom">El médico sube una imagen</option>
            <option value="referencia">Referencia fija de la plantilla</option>
          </select>
        </ECampo>
        {campo.origen === 'referencia' && <EImagenReferencia campo={campo} onCambio={onCambio} />}
        <ECampo label="Proporción">
          <ESeg
            opciones={[
              ['libre', 'Libre'],
              ['4:3', '4:3'],
              ['16:9', '16:9'],
            ]}
            valor={campo.imagenProporcion ?? 'libre'}
            onCambio={(v) => onCambio({ imagenProporcion: v })}
          />
        </ECampo>
        <EToggle titulo="Permitir anotaciones" on={!!campo.permiteAnotaciones} onCambio={(v) => onCambio({ permiteAnotaciones: v })} />
      </div>
    ),
  },
  galeria: {
    render: ({ modo, reporteId, valor, soloLectura, cambia }) =>
      modo === 'llenar' && reporteId ? (
        <GaleriaReporte reporteId={reporteId} valor={valor} soloLectura={soloLectura} onCambio={(imgs: ImagenGaleria[]) => cambia(imgs)} />
      ) : (
        <GaleriaPlaceholder />
      ),
    preview: () => (
      <div className="flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--info-border)] bg-[color:var(--info-surface)] p-[18px] text-center text-[color:var(--info-foreground)]">
        <ImagePlus aria-hidden className="h-[26px] w-[26px]" strokeWidth={1.75} />
        <span className="text-[12.5px] font-bold">El médico sube aquí varias imágenes</span>
      </div>
    ),
    editor: ({ campo, onCambio }) => (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2.5">
          <ECampo label="Mínimo de imágenes">
            <ENum valor={campo.imagenMin} onCambio={(v) => onCambio({ imagenMin: v })} />
          </ECampo>
          <ECampo label="Máximo de imágenes">
            <ENum valor={campo.imagenMax} onCambio={(v) => onCambio({ imagenMax: v })} />
          </ECampo>
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">El mínimo alimenta el gate de Finalizar.</p>
      </div>
    ),
  },
};
