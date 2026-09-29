'use client';

/**
 * Vista por GRUPO × ACTIVIDAD para una tarea abierta (§5B) — fiel al mock. Bandeja de
 * trabajos por calificar: selectores, resumen, lista con estado + nota, y quién no
 * entregó. Datos reales. El botón de LOTE y el panel lateral son Eco (PLACEHOLDER):
 * violeta, nunca alerta (§5A/§7A).
 */

import { useMemo, useState } from 'react';
import { BellRing, Check, ChevronRight, Search, Sparkles, TriangleAlert } from 'lucide-react';
import { mono, kicker, card, focusRing } from '@/lib/studio/estilos';
import { Avatar } from '@/components/avatar';
import { haceCuanto } from '@/lib/format';
import type { EntregaVista, EstadoVistaEntrega, ActividadRef, EntregasVista } from '../../../_lib/contrato';
import { ChipEstado, Selector } from './ui';
import { ECO_LOTE_EJEMPLO } from './eco-placeholder';
import { ChatEco } from '@/app/(studio-admin)/_components/chat-eco';

/**
 * Confianza de la nota sugerida por Eco — PLACEHOLDER determinista por id (Eco NO conectado
 * · §7A). Solo aplica a filas `sugerida`; los datos reales llegarán de `lxp.eco_propuestas`.
 */
function confianzaEco(id: string): 'alta' | 'media' {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 3 === 0 ? 'media' : 'alta';
}

/** Rango de orden: primero lo que requiere la LECTURA del docente (spec · §4). */
function rangoEntrega(e: EntregaVista): number {
  if (e.estado === 'sugerida') return confianzaEco(e.id) === 'alta' ? 0 : 1;
  if (e.estado === 'requiere-lectura') return 2;
  if (e.estado === 'auto') return 3;
  return 4; // calificada
}

/** Texto de la columna "detalle" de una fila (Eco = PLACEHOLDER donde aplique). */
function detalleFila(e: EntregaVista): { texto: string; alerta: boolean } {
  switch (e.estado) {
    case 'sugerida':
      return confianzaEco(e.id) === 'alta'
        ? { texto: 'confianza alta', alerta: false }
        : { texto: 'confianza media · revísela', alerta: false };
    case 'requiere-lectura':
      return { texto: 'Pendiente de su lectura', alerta: true };
    case 'auto':
      return { texto: 'autocalificada por el sistema', alerta: false };
    case 'calificada':
      return { texto: 'Ya calificada', alerta: false };
    default:
      return { texto: '', alerta: false };
  }
}

/** Estados que cuentan como "tarea abierta pendiente" para el filtro "Solo abiertas". */
const PENDIENTE_ABIERTA: EstadoVistaEntrega[] = ['sugerida', 'requiere-lectura'];

