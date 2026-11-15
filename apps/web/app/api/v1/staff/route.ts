import type { NextRequest } from 'next/server'
import { requireRole } from '@/src/lib/authz'
import { confirmPassword, createStaff, listStaff, recentAudit } from '@/src/lib/staff'

// Usuarios del taller (solo admin; se gestiona solo desde el backoffice web)
export async function GET() {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response
  const [staff, audit] = await Promise.all([listStaff(), recentAudit()])
  return Response.json({ data: { staff, audit, me: g.session.user.id } })
}

export async function POST(request: NextRequest) {
  const g = await requireRole(['admin'])
  if (!g.ok) return g.response

  const body = await request.json() as { name?: string; email?: string; phone?: string; password?: string; role?: string; currentPassword?: string }
  // Crear un administrador exige confirmar con la contraseña propia
  if (body.role === 'admin') {
    const denied = await confirmPassword(body.currentPassword)
    if (denied) return Response.json({ error: denied.error }, { status: denied.status })
  }

  const result = await createStaff({ id: g.session.user.id, name: g.session.user.name }, body)
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status })
  return Response.json({ data: { id: result.id } }, { status: 201 })
}
