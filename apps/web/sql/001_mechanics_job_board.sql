-- Fase 1: mecánicos y tablero de trabajo
-- Los mecánicos son usuarios de better-auth ("user") con role = 'mecanico'.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "phone" text;

-- mechanicId apuntaba a la tabla "User" de la época de Clerk (vacía, verificado 2026-11-14).
-- La tabla vieja se deja tal cual: sin uso, pero no se borra nada.
ALTER TABLE "WorkOrder" DROP CONSTRAINT IF EXISTS "WorkOrder_mechanicId_fkey";
ALTER TABLE "WorkOrder"
  ADD CONSTRAINT "WorkOrder_mechanicId_fkey"
  FOREIGN KEY ("mechanicId") REFERENCES "user"("id") ON DELETE SET NULL;

ALTER TABLE "WorkOrder"
  ADD COLUMN IF NOT EXISTS "startedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "mileageIn" integer;

CREATE TABLE IF NOT EXISTS "WorkOrderTimeLog" (
  "id"          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "workOrderId" text NOT NULL REFERENCES "WorkOrder"("id") ON DELETE CASCADE,
  "mechanicId"  text NOT NULL REFERENCES "user"("id"),
  "startedAt"   timestamptz NOT NULL DEFAULT now(),
  "endedAt"     timestamptz,
  "note"        text,
  "createdAt"   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "WorkOrderTimeLog_workOrderId_idx" ON "WorkOrderTimeLog"("workOrderId");
-- Un mecánico solo puede tener un trabajo corriendo a la vez
CREATE UNIQUE INDEX IF NOT EXISTS "WorkOrderTimeLog_one_running_per_mechanic"
  ON "WorkOrderTimeLog"("mechanicId") WHERE "endedAt" IS NULL;
