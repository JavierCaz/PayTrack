export function formatCurrency(amount: number, fractionDigits: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return formatCurrency(amount);
}

function maskDigits(value: string): string {
  return value.replace(/\d/g, '•');
}

export function maskCurrency(amount: number, fractionDigits: number = 2): string {
  return maskDigits(formatCurrency(amount, fractionDigits));
}

export function maskNumber(value: number | string): string {
  const digits = String(value).replace(/\D/g, '');
  return '•'.repeat(Math.max(digits.length, 1));
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}
