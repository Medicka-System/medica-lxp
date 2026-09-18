import { redirect } from 'next/navigation';

/** /herramientas → abre Plantillas por defecto. */
export default function HerramientasIndex() {
  redirect('/herramientas/plantillas');
}
