"use client";

/**
 * Login · Campus Virtual — Médica Capacitación
 * Acceso con correo + contraseña, más OAuth (Google / Microsoft). Solo UI + estado local.
 * Vista alterna: restablecer contraseña (sirve igual como sub-ruta /recuperar).
 *
 * Retícula del producto: el contenido se topa a 1240px y se centra (aire ~100px por lado en 1440).
 * EXCEPCIÓN de esta pantalla: el login es full-bleed — el fondo ocupa los 1440px completos en un
 * split 50/50; solo la tarjeta de auth se limita (máx 420px, padding 32px).
 *
 * Utilidades que este archivo espera de globals.css (bloque :root en globals.css):
 *   Color:      bg-background bg-card bg-muted bg-primary bg-secondary bg-accent bg-sidebar
 *               text-foreground text-muted-foreground text-secondary text-accent-foreground
 *               text-primary-foreground text-sidebar-foreground
 *               border-border ring-ring
 *   Estados:    text-destructive  (aquí solo como texto de error de credenciales)
 *   Variables:  --wave-0..3 (olas del hero) · --radius
 *   Tipografía: Inter cargada como --font-inter en el layout raíz.
 *
 * Cableado pendiente (Claude Code → Supabase Auth):
 *   onLogin(email, password) · onGoogle() · onMicrosoft() · onResetPassword(email)
 */

import { useId, useState } from "react";
import { Eye, EyeOff, Loader2, MailCheck, MessageCircle, TriangleAlert } from "lucide-react";

