// Currency helpers. Intl.NumberFormat does all the symbol/locale work — no FX
// conversion: a personal-finance app stores amounts in the user's own currency.

export const CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "THB", label: "Thai Baht", symbol: "฿" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "KRW", label: "South Korean Won", symbol: "₩" },
] as const;

// ponytail: Intl handles symbol placement + decimals per currency (JPY/KRW have 0).
export function formatCurrency(amount: number, currency = "USD", locale?: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    // Unknown/invalid currency code → plain number + code suffix.
    return `${amount.toLocaleString(locale)} ${currency}`;
  }
}
