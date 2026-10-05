'use client';

/**
 * PRISMA Studio · Login del STAFF (docente, diseñador, admin) — portado del mock
 * aprobado (Spec B). Tarjeta navy 1180×720 sobre fondo profundo: foto 58% | acceso 42%.
 * Vistas: "login" → "codigo" (2FA) · "recuperar" → "enviado".
 *
 * Cableado a Supabase Auth (cliente navegador, solo AUTH · §2/§10):
 *   onMicrosoft → signInWithOAuth({ provider: 'azure' })  (⚠ requiere habilitar Azure en Supabase)
 *   onEntrar    → signInWithPassword + verificación de rol staff (lxp.perfiles.rol) → enruta por rol
 *   onVerificar → mfa.challengeAndVerify  (2FA — pendiente de backend, dosPasos=false)
 *   onRecuperar → resetPasswordForEmail(email, { redirectTo: '/admin/restablecer' })
 *   onReenviar  → mismo envío, límite 1/min
 * El LXP NUNCA crea usuarios (§10, regla 1): solo autentica contra los de CORA.
 */

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, ArrowRight, Check, Eye, EyeOff, Mail, ShieldCheck } from 'lucide-react';
import { createClienteSupabaseNavegador } from '@/lib/supabase/client';
import { rolStaffActual, type RolStaff } from './acciones';

/* ───────── utilidades ───────── */
const esCorreo = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const anillo =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--sidebar)]';
const campo =
  'h-[46px] w-full rounded-[10px] border bg-white/[0.06] px-3.5 text-[14px] font-medium text-white outline-none transition-colors placeholder:text-[#8ea6bd] focus:border-primary focus:bg-white/[0.09]';
const tintas = {
  titulo: 'text-white',
  apoyo: 'text-[#bcd7e4]',
  label: 'text-[#d6e6ee]',
  tenue: 'text-[#8ea6bd]',
  enlace: 'text-[#8fe0db]',
};

/** Destino por rol tras un login válido (§5B): admin/super → consola; docente/diseñador → su espacio. */
function destinoPorRol(rol: RolStaff): string {
  if (rol === 'docente') return '/docente';
  if (rol === 'disenador_instruccional') return '/studio/programas';
  return '/admin/panel'; // admin | super_admin
}

type ResultadoEntrar = 'ok' | '2fa' | 'error' | 'bloqueado' | 'no-staff';

/* ───────── piezas ───────── */

function FondoProfundo({ children }: { children: ReactNode }) {
  return (
    <main
      className="grid min-h-[100dvh] place-items-center p-6"
      style={{
        background:
          'radial-gradient(70% 60% at 80% 10%,rgba(26,136,128,.28) 0%,rgba(26,136,128,0) 60%),radial-gradient(60% 60% at 10% 100%,rgba(83,195,190,.14) 0%,rgba(83,195,190,0) 60%),#071a33',
      }}
    >
      {children}
    </main>
  );
}

