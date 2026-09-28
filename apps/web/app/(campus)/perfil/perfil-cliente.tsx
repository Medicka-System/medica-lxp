'use client';

/**
 * Campus · MI PERFIL — quién es y cómo va (§3 de la spec). Ficha con portada.
 * Vive dentro del shell del campus. Cablea los bloques a las server actions
 * (guardarSobreMi / guardarContacto) y a la navegación; onCambiarFoto queda como
 * stub documentado (subida a storage con firma pública · Sprint 11).
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
import { guardarContacto, guardarSobreMi } from '@/lib/campus/perfil-acciones';

export function MiPerfilCliente({ data }: { data: PerfilData }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  // ── Navegación / cifras ──
  const onEditar = () => document.getElementById('contacto')?.querySelector('input')?.focus();
  const onVerComoMeVen = () => router.push(`/ateneo?vista=publica&perfil=${data.alumno.id}`);
  const onAbrirCifra = (c: Cifra) => router.push(c.href);
  const onEscribirControlEscolar = () => router.push('/consultas?nueva=staff&area=control-escolar');

  // ── STUB: subir foto (storage con firma pública, patrón split localhost:9000 ·
  //    Sprint 11). Abre el selector para sentirse funcional; la subida real
  //    (firmar PUT → subir → actualizar avatar_url) se cablea con el media service. ──
  const onCambiarFoto = () => fileRef.current?.click();
  const onArchivoElegido = () => {
    setAviso('La foto de perfil se conectará al servicio de media (pendiente).');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Guardado ──
  const onGuardarSobreMi = (texto: string, intereses: string[]) => {
    startTransition(async () => {
      const r = await guardarSobreMi(texto, intereses);
      setAviso(r.ok ? 'Guardado' : r.error);
    });
  };
  const onGuardarContacto = (c: Contacto) => {
    startTransition(async () => {
      const r = await guardarContacto(c);
      if (!r.ok) setAviso(r.error);
      else setAviso(r.verificacionCorreo ? 'Te enviamos un enlace para verificar el nuevo correo.' : 'Guardado');
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-10 pt-6 sm:px-6 lg:px-8">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onArchivoElegido}
        aria-hidden
      />

      <PortadaPerfil
        alumno={data.alumno}
        cora={data.cora}
        cifras={data.cifras}
        especialidad={data.contacto.especialidad}
        onEditar={onEditar}
        onVerComoMeVen={onVerComoMeVen}
        onCambiarFoto={onCambiarFoto}
        onAbrirCifra={onAbrirCifra}
      />

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <SobreMi texto={data.sobreMi} intereses={data.intereses} onGuardar={onGuardarSobreMi} />
          <div id="contacto">
            <ContactoForm contacto={data.contacto} onGuardar={onGuardarContacto} />
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
