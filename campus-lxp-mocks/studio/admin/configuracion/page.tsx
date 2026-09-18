"use client";

/**
 * Studio · Configuración del sistema — hub de gobierno (exclusivo del SÚPER ADMIN)
 *
 * No es un menú plano de nueve renglones: son tres grupos por lo que gobiernan
 *   · Personas y acceso        → usuarios y roles, seguridad y auditoría, notificaciones
 *   · Inteligencia y conexiones → IA/Eco, integraciones, almacenamiento y LRS
 *   · Academia y marca          → académico global, badges, marca y apariencia
 *
 * Cada área es una ficha: número, nombre, qué hay dentro (chips) y el dato que importa hoy
 * (gasto contra el tope, semáforos de integraciones, TB usados, la paleta viva). El detalle de
 * cada área vive en su propia pantalla.
 *
 * Color: ROJO solo por integración caída (una vez, en la franja y en el borde de esa tarjeta);
 * ÁMBAR para lo demás pendiente; VIOLETA es Eco, que informa y no alarma.
 *
 * Stubs: onAbrirArea(id) · onBuscarAjuste · onVerLogCompleto
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  BellRing,
  ChevronRight,
  Database,
  Lock,
  Palette,
  Plug,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { mono, kickerTight as kicker, softText, card, focusRing } from "@/components/tokens";

/* ───────────────────────────── Tipos ───────────────────────────── */

export type AreaId =
  | "usuarios"
  | "ia"
  | "integraciones"
  | "academico"
  | "marca"
  | "almacenamiento"
  | "notificaciones"
  | "seguridad"
  | "badges";

export type TonoArea = "ok" | "warn" | "down" | "info" | "neutro";

export type PieArea =
  | { tipo: "texto"; texto: string }
  | { tipo: "barra"; pct: number; color: "primary" | "info"; texto: string }
  | { tipo: "semaforo"; estados: TonoArea[]; texto: string }
  | { tipo: "paleta"; colores: string[]; texto: string };

export type AreaConfig = {
  id: AreaId;
  numero: string;
  titulo: string;
  descripcion: string;
  dentro: string[];
  estado?: string;
  tono: TonoArea;
  pie?: PieArea;
  icono:
    | "usuarios"
    | "eco"
    | "integraciones"
    | "academico"
    | "marca"
    | "almacenamiento"
    | "notificaciones"
    | "seguridad"
    | "badges";
};

export type GrupoAreas = { rotulo: string; nota: string; areas: AreaConfig[] };

export type AvisoConfig = {
  id: string;
  titulo: string;
  valor: string;
  detalle: string;
  area: string;
  tono: "warn" | "info";
};

export type CambioAuditoria = {
  id: string;
  ini: string;
  quien: string;
  accion: string;
  donde: string;
  cuando: string;
};

export type ConfiguracionData = {
  critica?: { titulo: string; detalle: string; cta: string; area: AreaId };
  avisos: AvisoConfig[];
  grupos: GrupoAreas[];
  auditoria: { retencionMeses: number; eventosMes: number; cambios: CambioAuditoria[] };
};

