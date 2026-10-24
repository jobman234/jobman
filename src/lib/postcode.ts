// UK-style postcode support (e.g. "ED9 1AA"): an outward code (1-2 letters,
// 1-2 digits, optional trailing letter) + a space + an inward code (1 digit,
// 2 letters). Total length is 6-8 characters including the space.
const UK_POSTCODE_REGEX = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/;

export function normalizePostcode(value: string): string {
  return value.toUpperCase().replace(/\s+/g, "").trim();
}

// Inserts the standard single space before the 3-character inward code
// so stored/displayed values always read like "ED9 1AA".
export function formatPostcode(value: string): string {
  const compact = normalizePostcode(value);
  if (compact.length < 5) return compact;
  return `${compact.slice(0, -3)} ${compact.slice(-3)}`;
}

export function isValidPostcode(value: string): boolean {
  const formatted = formatPostcode(value);
  return UK_POSTCODE_REGEX.test(formatted) && formatted.length >= 6 && formatted.length <= 8;
}

export const POSTCODE_PLACEHOLDER = "e.g. ED9 1AA";