export function VistaActividad({
  data,
  actividad,
  onElegirGrupo,
  onElegirActividad,
  onAbrir,
}: {
  data: EntregasVista;
  actividad: ActividadRef;
  onElegirGrupo: (id: string) => void;
  onElegirActividad: (id: string) => void;
  onAbrir: (id: string) => void;
}) {
  const { grupo, grupos, actividades, resumen, entregas, sinEntregar } = data;
  const [busca, setBusca] = useState('');
  const [soloAbiertas, setSoloAbiertas] = useState(false);
  const [avisoEco, setAvisoEco] = useState(false);
  const [avisoRecordar, setAvisoRecordar] = useState(false);

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return entregas
      .filter(
        (e) =>
          (!soloAbiertas || (e.tipo === 'abierta' && PENDIENTE_ABIERTA.includes(e.estado))) &&
          (!q || e.alumno.nombre.toLowerCase().includes(q)),
      )
      .sort((a, b) => rangoEntrega(a) - rangoEntrega(b) || b.creadoEn.getTime() - a.creadoEn.getTime());
  }, [entregas, soloAbiertas, busca]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-4 px-6 pb-6 pt-5">
      <div className="min-w-0 flex-1">
        {/* 1 · BARRA DE CONTROLES: selectores + buscador + confirmar en lote */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Selector
            rotulo="Grupo"
            valor={grupo?.nombre ?? '—'}
            opciones={grupos.map((g) => ({ id: g.id, etiqueta: g.nombre }))}
            onSelect={onElegirGrupo}
            anchoMin={200}
          />
          <Selector
            rotulo="Actividad"
            valor={`${actividad.clave} · ${actividad.titulo}`}
            opciones={actividades.map((a) => ({ id: a.id, etiqueta: `${a.clave} · ${a.titulo}` }))}
            onSelect={onElegirActividad}
            anchoMin={300}
          />
          <label className="flex h-10 w-[220px] items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 transition-colors focus-within:border-secondary">
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
          {/* Confirmar en lote (teal · spec): solo las notas que Eco sugirió con confianza ALTA.
              PLACEHOLDER: abre un aviso; el resumen/asiento del lote llega con Eco (§7A). */}
          <button
            type="button"
            onClick={() => setAvisoEco(true)}
            title="Eco aún no está conectado"
            className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-4 text-[13.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            <Check aria-hidden className="h-4 w-4" strokeWidth={2.4} />
            Confirmar {ECO_LOTE_EJEMPLO} de alta confianza
          </button>
        </div>

        {avisoEco && (
          <div className="mt-3 flex items-center gap-2.5 rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-2.5">
            <Sparkles aria-hidden className="h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
            <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--info-foreground)]">
              El lote de Eco aún no está conectado. Cuando lo esté, aquí confirmará en bloque solo lo que Eco
              pre-calificó con alta confianza; el resto lo revisa usted una a una.
            </p>
          </div>
        )}

        {/* 2 · KPIs (5): teal = listo · ámbar = requiere al docente · gris = informativo */}
        <div className="mt-4 flex items-stretch gap-3">
          {(
            [
              ['Entregadas', `${resumen.entregadas} / ${resumen.delGrupo}`, `de ${resumen.delGrupo} alumnos del grupo`, 'plano'],
              ['Auto-calificadas', String(resumen.autoCalificadas), 'autoevaluaciones · listas', 'ok'],
              ['Por confirmar', String(resumen.porConfirmar), 'tareas abiertas con nota sugerida', 'warn'],
              ['Promedio del grupo', resumen.promedio == null ? '—' : resumen.promedio.toFixed(1), 'sobre lo ya calificado', 'plano'],
              ['Sin entregar', String(resumen.sinEntregar), resumen.vencio || 'del grupo', 'warn'],
            ] as const
          ).map(([rot, val, sub, tono]) => {
            const texto =
              tono === 'ok'
                ? 'text-accent-foreground'
                : tono === 'warn'
                  ? 'text-[color:var(--warning-foreground)]'
                  : 'text-muted-foreground';
            return (
              <div
                key={rot}
                className={`min-w-0 flex-1 rounded-[11px] px-4 py-3.5 ${
                  tono === 'ok'
                    ? 'bg-accent'
                    : tono === 'warn'
                      ? 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]'
                      : 'border border-border bg-muted'
                }`}
              >
                <p className={`${kicker} text-[9.5px] tracking-[0.12em] ${texto}`}>{rot}</p>
                <p
                  className={`${mono} mt-1.5 text-[24px] font-extrabold leading-none tracking-[-0.02em] ${
                    tono === 'ok'
                      ? 'text-accent-foreground'
                      : tono === 'warn'
                        ? 'text-[color:var(--warning-foreground)]'
                        : 'text-foreground'
                  }`}
                >
                  {val}
                </p>
                <p className={`mt-1 text-[11px] leading-snug ${texto}`}>{sub}</p>
              </div>
            );
          })}
        </div>

        {/* 3 · AVISO DE REGLAS (violeta · una sola vez) */}
        <div className="mt-4 flex items-center gap-[9px] rounded-[11px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3.5 py-[11px]">
          <Sparkles aria-hidden className="h-4 w-4 shrink-0 text-[color:var(--info-foreground)]" strokeWidth={1.75} />
          <p className="min-w-0 flex-1 text-[12.5px] leading-[1.5] text-[color:var(--info-foreground)]">
            <span className="font-bold">Las autoevaluaciones se califican solas</span> (opción múltiple, sin Eco:
            lógica del sistema) y las tareas abiertas ya traen nota sugerida contra la rúbrica. Eco propone; usted
            confirma — ninguna nota se asienta sola.
          </p>
        </div>

        {/* lista de entregas (real) */}
        <section className={`${card} mt-4 overflow-hidden`}>
          <div className="flex items-center gap-2.5 px-[18px] py-3.5">
            <h2 className={`${kicker} text-muted-foreground`}>Entregas</h2>
            <span className={`${mono} text-[11.5px] text-muted-foreground`}>
              {resumen.entregadas} · ordenadas por lo que requiere su lectura
            </span>
            <button
              type="button"
              onClick={() => setSoloAbiertas((v) => !v)}
              aria-pressed={soloAbiertas}
              className={`ml-auto h-8 rounded-lg border px-2.5 text-[11.5px] font-semibold transition-colors ${focusRing} ${
                soloAbiertas
                  ? 'border-secondary bg-accent text-accent-foreground'
                  : 'border-border bg-card hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              Solo abiertas
            </button>
          </div>

          {visibles.length === 0 ? (
            <p className="border-t border-border px-[18px] py-8 text-center text-[12.5px] text-muted-foreground">
              {entregas.length === 0 ? 'Aún no hay entregas de esta actividad.' : 'Sin coincidencias.'}
            </p>
          ) : (
            visibles.map((e) => {
              const detalle = detalleFila(e);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onAbrir(e.id)}
                  className={`flex w-full items-center gap-3.5 border-t border-border px-[18px] py-3 text-left transition-colors hover:bg-muted ${focusRing}`}
                >
                  <Avatar ini={e.alumno.ini} url={e.alumno.avatarUrl} />
                  <span className="min-w-0 flex-[1.3]">
                    <span className="block text-[13.5px] font-bold leading-snug">{e.alumno.nombre}</span>
                    <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
                      {e.tipo === 'abierta' ? 'Tarea abierta' : 'Autoevaluación'} · entregó {haceCuanto(e.creadoEn)}
                    </span>
                  </span>
                  <span className="w-[170px] shrink-0">
                    <ChipEstado estado={e.estado} />
                  </span>
                  <span
                    className={`min-w-0 flex-1 text-[11.5px] leading-[1.45] ${
                      detalle.alerta ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'
                    }`}
                  >
                    {detalle.texto}
                  </span>
                  <span
                    className={`${mono} w-16 shrink-0 text-right text-[17px] font-extrabold ${
                      e.nota == null ? 'text-muted-foreground' : 'text-foreground'
                    }`}
                  >
                    {e.nota == null ? '—' : e.nota.toFixed(e.nota % 1 ? 1 : 0)}
                  </span>
                  <ChevronRight aria-hidden className="h-[17px] w-[17px] shrink-0 text-muted-foreground" strokeWidth={2} />
                </button>
              );
            })
          )}

          {/* quién no entregó (roster real de CORA) */}
          {sinEntregar.length > 0 && (
            <div className="flex flex-wrap items-center gap-3.5 border-t border-border bg-[color:var(--warning-surface)] px-[18px] py-3.5">
              <span
                aria-hidden
                className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
              >
                <TriangleAlert className="h-4 w-4" strokeWidth={2} />
              </span>
              <p className="min-w-[280px] flex-1 text-[12.5px] leading-[1.5] text-[color:var(--warning-foreground)]">
                <span className="font-bold">
                  {sinEntregar.length} alumno{sinEntregar.length === 1 ? '' : 's'} no{' '}
                  {sinEntregar.length === 1 ? 'ha' : 'han'} entregado
                </span>{' '}
                — {resumen.vencio ? `${resumen.vencio}: ` : ''}
                {sinEntregar.map((a) => a.nombre).join(', ')}.
              </p>
              <button
                type="button"
                onClick={() => setAvisoRecordar(true)}
                title="Disponible pronto"
                className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[9px] border border-[color:var(--warning-border)] bg-card px-3.5 text-[12.5px] font-bold text-[color:var(--warning-foreground)] ${focusRing}`}
              >
                <BellRing aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                Recordarles
              </button>
              {avisoRecordar && (
                <p className="w-full text-[11.5px] leading-snug text-[color:var(--warning-foreground)]">
                  El recordatorio automático se conecta con el motor de notificaciones (§8) — disponible pronto.
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Eco conversacional sobre el grupo (§7A · read-only) */}
      {grupo && (
        <div className="w-[360px] shrink-0 self-start">
          <ChatEco
            surface="grupo"
            entidadId={grupo.id}
            subtitulo="Sobre este grupo"
            placeholder="Pregúntele a Eco sobre este grupo…"
            intro="Pregúntele a Eco sobre el grupo de esta actividad: cruza casos, entregas por revisar y competencia I-AIM (bajo RLS). Eco propone; usted decide."
            sugerencias={['¿Cómo va el grupo?', '¿Quién está batallando?', '¿Cuánto hay por revisar?']}
          />
        </div>
      )}
    </div>
  );
}
