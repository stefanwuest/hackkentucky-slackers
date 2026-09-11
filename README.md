# Zywave Prospect Intelligence

Give brokers a reason to call.

Brokers spend hours digging through public filings to decide which prospects are worth calling and why. This project turns public Form 5500 and Schedule A filings into clear, actionable prospect intelligence so brokers can prioritize outreach and start better conversations.

## Challenge

**Reward:** $200  
**Sponsor:** Zywave

Public employee-benefit filings contain valuable signals about renewal timing, carrier relationships, plan structure, premiums, participant counts, and potential coverage gaps. The problem is that this information is hard to find, normalize, and translate into a useful sales motion.

## What This Builds

For a given set of employers, the tool can generate a one-page broker report that highlights:

- **Likely renewal timing** based on filing and plan-year information
- **Reason to call now** using recent filing signals or upcoming renewal windows
- **One coverage gap** compared with similar companies
- **Key plan details** pulled from Form 5500 and Schedule A filings
- **Broker-facing talking points** for prospect engagement
- **Relevant employer context** that helps prioritize outreach

## Core Workflow

1. Input a list of target employers.
2. Scrape or ingest public Form 5500 and Schedule A filings.
3. Extract useful benefits and insurance data.
4. Compare each employer against similar companies.
5. Generate a concise prospect report with recommended outreach rationale.

## Example Report Sections

- Employer overview
- Plan year and likely renewal window
- Current carriers and coverage lines
- Premium and participant trends
- Benchmark comparison
- Identified coverage gap
- Recommended call reason
- Suggested broker talking points

## Stretch Goal

A dashboard that makes prospect decision-making and engagement easier by showing:

- Ranked prospect list
- Renewal timing calendar
- Coverage-gap filters
- Employer comparison views
- One-click report access
- Outreach-ready call reasons

## Data Sources

Suggested starting points:

- Public Form 5500 filings
- Schedule A insurance information
- Employer metadata
- Comparable-company benchmarks

## Why It Matters

Instead of asking brokers to manually dig through filings, this project converts public compliance data into timely, practical sales intelligence. The result is faster prospect qualification, better outreach timing, and clearer reasons to call.

## API

### `GET /renewals`

Returns Schedule A renewals for a required sponsor mailing `state`.

Query parameters:

- `state` — required 2-letter value present in the Schedule A/Form 5500 join.
- `coverage_type` — optional array; pass repeated params (`?coverage_type=health&coverage_type=dental`) or comma-separated (`?coverage_type=health,dental`). Supported values: `health`, `dental`, `vision`, `life_insurance`, `short_term_disability`, `long_term_disability`, `unemployment`, `prescription_drug`, `stop_loss`, `hmo`, `ppo`, `indemnity`, `other`.
- `days_to_renewal` — optional integer from `0` to `365`; keeps renewals whose estimated renewal date is within that many days from today.

The estimated renewal date reuses the policy `INS_POLICY_TO_DATE` month/day in the current year. If that date is already past, the endpoint uses the next year.

Example:

```txt
/renewals?state=KY&coverage_type=health,dental&days_to_renewal=90
```

Response shape:

```json
{
  "filters": {
    "state": "KY",
    "coverage_type": ["health", "dental"],
    "days_to_renewal": 90
  },
  "metadata": {
    "as_of_date": "YYYY-MM-DD",
    "allowed_coverage_types": [{ "value": "health", "label": "Health" }],
    "allowed_states": ["KY"]
  },
  "count": 1,
  "renewals": [
    {
      "ack_id": "string",
      "plan_name": "string | null",
      "sponsor": {
        "name": "string | null",
        "ein": "string | null",
        "city": "string | null",
        "state": "string | null",
        "zip": "string | null"
      },
      "carrier": {
        "name": "string | null",
        "ein": "string | null",
        "naic_code": "string | null",
        "contract_number": "string | null"
      },
      "coverage_types": ["health"],
      "other_coverage_text": "string | null",
      "covered_lives_eoy": "number | null",
      "policy_from_date": "YYYY-MM-DD | null",
      "policy_to_date": "YYYY-MM-DD | null",
      "estimated_renewal_date": "YYYY-MM-DD",
      "days_until_renewal": 42,
      "premium_received_amount": "number | null",
      "total_earned_premium_amount": "number | null"
    }
  ]
}
```

