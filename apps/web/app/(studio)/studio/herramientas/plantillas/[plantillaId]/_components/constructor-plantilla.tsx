'use client';

/**
 * Constructor de PLANTILLA DE REPORTE (§5B/§5C/§6.5) — reskin fase 1b-1, fiel al mock del
 * diseñador (Paleta 252 · Lienzo · Propiedades 328), sobre el REGISTRO DE UI escalable
 * (`registro-ui-campos.tsx`: preview + editor por tipo) y el contrato EXISTENTE.
 *
 * Drag-and-drop nativo HTML5 — el PAYLOAD vive en un REF de React (no en el dataTransfer, que es
 * frágil con MIME custom), 3 cargas:
 *   { k:'nuevo', tipo, preset? }  desde la paleta · { k:'campo', id }  mover campo · { k:'seccion', id }  reordenar.
 * Soltar sobre un campo inserta ANTES; en el cuerpo de la sección, al final; en "Agregar sección", nueva;
 * en un hueco del lienzo, a la última sección.
 *
 * Wiring al contrato (shape SIN cambios): etiqueta↔`nombre`, ancho↔`span`, config↔llaves
 * existentes (unidad/opciones/origen/refUrl/columnas/filas/valorDefecto). Flags nuevos OPCIONALES
 * (passthrough 1a): `obligatorio`/`enInforme` (campo), `colapsada`/`enInforme` (sección). Guarda con
 * `guardarEstructuraPlantilla` (sql.json). Autoguardado a los 2 s.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import {
  AlignLeft,
  ArrowLeft,
  Calculator,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  FileText,
  GripVertical,
  Hash,
  Heading,
  Image as ImageIcon,
  Images,
  Info,
  LayoutPanelTop,
  ListChecks,
  ListTodo,
  Move3d,
  Plus,
  Ruler,
  Save,
  Search,
  Table2,
  ToggleRight,
  Trash2,
  Type,
} from 'lucide-react';
import { mono, kicker, focusRing } from '@/lib/studio/estilos';
import { REGISTRO_UI, type CampoRef } from '@/components/reportes/registro-ui-campos';
import {
  campoNuevo,
  campoPacienteDesdeCatalogo,
  CAMPOS_PACIENTE_CATALOGO,
  contarCampos,
  ETIQUETA_TIPO,
  esCampoEstatico,
  nuevoId,
  seccionEncabezadoPorDefecto,
  seccionHallazgosNueva,
  TIPOS_CAMPO,
  type CampoPlantilla,
  type EstructuraPlantilla,
  type SeccionPlantilla,
  type TipoCampo,
} from '@/lib/reportes/estructura';
import { guardarEstructuraPlantilla } from '@/lib/studio/acciones';
import type { PlantillaConstructor } from '@/lib/studio/datos';

const TIPOS_ESTUDIO = ['Abdominal', 'Obstétrico', 'Mama', 'Doppler', 'MSK', 'Tiroideo', 'Renal', 'Pélvico'];

type Seleccion =
  | { k: 'campo'; seccionId: string; campoId: string }
  | { k: 'seccion'; seccionId: string }
  | null;
type CargaDrag =
  | { k: 'nuevo'; tipo: TipoCampo | 'seccion'; preset?: Partial<CampoPlantilla> }
  | { k: 'campo'; id: string }
  | { k: 'seccion'; id: string };

const ICONO_TIPO: Record<TipoCampo, typeof Type> = {
  titulo: Heading,
  guia: Info,
  texto: Type,
  multitexto: AlignLeft,
  numero: Hash,
  medida: Ruler,
  dimensiones: Move3d,
  fecha: Calendar,
  tabla: Table2,
  sino: ToggleRight,
  opcion: ListChecks,
  multiseleccion: ListTodo,
  imagen: ImageIcon,
  galeria: Images,
  calculado: Calculator,
};

type ItemPaleta = { tipo: TipoCampo | 'seccion'; nombre: string; icono: typeof Type };
const GRUPOS: { titulo: string; items: ItemPaleta[] }[] = [
  {
    titulo: 'Estructura',
    items: [
      { tipo: 'seccion', nombre: 'Sección', icono: LayoutPanelTop },
      { tipo: 'titulo', nombre: 'Título', icono: Heading },
      { tipo: 'guia', nombre: 'Guía', icono: Info },
    ],
  },
  { titulo: 'Texto', items: [{ tipo: 'texto', nombre: 'Texto', icono: Type }, { tipo: 'multitexto', nombre: 'Multitexto', icono: AlignLeft }] },
  {
    titulo: 'Valores clínicos',
    items: [
      { tipo: 'numero', nombre: 'Número', icono: Hash },
      { tipo: 'medida', nombre: 'Medida', icono: Ruler },
      { tipo: 'dimensiones', nombre: 'Dimensiones', icono: Move3d },
      { tipo: 'calculado', nombre: 'Calculado', icono: Calculator },
      { tipo: 'fecha', nombre: 'Fecha', icono: Calendar },
      { tipo: 'tabla', nombre: 'Tabla', icono: Table2 },
    ],
  },
  {
    titulo: 'Selección',
    items: [
      { tipo: 'sino', nombre: 'Sí / No', icono: ToggleRight },
      { tipo: 'opcion', nombre: 'Opción', icono: ListChecks },
      { tipo: 'multiseleccion', nombre: 'Casillas', icono: ListTodo },
    ],
  },
  { titulo: 'Imágenes', items: [{ tipo: 'imagen', nombre: 'Imagen', icono: ImageIcon }, { tipo: 'galeria', nombre: 'Galería', icono: Images }] },
];
const ATAJOS: TipoCampo[] = ['texto', 'medida', 'fecha', 'tabla', 'sino', 'guia'];

const cfgInput =
  'h-10 w-full rounded-[10px] border border-border bg-card px-3 text-[12.5px] text-foreground outline-none transition-colors focus:border-secondary placeholder:text-muted-foreground';

/* ═══════════════════════════ raíz ═══════════════════════════ */
export function ConstructorPlantilla({ plantilla }: { plantilla: PlantillaConstructor }) {
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [tipoEstudio, setTipoEstudio] = useState(plantilla.tipoEstudio);
  const [impresionDefecto, setImpresionDefecto] = useState(plantilla.estructura.impresionDefecto ?? '');
  // ¿Se incluye la sección de impresión? Ausente/true = sí (retrocompat). El diseñador la quita
  // (botón borrar) y la vuelve a agregar desde la paleta.
  const [incluyeImpresion, setIncluyeImpresion] = useState(plantilla.estructura.incluyeImpresion !== false);
  const [secciones, setSecciones] = useState<SeccionPlantilla[]>(() => {
    const base = plantilla.estructura.secciones;
    return base.some((s) => s.tipo === 'encabezado') ? base : [seccionEncabezadoPorDefecto(), ...base];
  });
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [busca, setBusca] = useState('');
  const [dropSobre, setDropSobre] = useState<string | null>(null);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoHace, setGuardadoHace] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const totalCampos = useMemo(() => contarCampos({ secciones }), [secciones]);

  /* ── guardado (autosave 2 s + botón) ── */
  const guardar = useCallback(
    (secs: SeccionPlantilla[], nom: string, tipo: string, impr: string, incluye: boolean) => {
      setGuardando(true);
      setError(null);
      const estructura: EstructuraPlantilla = {
        secciones: secs,
        ...(impr.trim() ? { impresionDefecto: impr } : {}),
        ...(incluye ? {} : { incluyeImpresion: false }),
      };
      void guardarEstructuraPlantilla(plantilla.id, { nombre: nom, tipoEstudio: tipo, estructura }).then((res) => {
        setGuardando(false);
        if (res.ok) {
          setSucio(false);
          setGuardadoHace(0);
        } else {
          setError(res.error);
        }
      });
    },
    [plantilla.id],
  );

  useEffect(() => {
    if (!sucio) return;
    const t = setTimeout(() => guardar(secciones, nombre, tipoEstudio, impresionDefecto, incluyeImpresion), 2000);
    return () => clearTimeout(t);
  }, [sucio, secciones, nombre, tipoEstudio, impresionDefecto, incluyeImpresion, guardar]);
  useEffect(() => {
    const t = setInterval(() => setGuardadoHace((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── mutaciones ── */
  const mutar = useCallback((fn: (secs: SeccionPlantilla[]) => SeccionPlantilla[]) => {
    setSecciones((prev) => fn(structuredClone(prev)));
    setSucio(true);
  }, []);
  const marcarSucio = () => setSucio(true);

  const seccionSel = useMemo(
    () => (seleccion ? secciones.find((s) => s.id === seleccion.seccionId) ?? null : null),
    [secciones, seleccion],
  );
  const campoSel = useMemo(
    () => (seleccion?.k === 'campo' && seccionSel ? seccionSel.campos.find((c) => c.id === seleccion.campoId) ?? null : null),
    [seccionSel, seleccion],
  );
  // Campos a los que un campo `calculado` puede conectar sus entradas: cualquier número/medida/fecha
  // de CUALQUIER sección (encabezado incluido → fecha del estudio), menos el propio campo.
  const camposParaFormula = useMemo<CampoRef[]>(
    () =>
      secciones
        .flatMap((s) => s.campos)
        .filter((c) => c.id !== campoSel?.id && (c.tipo === 'numero' || c.tipo === 'medida' || c.tipo === 'fecha'))
        .map((c) => ({ id: c.id, nombre: c.nombre || c.id, tipo: c.tipo })),
    [secciones, campoSel],
  );

  const actualizarCampo = (campoId: string, patch: Partial<CampoPlantilla>) =>
    mutar((secs) => {
      for (const s of secs) {
        const i = s.campos.findIndex((c) => c.id === campoId);
        if (i >= 0) s.campos[i] = { ...s.campos[i]!, ...patch };
      }
      return secs;
    });
  const reemplazarCampo = (campoId: string, nuevo: CampoPlantilla) =>
    mutar((secs) => {
      for (const s of secs) {
        const i = s.campos.findIndex((c) => c.id === campoId);
        if (i >= 0) s.campos[i] = nuevo;
      }
      return secs;
    });
  const actualizarSeccion = (seccionId: string, patch: Partial<SeccionPlantilla>) =>
    mutar((secs) => {
      const s = secs.find((x) => x.id === seccionId);
      if (s) Object.assign(s, patch);
      return secs;
    });

  const insertarCampo = (seccionId: string, campo: CampoPlantilla, antesDe?: string) => {
    mutar((secs) => {
      const s = secs.find((x) => x.id === seccionId);
      if (!s) return secs;
      const i = antesDe ? s.campos.findIndex((c) => c.id === antesDe) : -1;
      if (i >= 0) s.campos.splice(i, 0, campo);
      else s.campos.push(campo);
      s.colapsada = false;
      return secs;
    });
    setSeleccion({ k: 'campo', seccionId, campoId: campo.id });
  };
  const moverCampo = (campoId: string, destino: string, antesDe?: string) => {
    if (campoId === antesDe) return;
    mutar((secs) => {
      let campo: CampoPlantilla | undefined;
      for (const s of secs) {
        const i = s.campos.findIndex((c) => c.id === campoId);
        if (i >= 0) [campo] = s.campos.splice(i, 1);
      }
      const d = secs.find((x) => x.id === destino);
      if (!campo || !d) return secs;
      const i = antesDe ? d.campos.findIndex((c) => c.id === antesDe) : -1;
      if (i >= 0) d.campos.splice(i, 0, campo);
      else d.campos.push(campo);
      return secs;
    });
    setSeleccion({ k: 'campo', seccionId: destino, campoId });
  };
  const duplicarCampo = (seccionId: string, campoId: string) => {
    const s = secciones.find((x) => x.id === seccionId);
    const c = s?.campos.find((x) => x.id === campoId);
    if (!c) return;
    const copia: CampoPlantilla = { ...structuredClone(c), id: nuevoId('c'), nombre: `${c.nombre} (copia)` };
    insertarCampo(seccionId, copia, s!.campos[s!.campos.findIndex((x) => x.id === campoId) + 1]?.id);
  };
  const eliminarCampo = (seccionId: string, campoId: string) => {
    mutar((secs) => {
      const s = secs.find((x) => x.id === seccionId);
      if (s) s.campos = s.campos.filter((c) => c.id !== campoId);
      return secs;
    });
    setSeleccion({ k: 'seccion', seccionId });
  };

  const agregarSeccion = (antesDe?: string) => {
    const nueva = seccionHallazgosNueva(`Sección ${secciones.filter((s) => s.tipo === 'hallazgos').length + 1}`);
    mutar((secs) => {
      const i = antesDe ? secs.findIndex((s) => s.id === antesDe) : -1;
      if (i >= 0) secs.splice(i, 0, nueva);
      else secs.push(nueva);
      return secs;
    });
    setSeleccion({ k: 'seccion', seccionId: nueva.id });
    return nueva;
  };
  const duplicarSeccion = (seccionId: string) =>
    mutar((secs) => {
      const i = secs.findIndex((s) => s.id === seccionId);
      if (i < 0) return secs;
      const copia = structuredClone(secs[i]!);
      copia.id = nuevoId('s');
      copia.tipo = 'hallazgos'; // una copia nunca es el encabezado
      copia.titulo = `${copia.titulo} (copia)`;
      copia.campos = copia.campos.map((c) => ({ ...c, id: nuevoId('c') }));
      secs.splice(i + 1, 0, copia);
      return secs;
    });
  const eliminarSeccion = (seccionId: string) => {
    mutar((secs) => secs.filter((s) => s.id !== seccionId));
    setSeleccion(null);
  };
  const subirBajarSeccion = (id: string, dir: -1 | 1) =>
    mutar((secs) => {
      const i = secs.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= secs.length) return secs;
      [secs[i], secs[j]] = [secs[j]!, secs[i]!];
      return secs;
    });
  const moverSeccion = (id: string, antesDe: string) => {
    if (id === antesDe) return;
    mutar((secs) => {
      const i = secs.findIndex((s) => s.id === id);
      const [s] = secs.splice(i, 1);
      const j = secs.findIndex((x) => x.id === antesDe);
      secs.splice(j < 0 ? secs.length : j, 0, s!);
      return secs;
    });
  };

  const agregarDesdePaleta = (tipo: TipoCampo | 'seccion', preset?: Partial<CampoPlantilla>) => {
    if (tipo === 'seccion') return void agregarSeccion();
    const destino = seleccion?.seccionId ?? secciones.at(-1)?.id;
    if (!destino) {
      const s = seccionHallazgosNueva('Sección 1');
      const c = crearCampoPreset(tipo, preset);
      s.campos.push(c);
      mutar((secs) => [...secs, s]);
      setSeleccion({ k: 'campo', seccionId: s.id, campoId: c.id });
      return;
    }
    insertarCampo(destino, crearCampoPreset(tipo, preset));
  };

  /* ── drag & drop ── */
  // El PAYLOAD del arrastre vive en un REF de React, NO en el `dataTransfer` del navegador. Detectar un
  // MIME CUSTOM en `dataTransfer.types` (dragover) o leerlo con `getData` (drop) es INTRÍNSECAMENTE
  // FRÁGIL en HTML5 nativo — fallaba de forma intermitente (types daba false → ⊘; getData daba "" →
  // el drop no movía nada). El ref sobrevive de dragstart a drop con certeza; el dataTransfer solo se
  // usa para que Firefox inicie el drag (requiere algún setData) y para el efecto del cursor.
  const cargaRef = useRef<CargaDrag | null>(null);
  const iniciarDrag = (e: DragEvent, carga: CargaDrag) => {
    cargaRef.current = carga;
    e.dataTransfer.setData('text/plain', carga.k);
    e.dataTransfer.effectAllowed = carga.k === 'nuevo' ? 'copy' : 'move';
  };
  const permitirDrop = (e: DragEvent, id: string) => {
    // `preventDefault()` en `onDragOver` es OBLIGATORIO o el navegador rechaza el drop (cursor ⊘). Se
    // gatea en el REF (hay un arrastre INTERNO en curso), no en el MIME del dataTransfer: así TODAS las
    // zonas aceptan el drop interno de forma fiable; un drag de archivos externos (sin ref) no se acapara.
    if (!cargaRef.current) return;
    e.preventDefault();
    if (dropSobre !== id) setDropSobre(id);
  };
  /** Aplica la carga arrastrada a una sección (reordenar/mover/insertar/agregar). */
  const aplicarCarga = (c: CargaDrag, seccionId: string, antesDe?: string) => {
    if (c.k === 'nuevo') {
      if (c.tipo === 'seccion') return void agregarSeccion(seccionId);
      insertarCampo(seccionId, crearCampoPreset(c.tipo, c.preset), antesDe);
    } else if (c.k === 'campo') moverCampo(c.id, seccionId, antesDe);
    else if (c.k === 'seccion') moverSeccion(c.id, seccionId);
  };
  const soltarEnSeccion = (e: DragEvent, seccionId: string, antesDe?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDropSobre(null);
    const c = cargaRef.current;
    cargaRef.current = null;
    if (c) aplicarCarga(c, seccionId, antesDe);
  };

  /* ── teclado: Esc deselecciona · Supr elimina campo ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'Escape') setSeleccion(null);
      if ((e.key === 'Delete' || e.key === 'Backspace') && seleccion?.k === 'campo')
        eliminarCampo(seleccion.seccionId, seleccion.campoId);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Al TERMINAR o CANCELAR cualquier arrastre, limpia el payload y el resaltado (evita ref colgado).
  useEffect(() => {
    const limpiar = () => {
      cargaRef.current = null;
      setDropSobre(null);
    };
    window.addEventListener('dragend', limpiar);
    return () => window.removeEventListener('dragend', limpiar);
  }, []);

  return (
    <div className="flex h-[calc(100vh-60px)] flex-col bg-background">
      <BarraContexto
        nombre={nombre}
        tipoEstudio={tipoEstudio}
        publicado={plantilla.publicado}
        guardando={guardando}
        guardadoHace={guardadoHace}
        onNombre={(v) => {
          setNombre(v);
          marcarSucio();
        }}
        onEstudio={(v) => {
          setTipoEstudio(v);
          marcarSucio();
        }}
        onGuardar={() => guardar(secciones, nombre, tipoEstudio, impresionDefecto, incluyeImpresion)}
        onVistaPrevia={() => {
          // Empuja el guardado (best-effort) y abre la vista previa en pestaña nueva; lee la
          // estructura ya guardada (el autoguardado de 2 s también la mantiene fresca).
          guardar(secciones, nombre, tipoEstudio, impresionDefecto, incluyeImpresion);
          window.open(`/studio/herramientas/plantillas/${plantilla.id}/vista-previa`, '_blank', 'noopener');
        }}
      />

      {error && (
        <p className="border-b border-[color:var(--warning-border)] bg-[color:var(--warning-surface)] px-5 py-2 text-[12.5px] font-medium text-[color:var(--warning-foreground)]">
          {error}
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        {/* 1 · Paleta */}
        <Paleta
          busca={busca}
          setBusca={setBusca}
          onAgregar={agregarDesdePaleta}
          onDrag={iniciarDrag}
          impresionIncluida={incluyeImpresion}
          onAgregarImpresion={() => {
            setIncluyeImpresion(true);
            setSucio(true);
          }}
        />

        {/* 2 · Lienzo — catch-all de drop: los huecos entre/alrededor de las tarjetas también aceptan el
            arrastre (sin ⊘) y lo enrutan a la última sección. Las zonas internas (sección/campo/agregar)
            consumen `cargaRef` primero, así que este handler no duplica el movimiento. */}
        <div
          className="min-w-0 flex-1 overflow-y-auto bg-[color:var(--canvas)] px-7 pb-10 pt-[22px]"
          onClick={(e) => e.target === e.currentTarget && setSeleccion(null)}
          onDragOver={(e) => permitirDrop(e, 'lienzo')}
          onDragLeave={() => setDropSobre(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDropSobre(null);
            const c = cargaRef.current;
            cargaRef.current = null;
            if (!c) return;
            const ultima = [...secciones].reverse().find((s) => s.tipo === 'hallazgos') ?? secciones.at(-1);
            if (ultima) aplicarCarga(c, ultima.id);
            else if (c.k !== 'seccion') {
              const s = agregarSeccion();
              aplicarCarga(c, s.id);
            }
          }}
        >
          <div className="mx-auto flex max-w-[880px] flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <p className={kicker}>Vista de construcción · así se verá en “Mis reportes”</p>
              <span className={`${mono} ml-auto text-[11px] text-muted-foreground`}>
                {secciones.length} secciones · {totalCampos} campos
              </span>
            </div>

            {secciones.map((s, i) => (
              <SeccionCard
                key={s.id}
                seccion={s}
                primera={i === 0}
                ultima={i === secciones.length - 1}
                seleccion={seleccion}
                dropSobre={dropSobre}
                onSeleccionar={setSeleccion}
                onTitulo={(titulo) => actualizarSeccion(s.id, { titulo })}
                onColumnas={(columnas) => actualizarSeccion(s.id, { columnas })}
                onColapsar={() => actualizarSeccion(s.id, { colapsada: !s.colapsada })}
                onDuplicar={() => duplicarSeccion(s.id)}
                onEliminar={() => eliminarSeccion(s.id)}
                onSubirBajar={(d) => subirBajarSeccion(s.id, d)}
                onAtajo={(tipo) => insertarCampo(s.id, campoNuevo(tipo))}
                onDuplicarCampo={(cid) => duplicarCampo(s.id, cid)}
                onEliminarCampo={(cid) => eliminarCampo(s.id, cid)}
                onDragCampo={(e, cid) => iniciarDrag(e, { k: 'campo', id: cid })}
                onDragSeccion={(e) => iniciarDrag(e, { k: 'seccion', id: s.id })}
                onDragOver={permitirDrop}
                onDragLeave={() => setDropSobre(null)}
                onDrop={soltarEnSeccion}
              />
            ))}

            {secciones.length === 0 && (
              <div className="rounded-xl border-[1.5px] border-dashed border-[color:var(--track)] bg-card px-8 py-12 text-center">
                <p className="text-[15px] font-bold">La plantilla está vacía</p>
                <p className="mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed text-[color:var(--foreground-soft)]">
                  Empiece por una sección y arrastre los campos que el médico va a llenar.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => agregarSeccion()}
              onDragOver={(e) => permitirDrop(e, 'nueva-seccion')}
              onDragLeave={() => setDropSobre(null)}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDropSobre(null);
                const c = cargaRef.current;
                cargaRef.current = null;
                if (!c) return;
                const s = agregarSeccion();
                if (c.k === 'nuevo' && c.tipo !== 'seccion') insertarCampo(s.id, crearCampoPreset(c.tipo, c.preset));
                else if (c.k === 'campo') moverCampo(c.id, s.id);
              }}
              className={`inline-flex h-14 items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-primary text-[13.5px] font-bold text-secondary transition-colors hover:bg-accent ${focusRing} ${
                dropSobre === 'nueva-seccion' ? 'bg-accent' : 'bg-primary/[0.06]'
              }`}
            >
              <Plus aria-hidden className="h-[17px] w-[17px]" strokeWidth={2.2} />
              Agregar sección
            </button>

            {/* Impresión diagnóstica: sección de cierre del reporte. El diseñador edita su texto
                predeterminado (boilerplate) o la QUITA (botón); si la quitó, la vuelve a agregar desde
                la paleta. Retrocompat: ausente = incluida (comportamiento histórico). */}
            {incluyeImpresion && (
              <section className="rounded-[12px] border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`${kicker} text-secondary`}>Impresión diagnóstica</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIncluyeImpresion(false);
                      setSucio(true);
                    }}
                    className={`ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:bg-[color:var(--warning-surface)] hover:text-[color:var(--warning-foreground)] ${focusRing}`}
                  >
                    <Trash2 aria-hidden className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Quitar
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={impresionDefecto}
                  onChange={(e) => {
                    setImpresionDefecto(e.target.value);
                    setSucio(true);
                  }}
                  placeholder="Texto predeterminado de la impresión (el médico lo edita al llenar). Ej.: Conclusión | …"
                  className="mt-3 w-full resize-y rounded-[10px] border border-border bg-muted p-3.5 text-[14px] leading-[1.7] text-foreground outline-none placeholder:text-muted-foreground focus:border-secondary"
                />
              </section>
            )}
          </div>
        </div>

        {/* 3 · Propiedades */}
        <aside aria-label="Propiedades" className="w-[328px] shrink-0 overflow-y-auto border-l border-border bg-card">
          {campoSel && seccionSel ? (
            <PanelCampo
              campo={campoSel}
              seccion={seccionSel}
              camposDisponibles={camposParaFormula}
              onCambio={(patch) => actualizarCampo(campoSel.id, patch)}
              onTipo={(tipo) => reemplazarCampo(campoSel.id, { ...campoNuevo(tipo), id: campoSel.id, nombre: campoSel.nombre, guia: campoSel.guia })}
            />
          ) : seccionSel ? (
            <PanelSeccion seccion={seccionSel} onCambio={(patch) => actualizarSeccion(seccionSel.id, patch)} />
          ) : (
            <PanelPlantilla nombre={nombre} tipoEstudio={tipoEstudio} nSecciones={secciones.length} />
          )}
        </aside>
      </div>
    </div>
  );
}

