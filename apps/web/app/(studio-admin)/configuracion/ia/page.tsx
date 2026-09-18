import Link from 'next/link';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { softText } from '@/components/tokens';
import { requireSuperAdmin } from '../_guard';
import { getEcoConfigActiva } from '../_datos';
import { EditorEco } from './_components/editor-eco';

export const dynamic = 'force-dynamic';

/**
 * Studio · Configuración › IA / Eco. Carga la config ACTIVA de Eco (RLS · §7A) y la
 * entrega al editor. Si no hay ninguna activa (seed no corrido), muestra un estado
 * vacío honesto en lugar de inventar una config.
 */
export default async function IaConfigPage() {
  const { userId } = await requireSuperAdmin();
  const config = await getEcoConfigActiva(userId);

  if (!config) {
    return (
      <div className="mx-auto w-full max-w-[980px] px-6 pb-24 pt-5">
        <Link
          href="/configuracion"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" strokeWidth={2} />
          Configuración del sistema
        </Link>
        <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center shadow-rest">
          <span
            aria-hidden
            className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground"
          >
            <Sparkles className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <h1 className="text-[16px] font-bold">No hay una configuración de Eco activa</h1>
          <p className={`max-w-md text-[12.5px] ${softText}`}>
            Eco necesita una config para funcionar. La semilla del proyecto crea
            «evaluacion-default». Corre <code className="rounded bg-muted px-1">pnpm --filter db seed</code>{' '}
            (o su migración 0016) y vuelve aquí.
          </p>
        </div>
      </div>
    );
  }

  return <EditorEco config={config} />;
}