function PanelImagen({ src, mostrarEnlaceCampus }: { src: string; mostrarEnlaceCampus: boolean }) {
  return (
    <div className="relative hidden overflow-hidden rounded-[14px] bg-[#0a2140] lg:block">
      {/* el panel es vertical y la foto apaisada: se ancla al docente y la pizarra */}
      <picture>
        <source srcSet={src.replace(/\.jpg$/, '.webp')} type="image/webp" />
        <img
          src={src}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: '22% 40%' }}
        />
      </picture>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg,rgba(15,45,82,.55) 0%,rgba(15,45,82,.28) 38%,rgba(7,26,51,.94) 100%)',
        }}
      />
      <div className="absolute inset-x-6 top-[22px] flex items-center gap-2.5">
        <span className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-primary text-[12.5px] font-extrabold text-[color:var(--sidebar)]">
          MC
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[14px] font-bold text-white">
            PRISMA <span className="font-medium text-[#8fe0db]">Studio</span>
          </span>
          <span className="text-[10.5px] font-medium text-[#bcd7e4]">Médica Capacitación</span>
        </span>
        {mostrarEnlaceCampus && (
          <a
            href="/login"
            className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.14] px-3 text-[12px] font-semibold text-white no-underline backdrop-blur-[6px] ${anillo}`}
          >
            Ir al campus del alumno <ArrowRight className="h-[13px] w-[13px]" strokeWidth={2} />
          </a>
        )}
      </div>
    </div>
  );
}

function Insignia() {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 self-center rounded-full border border-primary/30 bg-primary/[0.14] px-2.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#8fe0db]">
      <ShieldCheck className="h-3 w-3" strokeWidth={2} />
      Acceso de staff
    </span>
  );
}

function LogoMicrosoft() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <rect x="2" y="2" width="9.5" height="9.5" fill="#f25022" />
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7fba00" />
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00a4ef" />
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#ffb900" />
    </svg>
  );
}

function BotonMicrosoft({ onClick, cargando }: { onClick: () => void; cargando: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={cargando}
      className={`inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[10px] border border-white/20 bg-white text-[14px] font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-70 ${anillo}`}
    >
      <LogoMicrosoft />
      {cargando ? 'Abriendo Microsoft…' : 'Continuar con Microsoft'}
    </button>
  );
}

function Divisor({ children }: { children: ReactNode }) {
  return (
    <div className="my-[22px] flex items-center gap-3">
      <span className="h-px flex-1 bg-white/[0.14]" />
      <span className={`text-[12px] font-medium ${tintas.tenue}`}>{children}</span>
      <span className="h-px flex-1 bg-white/[0.14]" />
    </div>
  );
}

function Campo({
  label,
  accion,
  error,
  children,
}: {
  label: string;
  accion?: ReactNode;
  error?: boolean;
  children: (cls: string) => ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline">
        <span className={`text-[11.5px] font-semibold ${tintas.label}`}>{label}</span>
        {accion && <span className="ml-auto">{accion}</span>}
      </span>
      <span className="relative mt-[7px] block">
        {children(`${campo} ${error ? 'border-[#fecaca]' : 'border-white/[0.14]'}`)}
      </span>
    </label>
  );
}

function CampoContrasena({
  value,
  onChange,
  error,
  accion,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  accion: ReactNode;
}) {
  const [ver, setVer] = useState(false);
  return (
    <Campo label="Contraseña" accion={accion} error={error}>
      {(cls) => (
        <>
          <input
            type={ver ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="current-password"
            placeholder="Su contraseña"
            aria-invalid={error}
            className={`${cls} pr-12`}
          />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className={`absolute right-[5px] top-[5px] grid h-9 w-9 place-items-center rounded-lg text-[#bcd7e4] hover:bg-white/10 hover:text-white ${anillo}`}
          >
            {ver ? (
              <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} />
            ) : (
              <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
            )}
          </button>
        </>
      )}
    </Campo>
  );
}

