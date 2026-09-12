import type {
  FinancialProfile,
  FinancialEvent,
  ExchangeRate,
  PaymentPlanEntry,
} from '@/types';
import { CurrencyConverter } from './currency';
import {
  parseDate,
  addDays,
  formatDate,
  isSameOrBefore,
  isSameOrAfter,
  isBefore,
  dateDiffDays,
} from './dateUtils';

export interface ForecastContext {
  profile: FinancialProfile;
  events: FinancialEvent[];
  converter: CurrencyConverter;
  startDate: Date;
  endDate: Date;
  minimumBalance: number;
  baseCurrency: string;
}

export interface ForecastResult {
  dailyBalances: { date: string; balance: number }[];
  minBalance: number;
  minBalanceDate: string;
  neverBelowMinimum: boolean;
}

export function buildForecast(
  ctx: ForecastContext,
  plannedPayments: PaymentPlanEntry[] = [],
  spendingChanges: { event_id: string; new_amount: number | null }[] = []
): ForecastResult {
  const { profile, events, converter, startDate, endDate, minimumBalance, baseCurrency } = ctx;

  const allEvents = [...events];

  for (const sc of spendingChanges) {
    const idx = allEvents.findIndex((e) => e.event_id === sc.event_id);
    if (idx >= 0) {
      if (sc.new_amount === null) {
        allEvents.splice(idx, 1);
      } else {
        allEvents[idx] = { ...allEvents[idx], amount: sc.new_amount };
      }
    }
  }

  const confirmedEvents = allEvents.filter(
    (e) =>
      e.status === 'confirmed' &&
      isSameOrAfter(parseDate(e.event_date), startDate) &&
      isSameOrBefore(parseDate(e.event_date), endDate)
  );

  const dailyEvents: Map<string, { amount: number; desc: string }[]> = new Map();

  for (const evt of confirmedEvents) {
    const date = parseDate(evt.event_date);
    const dateKey = formatDate(date);
    if (!dailyEvents.has(dateKey)) dailyEvents.set(dateKey, []);
    const amount = evt.amount ?? 0;
    const converted = converter.convert(amount, evt.currency, baseCurrency);
    const signed = evt.event_type === 'income' ? converted : -converted;
    dailyEvents.get(dateKey)!.push({ amount: signed, desc: evt.description });
  }

  for (const payment of plannedPayments) {
    const dateKey = payment.date;
    if (!dailyEvents.has(dateKey)) dailyEvents.set(dateKey, []);
    dailyEvents.get(dateKey)!.push({ amount: -payment.amount, desc: 'Planned payment' });
  }

  const dailyBalances: { date: string; balance: number }[] = [];
  let balance = profile.current_balance;
  let minBalance = balance;
  let minBalanceDate = formatDate(startDate);

  const current = new Date(startDate);
  while (isSameOrBefore(current, endDate)) {
    const dateKey = formatDate(current);
    const dayEvents = dailyEvents.get(dateKey) || [];
    for (const evt of dayEvents) {
      balance += evt.amount;
    }
    dailyBalances.push({ date: dateKey, balance: balance });
    if (balance < minBalance) {
      minBalance = balance;
      minBalanceDate = dateKey;
    }
    current.setDate(current.getDate() + 1);
  }

  return {
    dailyBalances,
    minBalance,
    minBalanceDate,
    neverBelowMinimum: minBalance >= minimumBalance,
  };
}

export function checkSafety(
  ctx: ForecastContext,
  plannedPayments: PaymentPlanEntry[] = [],
  spendingChanges: { event_id: string; new_amount: number | null }[] = []
): boolean {
  const result = buildForecast(ctx, plannedPayments, spendingChanges);
  return result.neverBelowMinimum;
}
