/**
 * Símbolo de marca de Médica Capacitación (§5A · branding).
 *
 * El asset (`/logosimbolo.png`) es el símbolo BLANCO sobre fondo transparente (su
 * canal alfa define la forma del escudo). En vez de un `<img>` de color fijo, se
 * pinta con `currentColor` vía CSS mask: así HEREDA el color del texto del chip
 * contenedor y encaja en cada contexto sin deformarse ni recolorear el asset —
 * blanco sobre el chip navy del Campus, navy sobre el chip teal del Studio (el
 * mismo tratamiento que tenían las letras "MC" que reemplaza).
 *
 * Decorativo: los shells lo envuelven en un chip `aria-hidden` y el nombre
 * accesible lo da el texto contiguo ("Médica Capacitación").
 */
const MASK = 'url(/logosimbolo.png)';

export function LogoSimbolo({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: 'block',
        backgroundColor: 'currentColor',
        WebkitMaskImage: MASK,
        maskImage: MASK,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  );
}
