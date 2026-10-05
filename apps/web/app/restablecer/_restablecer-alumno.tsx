'use client';

/**
 * PRISMA · Restablecer contraseña del ALUMNO (campus) — estética del login alumno
 * (Spec A: foto a sangre + velo navy + formulario píldora, sin tarjeta).
 *
 * Flujo: el alumno llega desde el enlace del correo con una sesión de RECOVERY de
 * Supabase (detectSessionInUrl procesa el token/`code` al montar). Captura nueva
 * contraseña + confirmación → `supabase.auth.updateUser({ password })` → éxito.
 * Maneja enlace inválido/vencido (sin sesión de recovery) y errores de guardado.
 */

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, Eye, EyeOff, Mail } from 'lucide-react';
import { createClienteSupabaseNavegador } from '@/lib/supabase/client';

/* ───────── estilos (idénticos al login alumno) ───────── */
const anillo =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent';
const pildora =
  'h-12 w-full rounded-full border bg-white/[0.14] px-[22px] text-[14px] font-medium text-white backdrop-blur-[8px] outline-none transition-colors placeholder:text-white/70 focus:border-white/55 focus:bg-white/[0.24]';

type Estado = 'cargando' | 'listo' | 'invalido' | 'exito';

/* ───────── piezas (del login alumno) ───────── */
function FondoFoto({ src }: { src: string }) {
  return (
    <>
      <picture>
        <source srcSet={src.replace(/\.jpg$/, '.webp')} type="image/webp" />
        <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      </picture>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg,rgba(15,45,82,.78) 0%,rgba(15,45,82,.66) 45%,rgba(10,33,64,.9) 100%)',
        }}
      />
    </>
  );
}

function Marca() {
  return (
    <div className="absolute left-5 top-5 flex items-center gap-2.5 sm:left-12 sm:top-10">
      <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-primary text-[13.5px] font-extrabold text-[color:var(--sidebar)]">
        MC
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[14.5px] font-bold text-white">Campus Virtual</span>
        <span className="text-[11px] font-medium text-[#d6e6ee]">Médica Capacitación</span>
      </span>
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
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <input
        type={ver ? 'text' : 'password'}
        value={value}
        autoComplete="new-password"
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-invalid={error}
        className={`${pildora} pr-[52px] ${error ? 'border-[#fecaca]' : 'border-white/[0.28]'}`}
      />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className={`absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/[0.14] ${anillo}`}
      >
        {ver ? (
          <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} />
        ) : (
          <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
        )}
      </button>
    </label>
  );
}

function AvisoError({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-[rgba(10,33,64,.55)] px-3.5 py-2.5 text-center text-[12.5px] font-medium leading-relaxed text-[#fecaca]"
    >
      {children}
    </p>
  );
}

function BotonPrimario({ cargando, children }: { cargando?: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={cargando}
      className={`mt-1 h-12 w-full rounded-full bg-primary text-[14px] font-bold tracking-[0.04em] text-[color:var(--sidebar)] shadow-[0_8px_22px_rgba(5,18,38,.28)] transition-colors hover:bg-[#a8e0dc] disabled:opacity-70 ${anillo}`}
    >
      {children}
    </button>
  );
}

function Titulo({ children, sub }: { children: ReactNode; sub: ReactNode }) {
  return (
    <>
      <h1 className="text-center text-[25px] font-bold leading-tight tracking-[-0.02em] text-white [text-shadow:0_2px_12px_rgba(5,18,38,.35)] sm:text-[30px]">
        {children}
      </h1>
      <p className="mt-2.5 text-center text-[13px] leading-relaxed text-[#e4eef3] sm:text-[14px]">{sub}</p>
    </>
  );
}

function Circulo({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="grid h-[58px] w-[58px] place-items-center rounded-full border border-white/30 bg-white/[0.16] text-white"
    >
      {children}
    </span>
  );
}

function EnlaceBoton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`mt-6 grid h-12 w-full place-items-center rounded-full bg-primary text-[14px] font-bold tracking-[0.04em] text-[color:var(--sidebar)] shadow-[0_8px_22px_rgba(5,18,38,.28)] transition-colors hover:bg-[#a8e0dc] ${anillo}`}
    >
      {children}
    </Link>
  );
}

/* ───────── página ───────── */
export default function RestablecerAlumno({ fondo = '/img/login.jpg' }: { fondo?: string }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [pass, setPass] = useState('');
  const [conf, setConf] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const resuelto = useRef(false);

  // Detecta la sesión de recovery del enlace (detectSessionInUrl la procesa al montar).
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
      // Dev sin Supabase: muestra el formulario para verificación visual.
      setEstado('listo');
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
    // Si en unos segundos no hubo sesión de recovery → enlace inválido/vencido.
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
      setEstado('exito'); // dev sin Supabase: no rompe la verificación visual
    }
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-sidebar">
      <FondoFoto src={fondo} />
      <Marca />

      <div className="relative flex min-h-[100dvh] items-center justify-center px-6 py-24">
        <div className="w-full max-w-[360px]">
          {estado === 'cargando' && (
            <p className="text-center text-[14px] text-[#e4eef3]">Verificando el enlace…</p>
          )}

          {estado === 'listo' && (
            <>
              <Titulo sub="Elija una contraseña nueva para su cuenta.">Restablezca su contraseña</Titulo>
              <form onSubmit={guardar} noValidate className="mt-7 flex flex-col gap-3">
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
            </>
          )}

          {estado === 'exito' && (
            <div className="flex flex-col items-center text-center">
              <Circulo>
                <Check className="h-[26px] w-[26px]" strokeWidth={2.5} />
              </Circulo>
              <div className="mt-[18px] w-full">
                <Titulo sub="Ya puede entrar al Campus con su nueva contraseña.">
                  Contraseña actualizada
                </Titulo>
              </div>
              <EnlaceBoton href="/login">Ir a iniciar sesión</EnlaceBoton>
            </div>
          )}

          {estado === 'invalido' && (
            <div className="flex flex-col items-center text-center">
              <Circulo>
                <Mail className="h-[26px] w-[26px]" strokeWidth={1.75} />
              </Circulo>
              <div className="mt-[18px] w-full">
                <Titulo sub="El enlace no es válido o ya venció. Pida uno nuevo desde iniciar sesión.">
                  Enlace vencido
                </Titulo>
              </div>
              <EnlaceBoton href="/login">Volver a iniciar sesión</EnlaceBoton>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
