"use client";

/**
 * Campus · MI PERFIL — quién es y cómo va.
 * Ficha con portada, no formulario. Vive dentro del shell del campus.
 *
 * Layout: contenedor 1240 · portada a todo el ancho · debajo rejilla
 * [ columna principal flexible | rail 340px ].
 *   Principal: Sobre mí · Datos de contacto (editable) · Datos académicos (CORA, solo lectura)
 *   Rail:      Mi dominio · Insignias · Certificados
 *
 * Stubs: onEditar · onVerComoMeVen · onCambiarFoto · onAbrirCifra · onGuardarSobreMi ·
 *        onGuardarContacto · onEscribirControlEscolar · onVerDominio · onVerInsignias ·
 *        onVerCertificados · onAbrirCertificado
 */

import { useRouter } from "next/navigation";
import type { Cifra, Contacto, PerfilData } from "../cuenta/_components/tipos";
import { PERFIL_MOCK } from "../cuenta/_components/tipos";
import {
  Certificados,
  ContactoForm,
  DatosAcademicos,
  DominioResumen,
  Insignias,
  PortadaPerfil,
  SobreMi,
} from "../cuenta/_components/PerfilBloques";

export default function MiPerfil({ data = PERFIL_MOCK }: { data?: PerfilData }) {
  const router = useRouter();

  /* ── Stubs: cablear a la API ── */
  const onEditar = () => document.getElementById("contacto")?.querySelector("input")?.focus();
  const onVerComoMeVen = () => router.push(`/ateneo/perfil/${data.alumno.id}?vista=publica`);
  const onCambiarFoto = () => {};
  const onAbrirCifra = (c: Cifra) => router.push(c.href);
  const onGuardarSobreMi = (_texto: string, _intereses: string[]) => {};
  const onGuardarContacto = (_c: Contacto) => {};
  const onEscribirControlEscolar = () => router.push("/consultas?nueva=staff&area=control-escolar");
  /* ─────────────────────────── */

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-10 pt-6 sm:px-6 lg:px-8">
      <PortadaPerfil
        alumno={data.alumno}
        cora={data.cora}
        cifras={data.cifras}
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
          <DominioResumen dominio={data.dominio} onVerDetalle={() => router.push("/dominio")} />
          <Insignias insignias={data.insignias} total={data.totalInsignias} onVerTodas={() => router.push("/dominio#insignias")} />
          <Certificados
            certificados={data.certificados}
            onVerTodos={() => router.push("/certificados")}
            onAbrir={(id) => router.push(`/certificados/${id}`)}
          />
        </aside>
      </div>
    </div>
  );
}
