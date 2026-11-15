import { connection } from 'next/server'
import { notFound, redirect } from 'next/navigation'
import { db } from '@/src/prisma/db'

// Atajo /quotes/:id → la cotización dentro de su orden (lo usan los avisos y enlaces cortos)
export default async function QuoteRedirect({ params }: { params: Promise<{ id: string }> }) {
  await connection()
  const { id } = await params
  const quote = await db.orm.public.Quote.first({ id })
  if (!quote) notFound()
  redirect(`/work-orders/${quote.workOrderId}/quotes/${id}`)
}
