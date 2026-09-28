'use client';

/**
 * Bloques de MI PERFIL (§3 de la spec). Ficha con portada, no formulario. Cada
 * bloque recibe datos + callbacks (los stubs se cablean en perfil-cliente.tsx).
 * Tokens de globals.css; mono (tabular) en cifras/matrícula/folios.
 */

import { useMemo, useState } from 'react';
import {
  Award,
  Camera,
  ChevronRight,
  Clock,
  Eye,
  Flame,
  FolderCheck,
  GraduationCap,
  MapPin,
  Medal,
  MessagesSquare,
  MessageSquare,
  Pencil,
  Stethoscope,
  Trophy,
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
import { AvatarPerfil, Barra, Campo, inputBase } from './ui';

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

// ══ 3.1 · Portada ═══════════════════════════════════════════════════════════
export function PortadaPerfil({
  alumno,
  cora,
  cifras,
  especialidad,
  onEditar,
  onVerComoMeVen,
  onCambiarFoto,
  onAbrirCifra,
}: {
  alumno: AlumnoPerfil;
  cora: CoraDatos;
  cifras: Cifra[];
  especialidad: string;
  onEditar: () => void;
  onVerComoMeVen: () => void;
  onCambiarFoto: () => void;
  onAbrirCifra: (c: Cifra) => void;
}) {
  const ini = iniciales(alumno.nombre);
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-rest">
      {/* Banda navy con un solo degradado radial teal (o portada) */}
      <div
        className="relative h-[132px] bg-sidebar"
        style={
          alumno.portadaUrl
            ? { backgroundImage: `url(${alumno.portadaUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : {
                backgroundImage:
                  'radial-gradient(120% 160% at 85% 0%, color-mix(in srgb, var(--secondary) 62%, transparent), transparent 62%)',
              }
        }
      />

      <div className="px-5 pb-5 sm:px-6">
        <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
          {/* Avatar + cambiar foto */}
          <div className="relative w-fit">
            <AvatarPerfil ini={ini} url={alumno.avatarUrl} size={96} anillo />
            <button
              type="button"
              onClick={onCambiarFoto}
              aria-label="Cambiar foto"
              className={`absolute bottom-0.5 right-0.5 grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-sidebar text-sidebar-foreground transition-colors hover:bg-secondary ${focus}`}
            >
              <Camera className="h-[15px] w-[15px]" strokeWidth={1.75} />
            </button>
          </div>

          {/* Identidad */}
          <div className="min-w-0 flex-1 sm:pb-1">
            <h1 className="truncate text-[24px] font-extrabold leading-tight tracking-[-0.02em] text-foreground">
              {alumno.nombre}
            </h1>
            <p className="mt-0.5 truncate text-[13px] text-foreground-soft">
              {[especialidad, cora.programa, cora.grupo].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted-foreground">
              <span className={mono}>{cora.matricula}</span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" strokeWidth={1.75} />
                {alumno.sede}
              </span>
              <span aria-hidden>·</span>
              <span>en el campus desde {alumno.enCampusDesde}</span>
            </p>
          </div>

          {/* Acciones */}
          <div className="flex shrink-0 items-center gap-2 sm:pb-1">
            <button
              type="button"
              onClick={onVerComoMeVen}
              className={`inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-secondary ${focus}`}
            >
              <Eye className="h-[17px] w-[17px]" strokeWidth={1.75} />
              <span className="hidden sm:inline">Ver como me ven</span>
            </button>
            <button
              type="button"
              onClick={onEditar}
              className={`inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-secondary-foreground ${focus}`}
            >
              <Pencil className="h-[17px] w-[17px]" strokeWidth={1.75} />
              Editar perfil
            </button>
          </div>
        </div>

        {/* Cuatro cifras */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-5 sm:grid-cols-4">
          {cifras.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onAbrirCifra(c)}
              className={`group flex items-start justify-between rounded-xl border border-border px-4 py-3.5 text-left transition-colors hover:border-primary hover:bg-accent ${focus}`}
            >
              <span className="min-w-0">
                <span className={`block text-[22px] font-extrabold leading-none text-foreground ${mono}`}>{c.valor}</span>
                <span className="mt-1.5 block text-[12.5px] font-semibold text-foreground">{c.etiqueta}</span>
                <span className="block text-[11.5px] text-muted-foreground">{c.detalle}</span>
              </span>
              <ChevronRight
                className="h-[18px] w-[18px] shrink-0 text-muted-foreground transition-colors group-hover:text-secondary"
                strokeWidth={1.75}
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══ 3.2 · Sobre mí ══════════════════════════════════════════════════════════
export function SobreMi({
  texto,
  intereses,
  onGuardar,
}: {
  texto: string;
  intereses: string[];
  onGuardar: (texto: string, intereses: string[]) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(texto);
  const [tags, setTags] = useState<string[]>(intereses);
  const [nuevo, setNuevo] = useState('');

  const iniciar = () => {
    setBorrador(texto);
    setTags(intereses);
    setEditando(true);
  };
  const agregar = () => {
    const t = ('#' + nuevo.replace(/^#/, '').trim()).toLowerCase();
    if (t.length > 1 && tags.length < 8 && !tags.includes(t)) setTags((x) => [...x, t]);
    setNuevo('');
  };
  const guardar = () => {
    onGuardar(borrador.trim(), tags);
    setEditando(false);
  };

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-rest">
      <header className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-foreground">Sobre mí</h2>
        <span className="text-[11.5px] text-muted-foreground">visible para la comunidad del Ateneo</span>
        {!editando && (
          <button
            type="button"
            onClick={iniciar}
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
              onClick={() => setEditando(false)}
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

// ══ 3.3 · Datos de contacto (editable) ══════════════════════════════════════
export function ContactoForm({
  contacto,
  onGuardar,
}: {
  contacto: Contacto;
  onGuardar: (c: Contacto) => void;
}) {
  const [c, setC] = useState<Contacto>(contacto);
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

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-rest">
      <header className="flex items-center gap-2">
        <h2 className="text-[15px] font-bold text-foreground">Datos de contacto</h2>
        <span className="text-[11.5px] text-muted-foreground">puede editarlos usted</span>
      </header>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Campo label="Nombre para mostrar">
          <input className={inputBase} value={c.nombre} onChange={(e) => set('nombre', e.target.value)} />
        </Campo>
        <Campo label="Especialidad">
          <input className={inputBase} value={c.especialidad} onChange={(e) => set('especialidad', e.target.value)} />
        </Campo>
        <Campo
          label="Correo"
          nota={correoValido ? 'Aquí llegan avisos y el enlace para entrar.' : undefined}
        >
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
          <input
            className={`${inputBase} ${mono}`}
            value={c.whatsapp}
            onChange={(e) => set('whatsapp', e.target.value)}
          />
        </Campo>
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          disabled={!cambiado}
          onClick={() => setC(contacto)}
          className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13px] font-semibold text-foreground-soft transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${focus}`}
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
