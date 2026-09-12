<div align="center">

# 💳 Buy or Wait?

### Deterministic Financial Decision Engine

**Know whether to pay now, use a plan, wait, or skip — with a 90-day safety forecast and an explainable decision behind every recommendation.**

<br/>

[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C2?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/tests-33%20passing-4F7863)](#testing)
[![Validation](https://img.shields.io/badge/validation-PASS-4F7863)](#validation)

</div>

---

## 🎯 What is Buy or Wait?

Every row in `dataset/requests.csv` represents a financial decision:

> **Can this purchase be made safely now, through a payment plan, at a later date, or not at all?**

**Buy or Wait?** reconstructs the user's financial position, projects cash flow for 90 days, evaluates available payment strategies, and produces a deterministic recommendation.

The core principle is simple:

> **AI may interpret context, but code makes the financial decision.**

Identical inputs produce identical financial calculations and recommendations.

---

## 🧠 Why This Architecture?

The application deliberately separates **interpretation** from **financial reasoning**.

| Layer | Responsibility |
|---|---|
| 🧮 **Deterministic Decision Engine** | Currency conversion, balance reconstruction, forecasting, safe-to-pay calculation, payment planning, ranking, and validation |
| 🤖 **AI-Assisted Context** | Interpretation of unstructured messages and image-related financial context |
| 🖥️ **Dashboard** | Searchable and auditable interface for reviewing decisions and financial reasoning |
| ✅ **Validation & Evaluation** | Schema checks, financial safety checks, test coverage, and sample-based evaluation |

This keeps decision-critical arithmetic reproducible and auditable instead of relying on a model to invent numbers.

---

## ✨ Key Capabilities

- 💰 Reconstruct financial balances from event history
- 🛡️ Calculate the maximum safe amount payable today
- 📈 Forecast cash flow over 90 days
- 💳 Evaluate full, partial, installment, wait, and not-recommended strategies
- 📅 Calculate the earliest safe date for full payment
- 🔄 Recommend reductions or stops for eligible flexible expenses
- 🌍 Convert currencies using supplied exchange rates
- 🔁 Support USD triangulation when a direct FX rate is unavailable
- 🧾 Resolve image-referenced financial amounts
- 🧠 Generate concise, human-readable decision explanations
- 🔎 Search, filter, sort, and inspect requests through the dashboard
- 📊 Visualize decision distribution and portfolio-level metrics
- 🧪 Validate output structure and financial constraints
- ⚡ Keep AI usage limited to cases where interpretation is actually required

---

## 🖥️ Product Dashboard

The dashboard turns the generated CSV into an auditable financial decision console.

### Dashboard overview

<p align="center">
  <img src="docs/screenshots/dashboard-overview.png" alt="Buy or Wait dashboard overview" width="100%" />
</p>

### Recent requests

<p align="center">
  <img src="docs/screenshots/recent-requests.png" alt="Recent financial requests with affordability status and recommendations" width="100%" />
</p>

### Dashboard highlights

- Decision Engine status
- Total request count
- Total requested value
- Safe-to-pay value
- Decision distribution
- Request-level affordability badges
- Recommended payment methods
- Search and filtering
- Drill-down into decision explanations

---

## 🔄 End-to-End Decision Pipeline

```text
                         ┌─────────────────────┐
                         │   Purchase Request  │
                         └──────────┬──────────┘
                                    │
                                    ▼
                    ┌────────────────────────────┐
                    │      Financial Context     │
                    ├────────────────────────────┤
                    │ User Profile               │
                    │ Financial Events           │
                    │ Exchange Rates             │
                    │ Messages                   │
                    │ Images                     │
                    │ Payment Options             │
                    └──────────────┬─────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
          ┌──────────────────┐          ┌──────────────────┐
          │ AI-Assisted      │          │ Structured Data  │
          │ Interpretation   │          │ Processing       │
          └────────┬─────────┘          └────────┬─────────┘
                   └──────────────┬──────────────┘
                                  ▼
                 ┌──────────────────────────────┐
                 │ Deterministic Financial      │
                 │ Decision Engine               │
                 ├──────────────────────────────┤
                 │ Balance Reconstruction       │
                 │ Currency Conversion           │
                 │ 90-Day Forecast               │
                 │ Safe-to-Pay Calculation       │
                 │ Payment Plan Ranking           │
                 │ Spending Change Validation     │
                 └──────────────┬───────────────┘
                                ▼
                     ┌────────────────────────┐
                     │ Final Recommendation   │
                     └────────────┬───────────┘
                                  ▼
                          ┌──────────────┐
                          │  output.csv  │
                          └──────────────┘
```

---

## 🧮 How a Decision Is Made

### 1. Reconstruct the financial position

Completed financial events up to the request date are aggregated and converted into the user's home currency.

Pending, failed, and cancelled transactions are handled according to the engine's rules.

### 2. Separate financial obligations

Recurring obligations are distinguished from flexible spending.

- Fixed/essential obligations remain protected.
- Eligible flexible expenses can be reduced or stopped.
- Unrealised investments are excluded.
- Pending transactions are handled according to their financial state.

### 3. Forecast the next 90 days

The engine projects:

- Scheduled income
- Recurring expenses
- Pending obligations
- Purchase payments
- Minimum balance requirements

The forecast must respect `minimum_balance_to_keep`.

### 4. Evaluate payment strategies

The engine checks the payment strategies available to the user and the request.

### 5. Rank valid plans

Safe plans are ranked using the project's deterministic priority rules:

1. Complete by the desired completion date
2. No spending changes
3. Lower total amount paid
4. Earlier start
5. Fewer payments
6. Lower payment option ID

### 6. Explain the decision

Every prediction contains a concise `decision_explanation` explaining why the recommendation is financially safe.

---

## 📊 Affordability Decisions

| Status | Meaning |
|---|---|
| `affordable_now` | The request can safely be paid immediately |
| `affordable_with_plan` | The request can be completed safely using an acceptable plan |
| `affordable_later` | Full payment becomes safe at a later date |
| `not_affordable` | No safe completion is available within the supported forecast |

---

## 💳 Payment Methods

| Method | Purpose |
|---|---|
| `full_payment` | Pay the complete amount immediately |
| `partial_payment` | Pay a safe amount now and the remainder later |
| `installments` | Use an available installment option |
| `wait` | Delay the purchase until it becomes safe |
| `not_recommended` | No safe payment strategy is recommended |

Payment methods are selected only when compatible with the user's accepted payment preferences and the request's available options.

---

## 🛡️ Safety-First Forecasting

A recommendation is not considered safe merely because the user has enough money today.

The engine evaluates the entire 90-day horizon.

```text
Current Balance
      +
Expected Income
      -
Essential Expenses
      -
Recurring Obligations
      -
Pending/Committed Outflows
      -
Purchase Payments
      =
Projected Balance
```

A candidate plan must keep the projected balance at or above:

```text
minimum_balance_to_keep
```

throughout the relevant forecast.

---

## 💡 Spending Changes

Only eligible flexible recurring expenses can be changed.

Supported actions:

```text
stop:<event_id>
```

```text
reduce_to:<event_id>:<new_amount>
```

The engine never modifies essential expenses and keeps spending changes narrowly scoped.

---

## 🌍 Currency Handling

Financial events can occur across currencies.

The engine:

1. Uses a direct exchange rate when available.
2. Handles inverse rates where appropriate.
3. Uses USD triangulation when a direct conversion path is unavailable.
4. Uses the supplied challenge rates rather than live market rates.

This keeps results reproducible.

---

## 🧾 Output Contract

The generated file is:

```text
output.csv
```

### Exact column order

| # | Column | Purpose |
|---:|---|---|
| 1 | `request_id` | Unique request identifier |
| 2 | `amount_safe_to_pay` | Maximum safe amount payable today |
| 3 | `affordability_status` | Final affordability decision |
| 4 | `recommended_payment_method` | Recommended payment strategy |
| 5 | `payment_plan` | Concrete payment schedule |
| 6 | `earliest_date_for_full_payment` | Earliest safe full-payment date |
| 7 | `spending_changes_needed` | Required flexible spending changes |
| 8 | `decision_explanation` | Human-readable decision reasoning |

### Example

```csv
request_id,amount_safe_to_pay,affordability_status,recommended_payment_method,payment_plan,earliest_date_for_full_payment,spending_changes_needed,decision_explanation
request_28,1302.40,affordable,credit_card,full_payment,2024-06-07,none,Full payment of 1302.40 EUR is affordable while the balance remains above the required minimum.
```

> The example is illustrative. Production values are generated from the project's dataset and decision engine.

---

## 📦 Dataset

The project processes financial context from the supplied dataset.

```text
dataset/
├── users.csv
├── requests.csv
├── events.csv
├── exchange_rates.csv
├── messages.csv
├── images.csv
├── sample_requests.csv
└── media/
```

| File | Role |
|---|---|
| `users.csv` | User financial profiles |
| `requests.csv` | Purchase requests to score |
| `events.csv` | Financial event history |
| `exchange_rates.csv` | Supplied FX rates |
| `messages.csv` | Free-text financial context |
| `images.csv` | Image-based financial context |
| `sample_requests.csv` | Labelled evaluation requests |
| `media/` | Supporting media |

---

## 🏗️ Project Structure

```text
.
├── README.md
├── problem_statement.md
├── AGENTS.md
├── output.csv
│
├── dataset/
│   ├── users.csv
│   ├── requests.csv
│   ├── events.csv
│   ├── exchange_rates.csv
│   ├── messages.csv
│   ├── images.csv
│   ├── sample_requests.csv
│   └── media/
│
├── src/
│   ├── processing/
│   │   ├── currency.py
│   │   ├── data_loader.py
│   │   ├── financial_state.py
│   │   ├── forecast.py
│   │   ├── payment_planner.py
│   │   ├── pipeline.py
│   │   └── generate_dataset.py
│   │
│   ├── App.tsx
│   ├── types.ts
│   ├── components/
│   └── index.css
│
├── evaluation/
│   ├── validate_output.py
│   ├── evaluate.py
│   └── usage_report.md
│
├── tests/
│   ├── test_currency.py
│   ├── test_forecast.py
│   ├── test_payment_plans.py
│   └── test_validation.py
│
├── public/
│   └── data/
│
└── docs/
    └── screenshots/
```

---

## ⚡ Quick Start

### 1. Generate the supporting dataset

```bash
python3 -m src.processing.generate_dataset
```

### 2. Run the decision engine

```bash
python3 -m src.processing.pipeline
```

This generates:

```text
output.csv
```

### 3. Validate the output

```bash
python3 -m evaluation.validate_output
```

### 4. Evaluate the predictions

```bash
python3 -m evaluation.evaluate
```

### 5. Run the test suite

```bash
python3 -m unittest discover -s tests -v
```

---

## 🖥️ Run the Dashboard

Install frontend dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by the terminal.

---

## 🧪 Testing

The project currently reports **33 passing tests**.

```bash
python3 -m unittest discover -s tests -v
```

Coverage includes:

- Direct currency conversion
- Inverse currency conversion
- Dated FX rates
- USD triangulation
- Balance reconstruction
- 90-day forecast mechanics
- Future financial obligations
- Safe-to-pay calculation
- Payment-plan selection
- Payment-plan ranking
- Output validation

---

## ✅ Validation

Run:

```bash
python3 -m evaluation.validate_output
```

Validation checks include:

- Required output columns
- Exact schema
- Request coverage
- Valid status values
- Valid payment methods
- Payment amount consistency
- Payment-date consistency
- Spending-change rules
- Forecast safety constraints

---

## 📈 Evaluation

Run:

```bash
python3 -m evaluation.evaluate
```

The evaluation compares:

```text
output.csv
        │
        ▼
dataset/sample_requests.csv
```

and reports overall accuracy together with a per-column breakdown across the output fields.

---

## 🤖 AI Usage & Efficiency

AI is intentionally kept outside decision-critical arithmetic.

### AI is useful for

- Interpreting free-text messages
- Resolving image-based financial context
- Extracting structured information from unstructured inputs

### Deterministic code handles

- Currency conversion
- Balance calculations
- Forecasting
- Safe amount calculation
- Payment schedules
- Plan ranking
- Safety validation
- Output generation

This design improves:

- **Reproducibility**
- **Auditability**
- **Financial consistency**
- **Token efficiency**
- **Processing cost**

Usage details are documented in:

```text
evaluation/usage_report.md
```

---

## 🔐 Security & Trust

Financial context is treated as data, not executable instructions.

- Messages and images are **untrusted input**.
- Embedded instructions cannot override financial rules.
- Financial arithmetic is never delegated to an AI model.
- API keys and secrets are not committed.
- `.env` files are excluded from the repository.
- Virtual environments and generated caches are excluded from submission packages.

---

## 🧩 Design Decisions

### 1. Deterministic by default

Identical inputs produce identical financial calculations and recommendations.

### 2. AI stays out of arithmetic

The model can interpret context, but it does not decide balances, dates, rates, or payment amounts.

### 3. Conservative forecasting

A plan is valid only when the forecast remains within the required financial safety boundary.

### 4. Narrow spending controls

Only eligible flexible recurring expenses can be reduced or stopped.

### 5. Explainability is mandatory

Every output contains a decision explanation rather than only a status label.

---

## ⚠️ Limitations

- Decisions depend on the completeness and quality of supplied financial data.
- The 90-day forecast is based on known and scheduled events.
- Forecasts cannot guarantee future financial conditions.
- Currency conversion is bounded by the supplied `exchange_rates.csv`.
- Unstructured information may require interpretation before it can be used by the deterministic engine.

---

## 🚀 Submission Checklist

```text
[✓] Financial decision engine implemented
[✓] 90-day forecast implemented
[✓] Payment planning implemented
[✓] Output validation implemented
[✓] Automated tests
[✓] Evaluation workflow
[✓] Interactive dashboard
[✓] Decision explanations
[✓] AI usage documentation

[ ] Verify final output.csv
[ ] Verify evaluation results
[ ] Verify usage_report.md
[ ] Remove secrets and development artifacts
[ ] Create final code.zip
```

---

## 👥 Contributors

Add the final team members and roles here.

---

<div align="center">

### 💳 Buy or Wait?

**Safer decisions. Deterministic reasoning. Explainable outcomes.**

*Built for HackerRank Orchestrate.*

</div>
