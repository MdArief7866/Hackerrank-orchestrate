import type {
  Request,
  FinancialProfile,
  FinancialEvent,
  ExchangeRate,
  PaymentOption,
  Message,
  ImageRecord,
  DecisionResult,
  PaymentMethod,
  AffordabilityStatus,
  PaymentPlanEntry,
  SpendingChange,
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
import { buildForecast, checkSafety, type ForecastContext } from './forecast';

interface EngineInput {
  request: Request;
  profile: FinancialProfile;
  events: FinancialEvent[];
  exchangeRates: ExchangeRate[];
  paymentOptions: PaymentOption[];
  messages: Message[];
  images: ImageRecord[];
}

interface FlexibleExpense {
  event_id: string;
  amount: number;
  description: string;
}

function resolveEventAmounts(
  events: FinancialEvent[],
  images: ImageRecord[]
): FinancialEvent[] {
  const imageMap = new Map(images.map((i) => [i.image_id, i]));
  return events.map((evt) => {
    if (evt.amount === null || evt.amount === 0) {
      if (evt.image_id) {
        const img = imageMap.get(evt.image_id);
        if (img && img.extracted_amount > 0) {
          return { ...evt, amount: img.extracted_amount, currency: img.extracted_currency || evt.currency };
        }
      }
      if (evt.linked_event_id) {
        const linked = events.find((e) => e.event_id === evt.linked_event_id);
        if (linked && linked.amount !== null && linked.amount > 0) {
          return { ...evt, amount: linked.amount };
        }
      }
    }
    return evt;
  });
}

function getRelevantEvents(events: FinancialEvent[], userId: string, startDate: Date, endDate: Date): FinancialEvent[] {
  return events.filter(
    (e) =>
      e.user_id === userId &&
      isSameOrAfter(parseDate(e.event_date), startDate) &&
      isSameOrBefore(parseDate(e.event_date), endDate)
  );
}

function getFlexibleExpenses(events: FinancialEvent[], userId: string): FlexibleExpense[] {
  const flexibleKeywords = ['gym', 'streaming', 'dining', 'coffee', 'netflix', 'sky', 'starbucks', 'restaurants'];
  return events
    .filter(
      (e) =>
        e.user_id === userId &&
        e.event_type === 'expense' &&
        e.is_recurring &&
        e.status === 'confirmed' &&
        flexibleKeywords.some((kw) => e.description.toLowerCase().includes(kw))
    )
    .map((e) => ({
      event_id: e.event_id,
      amount: e.amount ?? 0,
      description: e.description,
    }));
}

function convertToBase(amount: number, fromCurrency: string, baseCurrency: string, converter: CurrencyConverter): number {
  return converter.convert(amount, fromCurrency, baseCurrency);
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

function formatPaymentPlan(payments: PaymentPlanEntry[]): string {
  return payments.map((p) => `${p.date}:${p.amount.toFixed(2)}`).join('|');
}

function formatSpendingChanges(changes: SpendingChange[]): string {
  if (changes.length === 0) return 'none';
  return changes
    .map((c) =>
      c.type === 'stop' ? `stop:${c.event_id}` : `reduce_to:${c.event_id}:${c.new_amount!.toFixed(2)}`
    )
    .join('|');
}

export function makeDecision(input: EngineInput): DecisionResult {
  const { request, profile, events: rawEvents, exchangeRates, paymentOptions, messages, images } = input;

  const converter = new CurrencyConverter(exchangeRates);
  const events = resolveEventAmounts(rawEvents, images);

  const requestDate = parseDate(request.request_date);
  const forecastEnd = addDays(requestDate, 90);
  const desiredCompletionDate = parseDate(request.desired_completion_date);
  const baseCurrency = profile.base_currency;

  const requestedAmountBase = convertToBase(request.requested_amount, request.currency, baseCurrency, converter);
  const minBalance = request.minimum_balance_to_keep;

  const relevantEvents = getRelevantEvents(events, request.user_id, requestDate, forecastEnd);

  const forecastCtx: ForecastContext = {
    profile,
    events: relevantEvents,
    converter,
    startDate: requestDate,
    endDate: forecastEnd,
    minimumBalance: minBalance,
    baseCurrency,
  };

  const flexibleExpenses = getFlexibleExpenses(events, request.user_id);

  const noPaymentForecast = buildForecast(forecastCtx, [], []);
  const availableToday = noPaymentForecast.minBalance - minBalance;
  const safeToday = Math.max(0, Math.min(requestedAmountBase, availableToday));

  const userMethods = request.payment_methods_user_will_consider;

  const fullPaymentToday: PaymentPlanEntry[] = [
    { date: request.request_date, amount: requestedAmountBase },
  ];
  const canPayFullToday = checkSafety(forecastCtx, fullPaymentToday, []);

  let amountSafeToPay = round2(safeToday);
  let affordabilityStatus: AffordabilityStatus;
  let recommendedMethod: PaymentMethod;
  let paymentPlan: PaymentPlanEntry[] = [];
  let earliestDateForFullPayment = '';
  let spendingChanges: SpendingChange[] = [];

  if (canPayFullToday && userMethods.includes('full_payment')) {
    affordabilityStatus = 'affordable_now';
    recommendedMethod = 'full_payment';
    paymentPlan = fullPaymentToday;
    earliestDateForFullPayment = request.request_date;
    amountSafeToPay = round2(requestedAmountBase);
  } else {
    const earliestDate = findEarliestFullPaymentDate(
      forecastCtx,
      requestedAmountBase,
      requestDate,
      forecastEnd
    );

    const canCompleteByDeadline =
      earliestDate !== null && isSameOrBefore(earliestDate, desiredCompletionDate);

    if (canPayFullToday && !userMethods.includes('full_payment') && userMethods.includes('installments')) {
      const installmentOptions = paymentOptions.filter(
        (o) => o.request_id === request.request_id && o.option_type === 'installments'
      );
      if (installmentOptions.length > 0) {
        const bestInstallment = findBestInstallment(
          installmentOptions,
          forecastCtx,
          converter,
          baseCurrency,
          request,
          desiredCompletionDate
        );
        if (bestInstallment) {
          affordabilityStatus = 'affordable_now';
          recommendedMethod = 'installments';
          paymentPlan = bestInstallment.payments;
          earliestDateForFullPayment = request.request_date;
          amountSafeToPay = round2(requestedAmountBase);
        } else {
          affordabilityStatus = 'affordable_later';
          recommendedMethod = 'wait';
          earliestDateForFullPayment = earliestDate ? formatDate(earliestDate) : '';
          paymentPlan = [];
          amountSafeToPay = 0;
        }
      } else {
        affordabilityStatus = 'affordable_later';
        recommendedMethod = 'wait';
        earliestDateForFullPayment = earliestDate ? formatDate(earliestDate) : '';
        paymentPlan = [];
        amountSafeToPay = 0;
      }
    } else if (
      canCompleteByDeadline &&
      request.allows_partial_payment &&
      userMethods.includes('partial_payment') &&
      safeToday > 0 &&
      safeToday < requestedAmountBase
    ) {
      affordabilityStatus = 'affordable_with_plan';
      recommendedMethod = 'partial_payment';
      paymentPlan = [
        { date: request.request_date, amount: round2(safeToday) },
        { date: formatDate(earliestDate!), amount: round2(requestedAmountBase - safeToday) },
      ];
      earliestDateForFullPayment = formatDate(earliestDate!);
      amountSafeToPay = round2(safeToday);
    } else if (canCompleteByDeadline && userMethods.includes('installments')) {
      const installmentOptions = paymentOptions.filter(
        (o) => o.request_id === request.request_id && o.option_type === 'installments'
      );

      const bestInstallment = findBestInstallment(
        installmentOptions,
        forecastCtx,
        converter,
        baseCurrency,
        request,
        desiredCompletionDate
      );

      if (bestInstallment) {
        affordabilityStatus = 'affordable_with_plan';
        recommendedMethod = 'installments';
        paymentPlan = bestInstallment.payments;
        earliestDateForFullPayment = bestInstallment.lastPaymentDate;
        amountSafeToPay = round2(bestInstallment.firstPaymentAmount);
      } else {
        const changesResult = tryWithSpendingChanges(
          forecastCtx,
          requestedAmountBase,
          requestDate,
          forecastEnd,
          desiredCompletionDate,
          flexibleExpenses,
          userMethods,
          paymentOptions,
          converter,
          baseCurrency,
          request
        );
        if (changesResult) {
          affordabilityStatus = changesResult.status;
          recommendedMethod = changesResult.method;
          paymentPlan = changesResult.paymentPlan;
          earliestDateForFullPayment = changesResult.earliestDate;
          spendingChanges = changesResult.spendingChanges;
          amountSafeToPay = changesResult.amountSafeToPay;
        } else {
          affordabilityStatus = 'affordable_later';
          recommendedMethod = 'wait';
          earliestDateForFullPayment = earliestDate ? formatDate(earliestDate) : '';
          paymentPlan = [];
          amountSafeToPay = 0;
        }
      }
    } else if (canCompleteByDeadline && userMethods.includes('wait')) {
      affordabilityStatus = 'affordable_later';
      recommendedMethod = 'wait';
      earliestDateForFullPayment = earliestDate ? formatDate(earliestDate) : '';
      paymentPlan = [];
      amountSafeToPay = 0;
    } else {
      const changesResult = tryWithSpendingChanges(
        forecastCtx,
        requestedAmountBase,
        requestDate,
        forecastEnd,
        desiredCompletionDate,
        flexibleExpenses,
        userMethods,
        paymentOptions,
        converter,
        baseCurrency,
        request
      );
      if (changesResult) {
        affordabilityStatus = changesResult.status;
        recommendedMethod = changesResult.method;
        paymentPlan = changesResult.paymentPlan;
        earliestDateForFullPayment = changesResult.earliestDate;
        spendingChanges = changesResult.spendingChanges;
        amountSafeToPay = changesResult.amountSafeToPay;
      } else {
        affordabilityStatus = 'not_affordable';
        recommendedMethod = 'not_recommended';
        earliestDateForFullPayment = '';
        paymentPlan = [];
        amountSafeToPay = 0;
      }
    }
  }

  const explanation = buildExplanation(
    request,
    affordabilityStatus,
    recommendedMethod,
    paymentPlan,
    earliestDateForFullPayment,
    spendingChanges,
    requestedAmountBase,
    safeToday,
    converter,
    baseCurrency
  );

  return {
    request_id: request.request_id,
    amount_safe_to_pay: amountSafeToPay,
    affordability_status: affordabilityStatus,
    recommended_payment_method: recommendedMethod,
    payment_plan: formatPaymentPlan(paymentPlan),
    earliest_date_for_full_payment: earliestDateForFullPayment,
    spending_changes_needed: formatSpendingChanges(spendingChanges),
    decision_explanation: explanation,
  };
}

function findEarliestFullPaymentDate(
  ctx: ForecastContext,
  amount: number,
  startDate: Date,
  endDate: Date
): Date | null {
  const current = new Date(startDate);
  while (isSameOrBefore(current, endDate)) {
    const payment: PaymentPlanEntry[] = [{ date: formatDate(current), amount }];
    if (checkSafety(ctx, payment, [])) {
      return current;
    }
    current.setDate(current.getDate() + 1);
  }
  return null;
}

interface InstallmentResult {
  payments: PaymentPlanEntry[];
  lastPaymentDate: string;
  firstPaymentAmount: number;
  paymentOptionId: string;
}

function findBestInstallment(
  options: PaymentOption[],
  ctx: ForecastContext,
  converter: CurrencyConverter,
  baseCurrency: string,
  request: Request,
  desiredCompletionDate: Date
): InstallmentResult | null {
  const valid: InstallmentResult[] = [];

  for (const opt of options) {
    const payments: PaymentPlanEntry[] = opt.payment_dates.map((date, i) => ({
      date,
      amount: convertToBase(opt.amounts[i] ?? 0, opt.currency, baseCurrency, converter),
    }));

    const lastPaymentDate = opt.payment_dates[opt.payment_dates.length - 1];
    if (isAfter(parseDate(lastPaymentDate), desiredCompletionDate)) continue;

    if (checkSafety(ctx, payments, [])) {
      valid.push({
        payments,
        lastPaymentDate,
        firstPaymentAmount: payments[0].amount,
        paymentOptionId: opt.payment_option_id,
      });
    }
  }

  if (valid.length === 0) return null;

  valid.sort((a, b) => {
    if (a.payments.length !== b.payments.length) return a.payments.length - b.payments.length;
    return a.paymentOptionId.localeCompare(b.paymentOptionId);
  });

  return valid[0];
}

interface ChangesResult {
  status: AffordabilityStatus;
  method: PaymentMethod;
  paymentPlan: PaymentPlanEntry[];
  earliestDate: string;
  spendingChanges: SpendingChange[];
  amountSafeToPay: number;
}

function tryWithSpendingChanges(
  ctx: ForecastContext,
  requestedAmount: number,
  requestDate: Date,
  forecastEnd: Date,
  desiredCompletionDate: Date,
  flexibleExpenses: FlexibleExpense[],
  userMethods: string[],
  paymentOptions: PaymentOption[],
  converter: CurrencyConverter,
  baseCurrency: string,
  request: Request
): ChangesResult | null {
  const combinations = generateSpendingChangeCombos(flexibleExpenses, 3);

  for (const combo of combinations) {
    const spendingChanges = combo.map((c) => ({
      event_id: c.event_id,
      new_amount: c.new_amount,
    }));

    const fullPayment: PaymentPlanEntry[] = [
      { date: request.request_date, amount: requestedAmount },
    ];

    if (checkSafety(ctx, fullPayment, spendingChanges) && userMethods.includes('full_payment')) {
      return {
        status: 'affordable_with_plan',
        method: 'full_payment',
        paymentPlan: fullPayment,
        earliestDate: request.request_date,
        spendingChanges: combo.map((c) => ({
          type: c.new_amount === null ? 'stop' as const : 'reduce_to' as const,
          event_id: c.event_id,
          new_amount: c.new_amount ?? undefined,
        })),
        amountSafeToPay: round2(requestedAmount),
      };
    }

    const earliestDate = findEarliestFullPaymentDateWithChanges(
      ctx,
      requestedAmount,
      requestDate,
      forecastEnd,
      spendingChanges
    );

    if (earliestDate && isSameOrBefore(earliestDate, desiredCompletionDate)) {
      if (userMethods.includes('installments')) {
        const installmentOptions = paymentOptions.filter(
          (o) => o.request_id === request.request_id && o.option_type === 'installments'
        );
        const bestInstallment = findBestInstallmentWithChanges(
          installmentOptions,
          ctx,
          converter,
          baseCurrency,
          request,
          desiredCompletionDate,
          spendingChanges
        );
        if (bestInstallment) {
          return {
            status: 'affordable_with_plan',
            method: 'installments',
            paymentPlan: bestInstallment.payments,
            earliestDate: bestInstallment.lastPaymentDate,
            spendingChanges: combo.map((c) => ({
              type: c.new_amount === null ? 'stop' as const : 'reduce_to' as const,
              event_id: c.event_id,
              new_amount: c.new_amount ?? undefined,
            })),
            amountSafeToPay: round2(bestInstallment.firstPaymentAmount),
          };
        }
      }

      if (userMethods.includes('wait')) {
        return {
          status: 'affordable_with_plan',
          method: 'wait',
          paymentPlan: [],
          earliestDate: formatDate(earliestDate),
          spendingChanges: combo.map((c) => ({
            type: c.new_amount === null ? 'stop' as const : 'reduce_to' as const,
            event_id: c.event_id,
            new_amount: c.new_amount ?? undefined,
          })),
          amountSafeToPay: 0,
        };
      }
    }
  }

  return null;
}

function findEarliestFullPaymentDateWithChanges(
  ctx: ForecastContext,
  amount: number,
  startDate: Date,
  endDate: Date,
  spendingChanges: { event_id: string; new_amount: number | null }[]
): Date | null {
  const current = new Date(startDate);
  while (isSameOrBefore(current, endDate)) {
    const payment: PaymentPlanEntry[] = [{ date: formatDate(current), amount }];
    if (checkSafety(ctx, payment, spendingChanges)) {
      return current;
    }
    current.setDate(current.getDate() + 1);
  }
  return null;
}

function findBestInstallmentWithChanges(
  options: PaymentOption[],
  ctx: ForecastContext,
  converter: CurrencyConverter,
  baseCurrency: string,
  request: Request,
  desiredCompletionDate: Date,
  spendingChanges: { event_id: string; new_amount: number | null }[]
): InstallmentResult | null {
  const valid: InstallmentResult[] = [];

  for (const opt of options) {
    const payments: PaymentPlanEntry[] = opt.payment_dates.map((date, i) => ({
      date,
      amount: convertToBase(opt.amounts[i] ?? 0, opt.currency, baseCurrency, converter),
    }));

    const lastPaymentDate = opt.payment_dates[opt.payment_dates.length - 1];
    if (isAfter(parseDate(lastPaymentDate), desiredCompletionDate)) continue;

    if (checkSafety(ctx, payments, spendingChanges)) {
      valid.push({
        payments,
        lastPaymentDate,
        firstPaymentAmount: payments[0].amount,
        paymentOptionId: opt.payment_option_id,
      });
    }
  }

  if (valid.length === 0) return null;

  valid.sort((a, b) => {
    if (a.payments.length !== b.payments.length) return a.payments.length - b.payments.length;
    return a.paymentOptionId.localeCompare(b.paymentOptionId);
  });

  return valid[0];
}

interface SpendingChangeCombo {
  event_id: string;
  new_amount: number | null;
}

function generateSpendingChangeCombos(
  expenses: FlexibleExpense[],
  maxChanges: number
): SpendingChangeCombo[][] {
  const combos: SpendingChangeCombo[][] = [];
  combos.push([]);

  const singleStop = expenses.map((e) => [{ event_id: e.event_id, new_amount: null } as SpendingChangeCombo]);
  combos.push(...singleStop);

  const singleReduce = expenses.map((e) => [
    { event_id: e.event_id, new_amount: round2(e.amount * 0.5) } as SpendingChangeCombo,
  ]);
  combos.push(...singleReduce);

  if (expenses.length >= 2 && maxChanges >= 2) {
    for (let i = 0; i < expenses.length; i++) {
      for (let j = i + 1; j < expenses.length; j++) {
        combos.push([
          { event_id: expenses[i].event_id, new_amount: null },
          { event_id: expenses[j].event_id, new_amount: null },
        ]);
      }
    }
  }

  if (expenses.length >= 3 && maxChanges >= 3) {
    combos.push([
      { event_id: expenses[0].event_id, new_amount: null },
      { event_id: expenses[1].event_id, new_amount: null },
      { event_id: expenses[2].event_id, new_amount: null },
    ]);
  }

  combos.sort((a, b) => a.length - b.length);
  return combos;
}

function isAfter(a: Date, b: Date): boolean {
  return a.getTime() > b.getTime();
}

function buildExplanation(
  request: Request,
  status: AffordabilityStatus,
  method: PaymentMethod,
  paymentPlan: PaymentPlanEntry[],
  earliestDate: string,
  spendingChanges: SpendingChange[],
  requestedAmount: number,
  safeToday: number,
  converter: CurrencyConverter,
  baseCurrency: string
): string {
  const parts: string[] = [];

  parts.push(
    `Request ${request.request_id} for ${request.requested_amount.toFixed(2)} ${request.currency} from ${request.merchant}.`
  );

  switch (status) {
    case 'affordable_now':
      parts.push(
        method === 'full_payment'
          ? `Full payment of ${requestedAmount.toFixed(2)} ${baseCurrency} is affordable today. Balance remains above the minimum threshold of ${request.minimum_balance_to_keep.toFixed(2)} ${baseCurrency} throughout the 90-day forecast.`
          : `Payment is affordable today using ${method.replace('_', ' ')}. The selected plan keeps the balance above the minimum threshold throughout the 90-day forecast.`
      );
      break;
    case 'affordable_with_plan':
      if (spendingChanges.length > 0) {
        const changeDesc = spendingChanges
          .map((c) =>
            c.type === 'stop'
              ? `stopping ${c.event_id}`
              : `reducing ${c.event_id} to ${c.new_amount!.toFixed(2)}`
          )
          .join(', ');
        parts.push(
          `Affordable with a payment plan that includes ${changeDesc}. The balance stays above the minimum threshold throughout the 90-day forecast.`
        );
      } else if (method === 'partial_payment') {
        parts.push(
          `Partial payment of ${paymentPlan[0]?.amount.toFixed(2) ?? 0} ${baseCurrency} today, with the remaining ${(paymentPlan[1]?.amount ?? 0).toFixed(2)} ${baseCurrency} on ${paymentPlan[1]?.date ?? earliestDate}. Both payments keep the balance above the minimum threshold.`
        );
      } else {
        parts.push(
          `Affordable using ${method.replace('_', ' ')}. The plan completes by ${earliestDate} and keeps the balance above the minimum threshold.`
        );
      }
      break;
    case 'affordable_later':
      parts.push(
        `Not affordable today, but projected to be affordable by ${earliestDate}. Waiting is recommended until sufficient funds are available.`
      );
      break;
    case 'not_affordable':
      parts.push(
        `Not affordable within the 90-day forecast even with spending changes. This purchase would risk the balance falling below the minimum threshold of ${request.minimum_balance_to_keep.toFixed(2)} ${baseCurrency}.`
      );
      break;
  }

  if (method === 'installments' && paymentPlan.length > 0) {
    parts.push(
      `Installment plan: ${paymentPlan.map((p) => `${p.date} (${p.amount.toFixed(2)})`).join(', ')}.`
    );
  }

  return parts.join(' ');
}

export function runAllDecisions(
  requests: Request[],
  profiles: FinancialProfile[],
  events: FinancialEvent[],
  exchangeRates: ExchangeRate[],
  paymentOptions: PaymentOption[],
  messages: Message[],
  images: ImageRecord[]
): DecisionResult[] {
  return requests.map((req) => {
    const profile = profiles.find((p) => p.user_id === req.user_id);
    if (!profile) {
      return {
        request_id: req.request_id,
        amount_safe_to_pay: 0,
        affordability_status: 'not_affordable',
        recommended_payment_method: 'not_recommended',
        payment_plan: '',
        earliest_date_for_full_payment: '',
        spending_changes_needed: 'none',
        decision_explanation: `No financial profile found for user ${req.user_id}.`,
      };
    }

    return makeDecision({
      request: req,
      profile,
      events,
      exchangeRates,
      paymentOptions,
      messages,
      images,
    });
  });
}
