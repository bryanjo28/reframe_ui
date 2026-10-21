
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

export type PaymentMethodOption = string | {
  code?: string;
  id?: string;
  method?: string;
  name?: string;
  label?: string;
};

export function paymentMethodCode(method: PaymentMethodOption): string {
  return typeof method === 'string'
    ? method.trim()
    : (method.code ?? method.method ?? method.id ?? '').trim();
}

export function isVirtualAccountMethod(method: PaymentMethodOption): boolean {
  const details = typeof method === 'string'
    ? method
    : `${method.code ?? ''} ${method.method ?? ''} ${method.id ?? ''} ${method.name ?? ''} ${method.label ?? ''}`;
  const normalized = details.toLowerCase();
  return /virtual[\s_-]?account/.test(normalized) || /(?:^|[_\s-])va(?:$|[_\s-])/.test(normalized);
}

export function getPreferredPaymentMethod(methods: PaymentMethodOption[]): string {
  const validMethods = methods.map(paymentMethodCode).filter(Boolean);
  return validMethods.find((method) => method.toLowerCase() === 'qris') ?? validMethods[0] ?? '';
}

export function hasPaymentMethod(methods: PaymentMethodOption[], selectedMethod: string): boolean {
  const selected = selectedMethod.trim().toLowerCase();
  return Boolean(selected && methods.some((method) => paymentMethodCode(method).toLowerCase() === selected));
}

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