type View = "login" | "reset" | "reset-sent";
type Status = "idle" | "sending" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function maskEmail(email: string) {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 2)}${"•".repeat(Math.max(user.length - 2, 3))}@${domain}`;
}

/* Marcas: sustituir por los assets oficiales de Google / Microsoft en producción. */
function GoogleMark() {
  return (
    <span
      aria-hidden
      className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[13px] leading-none text-secondary"
      style={{ fontWeight: 800 }}
    >
      G
    </span>
  );
}

function MicrosoftMark() {
  return (
    <span aria-hidden className="grid h-5 w-5 grid-cols-2 gap-[2px]">
      <span className="rounded-[1px] bg-[#f25022]" />
      <span className="rounded-[1px] bg-[#7fba00]" />
      <span className="rounded-[1px] bg-[#00a4ef]" />
      <span className="rounded-[1px] bg-[#ffb900]" />
    </span>
  );
}

function Logo({ tone = "dark", size = 40 }: { tone?: "dark" | "light"; size?: number }) {
  const fg = tone === "light" ? "text-white" : "text-foreground";
  const sub = tone === "light" ? "text-[#cfe9e7]" : "text-muted-foreground";
  const large = size >= 56;
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        style={{ width: size, height: size, borderRadius: large ? 16 : 11, fontSize: large ? 22 : 15 }}
        className={[
          "grid shrink-0 place-items-center font-extrabold",
          tone === "light" ? "bg-white/15 text-white" : "bg-sidebar text-sidebar-foreground",
        ].join(" ")}
      >
        MC
      </span>
      <span className="leading-tight">
        <span className={`block font-bold tracking-[-0.01em] ${fg} ${large ? "text-[20px]" : "text-[15px]"}`}>
          Médica Capacitación
        </span>
        <span className={`block font-semibold ${sub} ${large ? "text-[13px]" : "text-[12px]"}`}>
          Campus Virtual
        </span>
      </span>
    </div>
  );
}

/* Hero de olas. `compact` = versión móvil (banda superior). */
function WaveHero({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={[
        "relative isolate overflow-hidden bg-secondary",
        compact
          ? "flex h-40 items-end px-6 pb-6 sm:h-44"
          : "flex h-full flex-col justify-between p-10 xl:p-14",
      ].join(" ")}
    >
      <svg
        aria-hidden
        viewBox="0 0 600 420"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      >
        <rect width="600" height="420" fill="var(--wave-0)" />
        <path d="M0 180 C 120 130 210 230 330 198 C 440 170 520 216 600 192 V420 H0 Z" fill="var(--wave-1)" />
        <path d="M0 240 C 130 200 230 286 350 254 C 455 226 530 268 600 250 V420 H0 Z" fill="var(--wave-2)" />
        <path d="M0 300 C 140 262 240 336 366 308 C 470 284 540 316 600 302 V420 H0 Z" fill="var(--wave-3)" />
      </svg>

      {/* Scrim navy: reserva de contraste para el texto sobre las olas claras */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background: compact
            ? "linear-gradient(to bottom, rgba(15,45,82,0) 28%, rgba(15,45,82,.55) 60%, rgba(15,45,82,.92) 100%)"
            : "linear-gradient(to bottom, rgba(15,45,82,0) 32%, rgba(15,45,82,.5) 62%, rgba(15,45,82,.9) 100%)",
        }}
      />

      {compact ? (
        <Logo tone="light" size={40} />
      ) : (
        <>
          <Logo tone="light" size={60} />
          <div className="max-w-[26ch]">
            <h2 className="text-[34px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white xl:text-[40px]">
              Su formación en ultrasonido, en un solo lugar
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-[#dceeed]">
              Clases, prácticas y constancias de sus diplomados, siempre a la mano.
            </p>
          </div>
          <p className="text-[12px] font-medium text-[#bcd7e4]">© {new Date().getFullYear()} Médica Capacitación</p>
        </>
      )}
    </div>
  );
}

const fieldLabel =
  "text-[11.5px] font-semibold uppercase tracking-[0.08em] text-[#374151]";
const fieldBase =
  "h-11 w-full rounded-[10px] border border-border bg-card px-3.5 text-[14.5px] text-foreground placeholder:text-[#9ca3af] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";
const ctaBase =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[11px] bg-primary text-[15px] font-bold text-white transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-70";
const linkBase =
  "rounded-[6px] text-[13px] font-semibold text-secondary underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card";

function OAuthButton({
  children,
  icon,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex h-11 w-full items-center gap-3 rounded-[10px] border border-border bg-card px-4 text-[14px] font-semibold text-foreground shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-55"
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export default function LoginPage() {
  const uid = useId();
  const emailId = `${uid}-email`;
  const passId = `${uid}-pass`;
  const resetId = `${uid}-reset-email`;
  const alertId = `${uid}-alert`;

  const [view, setView] = useState<View>("login");
  const [status, setStatus] = useState<Status>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");

  /* ── Stubs para Supabase Auth ───────────────────────────── */
  const onGoogle = () => {};
  const onMicrosoft = () => {};
  const onLogin = async (_email: string, _password: string) => {
    /* signInWithPassword({ email, password }) */
  };
  const onResetPassword = async (_email: string) => {
    /* resetPasswordForEmail(email, { redirectTo }) */
  };
  /* ───────────────────────────────────────────────────────── */

  const sending = status === "sending";

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setFieldError("Escriba un correo válido");
      return;
    }
    if (!password) {
      setFieldError("Escriba su contraseña");
      return;
    }
    setFieldError(null);
    setStatus("sending");
    await onLogin(value, password);
    setStatus("error"); // el stub siempre falla; Claude Code decide el destino real
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = resetEmail.trim();
    if (!EMAIL_RE.test(value)) {
      setFieldError("Escriba un correo válido");
      return;
    }
    setFieldError(null);
    setStatus("sending");
    await onResetPassword(value);
    setStatus("idle");
    setView("reset-sent");
  };

  const goTo = (next: View) => {
    setFieldError(null);
    setStatus("idle");
    setView(next);
  };

  return (
    <main className="min-h-dvh bg-background font-sans text-foreground antialiased">
      {/* Login full-bleed: split 50/50 a todo el ancho (1440 en desktop). */}
      <div className="grid min-h-dvh w-full lg:grid-cols-2">
        <div className="lg:hidden">
          <WaveHero compact />
        </div>
        <div className="hidden lg:block">
          <WaveHero />
        </div>

        <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-[420px]">
            <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_3px_rgba(17,24,39,0.06)] sm:p-8">
              {/* ───────── Acceso con correo y contraseña ───────── */}
              {view === "login" && (
                <>
                  <div className="mb-6 lg:hidden">
                    <Logo />
                  </div>
                  <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[28px]">
                    Acceda a su Campus
                  </h1>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#374151]">
                    Use el correo con el que se inscribió.
                  </p>

                  <div className="mt-6 flex flex-col gap-3">
                    <OAuthButton icon={<GoogleMark />} onClick={onGoogle} disabled={sending}>
                      Continuar con Google
                    </OAuthButton>
                    <OAuthButton icon={<MicrosoftMark />} onClick={onMicrosoft} disabled={sending}>
                      Continuar con Microsoft
                    </OAuthButton>
                  </div>

                  <div className="my-6 flex items-center gap-4">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      o
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <form onSubmit={submitLogin} noValidate className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      <label htmlFor={emailId} className={fieldLabel}>
                        Correo
                      </label>
                      <input
                        id={emailId}
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={email}
                        disabled={sending}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (fieldError || status === "error") {
                            setFieldError(null);
                            setStatus("idle");
                          }
                        }}
                        aria-invalid={status === "error" || !!fieldError}
                        aria-describedby={status === "error" || fieldError ? alertId : undefined}
                        placeholder="nombre@correo.com"
                        className={fieldBase}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label htmlFor={passId} className={fieldLabel}>
                        Contraseña
                      </label>
                      <div className="relative">
                        <input
                          id={passId}
                          name="password"
                          type={showPass ? "text" : "password"}
                          autoComplete="current-password"
                          value={password}
                          disabled={sending}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (fieldError || status === "error") {
                              setFieldError(null);
                              setStatus("idle");
                            }
                          }}
                          aria-invalid={status === "error" || !!fieldError}
                          aria-describedby={status === "error" || fieldError ? alertId : undefined}
                          placeholder="Su contraseña"
                          className={`${fieldBase} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass((v) => !v)}
                          aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                          aria-pressed={showPass}
                          className="absolute right-0 top-0 grid h-11 w-11 place-items-center rounded-[10px] text-muted-foreground transition-colors hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        >
                          {showPass ? (
                            <EyeOff aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                          ) : (
                            <Eye aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                          )}
                        </button>
                      </div>
                      <div className="flex justify-end">
                        <button type="button" onClick={() => goTo("reset")} className={linkBase}>
                          ¿Olvidó su contraseña?
                        </button>
                      </div>
                    </div>

                    {(status === "error" || fieldError) && (
                      <p
                        id={alertId}
                        role="alert"
                        className="flex items-start gap-2 text-[13px] font-medium leading-snug text-destructive"
                      >
                        <TriangleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} />
                        {fieldError ?? "Correo o contraseña incorrectos"}
                      </p>
                    )}

                    <button type="submit" disabled={sending} className={ctaBase}>
                      {sending ? (
                        <>
                          <Loader2 aria-hidden className="h-[18px] w-[18px] animate-spin" strokeWidth={1.75} />
                          Entrando…
                        </>
                      ) : (
                        "Entrar"
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* ───────── Restablecer contraseña ───────── */}
              {view === "reset" && (
                <>
                  <div className="mb-6 lg:hidden">
                    <Logo />
                  </div>
                  <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[28px]">
                    Restablezca su contraseña
                  </h1>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#374151]">
                    Le enviaremos un enlace a su correo.
                  </p>

                  <form onSubmit={submitReset} noValidate className="mt-6 flex flex-col gap-2">
                    <label htmlFor={resetId} className={fieldLabel}>
                      Correo
                    </label>
                    <input
                      id={resetId}
                      name="reset-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={resetEmail}
                      disabled={sending}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        if (fieldError) setFieldError(null);
                      }}
                      aria-invalid={!!fieldError}
                      aria-describedby={fieldError ? alertId : undefined}
                      placeholder="nombre@correo.com"
                      className={fieldBase}
                    />
                    {fieldError && (
                      <p id={alertId} role="alert" className="text-[12.5px] font-medium text-destructive">
                        {fieldError}
                      </p>
                    )}
                    <button type="submit" disabled={sending} className={`${ctaBase} mt-3`}>
                      {sending ? (
                        <>
                          <Loader2 aria-hidden className="h-[18px] w-[18px] animate-spin" strokeWidth={1.75} />
                          Enviando enlace…
                        </>
                      ) : (
                        "Enviar enlace de recuperación"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => goTo("login")}
                      className="mt-3 h-11 w-full whitespace-nowrap rounded-[10px] text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      Volver a iniciar sesión
                    </button>
                  </form>
                </>
              )}

              {/* ───────── Enlace de recuperación enviado ───────── */}
              {view === "reset-sent" && (
                <section aria-live="polite">
                  <span
                    aria-hidden
                    className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground"
                  >
                    <MailCheck strokeWidth={2.2} className="h-6 w-6" />
                  </span>
                  <h1 className="mt-5 text-[24px] font-extrabold leading-tight tracking-[-0.02em]">
                    Revise su correo
                  </h1>
                  <p className="mt-2 text-[14px] leading-relaxed text-[#374151]">
                    Enviamos el enlace para restablecer su contraseña a{" "}
                    <span className="font-semibold text-foreground">{maskEmail(resetEmail.trim())}</span>.
                  </p>
                  <div className="mt-5 rounded-[11px] border border-[#c7d2fe] bg-[#eef2ff] px-4 py-3 text-[12.5px] leading-relaxed text-[#4338ca]">
                    El enlace vence en 15 minutos y solo funciona una vez.
                  </div>
                  <div className="mt-6 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onResetPassword(resetEmail.trim())}
                      className="h-11 w-full whitespace-nowrap rounded-[10px] border border-border bg-card px-4 text-[14px] font-semibold text-secondary transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
                    >
                      Reenviar enlace
                    </button>
                    <button
                      type="button"
                      onClick={() => goTo("login")}
                      className="h-11 w-full whitespace-nowrap rounded-[10px] px-4 text-[14px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
                    >
                      Volver a iniciar sesión
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* Pie de ayuda */}
            <div className="mt-5 rounded-xl bg-sidebar px-5 py-4 text-sidebar-foreground shadow-[0_1px_3px_rgba(17,24,39,0.06)]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <div className="min-w-0 flex-1 basis-[180px]">
                  <p className="whitespace-nowrap text-[13.5px] font-bold">¿Problemas para entrar?</p>
                  <p className="mt-0.5 text-[12.5px] text-[#bcd7e4]">Le ayudamos por WhatsApp.</p>
                </div>
                <a
                  href="https://wa.me/5215555555555"
                  className="inline-flex h-11 shrink-0 grow-0 items-center gap-2 whitespace-nowrap rounded-full bg-white/12 px-4 text-[13px] font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f2d52]"
                >
                  <MessageCircle aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  WhatsApp
                </a>
              </div>
            </div>

            <p className="mt-5 text-center text-[12px] leading-relaxed text-muted-foreground">
              Su cuenta la creó su institución al inscribirse. Si su correo cambió, avísenos por WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
