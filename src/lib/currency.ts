/**
 * VentureMind Currency Utilities — Indian Rupee (INR)
 *
 * All financial values stored in the database are raw numbers without a
 * currency tag. VentureMind targets Indian entrepreneurs, so INR is the
 * default display currency. These helpers produce consistent Indian-locale
 * formatting (e.g. ₹1,00,000 / ₹25,000) everywhere in the UI.
 *
 * IMPORTANT: Do NOT silently convert historical amounts from USD→INR.
 * If the stored currency is ambiguous, display the raw number with the ₹
 * symbol — the stored numeric value is preserved as-is.
 */

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0, // whole rupees — financial inputs don't need paise
})

const INR_COMPACT_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/**
 * Format a number as Indian Rupees with full Indian number grouping.
 * e.g. formatINR(100000) → "₹1,00,000"
 *      formatINR(25000)  → "₹25,000"
 */
export function formatINR(value: number): string {
  return INR_FORMATTER.format(value)
}

/**
 * Compact rupee display for KPI cards and summaries where space is limited.
 * e.g. formatINRCompact(1000000) → "₹10L" / "₹1M"
 */
export function formatINRCompact(value: number): string {
  return INR_COMPACT_FORMATTER.format(value)
}

/**
 * Format a raw number with Indian grouping but NO currency symbol.
 * Useful for <input> value display or when the ₹ is already shown separately.
 * e.g. formatINRNumber(100000) → "1,00,000"
 */
export function formatINRNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value)
}

/**
 * Safe formatter — returns a formatted string or a fallback when the value
 * is null / undefined / NaN. Never silently shows ₹0 for missing data.
 *
 * @param value   The numeric amount to format.
 * @param fallback Text to display when value is absent (default: "Not specified")
 */
export function formatINRSafe(
  value: number | null | undefined,
  fallback = 'Not specified'
): string {
  if (value === null || value === undefined || isNaN(value as number)) {
    return fallback
  }
  return formatINR(value)
}

/** The ISO currency code used throughout the app. */
export const APP_CURRENCY = 'INR' as const

/** The Unicode currency symbol for inline use. */
export const CURRENCY_SYMBOL = '₹' as const

/** Human-readable label for form fields, e.g. "Capital (₹ INR)" */
export const CURRENCY_LABEL = 'INR (₹)' as const
