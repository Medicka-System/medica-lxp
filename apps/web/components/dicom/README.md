# `components/dicom` — Visor DICOM (Cornerstone3D)

Visor de estudios DICOM del Campus (CLAUDE.md §4.7, Sprint 5). Reproduce
**cine-loops multi-frame**, navega **series** y permite **medir/anotar**. Pensado
para embeberse en varias pantallas (bitácora, Ateneo, Biblioteca, editor de caso)
mediante una **interfaz por props**.

> Territorio de esta carpeta: **solo** `components/dicom/`. La app real la enchufa
> después. El motor de render (Cornerstone3D) vive detrás de la interfaz
> `MotorVisor`, así que las pantallas nunca importan la librería directamente.

## Uso

```tsx
import { VisorDicom, type EstudioDicom } from '@/components/dicom';

const estudio: EstudioDicom = {
  id: 'caso-123',
  series: [
    {
      id: 's1',
      descripcion: 'Abdomen — Longitudinal',
      modalidad: 'US',
      frames: [{ imageId: 'wadouri:https://storage/…/img.dcm', indice: 0 }],
    },
    {
      id: 's2',
      descripcion: 'Vejiga — Cine 4C',
      modalidad: 'US',
      fps: 24,
      frames: Array.from({ length: 48 }, (_, i) => ({
        imageId: `wadouri:https://storage/…/loop.dcm?frame=${i}`,
        indice: i,
      })),
    },
  ],
};

<VisorDicom estudio={estudio} />;

// Miniatura de solo lectura (p. ej. tarjeta del Ateneo):
<VisorDicom estudio={estudio} soloLectura ocultarSeries className="h-64" />;
```

### Props (`VisorDicomProps`)

| Prop | Tipo | Descripción |
|---|---|---|
| `estudio` | `EstudioDicom` | Estudio ya parseado y **anonimizado** (requerido). |
| `serieInicial` | `string` | Id de la serie a mostrar primero (default: la primera). |
| `herramientaInicial` | `HerramientaId` | Herramienta activa inicial (default: `ventana`). |
| `crearMotor` | `() => MotorVisor \| Promise<MotorVisor>` | Fábrica del motor. Default: Cornerstone3D (import dinámico, solo cliente). Se inyecta un doble en tests. |
| `soloLectura` | `boolean` | Oculta medición/anotación (modo consulta/miniatura). |
| `ocultarSeries` | `boolean` | Oculta el rail de series. |
| `className` | `string` | Alto/ancho del contenedor. |
| `onHerramientaChange` | `(id) => void` | Notifica la herramienta activa. |

## Formato de entrada (contrato) — **importante**

Este componente **no** parsea DICOM binario. El parseo real (dcmjs /
`dicom-parser` / DICOMweb) y la **anonimización obligatoria y bloqueante**
(CLAUDE.md §10) viven en el pipeline de ingesta del `api` (worker
`procesar-dicom`, §8) — **la librería concreta de parseo aún está por decidir**.

El visor recibe el estudio **ya resuelto**:

- `EstudioDicom` → `series: SerieDicom[]`.
- `SerieDicom.frames: FrameDicom[]`, cada uno con un **`imageId` opaco** que el
  motor sabe cargar. 1 frame = imagen estática; >1 = cine-loop.
- Nunca PII del paciente en `metadatos` (van anonimizados).

### Convención de `imageId` (la resuelve el motor)

| Origen | `imageId` |
|---|---|
| Archivo DICOM único (URL firmada) | `wadouri:https://…/img.dcm` |
| Frame N de un multi-frame | `wadouri:https://…/estudio.dcm?frame=N` |
| DICOMweb (WADO-RS) | `wadors:https://…/frames/N` |
| Mock/tests (sin red) | `mock:serie/frame-0` |

Para un cine-loop, la ingesta produce **un `imageId` por frame**, ordenados por
`indice`. Cuando el parser quede decidido, solo cambia **cómo se construyen** esos
`imageId` en la ingesta y el registro del loader en `engine/motor-cornerstone.ts`:
el resto del visor no se toca.

## Arquitectura interna

```
VisorDicom (visor-dicom.tsx)     UI + layout (stage oscuro, overlays, estados)
├─ BarraHerramientas / ControlesCine (toolbar.tsx)
├─ useVisorDicom (use-visor-dicom.ts)   orquesta: series, herramienta, ciclo de vida
│  └─ useCineLoop (use-cine-loop.ts)    reproductor multi-frame (reloj)
│     └─ cine.ts                        lógica pura de avance (testeada)
└─ MotorVisor (motor.ts)                frontera limpia con el engine
   └─ MotorCornerstone (engine/motor-cornerstone.ts)  ← ÚNICO acople a Cornerstone3D
```

- **`MotorVisor`** aísla Cornerstone3D. `MotorCornerstone` se importa de forma
  **dinámica y solo en el cliente** (WebGL / Web Workers); no entra al bundle de
  servidor ni a los tests. Por eso el barrel `index.ts` **no** re-exporta el motor.
- La **lógica** (avance de frames, navegación, herramienta activa) es testeable sin
  WebGL inyectando un `MotorFake` (`mock.ts`).

## Herramientas

Catálogo en `herramientas.ts`, mapeado 1:1 a tools de Cornerstone3D:

- **Manipular:** Desplazar (Pan), Zoom, Brillo/Contraste (WindowLevel), Recorrer frames (StackScroll).
- **Medir:** Longitud, Ángulo, Elipse (ROI), Rectángulo (ROI), Sonda (Probe).
- **Anotar:** Flecha + nota (ArrowAnnotate).

Bindings fijos del ratón: rueda = recorrer frames, botón medio = desplazar, botón
derecho = zoom. El botón primario lo ocupa la herramienta seleccionada.

## Tests

```bash
pnpm --filter @campus/web test
```

Vitest + Testing Library (jsdom). Cubre la lógica pura del cine-loop, los hooks
(`useCineLoop`, `useVisorDicom`) con un motor doble, el catálogo de herramientas y
el render del componente. **No** se testea el render WebGL real de Cornerstone3D
(requiere GPU); esa parte queda tras `MotorVisor` y se valida manualmente / en el
Sprint 4.7 con un DICOM real.
```
