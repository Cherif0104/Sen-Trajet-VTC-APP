export function computeTotals(items: { quantity: number; unitPrice: number }[], taxRate: number) {
  const subtotal = Math.round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const taxAmount = Math.round((subtotal * taxRate) / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}
