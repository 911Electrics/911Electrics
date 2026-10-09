/** `747-255-8595` -> `tel:+17472558595` */
export const telHref = (phone: string): string => {
  const digits = phone.replace(/\D/g, '')
  return `tel:+${digits.length === 10 ? `1${digits}` : digits}`
}
