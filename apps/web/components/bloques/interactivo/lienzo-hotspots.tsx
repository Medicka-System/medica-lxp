'use client';

/**
 * Lienzo de hotspots (react-konva / konva) — la superficie de canvas del bloque
 * INTERACTIVO. Vive aislado para cargarse con `next/dynamic({ ssr:false })`: konva
 * intenta requerir el módulo nativo `canvas` en el servidor y rompería el render SSR.
 *
 * Solo dibuja: imagen base + marcadores numerados (arrastrables en modo editar).
 * Toda la lógica (agregar/seleccionar/mover) sube al wrapper por callbacks; las
 * posiciones se manejan relativas (0..1) para que escalen con el tamaño mostrado.
 */

import { Stage, Layer, Image as KonvaImage, Circle, Group, Text } from 'react-konva';
import type Konva from 'konva';
import type { Hotspot } from '@/components/bloques/contratos';

export type LienzoHotspotsProps = {
  imagen: HTMLImageElement;
  ancho: number;
  alto: number;
  hotspots: Hotspot[];
  editable: boolean;
  seleccionado: string | null;
  onSeleccionar: (id: string | null) => void;
  onAgregar: (x: number, y: number) => void;
  onMover: (id: string, x: number, y: number) => void;
};

export default function LienzoHotspots({
  imagen,
  ancho,
  alto,
  hotspots,
  editable,
  seleccionado,
  onSeleccionar,
  onAgregar,
  onMover,
}: LienzoHotspotsProps) {
  function alClicEnFondo(e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    // Clic en la imagen base (no en un marcador): agregar o deseleccionar.
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    if (editable && e.target.name() === 'fondo') {
      onAgregar(clamp01(pos.x / ancho), clamp01(pos.y / alto));
    } else if (e.target.name() === 'fondo') {
      onSeleccionar(null);
    }
  }

  return (
    <Stage width={ancho} height={alto} className="rounded-[10px]">
      <Layer>
        <KonvaImage image={imagen} width={ancho} height={alto} name="fondo" onClick={alClicEnFondo} onTap={alClicEnFondo} />
        {hotspots.map((h, i) => {
          const cx = h.x * ancho;
          const cy = h.y * alto;
          const activo = h.id === seleccionado;
          return (
            <Group
              key={h.id}
              x={cx}
              y={cy}
              draggable={editable}
              onClick={() => onSeleccionar(h.id)}
              onTap={() => onSeleccionar(h.id)}
              onDragEnd={(e) => onMover(h.id, clamp01(e.target.x() / ancho), clamp01(e.target.y() / alto))}
            >
              <Circle radius={activo ? 16 : 14} fill={activo ? '#1a8880' : '#53c3be'} stroke="#ffffff" strokeWidth={2.5} shadowColor="#111827" shadowBlur={6} shadowOpacity={0.25} />
              <Text
                text={String(i + 1)}
                fontSize={13}
                fontStyle="bold"
                fill="#0f2d52"
                width={32}
                height={32}
                offsetX={16}
                offsetY={16}
                align="center"
                verticalAlign="middle"
                listening={false}
              />
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
