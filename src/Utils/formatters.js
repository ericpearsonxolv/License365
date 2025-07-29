// Currency: always "$1,234" (whole dollars, no cents)
export function formatCurrency(num) {
  return typeof num === "number"
    ? `$${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : "$0";
}

// Large numbers: "1,234" or "0"
export function formatNumber(num) {
  return typeof num === "number" ? num.toLocaleString() : "0";
}

// Dates: "MM/DD/YYYY" (US), fallback to "—"
export function formatDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString();
}