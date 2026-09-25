"use client";

/**
 * Studio · Configuración del sistema — hub de gobierno (exclusivo del SÚPER ADMIN)
 *
 *   CabeceraConfig  → título, sello de rol y buscador
 *   FranjaAtencion  → lo crítico (rojo) y los avisos (ámbar / violeta)
 *   GruposAreas     → las 9 áreas en 3 grupos
 *   LogAuditoria    → últimos cambios, siempre auditados
 *
 * ROJO solo por integración caída; ÁMBAR para lo demás pendiente; VIOLETA es Eco (informa, no alarma).
 * El detalle de cada área vive en su propia pantalla.
 */

import { useMemo, useState } from "react";
import type { AreaId, ConfiguracionData } from "./_components/tipos";
import { MOCK } from "./_components/mock";
import { CabeceraConfig } from "./_components/CabeceraConfig";
import { FranjaAtencion } from "./_components/FranjaAtencion";
import { GruposAreas } from "./_components/GruposAreas";
import { LogAuditoria } from "./_components/LogAuditoria";

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
      <CabeceraConfig {...{ busca, setBusca }} />
      <FranjaAtencion {...{ critica, avisos, onAbrirArea }} />
      <GruposAreas {...{ onAbrirArea, gruposFiltrados }} />
      <LogAuditoria {...{ auditoria, onVerLogCompleto }} />
    </div>
  );
}
