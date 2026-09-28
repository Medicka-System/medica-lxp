'use client';

/**
 * Bloques de MI PERFIL (§3 de la spec). Ficha con portada, no formulario. Cada
 * bloque recibe datos + callbacks (los stubs se cablean en perfil-cliente.tsx).
 * Tokens de globals.css; mono (tabular) en cifras/matrícula/folios.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Camera,
  Clock,
  Eye,
  Flame,
  FolderCheck,
  GraduationCap,
  MapPin,
  Medal,
  MessageCircle,
  MessagesSquare,
  MessageSquare,
  Pencil,
  ScanLine,
  Stethoscope,
  Trophy,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { mono } from '@/components/tokens';
import { iniciales } from '@/components/avatar';
import type {
  Cifra,
  Contacto,
  CoraDatos,
  AlumnoPerfil,
  CertificadoPerfil,
  DominioPerfil,
  InsigniaItem,
} from './tipos';
import { Barra, Campo, inputBase } from './ui';

/** Un ícono lucide por cifra (§C de la spec del header). */
const ICONO_CIFRA: Record<Cifra['id'], LucideIcon> = {
  horas: Clock,
  casos: ScanLine,
  colegas: Users,
  aportes: MessageCircle,
};

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ICONOS_INSIGNIA: Record<string, LucideIcon> = {
  Clock,
  Stethoscope,
  Flame,
  FolderCheck,
  MessagesSquare,
  Trophy,
  Award,
};

// ══ 3.1 · Portada (header · spec frame 42a) ═════════════════════════════════
// Bordes de las celdas de KPI: en 4 col (lg) todas menos la 1ª llevan divisor
// izquierdo; en 2 col (<lg) el divisor va en las celdas impares y la 2ª fila
// (i≥2) suma divisor superior.
const BORDE_KPI = [
  '',
  'border-l border-border',
  'border-t border-border lg:border-t-0 lg:border-l',
  'border-l border-t border-border lg:border-t-0',
];

