'use client';

/**
 * Secciones de AJUSTES (§4 de la spec). Columna de interruptores; cada cambio se
 * guarda solo (optimista, lo maneja ajustes-cliente.tsx). La nav hace scroll a
 * cada sección (IntersectionObserver marca la visible). Tokens de globals.css;
 * las miniaturas de tema (§4.3) son las ÚNICAS con hex (son muestras, no UI).
 */

import {
  Bell,
  Globe,
  KeyRound,
  LogOut,
  Monitor,
  Shield,
  Smartphone,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { mono, kickerMini } from '@/components/tokens';
import type {
  AjustesData,
  Canal,
  CuentaPref,
  IdiomaPref,
  LecturaPref,
  PrivacidadPref,
  SeccionAjustes,
  TemaLectura,
} from './tipos';
import { TAMANOS_LECTURA } from './tipos';
import { Interruptor, Switch, Tarjeta } from './ui';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card';

// ══ 4.1 · Nav (sticky) ══════════════════════════════════════════════════════
const NAV: { id: SeccionAjustes; etiqueta: string; icono: LucideIcon }[] = [
  { id: 'notificaciones', etiqueta: 'Notificaciones', icono: Bell },
  { id: 'privacidad', etiqueta: 'Privacidad', icono: Shield },
  { id: 'lectura', etiqueta: 'Lectura y accesibilidad', icono: Type },
  { id: 'cuenta', etiqueta: 'Cuenta y acceso', icono: KeyRound },
  { id: 'idioma', etiqueta: 'Idioma y región', icono: Globe },
];

export function NavAjustes({
  activa,
  onIr,
  onCerrarSesion,
}: {
  activa: SeccionAjustes;
  onIr: (s: SeccionAjustes) => void;
  onCerrarSesion: () => void;
}) {
  return (
    <nav aria-label="Secciones de ajustes" className="sticky top-6 hidden lg:block">
      <div className="flex flex-col gap-1">
        {NAV.map(({ id, etiqueta, icono: Icono }) => {
          const on = activa === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onIr(id)}
              aria-current={on ? 'true' : undefined}
              className={`flex h-11 items-center gap-2.5 rounded-[10px] px-3 text-left text-[13px] transition-colors ${focus} ${
                on ? 'bg-accent font-bold text-secondary' : 'font-medium text-foreground-soft hover:bg-muted'
              }`}
            >
              <Icono className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
              <span className="min-w-0 truncate">{etiqueta}</span>
            </button>
          );
        })}
      </div>
      <div aria-hidden className="my-2 h-px bg-border" />
      <button
        type="button"
        onClick={onCerrarSesion}
        className={`flex h-11 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[13px] font-medium text-foreground-soft transition-colors hover:bg-muted ${focus}`}
      >
        <LogOut className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
        Cerrar sesión
      </button>
    </nav>
  );
}

