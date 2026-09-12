# Hackerrank Orchestrate — Buy or Wait?

> **Buy or Wait?** is a financial decision engine that evaluates purchase requests and recommends whether to buy now, use a payment plan, wait, or avoid the purchase.

## Overview

The application combines **AI-assisted interpretation** with a **deterministic financial decision engine**.

The system analyzes financial context for each purchase request and produces an explainable recommendation based on affordability, cash-flow safety, payment options, and future financial commitments.

## Key Features

- Financial affordability analysis
- Safe-to-pay amount calculation
- 90-day cash-flow forecasting
- Payment-plan recommendations
- Partial-payment recommendations
- Earliest safe full-payment date
- Spending-change recommendations
- Explainable financial decisions
- Request search and review
- Decision distribution dashboard
- Recent request tracking
- Evaluation and validation support
- Dark fintech dashboard UI

## Decision Flow

```text
Purchase Request
       |
       v
Financial Context
       |
       +-- Financial Profile
       +-- Financial Events
       +-- Messages
       +-- Images
       +-- Payment Options
       +-- Exchange Rates
       |
       v
AI-Assisted Extraction
       |
       v
Deterministic Financial Engine
       |
       +-- Safe Amount
       +-- 90-Day Forecast
       +-- Payment Plan
       +-- Earliest Payment Date
       +-- Spending Changes
       |
       v
Final Recommendation
       |
       v
output.csv
```

## Affordability Statuses

| Status | Meaning |
|---|---|
| `affordable_now` | The requested amount can safely be paid now |
| `affordable_with_plan` | The request can be completed safely using an acceptable payment plan |
| `affordable_later` | The full payment becomes safe at a later date |
| `not_affordable` | The request cannot safely be completed within the supported forecast |

## Recommended Payment Methods

| Method | Purpose |
|---|---|
| `full_payment` | Pay the complete amount immediately |
| `partial_payment` | Pay a safe amount now and the remaining amount later |
| `installments` | Use an available installment option |
| `wait` | Wait until the purchase becomes affordable |
| `not_recommended` | No safe recommended payment method |

## 90-Day Financial Forecast

The decision engine evaluates the financial position from the request date through the following 90 days.

A safe plan must:

- Complete the request by the desired completion date
- Cover essential expenses
- Keep the projected balance at or above the required minimum balance
- Respect the user's accepted payment methods
- Follow the supplied payment options

## Deterministic Financial Logic

Financial calculations are handled deterministically rather than allowing an AI model to invent financial values.

Deterministic processing includes:

- Currency conversion using supplied exchange rates
- Date calculations
- Cash-flow forecasting
- Safe amount calculation
- Payment schedules
- Spending-change validation
- Plan ranking
- Safety checks

AI is reserved for unstructured information where interpretation is required, such as financial messages or image-based information.

## Dashboard

The web application provides a dark, fintech-style interface with:

- Decision Engine status
- Total request metrics
- Total requested value
- Safe-to-pay metrics
- Decision distribution
- Affordable-now and payment-plan summaries
- Recent requests
- Request status indicators
- Recommended payment methods
- 90-day financial analysis

## Request Analysis

Each request can be reviewed with its financial decision and supporting information.

The result includes:

```text
amount_safe_to_pay
affordability_status
recommended_payment_method
payment_plan
earliest_date_for_full_payment
spending_changes_needed
decision_explanation
```

## Dataset

The challenge dataset provides the financial context required by the decision engine.

```text
dataset/
├── requests.csv
├── sample_requests.csv
├── financial_profiles.csv
├── financial_events.csv
├── exchange_rates.csv
├── request_payment_options.csv
├── messages.csv
├── images.csv
└── media/
    └── images/
```

The prediction pipeline processes requests from `requests.csv`. The other files provide supporting financial context.

## Output

The generated prediction file is:

```text
output.csv
```

Required column order:

```text
request_id
amount_safe_to_pay
affordability_status
recommended_payment_method
payment_plan
earliest_date_for_full_payment
spending_changes_needed
decision_explanation
```

### Example Output

```csv
request_id,amount_safe_to_pay,affordability_status,recommended_payment_method,payment_plan,earliest_date_for_full_payment,spending_changes_needed,decision_explanation
req_001,500,affordable_now,full_payment,2025-01-05:500,2025-01-05,none,The request can be paid safely while maintaining the required balance.
```

