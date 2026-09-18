import { Hammer } from 'lucide-react';
import { softText } from '@/components/tokens';

/** Placeholder de sección aún no construida (se reemplaza en su sprint). Mantiene
 *  el Campus navegable sin 404 mientras el resto de pantallas llegan. */
export function Proximamente({ titulo, nota }: { titulo: string; nota?: string }) {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-6 lg:px-8">
      <h1 className="text-[22px] font-bold tracking-[-0.01em]">{titulo}</h1>
      <div className="mt-6 grid min-h-[360px] place-items-center rounded-xl border border-dashed border-border bg-card">
        <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
          <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
            <Hammer className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <p className="text-[15px] font-bold">Próximamente</p>
          <p className={`text-[13px] leading-relaxed ${softText}`}>
            {nota ?? 'Esta sección se construye en un sprint próximo. La navegación ya funciona.'}
          </p>
        </div>
      </div>
    </div>
  );
}
