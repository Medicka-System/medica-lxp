'use client';

/**
 * Consultas (alumno) — chat 1:1 con docentes, staff y colegas. SIN Eco / SIN realtime.
 * Datos reales por props; las acciones corren en el servidor bajo RLS. Envío OPTIMISTA
 * (enviando→enviado) y el hilo se REFETCHEA al enviar/abrir (los mensajes nuevos llegan
 * por refetch, no por WebSocket).
 *
 * PENDIENTE DE REALTIME (fase 2): mensaje nuevo push, "escribiendo…", presencia en vivo,
 * confirmación de lectura del contacto. Los ganchos quedan documentados, no implementados.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useCanalRealtime } from '@/lib/realtime/use-canal';
import { Hilo } from './Hilo';
import { ListaConversaciones } from './ListaConversaciones';
import { NuevaConversacion } from './NuevaConversacion';
import type { ConsultasData, Conversacion, Mensaje } from './tipos';
import {
  getMensajesConsulta,
  marcarLeidaConsulta,
  enviarMensajeConsulta,
  iniciarConsulta,
  cerrarConsulta,
  reabrirConsulta,
} from '@/lib/campus/consultas-chat-acciones';

export function ConsultasCliente({ data }: { data: ConsultasData }) {
  const router = useRouter();
  const [conversaciones, setConversaciones] = useState<Conversacion[]>(data.conversaciones);
  const [mensajes, setMensajes] = useState<Record<string, Mensaje[]>>({});
  const [activaId, setActivaId] = useState<string | undefined>(data.conversaciones[0]?.id);
  const [nueva, setNueva] = useState(false);
  const [, iniciar] = useTransition();

  const activa = conversaciones.find((c) => c.id === activaId);

  // Realtime (§7): mensaje nuevo en el hilo ACTIVO → re-consulta el hilo bajo RLS
  // (no confía en el payload) y refresca la bandeja. No-op en dev local sin Supabase.
  useCanalRealtime(
    activaId && !activaId.startsWith('nueva-') ? `consulta:${activaId}` : null,
    () => {
      if (!activaId) return;
      cargar(activaId, true);
      router.refresh();
    },
  );

  // Carga el hilo (y marca leído) si no está en caché. Los nuevos llegan por refetch.
  const cargar = (id: string, forzar = false) => {
    if (!forzar && mensajes[id]) return;
    getMensajesConsulta(id)
      .then((ms) => setMensajes((prev) => ({ ...prev, [id]: ms })))
      .catch(() => {});
  };

  const abrir = (id: string) => {
    setActivaId(id);
    setConversaciones((cs) => cs.map((c) => (c.id === id ? { ...c, noLeidos: 0 } : c)));
    cargar(id);
    // Si es una conversación real (no temporal), marca leído en el server.
    if (!id.startsWith('nueva-')) iniciar(() => void marcarLeidaConsulta(id));
  };

  const onEnviar = (texto: string, _archivos: File[]) => {
    if (!activa) return;
    // Subida real de archivos: PENDIENTE. Por ahora se envía el texto.
    const ahora = new Date();
    const hora = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    const tmp: Mensaje = { id: `tmp-${ahora.getTime()}`, deMi: true, texto, dia: 'hoy', hora, estado: 'enviando' };
    const convId = activa.id;
    setMensajes((ms) => ({ ...ms, [convId]: [...(ms[convId] ?? []), tmp] }));
    setConversaciones((cs) =>
      cs.map((c) =>
        c.id === convId
          ? { ...c, ultimoMensaje: { texto, deMi: true }, hora, estado: c.estado === 'respondida' || c.estado === 'cerrada' ? 'abierta' : c.estado }
          : c,
      ),
    );
    iniciar(async () => {
      const r = await enviarMensajeConsulta(convId, texto);
      if (r.ok) {
        // Refetch: reemplaza el temporal por el real + trae mensajes nuevos del contacto.
        const frescos = await getMensajesConsulta(convId).catch(() => null);
        if (frescos) setMensajes((prev) => ({ ...prev, [convId]: frescos }));
        router.refresh();
      } else {
        setMensajes((ms) => ({
          ...ms,
          [convId]: (ms[convId] ?? []).map((m) => (m.id === tmp.id ? { ...m, estado: 'error' } : m)),
        }));
      }
    });
  };

  const setEstadoLocal = (id: string, estado: Conversacion['estado']) =>
    setConversaciones((cs) => cs.map((c) => (c.id === id ? { ...c, estado, cerradaEl: estado === 'cerrada' ? 'hoy' : c.cerradaEl } : c)));

  const onCerrarConsulta = (id: string) => {
    setEstadoLocal(id, 'cerrada');
    iniciar(async () => {
      await cerrarConsulta(id);
      router.refresh();
    });
  };
  const onReabrir = (id: string) => {
    setEstadoLocal(id, 'abierta');
    iniciar(async () => {
      await reabrirConsulta(id);
      router.refresh();
    });
  };
  const onOtraPregunta = (_id: string) => {
    /* enfoca el composer · el textarea ya recibe foco al montar */
  };

  const onIniciar = (contactoId: string, origenLeccionId: string | null) => {
    setNueva(false);
    const existente = conversaciones.find((c) => c.contacto.id === contactoId);
    if (existente) return abrir(existente.id);
    iniciar(async () => {
      const r = await iniciarConsulta(contactoId, origenLeccionId);
      if (r.ok && r.consultaId) {
        const contacto = data.contactos.find((c) => c.id === contactoId);
        if (contacto) {
          const conv: Conversacion = {
            id: r.consultaId,
            contacto,
            ultimoMensaje: { texto: 'Conversación nueva', deMi: true },
            hora: 'ahora',
            noLeidos: 0,
            estado: contacto.tipo === 'colega' ? null : 'abierta',
          };
          setConversaciones((cs) => [conv, ...cs.filter((c) => c.id !== conv.id)]);
          setActivaId(r.consultaId);
          setMensajes((ms) => ({ ...ms, [r.consultaId!]: [] }));
        }
        router.refresh();
      }
    });
  };

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

      {nueva && <NuevaConversacion contactos={data.contactos} temas={data.temas} onIniciar={onIniciar} onCerrar={() => setNueva(false)} />}
    </div>
  );
}
