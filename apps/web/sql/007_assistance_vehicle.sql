-- La solicitud de asistencia guarda para qué vehículo es (opcional: en una emergencia
-- el cliente puede decir "es otro carro" y el taller lo asigna en la orden)
ALTER TABLE "AssistanceRequest"
  ADD COLUMN IF NOT EXISTS "vehicleId" text REFERENCES "Vehicle"("id") ON DELETE SET NULL;
