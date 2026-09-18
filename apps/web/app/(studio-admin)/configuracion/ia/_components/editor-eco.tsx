'use client';

/**
 * Studio · Configuración › IA / Eco — editor de `lxp.eco_config` (§7A).
 *
 * Es LO que hace a Eco configurable sin tocar código: aquí el súper admin edita el
 * system prompt, el user prompt (un TEMPLATE con variables {{…}} que el pipeline
 * interpola), los parámetros del LLM (temperatura, máx. tokens), el umbral de
 * confianza que separa «listos» de «requieren criterio» en la bandeja, y QUÉ MODELO
 * usa cada paso del pipeline (clasificador / juicio / excepción · model-agnóstico).
 *
 * Escribe bajo RLS (`eco_config_write` exige súper admin · §10) vía server action.
 * Eco propone, el humano decide (§7A): esto configura al copiloto, no asienta notas.
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { AlertCircle, AudioLines, ChevronLeft, ChevronRight, Check, Info, Loader2, Save } from 'lucide-react';
import { mono, softText, focusRing } from '@/components/tokens';
import type { EcoConfig, EcoModelos, PasoPipeline } from '../../_eco-contrato';
import { PASOS_PIPELINE } from '../../_eco-contrato';
import { guardarEcoConfig } from '../../_acciones';

const VARIABLES_TEMPLATE = ['{{verdad}}', '{{rubrica}}', '{{respuesta}}'];

const claseInput =
  'w-full rounded-[9px] border border-border bg-card px-3 py-2 text-[13px] text-foreground outline-none transition-colors focus:border-secondary placeholder:text-muted-foreground';
const claseArea = `${claseInput} min-h-[168px] resize-y font-mono leading-relaxed`;
const claseLabel = 'text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground';

export function EditorEco({ config }: { config: EcoConfig }) {
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt);
  const [userPromptTemplate, setUserPromptTemplate] = useState(config.userPromptTemplate);
  const [temperatura, setTemperatura] = useState(config.temperatura);
  const [maxTokens, setMaxTokens] = useState(config.maxTokens);
  const [umbral, setUmbral] = useState(config.umbralConfianza);
  const [modelos, setModelos] = useState<EcoModelos>(config.modelos);

  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  function setPaso(paso: PasoPipeline, campo: 'proveedor' | 'modelo', valor: string) {
    setModelos((m) => ({ ...m, [paso]: { ...m[paso], [campo]: valor } }));
    setResultado(null);
  }

  function guardar() {
    setResultado(null);
    iniciar(async () => {
      const r = await guardarEcoConfig({
        id: config.id,
        systemPrompt,
        userPromptTemplate,
        temperatura,
        maxTokens,
        umbralConfianza: umbral,
        modelos,
      });
      setResultado(
        r.ok
          ? { ok: true, msg: 'Configuración guardada. Eco la usará en su próxima corrida.' }
          : { ok: false, msg: r.error },
      );
    });
  }

  return (
    <div className="mx-auto w-full max-w-[980px] px-6 pb-24 pt-5">
      {/* migas + cabecera */}
      <Link
        href="/configuracion"
        className={`inline-flex items-center gap-1.5 rounded-[8px] text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground ${focusRing}`}
      >
        <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
        Configuración del sistema
      </Link>

      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">IA / Eco</h1>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Config activa <span className="font-semibold text-foreground">{config.nombre}</span>. Eco
            propone; el humano decide (§7A) — esto configura al copiloto, no asienta notas.
          </p>
        </div>
        <span
          className={`${mono} ml-auto inline-flex h-[22px] items-center rounded-full border border-border bg-muted px-2.5 text-[11px] font-bold text-muted-foreground`}
        >
          v{config.version}
        </span>
      </div>

      {/* ── Prompts ── */}
      <Seccion titulo="Prompts" nota="lo que Eco lee en cada evaluación">
        <div className="space-y-2">
          <label htmlFor="eco-system" className={claseLabel}>
            System prompt
          </label>
          <p className={`text-[11.5px] ${softText}`}>
            Define el rol y las reglas de Eco (que es copiloto, que devuelve solo JSON, tono
            formativo…). Es la instrucción de sistema del modelo de juicio.
          </p>
          <textarea
            id="eco-system"
            value={systemPrompt}
            onChange={(e) => {
              setSystemPrompt(e.target.value);
              setResultado(null);
            }}
            className={claseArea}
            spellCheck={false}
          />
        </div>

        <div className="mt-5 space-y-2">
          <label htmlFor="eco-user" className={claseLabel}>
            User prompt · template
          </label>
          <p className={`text-[11.5px] ${softText}`}>
            El pipeline interpola las variables en tiempo real. Disponibles hoy:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {VARIABLES_TEMPLATE.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setUserPromptTemplate((t) => `${t}${t.endsWith('\n') || !t ? '' : '\n'}${v}`);
                  setResultado(null);
                }}
                className={`${mono} inline-flex h-6 items-center rounded-full border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-2.5 text-[11px] font-bold text-[color:var(--info-foreground)] transition-colors hover:brightness-95 ${focusRing}`}
                title={`Insertar ${v}`}
              >
                {v}
              </button>
            ))}
          </div>
          <textarea
            id="eco-user"
            value={userPromptTemplate}
            onChange={(e) => {
              setUserPromptTemplate(e.target.value);
              setResultado(null);
            }}
            className={claseArea}
            spellCheck={false}
          />
        </div>
      </Seccion>

      {/* ── Parámetros ── */}
      <Seccion titulo="Parámetros del modelo" nota="temperatura, tope de tokens y confianza">
        <div className="grid gap-5 sm:grid-cols-3">
          <Campo
            id="eco-temp"
            etiqueta="Temperatura"
            ayuda="0 = determinista; ↑ = más variación. Para evaluar, conviene bajo."
          >
            <input
              id="eco-temp"
              type="number"
              min={0}
              max={2}
              step={0.05}
              value={temperatura}
              onChange={(e) => {
                setTemperatura(Number(e.target.value));
                setResultado(null);
              }}
              className={`${claseInput} ${mono}`}
            />
          </Campo>

          <Campo id="eco-max" etiqueta="Máx. tokens" ayuda="Tope de la respuesta del modelo.">
            <input
              id="eco-max"
              type="number"
              min={1}
              max={8192}
              step={1}
              value={maxTokens}
              onChange={(e) => {
                setMaxTokens(Number(e.target.value));
                setResultado(null);
              }}
              className={`${claseInput} ${mono}`}
            />
          </Campo>

          <Campo
            id="eco-umbral"
            etiqueta="Umbral de confianza"
            ayuda="Separa «listos para confirmar» de «requieren tu criterio» en la bandeja."
          >
            <div className="flex items-center gap-3">
              <input
                id="eco-umbral"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={umbral}
                onChange={(e) => {
                  setUmbral(Number(e.target.value));
                  setResultado(null);
                }}
                className="h-1.5 flex-1 cursor-pointer accent-[color:var(--primary)]"
              />
              <span className={`${mono} w-10 shrink-0 text-right text-[13px] font-bold`}>
                {Math.round(umbral * 100)}%
              </span>
            </div>
          </Campo>
        </div>
      </Seccion>

      {/* ── Modelos por paso ── */}
      <Seccion
        titulo="Modelo por paso del pipeline"
        nota="tools-first; el LLM solo donde hay lenguaje o juicio (§7A)"
      >
        <div className="flex flex-col gap-3.5">
          {PASOS_PIPELINE.map((p) => (
            <div
              key={p.clave}
              className="rounded-xl border border-border bg-muted/40 p-4"
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[13.5px] font-bold">{p.titulo}</span>
                <span className={`text-[11.5px] ${softText}`}>{p.descripcion}</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor={`prov-${p.clave}`} className={claseLabel}>
                    Proveedor
                  </label>
                  <input
                    id={`prov-${p.clave}`}
                    type="text"
                    value={modelos[p.clave].proveedor}
                    onChange={(e) => setPaso(p.clave, 'proveedor', e.target.value)}
                    placeholder="anthropic"
                    className={claseInput}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor={`mod-${p.clave}`} className={claseLabel}>
                    Modelo
                  </label>
                  <input
                    id={`mod-${p.clave}`}
                    type="text"
                    value={modelos[p.clave].modelo}
                    onChange={(e) => setPaso(p.clave, 'modelo', e.target.value)}
                    placeholder="claude-sonnet-4-6"
                    className={`${claseInput} ${mono}`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className={`mt-3 flex items-start gap-2 text-[11.5px] ${softText}`}>
          <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          Model-agnóstico: cambiar de proveedor u open-source self-hosted es editar estos campos, sin
          reescribir lógica. El pipeline arranca con tools (SQL/RAG) y usa el modelo mínimo necesario.
        </p>
      </Seccion>

      {/* ── Narración TTS (misma familia intercambiable; UI aparte) ── */}
      <Seccion titulo="Narración TTS" nota="la voz que lee la teoría — proveedor intercambiable por config">
        <Link
          href="/configuracion/tts"
          className={`flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4 transition-colors hover:border-primary ${focusRing}`}
        >
          <span
            aria-hidden
            className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
          >
            <AudioLines className="h-[19px] w-[19px]" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-bold">Configurar proveedor y voz</span>
            <span className={`mt-0.5 block text-[11.5px] ${softText}`}>
              Mismo patrón que los modelos: OpenAI para arrancar, ElevenLabs como upgrade, por config.
            </span>
          </span>
          <ChevronRight aria-hidden className="h-[17px] w-[17px] shrink-0 text-[color:var(--track)]" strokeWidth={2} />
        </Link>
      </Seccion>

      {/* ── Barra de guardado (fija abajo) ── */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[980px] items-center gap-3 px-6 py-3">
          {resultado && (
            <span
              className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold ${
                resultado.ok
                  ? 'text-[color:var(--secondary)]'
                  : 'text-[color:var(--destructive-foreground)]'
              }`}
            >
              {resultado.ok ? (
                <Check aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              ) : (
                <AlertCircle aria-hidden className="h-4 w-4" strokeWidth={2.2} />
              )}
              {resultado.msg}
            </span>
          )}
          <button
            type="button"
            onClick={guardar}
            disabled={pendiente}
            className={`ml-auto inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary disabled:opacity-60 ${focusRing}`}
          >
            {pendiente ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" strokeWidth={2.2} />
            ) : (
              <Save aria-hidden className="h-4 w-4" strokeWidth={2} />
            )}
            Guardar configuración
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Piezas de layout ───────────────────────── */

function Seccion({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-[18px] shadow-rest">
      <div className="flex flex-wrap items-baseline gap-2 border-b border-border pb-3">
        <h2 className="text-[14.5px] font-bold">{titulo}</h2>
        <span className="text-[11.5px] text-muted-foreground">{nota}</span>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function Campo({
  id,
  etiqueta,
  ayuda,
  children,
}: {
  id: string;
  etiqueta: string;
  ayuda: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={claseLabel}>
        {etiqueta}
      </label>
      {children}
      <p className={`text-[11px] ${softText}`}>{ayuda}</p>
    </div>
  );
}
