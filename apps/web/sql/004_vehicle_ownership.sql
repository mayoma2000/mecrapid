-- Fase 4: historial del vehículo y cambio de dueño
-- Cada tramo en que un cliente fue dueño del carro. endedAt null = dueño actual.
-- El historial de servicios sigue al carro; el dueño nuevo ve qué se le hizo y
-- cuándo, pero no el nombre ni los precios de los dueños anteriores.
CREATE TABLE IF NOT EXISTS "VehicleOwnership" (
  "id"         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vehicleId"  text NOT NULL REFERENCES "Vehicle"("id") ON DELETE CASCADE,
  "customerId" text NOT NULL REFERENCES "Customer"("id"),
  "startedAt"  timestamptz NOT NULL DEFAULT now(),
  "endedAt"    timestamptz,
  -- Quién registró el cambio de dueño y por qué (venta, traspaso familiar…)
  "createdById" text REFERENCES "user"("id") ON DELETE SET NULL,
  "note"       text,
  "createdAt"  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "VehicleOwnership_vehicleId_idx" ON "VehicleOwnership"("vehicleId");
CREATE UNIQUE INDEX IF NOT EXISTS "VehicleOwnership_one_current"
  ON "VehicleOwnership"("vehicleId") WHERE "endedAt" IS NULL;

-- Los vehículos que ya existen arrancan con su dueño actual desde que se registraron
INSERT INTO "VehicleOwnership" ("vehicleId", "customerId", "startedAt")
SELECT v."id", v."customerId", v."createdAt"
FROM "Vehicle" v
WHERE NOT EXISTS (SELECT 1 FROM "VehicleOwnership" o WHERE o."vehicleId" = v."id");
