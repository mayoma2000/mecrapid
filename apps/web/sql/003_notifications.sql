-- Fase 3: notificaciones push (Expo) + bandeja dentro de la app

-- Un usuario puede tener varios teléfonos; el token de Expo identifica cada uno
CREATE TABLE IF NOT EXISTS "PushToken" (
  "id"        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "token"     text NOT NULL UNIQUE,
  "platform"  text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "PushToken_userId_idx" ON "PushToken"("userId");

-- Bandeja: cada aviso queda guardado aunque el push no llegue (Android en Expo Go, permiso denegado…)
-- url: ruta de la app a la que lleva el aviso al tocarlo
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId"    text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "type"      text NOT NULL,
  "title"     text NOT NULL,
  "body"      text NOT NULL,
  "url"       text,
  "readAt"    timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Notification_user_created_idx" ON "Notification"("userId", "createdAt" DESC);

-- Recordatorio del día anterior: se marca para no mandarlo dos veces
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "reminderSentAt" timestamptz;
