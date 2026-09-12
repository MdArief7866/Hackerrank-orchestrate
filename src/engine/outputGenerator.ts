import type { DecisionResult } from '@/types';

export function generateOutputCSV(results: DecisionResult[]): string {
  const headers = [
    'request_id',
    'amount_safe_to_pay',
    'affordability_status',
    'recommended_payment_method',
    'payment_plan',
    'earliest_date_for_full_payment',
    'spending_changes_needed',
    'decision_explanation',
  ];

  const lines = [headers.join(',')];

  for (const r of results) {
    const row = [
      r.request_id,
      r.amount_safe_to_pay.toFixed(2),
      r.affordability_status,
      r.recommended_payment_method,
      `"${r.payment_plan}"`,
      r.earliest_date_for_full_payment,
      `"${r.spending_changes_needed}"`,
      `"${r.decision_explanation.replace(/"/g, '""')}"`,
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n') + '\n';
}
