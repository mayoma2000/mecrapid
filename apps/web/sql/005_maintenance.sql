-- Fase 5: recordatorios de mantenimiento ("cambio de aceite cada 5,000 km o 3 meses")

-- Catálogo de mantenimientos preventivos que el taller quiere recordar.
-- keywords: palabras que, si aparecen en un servicio o repuesto autorizado de una orden
-- completada, cuentan como "se hizo" (ej. "aceite" detecta "Cambio de aceite 10W-30").
CREATE TABLE IF NOT EXISTS "MaintenanceRule" (
  "id"             text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"           text NOT NULL,
  "keywords"       text NOT NULL,
  "intervalKm"     integer,
  "intervalMonths" integer,
  "active"         boolean NOT NULL DEFAULT true,
  "createdAt"      timestamptz NOT NULL DEFAULT now(),
  CHECK ("intervalKm" IS NOT NULL OR "intervalMonths" IS NOT NULL)
);

-- Registro de recordatorios enviados: uno por vehículo + regla + ciclo + nivel, para no repetir.
-- cycleKey = id de la última orden donde se hizo (o 'never'); level = 'soon' | 'due'
CREATE TABLE IF NOT EXISTS "MaintenanceReminder" (
  "id"        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vehicleId" text NOT NULL REFERENCES "Vehicle"("id") ON DELETE CASCADE,
  "ruleId"    text NOT NULL REFERENCES "MaintenanceRule"("id") ON DELETE CASCADE,
  "cycleKey"  text NOT NULL,
  "level"     text NOT NULL,
  "sentAt"    timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("vehicleId", "ruleId", "cycleKey", "level")
);

-- Valores iniciales típicos (el admin los ajusta desde el backoffice)
INSERT INTO "MaintenanceRule" ("name", "keywords", "intervalKm", "intervalMonths")
SELECT * FROM (VALUES
  ('Cambio de aceite',        'aceite',                     5000,  3),
  ('Rotación de llantas',     'rotación,rotacion',         10000,  6),
  ('Alineación y balanceo',   'alineación,alineacion,balanceo', 10000, 6),
  ('Revisión de frenos',      'freno,pastilla',            20000, 12),
  ('Filtro de aire',          'filtro de aire',            15000, 12)
) AS v("name", "keywords", "intervalKm", "intervalMonths")
WHERE NOT EXISTS (SELECT 1 FROM "MaintenanceRule");
