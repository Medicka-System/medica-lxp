'use client';

/**
 * Campus · AJUSTES — cómo quiere que funcione el campus (§4 de la spec). Columna
 * de secciones con toggles. Guardado OPTIMISTA por interruptor (persiste a
 * lxp.perfiles.preferencias vía server action) + toast "Guardado". Sin botón
 * global. La nav hace scroll (IntersectionObserver marca la visible). El tema de
 * lectura se escribe a localStorage (mismas claves que lee la lección) + el flag
 * data-reducir-animaciones en <html>. Los flujos de auth (conectar/contraseña/
 * cerrar sesión) quedan como stubs documentados (Supabase · Sprint 11).
 */

import { useEffect, useRef, useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import type { AjustesData, Canal, SeccionAjustes } from '../cuenta/_components/tipos';
import {
  CuentaAcceso,
  IdiomaRegion,
  Lectura,
  NavAjustes,
  Notificaciones,
  Privacidad,
} from '../cuenta/_components/AjustesSecciones';
import { guardarPreferencias } from '@/lib/campus/perfil-acciones';

const OFFSET = 84; // header fijo (68) + aire

export function AjustesCliente({ data }: { data: AjustesData }) {
  const [a, setA] = useState<AjustesData>(data);
  const [activa, setActiva] = useState<SeccionAjustes>('notificaciones');
  const [toast, setToast] = useState(false);
  const [, startTransition] = useTransition();
  const refs = useRef<Record<SeccionAjustes, HTMLElement | null>>({
    notificaciones: null,
    privacidad: null,
    lectura: null,
    cuenta: null,
    idioma: null,
  });

  /** Persiste solo lo guardable (sin `cuenta`, que es de auth · Sprint 11). */
  const persistir = (next: AjustesData) => {
    const { cuenta: _cuenta, ...prefs } = next;
    void _cuenta;
    startTransition(async () => {
      await guardarPreferencias(prefs);
    });
  };

  /** Guardado optimista + toast 1.6 s. */
  const cambiar = (parche: Partial<AjustesData>) => {
    const next = { ...a, ...parche };
    setA(next);
    persistir(next);
    setToast(true);
  };

  /** Cambio local que NO persiste en preferencias (cuenta = auth · Sprint 11). */
  const cambiarLocal = (parche: Partial<AjustesData>) => setA((x) => ({ ...x, ...parche }));

  // ── STUBS de auth (Supabase · Sprint 11) ──
  const onConectar = (_p: 'google' | 'microsoft') => {
    // supabase.auth.linkIdentity({ provider })
  };
  const onDesconectar = (_p: 'google' | 'microsoft') => {
    // supabase.auth.unlinkIdentity(identity)
  };
  const onCambiarContrasena = () => {
    // supabase.auth.resetPasswordForEmail(correo)
  };
  const onCerrarSesion = () => {
    // supabase.auth.signOut()
  };
  const onCerrarSesionRemota = (id: string) =>
    // Sprint 11: revocar la sesión en el servidor; por ahora se quita de la lista.
    cambiarLocal({ cuenta: { ...a.cuenta, sesiones: a.cuenta.sesiones.filter((s) => s.id !== id) } });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  // El tema de lectura se aplica también fuera (lo lee la pantalla de lección).
  useEffect(() => {
    localStorage.setItem('lectura-tema', a.lectura.tema);
    localStorage.setItem('lectura-tamano', String(a.lectura.tamano));
    document.documentElement.toggleAttribute('data-reducir-animaciones', a.lectura.reducirAnimaciones);
  }, [a.lectura]);

  // Sección visible → nav activa.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entradas) => {
        const v = entradas
          .filter((e) => e.isIntersecting)
          .sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
        if (v) setActiva(v.target.id as SeccionAjustes);
      },
      { rootMargin: '-20% 0px -60% 0px' },
    );
    Object.values(refs.current).forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const ir = (s: SeccionAjustes) => {
    const el = refs.current[s];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - OFFSET;
    window.scrollTo({ top, behavior: a.lectura.reducirAnimaciones ? 'auto' : 'smooth' });
    setActiva(s);
  };

  const anclar = (id: SeccionAjustes) => (el: HTMLElement | null) => {
    refs.current[id] = el;
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 pb-16 pt-6 sm:px-6 lg:px-8">
      <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em]">Ajustes</h1>
      <p className="mt-1.5 text-[13.5px] text-foreground-soft">
        Cómo le llegan los avisos, quién ve su actividad y cómo prefiere leer.
      </p>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[232px_minmax(0,760px)]">
        <NavAjustes activa={activa} onIr={ir} onCerrarSesion={onCerrarSesion} />

        <div className="flex min-w-0 flex-col gap-5">
          <section id="notificaciones" ref={anclar('notificaciones')}>
            <Notificaciones
              data={a}
              onCanal={(avisoId: string, canal: Canal, v: boolean) =>
                cambiar({
                  avisos: a.avisos.map((x) =>
                    x.id === avisoId ? { ...x, canales: { ...x.canales, [canal]: v } } : x,
                  ),
                })
              }
              onResumen={(v) => cambiar({ resumenSemanal: v })}
              onNoMolestar={(p) => cambiar({ noMolestar: { ...a.noMolestar, ...p } })}
            />
          </section>
          <section id="privacidad" ref={anclar('privacidad')}>
            <Privacidad data={a.privacidad} onCambio={(p) => cambiar({ privacidad: { ...a.privacidad, ...p } })} />
          </section>
          <section id="lectura" ref={anclar('lectura')}>
            <Lectura data={a.lectura} onCambio={(p) => cambiar({ lectura: { ...a.lectura, ...p } })} />
          </section>
          <section id="cuenta" ref={anclar('cuenta')}>
            <CuentaAcceso
              data={a.cuenta}
              onConectar={onConectar}
              onDesconectar={onDesconectar}
              onCambiarContrasena={onCambiarContrasena}
              onCerrarSesion={onCerrarSesionRemota}
            />
          </section>
          <section id="idioma" ref={anclar('idioma')}>
            <IdiomaRegion data={a.idioma} onCambio={(p) => cambiar({ idioma: { ...a.idioma, ...p } })} />
          </section>
        </div>
      </div>

      {/* Confirmación discreta de guardado */}
      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transition-all motion-reduce:transition-none ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
      >
        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-sidebar px-4 text-[13px] font-semibold text-sidebar-foreground shadow-[0_8px_24px_rgba(17,24,39,0.2)]">
          <Check aria-hidden className="h-4 w-4 text-primary" strokeWidth={2.4} />
          Guardado
        </span>
      </div>
    </div>
  );
}
