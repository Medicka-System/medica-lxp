'use client';

/**
 * Detalle de un grupo (seguimiento · §5B). Fiel al mock: KPIs + tabla de alumnos con
 * la SEÑAL DE INTERVENCIÓN en palabras, filtros (Requieren atención por defecto),
 * franja "N de M necesitan intervención" + acción en LOTE, y selección múltiple para
 * mandar consulta a varios. Panel de Eco (placeholder) a la derecha.
 *
 * Límites de rol visibles: el docente NO configura el grupo (candado) y lo administrativo
 * (inscripción/calificaciones oficiales) se consulta en CORA (deep-link), no se edita aquí.
 * Datos REALES del roster de CORA + avance/casos/señales bajo RLS. Un solo color de
 * atención: ÁMBAR. El violeta es Eco (§5A).
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Lock,
  MessageCircle,
  NotebookText,
  ScanLine,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { mono, kicker, softText, card, focusRing } from '@/lib/studio/estilos';
import { fechaCorta } from '@/lib/format';
import { Avatar } from '@/components/avatar';
import type { GrupoDetalleSeguimiento } from '../_lib/contrato';
import { PanelEco } from './panel-eco';

type FiltroAlumnos = 'atencion' | 'todos' | 'sin-actividad' | 'al-dia';

/** Deep-link a CORA (inscripción/calificaciones oficiales). Placeholder hasta el Sprint 11. */
const CORA_URL = process.env.NEXT_PUBLIC_CORA_URL ?? '';

