// Чисто presentational-маскировка телефона для UI (пример из макета:
// "+998 ** *** ** 42") — не претендует на строгий формат для любой страны,
// только скрывает середину номера. Backend остаётся единственным
// authoritative-валидатором формата (E.164) — здесь никакой валидации нет.
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 8) return phone
  const prefix = phone.slice(0, 4)
  const last2 = phone.slice(-2)
  return `${prefix} ** *** ** ${last2}`
}
