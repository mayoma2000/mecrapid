import { headers } from 'next/headers'
import { auth } from '@/src/lib/auth'
import { db } from '@/src/prisma/db'
import { notifyUsers } from '@/src/lib/notify'

// Personal del taller: administradores (todos con los mismos privilegios) y mecánicos.
// Reglas: siempre queda ≥ 1 admin activo, nadie se desactiva ni se cambia el rol a sí mismo,
// las acciones sensibles se confirman con la contraseña de quien las hace, todo queda
// registrado (StaffAuditLog) y se avisa a los demás admins.

export type StaffRole = 'admin' | 'mecanico'
export type AuditAction = 'created' | 'role_changed' | 'deactivated' | 'reactivated' | 'password_reset'
type Fail = { ok: false; status: number; error: string }
type Result<T = object> = ({ ok: true } & T) | Fail

const fail = (status: number, error: string): Fail => ({ ok: false, status, error })
const OPEN_STATUSES = ['pending', 'assigned', 'in_progress', 'quality_check'] as const
export const ROLE_LABEL: Record<StaffRole, string> = { admin: 'administrador', mecanico: 'mecánico' }

export async function listStaff() {
  const users = await db.orm.public.User
    .where((u) => u.role.in(['admin', 'mecanico']))
    .include('sessions')
    .include('assignedOrders', (o) => o.where((x) => x.status.in([...OPEN_STATUSES])).count())
    .orderBy((u) => u.name.asc())
    .all()

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role as StaffRole,
    active: !u.banned,
    lastSeenAt: u.sessions.reduce<string | null>((max, s) => (!max || s.updatedAt > max ? s.updatedAt : max), null),
    openOrders: u.assignedOrders,
  }))
}

export async function recentAudit(limit = 50) {
  const rows = await db.orm.public.StaffAuditLog
    .include('actor')
    .include('target')
    .orderBy((l) => l.createdAt.desc())
    .limit(limit)
    .all()
  return rows.map((r) => ({
    id: r.id, action: r.action, detail: r.detail, createdAt: r.createdAt,
    actor: r.actor?.name ?? 'Sistema', target: r.target?.name ?? '—',
  }))
}

// Confirma que quien hace el cambio es quien dice ser (por si dejó la sesión abierta)
export async function confirmPassword(password: string | undefined): Promise<Fail | null> {
  if (!password) return fail(400, 'Confirmá con tu contraseña')
  try {
    await auth.api.verifyPassword({ headers: await headers(), body: { password } })
    return null
  } catch {
    return fail(401, 'La contraseña no coincide')
  }
}

async function activeAdminCount(): Promise<number> {
  const admins = await db.orm.public.User.where((u) => u.role.eq('admin')).all()
  return admins.filter((a) => !a.banned).length
}

// Registra el cambio y avisa a los demás administradores (no al que lo hizo)
async function record(actor: { id: string; name: string }, targetId: string, action: AuditAction, detail: string) {
  await db.orm.public.StaffAuditLog.create({ actorId: actor.id, targetId, action, detail })
  const admins = await db.orm.public.User.where((u) => u.role.eq('admin')).all()
  await notifyUsers(admins.filter((a) => !a.banned && a.id !== actor.id).map((a) => a.id), {
    type: `staff_${action}`,
    title: '👤 Cambio en el personal del taller',
    body: `${actor.name}: ${detail}`,
  }).catch((err) => console.error('[staff] aviso', err))
}

export async function createStaff(
  actor: { id: string; name: string },
  input: { name?: string; email?: string; phone?: string; password?: string; role?: string },
): Promise<Result<{ id: string }>> {
  const name = input.name?.trim()
  const email = input.email?.trim().toLowerCase()
  const role: StaffRole = input.role === 'admin' ? 'admin' : 'mecanico'
  if (!name || !email) return fail(400, 'Nombre y correo son obligatorios')
  if ((input.password ?? '').length < 8) return fail(400, 'La contraseña debe tener al menos 8 caracteres')

  let id: string
  try {
    const { user } = await auth.api.createUser({
      headers: await headers(),
      body: { name, email, password: input.password!, data: { phone: input.phone?.trim() || null } },
    })
    id = user.id
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    return fail(/exist/i.test(message) ? 409 : 400, /exist/i.test(message) ? 'Ya existe una cuenta con ese correo' : 'No se pudo crear la cuenta')
  }
  // El plugin admin solo tipa 'user' | 'admin': el rol se escribe directo (igual para ambos)
  await db.orm.public.User.where({ id }).update({ role })
  await record(actor, id, 'created', `creó la cuenta de ${name} como ${ROLE_LABEL[role]}`)
  return { ok: true, id }
}

