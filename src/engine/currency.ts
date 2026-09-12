import type { ExchangeRate } from '@/types';

export class CurrencyConverter {
  private rates: Map<string, number> = new Map();

  constructor(rates: ExchangeRate[]) {
    for (const r of rates) {
      const key = `${r.from_currency}->${r.to_currency}`;
      this.rates.set(key, r.rate);
    }
  }

  convert(amount: number, from: string, to: string): number {
    if (from === to) return amount;
    const key = `${from}->${to}`;
    const rate = this.rates.get(key);
    if (rate === undefined) {
      const reverseKey = `${to}->${from}`;
      const reverseRate = this.rates.get(reverseKey);
      if (reverseRate !== undefined) {
        return amount / reverseRate;
      }
      throw new Error(`No exchange rate from ${from} to ${to}`);
    }
    return amount * rate;
  }
}
