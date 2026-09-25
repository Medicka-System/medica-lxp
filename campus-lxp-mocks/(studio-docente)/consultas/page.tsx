"use client";

/**
 * Studio · Consultas (docente) — canal directo alumno ↔ docente
 *
 *   ListaConsultas     → quién espera
 *   HiloConsulta       → la conversación y la respuesta
 *   PanelEcoConsultas  → Eco: resumen, patrón y material
 *
 * Distinto del FORO (discusión cerrada de la lección) y del ATENEO (comunidad abierta): aquí es 1:1.
 * Eco asiste, el docente responde. Un solo color de atención: ÁMBAR para lo no respondido.
 */

import { useMemo, useState } from "react";
import type { ConsultasData, Recurso } from "./_components/tipos";
import { MOCK } from "./_components/mock";
import { ListaConsultas } from "./_components/ListaConsultas";
import { HiloConsulta } from "./_components/HiloConsulta";
import { PanelEcoConsultas } from "./_components/PanelEcoConsultas";

export { EcoMark } from "./_components/ui";

export default function Consultas({ data = MOCK }: { data?: ConsultasData }) {
  const { docente, conversaciones, sinResponder } = data;
  const [activaId, setActivaId] = useState(conversaciones[0].id);
  const [filtro, setFiltro] = useState<"sin-responder" | "todas">("sin-responder");
  const [busca, setBusca] = useState("");
  const [ecoAbierto, setEcoAbierto] = useState(true);
  const [verBorrador, setVerBorrador] = useState(false);
  const [respuesta, setRespuesta] = useState("");

  /* ── Stubs ─────────────────────────────────────────────── */
  const onAbrirConversacion = (id: string) => {
    setActivaId(id);
    setVerBorrador(false);
    setRespuesta("");
  };
  const onResponder = (_id: string, _texto: string) => setRespuesta("");
  const onUsarSugerenciaEco = (_id: string, _texto: string) => {};
  const onEnlazarRecurso = (_r: Recurso) => {};
  const onFiltrar = (_f: string) => {};
  const onPedirBorradorEco = () => setVerBorrador(true);
  const onResponderATodos = () => {};
  const onLlevarAlForo = () => {};
  /* ──────────────────────────────────────────────────────── */

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return conversaciones.filter(
      (c) =>
        (filtro === "todas" || c.estado === "sin-responder") &&
        (!q ||
          c.alumno.nombre.toLowerCase().includes(q) ||
          c.ultimoMensaje.toLowerCase().includes(q)),
    );
  }, [conversaciones, filtro, busca]);

  const activa = conversaciones.find((c) => c.id === activaId) ?? conversaciones[0];
  const eco = activa.eco;

  return (
    <div className="mx-auto flex h-[calc(100vh-60px)] w-full max-w-[1400px] gap-3.5 px-5 pb-5 pt-5">
      <ListaConsultas {...{ sinResponder, activaId, filtro, setFiltro, busca, setBusca, onAbrirConversacion, onFiltrar, visibles }} />
      <HiloConsulta {...{ docente, verBorrador, setVerBorrador, respuesta, setRespuesta, onResponder, onUsarSugerenciaEco, onEnlazarRecurso, onPedirBorradorEco, activa, eco }} />
      <PanelEcoConsultas {...{ ecoAbierto, setEcoAbierto, respuesta, onEnlazarRecurso, onResponderATodos, onLlevarAlForo, eco }} />
    </div>
  );
}
