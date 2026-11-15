-- Usuarios del taller: registro de cambios sobre cuentas de administradores y mecánicos
-- action: created | role_changed | deactivated | reactivated | password_reset
CREATE TABLE IF NOT EXISTS "StaffAuditLog" (
  "id"        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "actorId"   text REFERENCES "user"("id") ON DELETE SET NULL,
  "targetId"  text REFERENCES "user"("id") ON DELETE SET NULL,
  "action"    text NOT NULL,
  "detail"    text,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "StaffAuditLog_createdAt_idx" ON "StaffAuditLog"("createdAt" DESC);
