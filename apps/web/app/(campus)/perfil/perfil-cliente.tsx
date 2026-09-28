'use client';

/**
 * Campus · MI PERFIL — quién es y cómo va (§3 de la spec). Ficha con portada.
 * Vive dentro del shell del campus.
 *
 * - Modo edición (Fase 2): "Editar perfil" desbloquea Sobre mí + Datos de contacto,
 *   hace scroll + foco al primer campo de contacto; al guardar (server actions
 *   comoAlumno) persiste y RE-BLOQUEA, reactivando el botón.
 * - "Ver como me ven" (Fase 3): reutiliza el modal PerfilColega del Ateneo con el
 *   propio id (esPropio: sin conectar/mensaje, con banner + volver).
 * - Foto y portada (Fase 4): uploader público de media (firma → PUT → persistir ref).
 */

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import type { Cifra, Contacto, PerfilData } from '../cuenta/_components/tipos';
import {
  Certificados,
  ContactoForm,
  DatosAcademicos,
  DominioResumen,
  Insignias,
  PortadaPerfil,
  SobreMi,
} from '../cuenta/_components/PerfilBloques';
import { PerfilColega } from '../ateneo/_components/Social';
import type { PerfilColegaData } from '../ateneo/_components/tipos';
import {
  firmarSubidaPerfil,
  guardarAvatar,
  guardarContacto,
  guardarPortada,
  guardarSobreMi,
} from '@/lib/campus/perfil-acciones';
import { getPerfilColega } from '@/lib/campus/ateneo-social-acciones';

