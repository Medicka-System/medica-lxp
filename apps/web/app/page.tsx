import { redirect } from 'next/navigation';

/** La raíz entra directo al Campus del alumno (el login real llega en el Sprint 11). */
export default function Root() {
  redirect('/inicio');
}
