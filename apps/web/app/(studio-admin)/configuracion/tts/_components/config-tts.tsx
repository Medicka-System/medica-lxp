'use client';

/**
 * Studio · Configuración › IA / Eco › Narración TTS (§3/§5C).
 *
 * UI de configuración del proveedor y la voz del TTS que lee la teoría. Mismo patrón
 * intercambiable que los modelos de Eco: el proveedor de voz es una pieza reemplazable
 * por config, no cableada (OpenAI → ElevenLabs por upgrade).
 *
 * ⚠️ PENDIENTE DE API: el backend del TTS lo construye cb-api; la tabla y la server
 * action de persistencia aún no existen. Los controles funcionan en local (demuestran
 * el flujo), pero GUARDAR queda deshabilitado hasta que aterrice el backend. La forma
 * exacta que espera esta UI vive en `../_contrato.ts`.
 */

import { useState } from 'react';
import Link from 'next/link';
import { AudioLines, ChevronLeft, Clock, Save } from 'lucide-react';
import { mono, softText, focusRing } from '@/components/tokens';
import {
  TTS_DEFECTO,
  VOCES_POR_PROVEEDOR,
  type TtsConfig,
  type TtsFormato,
  type TtsProveedor,
} from '../_contrato';

const claseInput =
  'w-full rounded-[9px] border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-secondary';
const claseLabel = 'text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground';

const PROVEEDORES: { id: TtsProveedor; etiqueta: string }[] = [
  { id: 'openai', etiqueta: 'OpenAI' },
  { id: 'elevenlabs', etiqueta: 'ElevenLabs' },
];
const FORMATOS: TtsFormato[] = ['mp3', 'wav', 'opus'];

export function ConfigTts({ config = TTS_DEFECTO }: { config?: TtsConfig }) {
  const [proveedor, setProveedor] = useState<TtsProveedor>(config.proveedor);
  const [voz, setVoz] = useState(config.voz);
  const [modelo, setModelo] = useState(config.modelo ?? '');
  const [formato, setFormato] = useState<TtsFormato>(config.formato);
  const [velocidad, setVelocidad] = useState(config.velocidad);

  const voces = VOCES_POR_PROVEEDOR[proveedor];

  function cambiarProveedor(p: TtsProveedor) {
    setProveedor(p);
    // Al cambiar de proveedor, la voz vigente puede no existir → cae a la primera.
    const disponibles = VOCES_POR_PROVEEDOR[p];
    if (!disponibles.some((v) => v.id === voz)) setVoz(disponibles[0]?.id ?? '');
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-6 pb-16 pt-5">
      <Link
        href="/configuracion/ia"
        className={`inline-flex items-center gap-1.5 rounded-[8px] text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
      >
        <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
        IA / Eco
      </Link>

      <div className="mt-2 flex items-center gap-3">
        <span
          aria-hidden
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
        >
          <AudioLines className="h-[22px] w-[22px]" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
            Narración TTS
          </h1>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            La voz que lee la teoría del curso. Proveedor intercambiable por config, sin tocar código.
          </p>
        </div>
      </div>

      {/* Banner honesto: backend por cablear */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-[18px] py-3.5">
        <span
          aria-hidden
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
        >
          <Clock className="h-[17px] w-[17px]" strokeWidth={2} />
        </span>
        <p className="min-w-[280px] flex-1 text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
          <span className="font-bold">Pendiente de API.</span> El backend del TTS lo construye cb-api.
          Puedes explorar la configuración aquí; <span className="font-semibold">Guardar</span> se activa
          cuando aterrice la tabla y su server action (forma exacta en <code>_contrato.ts</code>).
        </p>
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-[18px] shadow-rest">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="tts-prov" className={claseLabel}>
              Proveedor
            </label>
            <select
              id="tts-prov"
              value={proveedor}
              onChange={(e) => cambiarProveedor(e.target.value as TtsProveedor)}
              className={claseInput}
            >
              {PROVEEDORES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.etiqueta}
                </option>
              ))}
            </select>
            <p className={`text-[11px] ${softText}`}>OpenAI para arrancar; ElevenLabs como upgrade.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tts-voz" className={claseLabel}>
              Voz
            </label>
            <select
              id="tts-voz"
              value={voz}
              onChange={(e) => setVoz(e.target.value)}
              className={claseInput}
            >
              {voces.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.etiqueta}
                </option>
              ))}
            </select>
            <p className={`text-[11px] ${softText}`}>El catálogo real lo expondrá cb-api por proveedor.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tts-modelo" className={claseLabel}>
              Modelo
            </label>
            <input
              id="tts-modelo"
              type="text"
              value={modelo}
              onChange={(e) => setModelo(e.target.value)}
              placeholder="tts-1"
              className={`${claseInput} ${mono}`}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tts-formato" className={claseLabel}>
              Formato de audio
            </label>
            <select
              id="tts-formato"
              value={formato}
              onChange={(e) => setFormato(e.target.value as TtsFormato)}
              className={claseInput}
            >
              {FORMATOS.map((f) => (
                <option key={f} value={f}>
                  {f.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="tts-vel" className={claseLabel}>
              Velocidad
            </label>
            <div className="flex items-center gap-3">
              <input
                id="tts-vel"
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={velocidad}
                onChange={(e) => setVelocidad(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer accent-[color:var(--primary)]"
              />
              <span className={`${mono} w-14 shrink-0 text-right text-[13px] font-bold`}>
                {velocidad.toFixed(2)}×
              </span>
            </div>
            <p className={`text-[11px] ${softText}`}>0.5× a 2×; 1× es la velocidad natural.</p>
          </div>
        </div>
      </section>

      <div className="mt-5 flex items-center gap-3">
        <p className={`text-[11.5px] ${softText}`}>
          Los cambios no se persisten todavía (backend por cablear).
        </p>
        <button
          type="button"
          disabled
          title="Se activa cuando cb-api exponga el backend del TTS"
          className="ml-auto inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-[10px] bg-muted px-4 text-[13px] font-bold text-muted-foreground"
        >
          <Save aria-hidden className="h-4 w-4" strokeWidth={2} />
          Guardar (pendiente de API)
        </button>
      </div>
    </div>
  );
}