export function DetalleGrupo({
  grupo,
  resumenEco,
}: {
  grupo: GrupoDetalleSeguimiento;
  resumenEco: string;
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroAlumnos>('atencion');
  const [busca, setBusca] = useState('');
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return grupo.alumnos
      .filter((a) => {
        if (filtro === 'atencion') return !!a.senal;
        if (filtro === 'sin-actividad') return a.sinActividad;
        if (filtro === 'al-dia') return !a.senal;
        return true;
      })
      .filter((a) => !q || a.nombre.toLowerCase().includes(q));
  }, [grupo.alumnos, filtro, busca]);

  // ── Acciones (navegación real; deep-link por alumno = pendiente, ver reporte) ──
  const enviarConsulta = (_ids: string[]) => router.push('/docente/consultas');
  const verCasos = (_id: string) => router.push('/docente/validacion');
  const verBitacora = (_id: string) => router.push('/docente/validacion');

  function toggle(id: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const modalidad = grupo.modalidad === 'sincrono' ? 'Síncrono' : 'Asíncrono';

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-6 pb-8 pt-6">
      <div className="min-w-0 flex-1">
        {/* Cabecera + límite de rol declarado */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/docente/grupos"
            aria-label="Volver a mis grupos"
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border bg-card text-foreground transition-colors hover:bg-accent ${focusRing}`}
          >
            <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-[20px] font-extrabold leading-tight tracking-[-0.02em]">{grupo.nombre}</h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {grupo.programa} · {modalidad} · {grupo.alumnos.length}{' '}
              {grupo.alumnos.length === 1 ? 'alumno' : 'alumnos'}
              {grupo.moduloEnCurso ? ` · cursando ${grupo.moduloEnCurso}` : ''}
              {grupo.fechaInicio ? ` · inició ${fechaCorta(grupo.fechaInicio)}` : ''}
            </p>
          </div>
          <span className="ml-auto flex items-center gap-2.5">
            <span className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11.5px] font-semibold text-muted-foreground">
              <Lock aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              Configuración del grupo: del diseñador
            </span>
            {CORA_URL ? (
              <a
                href={CORA_URL}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
              >
                Consultarlo en CORA
                <ExternalLink aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              </a>
            ) : (
              <span
                title="Inscripción y calificaciones oficiales viven en CORA (enlace directo · Sprint 11)"
                className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-muted-foreground"
              >
                Consultarlo en CORA
                <ExternalLink aria-hidden className="h-3 w-3" strokeWidth={1.75} />
              </span>
            )}
          </span>
        </div>

        {/* Cuatro cifras de seguimiento */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {grupo.resumen.map((r) => (
            <div
              key={r.etiqueta}
              className={`rounded-xl border bg-card px-4 py-3.5 shadow-rest ${
                r.atencion ? 'border-[color:var(--warning-border)]' : 'border-border'
              }`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  r.atencion ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'
                }`}
              >
                {r.etiqueta}
              </p>
              <p
                className={`${mono} mt-2 text-[26px] font-extrabold leading-none tracking-[-0.02em] ${
                  r.atencion ? 'text-[color:var(--warning-foreground)]' : ''
                }`}
              >
                {r.valor}
              </p>
              <p className="mt-1.5 text-[11.5px] text-muted-foreground">{r.nota}</p>
            </div>
          ))}
        </div>

        {/* Filtros de alumnos: el trabajo real arranca en "requieren atención" */}
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <h2 className={`${kicker} text-muted-foreground`}>Alumnos</h2>
          <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
            {(
              [
                ['atencion', 'Requieren atención', grupo.conteos.atencion],
                ['todos', 'Todos', grupo.conteos.todos],
                ['sin-actividad', 'Sin actividad', grupo.conteos.sinActividad],
                ['al-dia', 'Al día', grupo.conteos.alDia],
              ] as const
            ).map(([id, etiqueta, num]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFiltro(id)}
                aria-pressed={filtro === id}
                className={`inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] font-semibold transition-colors ${focusRing} ${
                  filtro === id
                    ? 'bg-sidebar text-sidebar-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {etiqueta}
                <span className={`${mono} font-bold ${filtro === id ? 'text-white/70' : 'text-muted-foreground'}`}>
                  {num}
                </span>
              </button>
            ))}
          </div>
          <label className="ml-auto flex h-9 w-[220px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
            <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <span className="sr-only">Buscar alumno</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar alumno…"
              className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>
          <span
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold ${softText}`}
          >
            Ordenar: riesgo primero
            <ChevronDown aria-hidden className="h-3 w-3" strokeWidth={2} />
          </span>
        </div>

        {/* Selección múltiple → mandar consulta a varios (mock: escribir a todos de una vez) */}
        {seleccion.size > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-secondary bg-accent px-4 py-3">
            <p className="min-w-[220px] flex-1 text-[12.5px] font-semibold text-accent-foreground">
              {seleccion.size} {seleccion.size === 1 ? 'alumno seleccionado' : 'alumnos seleccionados'}
            </p>
            <button
              type="button"
              onClick={() => setSeleccion(new Set())}
              className={`h-9 rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold ${softText} ${focusRing}`}
            >
              Quitar selección
            </button>
            <button
              type="button"
              onClick={() => enviarConsulta([...seleccion])}
              className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-[9px] bg-primary px-3.5 text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              <MessageCircle aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
              Enviar consulta a {seleccion.size}
            </button>
          </div>
        ) : (
          filtro === 'atencion' &&
          grupo.conteos.atencion > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-4 py-3.5">
              <TriangleAlert
                aria-hidden
                className="h-[17px] w-[17px] shrink-0 text-[color:var(--warning-foreground)]"
                strokeWidth={2}
              />
              <p className="min-w-[260px] flex-1 text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
                <span className="font-bold">
                  {grupo.conteos.atencion} de {grupo.conteos.todos}{' '}
                  {grupo.conteos.atencion === 1 ? 'necesita' : 'necesitan'} que usted intervenga.
                </span>{' '}
                {resumenEco}
              </p>
              <button
                type="button"
                onClick={() => enviarConsulta(visibles.map((a) => a.id))}
                className={`h-10 shrink-0 whitespace-nowrap rounded-[9px] bg-primary px-3.5 text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
              >
                {grupo.conteos.atencion === 1
                  ? 'Mandarle consulta'
                  : `Mandarles consulta a los ${grupo.conteos.atencion}`}
              </button>
            </div>
          )
        )}

        {/* Tabla de seguimiento */}
        <section className={`${card} mt-3 overflow-hidden`}>
          <div className="flex items-center gap-3.5 bg-muted px-[18px] py-2.5">
            {(
              [
                ['Alumno', 'flex-[1.5]'],
                ['Avance del programa', 'flex-[1.1] min-w-0'],
                ['Casos / validados', 'shrink-0 w-[84px] text-center'],
                ['Entregas', 'shrink-0 w-[74px] text-center'],
                ['I-AIM', 'shrink-0 w-[62px] text-center'],
                ['Señal de intervención', 'shrink-0 w-[238px]'],
                ['', 'shrink-0 w-[124px]'],
              ] as const
            ).map(([t, cls]) => (
              <span
                key={t || 'acc'}
                className={`${cls} whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}
              >
                {t}
              </span>
            ))}
          </div>

          {visibles.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-3.5 border-t border-border px-[18px] py-3.5 transition-colors hover:bg-muted ${
                a.senal ? 'bg-[color:var(--warning-surface)]/40' : ''
              }`}
            >
              <span className="flex min-w-0 flex-[1.5] items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={seleccion.has(a.id)}
                  onChange={() => toggle(a.id)}
                  aria-label={`Seleccionar a ${a.nombre}`}
                  className="h-4 w-4 shrink-0 accent-[color:var(--secondary)]"
                />
                <Avatar ini={a.iniciales} url={a.avatarUrl} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-bold leading-snug">{a.nombre}</span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    {a.moduloEnCurso && (
                      <span className={`${mono} text-[10.5px] text-muted-foreground`}>
                        {a.moduloEnCurso.split(' · ')[0]}
                      </span>
                    )}
                    <span
                      className={`text-[10.5px] ${
                        a.sinActividad ? 'font-semibold text-[color:var(--warning-foreground)]' : 'text-muted-foreground'
                      }`}
                    >
                      {a.ultimaActividad}
                    </span>
                  </span>
                </span>
              </span>

              <span className="flex min-w-0 flex-[1.1] items-center gap-2">
                <span className="h-1.5 min-w-[52px] flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                  <span
                    className={`block h-full rounded-full ${a.senal ? 'bg-[color:var(--warning)]' : 'bg-primary'}`}
                    style={{ width: `${a.avance}%` }}
                  />
                </span>
                <span className={`${mono} shrink-0 text-[12px] font-bold`}>{a.avance}%</span>
              </span>

              <span className={`${mono} w-[84px] shrink-0 text-center text-[12px] font-semibold`}>
                {a.casosSubidos} / {a.casosValidados}
              </span>
              <span className={`${mono} w-[74px] shrink-0 text-center text-[12px] font-semibold`}>{a.entregas}</span>
              <span className="w-[62px] shrink-0 text-center">
                {a.competencia === null ? (
                  <span className={`${mono} text-[12px] text-muted-foreground`}>—</span>
                ) : (
                  <span
                    className={`${mono} inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-bold ${
                      a.competencia >= 65
                        ? 'bg-accent text-accent-foreground'
                        : 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]'
                    }`}
                  >
                    {a.competencia}
                  </span>
                )}
              </span>

              {/* El motivo en palabras, no un puntaje */}
              <span className="w-[238px] shrink-0">
                {a.senal ? (
                  <span className="inline-flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-[color:var(--warning-foreground)]">
                    <TriangleAlert aria-hidden className="mt-px h-3 w-3 shrink-0" strokeWidth={2} />
                    {a.senal.motivo}
                  </span>
                ) : (
                  <span className={`${mono} text-[11px] text-muted-foreground`}>—</span>
                )}
              </span>

              <span className="flex w-[124px] shrink-0 justify-end gap-0.5">
                <button
                  type="button"
                  onClick={() => enviarConsulta([a.id])}
                  aria-label={`Mandarle una consulta a ${a.nombre}`}
                  title="Enviar consulta"
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <MessageCircle aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => verCasos(a.id)}
                  aria-label={`Ver los casos de ${a.nombre}`}
                  title="Ver sus casos"
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <ScanLine aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => verBitacora(a.id)}
                  aria-label={`Ver la bitácora de ${a.nombre}`}
                  title="Ver su bitácora"
                  className={`grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border bg-card ${softText} transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <NotebookText aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
              </span>
            </div>
          ))}

          {visibles.length === 0 && (
            <div className="border-t border-border px-6 py-10 text-center">
              <p className="text-[14px] font-bold">Nadie en esta lista</p>
              <p className={`mt-1.5 text-[12.5px] ${softText}`}>Con este filtro no queda ningún alumno. Pruebe con «Todos».</p>
            </div>
          )}

          {visibles.length > 0 && filtro !== 'atencion' && (
            <div className="flex items-center gap-2.5 border-t border-border bg-muted px-[18px] py-3">
              <span className={`${mono} text-[11.5px] text-muted-foreground`}>
                {visibles.length} de {grupo.conteos.todos} alumnos
              </span>
              {filtro !== 'todos' && (
                <button
                  type="button"
                  onClick={() => setFiltro('todos')}
                  className={`ml-auto inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-border bg-card px-3 text-[12px] font-semibold text-secondary ${focusRing}`}
                >
                  Ver a los {grupo.conteos.todos}
                  <ChevronRight aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </div>
          )}
        </section>
      </div>

      <PanelEco resumen={resumenEco} />
    </div>
  );
}
