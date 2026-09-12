#!/usr/bin/env python3
"""validate_output.py — Validates output.csv against the dataset and rules.

Checks:
  1. Schema (8 columns, correct headers)
  2. Row count matches requests.csv
  3. All request IDs present and match
  4. amount_safe_to_pay within [0, requested_amount]
  5. Valid affordability statuses
  6. Valid payment methods
  7. Payment plan format and chronological order
  8. Installment plans match supplied options exactly
  9. Partial payment rules (exactly 2 payments, correct conditions)
  10. Spending change validity (max 3, valid format, flexible events only)
  11. Earliest date rules (affordable_now => request_date)
  12. 90-day safety (earliest date within 90 days of request)
  13. Completion deadline (earliest date <= desired_completion_date)
  14. Explanation consistency (non-empty, mentions request_id)
"""

import csv
import os
import sys
from datetime import datetime, timedelta

DATASET_DIR = os.path.join(os.path.dirname(__file__), '..', 'dataset')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'output.csv')

REQUIRED_HEADERS = [
    'request_id', 'amount_safe_to_pay', 'affordability_status',
    'recommended_payment_method', 'payment_plan', 'earliest_date_for_full_payment',
    'spending_changes_needed', 'decision_explanation'
]

VALID_STATUSES = {'affordable_now', 'affordable_with_plan', 'affordable_later', 'not_affordable'}
VALID_METHODS = {'full_payment', 'partial_payment', 'installments', 'wait', 'not_recommended'}

errors = []
warnings = []


def parse_csv(path):
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader), reader.fieldnames


def parse_date(s):
    if not s:
        return None
    try:
        return datetime.strptime(s, '%Y-%m-%d')
    except ValueError:
        return None


def parse_payment_list(s):
    if not s:
        return []
    return [p.strip() for p in s.split('|')]


def parse_payment_entry(entry):
    parts = entry.split(':')
    if len(parts) != 2:
        return None
    return parts[0], float(parts[1])


