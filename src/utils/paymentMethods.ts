
const METHOD_LABELS: Record<string, string> = {
  qris: 'QRIS',
  bri_va: 'BRI Virtual Account',
  bni_va: 'BNI Virtual Account',
  cimb_niaga_va: 'CIMB Niaga Virtual Account',
  danamon_va: 'Danamon Virtual Account',
  maybank_va: 'Maybank Virtual Account',
  bnc_va: 'BNC Virtual Account',
  bsi_va: 'BSI Virtual Account',
  muamalat_va: 'Bank Muamalat Virtual Account',
  ocbc_va: 'OCBC Virtual Account',
};

export function paymentMethodLabel(method: unknown): string {
  if (typeof method !== 'string' || !method.trim()) {
    return 'Metode pembayaran';
  }

  const normalized = method.trim().toLowerCase();

  return (
    METHOD_LABELS[normalized] ??
    normalized
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}
