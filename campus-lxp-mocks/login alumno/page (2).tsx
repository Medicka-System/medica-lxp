"use client";

/**
 * PRISMA · Login del ALUMNO (campus)
 * Foto a sangre + velo navy + formulario flotante al centro, sin tarjeta.
 * Vistas: "login" → "recuperar" → "enviado".  Solo correo y contraseña.
 *
 * Componentes en este archivo:
 *   FondoFoto · Marca · CampoPildora · CampoContrasena · Casilla · AvisoError ·
 *   BotonPrimario · BotonFantasma · VistaLogin · VistaRecuperar · VistaEnviado
 *
 * Stubs para Supabase Auth: onEntrar(email, pass, recordar) · onRecuperar(email) · onReenviar(email)
 * Requiere en /public: /img/login-aula.jpg
 */

import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Check, Eye, EyeOff, Mail, MessageCircle } from "lucide-react";

/* ───────── utilidades ───────── */
const esCorreo = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
const enmascarar = (e: string) => {
  const [u, d] = e.split("@");
  return d ? `${u.slice(0, 2)}${"•".repeat(Math.max(2, u.length - 2))}@${d}` : e;
};
const anillo = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";
const pildora =
  "h-12 w-full rounded-full border bg-white/[0.14] px-[22px] text-[14px] font-medium text-white backdrop-blur-[8px] outline-none transition-colors placeholder:text-white/70 focus:border-white/55 focus:bg-white/[0.24]";

/* ───────── piezas ───────── */

function FondoFoto({ src }: { src: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      {/* la foto es clara (batas blancas): velo navy denso para que el texto blanco lea */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(180deg,rgba(15,45,82,.78) 0%,rgba(15,45,82,.66) 45%,rgba(10,33,64,.9) 100%)" }}
      />
    </>
  );
}

function Marca() {
  return (
    <div className="absolute left-5 top-5 flex items-center gap-2.5 sm:left-12 sm:top-10">
      <span className="grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-primary text-[13.5px] font-extrabold text-[color:var(--sidebar)]">MC</span>
      <span className="flex flex-col leading-tight">
        <span className="text-[14.5px] font-bold text-white">Campus Virtual</span>
        <span className="text-[11px] font-medium text-[#d6e6ee]">Médica Capacitación</span>
      </span>
    </div>
  );
}

function CampoPildora({
  label, type = "email", value, onChange, error, autoComplete,
}: { label: string; type?: string; value: string; onChange: (v: string) => void; error?: boolean; autoComplete?: string }) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        placeholder={label}
        aria-invalid={error}
        className={`${pildora} ${error ? "border-[#fecaca]" : "border-white/[0.28]"}`}
      />
    </label>
  );
}

function CampoContrasena({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: boolean }) {
  const [ver, setVer] = useState(false);
  return (
    <label className="relative block">
      <span className="sr-only">Contraseña</span>
      <input
        type={ver ? "text" : "password"}
        value={value}
        autoComplete="current-password"
        onChange={(e) => onChange(e.target.value)}
        placeholder="Contraseña"
        aria-invalid={error}
        className={`${pildora} pr-[52px] ${error ? "border-[#fecaca]" : "border-white/[0.28]"}`}
      />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
        className={`absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full text-white hover:bg-white/[0.14] ${anillo}`}
      >
        {ver ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />}
      </button>
    </label>
  );
}

function Casilla({ on, onCambio, children }: { on: boolean; onCambio: (v: boolean) => void; children: ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={() => onCambio(!on)} className={`inline-flex h-8 items-center gap-2.5 text-[13px] font-medium text-white ${anillo}`}>
      <span aria-hidden className={`grid h-[18px] w-[18px] place-items-center rounded-[5px] border-[1.5px] border-white/70 text-[color:var(--sidebar)] ${on ? "bg-primary" : ""}`}>
        {on && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {children}
    </button>
  );
}

function AvisoError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-[rgba(10,33,64,.55)] px-3.5 py-2.5 text-center text-[12.5px] font-medium leading-relaxed text-[#fecaca]">
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

function BotonFantasma({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-9 items-center justify-center gap-1.5 text-[13px] font-semibold text-white hover:text-[#a8e0dc] ${anillo}`}>
      {children}
    </button>
  );
}

function Titulo({ children, sub }: { children: ReactNode; sub: ReactNode }) {
  return (
    <>
      <h1 className="text-center text-[25px] font-bold leading-tight tracking-[-0.02em] text-white [text-shadow:0_2px_12px_rgba(5,18,38,.35)] sm:text-[30px]">{children}</h1>
      <p className="mt-2.5 text-center text-[13px] leading-relaxed text-[#e4eef3] sm:text-[14px]">{sub}</p>
    </>
  );
}

/* ───────── vistas ───────── */

function VistaLogin({
  email, setEmail, onEntrar, onOlvido,
}: { email: string; setEmail: (v: string) => void; onEntrar: (e: string, p: string, r: boolean) => Promise<boolean>; onOlvido: () => void }) {
  const [pass, setPass] = useState("");
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!esCorreo(email)) return setError("Escriba un correo válido.");
    if (!pass) return setError("Escriba su contraseña.");
    setCargando(true);
    setError("");
    const ok = await onEntrar(email.trim(), pass, recordar);
    setCargando(false);
    if (!ok) setError("Correo o contraseña incorrectos.");
  };

  return (
    <>
      <Titulo sub="Use el correo con el que se inscribió.">Bienvenido a PRISMA</Titulo>
      <form onSubmit={enviar} noValidate className="mt-7 flex flex-col gap-3">
        <CampoPildora label="Correo" value={email} onChange={(v) => { setEmail(v); setError(""); }} autoComplete="email" error={error.includes("correo") && !esCorreo(email)} />
        <CampoContrasena value={pass} onChange={(v) => { setPass(v); setError(""); }} error={!!error && esCorreo(email)} />
        {error && <AvisoError>{error}</AvisoError>}
        <BotonPrimario cargando={cargando}>{cargando ? "Entrando…" : "Entrar"}</BotonPrimario>
        <div className="mt-1 flex items-center gap-2.5">
          <Casilla on={recordar} onCambio={setRecordar}>Recordarme</Casilla>
          <span className="ml-auto"><BotonFantasma onClick={onOlvido}>¿Olvidó su contraseña?</BotonFantasma></span>
        </div>
      </form>
    </>
  );
}

function VistaRecuperar({
  email, setEmail, onRecuperar, onVolver,
}: { email: string; setEmail: (v: string) => void; onRecuperar: (e: string) => Promise<void>; onVolver: () => void }) {
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!esCorreo(email)) return setError("Escriba un correo válido.");
    setCargando(true);
    await onRecuperar(email.trim());
    setCargando(false);
  };
  return (
    <>
      <Titulo sub="Le enviaremos un enlace a su correo.">Restablezca su contraseña</Titulo>
      <form onSubmit={enviar} noValidate className="mt-7 flex flex-col gap-3">
        <CampoPildora label="Correo" value={email} onChange={(v) => { setEmail(v); setError(""); }} autoComplete="email" error={!!error} />
        {error && <AvisoError>{error}</AvisoError>}
        <BotonPrimario cargando={cargando}>{cargando ? "Enviando…" : "Enviar enlace"}</BotonPrimario>
        <BotonFantasma onClick={onVolver}><ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />Volver a iniciar sesión</BotonFantasma>
      </form>
    </>
  );
}