// ══ 4.2 · Notificaciones ════════════════════════════════════════════════════
export function Notificaciones({
  data,
  onCanal,
  onResumen,
  onNoMolestar,
}: {
  data: AjustesData;
  onCanal: (avisoId: string, canal: Canal, v: boolean) => void;
  onResumen: (v: boolean) => void;
  onNoMolestar: (p: Partial<AjustesData['noMolestar']>) => void;
}) {
  return (
    <Tarjeta
      titulo="Notificaciones"
      accion={
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
          🔒 in-app siempre está activo
        </span>
      }
    >
      <p className="-mt-1 mb-4 text-[12.5px] text-muted-foreground">
        Elija por dónde le llega cada aviso. WhatsApp llega al teléfono: resérvelo para lo que no puede esperar.
      </p>

      <div role="table" className="overflow-hidden rounded-xl border border-border">
        <div
          role="row"
          className={`grid grid-cols-[1fr_88px_88px_88px] items-center gap-2 border-b border-border bg-muted px-4 py-2.5 ${kickerMini} text-muted-foreground`}
        >
          <span role="columnheader">Aviso</span>
          <span role="columnheader" className="text-center">In-app</span>
          <span role="columnheader" className="text-center">Correo</span>
          <span role="columnheader" className="text-center">WhatsApp</span>
        </div>
        {data.avisos.map((av, i) => (
          <div
            key={av.id}
            role="row"
            className={`grid grid-cols-[1fr_88px_88px_88px] items-center gap-2 px-4 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
          >
            <div role="cell" className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground">{av.titulo}</p>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground">{av.detalle}</p>
            </div>
            <span role="cell" className="text-center text-[12px] font-semibold text-muted-foreground">
              Siempre
            </span>
            <span role="cell" className="flex justify-center">
              <Switch
                encendido={av.canales.correo}
                onCambio={(v) => onCanal(av.id, 'correo', v)}
                etiqueta={`${av.titulo} por correo`}
              />
            </span>
            <span role="cell" className="flex justify-center">
              <Switch
                encendido={av.canales.whatsapp}
                onCambio={(v) => onCanal(av.id, 'whatsapp', v)}
                etiqueta={`${av.titulo} por WhatsApp`}
              />
            </span>
          </div>
        ))}
      </div>

      <div className="mt-1">
        <Interruptor
          titulo="Resumen semanal por correo"
          detalle="Los lunes: su avance, lo que viene y lo más visto del Ateneo."
          encendido={data.resumenSemanal}
          onCambio={onResumen}
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-border py-3.5">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-1.5 text-[13.5px] font-semibold text-foreground">
              No molestar de
              <input
                type="time"
                value={data.noMolestar.desde}
                onChange={(e) => onNoMolestar({ desde: e.target.value })}
                className={`h-9 w-[88px] rounded-[8px] border border-border bg-card px-2 text-[13px] text-foreground outline-none focus:border-secondary ${mono} ${focus}`}
              />
              a
              <input
                type="time"
                value={data.noMolestar.hasta}
                onChange={(e) => onNoMolestar({ hasta: e.target.value })}
                className={`h-9 w-[88px] rounded-[8px] border border-border bg-card px-2 text-[13px] text-foreground outline-none focus:border-secondary ${mono} ${focus}`}
              />
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Nada de correo ni WhatsApp en ese horario; los avisos esperan en el campus.
            </p>
          </div>
          <Switch
            encendido={data.noMolestar.activo}
            onCambio={(v) => onNoMolestar({ activo: v })}
            etiqueta="No molestar"
          />
        </div>
      </div>
    </Tarjeta>
  );
}

// ══ 4.3 · Lectura y accesibilidad ═══════════════════════════════════════════
const TEMAS: { id: TemaLectura; etiqueta: string; bg: string; text: string; line: string }[] = [
  { id: 'claro', etiqueta: 'Claro', bg: '#F8F9FA', text: '#111827', line: '#E5E7EB' },
  { id: 'sepia', etiqueta: 'Sepia', bg: '#F4ECD8', text: '#4A3A2C', line: '#E0D3B8' },
  { id: 'oscuro', etiqueta: 'Oscuro', bg: '#1A1A1A', text: '#E0E0E0', line: '#333333' },
];

export function Lectura({ data, onCambio }: { data: LecturaPref; onCambio: (p: Partial<LecturaPref>) => void }) {
  const idx = TAMANOS_LECTURA.indexOf(data.tamano as (typeof TAMANOS_LECTURA)[number]);
  const i = idx === -1 ? 1 : idx;
  return (
    <Tarjeta titulo="Lectura y accesibilidad">
      <p className="-mt-1 mb-4 text-[12.5px] text-muted-foreground">
        Se aplica en las lecciones de lectura. También puede cambiarlo desde la barra de cada lección.
      </p>

      <div role="radiogroup" aria-label="Tema de lectura" className="grid grid-cols-3 gap-3">
        {TEMAS.map((t) => {
          const on = data.tema === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onCambio({ tema: t.id })}
              className={`overflow-hidden rounded-xl border-2 text-left transition-colors ${focus} ${
                on ? 'border-primary' : 'border-border hover:border-[color:var(--track)]'
              }`}
            >
              <div className="p-3" style={{ backgroundColor: t.bg }}>
                <span className="text-[16px] font-bold" style={{ color: t.text }}>
                  Aa
                </span>
                <span className="mt-2 block h-1.5 w-full rounded-full" style={{ backgroundColor: t.line }} />
                <span className="mt-1 block h-1.5 w-[85%] rounded-full" style={{ backgroundColor: t.line }} />
                <span className="mt-1 block h-1.5 w-[70%] rounded-full" style={{ backgroundColor: t.line }} />
              </div>
              <div className="flex items-center gap-2 px-3 py-2.5">
                <span
                  className={`grid h-4 w-4 place-items-center rounded-full border-2 ${
                    on ? 'border-[5px] border-primary' : 'border-border'
                  }`}
                />
                <span className="text-[12.5px] font-semibold text-foreground">{t.etiqueta}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center gap-4 border-t border-border pt-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-foreground">Tamaño de la letra</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Para el texto de las lecciones.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Reducir tamaño"
            disabled={i <= 0}
            onClick={() => onCambio({ tamano: TAMANOS_LECTURA[Math.max(0, i - 1)] })}
            className={`grid h-10 w-10 place-items-center rounded-[10px] border border-border bg-card text-[16px] font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 ${focus}`}
          >
            −
          </button>
          <span className={`w-12 text-center text-[14px] font-bold text-foreground ${mono}`}>{data.tamano}</span>
          <button
            type="button"
            aria-label="Aumentar tamaño"
            disabled={i >= TAMANOS_LECTURA.length - 1}
            onClick={() => onCambio({ tamano: TAMANOS_LECTURA[Math.min(TAMANOS_LECTURA.length - 1, i + 1)] })}
            className={`grid h-10 w-10 place-items-center rounded-[10px] border border-border bg-card text-[16px] font-bold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 ${focus}`}
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-1">
        <Interruptor
          titulo="Reducir animaciones"
          detalle="Quita transiciones y el conteo animado del anillo de competencia."
          encendido={data.reducirAnimaciones}
          onCambio={(v) => onCambio({ reducirAnimaciones: v })}
        />
        <Interruptor
          titulo="Subtítulos en los videos por defecto"
          detalle="Cuando la lección los tenga."
          encendido={data.subtitulos}
          onCambio={(v) => onCambio({ subtitulos: v })}
        />
      </div>
    </Tarjeta>
  );
}

// ══ 4.4 · Privacidad ════════════════════════════════════════════════════════
export function Privacidad({
  data,
  onCambio,
}: {
  data: PrivacidadPref;
  onCambio: (p: Partial<PrivacidadPref>) => void;
}) {
  return (
    <Tarjeta titulo="Privacidad">
      <div className="mb-2 flex items-start gap-3 rounded-xl bg-accent p-3.5">
        <Shield className="mt-0.5 h-[18px] w-[18px] shrink-0 text-secondary" strokeWidth={1.75} />
        <p className="text-[12.5px] leading-relaxed text-[color:var(--accent-foreground)]">
          Su avance académico y su competencia nunca se muestran a otros alumnos. Esto controla lo social.
        </p>
      </div>
      <Interruptor
        primera
        titulo="Perfil visible en el Ateneo"
        detalle="Nombre, especialidad, sede y lo que publica."
        encendido={data.perfilVisible}
        onCambio={(v) => onCambio({ perfilVisible: v })}
      />
      <Interruptor
        titulo="Aceptar solicitudes de colega"
        detalle="Si lo apaga, nadie nuevo puede agregarlo."
        encendido={data.aceptarColegas}
        onCambio={(v) => onCambio({ aceptarColegas: v })}
      />
      <Interruptor
        titulo="Mostrar cuándo estoy en línea"
        detalle="En Consultas y en el Ateneo."
        encendido={data.mostrarEnLinea}
        onCambio={(v) => onCambio({ mostrarEnLinea: v })}
      />
      <Interruptor
        titulo="Mis casos pueden ir a la Biblioteca"
        detalle="Si su docente los aprueba, anonimizados, nunca con datos del paciente."
        encendido={data.casosABiblioteca}
        onCambio={(v) => onCambio({ casosABiblioteca: v })}
      />
    </Tarjeta>
  );
}

// ══ 4.5 · Cuenta y acceso ═══════════════════════════════════════════════════
const PROVEEDOR_LABEL: Record<'google' | 'microsoft', string> = {
  google: 'Google',
  microsoft: 'Microsoft',
};

export function CuentaAcceso({
  data,
  onConectar,
  onDesconectar,
  onCambiarContrasena,
  onCerrarSesion,
}: {
  data: CuentaPref;
  onConectar: (p: 'google' | 'microsoft') => void;
  onDesconectar: (p: 'google' | 'microsoft') => void;
  onCambiarContrasena: () => void;
  onCerrarSesion: (id: string) => void;
}) {
  return (
    <Tarjeta titulo="Cuenta y acceso">
      {/* Cuentas vinculadas */}
      <div className="flex flex-col gap-2">
        {data.vinculadas.map((v) => (
          <div key={v.proveedor} className="flex items-center gap-3 rounded-[10px] border border-border px-3.5 py-3">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-muted text-[13px] font-bold text-foreground ${mono}`}>
              {PROVEEDOR_LABEL[v.proveedor][0]}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-foreground">{PROVEEDOR_LABEL[v.proveedor]}</p>
              <p className="truncate text-[11.5px] text-muted-foreground">
                {v.conectada ? v.correo : 'sin conectar'}
              </p>
            </div>
            {v.conectada ? (
              <button
                type="button"
                onClick={() => onDesconectar(v.proveedor)}
                className={`inline-flex h-9 items-center rounded-full bg-accent px-3 text-[12px] font-semibold text-secondary transition-colors hover:bg-[color:var(--accent)]/70 ${focus}`}
              >
                Conectada
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConectar(v.proveedor)}
                className={`inline-flex h-9 items-center rounded-[10px] border border-border px-3.5 text-[12px] font-semibold text-secondary transition-colors hover:bg-accent ${focus}`}
              >
                Conectar
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Contraseña */}
      <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-foreground">Contraseña</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">cambiada {data.contrasenaCambiada}</p>
        </div>
        <button
          type="button"
          onClick={onCambiarContrasena}
          className={`inline-flex h-10 items-center rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-secondary ${focus}`}
        >
          Cambiar
        </button>
      </div>

      {/* Sesiones abiertas */}
      <div className="mt-4 border-t border-border pt-4">
        <p className={`mb-2.5 ${kickerMini} text-muted-foreground`}>Sesiones abiertas</p>
        <div className="flex flex-col gap-2">
          {data.sesiones.map((s) => {
            const Icono = s.tipo === 'celular' ? Smartphone : Monitor;
            return (
              <div key={s.id} className="flex items-center gap-3 rounded-[10px] border border-border px-3.5 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] bg-muted text-foreground-soft">
                  <Icono className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
                    {s.dispositivo}
                    {s.actual && (
                      <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-bold text-secondary">
                        esta
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11.5px] text-muted-foreground">{s.lugar}</p>
                </div>
                {!s.actual && (
                  <button
                    type="button"
                    onClick={() => onCerrarSesion(s.id)}
                    className={`inline-flex h-9 items-center rounded-[10px] border border-border px-3 text-[12px] font-semibold text-foreground-soft transition-colors hover:bg-muted ${focus}`}
                  >
                    Cerrar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Tarjeta>
  );
}

// ══ 4.6 · Idioma y región ═══════════════════════════════════════════════════
const ZONAS: { valor: string; etiqueta: string }[] = [
  { valor: 'America/Mexico_City', etiqueta: 'Ciudad de México (GMT-6)' },
  { valor: 'America/Tijuana', etiqueta: 'Tijuana (GMT-8)' },
  { valor: 'America/Cancun', etiqueta: 'Cancún (GMT-5)' },
];

const selectBase =
  'h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[13.5px] text-foreground outline-none transition-colors focus:border-secondary';

export function IdiomaRegion({ data, onCambio }: { data: IdiomaPref; onCambio: (p: Partial<IdiomaPref>) => void }) {
  return (
    <Tarjeta titulo="Idioma y región">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[12px] font-semibold text-foreground-soft">Idioma</span>
          <select
            value={data.idioma}
            onChange={(e) => onCambio({ idioma: e.target.value as IdiomaPref['idioma'] })}
            className={`mt-1.5 ${selectBase} ${focus}`}
          >
            <option value="es-MX">Español (México)</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[12px] font-semibold text-foreground-soft">Zona horaria</span>
          <select
            value={data.zona}
            onChange={(e) => onCambio({ zona: e.target.value })}
            className={`mt-1.5 ${selectBase} ${focus}`}
          >
            {ZONAS.map((z) => (
              <option key={z.valor} value={z.valor}>
                {z.etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-3 text-[12px] text-muted-foreground">Las horas de clases y entregas se muestran en su zona.</p>
    </Tarjeta>
  );
}
