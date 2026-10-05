'use client';

/**
 * PRISMA Studio · Restablecer contraseña del STAFF — estética del login staff
 * (Spec B: fondo profundo + tarjeta navy, foto a la izquierda, acceso a la derecha).
 *
 * Flujo: el staff llega desde el enlace del correo con sesión de RECOVERY de Supabase
 * (detectSessionInUrl la procesa al montar) → nueva contraseña + confirmación →
 * `supabase.auth.updateUser({ password })` → éxito → /admin. Incluye la nota de la
 * spec para cuentas de Microsoft y el manejo de enlace inválido/vencido.
 */

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, Eye, EyeOff, AlertCircle, Mail } from 'lucide-react';
import { createClienteSupabaseNavegador } from '@/lib/supabase/client';

/* ───────── estilos (idénticos al login staff) ───────── */
const anillo =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--sidebar)]';
const campo =
  'h-[46px] w-full rounded-[10px] border bg-white/[0.06] px-3.5 text-[14px] font-medium text-white outline-none transition-colors placeholder:text-[#8ea6bd] focus:border-primary focus:bg-white/[0.09]';
const tintas = {
  apoyo: 'text-[#bcd7e4]',
  label: 'text-[#d6e6ee]',
  tenue: 'text-[#8ea6bd]',
  enlace: 'text-[#8fe0db]',
};

type Estado = 'cargando' | 'listo' | 'invalido' | 'exito';

/* ───────── piezas (del login staff) ───────── */
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

function PanelImagen({ src }: { src: string }) {
  return (
    <div className="relative hidden overflow-hidden rounded-[14px] bg-[#0a2140] lg:block">
      <img
        src={src}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: '22% 40%' }}
      />
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
      </div>
    </div>
  );
}

function CampoContrasena({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
}) {
  const [ver, setVer] = useState(false);
  return (
    <label className="block">
      <span className={`text-[11.5px] font-semibold ${tintas.label}`}>{label}</span>
      <span className="relative mt-[7px] block">
        <input
          type={ver ? 'text' : 'password'}
          value={value}
          autoComplete="new-password"
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          aria-invalid={error}
          className={`${campo} pr-12 ${error ? 'border-[#fecaca]' : 'border-white/[0.14]'}`}
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
      </span>
    </label>
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

function EnlaceBoton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`grid h-12 w-full place-items-center rounded-[10px] bg-primary text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-[#a8e0dc] ${anillo}`}
    >
      {children}
    </Link>
  );
}

function Titulo({ children }: { children: ReactNode }) {
  return (
    <h1 className="mt-3.5 text-[32px] font-bold leading-[1.12] tracking-[-0.03em] text-white">{children}</h1>
  );
}

function Acceso({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Restablecer contraseña" className="flex flex-col justify-center px-6 py-10 sm:px-[52px]">
      {children}
    </section>
  );
}

/* ───────── página ───────── */
export default function RestablecerStudio({ imagen = '/img/login.jpg' }: { imagen?: string }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [pass, setPass] = useState('');
  const [conf, setConf] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const resuelto = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error_description') || window.location.hash.includes('error')) {
      setEstado('invalido');
      return;
    }
    let supabase: ReturnType<typeof createClienteSupabaseNavegador>;
    try {
      supabase = createClienteSupabaseNavegador();
    } catch {
      setEstado('listo'); // dev sin Supabase: muestra el formulario
      return;
    }
    const listo = () => {
      if (!resuelto.current) {
        resuelto.current = true;
        setEstado('listo');
      }
    };
    const { data: sub } = supabase.auth.onAuthStateChange((evento, sesion) => {
      if (sesion && ['PASSWORD_RECOVERY', 'SIGNED_IN', 'INITIAL_SESSION'].includes(evento)) listo();
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) listo();
    });
    const t = setTimeout(() => {
      if (!resuelto.current) setEstado('invalido');
    }, 3000);
    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, []);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (pass.length < 8) return setError('Escriba una contraseña de al menos 8 caracteres.');
    if (pass !== conf) return setError('Las contraseñas no coinciden.');
    setGuardando(true);
    setError('');
    try {
      const supabase = createClienteSupabaseNavegador();
      const { error: err } = await supabase.auth.updateUser({ password: pass });
      if (err) {
        setGuardando(false);
        return setError('No se pudo actualizar la contraseña. Pida un enlace nuevo e intente otra vez.');
      }
      setGuardando(false);
      setEstado('exito');
    } catch {
      setGuardando(false);
      setEstado('exito');
    }
  };

  return (
    <FondoProfundo>
      <div className="grid w-full max-w-[1180px] gap-3.5 rounded-[22px] border border-white/[0.08] bg-sidebar p-3.5 shadow-[0_30px_80px_rgba(2,10,24,.55)] lg:h-[720px] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <PanelImagen src={imagen} />

        {estado === 'cargando' && (
          <Acceso>
            <p className={`text-[14px] ${tintas.apoyo}`}>Verificando el enlace…</p>
          </Acceso>
        )}

        {estado === 'listo' && (
          <Acceso>
            <Titulo>Restablezca su contraseña</Titulo>
            <p className={`mt-2.5 text-[14px] leading-relaxed ${tintas.apoyo}`}>
              Elija una contraseña nueva para su cuenta del Studio. Si entra con Microsoft, la contraseña
              se cambia en su cuenta de Microsoft.
            </p>
            <form onSubmit={guardar} noValidate className="mt-6 flex flex-col gap-3.5">
              <CampoContrasena
                label="Nueva contraseña"
                value={pass}
                onChange={(v) => {
                  setPass(v);
                  setError('');
                }}
                error={!!error && pass.length < 8}
              />
              <CampoContrasena
                label="Confirme la contraseña"
                value={conf}
                onChange={(v) => {
                  setConf(v);
                  setError('');
                }}
                error={!!error && pass !== conf}
              />
              {error && <AvisoError>{error}</AvisoError>}
              <BotonPrimario cargando={guardando}>
                {guardando ? 'Guardando…' : 'Guardar contraseña'}
              </BotonPrimario>
            </form>
          </Acceso>
        )}

        {estado === 'exito' && (
          <Acceso>
            <span
              aria-hidden
              className="grid h-14 w-14 place-items-center rounded-full border border-primary/35 bg-primary/[0.16] text-[#8fe0db]"
            >
              <Check className="h-[25px] w-[25px]" strokeWidth={2.5} />
            </span>
            <Titulo>Contraseña actualizada</Titulo>
            <p className={`mt-2.5 text-[14px] leading-relaxed ${tintas.apoyo}`}>
              Ya puede entrar al Studio con su nueva contraseña.
            </p>
            <div className="mt-6">
              <EnlaceBoton href="/admin">Ir a iniciar sesión</EnlaceBoton>
            </div>
          </Acceso>
        )}

        {estado === 'invalido' && (
          <Acceso>
            <span
              aria-hidden
              className="grid h-14 w-14 place-items-center rounded-full border border-primary/35 bg-primary/[0.16] text-[#8fe0db]"
            >
              <Mail className="h-[25px] w-[25px]" strokeWidth={1.75} />
            </span>
            <Titulo>Enlace vencido</Titulo>
            <p className={`mt-2.5 text-[14px] leading-relaxed ${tintas.apoyo}`}>
              El enlace no es válido o ya venció. Pida uno nuevo desde el inicio de sesión del Studio.
            </p>
            <div className="mt-6">
              <EnlaceBoton href="/admin">Volver a iniciar sesión</EnlaceBoton>
            </div>
          </Acceso>
        )}
      </div>
    </FondoProfundo>
  );
}
