'use client';

/**
 * Certificados y badges del alumno (§6/§8). Logros (certificados + badges otorgados),
 * en-progreso (escalera de hitos + badges por lograr) y verificación de folio. Datos
 * reales por RLS (solo lectura); la emisión la hace el worker (certificados-contrato).
 */

import { useState, useTransition } from 'react';
import {
  Award,
  BadgeCheck,
  CheckCircle2,
  Download,
  Loader2,
  Lock,
  Medal,
  Search,
  ShieldCheck,
  Trophy,
  XCircle,
} from 'lucide-react';
import { card, kicker, mono } from '@/components/tokens';
import { Badge } from '@/components/ui/badge';
import { fechaCorta } from '@/lib/format';
import { verificarFolio } from '@/lib/campus/certificados-acciones';
import type {
  ReconocimientoData,
  VerificacionFolio,
} from '@/lib/campus/certificados-contrato';

export function Reconocimiento({ data }: { data: ReconocimientoData }) {
  const logrados = data.badges.filter((b) => b.otorgado);
  const porLograr = data.badges.filter((b) => !b.otorgado);
  const meta = data.siguienteHito;
  const pct = meta ? Math.min(100, Math.round((100 * data.horasAcreditadas) / meta.umbral)) : 100;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <header>
        <p className={`${kicker} text-secondary`}>Mi progreso</p>
        <h1 className="mt-1 text-[22px] font-bold leading-tight">Certificados y logros</h1>
        <p className="mt-1 max-w-2xl text-[13.5px] text-muted-foreground">
          Tu reconocimiento se construye con horas de práctica validadas. Cada hito abre un
          certificado y desbloquea insignias.
        </p>
      </header>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        {/* ══ Avance hacia el siguiente hito ══ */}
        <section className={`${card} p-5`}>
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-secondary">
            <Trophy className="h-[16px] w-[16px]" strokeWidth={2} />
            Camino de horas
          </div>
          <p className="mt-3 flex items-baseline gap-2">
            <span className={`${mono} text-[30px] font-extrabold leading-none`}>{data.horasAcreditadas}</span>
            <span className="text-[13px] font-semibold text-muted-foreground">horas acreditadas</span>
          </p>
          {meta ? (
            <>
              <div className="mt-4 flex items-center justify-between text-[11.5px] font-semibold">
                <span className="text-muted-foreground">Hacia {meta.etiqueta}</span>
                <span className={mono}>{data.horasAcreditadas} / {meta.umbral} h</span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-pill bg-[color:var(--track)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-pill bg-primary transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">
                Te faltan <span className={`${mono} font-bold text-foreground`}>{Math.max(0, meta.umbral - data.horasAcreditadas)}</span> horas para el próximo hito.
              </p>
            </>
          ) : (
            <p className="mt-4 rounded-[10px] bg-accent px-3.5 py-2.5 text-[13px] font-semibold text-accent-foreground">
              ¡Alcanzaste el hito máximo del programa!
            </p>
          )}

          {/* Escalera */}
          <ol className="mt-5 space-y-2">
            {data.hitos.map((h) => (
              <li
                key={h.umbral}
                className={`flex items-center gap-3 rounded-[10px] border px-3 py-2.5 ${
                  h.alcanzado ? 'border-border bg-accent/60' : 'border-dashed border-border bg-muted/40'
                }`}
              >
                <span aria-hidden className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${h.alcanzado ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}>
                  {h.alcanzado ? <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={2} /> : <Lock className="h-[15px] w-[15px]" strokeWidth={1.75} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-bold leading-tight">{h.etiqueta}</span>
                  <span className="block text-[11.5px] text-muted-foreground">
                    {h.alcanzado ? (h.alcanzadoEn ? `Alcanzado el ${fechaCorta(h.alcanzadoEn)}` : 'Alcanzado') : `${h.umbral} horas`}
                  </span>
                </span>
                <span className={`${mono} shrink-0 text-[13px] font-bold ${h.alcanzado ? 'text-secondary' : 'text-muted-foreground'}`}>
                  {h.umbral}h
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* ══ Verificación de folio ══ */}
        <VerificarFolio />
      </div>

      {/* ══ Certificados ══ */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <Award className="h-[18px] w-[18px] text-secondary" strokeWidth={1.75} />
          Mis certificados
        </h2>
        {data.certificados.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center">
            <p className="text-[14px] font-bold">Aún no tienes certificados</p>
            <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted-foreground">
              Se emiten automáticamente al alcanzar cada hito de horas validadas. Sigue subiendo casos a tu bitácora.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.certificados.map((c) => (
              <article key={c.id} className={`${card} overflow-hidden`}>
                <div className="h-1.5 w-full bg-primary" aria-hidden />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-[11px] bg-accent text-accent-foreground">
                      <Medal className="h-[22px] w-[22px]" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[14.5px] font-bold leading-snug">{c.titulo}</h3>
                      <p className="mt-0.5 text-[11.5px] text-muted-foreground">Emitido el {fechaCorta(c.emitidoEn)}</p>
                    </div>
                  </div>
                  <p className={`${mono} mt-3 rounded-[8px] bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-foreground-soft`}>
                    Folio: {c.folio}
                  </p>
                  {/* PENDIENTE DE API: servir el PDF (pdf_ref) con URL firmada del `api`
                      (object storage · §3). El worker emision-certificado lo genera (§8). */}
                  <span
                    title={c.tienePdf ? 'La descarga se habilita con la firma del portal (pendiente)' : undefined}
                    className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-control border border-border bg-muted text-[13px] font-semibold text-muted-foreground"
                  >
                    <Download className="h-[16px] w-[16px]" strokeWidth={1.75} />
                    {c.tienePdf ? 'Descargar PDF' : 'PDF en preparación'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ══ Badges ══ */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <BadgeCheck className="h-[18px] w-[18px] text-secondary" strokeWidth={1.75} />
          Insignias
        </h2>

        {data.badges.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border bg-card px-5 py-8 text-center text-[13px] text-muted-foreground">
            Aún no hay insignias configuradas.
          </p>
        ) : (
          <>
            {logrados.length > 0 && (
              <div className="mt-4">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Obtenidas</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {logrados.map((b) => (
                    <TarjetaBadge key={b.clave} badge={b} />
                  ))}
                </div>
              </div>
            )}
            {porLograr.length > 0 && (
              <div className="mt-6">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Por lograr</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {porLograr.map((b) => (
                    <TarjetaBadge key={b.clave} badge={b} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────── Badge ─────────────────────────── */

function TarjetaBadge({ badge }: { badge: ReconocimientoData['badges'][number] }) {
  return (
    <div className={`${card} flex flex-col items-center p-4 text-center ${badge.otorgado ? '' : 'opacity-70'}`}>
      <span
        aria-hidden
        className={`grid h-14 w-14 place-items-center rounded-full ${
          badge.otorgado ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}
      >
        {badge.otorgado ? <BadgeCheck className="h-7 w-7" strokeWidth={1.75} /> : <Lock className="h-6 w-6" strokeWidth={1.75} />}
      </span>
      <p className="mt-2.5 text-[13.5px] font-bold leading-tight">{badge.nombre}</p>
      {badge.descripcion && <p className="mt-1 text-[11.5px] text-muted-foreground">{badge.descripcion}</p>}
      {badge.otorgado && (
        <Badge variant="accent" size="sm" className="mt-2.5">
          {badge.otorgadoEn ? `Obtenida el ${fechaCorta(badge.otorgadoEn)}` : 'Obtenida'}
        </Badge>
      )}
    </div>
  );
}

/* ─────────────────────── Verificación de folio ─────────────────────── */

function VerificarFolio() {
  const [folio, setFolio] = useState('');
  const [res, setRes] = useState<VerificacionFolio | null>(null);
  const [verificando, iniciar] = useTransition();

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    iniciar(async () => setRes(await verificarFolio(folio)));
  };

  return (
    <section className={`${card} flex flex-col p-5`}>
      <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-secondary">
        <ShieldCheck className="h-[16px] w-[16px]" strokeWidth={2} />
        Verificar un folio
      </div>
      <p className="mt-2 text-[12.5px] text-muted-foreground">
        Confirma la autenticidad de un certificado ingresando su folio.
      </p>
      <form onSubmit={enviar} className="mt-3 flex gap-2">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-control border border-border bg-card px-3 focus-within:border-secondary">
          <Search className="h-[17px] w-[17px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Folio del certificado</span>
          <input
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            placeholder="Ej. MC-2026-000123"
            className={`w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground ${mono}`}
          />
        </label>
        <button
          type="submit"
          disabled={verificando}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-control bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {verificando ? <Loader2 className="h-[17px] w-[17px] animate-spin" strokeWidth={2} /> : 'Verificar'}
        </button>
      </form>

      {res && res.estado === 'valido' && (
        <div className="mt-3 flex items-start gap-2.5 rounded-[10px] border border-border bg-accent px-3.5 py-3">
          <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-secondary" strokeWidth={2} />
          <div>
            <p className="text-[13px] font-bold text-accent-foreground">Certificado válido</p>
            <p className="mt-0.5 text-[12px] text-foreground-soft">
              {res.titulo} · folio <span className={mono}>{res.folio}</span> · {fechaCorta(new Date(res.emitidoEn))}
            </p>
          </div>
        </div>
      )}
      {res && res.estado === 'no_encontrado' && (
        <div className="mt-3 flex items-start gap-2.5 rounded-[10px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3">
          <XCircle className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[color:var(--warning-foreground)]" strokeWidth={2} />
          <div>
            <p className="text-[13px] font-bold text-[color:var(--warning-foreground)]">Folio no encontrado</p>
            <p className="mt-0.5 text-[12px] text-[color:var(--warning-foreground)]">
              No corresponde a un certificado tuyo. La verificación pública de folios ajenos se hará desde el portal.
            </p>
          </div>
        </div>
      )}
      {res && res.estado === 'vacio' && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">Ingresa un folio para verificar.</p>
      )}
    </section>
  );
}
