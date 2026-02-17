export function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

export function formatPercent(n: number): string {
  return n.toFixed(2) + "%";
}
