-- La asistencia es atención AFUERA del taller (batería, llaves, grúa), con su propio ciclo:
-- pending → en_route ("En camino", con mecánico asignado) → attended ("Atendida"); o cancelled.
-- Ya no crea una orden al aceptarla; la orden se crea solo si el carro tiene que entrar al taller.
ALTER TABLE "AssistanceRequest"
  ADD COLUMN IF NOT EXISTS "mechanicId" text REFERENCES "user"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "enRouteAt"  timestamptz,
  ADD COLUMN IF NOT EXISTS "attendedAt" timestamptz;

-- Estados viejos → nuevos (las que ya tienen orden la conservan enlazada)
UPDATE "AssistanceRequest" SET "status" = 'en_route' WHERE "status" = 'active';
UPDATE "AssistanceRequest" SET "status" = 'attended' WHERE "status" = 'completed';