const MOCK: ConfiguracionData = {
  critica: {
    titulo: "MiCo+ está caída desde las 11:42.",
    detalle:
      "Es lo único en rojo de esta pantalla: la sesión de mañana 18:30 depende del equipo. Revise credenciales en Integraciones.",
    cta: "Abrir Integraciones",
    area: "integraciones",
  },
  avisos: [
    { id: "v1", titulo: "Claves de API sin rotar", valor: "2 de 5", detalle: "Zoom y CORA llevan 11 meses con la misma clave.", area: "Seguridad", tono: "warn" },
    { id: "v2", titulo: "Aval académico por renovar", valor: "38 días", detalle: "Universidad La Salle · Ultrasonografía Médica.", area: "Académico", tono: "warn" },
    { id: "v3", titulo: "Gasto de Eco en el periodo", valor: "61% del tope", detalle: "$1 840 de $3 000 · proyecta $2 410 al cierre.", area: "IA / Eco", tono: "info" },
  ],
  grupos: [
    {
      rotulo: "Personas y acceso",
      nota: "quién entra y qué puede hacer",
      areas: [
        {
          id: "usuarios",
          numero: "01",
          titulo: "Usuarios y roles",
          descripcion:
            "Alta de staff y asignación de roles: súper admin, admin, docente y diseñador, con sus permisos.",
          dentro: ["128 usuarios", "4 roles", "Permisos por sección"],
          estado: "3 solicitudes",
          tono: "warn",
          icono: "usuarios",
          pie: { tipo: "texto", texto: "2 docentes nuevos y 1 cambio de rol esperan aprobación" },
        },
        {
          id: "seguridad",
          numero: "08",
          titulo: "Seguridad y auditoría",
          descripcion:
            "Políticas de acceso, duración de sesiones y el log de auditoría: quién hizo qué y cuándo.",
          dentro: ["Sesiones", "Doble factor", "Logs de auditoría"],
          estado: "2 claves sin rotar",
          tono: "warn",
          icono: "seguridad",
          pie: { tipo: "texto", texto: "18 420 eventos registrados este mes · retención 24 meses" },
        },
        {
          id: "notificaciones",
          numero: "07",
          titulo: "Notificaciones",
          descripcion:
            "Plantillas y canales de los avisos automáticos del campus, por correo y WhatsApp.",
          dentro: ["14 plantillas", "Correo", "WhatsApp"],
          estado: "Al día",
          tono: "ok",
          icono: "notificaciones",
          pie: { tipo: "texto", texto: "1 284 envíos en 24 h · 0.4% de rebote" },
        },
      ],
    },
    {
      rotulo: "Inteligencia y conexiones",
      nota: "lo que hace funcionar la plataforma",
      areas: [
        {
          id: "ia",
          numero: "02",
          titulo: "IA / Eco",
          descripcion:
            "Modelo por tarea del pipeline, umbral de auto-aprobación, autonomía de Eco, el RAG y el costo del periodo.",
          dentro: ["Modelos por tarea", "Umbrales", "RAG e índice", "Costos"],
          estado: "61% del tope",
          tono: "info",
          icono: "eco",
          pie: { tipo: "barra", pct: 61, color: "info", texto: "$1 840 / $3 000" },
        },
        {
          id: "integraciones",
          numero: "03",
          titulo: "Integraciones",
          descripcion:
            "Zoom, MiCo+ (Mindray), CORA, pasarela de pagos y correo: estado, credenciales y sincronizaciones.",
          dentro: ["5 servicios", "Credenciales", "Webhooks"],
          estado: "1 caída",
          tono: "down",
          icono: "integraciones",
          pie: {
            tipo: "semaforo",
            estados: ["down", "ok", "ok", "warn", "ok"],
            texto: "MiCo+ caída · pasarela degradada · 3 operativas",
          },
        },
        {
          id: "almacenamiento",
          numero: "06",
          titulo: "Almacenamiento, media y LRS",
          descripcion:
            "Object storage de DICOM y video, límites por grupo, y la configuración del LRS (xAPI).",
          dentro: ["4.8 / 8 TB", "Transcodificación", "LRS xAPI"],
          estado: "60% usado",
          tono: "ok",
          icono: "almacenamiento",
          pie: { tipo: "barra", pct: 60, color: "primary", texto: "13 meses" },
        },
      ],
    },
    {
      rotulo: "Academia y marca",
      nota: "las reglas del programa y la cara del campus",
      areas: [
        {
          id: "academico",
          numero: "04",
          titulo: "Académico global",
          descripcion:
            "Avales, plantillas de certificado, parámetros de competencia I-AIM y reglas de acreditación de horas.",
          dentro: ["1 aval", "3 plantillas", "I-AIM", "Horas"],
          estado: "Aval por renovar",
          tono: "warn",
          icono: "academico",
          pie: { tipo: "texto", texto: "Universidad La Salle · vence en 38 días" },
        },
        {
          id: "badges",
          numero: "09",
          titulo: "Badges y reconocimientos",
          descripcion:
            "Insignias con reglas automáticas —hitos, casos, competencia— o entregadas a mano, para alumnos y docentes.",
          dentro: ["12 insignias", "Reglas automáticas", "Alumnos y docentes"],
          estado: "2 borradores",
          tono: "neutro",
          icono: "badges",
          pie: { tipo: "texto", texto: "848 insignias otorgadas · 3 reglas activas" },
        },
        {
          id: "marca",
          numero: "05",
          titulo: "Marca y apariencia",
          descripcion:
            "Logo, paleta, tipografía y dominios del campus: cómo se ve la plataforma para el alumno.",
          dentro: ["Logo", "Paleta", "Dominios"],
          estado: "Publicada",
          tono: "ok",
          icono: "marca",
          pie: {
            tipo: "paleta",
            colores: ["#53c3be", "#1a8880", "#0f2d52", "#F8F9FA"],
            texto: "campus.medicacapacitacion.mx",
          },
        },
      ],
    },
  ],
  auditoria: {
    retencionMeses: 24,
    eventosMes: 18420,
    cambios: [
      { id: "c1", ini: "RV", quien: "Rodrigo V.", accion: "subió el tope de gasto de Eco", donde: "$2 500 → $3 000 · IA / Eco", cuando: "hace 2 h" },
      { id: "c2", ini: "RV", quien: "Rodrigo V.", accion: "creó la insignia “Primer caso validado”", donde: "regla automática · Badges", cuando: "ayer" },
      { id: "c3", ini: "SG", quien: "Sandra G.", accion: "rotó las credenciales de la pasarela", donde: "Integraciones", cuando: "hace 3 días" },
      { id: "c4", ini: "RV", quien: "Rodrigo V.", accion: "cambió la retención de logs a 24 meses", donde: "Seguridad y auditoría", cuando: "hace 5 días" },
    ],
  },
};

