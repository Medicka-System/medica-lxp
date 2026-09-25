"use client";

/**
 * Studio · Anuncios — gestor de la comunicación oficial de la escuela
 *
 *   ListaAnuncios  → qué se publicó, a quién, por dónde, hasta cuándo y cuántos lo vieron
 *   EditorAnuncio  → crear / editar con Eco, segmentación por rol, canales, caducidad y vista previa
 *
 * La misma pantalla sirve a súper admin, admin y docente; el rol acota el alcance (ALCANCE_POR_ROL).
 * La caducidad es obligatoria. Eco redacta pero no firma. ROJO solo para prioridad urgente.
 */

import { useMemo, useState } from "react";
import type { AnunciosData } from "./_components/tipos";
import { MOCK } from "./_components/mock";
import { ALCANCE_POR_ROL } from "./_components/ui";
import { ListaAnuncios } from "./_components/ListaAnuncios";
import { EditorAnuncio } from "./_components/EditorAnuncio";

export { EcoMark, ALCANCE_POR_ROL } from "./_components/ui";

export default function Anuncios({ data = MOCK }: { data?: AnunciosData }) {
  const { rol, anuncios, conteos, resumen } = data;
  const [vista, setVista] = useState<"lista" | "editor">("lista");
  const [filtro, setFiltro] = useState<EstadoAnuncio>("publicado");
  const [busca, setBusca] = useState("");

  /* estado del editor */
  const [titulo, setTitulo] = useState("Ya está abierto el módulo de Doppler renal");
  const [alcance, setAlcance] = useState<TipoAlcance>("generacion");
  const [canales, setCanales] = useState<Canal[]>(["app", "correo"]);
  const [prioridad, setPrioridad] = useState<Prioridad>("importante");
  const [borradorEco, setBorradorEco] = useState(true);
  const [previsualiza, setPrevisualiza] = useState<"home" | "correo">("home");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onNuevoAnuncio = () => setVista("editor");
  const onEditar = (_id: string) => setVista("editor");
  const onDuplicar = (_id: string) => {};
  const onPublicar = () => {};
  const onProgramar = () => {};
  const onRedactarConEco = () => setBorradorEco(true);
  const onSegmentar = (t: TipoAlcance) => setAlcance(t);
  const onVistaPrevia = (v: "home" | "correo") => setPrevisualiza(v);
  /* ──────────────────────────────────────────────────────── */

  const permitidos = ALCANCE_POR_ROL[rol];
  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return anuncios.filter(
      (a) =>
        a.estado === filtro &&
        (!q || a.titulo.toLowerCase().includes(q) || a.alcance.etiqueta.toLowerCase().includes(q)),
    );
  }, [anuncios, filtro, busca]);

  if (vista === "editor") {
    return <EditorAnuncio {...{ rol, vista, setVista, titulo, setTitulo, alcance, canales, setCanales, prioridad, setPrioridad, borradorEco, setBorradorEco, previsualiza, onPublicar, onProgramar, onRedactarConEco, onSegmentar, onVistaPrevia, permitidos }} />;
  }

  return <ListaAnuncios {...{ rol, conteos, resumen, filtro, setFiltro, busca, setBusca, alcance, onNuevoAnuncio, onEditar, onDuplicar, visibles }} />;
}