### `GET /scattered-renewals`

Finds employers whose renewals are scattered across distinct carriers, contract numbers, or policy end-date months, grouped by employer and coverage type.

Query parameters:

- `state` — required 2-letter value present in the Schedule A/Form 5500 join.
- `coverage_type` — optional array; same supported values and formats as `/renewals`.
- `carrier_count` — optional positive integer minimum for distinct carriers.
- `contract_count` — optional positive integer minimum for distinct contract numbers.
- `end_month_count` — optional positive integer minimum for distinct policy end-date months.

If any count filters are provided, they are treated as minimums and combined with AND. If no count filters are provided, the endpoint returns groups with multiple carriers, multiple contracts, or multiple end-date months.

Example:

```txt
/scattered-renewals?state=KY&coverage_type=health&carrier_count=2&end_month_count=2
```

Response shape:

```json
{
  "filters": {
    "state": "KY",
    "coverage_type": ["health"],
    "carrier_count": 2,
    "contract_count": null,
    "end_month_count": 2
  },
  "metadata": {
    "count_filter_semantics": "Provided count filters are minimums and are combined with AND.",
    "allowed_coverage_types": [{ "value": "health", "label": "Health" }],
    "allowed_states": ["KY"]
  },
  "count": 1,
  "scattered_renewals": [
    {
      "sponsor": {
        "name": "string | null",
        "ein": "string | null",
        "city": "string | null",
        "state": "string | null",
        "zip": "string | null"
      },
      "coverage_type": "health",
      "scatter_reasons": ["multiple_carriers", "multiple_end_months"],
      "carrier_count": 2,
      "contract_count": 1,
      "end_month_count": 2,
      "row_count": 2,
      "carriers": [
        {
          "name": "string | null",
          "ein": "string | null",
          "naic_code": "string | null"
        }
      ],
      "contracts": [
        {
          "contract_number": "string | null",
          "carrier_name": "string | null"
        }
      ],
      "end_months": [
        {
          "month": 1,
          "label": "January",
          "policy_to_dates": ["YYYY-MM-DD"]
        }
      ],
      "plans": [
        {
          "ack_id": "string",
          "plan_name": "string | null",
          "carrier_name": "string | null",
          "carrier_ein": "string | null",
          "carrier_naic_code": "string | null",
          "contract_number": "string | null",
          "policy_from_date": "YYYY-MM-DD | null",
          "policy_to_date": "YYYY-MM-DD | null",
          "policy_end_month": 1,
          "covered_lives_eoy": "number | null",
          "premium_received_amount": "number | null",
          "total_earned_premium_amount": "number | null"
        }
      ]
    }
  ]
}
```

Requires the seeded D1 database to be bound as `DB` (configured in `wrangler.jsonc`).

## Development

Install dependencies, create your local env file, and run the local development server:

```txt
npm install
cp .env.example .env
npm run dev
```

Deploy the Cloudflare Worker:

```txt
npm run deploy
```

Generate/synchronize types based on your Worker configuration:

```txt
npm run cf-typegen
```

Seed a Cloudflare D1 SQL database from the two public filing datasets in `datasets/`:

```txt
# build db/generated/seed-d1.sql
npm run seed:d1

# build and apply locally (uses D1_DATABASE_BINDING from .env when --db is omitted)
npm run seed:d1 -- --apply --local

# or explicitly provide a database name/binding
npm run seed:d1 -- --db <DATABASE_NAME_OR_BINDING> --apply --local

# build and apply to Cloudflare
npm run seed:d1 -- --db <DATABASE_NAME_OR_BINDING> --apply --remote
```

The seed reads each `*_layout.txt` file for types/header validation, then ingests prospect-relevant columns from `f_5500_2025_latest.csv` into `form_5500_2025_latest` and `F_SCH_A_2025_latest.csv` into `schedule_a_2025_latest`.

See the [Wrangler types documentation](https://developers.cloudflare.com/workers/wrangler/commands/#types) for more details.

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
