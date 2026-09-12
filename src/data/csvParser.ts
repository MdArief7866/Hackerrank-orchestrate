import type {
  Request,
  FinancialProfile,
  FinancialEvent,
  ExchangeRate,
  PaymentOption,
  Message,
  ImageRecord,
} from '@/types';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function parseAmount(val: string): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function parseList(val: string): string[] {
  if (!val) return [];
  return val.split(',').map((s) => s.trim()).filter(Boolean);
}

export function parseRequests(text: string): Request[] {
  return parseCSV(text).map((row) => ({
    request_id: row.request_id,
    user_id: row.user_id,
    request_date: row.request_date,
    requested_amount: parseAmount(row.requested_amount) ?? 0,
    currency: row.currency,
    merchant: row.merchant,
    category: row.category,
    desired_completion_date: row.desired_completion_date,
    minimum_balance_to_keep: parseAmount(row.minimum_balance_to_keep) ?? 0,
    payment_methods_user_will_consider: parseList(row.payment_methods_user_will_consider),
    allows_partial_payment: row.allows_partial_payment === 'true',
  }));
}

export function parseFinancialProfiles(text: string): FinancialProfile[] {
  return parseCSV(text).map((row) => ({
    user_id: row.user_id,
    base_currency: row.base_currency,
    monthly_income: parseAmount(row.monthly_income) ?? 0,
    monthly_expenses: parseAmount(row.monthly_expenses) ?? 0,
    current_balance: parseAmount(row.current_balance) ?? 0,
    account_type: row.account_type,
  }));
}

export function parseFinancialEvents(text: string): FinancialEvent[] {
  return parseCSV(text).map((row) => ({
    event_id: row.event_id,
    user_id: row.user_id,
    event_type: row.event_type,
    event_date: row.event_date,
    amount: parseAmount(row.amount),
    currency: row.currency,
    description: row.description,
    is_recurring: row.is_recurring === 'true',
    recurring_frequency: row.recurring_frequency || '',
    linked_event_id: row.linked_event_id || '',
    image_id: row.image_id || '',
    source: row.source || '',
    status: row.status || '',
  }));
}

export function parseExchangeRates(text: string): ExchangeRate[] {
  return parseCSV(text).map((row) => ({
    from_currency: row.from_currency,
    to_currency: row.to_currency,
    rate: parseAmount(row.rate) ?? 1,
    date: row.date,
  }));
}

export function parsePaymentOptions(text: string): PaymentOption[] {
  return parseCSV(text).map((row) => ({
    payment_option_id: row.payment_option_id,
    request_id: row.request_id,
    option_type: row.option_type,
    number_of_payments: parseInt(row.number_of_payments) || 1,
    payment_dates: parseList(row.payment_dates),
    amounts: parseList(row.amounts).map((a) => parseFloat(a) || 0),
    total_amount: parseAmount(row.total_amount) ?? 0,
    currency: row.currency,
  }));
}

export function parseMessages(text: string): Message[] {
  return parseCSV(text).map((row) => ({
    message_id: row.message_id,
    request_id: row.request_id,
    user_id: row.user_id,
    message_date: row.message_date,
    sender: row.sender,
    message_type: row.message_type,
    content: row.content,
    related_event_id: row.related_event_id || '',
    image_id: row.image_id || '',
  }));
}

export function parseImages(text: string): ImageRecord[] {
  return parseCSV(text).map((row) => ({
    image_id: row.image_id,
    request_id: row.request_id,
    event_id: row.event_id || '',
    user_id: row.user_id,
    image_date: row.image_date,
    image_type: row.image_type,
    extracted_amount: parseAmount(row.extracted_amount) ?? 0,
    extracted_currency: row.extracted_currency || '',
    description: row.description || '',
    ocr_confidence: parseAmount(row.ocr_confidence) ?? 0,
    source: row.source || '',
  }));
}

export { parseCSV };
