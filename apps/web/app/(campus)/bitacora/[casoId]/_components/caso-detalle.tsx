'use client';

/**
 * Detalle de un caso de la bitácora (§4.7) — visor grande + ficha del caso, con
 * EDICIÓN inline mientras el caso está EN REVISIÓN (pendiente). El alumno edita todos
 * los campos (viñeta, hallazgos, diagnóstico, órgano, patología, técnica, equipo,
 * etiquetas, docente) y agrega/quita series. Un caso acreditado/rechazado es de solo
 * lectura (refleja lo que validó el docente). Reusa el pipeline sin tocarlo.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Loader2, Pencil, Stethoscope, Trash2, TriangleAlert } from 'lucide-react';
import { mono, kickerWide as kicker, softText, card, focusRing } from '@/components/tokens';
import { fechaCorta } from '@/lib/format';
import { VisorEstudio } from '@/components/casos/visor-estudio';
import { VisorDicomPlaceholder } from '../../../_components/visor-dicom';
import { VistaCasoEstudio } from '@/components/casos/vista-caso-estudio';
import { FichaCasoCampos } from '@/components/casos/ficha-campos';
import { ContenidoEstructuradoCasoVista } from '@/components/casos/contenido-estructurado-caso';
import { tieneContenidoEstructurado } from '@campus/shared';
import {
  SelectorArchivosDicom,
  ejecutarSubidaMulti,
  ETIQUETA_FASE,
  type FaseDicom,
} from '@/components/casos/subida-dicom';
import { actualizarCaso } from '@/lib/campus/acciones-bitacora';
import { quitarSerieDicom } from '@/lib/dicom/acciones';
import {
  DOMINIO_LABEL,
  ETIQUETA_ESTADO,
  type CasoDetalleBitacora,
  type DocenteOpcion,
  type EstadoCaso,
  type FichaCaso,
} from '@/lib/campus/bitacora-contrato';

const claseEstado: Record<EstadoCaso, string> = {
  pendiente:
    'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  aprobado: 'bg-accent text-accent-foreground',
  rechazado:
    'border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]',
};

function fichaDeCaso(c: CasoDetalleBitacora): FichaCaso {
  return {
    organo: c.organo ?? '',
    patologia: c.patologia ?? '',
    dominio: c.dominio,
    tecnica: c.tecnica ?? '',
    equipo: c.equipo ?? '',
    docenteId: c.docenteId,
    etiquetas: c.etiquetas,
    vineta: c.vineta ?? '',
    hallazgos: c.hallazgos ?? '',
    presuntivo: c.presuntivo ?? '',
  };
}

export function CasoDetalleBitacoraCliente({
  caso,
  docentes,
}: {
  caso: CasoDetalleBitacora;
  docentes: DocenteOpcion[];
}) {
  const router = useRouter();
  const editable = caso.estado === 'pendiente';
  const listo = caso.estudioEstado === 'anonimizado';

  const [editando, setEditando] = useState(false);
  const [ficha, setFicha] = useState<FichaCaso>(fichaDeCaso(caso));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verNonce, setVerNonce] = useState(0);

  // Series (agregar/quitar).
  const [archivos, setArchivos] = useState<File[]>([]);
  const [fase, setFase] = useState<FaseDicom>('idle');
  const [faseMsg, setFaseMsg] = useState('');
  const [quitando, setQuitando] = useState<number | null>(null);
  const subiendo = fase === 'subiendo' || fase === 'procesando';

  const guardar = async () => {
    setError(null);
    setGuardando(true);
    const r = await actualizarCaso(caso.id, ficha);
    setGuardando(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setEditando(false);
    router.refresh();
  };

  const agregarSeries = async () => {
    if (archivos.length === 0) return;
    const final = await ejecutarSubidaMulti(
      caso.id,
      'bitacora_casos',
      archivos,
      (f, msg) => {
        setFase(f);
        setFaseMsg(msg ?? '');
      },
      true, // anexar
    );
    if (final === 'anonimizado') {
      setArchivos([]);
      setFase('idle');
      setVerNonce((n) => n + 1);
      router.refresh();
    }
  };

  const quitarSerie = async (indice: number) => {
    setQuitando(indice);
    const r = await quitarSerieDicom(caso.id, indice, 'bitacora_casos');
    setQuitando(null);
    if (r.ok) {
      setVerNonce((n) => n + 1);
      router.refresh();
    } else {
      setError(r.error);
    }
  };

  const etiquetaVisor =
    caso.organo ??
    (caso.estudioEstado === 'procesando'
      ? 'anonimizando el estudio…'
      : caso.estudioEstado === 'error'
        ? 'error al procesar el estudio'
        : caso.estudioEstado
          ? 'estudio DICOM en cola'
          : 'sin estudio');

  /* ── Gestor de series (agregar/quitar) — solo editable ── */
  const gestorSeries = editable ? (
    <section className={`${card} p-5`}>
      <div className="flex items-center gap-2">
        <p className={`${kicker} text-muted-foreground`}>Series del estudio</p>
        <span className={`${mono} ml-auto text-[12px] text-muted-foreground`}>
          {caso.series} {caso.series === 1 ? 'serie' : 'series'}
        </span>
      </div>

      {caso.series > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {Array.from({ length: caso.series }).map((_, i) => (
            <li
              key={i}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 text-[12px] font-semibold"
            >
              Serie {i + 1}
              <button
                type="button"
                onClick={() => quitarSerie(i)}
                disabled={quitando !== null}
                aria-label={`Quitar serie ${i + 1}`}
                className={`grid h-5 w-5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-[color:var(--destructive-surface)] hover:text-[color:var(--destructive-foreground)] disabled:opacity-50 ${focusRing}`}
              >
                {quitando === i ? (
                  <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.2} />
                ) : (
                  <Trash2 className="h-3 w-3" strokeWidth={1.9} />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3.5">
        <p className="mb-2 text-[11.5px] font-semibold">Agregar series</p>
        {fase !== 'idle' && fase !== 'anonimizado' ? (
          <div className="flex items-center gap-2.5 rounded-[12px] border border-border bg-muted p-4 text-[13px]">
            {fase === 'error' ? (
              <span className="text-[color:var(--destructive-foreground)]">{faseMsg || ETIQUETA_FASE.error}</span>
            ) : (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-secondary" strokeWidth={2} />
                <span className="font-semibold">{ETIQUETA_FASE[fase]}</span>
              </>
            )}
          </div>
        ) : (
          <SelectorArchivosDicom value={archivos} onChange={setArchivos} bloqueado={subiendo} />
        )}
        {archivos.length > 0 && fase === 'idle' && (
          <button
            type="button"
            onClick={agregarSeries}
            className={`mt-3 inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
          >
            Agregar {archivos.length} {archivos.length === 1 ? 'serie' : 'series'}
          </button>
        )}
      </div>
    </section>
  ) : null;

  /* ── Lecturas read-only de la clínica (modo vista) ── */
  const estructurado = tieneContenidoEstructurado(caso.contenidoEstructurado);
  const clinicaLectura = (
    <>
      {caso.vineta && (
        <section className={`${card} p-6`}>
          <p className={`${kicker} text-muted-foreground`}>Viñeta clínica</p>
          <p className={`mt-3 max-w-[70ch] whitespace-pre-line text-[15px] leading-[1.75] ${softText}`}>
            {caso.vineta}
          </p>
        </section>
      )}
      {/* Hallazgos: si el caso trae la VERDAD ESTRUCTURADA (del reporte), se muestra
          COINCIDIBLE con el reporte (tablas/mediciones tipadas); si no, el texto plano. */}
      {estructurado ? (
        <ContenidoEstructuradoCasoVista contenido={caso.contenidoEstructurado!} modo="previa" />
      ) : (
        <section className={`${card} p-6`}>
          <p className={`${kicker} text-muted-foreground`}>Mis hallazgos</p>
          <p className={`mt-3 max-w-[70ch] whitespace-pre-line text-[15px] leading-[1.75] ${softText}`}>
            {caso.hallazgos?.trim() || 'Sin hallazgos capturados.'}
          </p>
        </section>
      )}
      {caso.presuntivo && (
        <section className={`${card} p-6`}>
          <p className={`${kicker} text-muted-foreground`}>Diagnóstico presuntivo</p>
          <p className="mt-3 flex items-start gap-2.5 text-[15px] font-semibold leading-relaxed">
            <Stethoscope aria-hidden className="mt-0.5 h-[18px] w-[18px] shrink-0 text-secondary" strokeWidth={1.75} />
            {caso.presuntivo}
          </p>
        </section>
      )}
    </>
  );

  return (
    <VistaCasoEstudio
      volverHref="/bitacora"
      volverLabel="Volver a mi bitácora"
      visor={
        listo ? (
          <VisorEstudio key={verNonce} casoId={caso.id} tabla="bitacora_casos" />
        ) : (
          <div className={`${card} overflow-hidden`}>
            <VisorDicomPlaceholder etiqueta={etiquetaVisor} alto={430} loop={caso.cineLoop} piezas={caso.series} />
          </div>
        )
      }
      debajoDelVisor={
        <>
          {gestorSeries}
          {!editando && clinicaLectura}
        </>
      }
      panel={
        editando ? (
          <section className={`${card} p-6`}>
            <p className={`${kicker} text-muted-foreground`}>Editar caso</p>
            <div className="mt-4">
              <FichaCasoCampos value={ficha} onChange={setFicha} docentes={docentes} disabled={guardando} />
            </div>
            {error && (
              <p
                role="alert"
                className="mt-4 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12.5px] font-medium text-[color:var(--destructive-foreground)]"
              >
                {error}
              </p>
            )}
            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setFicha(fichaDeCaso(caso));
                  setEditando(false);
                  setError(null);
                }}
                disabled={guardando}
                className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-60 ${focusRing}`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardar}
                disabled={guardando}
                className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
              >
                {guardando && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />}
                Guardar cambios
              </button>
            </div>
          </section>
        ) : (
          <PanelLectura caso={caso} listo={listo} editable={editable} onEditar={() => setEditando(true)} />
        )
      }
    />
  );
}

/* ─────────────────── Panel de lectura (modo vista) ─────────────────── */

function PanelLectura({
  caso,
  listo,
  editable,
  onEditar,
}: {
  caso: CasoDetalleBitacora;
  listo: boolean;
  editable: boolean;
  onEditar: () => void;
}) {
  const ficha: [string, string | null][] = [
    ['Órgano', caso.organo],
    ['Patología', caso.patologia],
    ['Dominio I-AIM', caso.dominio ? DOMINIO_LABEL[caso.dominio] : null],
    ['Técnica', caso.tecnica],
    ['Equipo', caso.equipo],
    ['Docente', caso.docente],
    ['Módulo', caso.modulo],
  ];

  return (
    <>
      <section className={`${card} p-6`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11.5px] font-semibold ${claseEstado[caso.estado]}`}
          >
            {ETIQUETA_ESTADO[caso.estado]}
          </span>
          {editable && (
            <button
              type="button"
              onClick={onEditar}
              className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
            >
              <Pencil aria-hidden className="h-3.5 w-3.5" strokeWidth={1.9} />
              Editar
            </button>
          )}
        </div>
        <h1 className="mt-3.5 text-[22px] font-extrabold leading-tight tracking-[-0.02em]" style={{ textWrap: 'pretty' }}>
          {caso.hallazgoCorto}
        </h1>
        <p className={`${mono} mt-2.5 text-[12.5px] text-muted-foreground`}>{fechaCorta(caso.fecha)}</p>

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 border-t border-border pt-4">
          {ficha
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-[13px] text-muted-foreground">{k}</dt>
                <dd className="text-[13.5px] font-semibold">{v}</dd>
              </div>
            ))}
        </dl>

        {caso.etiquetas.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-4">
            {caso.etiquetas.map((t) => (
              <span
                key={t}
                className={`inline-flex h-7 items-center rounded-full bg-muted px-2.5 text-[12px] font-semibold ${softText}`}
              >
                #{t}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className={`${card} p-6`}>
        <p className={`${kicker} text-muted-foreground`}>Seguimiento</p>
        <ul className="mt-3.5 flex flex-col gap-3 text-[13.5px]">
          <li className="flex items-start gap-2.5">
            <span aria-hidden className="mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            Caso registrado en su bitácora.
          </li>
          <li className={`flex items-start gap-2.5 ${listo ? '' : 'text-muted-foreground'}`}>
            <span
              aria-hidden
              className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                listo ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {listo ? <Check className="h-3 w-3" strokeWidth={3} /> : <Clock className="h-3 w-3" strokeWidth={2.2} />}
            </span>
            {listo
              ? `Estudio anonimizado · ${caso.series} ${caso.series === 1 ? 'serie' : 'series'}.`
              : caso.estudioEstado === 'error'
                ? 'El estudio no se pudo anonimizar.'
                : caso.estudioEstado
                  ? 'Estudio en anonimización…'
                  : 'Sin estudio adjunto.'}
          </li>
          <li className={`flex items-start gap-2.5 ${caso.estado === 'aprobado' ? '' : 'text-muted-foreground'}`}>
            <span
              aria-hidden
              className={`mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full ${
                caso.estado === 'aprobado' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {caso.estado === 'aprobado' ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : (
                <Clock className="h-3 w-3" strokeWidth={2.2} />
              )}
            </span>
            {caso.estado === 'aprobado'
              ? 'Validado por su docente · acredita horas.'
              : 'A la espera de la validación del docente.'}
          </li>
        </ul>
      </section>

      {caso.feedback && (
        <section
          className={`rounded-xl border p-6 ${
            caso.estado === 'rechazado'
              ? 'border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)]'
              : 'border-border bg-accent'
          }`}
        >
          <p
            className={`${kicker} flex items-center gap-2 ${
              caso.estado === 'rechazado' ? 'text-[color:var(--destructive-foreground)]' : 'text-secondary'
            }`}
          >
            {caso.estado === 'rechazado' && <TriangleAlert className="h-3.5 w-3.5" strokeWidth={2} />}
            Revisión del docente
          </p>
          <p
            className={`mt-3 text-[14px] leading-relaxed ${
              caso.estado === 'rechazado' ? 'text-[color:var(--destructive-foreground)]' : softText
            }`}
          >
            {caso.feedback}
          </p>
        </section>
      )}

      {editable && (
        <section className="rounded-xl bg-muted p-5">
          <p className={`text-[12.5px] leading-relaxed ${softText}`}>
            Puede <strong>editar</strong> este caso y ajustar sus series mientras esté en revisión. Al
            acreditarse, queda fijo. Los estudios se guardan siempre <strong>anonimizados</strong> (§10).
          </p>
        </section>
      )}
    </>
  );
}
