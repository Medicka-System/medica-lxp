'use client';

/**
 * Mi Bitácora — expediente de práctica del alumno (§6 · corazón del producto).
 * Datos reales por RLS (lxp.bitacora_casos); el "cómo voy" manda (horas acreditadas
 * de la proyección de competencia + desglose I-AIM/módulo), luego los casos con su
 * estado de validación. "Subir caso" es una HOJA CORTA que hereda el MÓDULO (y sus
 * horas); el alumno aporta órgano, dominio, hallazgos y diagnóstico.
 *
 * Referencia visual: campus-lxp-mocks/alumno/bitacora. El visor DICOM es placeholder
 * (Sprint 4.7) y la validación/horas acreditadas son dominio (ver bitacora-contrato).
 */

import { useMemo, useState, useTransition } from 'react';
import {
  Check,
  ChevronDown,
  NotebookText,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing } from '@/components/tokens';
import { fechaCorta } from '@/lib/format';
import { VisorDicomPlaceholder } from '../../_components/visor-dicom';
import { subirCaso } from '@/lib/campus/acciones-bitacora';
import {
  DOMINIOS,
  DOMINIO_LABEL,
  ETIQUETA_ESTADO,
  type BitacoraData,
  type CasoBitacora,
  type DominioIaim,
  type EstadoCaso,
  type ModuloOpcion,
} from '@/lib/campus/bitacora-contrato';

const claseEstado: Record<EstadoCaso, string> = {
  pendiente:
    'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  aprobado: 'bg-accent text-accent-foreground',
  rechazado:
    'border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]',
};

/* ─────────────────── Hoja corta de subida ─────────────────── */

