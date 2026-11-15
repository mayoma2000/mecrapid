import { redirect } from 'next/navigation'

// Los mecánicos ahora se gestionan junto con los administradores en "Usuarios del taller"
export default function MechanicsRedirect() {
  redirect('/team')
}
