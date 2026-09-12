import type { AffordabilityStatus, PaymentMethod } from '@/types';

export function formatCurrency(amount: number, currency: string): string {
  const symbols: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
  const symbol = symbols[currency] || '';
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function statusColor(status: AffordabilityStatus): string {
  switch (status) {
    case 'affordable_now':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'affordable_with_plan':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'affordable_later':
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
    case 'not_affordable':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  }
}

export function statusLabel(status: AffordabilityStatus): string {
  return status.replace(/_/g, ' ');
}

export function methodColor(method: PaymentMethod): string {
  switch (method) {
    case 'full_payment':
      return 'bg-emerald-500/15 text-emerald-400';
    case 'partial_payment':
      return 'bg-amber-500/15 text-amber-400';
    case 'installments':
      return 'bg-violet-500/15 text-violet-400';
    case 'wait':
      return 'bg-sky-500/15 text-sky-400';
    case 'not_recommended':
      return 'bg-rose-500/15 text-rose-400';
  }
}

export function methodLabel(method: PaymentMethod): string {
  return method.replace(/_/g, ' ');
}

export function parsePaymentPlan(planStr: string): { date: string; amount: number }[] {
  if (!planStr) return [];
  return planStr.split('|').map((entry) => {
    const [date, amount] = entry.split(':');
    return { date, amount: parseFloat(amount) };
  });
}

export function parseSpendingChanges(changesStr: string): { type: string; event_id: string; new_amount?: number }[] {
  if (!changesStr || changesStr === 'none') return [];
  return changesStr.split('|').map((entry) => {
    if (entry.startsWith('stop:')) {
      return { type: 'stop', event_id: entry.substring(5) };
    }
    const parts = entry.split(':');
    return { type: 'reduce_to', event_id: parts[1], new_amount: parseFloat(parts[2]) };
  });
}

export function statusGradient(status: AffordabilityStatus): string {
  switch (status) {
    case 'affordable_now':
      return 'from-emerald-500 to-teal-400';
    case 'affordable_with_plan':
      return 'from-amber-500 to-orange-400';
    case 'affordable_later':
      return 'from-sky-500 to-blue-400';
    case 'not_affordable':
      return 'from-rose-500 to-pink-400';
  }
}

export function statusHex(status: AffordabilityStatus): string {
  switch (status) {
    case 'affordable_now':
      return '#10b981';
    case 'affordable_with_plan':
      return '#f59e0b';
    case 'affordable_later':
      return '#0ea5e9';
    case 'not_affordable':
      return '#f43f5e';
  }
}
