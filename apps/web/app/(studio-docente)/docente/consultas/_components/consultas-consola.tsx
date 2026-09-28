'use client';

/**
 * Consultas — canal 1:1 del docente con sus alumnos y el staff (§5B). Tres columnas
 * (h-[calc(100vh-60px)], máx 1400px): bandeja · hilo · Eco. Contraparte del chat del
 * alumno (`app/(campus)/consultas`): una consulta que el alumno abre le llega aquí y el
 * docente responde. Eco asiste; el docente decide (§7A) — nunca se envía por su cuenta.
 *
 * REAL: bandeja + hilo (RLS `es_docente_o_mas`), responder (`responderConsulta` inserta
 * en `consulta_mensajes` y notifica al alumno), cerrar/reabrir (`cambiarEstadoConsulta`).
 * La selección va por query param (?c=) → navegación real que revalida el hilo (SIN
 * realtime · refetch; ganchos de realtime = fase 2). Los datos de Eco (resumen, patrón,
 * material) se derivan de datos reales; el borrador/chat esperan el endpoint (§7A/§13).
 */

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cambiarEstadoConsulta, iniciarConsultaDocente, responderConsulta } from '../../../_lib/acciones';
import type { ConsultaDetalleDoc, ConsultasDocenteData, RecursoEnlazable } from '../../../_lib/contrato';
import { NuevaConversacion, type GrupoContacto } from '@/app/(campus)/consultas/_components/NuevaConversacion';
import type { Contacto } from '@/app/(campus)/consultas/_components/tipos';
import { ListaConsultas } from './ListaConsultas';
import { HiloConsulta } from './HiloConsulta';
import { PanelEcoConsultas } from './PanelEcoConsultas';

// Grupos del modal para el DOCENTE (mismo componente que el alumno, otros contactos).
const GRUPOS_DOCENTE: GrupoContacto[] = [
  { tipo: 'alumno', titulo: 'Mis alumnos', ayuda: 'Los inscritos en sus grupos. Abra un canal 1:1 para darles seguimiento.' },
  { tipo: 'staff', titulo: 'Staff del campus', ayuda: 'Control escolar, coordinación y soporte.' },
  { tipo: 'colega', titulo: 'Colegas docentes', ayuda: 'Otros docentes del campus.' },
];

export function ConsultasConsola({
  data,
  activa,
  contactos,
}: {
  data: ConsultasDocenteData;
  activa: ConsultaDetalleDoc | null;
  contactos: Contacto[];
}) {
  const router = useRouter();
  const [nueva, setNueva] = useState(false);
  const [filtro, setFiltro] = useState<'sin-responder' | 'todas'>('sin-responder');
  const [busca, setBusca] = useState('');
  const [grupoFiltro, setGrupoFiltro] = useState<string | null>(null);
  const [ecoAbierto, setEcoAbierto] = useState(true);
  const [verBorrador, setVerBorrador] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  const activaId = activa?.id ?? null;
  // Al cambiar de hilo (nav), limpia el borrador de Eco y el composer.
  useEffect(() => {
    setVerBorrador(false);
    setRespuesta('');
    setError(null);
    setAviso(null);
  }, [activaId]);

  const visibles = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return data.conversaciones.filter(
      (c) =>
        (filtro === 'todas' || c.estado === 'sin-responder') &&
        (!grupoFiltro || c.contraparte.grupo === grupoFiltro) &&
        (!q || c.contraparte.nombre.toLowerCase().includes(q) || c.ultimoMensaje.toLowerCase().includes(q)),
    );
  }, [data.conversaciones, filtro, grupoFiltro, busca]);

  function abrir(id: string) {
    setVerBorrador(false);
    setRespuesta('');
    router.push(`/docente/consultas?c=${id}`, { scroll: false });
  }

  // El docente inicia una consulta (sin paso de tema): crea/reutiliza el hilo y lo abre;
  // el primer mensaje lo escribe en el composer (como el flujo del alumno).
  function iniciarNueva(contactoId: string) {
    setNueva(false);
    startTransition(async () => {
      const r = await iniciarConsultaDocente(contactoId);
      if (r.ok && r.consultaId) {
        setRespuesta('');
        router.push(`/docente/consultas?c=${r.consultaId}`, { scroll: false });
      }
    });
  }

  function responder() {
    if (!activa) return;
    const cuerpo = respuesta.trim();
    if (!cuerpo) {
      setError('Escriba una respuesta antes de enviar.');
      return;
    }
    const consultaId = activa.id;
    startTransition(async () => {
      const r = await responderConsulta({ consultaId, cuerpo });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      setRespuesta('');
      setVerBorrador(false);
      router.refresh();
    });
  }

  function toggleEstado() {
    if (!activa) return;
    const consultaId = activa.id;
    const estado = activa.estado === 'cerrada' ? 'abierta' : 'cerrada';
    startTransition(async () => {
      const r = await cambiarEstadoConsulta({ consultaId, estado });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
    });
  }

  function enlazar(r: RecursoEnlazable) {
    const enlace = r.href ? `[${r.titulo}](${r.href})` : r.titulo;
    setRespuesta((prev) => (prev.trim() ? `${prev.trimEnd()}\n${enlace}` : enlace));
    setAviso(null);
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-60px)] w-full max-w-[1400px] gap-3.5 px-5 pb-5 pt-5">
      <ListaConsultas
        sinResponder={data.sinResponder}
        grupos={data.grupos}
        grupoFiltro={grupoFiltro}
        setGrupoFiltro={setGrupoFiltro}
        activaId={activaId}
        filtro={filtro}
        setFiltro={setFiltro}
        busca={busca}
        setBusca={setBusca}
        onAbrir={abrir}
        onNueva={() => setNueva(true)}
        visibles={visibles}
      />
      <HiloConsulta
        activa={activa}
        docenteNombre={data.docente.nombre}
        respuesta={respuesta}
        setRespuesta={setRespuesta}
        verBorrador={verBorrador}
        setVerBorrador={setVerBorrador}
        enviando={enviando}
        error={error}
        aviso={aviso}
        onResponder={responder}
        onEnlazar={() => activa && activa.eco.recursos[0] && enlazar(activa.eco.recursos[0])}
        onPedirBorrador={() => setVerBorrador(true)}
        onToggleEstado={toggleEstado}
      />
      <PanelEcoConsultas
        eco={activa?.eco ?? null}
        ecoAbierto={ecoAbierto}
        setEcoAbierto={setEcoAbierto}
        onEnlazar={enlazar}
        onResponderATodos={() => setAviso('Responderles a varios a la vez es una acción de Eco · pendiente de su endpoint conversacional (§7A).')}
        onLlevarAlForo={() => setAviso('Llevar la duda al foro del grupo es una acción de Eco · pendiente de su endpoint (§7A).')}
      />
      {nueva && (
        <NuevaConversacion
          contactos={contactos}
          temas={[]}
          grupos={GRUPOS_DOCENTE}
          conTema={false}
          onIniciar={(id) => iniciarNueva(id)}
          onCerrar={() => setNueva(false)}
        />
      )}
    </div>
  );
}
