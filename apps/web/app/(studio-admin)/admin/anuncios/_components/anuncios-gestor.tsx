'use client';

/**
 * Studio · Anuncios — gestor de comunicación oficial (§6). Lista real de
 * `lxp.anuncios` + composer que ESCRIBE de verdad (server action bajo RLS). El rol
 * acota el alcance (§5B). In-app siempre va; correo/WhatsApp los elige quien publica;
 * la caducidad es obligatoria. Vistas y "Redactar con Eco" = placeholder (§7A/§11).
 */
import { useActionState, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Lock,
  Mail,
  MessageCircle,
  Plus,
  Search,
  Send,
  Smartphone,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { mono, kicker, softText, focusRing } from '@/components/tokens';
import { crearAnuncio, type EstadoForm } from './_actions';
import {
  ALCANCE_POR_ROL,
  ETIQUETA_ALCANCE,
  type AnunciosData,
  type Canal,
  type EstadoAnuncio,
  type Prioridad,
  type TipoAlcance,
} from './contrato';

const PRIORIDAD: Record<Prioridad, { etiqueta: string; clase: string }> = {
  urgente: {
    etiqueta: 'Urgente',
    clase: 'border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]',
  },
  importante: {
    etiqueta: 'Importante',
    clase: 'border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]',
  },
  normal: { etiqueta: 'Normal', clase: 'border border-border bg-muted text-muted-foreground' },
};

const ESTADO: Record<EstadoAnuncio, { etiqueta: string; clase: string }> = {
  publicado: { etiqueta: 'Publicado', clase: 'bg-accent text-accent-foreground' },
  programado: {
    etiqueta: 'Programado',
    clase: 'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
  },
  vencido: { etiqueta: 'Vencido', clase: 'border border-border bg-muted text-muted-foreground' },
};

const ICONO_CANAL: Record<Canal, typeof Smartphone> = { in_app: Smartphone, correo: Mail, whatsapp: MessageCircle };
const NOMBRE_CANAL: Record<Canal, string> = { in_app: 'In-app', correo: 'Correo', whatsapp: 'WhatsApp' };

const INICIAL: EstadoForm = { ok: false };

export function AnunciosGestor({ data }: { data: AnunciosData }) {
  const { rol, anuncios, conteos, audiencia } = data;
  const [filtro, setFiltro] = useState<EstadoAnuncio>('publicado');
  const [busca, setBusca] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [formKey, setFormKey] = useState(0);

  const [estado, accion, pending] = useActionState(crearAnuncio, INICIAL);

  useEffect(() => {
    if (estado.ok) {
      setAbierto(false);
      setFormKey((k) => k + 1);
    }
  }, [estado]);

  const visibles = anuncios.filter(
    (a) => a.estado === filtro && (!busca.trim() || a.titulo.toLowerCase().includes(busca.trim().toLowerCase())),
  );

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">Anuncios</h1>
            <span className="inline-flex h-[23px] items-center whitespace-nowrap rounded-full bg-sidebar px-2.5 text-[10.5px] font-bold text-sidebar-foreground">
              {rol === 'super_admin' ? 'Alcance global' : 'Alcance académico'}
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Comunicación oficial de la escuela (distinta del Ateneo). Todo anuncio lleva caducidad para que no se quede colgado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className={`ml-auto inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          {abierto ? <X aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} /> : <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />}
          {abierto ? 'Cerrar' : 'Nuevo anuncio'}
        </button>
      </div>

      {abierto && (
        <Composer rol={rol} audiencia={audiencia} accion={accion} pending={pending} error={estado.error} formKey={formKey} />
      )}

      {/* filtros */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <div className="flex gap-1 rounded-full border border-border bg-card p-[3px]">
          {(
            [
              ['publicado', 'Publicados'],
              ['programado', 'Programados'],
              ['vencido', 'Vencidos'],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              aria-pressed={filtro === id}
              className={`inline-flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                filtro === id ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground'
              }`}
            >
              {etiqueta}
              <span className={`${mono} font-bold ${filtro === id ? 'text-white/70' : 'text-muted-foreground'}`}>{conteos[id]}</span>
            </button>
          ))}
        </div>

        <label className="flex h-10 w-[250px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar anuncio</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por título…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {/* lista */}
      <section className="mt-3.5 overflow-hidden rounded-xl border border-border bg-card shadow-rest">
        <div className="flex items-center gap-3.5 bg-muted px-[18px] py-2.5">
          {(
            [
              ['Anuncio', 'flex-[1.8]'],
              ['A quién llega', 'flex-1 min-w-0'],
              ['Canales', 'shrink-0 w-[96px]'],
              ['Publicación y vigencia', 'shrink-0 w-[180px]'],
            ] as const
          ).map(([t, cls]) => (
            <span key={t} className={`${cls} whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground`}>
              {t}
            </span>
          ))}
        </div>

        {visibles.length === 0 ? (
          <div className="border-t border-border px-6 py-12 text-center">
            <p className="text-[15px] font-bold">Nada en esta bandeja</p>
            <p className={`mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed ${softText}`}>
              Cambie de estado o publique el primer anuncio para esta audiencia.
            </p>
          </div>
        ) : (
          visibles.map((a) => (
            <div key={a.id} className="flex items-center gap-3.5 border-t border-border px-[18px] py-3.5">
              <span className="min-w-0 flex-[1.8]">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${PRIORIDAD[a.prioridad].clase}`}>
                    {a.prioridad === 'urgente' && <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />}
                    {PRIORIDAD[a.prioridad].etiqueta}
                  </span>
                  <span className={`inline-flex h-[22px] items-center whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${ESTADO[a.estado].clase}`}>
                    {ESTADO[a.estado].etiqueta}
                  </span>
                </span>
                <span className="mt-1.5 block truncate text-[13.5px] font-bold leading-snug">{a.titulo}</span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <Users aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  <span className="truncate text-[12px] font-semibold">{ETIQUETA_ALCANCE[a.alcanceTipo]}</span>
                </span>
                <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>{a.personas}</span>
              </span>

              <span className="flex w-[96px] shrink-0 gap-1.5">
                {(['in_app', 'correo', 'whatsapp'] as Canal[]).map((k) => {
                  const Icono = ICONO_CANAL[k];
                  const on = a.canales.includes(k);
                  return (
                    <span
                      key={k}
                      title={NOMBRE_CANAL[k]}
                      className={`grid h-6 w-6 place-items-center rounded-[7px] ${on ? 'bg-accent text-accent-foreground' : 'bg-muted text-[color:var(--track)]'}`}
                    >
                      <Icono aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                    </span>
                  );
                })}
              </span>

              <span className="w-[180px] shrink-0">
                <span className="block text-[11.5px] font-semibold">{a.publicacion}</span>
                <span className={`${mono} mt-0.5 block text-[10.5px] ${a.vencePronto ? 'text-[color:var(--warning-foreground)]' : 'text-muted-foreground'}`}>
                  {a.vigencia}
                </span>
              </span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

/* ───────────────────────────── Composer ───────────────────────────── */

function Composer({
  rol,
  audiencia,
  accion,
  pending,
  error,
  formKey,
}: {
  rol: 'admin' | 'super_admin';
  audiencia: Record<TipoAlcance, number>;
  accion: (formData: FormData) => void;
  pending: boolean;
  error?: string;
  formKey: number;
}) {
  const permitidos = ALCANCE_POR_ROL[rol];
  const [alcance, setAlcance] = useState<TipoAlcance>('comunidad');
  const [prioridad, setPrioridad] = useState<Prioridad>('normal');
  const [correo, setCorreo] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);

  const canales = ['in_app', ...(correo ? ['correo'] : []), ...(whatsapp ? ['whatsapp'] : [])].join(',');

  return (
    <form key={formKey} action={accion} className="mt-4 rounded-xl border border-border bg-card p-5 shadow-rest">
      <input type="hidden" name="alcance" value={alcance} />
      <input type="hidden" name="prioridad" value={prioridad} />
      <input type="hidden" name="canales" value={canales} />

      <div className="flex items-center gap-2.5">
        <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Nuevo anuncio</p>
        <span
          title="Redactar con Eco — próximamente (por API)"
          className="inline-flex h-8 cursor-not-allowed items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-[color:var(--info-border)] bg-[color:var(--info-surface)] px-3 text-[12px] font-bold text-[color:var(--info-foreground)] opacity-70"
        >
          <Sparkles aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          Redactar con Eco
        </span>
      </div>

      <label className="mt-4 block">
        <span className="block text-[11.5px] font-semibold">Título</span>
        <input
          name="titulo"
          type="text"
          required
          maxLength={90}
          placeholder="Ya está abierto el módulo de Doppler renal"
          className={`mt-1.5 h-[46px] w-full rounded-[10px] border border-border bg-card px-3.5 text-[15px] font-bold text-foreground outline-none transition-colors focus:border-secondary ${focusRing}`}
        />
      </label>

      <label className="mt-3.5 block">
        <span className="block text-[11.5px] font-semibold">Cuerpo</span>
        <textarea
          name="cuerpo"
          required
          rows={4}
          placeholder="Doctoras y doctores: desde hoy pueden entrar al módulo…"
          className={`mt-1.5 w-full rounded-[10px] border border-border bg-card px-3.5 py-3 text-[13.5px] leading-relaxed text-foreground outline-none transition-colors focus:border-secondary ${focusRing}`}
        />
      </label>

      {/* segmentación: el rol acota */}
      <div className="mt-3.5">
        <span className="block text-[11.5px] font-semibold">A quién llega</span>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {(Object.keys(ETIQUETA_ALCANCE) as TipoAlcance[]).map((t) => {
            const puede = permitidos.includes(t);
            const on = alcance === t;
            return (
              <button
                key={t}
                type="button"
                disabled={!puede}
                onClick={() => setAlcance(t)}
                aria-pressed={on}
                className={`inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                  !puede
                    ? 'cursor-not-allowed border-border bg-card text-[color:var(--track)]'
                    : on
                      ? 'border-transparent bg-accent text-accent-foreground'
                      : `border-border bg-card ${softText} hover:bg-muted`
                }`}
              >
                {!puede && <Lock aria-hidden className="h-3 w-3" strokeWidth={2} />}
                {ETIQUETA_ALCANCE[t]}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-[11px] border border-primary bg-accent px-3.5 py-3">
          <Users aria-hidden className="h-[17px] w-[17px] shrink-0 text-accent-foreground" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 text-[12.5px] font-bold">{ETIQUETA_ALCANCE[alcance]}</span>
          <span className={`${mono} shrink-0 text-[11px] font-bold text-accent-foreground`}>{audiencia[alcance]} personas</span>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Segmentar por programa o grupo requiere el padrón de CORA; se conecta en la integración con el ERP (§11).
        </p>
      </div>

      {/* canales */}
      <div className="mt-3.5">
        <span className="block text-[11.5px] font-semibold">Canales</span>
        <div className="mt-2.5 flex flex-col gap-2">
          <Canalito icono="in_app" titulo="In-app" sub="Aparece en el home del alumno" fijo on />
          <Canalito icono="correo" titulo="Correo" sub="Se envía a los correos de la audiencia" on={correo} onToggle={() => setCorreo((v) => !v)} />
          <Canalito icono="whatsapp" titulo="WhatsApp" sub="Resérvelo para lo urgente: llega al teléfono" on={whatsapp} onToggle={() => setWhatsapp((v) => !v)} />
        </div>
      </div>

      {/* prioridad + caducidad */}
      <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2">
        <div>
          <span className="block text-[11.5px] font-semibold">Prioridad</span>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {(['normal', 'importante', 'urgente'] as Prioridad[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPrioridad(p)}
                aria-pressed={prioridad === p}
                className={`h-9 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-semibold transition-colors ${focusRing} ${
                  prioridad === p ? PRIORIDAD[p].clase : `border-border bg-card ${softText} hover:bg-muted`
                }`}
              >
                {PRIORIDAD[p].etiqueta}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="block text-[11.5px] font-semibold">Caduca el (obligatorio)</span>
          <span className="mt-2.5 flex h-10 items-center gap-2.5 rounded-[10px] border border-border bg-card px-3.5">
            <Calendar aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <input name="vigenteHasta" type="date" required className="w-full min-w-0 bg-transparent text-[12.5px] font-semibold text-foreground outline-none" />
          </span>
          <span className="mt-1.5 block text-[11px] text-muted-foreground">Al vencer, el anuncio sale del home solo.</span>
        </label>
      </div>

      {error && (
        <p className="mt-3.5 flex items-center gap-2 rounded-[10px] border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-3.5 py-2.5 text-[12px] font-semibold text-[color:var(--destructive-foreground)]">
          <AlertTriangle aria-hidden className="h-4 w-4 shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}

      <div className="mt-4 flex items-center justify-end gap-2.5 border-t border-border pt-4">
        <button
          type="submit"
          disabled={pending}
          className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-5 text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white disabled:opacity-60 ${focusRing}`}
        >
          <Send aria-hidden className="h-4 w-4" strokeWidth={1.75} />
          {pending ? 'Publicando…' : 'Publicar ahora'}
        </button>
      </div>
    </form>
  );
}

function Canalito({
  icono,
  titulo,
  sub,
  on,
  fijo,
  onToggle,
}: {
  icono: Canal;
  titulo: string;
  sub: string;
  on: boolean;
  fijo?: boolean;
  onToggle?: () => void;
}) {
  const Icono = ICONO_CANAL[icono];
  return (
    <div className={`flex items-center gap-3 rounded-[11px] border px-3.5 py-3 ${on ? 'border-primary bg-accent' : 'border-border bg-card'}`}>
      <span aria-hidden className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] ${on ? 'bg-card text-accent-foreground' : `bg-muted ${softText}`}`}>
        <Icono className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-bold">{titulo}</span>
        <span className={`mt-0.5 block text-[11px] ${on ? 'text-accent-foreground' : 'text-muted-foreground'}`}>{sub}</span>
      </span>
      {fijo ? (
        <span className="inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[10px] font-bold text-muted-foreground">
          <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
          Siempre
        </span>
      ) : (
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={titulo}
          onClick={onToggle}
          className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${focusRing} ${on ? 'bg-primary' : 'bg-[color:var(--track)]'}`}
        >
          <span aria-hidden className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-card transition-all ${on ? 'right-0.5' : 'left-0.5'}`} />
        </button>
      )}
    </div>
  );
}
