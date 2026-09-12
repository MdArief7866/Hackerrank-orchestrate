import { describe, it, expect } from 'vitest';
import { loadDatasetSync } from '@/data/dataset';
import { runAllDecisions } from '@/engine/decisionEngine';
import { generateOutputCSV } from '@/engine/outputGenerator';
import { CurrencyConverter } from '@/engine/currency';
import { parseDate, addDays, formatDate } from '@/engine/dateUtils';
import { buildForecast, type ForecastContext } from '@/engine/forecast';
import { parseCSV } from '@/data/csvParser';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(process.cwd());

function readDataset(name: string): string {
  return readFileSync(join(root, 'dataset', name), 'utf-8');
}

const texts = {
  requests: readDataset('requests.csv'),
  profiles: readDataset('financial_profiles.csv'),
  events: readDataset('financial_events.csv'),
  exchangeRates: readDataset('exchange_rates.csv'),
  paymentOptions: readDataset('request_payment_options.csv'),
  messages: readDataset('messages.csv'),
  images: readDataset('images.csv'),
};

const dataset = loadDatasetSync(texts);
const decisions = runAllDecisions(
  dataset.requests,
  dataset.profiles,
  dataset.events,
  dataset.exchangeRates,
  dataset.paymentOptions,
  dataset.messages,
  dataset.images
);

describe('CSV Parser', () => {
  it('parses requests correctly', () => {
    expect(dataset.requests.length).toBeGreaterThan(0);
    expect(dataset.requests[0].request_id).toBe('REQ001');
    expect(dataset.requests[0].requested_amount).toBe(500);
    expect(dataset.requests[0].allows_partial_payment).toBe(true);
  });

  it('parses financial events with blank amounts', () => {
    const evt054 = dataset.events.find((e) => e.event_id === 'EVT054');
    expect(evt054).toBeDefined();
    expect(evt054!.amount).toBeNull();
  });

  it('parses payment options with comma-separated values', () => {
    const opt = dataset.paymentOptions.find((o) => o.payment_option_id === 'PO002');
    expect(opt).toBeDefined();
    expect(opt!.number_of_payments).toBe(3);
    expect(opt!.payment_dates.length).toBe(3);
    expect(opt!.amounts.length).toBe(3);
  });
});

describe('Currency Converter', () => {
  it('converts USD to EUR', () => {
    const converter = new CurrencyConverter(dataset.exchangeRates);
    const result = converter.convert(100, 'USD', 'EUR');
    expect(result).toBeCloseTo(92, 1);
  });

  it('returns 1 for same currency', () => {
    const converter = new CurrencyConverter(dataset.exchangeRates);
    expect(converter.convert(100, 'USD', 'USD')).toBe(100);
  });
});

describe('Date Utils', () => {
  it('parses dates correctly', () => {
    const d = parseDate('2025-01-15');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  it('adds days correctly', () => {
    const d = parseDate('2025-01-01');
    const result = addDays(d, 90);
    expect(formatDate(result)).toBe('2025-04-01');
  });
});

describe('Forecast', () => {
  it('builds a 90-day forecast', () => {
    const req = dataset.requests[0];
    const profile = dataset.profiles.find((p) => p.user_id === req.user_id)!;
    const converter = new CurrencyConverter(dataset.exchangeRates);
    const requestDate = parseDate(req.request_date);
    const forecastEnd = addDays(requestDate, 90);
    const events = dataset.events.filter(
      (e) => e.user_id === req.user_id && parseDate(e.event_date) >= requestDate && parseDate(e.event_date) <= forecastEnd
    );
    const ctx: ForecastContext = {
      profile,
      events,
      converter,
      startDate: requestDate,
      endDate: forecastEnd,
      minimumBalance: req.minimum_balance_to_keep,
      baseCurrency: profile.base_currency,
    };
    const result = buildForecast(ctx, [], []);
    expect(result.dailyBalances.length).toBe(91);
    expect(result.minBalance).toBeDefined();
  });
});

describe('Decision Engine', () => {
  it('generates a decision for every request', () => {
    expect(decisions.length).toBe(dataset.requests.length);
  });

  it('produces valid statuses', () => {
    const validStatuses = ['affordable_now', 'affordable_with_plan', 'affordable_later', 'not_affordable'];
    for (const d of decisions) {
      expect(validStatuses).toContain(d.affordability_status);
    }
  });

  it('produces valid payment methods', () => {
    const validMethods = ['full_payment', 'partial_payment', 'installments', 'wait', 'not_recommended'];
    for (const d of decisions) {
      expect(validMethods).toContain(d.recommended_payment_method);
    }
  });

  it('keeps amount_safe_to_pay within bounds', () => {
    for (const d of decisions) {
      expect(d.amount_safe_to_pay).toBeGreaterThanOrEqual(0);
      const req = dataset.requests.find((r) => r.request_id === d.request_id)!;
      expect(d.amount_safe_to_pay).toBeLessThanOrEqual(req.requested_amount);
    }
  });

  it('sets earliest_date = request_date for affordable_now', () => {
    for (const d of decisions) {
      if (d.affordability_status === 'affordable_now') {
        const req = dataset.requests.find((r) => r.request_id === d.request_id)!;
        expect(d.earliest_date_for_full_payment).toBe(req.request_date);
      }
    }
  });

  it('resolves blank event amounts from linked images', () => {
    const evt054 = dataset.events.find((e) => e.event_id === 'EVT054');
    expect(evt054!.amount).toBeNull();
    const img = dataset.images.find((i) => i.image_id === 'IMG001');
    expect(img).toBeDefined();
    expect(img!.extracted_amount).toBe(250);
  });
});

describe('Output CSV', () => {
  it('generates valid CSV with correct headers', () => {
    const csv = generateOutputCSV(decisions);
    const lines = csv.trim().split('\n');
    const headers = lines[0].split(',');
    expect(headers).toEqual([
      'request_id',
      'amount_safe_to_pay',
      'affordability_status',
      'recommended_payment_method',
      'payment_plan',
      'earliest_date_for_full_payment',
      'spending_changes_needed',
      'decision_explanation',
    ]);
    expect(lines.length).toBe(dataset.requests.length + 1);
  });
});