function SheetSubirCaso({
  modulos,
  onCerrar,
}: {
  modulos: ModuloOpcion[];
  onCerrar: () => void;
}) {
  const [moduloId, setModuloId] = useState(modulos[0]?.id ?? '');
  const [organo, setOrgano] = useState('');
  const [dominio, setDominio] = useState<DominioIaim | ''>('');
  const [hallazgos, setHallazgos] = useState('');
  const [presuntivo, setPresuntivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();

  const modulo = modulos.find((m) => m.id === moduloId) ?? null;

  const enviar = () => {
    setError(null);
    iniciar(async () => {
      const r = await subirCaso({
        moduloId,
        organo,
        dominio: dominio || null,
        hallazgos,
        presuntivo,
      });
      if (r.ok) onCerrar();
      else setError(r.error);
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Subir caso"
      className="fixed inset-0 z-50 grid place-items-end p-0 sm:place-items-center sm:p-10"
      style={{ background: 'rgba(15,45,82,.42)' }}
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <p className="text-[18px] font-extrabold tracking-[-0.015em]">Subir caso</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              El módulo aporta las horas; usted añade lo mínimo
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className={`ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
          >
            <X aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-6 sm:max-h-[560px]">
          {modulos.length === 0 ? (
            <p className="rounded-[12px] bg-muted p-4 text-[13px] text-muted-foreground">
              No hay módulos publicados todavía. Pídele a tu docente que publique el programa.
            </p>
          ) : (
            <label className="block">
              <span className="block text-[11.5px] font-semibold">Módulo del caso</span>
              <span className="mt-[7px] flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 focus-within:border-secondary">
                <select
                  value={moduloId}
                  onChange={(e) => setModuloId(e.target.value)}
                  className="w-full appearance-none bg-transparent text-[14px] font-medium text-foreground outline-none"
                >
                  {modulos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} · {m.programa}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              </span>
            </label>
          )}

          {modulo && (
            <div className="mt-3.5 flex items-start gap-3 rounded-[12px] bg-accent p-4">
              <span
                aria-hidden
                className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-[color:var(--sidebar)]"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-bold leading-snug">{modulo.nombre}</p>
                <p className={`mt-1 text-[12.5px] leading-relaxed ${softText}`}>
                  Se cuelga de este módulo de {modulo.programa}. Las horas que acredite las
                  confirma su docente al validarlo.
                </p>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="block text-[11.5px] font-semibold">Órgano / región</span>
              <input
                type="text"
                value={organo}
                onChange={(e) => setOrgano(e.target.value)}
                placeholder="Riñón, vesícula, útero…"
                className="mt-[7px] h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
              />
            </label>
            <label className="block">
              <span className="block text-[11.5px] font-semibold">Dominio I-AIM</span>
              <span className="mt-[7px] flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 focus-within:border-secondary">
                <select
                  value={dominio}
                  onChange={(e) => setDominio(e.target.value as DominioIaim | '')}
                  className="w-full appearance-none bg-transparent text-[14px] font-medium text-foreground outline-none"
                >
                  <option value="">Sin especificar</option>
                  {DOMINIOS.map((d) => (
                    <option key={d} value={d}>
                      {DOMINIO_LABEL[d]}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
              </span>
            </label>
          </div>

          <div className="mt-5">
            <span className="block text-[11.5px] font-semibold">Imágenes o cine-loop</span>
            <div className="mt-3.5 rounded-[12px] border-[1.5px] border-dashed border-[color:var(--track)] bg-muted p-6 text-center">
              <span
                aria-hidden
                className="mx-auto grid h-[46px] w-[46px] place-items-center rounded-full bg-card text-secondary"
              >
                <Upload className="h-[22px] w-[22px]" strokeWidth={1.75} />
              </span>
              <p className="mt-3 text-[14px] font-bold">La subida del estudio llega pronto</p>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                El visor y la carga DICOM se anonimizan al subirse (pipeline · Sprint 4.7). Por
                ahora, registre el caso con sus hallazgos.
              </p>
              <button
                type="button"
                disabled
                className="mt-3.5 h-11 cursor-not-allowed rounded-full border border-border bg-card px-5 text-[13.5px] font-semibold text-muted-foreground opacity-70"
              >
                Elegir archivos
              </button>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="block text-[11.5px] font-semibold">Hallazgos</span>
            <textarea
              rows={4}
              value={hallazgos}
              onChange={(e) => setHallazgos(e.target.value)}
              placeholder="Describa lo que vio: medidas, planos y lo que le hizo dudar."
              className="mt-[7px] w-full resize-y rounded-[10px] border border-border bg-card px-3.5 py-3 text-[14px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
            />
          </label>

          <label className="mt-4 block">
            <span className="block text-[11.5px] font-semibold">
              Diagnóstico presuntivo{' '}
              <span className="font-medium text-muted-foreground">· opcional</span>
            </span>
            <input
              type="text"
              value={presuntivo}
              onChange={(e) => setPresuntivo(e.target.value)}
              placeholder="Su impresión, aunque no esté seguro"
              className="mt-[7px] h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-secondary"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-medium text-[color:var(--destructive-foreground)]"
            >
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-border bg-muted px-6 py-4">
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-muted-foreground">
            Se acredita cuando su docente lo valide.
          </p>
          <button
            type="button"
            onClick={onCerrar}
            className={`h-11 shrink-0 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={enviando || modulos.length === 0}
            className={`h-12 shrink-0 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
          >
            {enviando ? 'Subiendo…' : 'Subir caso'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── Tarjeta de caso ─────────────────── */

function TarjetaCaso({ c }: { c: CasoBitacora }) {
  return (
    <li
      className={`overflow-hidden rounded-xl border bg-card shadow-rest transition-colors hover:border-primary ${
        c.estado === 'rechazado' ? 'border-[color:var(--destructive-border)]' : 'border-border'
      }`}
    >
      <VisorDicomPlaceholder
        etiqueta={c.organo ?? (c.estudioEstado ? 'estudio DICOM pendiente' : 'sin estudio')}
        alto={156}
        loop={c.cineLoop}
        piezas={c.piezas}
      />
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${claseEstado[c.estado]}`}
          >
            {ETIQUETA_ESTADO[c.estado]}
          </span>
          <span className={`${mono} ml-auto text-[11.5px] text-muted-foreground`}>
            {fechaCorta(c.fecha)}
          </span>
        </div>
        <h3 className="mt-3 text-[15px] font-bold leading-snug" style={{ textWrap: 'pretty' }}>
          {c.hallazgoCorto}
        </h3>
        <p className={`mt-2 text-[12.5px] leading-snug ${softText}`}>
          {[c.modulo, c.organo].filter(Boolean).join(' · ') || 'Sin catalogar'}
        </p>
        {c.dominio && (
          <p className={`${mono} mt-1.5 text-[11.5px] text-muted-foreground`}>
            I-AIM · {DOMINIO_LABEL[c.dominio]}
          </p>
        )}
        {c.estado === 'rechazado' && c.feedback && (
          <p className="mt-3 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3 py-2 text-[12px] leading-relaxed text-[color:var(--destructive-foreground)]">
            {c.feedback}
          </p>
        )}
      </div>
    </li>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export function MiBitacora({ data }: { data: BitacoraData }) {
  const { horas, casos, porDominio, porModulo, modulos, items } = data;

  const [estado, setEstado] = useState<'todos' | EstadoCaso>('todos');
  const [modulo, setModulo] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [sheet, setSheet] = useState(false);

  const pct = horas.meta > 0 ? Math.round((horas.acreditadas / horas.meta) * 1000) / 10 : 0;
  const nombresModulo = useMemo(
    () => [...new Set(items.map((c) => c.modulo).filter((m): m is string => !!m))],
    [items],
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return items.filter((c) => {
      if (estado !== 'todos' && c.estado !== estado) return false;
      if (modulo !== 'Todos' && c.modulo !== modulo) return false;
      if (!q) return true;
      return [c.hallazgoCorto, c.modulo, c.organo, c.dominio ? DOMINIO_LABEL[c.dominio] : '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [items, estado, modulo, busqueda]);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* ───── Cabecera ───── */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Mi bitácora</h1>
          <p className={`mt-1 text-[13px] ${softText}`}>
            Los casos reales que ha realizado. Su docente los valida y suman horas al diplomado.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSheet(true)}
          className={`ml-auto inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
          Subir caso
        </button>
      </div>

      {/* ───── Avance: el "cómo voy" manda ───── */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.5fr_1fr_1fr]">
        <section
          className="relative overflow-hidden rounded-2xl p-7"
          style={{ background: 'var(--secondary)' }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 150% at 88% 0%, rgba(83,195,190,.55) 0%, rgba(26,136,128,0) 62%)',
            }}
          />
          <svg
            aria-hidden
            viewBox="0 0 600 120"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full"
          >
            <path d="M0 62c96-34 168 26 264 10s168-52 336-16v64H0z" fill="rgba(255,255,255,.08)" />
            <path d="M0 84c120-28 192 18 300 6s180-38 300-12v42H0z" fill="rgba(255,255,255,.10)" />
          </svg>
          <div className="relative">
            <p className={kicker} style={{ color: 'var(--hero-ink-soft)' }}>
              Avance del diplomado
            </p>
            <div className="mt-3.5 flex items-end gap-2.5">
              <span
                className={`${mono} text-[46px] font-extrabold leading-none tracking-[-0.03em]`}
                style={{ color: 'var(--hero-ink)' }}
              >
                {horas.acreditadas}
              </span>
              <span
                className={`${mono} pb-1.5 text-[15px] font-semibold`}
                style={{ color: 'var(--hero-ink-soft)' }}
              >
                / {horas.meta} h acreditadas
              </span>
            </div>
            <div
              className="mt-5 h-2.5 overflow-hidden rounded-full"
              style={{ background: 'rgba(255,255,255,.22)' }}
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Horas acreditadas del diplomado"
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: 'var(--hero-ink)' }}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="text-[13.5px]" style={{ color: 'var(--hero-ink-soft)' }}>
                Le faltan{' '}
                <span className={`${mono} font-bold`} style={{ color: 'var(--hero-ink)' }}>
                  {Math.max(0, horas.meta - horas.acreditadas)} h
                </span>{' '}
                para la meta
              </span>
              <span
                className={`${mono} ml-auto text-[12.5px]`}
                style={{ color: 'var(--hero-ink-soft)' }}
              >
                {casos.total} casos subidos · {casos.aprobados} acreditados
              </span>
            </div>
          </div>
        </section>

        <section className={`${card} p-5`}>
          <p className={`${kicker} text-muted-foreground`}>Casos por dominio I-AIM</p>
          {porDominio.length === 0 ? (
            <p className="mt-4 text-[12.5px] text-muted-foreground">
              Aún sin casos catalogados por dominio.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3.5">
              {porDominio.map((d) => (
                <li key={d.dominio}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold">{DOMINIO_LABEL[d.dominio]}</span>
                    <span
                      className={`${mono} ml-auto text-[12px] font-bold ${
                        d.enRepaso ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'
                      }`}
                    >
                      {d.casos} {d.casos === 1 ? 'caso' : 'casos'}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--track)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${d.pct}%`,
                        background: d.enRepaso ? 'var(--warning)' : 'var(--primary)',
                      }}
                    />
                  </div>
                  {d.enRepaso && (
                    <p className="mt-1 text-[11.5px] text-[color:var(--warning-foreground)]">
                      Su docente sugiere más práctica aquí
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={`${card} p-5`}>
          <p className={`${kicker} text-muted-foreground`}>Por módulo</p>
          {porModulo.length === 0 ? (
            <p className="mt-3.5 text-[12.5px] text-muted-foreground">Aún sin casos por módulo.</p>
          ) : (
            <ul className="mt-3.5 flex flex-col">
              {porModulo.map((m) => (
                <li key={m.modulo} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug">
                    {m.modulo}
                  </span>
                  <span className={`${mono} text-[13px] font-bold text-secondary`}>{m.casos}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* ───── Filtros por estado de validación ───── */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div
          role="tablist"
          aria-label="Estado de validación"
          className="flex gap-1.5 rounded-full border border-border bg-card p-1"
        >
          {(
            [
              ['todos', 'Todos', casos.total],
              ['pendiente', 'En revisión', casos.pendientes],
              ['aprobado', 'Acreditados', casos.aprobados],
              ['rechazado', 'Requieren cambios', casos.rechazados],
            ] as const
          ).map(([id, etiqueta, n]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={estado === id}
              onClick={() => setEstado(id)}
              className={`inline-flex h-10 items-center gap-[7px] whitespace-nowrap rounded-full px-4 text-[13px] font-semibold transition-colors ${focusRing} ${
                estado === id
                  ? 'bg-sidebar text-sidebar-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} ${estado === id ? 'opacity-70' : 'text-muted-foreground'}`}>
                {n}
              </span>
            </button>
          ))}
        </div>

        {nombresModulo.length > 0 && (
          <label className="flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5">
            <span className="text-[12.5px] text-muted-foreground">Módulo</span>
            <select
              value={modulo}
              onChange={(e) => setModulo(e.target.value)}
              className="appearance-none bg-transparent text-[13.5px] font-semibold text-foreground outline-none"
            >
              <option value="Todos">Todos</option>
              {nombresModulo.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
          </label>
        )}

        <label className="ml-auto flex h-12 min-w-[260px] items-center gap-2.5 rounded-full border border-border bg-card px-5 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-[17px] w-[17px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar en mis hallazgos</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar en mis hallazgos…"
            className="w-full bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {/* ───── Casos ───── */}
      {visibles.length === 0 ? (
        <div className={`${card} mt-5 px-10 py-16 text-center`}>
          <span
            aria-hidden
            className="mx-auto grid h-[68px] w-[68px] place-items-center rounded-full bg-accent text-accent-foreground"
          >
            <NotebookText className="h-8 w-8" strokeWidth={1.6} />
          </span>
          <h2 className="mt-5 text-[22px] font-bold leading-snug">
            {items.length === 0
              ? 'Su bitácora empieza con el primer caso'
              : 'Ningún caso con ese estado'}
          </h2>
          <p className={`mx-auto mt-2.5 max-w-[54ch] text-[14.5px] leading-relaxed ${softText}`}>
            Registre un estudio que ya hizo y escriba sus hallazgos. Su docente lo revisa y, al
            acreditarlo, suma horas al diplomado.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setSheet(true)}
              className={`inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
              Subir mi primer caso
            </button>
          </div>
          <p className="mx-auto mt-6 max-w-[48ch] text-[12.5px] leading-relaxed text-muted-foreground">
            Nunca suba nombres, folios ni fechas de nacimiento: la bitácora es privada y los casos
            van anonimizados.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibles.map((c) => (
              <TarjetaCaso key={c.id} c={c} />
            ))}
          </ul>
          <p className={`${mono} mt-6 text-center text-[12px] text-muted-foreground`}>
            {visibles.length} de {casos.total}
          </p>
        </>
      )}

      {/* móvil: subir siempre a mano */}
      <button
        type="button"
        onClick={() => setSheet(true)}
        className={`fixed bottom-24 right-4 z-20 inline-flex h-[52px] items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] shadow-lg lg:hidden ${focusRing}`}
      >
        <Plus aria-hidden className="h-[18px] w-[18px]" strokeWidth={2.2} />
        Subir caso
      </button>

      {sheet && <SheetSubirCaso modulos={modulos} onCerrar={() => setSheet(false)} />}
    </div>
  );
}
