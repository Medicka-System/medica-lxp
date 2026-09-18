import { ShieldCheck, SquarePen, Stethoscope } from 'lucide-react';
import { softText } from '@/components/tokens';
import type { RolStaff } from './contrato';

/** El nivel de poder se lee de un barrido: cada rol con color e ícono propios (§5B). */
export const ROL_META: Record<RolStaff, { etiqueta: string; clase: string; Icono: typeof ShieldCheck }> = {
  super_admin: { etiqueta: 'Súper admin', clase: 'bg-sidebar text-sidebar-foreground', Icono: ShieldCheck },
  admin: {
    etiqueta: 'Admin',
    clase: 'border border-[color:var(--info-border)] bg-[color:var(--info-surface)] text-[color:var(--info-foreground)]',
    Icono: ShieldCheck,
  },
  disenador_instruccional: { etiqueta: 'Diseñador', clase: 'bg-accent text-accent-foreground', Icono: SquarePen },
  docente: { etiqueta: 'Docente', clase: `border border-border bg-muted ${softText}`, Icono: Stethoscope },
};

export function ChipRol({ rol }: { rol: RolStaff }) {
  const r = ROL_META[rol];
  return (
    <span className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[10.5px] font-bold ${r.clase}`}>
      <r.Icono aria-hidden className="h-[11px] w-[11px]" strokeWidth={2} />
      {r.etiqueta}
    </span>
  );
}
