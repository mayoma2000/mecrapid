// Link de WhatsApp con el mensaje ya escrito (wa.me). Abre el chat con el cliente;
// el taller solo toca "enviar". Números de Honduras de 8 dígitos llevan el 504 delante.
export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (digits.length < 8) return null
  const full = digits.length === 8 ? `504${digits}` : digits
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

export const waMessages = {
  quoteReady: (name: string, vehicle: string, total: string) =>
    `Hola ${firstName(name)}, le saluda MecRapid. Su cotización para ${vehicle} está lista (total ${total}). ` +
    'Puede revisarla y aprobar cada trabajo desde la app MecRapid. ¡Quedamos atentos!',
  orderReady: (name: string, vehicle: string) =>
    `Hola ${firstName(name)}, le saluda MecRapid. ¡${vehicle} ya está listo! Puede pasar a recogerlo cuando guste.`,
  orderUpdate: (name: string, vehicle: string) =>
    `Hola ${firstName(name)}, le saluda MecRapid sobre ${vehicle}. `,
}
