'use client';

/**
 * Calculadoras clínicas del alumno (§6). Tres calculadoras REALES de ejemplo con
 * cómputo 100% cliente (fórmulas estándar de ultrasonido) + el catálogo de las que
 * la escuela configure (lxp.calculadoras publicadas). Sin backend para las destacadas.
 */

import { useState } from 'react';
import { Baby, Calculator, Droplets, HeartPulse } from 'lucide-react';
import { card, kicker, mono } from '@/components/tokens';
import type { CalculadoraCatalogo } from '@/lib/campus/calculadoras-contrato';

/** Redondea a `dec` decimales devolviendo número (evita -0). */
function redondea(n: number, dec = 1): number {
  const f = 10 ** dec;
  return Math.round(n * f) / f + 0;
}

/** Convierte el input a número finito o null. */
function num(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fechaLarga(d: Date): string {
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/* ─────────────────────────── Piezas base ─────────────────────────── */

function Campo({
  etiqueta,
  unidad,
  valor,
  onChange,
  min = 0,
  step = '0.1',
  tipo = 'number',
}: {
  etiqueta: string;
  unidad?: string;
  valor: string;
  onChange: (v: string) => void;
  min?: number;
  step?: string;
  tipo?: 'number' | 'date';
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-semibold text-foreground-soft">{etiqueta}</span>
      <span className="flex h-11 items-center rounded-control border border-border bg-card px-3 focus-within:border-secondary">
        <input
          type={tipo}
          inputMode={tipo === 'number' ? 'decimal' : undefined}
          min={tipo === 'number' ? min : undefined}
          step={tipo === 'number' ? step : undefined}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-transparent text-[14px] outline-none ${mono}`}
        />
        {unidad && <span className="ml-2 shrink-0 text-[12px] text-muted-foreground">{unidad}</span>}
      </span>
    </label>
  );
}

function Resultado({
  valor,
  unidad,
  nota,
  tono = 'primary',
}: {
  valor: string;
  unidad?: string;
  nota?: string;
  tono?: 'primary' | 'warning' | 'info';
}) {
  const fondo =
    tono === 'warning'
      ? 'border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]'
      : tono === 'info'
        ? 'border-[color:var(--info-border)] bg-[color:var(--info-surface)]'
        : 'border-border bg-accent';
  return (
    <div className={`mt-4 rounded-xl border px-4 py-3.5 ${fondo}`}>
      <p className="flex items-baseline gap-1.5">
        <span className={`${mono} text-[26px] font-extrabold leading-none text-foreground`}>{valor}</span>
        {unidad && <span className="text-[13px] font-semibold text-foreground-soft">{unidad}</span>}
      </p>
      {nota && <p className="mt-1.5 text-[12.5px] leading-relaxed text-foreground-soft">{nota}</p>}
    </div>
  );
}

function TarjetaCalc({
  titulo,
  descripcion,
  icono: Icono,
  children,
}: {
  titulo: string;
  descripcion: string;
  icono: typeof Droplets;
  children: React.ReactNode;
}) {
  return (
    <section className={`${card} p-5`}>
      <div className="flex items-start gap-3">
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-accent text-accent-foreground">
          <Icono className="h-[21px] w-[21px]" strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="text-[15.5px] font-bold leading-tight">{titulo}</h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{descripcion}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/* ───────────────────── 1 · Volumen vesical (elipsoide) ───────────────────── */

function VolumenVesical() {
  const [l, setL] = useState('');
  const [an, setAn] = useState('');
  const [al, setAl] = useState('');
  const L = num(l), A = num(an), H = num(al);
  const ok = L !== null && A !== null && H !== null && L > 0 && A > 0 && H > 0;
  const vol = ok ? redondea(0.52 * L! * A! * H!, 1) : null;
  const nota =
    vol === null
      ? undefined
      : vol > 100
        ? 'Residuo postmiccional elevado (>100 mL): sugiere retención significativa.'
        : vol > 50
          ? 'Residuo postmiccional en rango límite (50–100 mL).'
          : 'Dentro de un residuo postmiccional normal (<50 mL).';
  return (
    <TarjetaCalc
      titulo="Volumen vesical"
      descripcion="Elipsoide: V = 0.52 × largo × ancho × alto"
      icono={Droplets}
    >
      <div className="grid grid-cols-3 gap-2">
        <Campo etiqueta="Largo" unidad="cm" valor={l} onChange={setL} />
        <Campo etiqueta="Ancho" unidad="cm" valor={an} onChange={setAn} />
        <Campo etiqueta="Alto" unidad="cm" valor={al} onChange={setAl} />
      </div>
      {vol !== null ? (
        <Resultado valor={String(vol)} unidad="mL" nota={nota} tono={vol > 100 ? 'warning' : 'primary'} />
      ) : (
        <p className="mt-4 text-[12.5px] text-muted-foreground">Ingresa las tres medidas en cm.</p>
      )}
    </TarjetaCalc>
  );
}

/* ───────────────────── 2 · FEVI por Teichholz ───────────────────── */

/** Volumen VI (mL) por Teichholz a partir del diámetro D (cm): 7·D³/(2.4+D). */
function volTeichholz(d: number): number {
  return (7 * d ** 3) / (2.4 + d);
}

function FraccionEyeccion() {
  const [dd, setDd] = useState('');
  const [ds, setDs] = useState('');
  const D = num(dd), S = num(ds);
  const ok = D !== null && S !== null && D > 0 && S > 0 && S < D;
  let fevi: number | null = null;
  let edv = 0;
  let esv = 0;
  if (ok) {
    edv = volTeichholz(D!);
    esv = volTeichholz(S!);
    fevi = redondea(((edv - esv) / edv) * 100, 0);
  }
  const banda =
    fevi === null
      ? undefined
      : fevi >= 50
        ? { txt: 'Función sistólica normal (≥50%).', tono: 'primary' as const }
        : fevi >= 40
          ? { txt: 'Ligeramente reducida (40–49%).', tono: 'info' as const }
          : fevi >= 30
            ? { txt: 'Reducida (30–39%).', tono: 'warning' as const }
            : { txt: 'Severamente reducida (<30%).', tono: 'warning' as const };
  return (
    <TarjetaCalc
      titulo="FEVI (Teichholz)"
      descripcion="Fracción de eyección del VI desde diámetros en modo M / 2D"
      icono={HeartPulse}
    >
      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta="DVI diástole (DVITD)" unidad="cm" valor={dd} onChange={setDd} />
        <Campo etiqueta="DVI sístole (DVITS)" unidad="cm" valor={ds} onChange={setDs} />
      </div>
      {fevi !== null && banda ? (
        <Resultado
          valor={String(fevi)}
          unidad="%"
          nota={`${banda.txt} · VDF ${redondea(edv, 0)} mL · VSF ${redondea(esv, 0)} mL.`}
          tono={banda.tono}
        />
      ) : (
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          {D !== null && S !== null && S >= D
            ? 'El diámetro sistólico debe ser menor al diastólico.'
            : 'Ingresa ambos diámetros en cm.'}
        </p>
      )}
    </TarjetaCalc>
  );
}

/* ───────────────────── 3 · Edad gestacional por LCC ───────────────────── */

function EdadGestacional() {
  const [crl, setCrl] = useState('');
  const [fecha, setFecha] = useState('');
  const C = num(crl);
  const ok = C !== null && C >= 2 && C <= 95;
  // Robinson-Fleming (1975): días = 8.052·√LCC(mm) + 23.73.
  const dias = ok ? 8.052 * Math.sqrt(C!) + 23.73 : null;
  const semanas = dias !== null ? Math.floor(dias / 7) : null;
  const restoDias = dias !== null ? Math.round(dias - semanas! * 7) : null;
  let fpp: string | null = null;
  if (dias !== null && fecha) {
    const base = new Date(fecha + 'T00:00:00');
    if (!Number.isNaN(base.getTime())) {
      const edd = new Date(base.getTime() + (280 - dias) * 86400000);
      fpp = fechaLarga(edd);
    }
  }
  return (
    <TarjetaCalc
      titulo="Edad gestacional (LCC)"
      descripcion="Robinson-Fleming: por longitud céfalo-caudal (embrión/feto ~6–14 sem)"
      icono={Baby}
    >
      <div className="grid grid-cols-2 gap-2">
        <Campo etiqueta="LCC" unidad="mm" valor={crl} onChange={setCrl} min={2} step="0.1" />
        <Campo etiqueta="Fecha del estudio" valor={fecha} onChange={setFecha} tipo="date" />
      </div>
      {semanas !== null ? (
        <Resultado
          valor={`${semanas}s ${restoDias}d`}
          nota={fpp ? `Fecha probable de parto: ${fpp}.` : 'Añade la fecha del estudio para estimar la FPP.'}
          tono="info"
        />
      ) : (
        <p className="mt-4 text-[12.5px] text-muted-foreground">
          {C !== null ? 'LCC fuera de rango válido (2–95 mm).' : 'Ingresa la LCC en mm.'}
        </p>
      )}
    </TarjetaCalc>
  );
}

/* ─────────────────────────── Pantalla ─────────────────────────── */

export function Calculadoras({ catalogo }: { catalogo: CalculadoraCatalogo[] }) {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <header>
        <p className={`${kicker} text-secondary`}>Mis herramientas</p>
        <h1 className="mt-1 text-[22px] font-bold leading-tight">Calculadoras clínicas</h1>
        <p className="mt-1 max-w-2xl text-[13.5px] text-muted-foreground">
          Fórmulas de uso frecuente en ultrasonido, listas para el punto de atención. El cálculo
          es orientativo y no sustituye el criterio clínico.
        </p>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <VolumenVesical />
        <FraccionEyeccion />
        <EdadGestacional />
      </div>

      {/* Catálogo configurado por la escuela */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <Calculator className="h-[18px] w-[18px] text-secondary" strokeWidth={1.75} />
          Más calculadoras
        </h2>
        {catalogo.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center text-[13px] text-muted-foreground">
            La escuela aún no ha publicado calculadoras adicionales. Cuando lo haga, aparecerán aquí.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalogo.map((c) => (
              <div key={c.clave} className={`${card} p-4`}>
                <p className="text-[14px] font-bold">{c.nombre}</p>
                {c.descripcion && <p className="mt-1 text-[12.5px] text-muted-foreground">{c.descripcion}</p>}
                <p className="mt-3 text-[11.5px] font-semibold text-muted-foreground">
                  Configurada por la escuela — disponible próximamente
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