function Casilla({
  on,
  onCambio,
  children,
}: {
  on: boolean;
  onCambio: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={() => onCambio(!on)}
      className={`inline-flex h-[30px] items-center gap-2.5 self-start text-[12.5px] font-medium ${tintas.label} ${anillo}`}
    >
      <span
        aria-hidden
        className={`grid h-[18px] w-[18px] place-items-center rounded-[5px] border-[1.5px] text-[color:var(--sidebar)] ${on ? 'border-primary bg-primary' : 'border-white/40'}`}
      >
        {on && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

function AvisoError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 text-[12.5px] font-medium leading-relaxed text-[#fecaca]">
      <AlertCircle className="mt-0.5 h-[15px] w-[15px] shrink-0" strokeWidth={2} />
      {children}
    </p>
  );
}

function BotonPrimario({ cargando, children }: { cargando?: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={cargando}
      className={`h-12 w-full rounded-[10px] bg-primary text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-[#a8e0dc] disabled:opacity-70 ${anillo}`}
    >
      {children}
    </button>
  );
}

function Volver({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-[30px] items-center gap-1.5 self-start text-[12.5px] font-semibold ${tintas.apoyo} hover:text-white ${anillo}`}
    >
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
      {children}
    </button>
  );
}

function Titulo({ children, centrado }: { children: ReactNode; centrado?: boolean }) {
  return (
    <h1
      className={`mt-3.5 text-[32px] font-bold leading-[1.12] tracking-[-0.03em] text-white ${centrado ? 'text-center text-[36px]' : ''}`}
    >
      {children}
    </h1>
  );
}

/* ───────── vistas ───────── */

type Cfg = { mostrarMicrosoft: boolean; dosPasos: boolean; mostrarRecordar: boolean };

function VistaLogin({
  cfg,
  email,
  setEmail,
  onMicrosoft,
  onEntrar,
  onOlvido,
  whatsapp,
  error,
  setError,
}: {
  cfg: Cfg;
  email: string;
  setEmail: (v: string) => void;
  onMicrosoft: () => Promise<void>;
  onEntrar: (e: string, p: string, r: boolean) => Promise<ResultadoEntrar>;
  onOlvido: () => void;
  whatsapp: string;
  error: string;
  setError: (v: string) => void;
}) {
  const [pass, setPass] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [ms, setMs] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!esCorreo(email)) return setError('Escriba su correo.');
    if (!pass) return setError('Escriba su contraseña.');
    setCargando(true);
    setError('');
    const r = await onEntrar(email.trim(), pass, recordar);
    setCargando(false);
    if (r === 'error') setError('Correo o contraseña incorrectos. Tras 5 intentos se bloquea 15 minutos.');
    if (r === 'bloqueado') setError('Demasiados intentos. Vuelva a intentarlo en 15 minutos.');
    if (r === 'no-staff') setError('Esta cuenta no tiene acceso al Studio.');
  };

  return (
    <>
      <Insignia />
      <Titulo centrado>
        PRISMA <span className="text-[#8fe0db]">Studio</span>
      </Titulo>
      <p className={`mt-2.5 text-center text-[14px] leading-relaxed ${tintas.apoyo}`}>
        Para docentes, diseñadores y administración. ¿Es alumno?{' '}
        <a href="/login" className={`font-semibold underline ${tintas.enlace}`}>
          Entre al campus
        </a>
      </p>

      {cfg.mostrarMicrosoft && (
        <>
          <div className="mt-7">
            <BotonMicrosoft
              cargando={ms}
              onClick={async () => {
                setMs(true);
                await onMicrosoft();
                setMs(false);
              }}
            />
          </div>
          <Divisor>o con su usuario</Divisor>
        </>
      )}

      <form onSubmit={enviar} noValidate className={`flex flex-col gap-3 ${cfg.mostrarMicrosoft ? '' : 'mt-7'}`}>
        <Campo label="Correo" error={!!error && !esCorreo(email)}>
          {(cls) => (
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              autoComplete="email"
              placeholder="m.vazquez@medicacapacitacion.mx"
              className={cls}
            />
          )}
        </Campo>
        <CampoContrasena
          value={pass}
          onChange={(v) => {
            setPass(v);
            setError('');
          }}
          error={!!error && esCorreo(email)}
          accion={
            <button
              type="button"
              onClick={onOlvido}
              className={`text-[12px] font-semibold ${tintas.enlace} hover:text-white ${anillo}`}
            >
              ¿Olvidó su contraseña?
            </button>
          }
        />
        {cfg.mostrarRecordar && (
          <Casilla on={recordar} onCambio={setRecordar}>
            Recordar este equipo por 30 días
          </Casilla>
        )}
        {error && <AvisoError>{error}</AvisoError>}
        <div className="mt-1.5">
          <BotonPrimario cargando={cargando}>{cargando ? 'Entrando…' : 'Entrar'}</BotonPrimario>
        </div>
      </form>

      <p className={`mt-[22px] text-center text-[11.5px] leading-relaxed ${tintas.tenue}`}>
        ¿Problemas para ingresar?{' '}
        <a href={whatsapp} className={`font-semibold ${tintas.enlace}`}>
          Contáctenos por WhatsApp
        </a>
      </p>
    </>
  );
}

function VistaCodigo({
  email,
  onVerificar,
  onVolver,
}: {
  email: string;
  onVerificar: (c: string) => Promise<boolean>;
  onVolver: () => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [entro, setEntro] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (codigo.length !== 6) return setError('El código tiene 6 dígitos.');
    setCargando(true);
    setError('');
    const ok = await onVerificar(codigo);
    setCargando(false);
    if (ok) setEntro(true);
    else setError('Código incorrecto o vencido. Use el que muestra su app ahora.');
  };

  return (
    <>
      <Volver onClick={onVolver}>Usar otra cuenta</Volver>
      <Titulo>Verificación en dos pasos</Titulo>
      <p className={`mt-2.5 text-[14px] leading-relaxed ${tintas.apoyo}`}>
        Escriba el código de 6 dígitos de su app de autenticación para{' '}
        <span className="font-bold text-white">{email}</span>.
      </p>
      <form onSubmit={enviar} noValidate className="mt-[26px] flex flex-col gap-3.5">
        <label className="block">
          <span className="sr-only">Código de verificación</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={codigo}
            onChange={(e) => {
              setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError('');
            }}
            placeholder="• • • • • •"
            className={`h-[58px] w-full rounded-xl border bg-white/[0.06] px-4 text-center font-mono text-[26px] font-bold tracking-[0.5em] text-white outline-none placeholder:text-[#8ea6bd] focus:border-primary ${error ? 'border-[#fecaca]' : 'border-white/[0.14]'}`}
          />
        </label>
        {error && <AvisoError>{error}</AvisoError>}
        <BotonPrimario cargando={cargando}>{cargando ? 'Verificando…' : 'Verificar y entrar'}</BotonPrimario>
        {entro && (
          <p
            role="status"
            className="rounded-[10px] border border-primary/35 bg-primary/[0.16] px-3.5 py-3 text-[13px] font-semibold text-[#a8e0dc]"
          >
            ✓ Verificado. Entrando al Studio…
          </p>
        )}
      </form>
      <p className={`mt-[18px] text-[12px] ${tintas.tenue}`}>
        ¿Perdió el acceso a su app?{' '}
        <a href="/studio/acceso/respaldo" className={`font-semibold ${tintas.enlace}`}>
          Use un código de respaldo
        </a>
      </p>
    </>
  );
}

function VistaRecuperar({
  email,
  setEmail,
  onRecuperar,
  onVolver,
}: {
  email: string;
  setEmail: (v: string) => void;
  onRecuperar: (e: string) => Promise<void>;
  onVolver: () => void;
}) {
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!esCorreo(email)) return setError('Escriba su correo.');
    setCargando(true);
    await onRecuperar(email.trim());
    setCargando(false);
  };
  return (
    <>
      <Volver onClick={onVolver}>Volver a iniciar sesión</Volver>
      <Titulo>Restablezca su contraseña</Titulo>
      <p className={`mt-2.5 text-[14px] leading-relaxed ${tintas.apoyo}`}>
        Le enviaremos un enlace al correo institucional. Si entra con Microsoft, la contraseña se cambia en su
        cuenta de Microsoft.
      </p>
      <form onSubmit={enviar} noValidate className="mt-6 flex flex-col gap-3.5">
        <Campo label="Correo" error={!!error}>
          {(cls) => (
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              autoComplete="email"
              placeholder="m.vazquez@medicacapacitacion.mx"
              className={cls}
            />
          )}
        </Campo>
        {error && <AvisoError>{error}</AvisoError>}
        <BotonPrimario cargando={cargando}>{cargando ? 'Enviando…' : 'Enviar enlace'}</BotonPrimario>
      </form>
    </>
  );
}

function VistaEnviado({
  email,
  onReenviar,
  onVolver,
}: {
  email: string;
  onReenviar: () => void;
  onVolver: () => void;
}) {
  const [reenviado, setReenviado] = useState(false);
  return (
    <>
      <span
        aria-hidden
        className="grid h-14 w-14 place-items-center rounded-full border border-primary/35 bg-primary/[0.16] text-[#8fe0db]"
      >
        <Mail className="h-[25px] w-[25px]" strokeWidth={1.75} />
      </span>
      <Titulo>Revise su correo</Titulo>
      <p className={`mt-2.5 text-[14px] leading-relaxed ${tintas.apoyo}`}>
        Si <span className="font-bold text-white">{email}</span> tiene cuenta en el Studio, le llegará un
        enlace en unos minutos. Vence en 30 minutos.
      </p>
      <div className="mt-6 flex gap-2.5">
        <button
          type="button"
          disabled={reenviado}
          onClick={() => {
            onReenviar();
            setReenviado(true);
          }}
          className={`h-[46px] flex-1 rounded-[10px] border border-white/25 bg-white/[0.06] text-[13.5px] font-semibold text-white hover:bg-white/[0.12] disabled:opacity-70 ${anillo}`}
        >
          {reenviado ? 'Reenviado' : 'Reenviar'}
        </button>
        <button
          type="button"
          onClick={onVolver}
          className={`h-[46px] flex-1 rounded-[10px] bg-primary text-[13.5px] font-bold text-[color:var(--sidebar)] hover:bg-[#a8e0dc] ${anillo}`}
        >
          Volver a iniciar sesión
        </button>
      </div>
    </>
  );
}

/* ───────── página ───────── */

export default function LoginStudio({
  imagen = '/img/login.jpg',
  whatsapp = 'https://wa.me/',
  mostrarMicrosoft = true,
  dosPasos = false, // 2FA pendiente de backend (§ sin MFA/lockout aún): no se fuerza la vista de código
  mostrarRecordar = true,
  mostrarEnlaceCampus = true,
  avisoInicial = null,
  cerrarAlMontar = false,
}: {
  imagen?: string;
  whatsapp?: string;
  mostrarMicrosoft?: boolean;
  dosPasos?: boolean;
  mostrarRecordar?: boolean;
  mostrarEnlaceCampus?: boolean;
  avisoInicial?: string | null;
  cerrarAlMontar?: boolean;
}) {
  const router = useRouter();
  const [vista, setVista] = useState<'login' | 'codigo' | 'recuperar' | 'enviado'>('login');
  const [email, setEmail] = useState('');
  const [error, setError] = useState(avisoInicial ?? '');
  const ultimoEnvio = useRef(0);

  // Si el despachador detectó una sesión que NO es staff (p. ej. un alumno que
  // entró por Microsoft), se cierra aquí en el cliente para no dejarla colgada.
  useEffect(() => {
    if (!cerrarAlMontar) return;
    try {
      void createClienteSupabaseNavegador().auth.signOut();
    } catch {
      /* dev sin Supabase: no-op */
    }
  }, [cerrarAlMontar]);

  /* ── Supabase Auth (cliente navegador, solo AUTH) ── */
  const onMicrosoft = async () => {
    // ⚠ Azure OAuth NO funcionará hasta habilitar el proveedor Azure en Supabase Auth
    // (Client ID/Secret). El flujo queda listo; al volver, el despachador /admin
    // verifica el rol staff y cierra la sesión si no lo es.
    try {
      const supabase = createClienteSupabaseNavegador();
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: { redirectTo: `${window.location.origin}/admin`, scopes: 'email' },
      });
      if (err) setError('No se pudo abrir Microsoft. (Proveedor Azure pendiente de configurar.)');
    } catch {
      setError('No se pudo abrir Microsoft. (Proveedor Azure pendiente de configurar.)');
    }
  };

  const onEntrar = async (correo: string, pass: string, _recordar: boolean): Promise<ResultadoEntrar> => {
    // NOTA: "recordar 30 días" vs sesión de pestaña no es aplicable con @supabase/ssr
    // 0.12.7 (fuerza cookie persistente). El flag se captura; persistencia pendiente de backend.
    // NOTA: el bloqueo tras 5 intentos / 15 min es server-side y está pendiente de backend:
    // onEntrar nunca devuelve 'bloqueado' por ahora.
    try {
      const supabase = createClienteSupabaseNavegador();
      const { error: err } = await supabase.auth.signInWithPassword({ email: correo, password: pass });
      if (err) return 'error';
      const rol = await rolStaffActual();
      if (!rol) {
        await supabase.auth.signOut(); // autenticó pero no es staff → se cierra la sesión
        return 'no-staff';
      }
      router.push(destinoPorRol(rol));
      router.refresh();
      return 'ok';
    } catch {
      return 'error';
    }
  };

  const onVerificar = async (codigo: string): Promise<boolean> => {
    // 2FA real (challengeAndVerify). Inalcanzable mientras dosPasos=false; sin fingir.
    try {
      const supabase = createClienteSupabaseNavegador();
      const { data: factores } = await supabase.auth.mfa.listFactors();
      const factor = factores?.totp?.[0];
      if (!factor) return false;
      const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: codigo });
      if (err) return false;
      const rol = await rolStaffActual();
      router.push(rol ? destinoPorRol(rol) : '/admin/panel');
      router.refresh();
      return true;
    } catch {
      return false;
    }
  };

  const enviarEnlace = async (correo: string) => {
    const ahora = Date.now();
    if (ahora - ultimoEnvio.current < 60_000) return; // límite 1/min
    ultimoEnvio.current = ahora;
    try {
      const supabase = createClienteSupabaseNavegador();
      await supabase.auth.resetPasswordForEmail(correo, {
        redirectTo: `${window.location.origin}/admin/restablecer`,
      });
    } catch {
      /* no revela si la cuenta existe / falta env */
    }
  };

  const onRecuperar = async (correo: string) => {
    await enviarEnlace(correo); // pasa SIEMPRE a "enviado" (no revela si la cuenta existe)
    setVista('enviado');
  };
  const onReenviar = () => {
    void enviarEnlace(email.trim());
  };

  const cfg = { mostrarMicrosoft, dosPasos, mostrarRecordar };

  return (
    <FondoProfundo>
      <div className="grid w-full max-w-[1180px] gap-3.5 rounded-[22px] border border-white/[0.08] bg-sidebar p-3.5 shadow-[0_30px_80px_rgba(2,10,24,.55)] lg:h-[720px] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <PanelImagen src={imagen} mostrarEnlaceCampus={mostrarEnlaceCampus} />
        <section
          aria-label="Acceso al Studio"
          className="flex flex-col justify-center px-6 py-10 sm:px-[52px]"
        >
          {vista === 'login' && (
            <VistaLogin
              cfg={cfg}
              email={email}
              setEmail={setEmail}
              onMicrosoft={onMicrosoft}
              onEntrar={onEntrar}
              onOlvido={() => {
                setError('');
                setVista('recuperar');
              }}
              whatsapp={whatsapp}
              error={error}
              setError={setError}
            />
          )}
          {vista === 'codigo' && (
            <VistaCodigo email={email} onVerificar={onVerificar} onVolver={() => setVista('login')} />
          )}
          {vista === 'recuperar' && (
            <VistaRecuperar
              email={email}
              setEmail={setEmail}
              onRecuperar={onRecuperar}
              onVolver={() => setVista('login')}
            />
          )}
          {vista === 'enviado' && (
            <VistaEnviado email={email} onReenviar={onReenviar} onVolver={() => setVista('login')} />
          )}
        </section>
      </div>
    </FondoProfundo>
  );
}