export function PortadaPerfil({
  alumno,
  cora,
  cifras,
  especialidad,
  editando = false,
  onEditar,
  onVerComoMeVen,
  onCambiarFoto,
  onCambiarPortada,
  onAbrirCifra,
}: {
  alumno: AlumnoPerfil;
  cora: CoraDatos;
  cifras: Cifra[];
  especialidad: string;
  editando?: boolean;
  onEditar: () => void;
  onVerComoMeVen: () => void;
  onCambiarFoto: () => void;
  onCambiarPortada: () => void;
  onAbrirCifra: (c: Cifra) => void;
}) {
  const ini = iniciales(alumno.nombre);
  const contexto = [especialidad, cora.programa, cora.grupo].filter(Boolean).join(' · ');

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
      {/* A · Banda de portada */}
      <div className="relative h-24 bg-sidebar sm:h-[120px]">
        {alumno.portadaUrl ? (
          <img src={alumno.portadaUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 160% at 88% 0%, color-mix(in srgb, var(--secondary) 60%, transparent) 0%, transparent 62%)',
            }}
          />
        )}
        <button
          type="button"
          onClick={onCambiarPortada}
          className={`absolute right-4 top-4 inline-flex h-[34px] items-center gap-[7px] rounded-[9px] border border-white/30 bg-[color:var(--sidebar)]/40 px-3 text-[12px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15 ${focus}`}
        >
          <Camera aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
          Cambiar portada
        </button>
      </div>

      {/* B · Fila de identidad */}
      <div className="flex flex-wrap items-start gap-5 px-7 pb-[22px] max-sm:px-5">
        {/* B1 · Avatar */}
        <div className="relative -mt-10 shrink-0 sm:-mt-[46px]">
          <span
            aria-hidden
            className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border-4 border-card bg-sidebar text-[26px] font-extrabold text-sidebar-foreground sm:h-24 sm:w-24 sm:text-[30px]"
          >
            {alumno.avatarUrl ? (
              <img src={alumno.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className={mono}>{ini}</span>
            )}
          </span>
          <button
            type="button"
            onClick={onCambiarFoto}
            aria-label="Cambiar foto"
            className={`absolute bottom-0.5 right-0 grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-primary text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-secondary-foreground ${focus}`}
          >
            <Camera aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </button>
        </div>

        {/* B2 · Identidad */}
        <div className="min-w-0 flex-1 pt-4">
          <h1 className="truncate text-[20px] font-extrabold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[24px]">
            {alumno.nombre}
          </h1>
          {contexto && <p className="mt-[5px] truncate text-[13px] text-foreground-soft">{contexto}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] text-muted-foreground">
            <span className={`${mono} font-semibold`}>{cora.matricula}</span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
              {alumno.sede}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
              en el campus desde {alumno.enCampusDesde}
            </span>
          </div>
        </div>

        {/* B3 · Acciones */}
        <div className="flex shrink-0 gap-2 pt-4 max-sm:w-full">
          <button
            type="button"
            onClick={onVerComoMeVen}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-secondary max-sm:flex-1 max-sm:justify-center ${focus}`}
          >
            <Eye aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            Ver como me ven
          </button>
          <button
            type="button"
            onClick={onEditar}
            disabled={editando}
            className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] bg-primary px-[15px] text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-secondary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground max-sm:flex-1 max-sm:justify-center ${focus}`}
          >
            <Pencil aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
            {editando ? 'Editando…' : 'Editar perfil'}
          </button>
        </div>
      </div>

      {/* C · Barra de cifras (KPIs) */}
      <div className="grid grid-cols-2 border-t border-border lg:grid-cols-4">
        {cifras.map((c, i) => {
          const Icono = ICONO_CIFRA[c.id] ?? Clock;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onAbrirCifra(c)}
              aria-label={`${c.valor} ${c.etiqueta}, ${c.detalle}`}
              className={`flex items-center gap-[13px] px-[22px] py-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary max-sm:px-4 ${BORDE_KPI[i] ?? ''}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-accent text-secondary">
                <Icono aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="flex items-baseline gap-[7px]">
                  <span className={`text-[22px] font-extrabold leading-none text-foreground ${mono}`}>{c.valor}</span>
                  <span className="truncate text-[12px] font-semibold text-foreground-soft">{c.etiqueta}</span>
                </span>
                <span className="mt-1 block text-[11px] text-muted-foreground">{c.detalle}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ══ 3.2 · Sobre mí (editable, controlado por el modo edición · Fase 2) ═══════
export function SobreMi({
  texto,
  intereses,
  editando,
  onEditar,
  onGuardar,
  onCancelar,
}: {
  texto: string;
  intereses: string[];
  editando: boolean;
  onEditar: () => void;
  onGuardar: (texto: string, intereses: string[]) => void;
  onCancelar: () => void;
}) {
  const [borrador, setBorrador] = useState(texto);
  const [tags, setTags] = useState<string[]>(intereses);
  const [nuevo, setNuevo] = useState('');

  // Al entrar en edición (desde aquí o desde "Editar perfil"), parte del valor real.
  useEffect(() => {
    if (editando) {
      setBorrador(texto);
      setTags(intereses);
      setNuevo('');
    }
  }, [editando, texto, intereses]);

  const agregar = () => {
    const t = ('#' + nuevo.replace(/^#/, '').trim()).toLowerCase();
    if (t.length > 1 && tags.length < 8 && !tags.includes(t)) setTags((x) => [...x, t]);
    setNuevo('');
  };
  const guardar = () => onGuardar(borrador.trim(), tags);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-rest">
      <header className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-foreground">Sobre mí</h2>
        <span className="text-[11.5px] text-muted-foreground">visible para la comunidad del Ateneo</span>
        {!editando && (
          <button
            type="button"
            onClick={onEditar}
            className={`ml-auto rounded-[8px] px-2 py-1 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focus}`}
          >
            Editar
          </button>
        )}
      </header>

      {editando ? (
        <div className="mt-4">
          <div className="relative">
            <textarea
              value={borrador}
              onChange={(e) => setBorrador(e.target.value.slice(0, 280))}
              rows={4}
              maxLength={280}
              className={`w-full resize-none rounded-[10px] border border-border bg-card p-3.5 text-[14px] leading-relaxed text-foreground outline-none transition-colors focus:border-secondary ${focus}`}
            />
            <span className={`pointer-events-none absolute bottom-2.5 right-3 text-[11px] text-muted-foreground ${mono}`}>
              {borrador.length} / 280
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-[12.5px] font-semibold text-secondary"
              >
                {t}
                <button
                  type="button"
                  onClick={() => setTags((x) => x.filter((y) => y !== t))}
                  aria-label={`Quitar ${t}`}
                  className={`grid h-4 w-4 place-items-center rounded-full hover:bg-secondary/10 ${focus}`}
                >
                  <X className="h-3 w-3" strokeWidth={2.4} />
                </button>
              </span>
            ))}
            <input
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  agregar();
                }
              }}
              placeholder="+ interés"
              className={`h-8 w-28 rounded-full border border-dashed border-border bg-card px-3 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground focus:border-secondary ${focus}`}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancelar}
              className={`h-9 rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground-soft transition-colors hover:bg-muted ${focus}`}
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={guardar}
              className={`h-9 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-secondary-foreground ${focus}`}
            >
              Guardar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <p className="max-w-[68ch] text-[14px] leading-relaxed text-foreground [text-wrap:pretty]">
            {texto || 'Aún no has escrito nada sobre ti.'}
          </p>
          {intereses.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {intereses.map((t) => (
                <span
                  key={t}
                  className="inline-flex h-8 items-center rounded-full bg-accent px-3 text-[12.5px] font-semibold text-secondary"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ══ 3.3 · Datos de contacto (editable, bloqueado hasta editar · Fase 2) ══════
export function ContactoForm({
  contacto,
  editando,
  onEditar,
  onGuardar,
  onCancelar,
}: {
  contacto: Contacto;
  editando: boolean;
  onEditar: () => void;
  onGuardar: (c: Contacto) => void;
  onCancelar: () => void;
}) {
  const [c, setC] = useState<Contacto>(contacto);
  // Al entrar en edición, parte del valor real (por si cambió tras un guardado).
  useEffect(() => {
    if (editando) setC(contacto);
  }, [editando, contacto]);

  const correoValido = RE_CORREO.test(c.correo.trim());
  const cambiado = useMemo(
    () =>
      c.nombre !== contacto.nombre ||
      c.especialidad !== contacto.especialidad ||
      c.correo !== contacto.correo ||
      c.whatsapp !== contacto.whatsapp,
    [c, contacto],
  );
  const set = (k: keyof Contacto, v: string) => setC((x) => ({ ...x, [k]: v }));

  const campos: { k: keyof Contacto; label: string; mono?: boolean }[] = [
    { k: 'nombre', label: 'Nombre para mostrar' },
    { k: 'especialidad', label: 'Especialidad' },
    { k: 'correo', label: 'Correo' },
    { k: 'whatsapp', label: 'WhatsApp', mono: true },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-rest">
      <header className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-foreground">Datos de contacto</h2>
        <span className="text-[11.5px] text-muted-foreground">puede editarlos usted</span>
        {!editando && (
          <button
            type="button"
            onClick={onEditar}
            className={`ml-auto rounded-[8px] px-2 py-1 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focus}`}
          >
            Editar
          </button>
        )}
      </header>

      {editando ? (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Campo label="Nombre para mostrar">
              <input className={inputBase} value={c.nombre} onChange={(e) => set('nombre', e.target.value)} />
            </Campo>
            <Campo label="Especialidad">
              <input className={inputBase} value={c.especialidad} onChange={(e) => set('especialidad', e.target.value)} />
            </Campo>
            <Campo label="Correo" nota={correoValido ? 'Aquí llegan avisos y el enlace para entrar.' : undefined}>
              <input
                type="email"
                className={`${inputBase} ${
                  !correoValido && c.correo.length > 0
                    ? 'border-[color:var(--warning-border)] focus:border-[color:var(--warning-border)]'
                    : ''
                }`}
                value={c.correo}
                onChange={(e) => set('correo', e.target.value)}
              />
              {!correoValido && c.correo.length > 0 && (
                <span className="mt-1 block text-[11.5px] font-semibold text-[color:var(--warning-foreground)]">
                  Escriba un correo válido.
                </span>
              )}
            </Campo>
            <Campo label="WhatsApp" nota="Solo para avisos urgentes, si los activa en Ajustes.">
              <input className={`${inputBase} ${mono}`} value={c.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
            </Campo>
          </div>

          <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onCancelar}
              className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13px] font-semibold text-foreground-soft transition-colors hover:bg-muted ${focus}`}
            >
              Descartar
            </button>
            <button
              type="button"
              disabled={!cambiado || !correoValido}
              onClick={() => onGuardar(c)}
              className={`h-11 rounded-[10px] bg-primary px-5 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-secondary-foreground disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground ${focus}`}
            >
              Guardar cambios
            </button>
          </div>
        </>
      ) : (
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {campos.map((f) => (
            <div key={f.k}>
              <dt className="text-[12px] font-semibold text-foreground-soft">{f.label}</dt>
              <dd className={`mt-1.5 truncate text-[13.5px] text-foreground ${f.mono ? mono : ''}`}>
                {contacto[f.k] || <span className="text-muted-foreground">—</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

// ══ 3.4 · Datos académicos (CORA, solo lectura) ═════════════════════════════
export function DatosAcademicos({
  cora,
  onEscribirControlEscolar,
}: {
  cora: CoraDatos;
  onEscribirControlEscolar: () => void;
}) {
  const campos: { label: string; valor: string; mono?: boolean }[] = [
    { label: 'Matrícula', valor: cora.matricula, mono: true },
    { label: 'Programa', valor: cora.programa },
    { label: 'Grupo', valor: cora.grupo },
  ];
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
      <div className="p-5">
        <header className="flex items-center gap-2">
          <h2 className="text-[15px] font-bold text-foreground">Datos académicos</h2>
          <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground`}>
            Solo lectura · desde CORA
          </span>
        </header>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {campos.map((f) => (
            <Campo key={f.label} label={f.label} bloqueado>
              <input
                readOnly
                tabIndex={-1}
                value={f.valor}
                className={`h-11 w-full rounded-[10px] border border-border bg-muted px-3.5 text-[13.5px] text-foreground-soft outline-none ${f.mono ? mono : ''}`}
              />
            </Campo>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted px-5 py-3.5">
        <p className="text-[12.5px] text-muted-foreground">Si algo está mal, lo corrige control escolar.</p>
        <button
          type="button"
          onClick={onEscribirControlEscolar}
          className={`ml-auto inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-secondary ${focus}`}
        >
          <MessageSquare className="h-[16px] w-[16px]" strokeWidth={1.75} />
          Escribir a control escolar
        </button>
      </div>
    </section>
  );
}

// ══ 3.5 · Rail — Dominio ════════════════════════════════════════════════════
export function DominioResumen({ dominio, onVerDetalle }: { dominio: DominioPerfil; onVerDetalle: () => void }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-rest">
      <header className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-foreground">Mi dominio</h2>
        <button
          type="button"
          onClick={onVerDetalle}
          className={`ml-auto rounded-[8px] px-2 py-1 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focus}`}
        >
          Ver a detalle
        </button>
      </header>
      <div className="mt-4">
        <p className={`text-[34px] font-extrabold leading-none text-foreground ${mono}`}>{dominio.general}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">competencia general</p>
      </div>
      <ul className="mt-4 flex flex-col gap-3">
        {dominio.dominios.map((d) => (
          <li key={d.nombre}>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[12.5px] font-semibold text-foreground">{d.nombre}</span>
              {d.enRepaso && (
                <span className="inline-flex items-center rounded-full bg-[color:var(--warning-surface)] px-2 py-0.5 text-[10.5px] font-bold text-[color:var(--warning-foreground)]">
                  en repaso
                </span>
              )}
              <span className={`ml-auto text-[12.5px] font-bold text-foreground ${mono}`}>{d.valor}</span>
            </div>
            <Barra valor={d.valor} repaso={d.enRepaso} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ══ 3.5 · Rail — Insignias ══════════════════════════════════════════════════
export function Insignias({
  insignias,
  total,
  onVerTodas,
}: {
  insignias: InsigniaItem[];
  total: number;
  onVerTodas: () => void;
}) {
  const obtenidas = insignias.filter((i) => i.obtenida).length;
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-rest">
      <header className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-foreground">Insignias</h2>
        <span className={`text-[11.5px] text-muted-foreground ${mono}`}>
          {obtenidas} de {total}
        </span>
        <button
          type="button"
          onClick={onVerTodas}
          className={`ml-auto rounded-[8px] px-2 py-1 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focus}`}
        >
          Ver todas
        </button>
      </header>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {insignias.map((i) => {
          const Icono = ICONOS_INSIGNIA[i.icono] ?? Award;
          return (
            <div key={i.id} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={`grid h-12 w-12 place-items-center rounded-full ${
                  i.obtenida
                    ? 'bg-accent text-secondary'
                    : 'border-2 border-dashed border-[color:var(--track)] text-[color:var(--track)]'
                }`}
              >
                <Icono className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="text-[10.5px] font-semibold leading-tight text-foreground-soft">{i.nombre}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ══ 3.5 · Rail — Certificados ═══════════════════════════════════════════════
export function Certificados({
  certificados,
  onVerTodos,
  onAbrir,
}: {
  certificados: CertificadoPerfil[];
  onVerTodos: () => void;
  onAbrir: (id: string) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-rest">
      <header className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-foreground">Certificados</h2>
        <button
          type="button"
          onClick={onVerTodos}
          className={`ml-auto rounded-[8px] px-2 py-1 text-[12.5px] font-semibold text-secondary transition-colors hover:bg-accent ${focus}`}
        >
          Ver todos
        </button>
      </header>
      <div className="mt-4 flex flex-col gap-2">
        {certificados.length === 0 ? (
          <p className="flex items-center gap-2 rounded-[10px] border border-dashed border-border px-3.5 py-4 text-[12.5px] text-muted-foreground">
            <GraduationCap className="h-[18px] w-[18px]" strokeWidth={1.75} />
            Aún no hay certificados. Llegan al cumplir un hito.
          </p>
        ) : (
          certificados.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onAbrir(c.id)}
              className={`group flex items-center gap-3 rounded-[10px] border border-border px-3 py-3 text-left transition-colors hover:border-primary hover:bg-accent ${focus}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-sidebar text-secondary">
                <GraduationCap className="h-[18px] w-[18px] text-primary" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-foreground">{c.titulo}</span>
                <span className={`block truncate text-[10.5px] text-muted-foreground ${mono}`}>
                  {c.aval} · {c.fecha} · {c.folio}
                </span>
              </span>
              <Medal className="h-[18px] w-[18px] shrink-0 text-secondary" strokeWidth={1.75} />
            </button>
          ))
        )}
      </div>
    </section>
  );
}