function VistaEnviado({ email, onReenviar, onVolver }: { email: string; onReenviar: () => void; onVolver: () => void }) {
  const [reenviado, setReenviado] = useState(false);
  return (
    <div className="flex flex-col items-center text-center">
      <span aria-hidden className="grid h-[58px] w-[58px] place-items-center rounded-full border border-white/30 bg-white/[0.16] text-white">
        <Mail className="h-[26px] w-[26px]" strokeWidth={1.75} />
      </span>
      <div className="mt-[18px] w-full">
        <Titulo sub={<>Enviamos el enlace a <span className="font-mono font-bold text-white">{enmascarar(email)}</span>. Vence en 30 minutos.</>}>Revise su correo</Titulo>
      </div>
      <button
        type="button"
        disabled={reenviado}
        onClick={() => { onReenviar(); setReenviado(true); }}
        className={`mt-6 h-12 w-full rounded-full border border-white/40 bg-white/10 text-[14px] font-bold text-white hover:bg-white/20 disabled:opacity-70 ${anillo}`}
      >
        {reenviado ? "Reenviado" : "Reenviar el enlace"}
      </button>
      <span className="mt-3"><BotonFantasma onClick={onVolver}><ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />Volver a iniciar sesión</BotonFantasma></span>
    </div>
  );
}

/* ───────── página ───────── */

export default function LoginAlumno({
  fondo = "/img/login-aula.jpg",
  whatsapp = "https://wa.me/",
}: { fondo?: string; whatsapp?: string }) {
  const [vista, setVista] = useState<"login" | "recuperar" | "enviado">("login");
  const [email, setEmail] = useState("");

  /* ── stubs: cablear a Supabase Auth ── */
  const onEntrar = async (_e: string, _p: string, _r: boolean) => false; // signInWithPassword → router.push("/")
  const onRecuperar = async (_e: string) => setVista("enviado"); // resetPasswordForEmail(email, { redirectTo })
  const onReenviar = () => {}; // resetPasswordForEmail otra vez, con límite de 1/min
  /* ──────────────────────────────────── */

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-sidebar">
      <FondoFoto src={fondo} />
      <Marca />

      <div className="relative flex min-h-[100dvh] items-center justify-center px-6 py-24">
        <div className="w-full max-w-[360px]">
          {vista === "login" && <VistaLogin email={email} setEmail={setEmail} onEntrar={onEntrar} onOlvido={() => setVista("recuperar")} />}
          {vista === "recuperar" && <VistaRecuperar email={email} setEmail={setEmail} onRecuperar={onRecuperar} onVolver={() => setVista("login")} />}
          {vista === "enviado" && <VistaEnviado email={email} onReenviar={onReenviar} onVolver={() => setVista("login")} />}
        </div>
      </div>

      <footer className="absolute inset-x-0 bottom-6 flex flex-wrap justify-center gap-x-4 gap-y-1 px-6 text-[12px] text-[#d6e6ee]">
        <span>
          ¿Problemas para entrar?{" "}
          <a href={whatsapp} className="inline-flex items-center gap-1 font-semibold text-white hover:text-[#a8e0dc]">
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />Escríbanos por WhatsApp
          </a>
        </span>
        <span aria-hidden>·</span>
        <a href="/privacidad" className="text-[#d6e6ee] hover:text-white">Aviso de privacidad</a>
      </footer>
    </main>
  );
}
