"use client";

/**
 * Certificados · reconocimientos con aval institucional — Campus Virtual · Médica Capacitación
 *
 * Para el médico esto es un ACTIVO profesional, no una lista de archivos: cada reconocimiento se
 * muestra como DOCUMENTO (papel hueso, doble filete, guilloché sutil, sello de aval y firma), con
 * el folio en mono al mismo nivel que el aval — es lo que vuelve verificable el logro.
 *
 * Tres tipos: certificado de diplomado completo · constancias por módulo o por hito de horas ·
 * reconocimientos internos del campus (declarados sin valor curricular).
 *
 * "Lo que está por obtener" conecta con el modelo de horas acumulables y va en positivo.
 *
 * Stubs: onVerCertificado · onDescargarPDF · onCompartir · onVerificar
 */

import { useState } from "react";
import { Award, Check, ChevronDown, Download, Eye, Share2, ShieldCheck, X } from "lucide-react";
import { mono, kickerWide as kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type TipoCert = "diplomado" | "hito" | "modulo";

export type Certificado = {
  id: string;
  tipo: TipoCert;
  /** Rótulo corto: "Constancia · Módulo 3". */
  rotulo: string;
  titulo: string;
  aval: string;
  horas: string;
  emision: string;
  folio: string;
  vigente: boolean;
  descripcion?: string;
};

export type MetaCert = {
  id: string;
  titulo: string;
  subtitulo: string;
  acreditadas: number;
  meta: number;
  faltan: string;
  alcanzable?: boolean;
};

export type Insignia = { titulo: string; meta: string; logrado: boolean };

export type CertificadosData = {
  alumno: string;
  destacado?: Certificado;
  obtenidos: Certificado[];
  horasTotales: number;
  metas: MetaCert[];
  horas: { acreditadas: number; meta: number };
  insignias: Insignia[];
  /** Para el estado vacío. */
  primerHito?: { horas: number; llevadas: number };
};

const MOCK: CertificadosData = {
  alumno: "Sofía Ramírez Delgado",
  destacado: {
    id: "c418",
    tipo: "hito",
    rotulo: "Constancia de hito",
    titulo: "Constancia de 100 horas acreditadas",
    aval: "Universidad La Salle",
    horas: "100 h acreditadas",
    emision: "14 de agosto de 2026",
    folio: "ULSA-MC-2026-000418",
    vigente: true,
    descripcion:
      "Primer hito del diplomado en Ultrasonografía Médica, con valor curricular.",
  },
  obtenidos: [
    {
      id: "c517",
      tipo: "modulo",
      rotulo: "Constancia · Módulo 3",
      titulo: "Hígado y vía biliar",
      aval: "Universidad La Salle",
      horas: "120 h",
      emision: "2 de octubre de 2026",
      folio: "ULSA-MC-2026-000517",
      vigente: true,
    },
    {
      id: "c392",
      tipo: "modulo",
      rotulo: "Constancia · Módulo 2",
      titulo: "Abdomen y retroperitoneo",
      aval: "Universidad La Salle",
      horas: "96 h",
      emision: "18 de julio de 2026",
      folio: "ULSA-MC-2026-000392",
      vigente: true,
    },
    {
      id: "c241",
      tipo: "modulo",
      rotulo: "Constancia · Módulo 1",
      titulo: "Fundamentos y modo B",
      aval: "Universidad La Salle",
      horas: "64 h",
      emision: "3 de mayo de 2026",
      folio: "ULSA-MC-2026-000241",
      vigente: true,
    },
  ],
  horasTotales: 280,
  metas: [
    {
      id: "m250",
      titulo: "Constancia de 250 horas",
      subtitulo: "Abdomen completo",
      acreditadas: 248,
      meta: 250,
      faltan: "2 h",
      alcanzable: true,
    },
    {
      id: "m500",
      titulo: "Constancia de 500 horas",
      subtitulo: "Obstétrico y Doppler",
      acreditadas: 248,
      meta: 500,
      faltan: "252 h",
    },
    {
      id: "m1000",
      titulo: "Certificado del diplomado",
      subtitulo: "Ultrasonografía Médica 1000 h",
      acreditadas: 248,
      meta: 1000,
      faltan: "752 h",
    },
  ],
  horas: { acreditadas: 248, meta: 1000 },
  insignias: [
    { titulo: "Primer caso validado", meta: "mayo", logrado: true },
    { titulo: "20 casos en bitácora", meta: "agosto", logrado: true },
    { titulo: "Racha de 30 días", meta: "septiembre", logrado: true },
    { titulo: "Caso citado en el Ateneo", meta: "octubre", logrado: true },
    { titulo: "50 casos en bitácora", meta: "faltan 8", logrado: false },
  ],
  primerHito: { horas: 100, llevadas: 18 },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const guilloche =
  "repeating-linear-gradient(135deg, rgba(15,45,82,.05) 0 1px, transparent 1px 7px), repeating-linear-gradient(45deg, rgba(26,136,128,.045) 0 1px, transparent 1px 7px)";

/** Sello de aval: placeholder institucional, no recrea identidad de marca. */
function Sello({ size }: { size: number }) {
  return (
    <span
      aria-hidden
      className="relative grid shrink-0 place-items-center rounded-full border-2 bg-card"
      style={{ width: size, height: size, borderColor: "var(--secondary)" }}
    >
      <span
        className="absolute rounded-full border border-dashed"
        style={{ inset: 4, borderColor: "color-mix(in oklab, var(--secondary) 50%, white)" }}
      />
      <span
        className="relative text-center font-bold uppercase leading-tight tracking-[0.1em] text-secondary"
        style={{ fontSize: Math.round(size * 0.13) }}
      >
        Aval
        <br />
        oficial
      </span>
    </span>
  );
}

/** El documento: se ve antes de leerse. */
function Estampa({
  titulo,
  horas,
  alumno,
  alto,
  grande,
}: {
  titulo: string;
  horas: string;
  alumno: string;
  alto: number;
  grande?: boolean;
}) {
  const p = grande ? 28 : 18;
  return (
    <div
      aria-hidden
      className="relative grid place-items-center overflow-hidden border-b border-border"
      style={{ height: alto, padding: p, background: "#fdfdfb", backgroundImage: guilloche }}
    >
      <span
        className="absolute rounded-[4px] border-[1.5px]"
        style={{
          inset: grande ? 16 : 10,
          borderColor: "color-mix(in oklab, var(--secondary) 35%, white)",
        }}
      />
      <span
        className="absolute rounded-[3px] border"
        style={{ inset: grande ? 22 : 14, borderColor: "rgba(15,45,82,.18)" }}
      />
      <span className="relative text-center" style={{ maxWidth: grande ? "78%" : "86%" }}>
        <span
          className="block font-semibold uppercase tracking-[0.24em] text-secondary"
          style={{ fontSize: grande ? 10 : 7.5 }}
        >
          Universidad La Salle
        </span>
        <span
          className="block font-extrabold leading-tight tracking-[-0.02em]"
          style={{ marginTop: grande ? 14 : 8, fontSize: grande ? 26 : 14, color: "var(--sidebar)" }}
        >
          {titulo}
        </span>
        <span
          className={`${mono} block text-muted-foreground`}
          style={{ marginTop: grande ? 12 : 7, fontSize: grande ? 12.5 : 8.5 }}
        >
          otorga a {alumno} · {horas}
        </span>
        <span
          className="mx-auto block"
          style={{
            marginTop: grande ? 18 : 10,
            width: grande ? 180 : 110,
            height: 1,
            background: "rgba(15,45,82,.25)",
          }}
        />
        <span
          className="block font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          style={{ marginTop: grande ? 8 : 5, fontSize: grande ? 9.5 : 7 }}
        >
          Dirección académica
        </span>
      </span>
      <span className="absolute" style={{ right: grande ? 26 : 16, bottom: grande ? 26 : 16 }}>
        <Sello size={grande ? 74 : 40} />
      </span>
    </div>
  );
}

function BotonIcono({
  label,
  icono: Icono,
  onClick,
}: {
  label: string;
  icono: typeof Eye;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-[10px] border border-border bg-card text-[color:var(--foreground-soft)] transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
    >
      <Icono aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
    </button>
  );
}

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function Certificados({ data = MOCK }: { data?: CertificadosData }) {
  const { alumno, destacado, obtenidos, horasTotales, metas, horas, insignias, primerHito } = data;
  const [previa, setPrevia] = useState<Certificado | null>(null);

  /* ── Stubs ─────────────────────────────────────────────── */
  const onVerCertificado = (c: Certificado) => setPrevia(c);
  const onDescargarPDF = (_id: string) => {};
  const onCompartir = (_id: string) => {};
  const onVerificar = (_folio: string) => {};
  /* ──────────────────────────────────────────────────────── */

  /* ── Estado vacío: el documento en blanco dice cuándo se emite ── */
  if (!destacado && obtenidos.length === 0) {
    const h = primerHito ?? { horas: 100, llevadas: 0 };
    return (
      <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
        <div className={`${card} px-10 py-14 text-center`}>
          <div
            aria-hidden
            className="relative mx-auto grid h-[230px] w-full max-w-[420px] place-items-center overflow-hidden rounded-[6px] border border-border"
            style={{ background: "#fdfdfb", backgroundImage: guilloche }}
          >
            <span
              className="absolute rounded-[4px] border-[1.5px] border-dashed"
              style={{ inset: 14, borderColor: "color-mix(in oklab, var(--secondary) 35%, white)" }}
            />
            <span className="relative px-10 text-center">
              <span className="block text-[9px] font-semibold uppercase tracking-[0.24em] text-secondary">
                Universidad La Salle
              </span>
              <span className="mt-3 block text-[19px] font-extrabold leading-snug text-[color:var(--track)]">
                Su primer certificado
                <br />
                se emite a las {h.horas} h
              </span>
            </span>
          </div>
          <h2 className="mt-7 text-[22px] font-bold leading-snug">Todavía no tiene certificados</h2>
          <p className={`mx-auto mt-2.5 max-w-[54ch] text-[14.5px] leading-relaxed ${softText}`}>
            Cada caso que su docente acredita suma horas. Al llegar a las primeras{" "}
            <span className={`${mono} font-bold text-foreground`}>{h.horas} h</span> emitimos su
            constancia con folio verificable y aval institucional.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              className={`h-12 rounded-[10px] bg-primary px-5 text-[14.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
            >
              Seguir mi curso
            </button>
            <button
              type="button"
              className={`h-11 rounded-full border border-border bg-card px-5 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Ver cómo se acreditan las horas
            </button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5 border-t border-border pt-6">
            <span className="text-[12.5px] text-muted-foreground">Va en</span>
            <span className={`${mono} text-[17px] font-extrabold`}>{h.llevadas} h</span>
            <span className="h-2 w-[220px] overflow-hidden rounded-full bg-[color:var(--track)]">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${(h.llevadas / h.horas) * 100}%` }}
              />
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              de las primeras {h.horas} h
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      {/* ───── Destacado ───── */}
      {destacado && (
        <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className={`${card} overflow-hidden`}>
            <Estampa
              titulo={destacado.titulo}
              horas={destacado.horas.replace(" acreditadas", "")}
              alumno={alumno}
              alto={360}
              grande
            />
            <div className="flex flex-wrap items-center gap-3 px-6 py-4">
              {destacado.vigente && (
                <span className="inline-flex h-[26px] items-center gap-1.5 rounded-full bg-accent px-2.5 text-[11.5px] font-bold text-accent-foreground">
                  <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Vigente
                </span>
              )}
              <span className={`${mono} text-[12.5px] text-muted-foreground`}>
                Folio {destacado.folio}
              </span>
              <span className="ml-auto text-[12.5px] text-muted-foreground">
                Emitida el {destacado.emision}
              </span>
            </div>
          </div>

          <aside className={`${card} p-6`}>
            <p className={`${kicker} text-secondary`}>Su reconocimiento más reciente</p>
            <h2
              className="mt-3 text-[22px] font-extrabold leading-tight tracking-[-0.02em]"
              style={{ textWrap: "pretty" }}
            >
              {destacado.titulo}
            </h2>
            {destacado.descripcion && (
              <p className={`mt-2.5 text-[13.5px] leading-relaxed ${softText}`}>
                {destacado.descripcion}
              </p>
            )}
            <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
              {[
                ["Aval", destacado.aval],
                ["Programa", "Ultrasonografía Médica 1000 h"],
                ["Horas", destacado.horas],
                ["Emisión", destacado.emision],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-[13px] text-muted-foreground">{k}</dt>
                  <dd className="text-[13.5px] font-semibold">{v}</dd>
                </div>
              ))}
              <div className="contents">
                <dt className="text-[13px] text-muted-foreground">Folio</dt>
                <dd className={`${mono} text-[13.5px] font-semibold`}>{destacado.folio}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => onDescargarPDF(destacado.id)}
                className={`inline-flex h-12 min-w-[150px] flex-1 items-center justify-center gap-2.5 rounded-[10px] bg-primary text-[14px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
              >
                <Download aria-hidden className="h-[17px] w-[17px]" strokeWidth={1.75} />
                Descargar PDF
              </button>
              <BotonIcono
                label="Ver el certificado completo"
                icono={Eye}
                onClick={() => onVerCertificado(destacado)}
              />
              <BotonIcono label="Compartir" icono={Share2} onClick={() => onCompartir(destacado.id)} />
            </div>
            <button
              type="button"
              onClick={() => onVerificar(destacado.folio)}
              className={`mt-2.5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[13.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <ShieldCheck aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Verificar autenticidad
            </button>
            <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              Cualquier institución puede comprobar el folio en el verificador público, sin necesidad
              de su cuenta.
            </p>
          </aside>
        </section>
      )}

      {/* ───── Lo que está por obtener ───── */}
      <section className="relative mt-7 overflow-hidden rounded-2xl p-6" style={{ background: "var(--secondary)" }}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 150% at 92% 0%, rgba(83,195,190,.5) 0%, rgba(26,136,128,0) 62%)",
          }}
        />
        <svg
          aria-hidden
          viewBox="0 0 900 120"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[84px] w-full"
        >
          <path d="M0 72c144-28 252 20 396 6s252-44 504-10v52H0z" fill="rgba(255,255,255,.08)" />
        </svg>
        <div className="relative">
          <div className="flex flex-wrap items-baseline gap-3">
            <p className={kicker} style={{ color: "var(--hero-ink-soft, #bff0ed)" }}>
              Lo que está por obtener
            </p>
            <p
              className={`${mono} ml-auto text-[12.5px]`}
              style={{ color: "var(--hero-ink-soft, #bff0ed)" }}
            >
              {horas.acreditadas} h acreditadas de {horas.meta} h
            </p>
          </div>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {metas.map((m) => (
              <li
                key={m.id}
                className="rounded-xl p-5"
                style={{ background: m.alcanzable ? "var(--card)" : "rgba(255,255,255,.12)" }}
              >
                <p
                  className="text-[14.5px] font-bold leading-snug"
                  style={{ color: m.alcanzable ? "var(--foreground)" : "var(--hero-ink)" }}
                >
                  {m.titulo}
                </p>
                <p
                  className="mt-1 text-[12.5px]"
                  style={{
                    color: m.alcanzable
                      ? "var(--foreground-soft)"
                      : "var(--hero-ink-soft, #eafaf9)",
                  }}
                >
                  {m.subtitulo}
                </p>
                <div
                  className="mt-4 h-2 overflow-hidden rounded-full"
                  style={{ background: m.alcanzable ? "var(--track)" : "rgba(255,255,255,.22)" }}
                  role="progressbar"
                  aria-valuenow={m.acreditadas}
                  aria-valuemin={0}
                  aria-valuemax={m.meta}
                  aria-label={m.titulo}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (m.acreditadas / m.meta) * 100)}%`,
                      background: m.alcanzable ? "var(--primary)" : "var(--hero-ink)",
                    }}
                  />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span
                    className={`${mono} text-[13px] font-bold`}
                    style={{ color: m.alcanzable ? "var(--secondary)" : "var(--hero-ink)" }}
                  >
                    {m.acreditadas} / {m.meta} h
                  </span>
                  <span
                    className="ml-auto text-[12.5px] font-semibold"
                    style={{
                      color: m.alcanzable ? "var(--foreground)" : "var(--hero-ink-soft, #eafaf9)",
                    }}
                  >
                    le faltan {m.faltan}
                  </span>
                </div>
                {m.alcanzable && (
                  <button
                    type="button"
                    className={`mt-3.5 h-11 w-full rounded-[10px] bg-accent text-[13px] font-bold text-accent-foreground transition-colors hover:bg-[color:var(--track)] ${focusRing}`}
                  >
                    Ver cómo cerrar las {m.faltan}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───── Constancias obtenidas ───── */}
      <section className="mt-7">
        <div className="flex flex-wrap items-center gap-3">
          <p className={`${kicker} text-muted-foreground`}>Constancias obtenidas</p>
          <span className={`${mono} text-[12px] text-muted-foreground`}>
            {obtenidos.length} documentos · {horasTotales} h acreditadas en total
          </span>
          <label className="ml-auto flex h-11 items-center gap-2 rounded-full border border-border bg-card px-4">
            <span className="text-[12.5px] text-muted-foreground">Ordenar</span>
            <select
              defaultValue="recientes"
              className="appearance-none bg-transparent text-[13px] font-semibold text-foreground outline-none"
            >
              <option value="recientes">Más recientes</option>
              <option value="horas">Más horas</option>
            </select>
            <ChevronDown aria-hidden className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
          </label>
        </div>

        <ul className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {obtenidos.map((c) => (
            <li
              key={c.id}
              className={`${card} overflow-hidden transition-colors hover:border-primary`}
            >
              <Estampa titulo={c.titulo} horas={c.horas} alumno={alumno} alto={190} />
              <div className="p-5">
                <p className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary`}>
                  {c.rotulo}
                </p>
                <h3 className="mt-2 text-[16px] font-bold leading-snug">{c.titulo}</h3>
                <p className={`mt-2 text-[12.5px] ${softText}`}>
                  {c.aval} · {c.horas}
                </p>
                <p className={`${mono} mt-1.5 text-[11.5px] text-muted-foreground`}>{c.folio}</p>
                <p className="mt-1 text-[11.5px] text-muted-foreground">{c.emision}</p>
                <div className="mt-4 flex gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => onVerCertificado(c)}
                    className={`h-11 flex-1 rounded-[10px] border border-border bg-card text-[13px] font-semibold text-secondary transition-colors hover:bg-accent ${focusRing}`}
                  >
                    Ver
                  </button>
                  <BotonIcono label="Descargar PDF" icono={Download} onClick={() => onDescargarPDF(c.id)} />
                  <BotonIcono label="Compartir" icono={Share2} onClick={() => onCompartir(c.id)} />
                  <BotonIcono label="Verificar folio" icono={ShieldCheck} onClick={() => onVerificar(c.folio)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ───── Reconocimientos internos ───── */}
      <section className={`${card} mt-7 p-6`}>
        <div className="flex flex-wrap items-center gap-3">
          <p className={`${kicker} text-muted-foreground`}>Reconocimientos del campus</p>
          <span className="text-[12.5px] text-muted-foreground">Internos, sin valor curricular</span>
        </div>
        <ul className="mt-4 flex flex-wrap gap-3">
          {insignias.map((b) => (
            <li
              key={b.titulo}
              className={`flex items-center gap-2.5 rounded-full border border-border py-2 pl-2 pr-4 ${
                b.logrado ? "bg-card" : "bg-muted"
              }`}
            >
              <span
                aria-hidden
                className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full ${
                  b.logrado
                    ? "bg-accent text-accent-foreground"
                    : "border border-dashed border-[color:var(--track)] bg-card text-muted-foreground"
                }`}
              >
                <Award className="h-[17px] w-[17px]" strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-[13px] font-bold leading-snug ${
                    b.logrado ? "" : "text-muted-foreground"
                  }`}
                >
                  {b.titulo}
                </span>
                <span className={`${mono} mt-0.5 block text-[11px] text-muted-foreground`}>
                  {b.meta}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ───── Vista previa + verificación ───── */}
      {previa && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={previa.titulo}
          className="fixed inset-0 z-50 grid place-items-center p-6"
          style={{ background: "rgba(15,45,82,.52)" }}
        >
          <div className="w-full max-w-[900px] overflow-hidden rounded-2xl bg-card shadow-2xl">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
              <div className="min-w-0">
                <p className="text-[16px] font-extrabold tracking-[-0.015em]">{previa.titulo}</p>
                <p className={`${mono} mt-0.5 text-[12px] text-muted-foreground`}>
                  {previa.folio} · carta horizontal
                </p>
              </div>
              <span className="ml-auto flex gap-2">
                <button
                  type="button"
                  className={`h-11 rounded-[10px] border border-border bg-card px-4 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  Imprimir
                </button>
                <button
                  type="button"
                  onClick={() => onDescargarPDF(previa.id)}
                  className={`h-11 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                >
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setPrevia(null)}
                  aria-label="Cerrar"
                  className={`grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${focusRing}`}
                >
                  <X aria-hidden className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
              </span>
            </div>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="p-6" style={{ background: "#eceef0" }}>
                <div className="overflow-hidden rounded-[4px] shadow-xl">
                  <Estampa
                    titulo={previa.titulo}
                    horas={previa.horas}
                    alumno={alumno}
                    alto={420}
                    grande
                  />
                </div>
              </div>
              <div className="flex flex-col gap-5 border-border p-6 lg:border-l">
                <div>
                  <p className={`${kicker} text-muted-foreground`}>Verificación</p>
                  <div className="mt-3 flex gap-3 rounded-[11px] bg-accent p-3.5">
                    <span
                      aria-hidden
                      className="mt-px grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-primary text-[color:var(--sidebar)]"
                    >
                      <Check className="h-[13px] w-[13px]" strokeWidth={3} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-bold leading-snug">
                        Documento auténtico y vigente
                      </span>
                      <span className={`mt-1 block text-[12.5px] leading-relaxed ${softText}`}>
                        Comprobado contra el registro de {previa.aval} el 4 de noviembre.
                      </span>
                    </span>
                  </div>
                </div>

                <div>
                  <p className={`${kicker} text-muted-foreground`}>Enlace para terceros</p>
                  <div className="mt-2.5 flex items-center gap-2 rounded-[10px] border border-border bg-muted px-3.5 py-2.5">
                    <span className={`${mono} min-w-0 flex-1 truncate text-[11.5px] ${softText}`}>
                      campus.medica.mx/v/{previa.folio.slice(-6)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onCompartir(previa.id)}
                      className={`h-8 shrink-0 rounded-full border border-border bg-card px-2.5 text-[11.5px] font-semibold text-secondary ${focusRing}`}
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="mt-2.5 text-[12px] leading-relaxed text-muted-foreground">
                    Quien lo abra ve el folio, el aval y las horas; nunca sus datos de contacto.
                  </p>
                </div>

                <div>
                  <p className={`${kicker} text-muted-foreground`}>Compartir</p>
                  <div className="mt-2.5 flex flex-col gap-2">
                    {["Agregar a LinkedIn", "Enviar por correo", "Copiar el folio"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => onCompartir(previa.id)}
                        className={`h-11 rounded-[10px] border border-border bg-card px-3.5 text-left text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