export async function updateStaff(
  actor: { id: string; name: string },
  targetId: string,
  input: { role?: string; active?: boolean; password?: string; name?: string; phone?: string | null },
): Promise<Result> {
  const target = await db.orm.public.User.first({ id: targetId })
  if (!target || (target.role !== 'admin' && target.role !== 'mecanico')) return fail(404, 'Usuario no encontrado')
  const self = targetId === actor.id
  const h = await headers()
  const newRole: StaffRole | null = input.role && input.role !== target.role ? (input.role === 'admin' ? 'admin' : 'mecanico') : null
  const deactivate = input.active === false && !target.banned
  const reactivate = input.active === true && !!target.banned

  // ── Validaciones: todas antes de escribir nada ──
  if (self && (newRole || deactivate)) return fail(409, newRole ? 'No podés cambiar tu propio rol' : 'No podés desactivar tu propia cuenta')
  const losesAdmin = target.role === 'admin' && !target.banned && (newRole === 'mecanico' || deactivate)
  if (losesAdmin && (await activeAdminCount()) <= 1) return fail(409, 'Tiene que quedar al menos un administrador activo')
  if (target.role === 'mecanico' && newRole === 'admin') {
    const open = await db.orm.public.WorkOrder
      .where({ mechanicId: targetId })
      .where((o) => o.status.in([...OPEN_STATUSES]))
      .aggregate((x) => ({ count: x.count() }))
    if (open.count > 0) {
      return fail(409, `${target.name} tiene ${open.count} ${open.count === 1 ? 'orden abierta' : 'órdenes abiertas'}. Reasignalas antes de cambiarle el rol.`)
    }
  }
  if (input.password !== undefined && input.password.length < 8) return fail(400, 'La contraseña debe tener al menos 8 caracteres')

  // ── Cambios ──
  const basics: Record<string, unknown> = {}
  if (input.name?.trim()) basics['name'] = input.name.trim()
  if (input.phone !== undefined) basics['phone'] = input.phone?.trim() || null
  if (Object.keys(basics).length > 0) await db.orm.public.User.where({ id: targetId }).update(basics)

  if (newRole) {
    await db.orm.public.User.where({ id: targetId }).update({ role: newRole })
    // Sale de la web y la app: al volver a entrar ya tiene los permisos nuevos
    await auth.api.revokeUserSessions({ headers: h, body: { userId: targetId } })
    await record(actor, targetId, 'role_changed', `cambió a ${target.name} de ${ROLE_LABEL[target.role as StaffRole]} a ${ROLE_LABEL[newRole]}`)
  }

  // Desactivar = ban de better-auth: no puede entrar y se cierran sus sesiones
  if (deactivate) {
    await auth.api.banUser({ headers: h, body: { userId: targetId, banReason: `Desactivado por ${actor.name}` } })
    await record(actor, targetId, 'deactivated', `desactivó la cuenta de ${target.name}`)
  } else if (reactivate) {
    await auth.api.unbanUser({ headers: h, body: { userId: targetId } })
    await record(actor, targetId, 'reactivated', `reactivó la cuenta de ${target.name}`)
  }

  // Contraseña
  if (input.password !== undefined) {
    await auth.api.setUserPassword({ headers: h, body: { userId: targetId, newPassword: input.password } })
    if (!self) await auth.api.revokeUserSessions({ headers: h, body: { userId: targetId } })
    await record(actor, targetId, 'password_reset', `cambió la contraseña de ${target.name}`)
  }

  return { ok: true }
}

// Para los endpoints de /mechanics (app): mismo registro de cambios
export async function recordMechanicChange(actor: { id: string; name: string }, targetId: string, action: AuditAction, detail: string) {
  await record(actor, targetId, action, detail)
}