export function MiPerfilCliente({ data }: { data: PerfilData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);

  // Modo edición (Fase 2): cada sección se bloquea/desbloquea; el botón "Editar
  // perfil" abre ambas y se desactiva mientras alguna esté abierta.
  const [editSobre, setEditSobre] = useState(false);
  const [editContacto, setEditContacto] = useState(false);
  const editando = editSobre || editContacto;
  const focoPendiente = useRef(false);

  // Vista pública (Fase 3).
  const [perfilPublico, setPerfilPublico] = useState<PerfilColegaData | null>(null);

  const fotoRef = useRef<HTMLInputElement>(null);
  const portadaRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  // Al entrar en edición desde "Editar perfil": scroll + foco al primer campo de
  // contacto una vez el DOM ya lo renderiza como editable.
  useEffect(() => {
    if (editContacto && focoPendiente.current) {
      focoPendiente.current = false;
      const cont = document.getElementById('contacto');
      cont?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      cont?.querySelector('input')?.focus();
    }
  }, [editContacto]);

  const onEditarPerfil = () => {
    focoPendiente.current = true;
    setEditSobre(true);
    setEditContacto(true);
  };

  // ── Navegación / cifras ──
  const onAbrirCifra = (c: Cifra) => router.push(c.href);
  const onEscribirControlEscolar = () => router.push('/consultas?nueva=staff&area=control-escolar');

  // ── Ver como me ven (Fase 3) ──
  const onVerComoMeVen = () => {
    startTransition(async () => {
      const p = await getPerfilColega(data.alumno.id);
      if (p) setPerfilPublico(p);
      else setAviso('No se pudo abrir tu perfil público.');
    });
  };

  // ── Foto / portada (Fase 4) ──
  const subirImagen = async (file: File, tipo: 'avatar' | 'portada') => {
    setAviso(tipo === 'avatar' ? 'Subiendo foto…' : 'Subiendo portada…');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const firma = await firmarSubidaPerfil(ext);
    if (!firma.ok) return setAviso(firma.error);
    const put = await fetch(firma.urlSubida, {
      method: 'PUT',
      headers: { 'content-type': file.type || 'application/octet-stream' },
      body: file,
    }).catch(() => null);
    if (!put || !put.ok) return setAviso('No se pudo subir la imagen. Inténtalo de nuevo.');
    const r = tipo === 'avatar' ? await guardarAvatar(firma.ref) : await guardarPortada(firma.ref);
    if (!r.ok) return setAviso(r.error);
    setAviso(tipo === 'avatar' ? 'Foto actualizada' : 'Portada actualizada');
    router.refresh();
  };
  const onCambiarFoto = () => fotoRef.current?.click();
  const onCambiarPortada = () => portadaRef.current?.click();
  const onArchivo = (tipo: 'avatar' | 'portada') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void subirImagen(f, tipo);
    e.target.value = '';
  };

  // ── Guardado (Fase 2) ──
  const onGuardarSobreMi = (texto: string, intereses: string[]) => {
    startTransition(async () => {
      const r = await guardarSobreMi(texto, intereses);
      if (!r.ok) return setAviso(r.error);
      setEditSobre(false);
      setAviso('Guardado');
    });
  };
  const onGuardarContacto = (c: Contacto) => {
    startTransition(async () => {
      const r = await guardarContacto(c);
      if (!r.ok) return setAviso(r.error);
      setEditContacto(false);
      setAviso(r.verificacionCorreo ? 'Te enviamos un enlace para verificar el nuevo correo.' : 'Guardado');
    });
  };

  const contextoPublico = [data.contacto.especialidad, data.cora.programa, data.cora.grupo]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-10 pt-6 sm:px-6 lg:px-8">
      <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={onArchivo('avatar')} aria-hidden />
      <input ref={portadaRef} type="file" accept="image/*" className="hidden" onChange={onArchivo('portada')} aria-hidden />

      <PortadaPerfil
        alumno={data.alumno}
        cora={data.cora}
        cifras={data.cifras}
        especialidad={data.contacto.especialidad}
        editando={editando}
        onEditar={onEditarPerfil}
        onVerComoMeVen={onVerComoMeVen}
        onCambiarFoto={onCambiarFoto}
        onCambiarPortada={onCambiarPortada}
        onAbrirCifra={onAbrirCifra}
      />

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <SobreMi
            texto={data.sobreMi}
            intereses={data.intereses}
            editando={editSobre}
            onEditar={() => setEditSobre(true)}
            onGuardar={onGuardarSobreMi}
            onCancelar={() => setEditSobre(false)}
          />
          <div id="contacto">
            <ContactoForm
              contacto={data.contacto}
              editando={editContacto}
              onEditar={() => setEditContacto(true)}
              onGuardar={onGuardarContacto}
              onCancelar={() => setEditContacto(false)}
            />
          </div>
          <DatosAcademicos cora={data.cora} onEscribirControlEscolar={onEscribirControlEscolar} />
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <DominioResumen dominio={data.dominio} onVerDetalle={() => router.push('/dominio')} />
          <Insignias
            insignias={data.insignias}
            total={data.totalInsignias}
            onVerTodas={() => router.push('/certificados')}
          />
          <Certificados
            certificados={data.certificados}
            onVerTodos={() => router.push('/certificados')}
            onAbrir={(id) => router.push(`/certificados/${id}`)}
          />
        </aside>
      </div>

      {/* Ver como me ven — reutiliza el modal del Ateneo en modo propio (Fase 3) */}
      {perfilPublico && (
        <PerfilColega
          perfil={perfilPublico.perfil}
          casos={perfilPublico.casos.map((c) => ({
            id: c.id,
            titulo: c.titulo,
            meta: `${c.organo} · ${c.dominio}`,
            validado: c.validado,
          }))}
          onCerrar={() => setPerfilPublico(null)}
          onConectar={() => {}}
          onMensaje={() => {}}
          onAbrirCaso={() => router.push('/bitacora')}
          esPropio
          contexto={contextoPublico}
          sobreMi={data.sobreMi}
          insignias={data.insignias.map((b) => ({ id: b.id, nombre: b.nombre, obtenida: b.obtenida }))}
        />
      )}

      {/* Confirmación discreta */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all motion-reduce:transition-none ${
          aviso ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        {aviso && (
          <span className="inline-flex h-10 items-center gap-2 rounded-full bg-sidebar px-4 text-[13px] font-semibold text-sidebar-foreground shadow-[0_8px_24px_rgba(17,24,39,0.2)]">
            <Check aria-hidden className="h-4 w-4 text-primary" strokeWidth={2.4} />
            {aviso}
          </span>
        )}
      </div>
    </div>
  );
}
