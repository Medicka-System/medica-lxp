"use client";

/**
 * Detalle de un miembro del staff: rol y permisos, grupos a cargo con su avance, cifras de
 * desempeño (casos validados, tiempo de respuesta, consultas) y registro de actividad.
 */

import {
  ChevronLeft,
  ExternalLink,
  History,
  Lock,
  Mail,
  Pause,
  Phone,
  Send,
  X,
} from "lucide-react";
import { mono, kicker, softText, card, focusRing, EcoMark, ROL, ICONO_CIFRA, ICONO_REGISTRO, Avatar, ChipRol, ChipEstado } from "./ui";
import type { Rol, DetalleStaff } from "./tipos";

export type DetalleMiembroProps = {
  detalle: DetalleStaff;
  setVista: (v: "lista" | "detalle") => void;
  ecoAbierto: boolean;
  setEcoAbierto: (v: boolean) => void;
  onCambiarRol: (id: string, rol: Rol) => void;
  onActivar: (id: string, activo: boolean) => void;
  onPreguntarEco: (q: string) => void;
  onVerActividad: (id: string) => void;
};

export function DetalleMiembro({ detalle, setVista, ecoAbierto, setEcoAbierto, onCambiarRol, onActivar, onPreguntarEco, onVerActividad }: DetalleMiembroProps) {

    const d = detalle;
  return (
    <div className="mx-auto w-full max-w-[1320px] px-6 pb-7 pt-5">
        <div className="flex flex-wrap items-start gap-4">
          <button
            type="button"
            onClick={() => setVista("lista")}
            aria-label="Volver a Staff"
            className={`mt-1.5 grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[9px] border border-border bg-card text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
          >
            <ChevronLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
          </button>

          <Avatar ini={d.ini} size={52} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[21px] font-extrabold leading-tight tracking-[-0.02em]">{d.nombre}</h1>
              <ChipRol rol={d.rol} />
              <ChipEstado activo={d.activo} />
              {d.senal && (
                <span className="inline-flex h-[23px] items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[10.5px] font-bold text-[color:var(--warning-foreground)]">
                  <AlertTriangle aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                  {d.senal}
                </span>
              )}
            </div>
            <p className={`mt-1.5 text-[12.5px] ${softText}`}>
              {d.area} · en la escuela desde <span className={mono}>{d.desde}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-3.5">
              <span className={`inline-flex items-center gap-1.5 text-[12px] ${softText}`}>
                <Mail aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                {d.correo}
              </span>
              <span className={`inline-flex items-center gap-1.5 text-[12px] ${softText}`}>
                <Phone aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                {d.telefono}
              </span>
            </div>
          </div>

          <div className="mt-1.5 flex shrink-0 flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => onVerActividad(d.id)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <History aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              Ver su actividad
            </button>
            <button
              type="button"
              onClick={() => onActivar(d.id, !d.activo)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <Pause aria-hidden className="h-4 w-4" strokeWidth={1.75} />
              {d.activo ? "Desactivar" : "Activar"}
            </button>
            <button
              type="button"
              onClick={() => onCambiarRol(d.id)}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              Cambiar rol
              <ExternalLink aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="mt-5 grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-3.5">
            {/* carga y desempeño según el rol */}
            <section className={`${card} p-[18px]`}>
              <div className="flex flex-wrap items-center gap-2.5">
                <p className={`${kicker} text-muted-foreground`}>
                  Carga y desempeño · {ROL[d.rol].etiqueta.toLowerCase()}
                </p>
                <span className={`${mono} ml-auto whitespace-nowrap text-[10.5px] text-muted-foreground`}>
                  últimos 30 días
                </span>
              </div>

              <div className="mt-3.5 flex gap-2.5">
                {d.cifras.map((c) => {
                  const Icono = ICONO_CIFRA[c.icono];
                  return (
                    <div
                      key={c.etiqueta}
                      className={`min-w-0 flex-1 rounded-[11px] border p-3 ${
                        c.alerta
                          ? "border-[color:var(--warning-border)] bg-[color:var(--warning-surface)]"
                          : "border-border bg-muted"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`grid h-[26px] w-[26px] place-items-center rounded-lg bg-card ${
                          c.alerta ? "text-[color:var(--warning-foreground)]" : "text-accent-foreground"
                        }`}
                      >
                        <Icono className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </span>
                      <p className={`${mono} mt-2.5 text-[19px] font-extrabold leading-none`}>{c.valor}</p>
                      <p
                        className={`mt-1 text-[10.5px] leading-snug ${
                          c.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                        }`}
                      >
                        {c.etiqueta}
                      </p>
                    </div>
                  );
                })}
              </div>

              {d.aviso && (
                <div className="mt-4 flex items-center gap-3.5 rounded-[11px] border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-3.5 py-3">
                  <span
                    aria-hidden
                    className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-card text-[color:var(--warning-foreground)]"
                  >
                    <AlertTriangle className="h-[15px] w-[15px]" strokeWidth={2} />
                  </span>
                  <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-[color:var(--warning-foreground)]">
                    <span className="font-bold">{d.aviso.titulo}</span> {d.aviso.detalle}
                  </p>
                </div>
              )}
            </section>

            {/* docente: grupos que imparte */}
            {d.grupos && d.grupos.length > 0 && (
              <section className={`${card} p-[18px]`}>
                <p className={`${kicker} text-muted-foreground`}>Grupos que imparte</p>
                <ul className="mt-1.5">
                  {d.grupos.map((g) => (
                    <li key={g.nombre} className="flex items-center gap-3.5 border-t border-border py-3">
                      <span className="min-w-0 flex-[1.3]">
                        <span className="block text-[12.5px] font-bold">{g.nombre}</span>
                        <span className={`${mono} mt-0.5 block text-[10.5px] text-muted-foreground`}>
                          {g.alumnos} alumnos
                        </span>
                      </span>
                      <span className="flex min-w-[90px] flex-1 items-center gap-2.5">
                        <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${g.avance}%` }} />
                        </span>
                        <span className={`${mono} shrink-0 text-[12px] font-bold`}>{g.avance}%</span>
                      </span>
                      <span className="w-[150px] shrink-0 text-right">
                        {g.cola ? (
                          <span className="inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full border border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-2.5 text-[11px] font-bold text-[color:var(--warning-foreground)]">
                            <AlertTriangle aria-hidden className="h-3 w-3" strokeWidth={2} />
                            {g.cola}
                          </span>
                        ) : (
                          <span className={`${mono} text-[11px] text-muted-foreground`}>sin cola</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* registro de su trabajo */}
            <section className={`${card} p-[18px]`}>
              <p className={`${kicker} text-muted-foreground`}>Validación y entregas</p>
              <ul className="mt-2.5 flex flex-col gap-0.5">
                {d.registro.map((r) => {
                  const Icono = ICONO_REGISTRO[r.icono];
                  return (
                    <li
                      key={r.titulo}
                      className={`flex items-start gap-2.5 rounded-[9px] px-2.5 py-3 ${
                        r.alerta ? "bg-[color:var(--warning-surface)]" : ""
                      }`}
                    >
                      <Icono
                        aria-hidden
                        className={`mt-px h-[15px] w-[15px] shrink-0 ${
                          r.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                        }`}
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-[12.5px] font-bold ${
                            r.alerta ? "text-[color:var(--warning-foreground)]" : ""
                          }`}
                        >
                          {r.titulo}
                        </span>
                        <span
                          className={`mt-0.5 block text-[11.5px] leading-snug ${
                            r.alerta ? "text-[color:var(--warning-foreground)]" : "text-muted-foreground"
                          }`}
                        >
                          {r.detalle}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          {/* rail: rol con candado + Eco */}
          <div className="flex min-w-0 flex-col gap-3.5">
            <section className={`${card} overflow-hidden`}>
              <div className="flex items-center gap-2.5 border-b border-border bg-muted px-4 py-3.5">
                <p className={`${kicker} min-w-0 flex-1 text-muted-foreground`}>Rol y permisos</p>
                <span className="inline-flex h-[21px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card px-2 text-[10px] font-bold text-muted-foreground">
                  <Lock aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
                  Se edita en Configuración
                </span>
              </div>
              <div className="p-4">
                <dl className="flex flex-col gap-2.5">
                  {d.permisos.map((p) => (
                    <div key={p.etiqueta} className="flex items-baseline gap-2.5">
                      <dt className="w-[100px] shrink-0 text-[11.5px] text-muted-foreground">
                        {p.etiqueta}
                      </dt>
                      <dd className="min-w-0 flex-1 text-right text-[12.5px] font-semibold">{p.valor}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Para cambiar su rol o sus permisos se pasa a Configuración → Usuarios y roles; el
                  cambio queda en auditoría.
                </p>
                <button
                  type="button"
                  onClick={() => onCambiarRol(d.id)}
                  className={`mt-2.5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border border-border bg-card text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  <ExternalLink aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
                  Abrir Usuarios y roles
                </button>
              </div>
            </section>

            {/* Eco: compara la carga del equipo, no repite las cifras */}
            {ecoAbierto && (
              <section className={`${card} overflow-hidden border-[color:var(--info-border)]`}>
                <div className="flex items-center gap-2.5 bg-[color:var(--info-surface)] px-4 py-3.5">
                  <EcoMark size={32} invertido />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold leading-tight">Eco</p>
                    <p className="mt-0.5 text-[10.5px] text-[color:var(--info-foreground)]">
                      Sobre la carga del equipo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEcoAbierto(false)}
                    aria-label="Cerrar Eco"
                    className={`grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] text-[color:var(--info-foreground)] transition-colors hover:bg-card ${focusRing}`}
                  >
                    <X aria-hidden className="h-[15px] w-[15px]" strokeWidth={2} />
                  </button>
                </div>

                <div className="px-4 py-3.5">
                  <div className="flex justify-end">
                    <p className="max-w-[88%] rounded-[13px] rounded-br-[4px] bg-sidebar px-3.5 py-2.5 text-[12.5px] font-medium leading-relaxed text-sidebar-foreground">
                      {d.eco.pregunta}
                    </p>
                  </div>

                  <div className="mt-3 flex gap-2.5">
                    <EcoMark size={26} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12.5px] leading-relaxed ${softText}`}>{d.eco.respuesta}</p>

                      <ul className="mt-2.5 flex flex-col gap-1.5">
                        {d.eco.comparativa.map((c) => (
                          <li key={c.quien} className="flex items-center gap-2.5">
                            <span className="w-[62px] shrink-0 text-[11.5px] font-semibold">{c.quien}</span>
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[color:var(--track)]">
                              <span
                                className={`block h-full rounded-full ${
                                  c.alerta ? "bg-[color:var(--warning)]" : "bg-primary"
                                }`}
                                style={{ width: `${c.pct}%` }}
                              />
                            </span>
                            <span className={`${mono} shrink-0 whitespace-nowrap text-[10px] text-muted-foreground`}>
                              {c.detalle}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <p className={`mt-2.5 text-[12px] leading-relaxed ${softText}`}>
                        <span className="font-bold text-foreground">Sugerencia:</span> {d.eco.sugerencia}
                      </p>

                      <button
                        type="button"
                        className={`mt-2.5 inline-flex h-9 w-full items-center justify-center rounded-[9px] bg-primary text-[12.5px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
                      >
                        {d.eco.cta}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border px-4 pb-3.5 pt-3">
                  <div className="flex gap-1.5 overflow-x-auto">
                    {d.eco.sugerencias.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onPreguntarEco(s)}
                        className={`h-[30px] shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-2.5 text-[11px] font-semibold transition-colors hover:border-[color:var(--info-border)] hover:bg-[color:var(--info-surface)] hover:text-[color:var(--info-foreground)] ${softText} ${focusRing}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <form
                    className="mt-2.5 flex h-10 items-center gap-2.5 rounded-full border border-border bg-muted px-3.5"
                    onSubmit={(ev) => ev.preventDefault()}
                  >
                    <span className="sr-only">Pregúntele a Eco</span>
                    <input
                      type="text"
                      placeholder="Pregúntele a Eco…"
                      className="w-full min-w-0 bg-transparent text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    <button
                      type="submit"
                      aria-label="Enviar"
                      className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-[color:var(--info-foreground)] text-white ${focusRing}`}
                    >
                      <Send aria-hidden className="h-3 w-3" strokeWidth={1.75} />
                    </button>
                  </form>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
  );
}
