"use client";

/**
 * Campus · Consultas — mensajería del alumno (página general)
 *
 * Chat 1:1 con docentes, staff y colegas. SIN Eco / sin IA en esta vista.
 * Vive dentro del shell del campus (app/(campus)/layout.tsx).
 * Recibe los datos por props desde el server component / loader; MOCK solo en desarrollo.
 *
 * Stubs a cablear: onEnviar · onCerrarConsulta · onReabrir · onOtraPregunta ·
 * onIniciar (crea o reutiliza conversación) · cargarMensajes · suscripción en tiempo real.
 */

import { useState } from "react";
import { Hilo } from "./_components/Hilo";
import { ListaConversaciones } from "./_components/ListaConversaciones";
import { NuevaConversacion } from "./_components/NuevaConversacion";
import { MENSAJES_MOCK, MOCK, type ConsultasData, type Conversacion, type Mensaje } from "./_components/tipos";

export default function Consultas({
  data = MOCK,
  mensajesIniciales = MENSAJES_MOCK,
}: {
  data?: ConsultasData;
  mensajesIniciales?: Record<string, Mensaje[]>;
}) {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>(data.conversaciones);
  const [mensajes, setMensajes] = useState(mensajesIniciales);
  const [activaId, setActivaId] = useState<string | undefined>(data.conversaciones[0]?.id);
  const [nueva, setNueva] = useState(false);

  const activa = conversaciones.find((c) => c.id === activaId);

  /* ── acciones (sustituir por llamadas a la API) ───────── */
  const abrir = (id: string) => {
    setActivaId(id);
    // marcar como leída al abrir
    setConversaciones((cs) => cs.map((c) => (c.id === id ? { ...c, noLeidos: 0 } : c)));
    // TODO: cargarMensajes(id) si no están en caché
  };

  const onEnviar = (texto: string, _archivos: File[]) => {
    if (!activa) return;
    const m: Mensaje = { id: `tmp-${Date.now()}`, deMi: true, texto, dia: "hoy", hora: new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }), estado: "enviando" };
    setMensajes((ms) => ({ ...ms, [activa.id]: [...(ms[activa.id] ?? []), m] }));
    setConversaciones((cs) =>
      cs.map((c) =>
        c.id === activa.id
          ? { ...c, ultimoMensaje: { texto, deMi: true }, hora: m.hora, estado: c.estado === "respondida" || c.estado === "cerrada" ? "abierta" : c.estado }
          : c,
      ),
    );
    // TODO: POST /consultas/:id/mensajes con texto + archivos → reemplazar tmp y pasar a "enviado"
  };

  const setEstado = (id: string, estado: Conversacion["estado"]) =>
    setConversaciones((cs) => cs.map((c) => (c.id === id ? { ...c, estado, cerradaEl: estado === "cerrada" ? "hoy" : c.cerradaEl } : c)));

  const onCerrarConsulta = (id: string) => setEstado(id, "cerrada"); // TODO: PATCH estado
  const onReabrir = (id: string) => setEstado(id, "abierta"); // TODO: PATCH estado
  const onOtraPregunta = (_id: string) => {}; // enfoca el composer

  const onIniciar = (contactoId: string) => {
    const existente = conversaciones.find((c) => c.contacto.id === contactoId);
    setNueva(false);
    if (existente) return abrir(existente.id);
    const contacto = data.contactos.find((c) => c.id === contactoId);
    if (!contacto) return;
    const nuevaConv: Conversacion = {
      id: `nueva-${contactoId}`,
      contacto,
      ultimoMensaje: { texto: "Conversación nueva", deMi: true },
      hora: "ahora",
      noLeidos: 0,
      estado: contacto.tipo === "colega" ? null : "abierta",
    };
    setConversaciones((cs) => [nuevaConv, ...cs]);
    setActivaId(nuevaConv.id);
    // TODO: POST /consultas { contactoId } → id real
  };
  /* ──────────────────────────────────────────────────────── */

  return (
    <div className="flex h-[calc(100vh-68px)] min-h-0 flex-col gap-4 px-6 pb-6 pt-5 lg:flex-row">
      <ListaConversaciones conversaciones={conversaciones} activaId={activaId} onAbrir={abrir} onNueva={() => setNueva(true)} />

      {activa ? (
        <Hilo
          conversacion={activa}
          mensajes={mensajes[activa.id] ?? []}
          onEnviar={onEnviar}
          onCerrarConsulta={onCerrarConsulta}
          onReabrir={onReabrir}
          onOtraPregunta={onOtraPregunta}
        />
      ) : (
        <section className="grid flex-1 place-items-center rounded-[14px] border border-dashed border-border bg-card p-10 text-center">
          <div>
            <p className="text-[15px] font-bold">Elija una conversación</p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">o inicie una nueva con su docente, el staff o un colega.</p>
          </div>
        </section>
      )}

      {nueva && <NuevaConversacion contactos={data.contactos} onElegir={onIniciar} onCerrar={() => setNueva(false)} />}
    </div>
  );
}
