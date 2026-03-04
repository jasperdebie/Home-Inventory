export function formatStock(value: number): string {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function formatStockChange(change: number, productName: string, newStock: number): string {
  const direction = change > 0 ? '+' : '';
  return `${productName}: ${direction}${change} → ${formatStock(newStock)}`;
}