/* ───────────────────────── Estilo compartido ───────────────────────── */


const ICONOS = {
  usuarios: Users,
  eco: Sparkles,
  integraciones: Plug,
  academico: Award,
  marca: Palette,
  almacenamiento: Database,
  notificaciones: BellRing,
  seguridad: ShieldCheck,
  badges: Award,
} as const;

const TONO_CHIP: Record<TonoArea, string> = {
  ok: "bg-accent text-accent-foreground",
  warn: "border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]",
  down: "border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]",
  info: "border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]",
  neutro: "border border-border bg-muted text-muted-foreground",
};

const TONO_PUNTO: Record<TonoArea, string> = {
  ok: "bg-secondary",
  warn: "bg-[color:var(--warning)]",
  down: "bg-[color:var(--destructive)]",
  info: "bg-[color:var(--info)]",
  neutro: "bg-[color:var(--track)]",
};

/* ───────────────────────────── Pantalla ───────────────────────────── */

export default function ConfiguracionSistema({ data = MOCK }: { data?: ConfiguracionData }) {
  const { critica, avisos, grupos, auditoria } = data;
  const [busca, setBusca] = useState("");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirArea = (_id: AreaId) => {};
  const onVerLogCompleto = () => {};
  /* ──────────────────────────────────────────────────────── */

  const gruposFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return grupos;
    return grupos
      .map((g) => ({
        ...g,
        areas: g.areas.filter(
          (a) =>
            a.titulo.toLowerCase().includes(q) ||
            a.descripcion.toLowerCase().includes(q) ||
            a.dentro.some((d) => d.toLowerCase().includes(q)),
        ),
      }))
      .filter((g) => g.areas.length > 0);
  }, [grupos, busca]);

  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
      {/* cabecera: el rol se declara, y la consecuencia de tocar algo aquí también */}
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
              Configuración del sistema
            </h1>
            <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full bg-sidebar px-2.5 text-[10.5px] font-bold text-sidebar-foreground">
              <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
              Solo súper admin
            </span>
          </div>
          <p className={`mt-1.5 text-[12.5px] ${softText}`}>
            Nueve áreas de gobierno. Todo cambio queda registrado con su nombre y hora.
          </p>
        </div>

        <label className="ml-auto flex h-10 w-[300px] items-center gap-2 rounded-[9px] border border-border bg-card px-3 transition-colors focus-within:border-secondary">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          <span className="sr-only">Buscar un ajuste</span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar un ajuste…"
            className="w-full min-w-0 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>

      {/* ══ lo que requiere atención sube: no se esconde en su tarjeta ══ */}
      {critica && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--destructive-border)] bg-[color:var(--destructive-surface)] px-[18px] py-3.5">
          <span
            aria-hidden
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--destructive-foreground)]"
          >
            <AlertTriangle className="h-[17px] w-[17px]" strokeWidth={2} />
          </span>
          <p className="min-w-[280px] flex-1 text-[13px] leading-relaxed text-[color:var(--destructive-foreground)]">
            <span className="font-bold">{critica.titulo}</span> {critica.detalle}
          </p>
          <button
            type="button"
            onClick={() => onAbrirArea(critica.area)}
            className={`h-10 shrink-0 whitespace-nowrap rounded-[10px] border border-[color:var(--destructive-border)] bg-card px-3.5 text-[12.5px] font-bold text-[color:var(--destructive-foreground)] ${focusRing}`}
          >
            {critica.cta}
          </button>
        </div>
      )}

      <ul className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {avisos.map((v) => {
          const warn = v.tono === "warn";
          const clase = warn
            ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] text-[color:var(--warning-foreground)]"
            : "border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]";
          return (
            <li key={v.id} className={`rounded-xl border p-3.5 ${clase}`}>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[12.5px] font-bold">{v.titulo}</span>
                <span className={`${mono} text-[12px] font-bold`}>{v.valor}</span>
              </div>
              <p className="mt-1.5 text-[11.5px] leading-relaxed">{v.detalle}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-bold">
                {v.area}
                <ChevronRight aria-hidden className="h-3 w-3" strokeWidth={2.2} />
              </span>
            </li>
          );
        })}
      </ul>

      {/* ══ las nueve áreas, agrupadas por lo que gobiernan ══ */}
      <div className="mt-6 flex flex-col gap-6">
        {gruposFiltrados.map((g) => (
          <section key={g.rotulo}>
            <div className="flex items-center gap-2.5">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em]">{g.rotulo}</h2>
              <span className="text-[11.5px] text-muted-foreground">{g.nota}</span>
              <span aria-hidden className="h-px flex-1 bg-border" />
            </div>

            <ul className="mt-3.5 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
              {g.areas.map((a) => {
                const Icono = ICONOS[a.icono];
                const caida = a.tono === "down";
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => onAbrirArea(a.id)}
                      className={`flex h-full w-full flex-col rounded-xl border p-[18px] text-left shadow-[0_1px_3px_rgba(17,24,39,0.06)] transition-colors hover:border-primary ${focusRing} ${
                        caida ? "border-[color:var(--destructive-border)] bg-card" : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[11px] ${
                            caida
                              ? "bg-[color:var(--destructive-surface)] text-[color:var(--destructive-foreground)]"
                              : a.tono === "info"
                                ? "bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]"
                                : "bg-accent text-accent-foreground"
                          }`}
                        >
                          <Icono className="h-[19px] w-[19px]" strokeWidth={1.75} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={`${mono} text-[10px] text-muted-foreground`}>
                              {a.numero}
                            </span>
                            <span className="text-[14.5px] font-bold leading-tight">{a.titulo}</span>
                            {a.estado && (
                              <span
                                className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${TONO_CHIP[a.tono]}`}
                              >
                                {(a.tono === "down" || a.tono === "warn") && (
                                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
                                )}
                                {a.estado}
                              </span>
                            )}
                          </span>
                          <span
                            className={`mt-1.5 block text-[12.5px] leading-relaxed ${softText}`}
                            style={{ textWrap: "pretty" }}
                          >
                            {a.descripcion}
                          </span>
                        </span>

                        <ChevronRight
                          aria-hidden
                          className="mt-2 h-[17px] w-[17px] shrink-0 text-[color:var(--track)]"
                          strokeWidth={2}
                        />
                      </div>

                      {/* qué hay dentro */}
                      <div className="mt-3.5 flex flex-wrap gap-1.5">
                        {a.dentro.map((d) => (
                          <span
                            key={d}
                            className={`inline-flex h-6 items-center whitespace-nowrap rounded-full border border-border bg-muted px-2.5 text-[11px] font-medium ${softText}`}
                          >
                            {d}
                          </span>
                        ))}
                      </div>

                      {/* el dato que importa hoy */}
                      {a.pie && (
                        <div className="mt-3.5 flex items-center gap-2 border-t border-border pt-3">
                          {a.pie.tipo === "barra" && (
                            <>
                              <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                                <span
                                  aria-hidden
                                  className={`block h-full rounded-full ${
                                    a.pie.color === "info" ? "bg-[color:var(--info)]" : "bg-primary"
                                  }`}
                                  style={{ width: `${a.pie.pct}%` }}
                                />
                              </span>
                              <span
                                className={`${mono} shrink-0 text-[11px] font-bold ${
                                  a.pie.color === "info"
                                    ? "text-[color:var(--info-foreground)]"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {a.pie.texto}
                              </span>
                            </>
                          )}

                          {a.pie.tipo === "semaforo" && (
                            <>
                              <span className="flex shrink-0 items-center gap-1.5">
                                {a.pie.estados.map((e, i) => (
                                  <span
                                    key={i}
                                    aria-hidden
                                    className={`h-[9px] w-[9px] rounded-full ${TONO_PUNTO[e]}`}
                                  />
                                ))}
                              </span>
                              <span className="min-w-0 flex-1 text-[11px] text-muted-foreground">
                                {a.pie.texto}
                              </span>
                            </>
                          )}

                          {a.pie.tipo === "paleta" && (
                            <>
                              <span className="flex shrink-0 items-center gap-1.5">
                                {a.pie.colores.map((c) => (
                                  <span
                                    key={c}
                                    aria-hidden
                                    className="h-3.5 w-3.5 rounded-[5px] border border-[rgba(17,24,39,0.1)]"
                                    style={{ background: c }}
                                  />
                                ))}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                                {a.pie.texto}
                              </span>
                            </>
                          )}

                          {a.pie.tipo === "texto" && (
                            <span className="min-w-0 flex-1 text-[11px] text-muted-foreground">
                              {a.pie.texto}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* ══ el gobierno se audita: el log vive aquí, no escondido en Seguridad ══ */}
      <section className={`${card} mt-6 p-[18px]`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <p className={`${kicker} text-muted-foreground`}>Últimos cambios de configuración</p>
          <span
            className={`inline-flex h-[21px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-muted px-2 text-[10px] font-bold text-muted-foreground`}
          >
            <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
            Queda en auditoría
          </span>
          <button
            type="button"
            onClick={onVerLogCompleto}
            className={`ml-auto h-8 whitespace-nowrap rounded-[9px] border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            Ver el log completo
          </button>
        </div>

        <ul className="mt-2.5 flex flex-col gap-0.5">
          {auditoria.cambios.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-2.5 rounded-[9px] px-2 py-2.5 transition-colors hover:bg-muted"
            >
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sidebar text-[10px] font-bold text-sidebar-foreground"
              >
                {c.ini}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-[12.5px] leading-snug ${softText}`}>
                  <span className="font-bold text-foreground">{c.quien}</span> {c.accion}
                </span>
                <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                  {c.donde}
                </span>
              </span>
              <span className={`${mono} shrink-0 whitespace-nowrap text-[11px] text-muted-foreground`}>
                {c.cuando}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">
          {auditoria.eventosMes.toLocaleString("es-MX")} eventos registrados este mes · retención{" "}
          {auditoria.retencionMeses} meses.
        </p>
      </section>
    </div>
  );
}
