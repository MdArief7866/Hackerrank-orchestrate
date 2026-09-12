<div align="center">

# Buy or Wait?

**A deterministic financial decision engine that tells you whether to pay now, use a payment plan, wait, or skip the purchase — and explains exactly why.**

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/tests-33%20passing-4F7863)](#testing)
[![Validation](https://img.shields.io/badge/validation-PASS-4F7863)](#validation)

</div>

---

## Overview

Every row in `dataset/requests.csv` is a real question someone is asking about their money: *should I pay for this now, spread it out, wait a few weeks, or not do it at all?*

**Buy or Wait?** answers that question the way a careful accountant would — by reconstructing the user's actual financial position, projecting it forward 90 days, and only recommending what the numbers can support. No model is ever asked to invent a balance, a rate, or a date; every financial value is produced by deterministic code, so the same input always produces the same output.

The system is split into two halves that stay deliberately independent:

| | |
|---|---|
| 🧮 **Decision engine** | Pure, deterministic Python. Currency conversion, balance reconstruction, 90-day forecasting, plan ranking, and safety checks. Zero AI calls. |
| 🖥️ **Dashboard** | A React + TypeScript interface for browsing, filtering, and auditing every decision the engine has made, with full drill-down into the reasoning behind each one. |

## Dashboard

<p align="center">
  <img src="docs/screenshots/dashboard-overview.png" alt="Buy or Wait? dashboard overview — decision engine status, requested value, safe-to-pay, and decision distribution" width="100%" />
</p>

<p align="center">
  <img src="docs/screenshots/recent-requests.png" alt="Buy or Wait? recent requests list with affordability badges" width="100%" />
</p>

The dashboard surfaces the engine's output as a live console rather than a raw CSV: a decision-distribution breakdown at a glance, running totals for requested vs. safe-to-pay value, and a searchable, sortable ledger of every request with one-click access to the full explanation behind each recommendation.

## How a decision gets made

```text
                     Purchase Request
                            │
                            ▼
                  Financial Context
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
  User Profile      Financial Events      Exchange Rates
  (currency,        (income, debits,      (cross-currency
  min. balance,      credits, pending)     triangulation)
  preferences)              │
        │                   │
        └─────────┬─────────┴─────────┬─────────┘
                   │                   │
            Messages / Images   (parsed context,
             (context only)      no invented values)
                   │
                   ▼
        Deterministic Financial Engine
                   │
     ┌─────────────┼──────────────┬───────────────┐
     ▼              ▼              ▼               ▼
Safe-to-Pay   90-Day Forecast   Payment Plan   Spending Changes
  Amount        (never below      Ranking        (stop / reduce
                min. balance)                     flexible spend)
     │              │              │               │
     └──────────────┴──────────────┴───────────────┘
                          │
                          ▼
                Final Recommendation
                          │
                          ▼
                     output.csv
```

1. **Reconstruct the balance.** Sum every completed (non-pending, non-failed, non-cancelled) financial event up to the request date, converting each into the user's home currency.
2. **Separate the obligations.** Recurring expenses (rent, subscriptions, loans) are fixed; flexible expenses (dining, shopping, entertainment) can be reduced or stopped; pending debits are committed but not yet deducted; unrealised investments are excluded entirely.
3. **Forecast 90 days forward.** Income lands on its scheduled day, recurring and pending outflows are subtracted on theirs, and the balance is never allowed to dip below `minimum_balance_to_keep`.
4. **Rank the safe plans.** Among every plan that clears the forecast, the engine prefers: completion by the desired date → no spending changes needed → lower total amount paid → earlier start → fewer payments.
5. **Explain the outcome.** Every row in `output.csv` carries a plain-language `decision_explanation` — never just a label.

## Key features

- Financial affordability analysis, reconstructed from raw event history
- Safe-to-pay amount calculation that never breaches the minimum balance
- Deterministic 90-day cash-flow forecast
- Full, partial, and installment payment-plan recommendations
- Earliest safe date for full payment
- Spending-change suggestions (`reduce:X:Y`, `stop:X`) limited to flexible expenses
- Currency conversion with USD triangulation when no direct rate exists
- Explainable, human-readable decisions for every request
- Searchable, filterable, sortable request dashboard
- Decision-distribution and portfolio-level summary metrics
- Automated schema validation and sample-based evaluation

## Quick start

```bash
# 1. Generate the supporting dataset from public/requests.csv
python3 -m src.processing.generate_dataset

# 2. Run the decision engine → output.csv
python3 -m src.processing.pipeline

# 3. Validate the output schema and constraints
python3 -m evaluation.validate_output

# 4. Evaluate against the labelled sample set
python3 -m evaluation.evaluate

# 5. Run the test suite
python3 -m unittest discover -s tests -v
```

### Run the dashboard

```bash
npm install
npm run dev
```

The terminal prints a local URL — open it to browse the generated decisions.

## Output schema

`output.csv` — exact column order:

| Column | Description |
|---|---|
| `request_id` | Unique request identifier |
| `amount_safe_to_pay` | Maximum payable today without breaching the minimum balance |
| `affordability_status` | `affordable` / `partially_affordable` / `not_affordable` |
| `recommended_payment_method` | Best method available given the user's preferences |
| `payment_plan` | `full_payment` / `installments` / `partial_payment` / `wait` / `not_recommended` |
| `earliest_date_for_full_payment` | ISO date, or empty if none exists within the forecast |
| `spending_changes_needed` | `none`, `reduce:<event_id>:<new_amount>`, or `stop:<event_id>` |
| `decision_explanation` | Concise, factual explanation of the recommendation |

**Example**

```csv
request_id,amount_safe_to_pay,affordability_status,recommended_payment_method,payment_plan,earliest_date_for_full_payment,spending_changes_needed,decision_explanation
request_28,1302.40,affordable,credit_card,full_payment,2024-06-07,none,Full payment of 1302.40 EUR affordable with credit_card; balance remains above minimum after all upcoming obligations.
```

## Project structure

```text
.
├── README.md
├── problem_statement.md
├── AGENTS.md
├── output.csv                    # generated — decision engine output
│
├── dataset/
│   ├── users.csv                 # 250 user profiles
│   ├── requests.csv               # 250 payment requests to score
│   ├── events.csv                 # ~8,000 financial events
│   ├── exchange_rates.csv         # 300 FX rates across 5 currencies
│   ├── messages.csv                # free-text context per request
│   ├── images.csv                  # pre-parsed image-based amounts
│   ├── sample_requests.csv        # 20 labelled requests for evaluation
│   └── media/
│
├── src/processing/                # deterministic financial engine
│   ├── currency.py                #   FX conversion, USD triangulation
│   ├── data_loader.py             #   CSV loading, dedup, image resolution
│   ├── financial_state.py          #   balance reconstruction
│   ├── forecast.py                 #   90-day balance forecast
│   ├── payment_planner.py          #   plan ranking, method selection
│   ├── pipeline.py                 #   orchestration → output.csv
│   └── generate_dataset.py         #   dataset generation from requests
│
├── evaluation/
│   ├── validate_output.py          # schema and constraint validation
│   ├── evaluate.py                 # output.csv vs. sample_requests.csv
│   └── usage_report.md             # AI usage and processing summary
│
├── tests/
│   ├── test_currency.py
│   ├── test_forecast.py
│   ├── test_payment_plans.py
│   └── test_validation.py
│
├── src/                             # dashboard (React + TypeScript)
│   ├── App.tsx
│   ├── types.ts
│   ├── components/
│   └── index.css
│
├── public/data/                    # dashboard data source
└── docs/screenshots/                # README assets
```

## Design decisions

1. **Deterministic by default.** All financial math is seeded and reproducible — identical inputs always produce identical outputs.
2. **AI stays out of the arithmetic.** Unstructured context (free-text messages, image-referenced amounts) is interpreted once, ahead of time; every number that reaches the forecast is computed by code, never guessed by a model.
3. **Currency triangulation.** When no direct exchange rate exists, conversion routes through USD, preferring direct-direct paths over inverse ones.
4. **Plan ranking is conservative.** `full_payment` > `installments` > `partial_payment` > `wait` > `not_recommended` — the engine never recommends more risk than the forecast supports.
5. **Spending changes are narrowly scoped.** Only flexible recurring expenses (dining, entertainment, discretionary shopping) can be reduced or stopped; essential expenses are never touched.

## Testing

```bash
python3 -m unittest discover -s tests -v
```

Covers currency conversion (direct, inverse, dated, triangulated), forecast mechanics (balance projection, safe-to-pay under future obligations), payment-plan selection and ranking, and output validation rules.

## Validation

```bash
python3 -m evaluation.validate_output
```

Checks schema completeness, full request coverage, valid enum values for status and plan, payment-amount and payment-date consistency, spending-change rule compliance, and forecast safety constraints.

## Evaluation

```bash
python3 -m evaluation.evaluate
```

Compares `output.csv` against the labelled `dataset/sample_requests.csv`, reporting overall accuracy and a per-column breakdown across all seven output fields.

## Security

- Messages and images are treated as **untrusted input** — instructions embedded inside user-supplied financial data can never override the engine's decision rules.
- No API keys, secrets, `.env` files, or virtual environments are committed to the repository.

## Limitations

- Decisions are only as good as the completeness of the supplied financial data.
- The 90-day forecast reflects known, scheduled events — it is not a guarantee of future financial conditions.
- Currency conversion is bounded by the rates supplied in `exchange_rates.csv`.

---

<div align="center">

**Buy or Wait?** — Make safer purchase decisions with explainable, deterministic financial analysis.

</div>
