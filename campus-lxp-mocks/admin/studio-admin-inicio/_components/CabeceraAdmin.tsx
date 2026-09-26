"use client";

/**
 * Cabecera: "Centro de control", fecha y los accesos de gobierno (usuarios y roles, integraciones,
 * analítica, configuración).
 */

import {
  ExternalLink,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import { softText, focusRing } from "./ui";

export type CabeceraAdminProps = {
  fecha: string;
  onIrAConfig: (area: string) => void;
};

export function CabeceraAdmin({ fecha, onIrAConfig }: CabeceraAdminProps) {
  return (
    <>
      {/* cabecera + accesos de gobierno */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.02em]">
            Centro de control
          </h1>
          <p className={`mt-1 text-[12.5px] ${softText}`}>
            {fecha} · cómo va la escuela y si todo está funcionando.
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {(
            [
              ["Usuarios y roles", Users],
              ["Integraciones", ExternalLink],
              ["Analítica", TrendingUp],
              ["Configuración", Settings],
            ] as const
          ).map(([t, Icono]) => (
            <button
              key={t}
              type="button"
              onClick={() => onIrAConfig(t)}
              className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
            >
              <Icono aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
              {t}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
