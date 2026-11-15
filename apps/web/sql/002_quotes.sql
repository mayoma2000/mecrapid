-- Fase 2: cotización digital con aprobación del cliente partida por partida

-- Precio sugerido del servicio para agregarlo rápido a una cotización
ALTER TABLE "ServiceType" ADD COLUMN IF NOT EXISTS "price" double precision;

-- Una orden puede tener varias cotizaciones (la inicial + trabajos extra que aparezcan)
-- status: draft → sent → approved | partially_approved | rejected
CREATE TABLE IF NOT EXISTS "Quote" (
  "id"            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "workOrderId"   text NOT NULL REFERENCES "WorkOrder"("id") ON DELETE CASCADE,
  "status"        text NOT NULL DEFAULT 'draft',
  "notes"         text,
  "taxRate"       double precision NOT NULL DEFAULT 0.15,
  "createdById"   text REFERENCES "user"("id") ON DELETE SET NULL,
  "sentAt"        timestamptz,
  "respondedAt"   timestamptz,
  "respondedById" text REFERENCES "user"("id") ON DELETE SET NULL,
  -- 'app' = el cliente respondió desde la app; 'staff' = el taller registró la respuesta (p. ej. por teléfono)
  "respondedVia"  text,
  "responseNote"  text,
  "createdAt"     timestamptz NOT NULL DEFAULT now(),
  "updatedAt"     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Quote_workOrderId_idx" ON "Quote"("workOrderId");

-- kind: service | part · priority: urgent 🔴 | recommended 🟡 | optional 🟢 · decision: pending | approved | rejected
CREATE TABLE IF NOT EXISTS "QuoteItem" (
  "id"          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "quoteId"     text NOT NULL REFERENCES "Quote"("id") ON DELETE CASCADE,
  "position"    integer NOT NULL DEFAULT 0,
  "kind"        text NOT NULL DEFAULT 'service',
  "description" text NOT NULL,
  "quantity"    double precision NOT NULL DEFAULT 1,
  "unitPrice"   double precision NOT NULL DEFAULT 0,
  "priority"    text NOT NULL DEFAULT 'recommended',
  "sparePartId" text REFERENCES "SparePart"("id") ON DELETE SET NULL,
  "decision"    text NOT NULL DEFAULT 'pending',
  "decidedAt"   timestamptz,
  "createdAt"   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- Trabajo autorizado: cada partida aprobada se copia a la orden y recuerda de qué partida vino
ALTER TABLE "ServiceLineItem" ADD COLUMN IF NOT EXISTS "quoteItemId" text REFERENCES "QuoteItem"("id") ON DELETE SET NULL;
ALTER TABLE "PartLineItem"    ADD COLUMN IF NOT EXISTS "quoteItemId" text REFERENCES "QuoteItem"("id") ON DELETE SET NULL;

-- Repuestos pueden ir en fracciones (p. ej. 4.5 litros de aceite). La tabla estaba vacía.
ALTER TABLE "PartLineItem" ALTER COLUMN "quantity" TYPE double precision;