/**
 * Crea un campo del tipo dado. Con `preset` (catálogo de paciente) conserva su `id` estable
 * (`paciente`/`edad`/…) para que el reporte lo mapee a `datos_paciente`; sin preset usa el id nuevo.
 */
function crearCampoPreset(tipo: TipoCampo, preset?: Partial<CampoPlantilla>): CampoPlantilla {
  const base = campoNuevo(tipo);
  return preset ? { ...base, ...preset, tipo } : base;
}

/* ═══════════════════════════ barra de contexto ═══════════════════════════ */
function BarraContexto({
  nombre,
  tipoEstudio,
  publicado,
  guardando,
  guardadoHace,
  onNombre,
  onEstudio,
  onGuardar,
  onVistaPrevia,
}: {
  nombre: string;
  tipoEstudio: string;
  publicado: boolean;
  guardando: boolean;
  guardadoHace: number;
  onNombre: (v: string) => void;
  onEstudio: (v: string) => void;
  onGuardar: () => void;
  onVistaPrevia: () => void;
}) {
  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-5">
      <a
        href="/studio/herramientas/plantillas"
        aria-label="Volver a Plantillas"
        className={`grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] border border-border text-foreground transition-colors hover:bg-accent ${focusRing}`}
      >
        <ArrowLeft aria-hidden className="h-[17px] w-[17px]" strokeWidth={2} />
      </a>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={kicker}>Plantilla de reporte</span>
        <input
          value={nombre}
          onChange={(e) => onNombre(e.target.value)}
          aria-label="Nombre de la plantilla"
          className="mt-0.5 w-[320px] max-w-full rounded-md bg-transparent p-0 text-[16px] font-extrabold text-foreground outline-none focus:bg-muted"
        />
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2.5">
        <label className="text-[11.5px] font-semibold text-muted-foreground" htmlFor="estudio">
          Estudio
        </label>
        <select
          id="estudio"
          value={tipoEstudio}
          onChange={(e) => onEstudio(e.target.value)}
          className={`h-[38px] rounded-[10px] border border-border bg-card px-3 text-[12.5px] font-semibold ${focusRing}`}
        >
          <option value="">Sin tipo</option>
          {TIPOS_ESTUDIO.map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <span
          className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold ${
            publicado ? 'bg-accent text-accent-foreground' : 'border border-border bg-muted text-muted-foreground'
          }`}
        >
          {publicado ? 'Publicada' : 'Borrador'}
        </span>
        <span className={`${mono} whitespace-nowrap text-[11px] text-muted-foreground`}>
          {guardando ? 'guardando…' : `guardado hace ${guardadoHace} s`}
        </span>
        <button
          type="button"
          onClick={onVistaPrevia}
          className={`inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-3.5 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${focusRing}`}
        >
          <Eye aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
          Vista previa
        </button>
        <button
          type="button"
          onClick={onGuardar}
          className={`inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-[13px] font-bold text-[color:var(--sidebar)] transition-colors hover:bg-secondary hover:text-white ${focusRing}`}
        >
          <Save aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.75} />
          Guardar
        </button>
      </span>
    </div>
  );
}

/* ═══════════════════════════ 1 · paleta ═══════════════════════════ */
function Paleta({
  busca,
  setBusca,
  onAgregar,
  onDrag,
  impresionIncluida,
  onAgregarImpresion,
}: {
  busca: string;
  setBusca: (v: string) => void;
  onAgregar: (tipo: TipoCampo | 'seccion', preset?: Partial<CampoPlantilla>) => void;
  onDrag: (e: DragEvent, c: CargaDrag) => void;
  impresionIncluida: boolean;
  onAgregarImpresion: () => void;
}) {
  const q = busca.trim().toLowerCase();
  const grupos = GRUPOS.map((g) => ({ ...g, items: g.items.filter((i) => !q || i.nombre.toLowerCase().includes(q)) })).filter(
    (g) => g.items.length,
  );
  const paciente = CAMPOS_PACIENTE_CATALOGO.filter((c) => !q || c.nombre.toLowerCase().includes(q));

  return (
    <aside aria-label="Elementos" className="w-[252px] shrink-0 overflow-y-auto border-r border-border bg-card p-4">
      <label className="flex h-10 items-center gap-2 rounded-[10px] border border-border bg-muted px-3 focus-within:border-secondary">
        <Search aria-hidden className="h-[15px] w-[15px] shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="sr-only">Buscar elemento</span>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar elemento…"
          className="w-full min-w-0 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground"
        />
      </label>

      {grupos.map((g) => (
        <div key={g.titulo}>
          <p className={`${kicker} mb-2 mt-[18px]`}>{g.titulo}</p>
          <div className="grid grid-cols-2 gap-2">
            {g.items.map((it) => {
              const Icono = it.icono;
              return (
                <button
                  key={it.nombre}
                  type="button"
                  draggable
                  onDragStart={(e) => onDrag(e, { k: 'nuevo', tipo: it.tipo })}
                  onClick={() => onAgregar(it.tipo)}
                  className={`flex h-[74px] cursor-grab flex-col items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card text-[11.5px] font-semibold text-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground active:cursor-grabbing ${focusRing}`}
                >
                  <Icono aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  {it.nombre}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {paciente.length > 0 && (
        <>
          <p className={`${kicker} mb-2 mt-[18px]`}>Campos del paciente</p>
          <div className="flex flex-col gap-1.5">
            {paciente.map((p) => {
              const preset = campoPacienteDesdeCatalogo(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  draggable
                  onDragStart={(e) => onDrag(e, { k: 'nuevo', tipo: p.tipo, preset })}
                  onClick={() => onAgregar(p.tipo, preset)}
                  className={`flex h-10 cursor-grab items-center gap-2.5 rounded-[10px] border border-border bg-card px-3 text-left text-[12px] font-semibold transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground ${focusRing}`}
                >
                  {p.nombre}
                  <span className={`${mono} ml-auto text-[10px] text-muted-foreground`}>del catálogo</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {(!q || 'impresión diagnóstica'.includes(q)) && (
        <>
          <p className={`${kicker} mb-2 mt-[18px]`}>Cierre del reporte</p>
          <button
            type="button"
            disabled={impresionIncluida}
            onClick={onAgregarImpresion}
            className={`flex h-10 w-full items-center gap-2.5 rounded-[10px] border border-border bg-card px-3 text-left text-[12px] font-semibold transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground disabled:cursor-default disabled:opacity-55 disabled:hover:border-border disabled:hover:bg-card disabled:hover:text-foreground ${focusRing}`}
          >
            <FileText aria-hidden className="h-[15px] w-[15px] shrink-0" strokeWidth={1.75} />
            Impresión diagnóstica
            <span className={`${mono} ml-auto text-[10px] text-muted-foreground`}>{impresionIncluida ? 'ya está' : 'agregar'}</span>
          </button>
        </>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Arrastre al lienzo o haga clic para agregarlo a la sección seleccionada.
      </p>
    </aside>
  );
}

/* ═══════════════════════════ 2 · lienzo ═══════════════════════════ */
function SeccionCard({
  seccion: s,
  primera,
  ultima,
  seleccion,
  dropSobre,
  onSeleccionar,
  onTitulo,
  onColumnas,
  onColapsar,
  onDuplicar,
  onEliminar,
  onSubirBajar,
  onAtajo,
  onDuplicarCampo,
  onEliminarCampo,
  onDragCampo,
  onDragSeccion,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  seccion: SeccionPlantilla;
  primera: boolean;
  ultima: boolean;
  seleccion: Seleccion;
  dropSobre: string | null;
  onSeleccionar: (s: Seleccion) => void;
  onTitulo: (v: string) => void;
  onColumnas: (n: number) => void;
  onColapsar: () => void;
  onDuplicar: () => void;
  onEliminar: () => void;
  onSubirBajar: (d: -1 | 1) => void;
  onAtajo: (t: TipoCampo) => void;
  onDuplicarCampo: (id: string) => void;
  onEliminarCampo: (id: string) => void;
  onDragCampo: (e: DragEvent, id: string) => void;
  onDragSeccion: (e: DragEvent) => void;
  onDragOver: (e: DragEvent, id: string) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent, seccionId: string, antesDe?: string) => void;
}) {
  const activa = seleccion?.seccionId === s.id;
  const esLaSeccion = seleccion?.k === 'seccion' && activa;
  const cols = Math.min(3, Math.max(1, s.columnas || 1));
  const zona = `sec-${s.id}`;

  return (
    <section
      aria-label={`Sección ${s.titulo}`}
      onDragOver={(e) => onDragOver(e, zona)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, s.id)}
      className={`rounded-xl border bg-card shadow-[var(--shadow-rest)] transition-colors ${
        esLaSeccion ? 'border-primary shadow-[var(--halo-teal)]' : activa ? 'border-primary' : 'border-border'
      } ${dropSobre === zona ? 'ring-2 ring-primary/40' : ''}`}
    >
      <div
        className={`flex items-center gap-2.5 px-4 py-3.5 ${s.colapsada ? '' : 'border-b border-border'}`}
        onClick={() => onSeleccionar({ k: 'seccion', seccionId: s.id })}
      >
        <span
          draggable
          onDragStart={onDragSeccion}
          aria-label="Arrastrar sección"
          className="cursor-grab text-[color:var(--track)] active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="h-[15px] w-[15px]" strokeWidth={1.9} />
        </span>
        <input
          value={s.titulo}
          onChange={(e) => onTitulo(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Título de la sección"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 text-[15px] font-bold outline-none focus:bg-muted"
        />
        {s.tipo === 'encabezado' && (
          <span className="inline-flex h-5 items-center rounded-md bg-accent px-[7px] text-[10px] font-semibold text-accent-foreground">
            datos del estudio
          </span>
        )}
        <span role="radiogroup" aria-label="Columnas" className="flex gap-1 rounded-[9px] bg-muted p-[3px]">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={cols === n}
              aria-label={`${n} columnas`}
              onClick={(e) => {
                e.stopPropagation();
                onColumnas(n);
              }}
              className={`${mono} h-7 w-8 rounded-[7px] text-[11.5px] font-bold transition-colors ${focusRing} ${
                cols === n ? 'bg-card text-foreground shadow-[0_1px_2px_rgba(17,24,39,.1)]' : 'text-muted-foreground'
              }`}
            >
              {n}
            </button>
          ))}
        </span>
        <IconBtn label="Subir sección" disabled={primera} onClick={() => onSubirBajar(-1)}>
          <ChevronUp className="h-[15px] w-[15px]" strokeWidth={2} />
        </IconBtn>
        <IconBtn label="Bajar sección" disabled={ultima} onClick={() => onSubirBajar(1)}>
          <ChevronDown className="h-[15px] w-[15px]" strokeWidth={2} />
        </IconBtn>
        <IconBtn label="Duplicar sección" onClick={onDuplicar}>
          <Copy className="h-[15px] w-[15px]" strokeWidth={1.75} />
        </IconBtn>
        <IconBtn label="Eliminar sección" onClick={onEliminar}>
          <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.75} />
        </IconBtn>
      </div>

      {s.colapsada ? (
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-2.5">
          <span className={`${mono} text-[11px] text-muted-foreground`}>
            {s.campos.length} campos · {cols} columnas
          </span>
          <button
            type="button"
            onClick={onColapsar}
            className={`ml-auto h-[30px] rounded-lg px-2.5 text-[11.5px] font-semibold text-secondary hover:bg-accent ${focusRing}`}
          >
            Expandir
          </button>
        </div>
      ) : (
        <div className="px-4 pb-4 pt-3.5">
          {s.campos.length > 0 ? (
            <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {s.campos.map((c) => (
                <CampoCard
                  key={c.id}
                  campo={c}
                  columnasSeccion={cols}
                  seleccionado={seleccion?.k === 'campo' && seleccion.campoId === c.id}
                  dropAntes={dropSobre === c.id}
                  onSeleccionar={() => onSeleccionar({ k: 'campo', seccionId: s.id, campoId: c.id })}
                  onDuplicar={() => onDuplicarCampo(c.id)}
                  onEliminar={() => onEliminarCampo(c.id)}
                  onDragStart={(e) => onDragCampo(e, c.id)}
                  onDragOver={(e) => {
                    e.stopPropagation();
                    onDragOver(e, c.id);
                  }}
                  onDrop={(e) => onDrop(e, s.id, c.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[10px] border-[1.5px] border-dashed border-[color:var(--track)] px-4 py-6 text-center text-[12px] text-muted-foreground">
              Suelte aquí un elemento, o use los atajos de abajo.
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[color:var(--track)] p-2.5">
            <span className={`${kicker} mr-1`}>Agregar</span>
            {ATAJOS.map((t) => {
              const Icono = ICONO_TIPO[t];
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onAtajo(t)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-[11.5px] font-semibold text-[color:var(--foreground-soft)] transition-colors hover:border-primary hover:text-secondary ${focusRing}`}
                >
                  <Icono aria-hidden className="h-[13px] w-[13px]" strokeWidth={1.75} />
                  {ETIQUETA_TIPO[t]}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onColapsar}
              className={`ml-auto h-8 rounded-lg px-2.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground ${focusRing}`}
            >
              Colapsar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function CampoCard({
  campo: c,
  columnasSeccion,
  seleccionado,
  dropAntes,
  onSeleccionar,
  onDuplicar,
  onEliminar,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  campo: CampoPlantilla;
  columnasSeccion: number;
  seleccionado: boolean;
  dropAntes: boolean;
  onSeleccionar: () => void;
  onDuplicar: () => void;
  onEliminar: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}) {
  const span = Math.min(c.span ?? 1, columnasSeccion);
  const estatico = esCampoEstatico(c.tipo);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-selected={seleccionado}
      aria-label={`${ETIQUETA_TIPO[c.tipo]}: ${c.nombre}`}
      onClick={(e) => {
        e.stopPropagation();
        onSeleccionar();
      }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSeleccionar())}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      style={{ gridColumn: `span ${span}` }}
      className={`relative min-w-0 cursor-pointer rounded-[10px] bg-card px-3 pb-[13px] pt-3 transition-[border-color,box-shadow] ${focusRing} ${
        seleccionado
          ? 'border-2 border-primary shadow-[var(--halo-teal)]'
          : estatico
            ? 'border border-dashed border-[color:var(--dashed)] bg-muted hover:border-primary'
            : 'border border-dashed border-[color:var(--dashed)] hover:border-primary'
      } ${dropAntes ? 'before:absolute before:-left-[7px] before:bottom-1 before:top-1 before:w-[3px] before:rounded-full before:bg-primary' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        <GripVertical aria-hidden className="h-[13px] w-[13px] cursor-grab text-[color:var(--track)]" strokeWidth={1.9} />
        <span className="inline-flex h-5 items-center rounded-md bg-muted px-[7px] text-[10px] font-semibold text-muted-foreground">
          {ETIQUETA_TIPO[c.tipo]}
        </span>
        {c.bloqueado && (
          <span className="inline-flex h-5 items-center rounded-md bg-accent px-[7px] text-[10px] font-semibold text-accent-foreground">
            auto
          </span>
        )}
        {c.tipo === 'tabla' && (
          <span className={`${mono} text-[10.5px] text-muted-foreground`}>
            {c.filas?.length ?? 0} × {c.columnas?.length ?? 0}
          </span>
        )}
        {c.enInforme === false && !estatico && (
          <span className="inline-flex h-5 items-center rounded-md border border-border px-[7px] text-[10px] font-semibold text-muted-foreground">
            no sale
          </span>
        )}
        {seleccionado && (
          <span className="ml-auto flex gap-0.5">
            <IconBtn label="Duplicar campo" onClick={onDuplicar} small>
              <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
            </IconBtn>
            <IconBtn label="Eliminar campo" onClick={onEliminar} small>
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </IconBtn>
          </span>
        )}
      </div>

      {!estatico && (
        <p className="mb-[7px] mt-[9px] text-[12.5px] font-semibold">
          {c.nombre || '(sin nombre)'}
          {(c.obligatorio ?? true) && <span className="text-[color:var(--warning-foreground)]"> *</span>}
        </p>
      )}

      {REGISTRO_UI[c.tipo].preview(c)}
    </div>
  );
}

/* ═══════════════════════════ 3 · propiedades ═══════════════════════════ */
function PanelCampo({
  campo: c,
  seccion,
  camposDisponibles,
  onCambio,
  onTipo,
}: {
  campo: CampoPlantilla;
  seccion: SeccionPlantilla;
  camposDisponibles?: CampoRef[];
  onCambio: (patch: Partial<CampoPlantilla>) => void;
  onTipo: (t: TipoCampo) => void;
}) {
  const Icono = ICONO_TIPO[c.tipo];
  const cols = Math.min(3, Math.max(1, seccion.columnas || 1));
  const editorTipo = REGISTRO_UI[c.tipo].editor;

  return (
    <>
      <Bloque>
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] bg-accent text-accent-foreground">
            <Icono className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-bold">{c.nombre || ETIQUETA_TIPO[c.tipo]}</span>
            <span className="mt-px block text-[11px] text-muted-foreground">en {seccion.titulo}</span>
          </span>
        </div>
        <Campo2 label="Tipo de campo" mt={14}>
          <select value={c.tipo} onChange={(e) => onTipo(e.target.value as TipoCampo)} className={cfgInput}>
            {TIPOS_CAMPO.map((t) => (
              <option key={t} value={t}>
                {ETIQUETA_TIPO[t]}
              </option>
            ))}
          </select>
        </Campo2>
        <Campo2 label={c.tipo === 'guia' ? 'Texto de la guía' : c.tipo === 'titulo' ? 'Título' : 'Etiqueta'}>
          {c.tipo === 'guia' ? (
            <textarea
              rows={3}
              value={c.nombre}
              onChange={(e) => onCambio({ nombre: e.target.value })}
              className={`${cfgInput} h-auto resize-none py-2.5 leading-relaxed`}
            />
          ) : (
            <input value={c.nombre} onChange={(e) => onCambio({ nombre: e.target.value })} className={cfgInput} />
          )}
        </Campo2>
      </Bloque>

      {editorTipo && (
        <Bloque>
          <p className={kicker}>{ETIQUETA_TIPO[c.tipo]}</p>
          <div className="mt-2.5">{editorTipo({ campo: c, onCambio, camposDisponibles })}</div>
        </Bloque>
      )}

      {/* Ancho ("span" de columnas): común a TODOS los tipos, incluidos TÍTULO y guía — el render
          (constructor/médico/vista previa) ya honra `span` para todos. Los interruptores
          (obligatorio / sale en informe) solo aplican a campos llenables. */}
      {(!esCampoEstatico(c.tipo) || c.tipo === 'guia' || c.tipo === 'titulo') && (
        <Bloque>
          <p className={kicker}>Ancho en la sección</p>
          <Segmentado
            opciones={[
              [1, '1 col'],
              [2, '2 col'],
              [3, '3 col'],
            ]}
            valor={Math.min(c.span ?? 1, 3)}
            onCambio={(v) => onCambio({ span: v })}
            deshabilitar={(v) => v > cols}
          />
          {(c.span ?? 1) > cols && (
            <p className="mt-2 text-[11px] text-[color:var(--warning-foreground)]">
              La sección tiene {cols} columna(s): el campo se ajusta a ese ancho.
            </p>
          )}
          {!esCampoEstatico(c.tipo) && (
            <div className="mt-3">
              <Interruptor
                titulo="Obligatorio"
                detalle="no se puede finalizar el reporte sin este dato"
                on={c.obligatorio ?? true}
                onCambio={(v) => onCambio({ obligatorio: v })}
              />
              <Interruptor
                titulo="Sale en el informe"
                detalle="si lo apaga, solo lo ve el médico"
                on={c.enInforme !== false}
                onCambio={(v) => onCambio({ enInforme: v })}
              />
            </div>
          )}
          {/* Ocultar título — común a TODOS los tipos con etiqueta/título propio (reusa `ocultarTitulo`,
              la misma prop que la sección y la tabla). El PDF respeta el flag en cada tipo. */}
          <div className="mt-3">
            <Interruptor
              titulo="Ocultar título"
              detalle="no muestra la etiqueta/título de este campo en el informe"
              on={!!c.ocultarTitulo}
              onCambio={(v) => onCambio({ ocultarTitulo: v })}
            />
          </div>
        </Bloque>
      )}

      {!esCampoEstatico(c.tipo) && (
        <Bloque ultimo>
          <p className={kicker}>Ayuda al médico</p>
          <Campo2 label="Texto guía" mt={10} nota="Orienta al médico; no sale en el informe.">
            <textarea
              rows={2}
              value={c.guia ?? ''}
              onChange={(e) => onCambio({ guia: e.target.value })}
              className={`${cfgInput} h-auto resize-none py-2.5 leading-relaxed`}
            />
          </Campo2>
        </Bloque>
      )}
    </>
  );
}

function PanelSeccion({ seccion: s, onCambio }: { seccion: SeccionPlantilla; onCambio: (c: Partial<SeccionPlantilla>) => void }) {
  return (
    <>
      <Bloque>
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-accent text-accent-foreground">
            <LayoutPanelTop className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-bold">{s.titulo}</span>
            <span className={`${mono} mt-px block text-[11px] text-muted-foreground`}>{s.campos.length} campos</span>
          </span>
        </div>
        <Campo2 label="Título" mt={14}>
          <input value={s.titulo} onChange={(e) => onCambio({ titulo: e.target.value })} className={cfgInput} />
        </Campo2>
      </Bloque>
      <Bloque ultimo>
        <p className={kicker}>Rejilla</p>
        <Segmentado
          opciones={[
            [1, '1 col'],
            [2, '2 col'],
            [3, '3 col'],
          ]}
          valor={Math.min(3, Math.max(1, s.columnas || 1))}
          onCambio={(v) => onCambio({ columnas: v })}
        />
        <div className="mt-3">
          <Interruptor titulo="Sale en el informe" detalle="si lo apaga, la sección solo sirve para capturar" on={s.enInforme !== false} onCambio={(v) => onCambio({ enInforme: v })} />
          <Interruptor titulo="Ocultar título" detalle="no repite el título (ej. si una tabla dentro se llama igual)" on={!!s.ocultarTitulo} onCambio={(v) => onCambio({ ocultarTitulo: v })} />
          <Interruptor titulo="Colapsada en el lienzo" detalle="solo afecta a esta vista" on={!!s.colapsada} onCambio={(v) => onCambio({ colapsada: v })} />
        </div>
      </Bloque>
    </>
  );
}

function PanelPlantilla({ nombre, tipoEstudio, nSecciones }: { nombre: string; tipoEstudio: string; nSecciones: number }) {
  return (
    <Bloque ultimo>
      <p className={kicker}>Plantilla</p>
      <p className="mt-2.5 text-[13.5px] font-bold">{nombre}</p>
      <p className="mt-1 text-[12px] text-muted-foreground">
        {tipoEstudio || 'Sin tipo'} · {nSecciones} secciones
      </p>
      <p className="mt-4 text-[12px] leading-relaxed text-[color:var(--foreground-soft)]">
        Seleccione una sección o un campo en el lienzo para editar sus propiedades.
      </p>
    </Bloque>
  );
}

/* ═══════════════════════════ piezas ═══════════════════════════ */
function Bloque({ children, ultimo }: { children: ReactNode; ultimo?: boolean }) {
  return <div className={`px-[18px] py-4 ${ultimo ? '' : 'border-b border-border'}`}>{children}</div>;
}
function Campo2({ label, children, mt = 12, nota }: { label: string; children: ReactNode; mt?: number; nota?: string }) {
  return (
    <label className="block" style={{ marginTop: mt }}>
      <span className="block text-[11.5px] font-semibold">{label}</span>
      <span className="mt-1.5 block">{children}</span>
      {nota && <span className="mt-1.5 block text-[11px] leading-snug text-muted-foreground">{nota}</span>}
    </label>
  );
}
function Segmentado({
  opciones,
  valor,
  onCambio,
  deshabilitar,
}: {
  opciones: [number, string][];
  valor: number | undefined;
  onCambio: (v: number) => void;
  deshabilitar?: (v: number) => boolean;
}) {
  return (
    <span role="radiogroup" className="mt-1.5 flex gap-1 rounded-[10px] bg-muted p-[3px]">
      {opciones.map(([v, t]) => {
        const on = v === valor;
        const off = deshabilitar?.(v);
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={off}
            onClick={() => onCambio(v)}
            className={`h-8 flex-1 rounded-lg text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${focusRing} ${
              on ? 'bg-card font-bold text-foreground shadow-[0_1px_2px_rgba(17,24,39,.1)]' : 'font-semibold text-muted-foreground'
            }`}
          >
            {t}
          </button>
        );
      })}
    </span>
  );
}
function Interruptor({ titulo, detalle, on, onCambio }: { titulo: string; detalle?: string; on: boolean; onCambio: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 border-t border-border py-[11px] first:border-t-0">
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px] font-semibold">{titulo}</span>
        {detalle && <span className="mt-0.5 block text-[11px] text-muted-foreground">{detalle}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={titulo}
        onClick={() => onCambio(!on)}
        className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${focusRing} ${on ? 'bg-primary' : 'bg-[color:var(--track)]'}`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-card shadow-[0_1px_2px_rgba(17,24,39,.2)] transition-all ${on ? 'right-0.5' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}
function IconBtn({
  label,
  onClick,
  children,
  disabled,
  small,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`grid shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 ${focusRing} ${
        small ? 'h-[26px] w-[26px]' : 'h-8 w-8'
      }`}
    >
      {children}
    </button>
  );
}
