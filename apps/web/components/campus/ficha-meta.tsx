/**
 * Ficha de metadatos de una lección (§5A) — la "tabla bonita en card" donde viven los
 * datos que ANTES colgaban del título (valor de la actividad, formato/modalidad, estado
 * de la entrega, ventana, fechas…). Se muestra APARTE, debajo del encabezado, con filas
 * etiqueta → valor (texto o badge). Mantiene el header limpio y consistente entre tipos.
 */

export type FilaMeta = { etiqueta: string; valor: React.ReactNode };

export function FichaMeta({ titulo = 'Detalles', filas }: { titulo?: string; filas: FilaMeta[] }) {
  const visibles = filas.filter((f) => f.valor !== null && f.valor !== undefined && f.valor !== '');
  if (visibles.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-rest">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{titulo}</p>
      </div>
      <dl className="divide-y divide-border">
        {visibles.map((f, i) => (
          <div key={`${i}-${f.etiqueta}`} className="flex items-center justify-between gap-4 px-4 py-2.5">
            <dt className="shrink-0 text-[12.5px] font-semibold text-muted-foreground">{f.etiqueta}</dt>
            <dd className="min-w-0 text-right text-[13px] font-bold text-foreground">{f.valor}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
