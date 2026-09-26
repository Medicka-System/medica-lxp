"use client";

/**
 * Cabecera: "Configuración del sistema", sello "Solo súper admin" y buscador de ajustes.
 */

import {
  Lock,
  Search,
} from "lucide-react";
import { softText } from "./ui";

export type CabeceraConfigProps = {
  busca: string;
  setBusca: (v: string) => void;
};

export function CabeceraConfig({ busca, setBusca }: CabeceraConfigProps) {
  return (
    <>
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
    </>
  );
}
