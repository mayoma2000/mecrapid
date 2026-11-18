-- "Eliminar" clientes y vehículos sin perder historial: se marcan como eliminados
-- (dejan de aparecer en listas y no se les crean órdenes ni citas) y se pueden restaurar.
ALTER TABLE "Customer"
  ADD COLUMN IF NOT EXISTS "deletedAt"   timestamptz,
  ADD COLUMN IF NOT EXISTS "deletedById" text REFERENCES "user"("id") ON DELETE SET NULL;
ALTER TABLE "Vehicle"
  ADD COLUMN IF NOT EXISTS "deletedAt"   timestamptz,
  ADD COLUMN IF NOT EXISTS "deletedById" text REFERENCES "user"("id") ON DELETE SET NULL;
