'use client';

/**
 * Studio · Configuración › IA / Eco › Narración TTS (§3/§5C).
 *
 * UI de configuración del proveedor y la voz del TTS que lee la teoría. Mismo patrón
 * intercambiable que los modelos de Eco: el proveedor de voz es una pieza reemplazable
 * por config, no cableada (OpenAI → ElevenLabs por upgrade).
 *
 * Lee la fila activa de `lxp.tts_config` (mig 0018) y la persiste bajo RLS de súper
 * admin (`guardarTtsConfig` · `../_acciones.ts`). El motor de síntesis (apps/api) ya
 * consume esta config. El proveedor real NO se enciende aquí: es un enchufe de env
 * (TTS_PROVIDER=openai + OPENAI_API_KEY · §3); mientras tanto el motor usa el mock
 * (audio silencioso) y TODO el flujo funciona end-to-end igual.
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { AudioLines, ChevronLeft, Plug, Save } from 'lucide-react';
import { mono, softText, focusRing } from '@/components/tokens';
import { Select } from '@/components/ui/select';
import { guardarTtsConfig } from '../_acciones';
import {
  TTS_DEFECTO,
  VOCES_POR_PROVEEDOR,
  type TtsConfig,
  type TtsFormato,
  type TtsProveedor,
} from '../_contrato';

const claseInput =
  'w-full rounded-[9px] border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-secondary';
const claseSelect = `flex w-full items-center gap-2 rounded-[9px] border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none transition-colors hover:border-secondary ${focusRing}`;
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
  const [guardando, iniciarGuardado] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const voces = VOCES_POR_PROVEEDOR[proveedor];

  function cambiarProveedor(p: TtsProveedor) {
    setProveedor(p);
    setAviso(null);
    // Al cambiar de proveedor, la voz vigente puede no existir → cae a la primera.
    const disponibles = VOCES_POR_PROVEEDOR[p];
    if (!disponibles.some((v) => v.id === voz)) setVoz(disponibles[0]?.id ?? '');
  }

  function guardar() {
    setAviso(null);
    iniciarGuardado(async () => {
      const r = await guardarTtsConfig({
        id: config.id,
        proveedor,
        voz,
        modelo: modelo.trim() || null,
        formato,
        velocidad,
      });
      setAviso(
        r.ok
          ? { tipo: 'ok', texto: 'Configuración guardada. El motor usará esta voz en la próxima síntesis.' }
          : { tipo: 'error', texto: r.error },
      );
    });
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

      {/* El "enchufe" del proveedor real: un flag de entorno, no código (§3). */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-[18px] py-3.5">
        <span
          aria-hidden
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--info-foreground)]"
        >
          <Plug className="h-[17px] w-[17px]" strokeWidth={2} />
        </span>
        <p className="min-w-[280px] flex-1 text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
          <span className="font-bold">La tubería está lista.</span> Esta config se guarda y el motor la
          usa; hoy sintetiza con el <span className="font-semibold">mock</span> (audio silencioso). Para la
          voz real, el enchufe es solo de entorno: <code>TTS_PROVIDER=openai</code> + <code>OPENAI_API_KEY</code> en
          el <code>api</code>/<code>worker</code> (§3) — sin tocar código.
        </p>
      </div>

      <section className="mt-5 rounded-xl border border-border bg-card p-[18px] shadow-rest">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="tts-prov" className={claseLabel}>
              Proveedor
            </label>
            <Select
              id="tts-prov"
              aria-label="Proveedor"
              value={proveedor}
              onChange={(v) => cambiarProveedor(v as TtsProveedor)}
              className={claseSelect}
              options={PROVEEDORES.map((p) => ({ value: p.id, label: p.etiqueta }))}
            />
            <p className={`text-[11px] ${softText}`}>OpenAI para arrancar; ElevenLabs como upgrade.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="tts-voz" className={claseLabel}>
              Voz
            </label>
            <Select
              id="tts-voz"
              aria-label="Voz"
              value={voz}
              onChange={(v) => setVoz(v)}
              className={claseSelect}
              options={voces.map((v) => ({ value: v.id, label: v.etiqueta }))}
            />
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
            <Select
              id="tts-formato"
              aria-label="Formato de audio"
              value={formato}
              onChange={(v) => setFormato(v as TtsFormato)}
              className={claseSelect}
              options={FORMATOS.map((f) => ({ value: f, label: f.toUpperCase() }))}
            />
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
        {aviso ? (
          <p
            className={`text-[11.5px] font-semibold ${
              aviso.tipo === 'ok' ? 'text-secondary' : 'text-destructive'
            }`}
          >
            {aviso.texto}
          </p>
        ) : (
          <p className={`text-[11.5px] ${softText}`}>Solo el súper admin puede guardar esta configuración.</p>
        )}
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className={`ml-auto inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`}
        >
          <Save aria-hidden className="h-4 w-4" strokeWidth={2} />
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
