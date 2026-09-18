import { Proximamente } from '@/components/campus/proximamente';
export default function PagosPage() {
  return (
    <Proximamente
      titulo="Pagos y facturación"
      nota="Pagos y facturación viven en el portal de CORA (el ERP). En producción este botón abre el checkout de CORA con deep-link; la integración se cablea en el Sprint 11."
    />
  );
}
