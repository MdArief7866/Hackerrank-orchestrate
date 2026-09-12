export interface Request {
  request_id: string;
  user_id: string;
  request_date: string;
  requested_amount: number;
  currency: string;
  merchant: string;
  category: string;
  desired_completion_date: string;
  minimum_balance_to_keep: number;
  payment_methods_user_will_consider: string[];
  allows_partial_payment: boolean;
}

export interface FinancialProfile {
  user_id: string;
  base_currency: string;
  monthly_income: number;
  monthly_expenses: number;
  current_balance: number;
  account_type: string;
}

export interface FinancialEvent {
  event_id: string;
  user_id: string;
  event_type: string;
  event_date: string;
  amount: number | null;
  currency: string;
  description: string;
  is_recurring: boolean;
  recurring_frequency: string;
  linked_event_id: string;
  image_id: string;
  source: string;
  status: string;
}

export interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string;
}

export interface PaymentOption {
  payment_option_id: string;
  request_id: string;
  option_type: string;
  number_of_payments: number;
  payment_dates: string[];
  amounts: number[];
  total_amount: number;
  currency: string;
}

export interface Message {
  message_id: string;
  request_id: string;
  user_id: string;
  message_date: string;
  sender: string;
  message_type: string;
  content: string;
  related_event_id: string;
  image_id: string;
}

export interface ImageRecord {
  image_id: string;
  request_id: string;
  event_id: string;
  user_id: string;
  image_date: string;
  image_type: string;
  extracted_amount: number;
  extracted_currency: string;
  description: string;
  ocr_confidence: number;
  source: string;
}

export type AffordabilityStatus =
  | 'affordable_now'
  | 'affordable_with_plan'
  | 'affordable_later'
  | 'not_affordable';

export type PaymentMethod =
  | 'full_payment'
  | 'partial_payment'
  | 'installments'
  | 'wait'
  | 'not_recommended';

export interface PaymentPlanEntry {
  date: string;
  amount: number;
}

export interface SpendingChange {
  type: 'stop' | 'reduce_to';
  event_id: string;
  new_amount?: number;
}

export interface DecisionResult {
  request_id: string;
  amount_safe_to_pay: number;
  affordability_status: AffordabilityStatus;
  recommended_payment_method: PaymentMethod;
  payment_plan: string;
  earliest_date_for_full_payment: string;
  spending_changes_needed: string;
  decision_explanation: string;
}

export interface ForecastDay {
  date: string;
  balance: number;
  events: string[];
}