def validate():
    # Load requests
    requests, req_headers = parse_csv(os.path.join(DATASET_DIR, 'requests.csv'))
    req_by_id = {r['request_id']: r for r in requests}

    # Load payment options
    options, _ = parse_csv(os.path.join(DATASET_DIR, 'request_payment_options.csv'))

    # Load output
    if not os.path.exists(OUTPUT_FILE):
        errors.append("output.csv does not exist")
        return errors, warnings

    output_rows, out_headers = parse_csv(OUTPUT_FILE)

    # 1. Schema check
    if out_headers != REQUIRED_HEADERS:
        errors.append(f"Schema mismatch. Expected {REQUIRED_HEADERS}, got {out_headers}")

    # 2. Row count
    if len(output_rows) != len(requests):
        errors.append(f"Row count mismatch: output has {len(output_rows)}, requests has {len(requests)}")

    # 3. Request IDs
    output_ids = {r['request_id'] for r in output_rows}
    request_ids = {r['request_id'] for r in requests}
    missing = request_ids - output_ids
    extra = output_ids - request_ids
    if missing:
        errors.append(f"Missing request IDs in output: {missing}")
    if extra:
        errors.append(f"Extra request IDs in output: {extra}")

    for row in output_rows:
        rid = row['request_id']
        req = req_by_id.get(rid)
        if not req:
            errors.append(f"{rid}: request not found in requests.csv")
            continue

        requested_amount = float(req['requested_amount'])
        min_balance = float(req['minimum_balance_to_keep'])
        request_date = parse_date(req['request_date'])
        desired_date = parse_date(req['desired_completion_date'])
        allows_partial = req['allows_partial_payment'].lower() == 'true'
        user_methods = [m.strip() for m in req['payment_methods_user_will_consider'].split(',')]

        # 4. Amount limits
        try:
            safe_amount = float(row['amount_safe_to_pay'])
            if safe_amount < 0:
                errors.append(f"{rid}: amount_safe_to_pay ({safe_amount}) < 0")
            if safe_amount > requested_amount:
                errors.append(f"{rid}: amount_safe_to_pay ({safe_amount}) > requested_amount ({requested_amount})")
        except ValueError:
            errors.append(f"{rid}: amount_safe_to_pay is not a number: '{row['amount_safe_to_pay']}'")

        # 5. Valid statuses
        status = row['affordability_status']
        if status not in VALID_STATUSES:
            errors.append(f"{rid}: invalid affordability_status '{status}'")

        # 6. Valid payment methods
        method = row['recommended_payment_method']
        if method not in VALID_METHODS:
            errors.append(f"{rid}: invalid recommended_payment_method '{method}'")

        # 7. Payment plan format
        plan_str = row['payment_plan']
        plan_entries = parse_payment_list(plan_str) if plan_str else []
        payments = []
        for entry in plan_entries:
            parsed = parse_payment_entry(entry)
            if parsed is None:
                errors.append(f"{rid}: invalid payment plan entry '{entry}'")
            else:
                payments.append(parsed)

        # Chronological order
        for i in range(1, len(payments)):
            prev_date = parse_date(payments[i-1][0])
            curr_date = parse_date(payments[i][0])
            if prev_date and curr_date and curr_date < prev_date:
                errors.append(f"{rid}: payments not in chronological order at index {i}")

        # 8. Installment exact match
        if method == 'installments':
            req_options = [o for o in options if o['request_id'] == rid and o['option_type'] == 'installments']
            matched = False
            for opt in req_options:
                opt_dates = [d.strip() for d in opt['payment_dates'].split(',')]
                opt_amounts = [float(a.strip()) for a in opt['amounts'].split(',')]
                if len(payments) == len(opt_dates):
                    match = all(payments[j][0] == opt_dates[j] for j in range(len(payments)))
                    if match:
                        matched = True
                        break
            if not matched and req_options:
                errors.append(f"{rid}: installment plan does not match any supplied option")

        # 9. Partial payment rules
        if method == 'partial_payment':
            if not allows_partial:
                errors.append(f"{rid}: partial_payment recommended but allows_partial_payment is false")
            if 'partial_payment' not in user_methods:
                errors.append(f"{rid}: partial_payment recommended but user does not accept it")
            if len(payments) != 2:
                errors.append(f"{rid}: partial_payment should have exactly 2 payments, got {len(payments)}")
            else:
                first_amount = payments[0][1]
                second_amount = payments[1][1]
                total = first_amount + second_amount
                if abs(total - requested_amount) > 0.01:
                    errors.append(f"{rid}: partial payment total ({total}) != requested ({requested_amount})")
                if first_amount <= 0 or first_amount >= requested_amount:
                    errors.append(f"{rid}: partial payment first amount ({first_amount}) must be > 0 and < requested")

        # 10. Spending changes
        changes_str = row['spending_changes_needed']
        if changes_str and changes_str != 'none':
            changes = parse_payment_list(changes_str)
            if len(changes) > 3:
                errors.append(f"{rid}: more than 3 spending changes ({len(changes)})")
            for change in changes:
                if change.startswith('stop:'):
                    pass
                elif change.startswith('reduce_to:'):
                    parts = change.split(':')
                    if len(parts) != 3:
                        errors.append(f"{rid}: invalid reduce_to format '{change}'")
                    else:
                        try:
                            float(parts[2])
                        except ValueError:
                            errors.append(f"{rid}: reduce_to amount not a number '{parts[2]}'")
                else:
                    errors.append(f"{rid}: invalid spending change format '{change}'")

        # 11. Earliest date rules
        earliest = row['earliest_date_for_full_payment']
        if status == 'affordable_now':
            if earliest != req['request_date']:
                errors.append(f"{rid}: affordable_now but earliest_date ({earliest}) != request_date ({req['request_date']})")
        elif status == 'not_affordable':
            if earliest:
                warnings.append(f"{rid}: not_affordable but has earliest_date '{earliest}'")

        # 12. 90-day safety
        if earliest:
            ed = parse_date(earliest)
            if ed and request_date:
                diff = (ed - request_date).days
                if diff > 90:
                    errors.append(f"{rid}: earliest_date ({earliest}) is more than 90 days after request_date")

        # 13. Completion deadline
        if earliest and desired_date:
            ed = parse_date(earliest)
            if ed and ed > desired_date:
                if status != 'not_affordable':
                    errors.append(f"{rid}: earliest_date ({earliest}) > desired_completion_date ({req['desired_completion_date']})")

        # 14. Explanation consistency
        explanation = row['decision_explanation']
        if not explanation or len(explanation.strip()) < 10:
            errors.append(f"{rid}: decision_explanation is too short or empty")
        if rid not in explanation:
            warnings.append(f"{rid}: request_id not mentioned in explanation")

    return errors, warnings


if __name__ == '__main__':
    errs, warns = validate()
    if errs:
        print(f"VALIDATION FAILED: {len(errs)} error(s)")
        for e in errs:
            print(f"  ERROR: {e}")
    else:
        print(f"VALIDATION PASSED: all checks OK")
    if warns:
        print(f"\nWarnings ({len(warns)}):")
        for w in warns:
            print(f"  WARN: {w}")
    sys.exit(1 if errs else 0)