> The example above is illustrative. Actual values are generated from the dataset and financial engine.

## Payment Plans

Installment recommendations use the payment options supplied by the challenge dataset.

The system does not invent:

- Installment options
- Fees
- Intervals
- Payment counts
- Total payable amounts

For partial payment, the plan contains exactly two payments:

```text
request_date:safe_amount|earliest_date_for_full_payment:remaining_amount
```

The payment amounts must add up to the requested amount.

## Spending Changes

Only eligible flexible recurring expenses can be modified.

Supported actions:

```text
stop:<event_id>
```

```text
reduce_to:<event_id>:<new_amount>
```

Essential expenses must not be modified.

## Plan Ranking

When multiple safe plans are available, the decision engine prioritizes:

1. Completion by the desired completion date
2. No spending changes
3. Lower total amount paid
4. Earlier start
5. Fewer payments
6. Lower payment option ID

## Validation

The project validates:

- Output schema
- Required columns
- Request coverage
- Valid affordability statuses
- Valid payment methods
- Payment-plan consistency
- Payment amounts
- Payment dates
- Spending-change rules
- Financial safety
- Forecast constraints

## Technology Stack

- **Frontend:** React + TypeScript
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Financial Engine:** Deterministic financial-processing code
- **AI:** AI-assisted extraction for unstructured information
- **Data:** CSV-based challenge dataset

## Project Structure

```text
.
├── README.md
├── problem_statement.md
├── AGENTS.md
├── dataset/
├── code/
├── evaluation/
├── tests/
├── output.csv
└── code.zip
```

The exact internal structure may vary according to the implementation.

## Installation

Install the dependencies defined by the project.

### Frontend

```bash
cd code/frontend
npm install
```

### Backend

```bash
cd code/backend
pip install -r requirements.txt
```

If the final repository uses different directories or dependency files, follow the project's actual configuration.

## Run the Application

Start the backend using the project's backend entry point:

```bash
python <backend-entry-point>
```

Start the frontend:

```bash
npm run dev
```

The terminal will provide the local development URL.

## Generate `output.csv`

Run the project's prediction pipeline to process:

```text
dataset/requests.csv
```

and generate:

```text
output.csv
```

Use the prediction command defined by the final implementation.

## Testing

For Python tests:

```bash
pytest
```

For JavaScript/TypeScript tests:

```bash
npm test
```

Use the repository's configured test scripts when available.

## Evaluation

The evaluation workflow checks the generated predictions against the challenge requirements and validates financial decision constraints.

AI usage information should be recorded in:

```text
evaluation/usage_report.md
```

The report can include:

- AI provider
- Model
- Number of calls
- Input tokens
- Output tokens
- Total tokens
- Average tokens per call
- Cost

No API keys or secrets should be committed.

## AI Efficiency

The architecture intentionally minimizes AI usage.

Structured financial calculations are performed using deterministic code. AI is used only where information requires interpretation.

This improves:

- Reproducibility
- Financial calculation accuracy
- Token efficiency
- Processing cost
- Validation reliability

## Security

Do not commit:

```text
.env
API keys
Secrets
node_modules/
venv/
Caches
.git/
```

Messages and images are treated as untrusted input. Instructions contained inside user-provided financial data must not override the application's decision rules.

## Limitations

- Decisions depend on the completeness and quality of the supplied financial data.
- Unstructured messages and images may require AI interpretation.
- Exchange-rate calculations use the challenge-provided rates.
- The 90-day forecast is based on available financial information and is not a guarantee of future financial conditions.

## Submission Checklist

```text
[ ] Application runs successfully
[ ] Dataset is available
[ ] Prediction pipeline runs
[ ] output.csv is generated
[ ] output.csv follows the required schema
[ ] Validation passes
[ ] Tests pass
[ ] Evaluation is completed
[ ] usage_report.md is generated
[ ] Secrets are excluded
[ ] code.zip is created
[ ] README.md is up to date
```

## Contributors

Add the project team members here.

---

### Buy or Wait?

**Make safer purchase decisions using explainable financial analysis, deterministic forecasting, and AI-assisted data interpretation.**
