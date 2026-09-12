#!/usr/bin/env node
import 'dotenv/config'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'
import { spawnSync } from 'node:child_process'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DEFAULT_WRANGLER_CONFIG = 'apps/api/wrangler.jsonc'

const DATASETS = [
  {
    table: 'form_5500_2025_latest',
    csv: 'datasets/f_5500_2025_latest.csv',
    layout: 'datasets/f_5500_2025_latest_layout.txt',
    primaryKey: 'ACK_ID',
    columns: [
      'ACK_ID',
      'FORM_PLAN_YEAR_BEGIN_DATE',
      'FORM_TAX_PRD',
      'INITIAL_FILING_IND',
      'AMENDED_IND',
      'FINAL_FILING_IND',
      'SHORT_PLAN_YR_IND',
      'PLAN_NAME',
      'SPONS_DFE_PN',
      'PLAN_EFF_DATE',
      'SPONSOR_DFE_NAME',
      'SPONS_DFE_DBA_NAME',
      'SPONS_DFE_MAIL_US_CITY',
      'SPONS_DFE_MAIL_US_STATE',
      'SPONS_DFE_MAIL_US_ZIP',
      'SPONS_DFE_LOC_US_CITY',
      'SPONS_DFE_LOC_US_STATE',
      'SPONS_DFE_LOC_US_ZIP',
      'SPONS_DFE_EIN',
      'SPONS_DFE_PHONE_NUM',
      'BUSINESS_CODE',
      'TOT_PARTCP_BOY_CNT',
      'TOT_ACTIVE_PARTCP_CNT',
      'TOT_ACT_PARTCP_BOY_CNT',
      'PARTCP_ACCOUNT_BAL_CNT',
      'TYPE_PENSION_BNFT_CODE',
      'TYPE_WELFARE_BNFT_CODE',
      'FUNDING_INSURANCE_IND',
      'BENEFIT_INSURANCE_IND',
      'SCH_A_ATTACHED_IND',
      'NUM_SCH_A_ATTACHED_CNT',
      'FILING_STATUS',
      'DATE_RECEIVED',
    ],
  },
  {
    table: 'schedule_a_2025_latest',
    csv: 'datasets/F_SCH_A_2025_latest.csv',
    layout: 'datasets/F_SCH_A_2025_latest_layout.txt',
    columns: [
      'ACK_ID',
      'FORM_ID',
      'SCH_A_PLAN_YEAR_BEGIN_DATE',
      'SCH_A_PLAN_YEAR_END_DATE',
      'SCH_A_PLAN_NUM',
      'SCH_A_EIN',
      'INS_CARRIER_NAME',
      'INS_CARRIER_EIN',
      'INS_CARRIER_NAIC_CODE',
      'INS_CONTRACT_NUM',
      'INS_PRSN_COVERED_EOY_CNT',
      'INS_POLICY_FROM_DATE',
      'INS_POLICY_TO_DATE',
      'INS_BROKER_COMM_TOT_AMT',
      'INS_BROKER_FEES_TOT_AMT',
      'WLFR_BNFT_HEALTH_IND',
      'WLFR_BNFT_DENTAL_IND',
      'WLFR_BNFT_VISION_IND',
      'WLFR_BNFT_LIFE_INSUR_IND',
      'WLFR_BNFT_TEMP_DISAB_IND',
      'WLFR_BNFT_LONG_TERM_DISAB_IND',
      'WLFR_BNFT_UNEMP_IND',
      'WLFR_BNFT_DRUG_IND',
      'WLFR_BNFT_STOP_LOSS_IND',
      'WLFR_BNFT_HMO_IND',
      'WLFR_BNFT_PPO_IND',
      'WLFR_BNFT_INDEMNITY_IND',
      'WLFR_BNFT_OTHER_IND',
      'WLFR_TYPE_BNFT_OTH_TEXT',
      'WLFR_PREMIUM_RCVD_AMT',
      'WLFR_TOT_EARNED_PREM_AMT',
      'WLFR_CLAIMS_PAID_AMT',
      'WLFR_INCURRED_CLAIM_AMT',
      'WLFR_RET_COMMISSIONS_AMT',
      'WLFR_RET_ADMIN_AMT',
      'WLFR_RET_TOT_AMT',
      'WLFR_REFUND_AMT',
      'WLFR_HELD_BNFTS_AMT',
      'WLFR_CLAIMS_RESERVE_AMT',
      'WLFR_TOT_CHARGES_PAID_AMT',
      'WLFR_ACQUIS_COST_AMT',
      'INS_FAIL_PROVIDE_INFO_IND',
    ],
    foreignKeys: [
      'FOREIGN KEY ("ACK_ID") REFERENCES "form_5500_2025_latest"("ACK_ID") ON DELETE CASCADE',
    ],
  },
]

function usage() {
  console.log(`Usage:
  node scripts/seed-d1.mjs [database-name] [options]

Builds a SQLite/D1-compatible SQL seed from datasets/*.csv and layouts, then
optionally applies it with Wrangler.

Options:
  --db <name>        D1 database name or binding to pass to wrangler d1 execute
                     Defaults to D1_DATABASE_BINDING or D1_DATABASE_NAME from .env
  --apply            Run wrangler d1 execute after writing the SQL file
  --local            Apply to local D1 database (default when --apply is used)
  --remote           Apply to remote Cloudflare D1 database
  --output <path>    Seed SQL output path (default: db/generated/seed-d1.sql)
  --config <path>    Wrangler config path (default: apps/api/wrangler.jsonc)
  --batch-size <n>   Rows per INSERT statement (default: 25)
  --no-drop          Do not DROP existing dataset tables before creating them
  --schema-only      Create schema/indexes but skip row INSERTs
  --help             Show this help

Examples:
  pnpm seed:d1 -- --output db/generated/seed-d1.sql
  pnpm seed:d1 -- --db MY_DB --apply --local
  pnpm seed:d1 -- --db zywave-prospect-intel --apply --remote
`)
}

function parseArgs(argv) {
  const args = {
    db: undefined,
    apply: false,
    remote: false,
    output: 'db/generated/seed-d1.sql',
    config: DEFAULT_WRANGLER_CONFIG,
    batchSize: 25,
    drop: true,
    schemaOnly: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--') {
      continue
    } else if (arg === '--help' || arg === '-h') {
      usage()
      process.exit(0)
    } else if (arg === '--db') {
      args.db = argv[++i]
    } else if (arg === '--apply') {
      args.apply = true
    } else if (arg === '--local') {
      args.remote = false
    } else if (arg === '--remote') {
      args.remote = true
    } else if (arg === '--output') {
      args.output = argv[++i]
    } else if (arg === '--config') {
      args.config = argv[++i]
    } else if (arg === '--batch-size') {
      args.batchSize = Number(argv[++i])
    } else if (arg === '--no-drop') {
      args.drop = false
    } else if (arg === '--schema-only') {
      args.schemaOnly = true
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`)
    } else if (!args.db) {
      args.db = arg
    } else {
      throw new Error(`Unexpected positional argument: ${arg}`)
    }
  }

  if (!args.db) {
    args.db = process.env.D1_DATABASE_BINDING || process.env.D1_DATABASE_NAME
  }

  if (!Number.isInteger(args.batchSize) || args.batchSize < 1) {
    throw new Error('--batch-size must be a positive integer')
  }
  if (args.apply && !args.db) {
    throw new Error('Provide a database name/binding with --db or as the first positional argument when using --apply')
  }

  args.output = resolve(ROOT, args.output)
  args.config = resolve(ROOT, args.config)
  return args
}

function csvPath(relativePath) {
  return resolve(ROOT, relativePath)
}

function quoteIdent(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`
}

function quoteSql(value) {
  return `'${String(value).replaceAll('\0', '').replaceAll("'", "''")}'`
}

function sqliteType(field) {
  return field.type === 'NUMERIC' ? 'NUMERIC' : 'TEXT'
}

async function write(stream, text) {
  if (!stream.write(text)) {
    await once(stream, 'drain')
  }
}

async function parseLayout(layoutFile) {
  const text = await import('node:fs/promises').then(({ readFile }) => readFile(layoutFile, 'utf8'))
  const fields = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('FIELD_POSITION') || line.startsWith('=')) continue
    const [position, name, type, size] = line.split(',')
    if (!position || !name || !type) {
      throw new Error(`Unable to parse layout line in ${layoutFile}: ${rawLine}`)
    }
    fields.push({
      position: Number(position),
      name,
      type,
      size: size ? Number(size) : undefined,
    })
  }

  fields.sort((a, b) => a.position - b.position)
  fields.forEach((field, index) => {
    const expected = index + 1
    if (field.position !== expected) {
      throw new Error(`${layoutFile} is missing FIELD_POSITION ${expected}`)
    }
  })

  return fields
}

async function* parseCsvRows(file) {
  const stream = createReadStream(file, { encoding: 'utf8' })
  let field = ''
  let row = []
  let inQuotes = false
  let quotePending = false
  let sawAnyCharacter = false
  const completed = []

  const finishField = () => {
    row.push(field)
    field = ''
  }

  const finishRow = () => {
    finishField()
    if (row.length > 0) {
      row[0] = row[0].replace(/^\uFEFF/, '')
      completed.push(row)
    }
    row = []
  }

  for await (const chunk of stream) {
    for (const char of chunk) {
      sawAnyCharacter = true

      if (quotePending) {
        if (char === '"') {
          field += '"'
          quotePending = false
          continue
        }
        inQuotes = false
        quotePending = false
        if (char === ',') {
          finishField()
          continue
        }
        if (char === '\n') {
          finishRow()
          continue
        }
        if (char === '\r') {
          continue
        }
        field += char
        continue
      }

      if (inQuotes) {
        if (char === '"') {
          quotePending = true
        } else {
          field += char
        }
        continue
      }

      if (char === '"' && field.length === 0) {
        inQuotes = true
      } else if (char === ',') {
        finishField()
      } else if (char === '\n') {
        finishRow()
      } else if (char !== '\r') {
        field += char
      }
    }

    while (completed.length > 0) {
      yield completed.shift()
    }
  }

  if (quotePending) {
    quotePending = false
    inQuotes = false
  }
  if (inQuotes) {
    throw new Error(`Unclosed quoted CSV field in ${file}`)
  }
  if (sawAnyCharacter && (field.length > 0 || row.length > 0)) {
    finishRow()
  }
  while (completed.length > 0) {
    yield completed.shift()
  }
}

function sqlValue(value, field) {
  if (value == null || value === '') return 'NULL'

  if (field.type === 'NUMERIC') {
    const trimmed = value.trim()
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) {
      return trimmed
    }
    return quoteSql(trimmed)
  }

  return quoteSql(value)
}

function selectedFieldsForDataset(dataset, fields) {
  const fieldByName = new Map(fields.map((field) => [field.name, field]))
  const selectedFields = dataset.columns.map((name) => {
    const field = fieldByName.get(name)
    if (!field) {
      throw new Error(`${dataset.layout} does not contain selected column ${name}`)
    }
    return field
  })

  return selectedFields
}

function createTableSql(dataset, fields) {
  const selectedFields = selectedFieldsForDataset(dataset, fields)
  const constraints = []
  const columns = selectedFields.map((field) => {
    const parts = [quoteIdent(field.name), sqliteType(field)]
    if (dataset.primaryKey === field.name) parts.push('PRIMARY KEY')
    return `  ${parts.join(' ')}`
  })

  if (dataset.foreignKeys) {
    constraints.push(...dataset.foreignKeys.map((fk) => `  ${fk}`))
  }

  return `CREATE TABLE IF NOT EXISTS ${quoteIdent(dataset.table)} (\n${columns.concat(constraints).join(',\n')}\n);\n`
}

function derivedTableNames() {
  return [
    'contract_coverage_types',
    'company_contract_summary',
    'insurance_contracts',
    'filings',
    'plans',
    'companies',
  ]
}

function derivedSchemaSql() {
  return `
CREATE TABLE IF NOT EXISTS "companies" (
  "company_id" TEXT PRIMARY KEY,
  "source_key_type" TEXT NOT NULL,
  "sponsor_ein" TEXT,
  "normalized_name" TEXT NOT NULL,
  "display_name" TEXT,
  "dba_name" TEXT,
  "mail_city" TEXT,
  "mail_state" TEXT,
  "mail_zip" TEXT,
  "loc_city" TEXT,
  "loc_state" TEXT,
  "loc_zip" TEXT,
  "phone" TEXT,
  "business_code" TEXT,
  "filing_count" INTEGER NOT NULL DEFAULT 0,
  "plan_count" INTEGER NOT NULL DEFAULT 0,
  "latest_date_received" TEXT
);

CREATE TABLE IF NOT EXISTS "plans" (
  "plan_id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "sponsor_plan_number" TEXT,
  "plan_name" TEXT,
  "normalized_plan_name" TEXT,
  "plan_effective_date" TEXT,
  "filing_count" INTEGER NOT NULL DEFAULT 0,
  "latest_ack_id" TEXT,
  FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "filings" (
  "ack_id" TEXT PRIMARY KEY,
  "company_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "form_plan_year_begin_date" TEXT,
  "form_tax_prd" TEXT,
  "initial_filing_ind" TEXT,
  "amended_ind" TEXT,
  "final_filing_ind" TEXT,
  "short_plan_year_ind" TEXT,
  "filing_status" TEXT,
  "date_received" TEXT,
  "total_participants_boy" NUMERIC,
  "total_active_participants" NUMERIC,
  "total_active_participants_boy" NUMERIC,
  "participant_account_balance_count" NUMERIC,
  "type_pension_benefit_code" TEXT,
  "type_welfare_benefit_code" TEXT,
  "funding_insurance_ind" TEXT,
  "benefit_insurance_ind" TEXT,
  "schedule_a_attached_ind" TEXT,
  "schedule_a_attached_count" NUMERIC,
  FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE CASCADE,
  FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id") ON DELETE CASCADE,
  FOREIGN KEY ("ack_id") REFERENCES "form_5500_2025_latest"("ACK_ID") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "insurance_contracts" (
  "contract_id" TEXT PRIMARY KEY,
  "raw_schedule_a_rowid" INTEGER NOT NULL,
  "ack_id" TEXT NOT NULL,
  "company_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "form_id" TEXT,
  "schedule_a_plan_year_begin_date" TEXT,
  "schedule_a_plan_year_end_date" TEXT,
  "schedule_a_plan_number" TEXT,
  "schedule_a_ein" TEXT,
  "carrier_name" TEXT,
  "carrier_ein" TEXT,
  "carrier_naic_code" TEXT,
  "carrier_key" TEXT,
  "contract_number" TEXT,
  "contract_key" TEXT,
  "covered_lives_eoy" NUMERIC,
  "policy_from_date" TEXT,
  "policy_to_date" TEXT,
  "policy_end_month" TEXT,
  "policy_end_month_day" TEXT,
  "broker_commission_total" NUMERIC,
  "broker_fees_total" NUMERIC,
  "premium_received" NUMERIC,
  "total_earned_premium" NUMERIC,
  "claims_paid" NUMERIC,
  "incurred_claims" NUMERIC,
  "retained_commissions" NUMERIC,
  "retained_admin" NUMERIC,
  "retained_total" NUMERIC,
  "refund_amount" NUMERIC,
  "held_benefits" NUMERIC,
  "claims_reserve" NUMERIC,
  "total_charges_paid" NUMERIC,
  "acquisition_cost" NUMERIC,
  "failed_to_provide_info_ind" TEXT,
  "other_coverage_text" TEXT,
  FOREIGN KEY ("ack_id") REFERENCES "filings"("ack_id") ON DELETE CASCADE,
  FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE CASCADE,
  FOREIGN KEY ("plan_id") REFERENCES "plans"("plan_id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "contract_coverage_types" (
  "contract_id" TEXT NOT NULL,
  "coverage_type" TEXT NOT NULL,
  PRIMARY KEY ("contract_id", "coverage_type"),
  FOREIGN KEY ("contract_id") REFERENCES "insurance_contracts"("contract_id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "company_contract_summary" (
  "company_id" TEXT PRIMARY KEY,
  "contract_count" INTEGER NOT NULL DEFAULT 0,
  "carrier_count" INTEGER NOT NULL DEFAULT 0,
  "contract_number_count" INTEGER NOT NULL DEFAULT 0,
  "policy_end_month_count" INTEGER NOT NULL DEFAULT 0,
  "earliest_policy_to_date" TEXT,
  "latest_policy_to_date" TEXT,
  "total_covered_lives_eoy" NUMERIC,
  "total_premium_received" NUMERIC,
  "total_earned_premium" NUMERIC,
  FOREIGN KEY ("company_id") REFERENCES "companies"("company_id") ON DELETE CASCADE
);
`
}

function derivedPopulateSql() {
  const formBaseCte = `
WITH form_base AS (
  SELECT
    f.*,
    CASE
      WHEN NULLIF(TRIM(f."SPONS_DFE_EIN"), '') IS NOT NULL THEN 'ein:' || TRIM(f."SPONS_DFE_EIN")
      ELSE 'name:' || LOWER(TRIM(REPLACE(REPLACE(REPLACE(COALESCE(f."SPONSOR_DFE_NAME", ''), char(9), ' '), '.', ''), ',', ''))) ||
        '|state:' || COALESCE(NULLIF(TRIM(f."SPONS_DFE_MAIL_US_STATE"), ''), 'unknown') ||
        '|zip:' || COALESCE(NULLIF(SUBSTR(TRIM(f."SPONS_DFE_MAIL_US_ZIP"), 1, 5), ''), 'unknown')
    END AS company_id,
    CASE WHEN NULLIF(TRIM(f."SPONS_DFE_EIN"), '') IS NOT NULL THEN 'ein' ELSE 'name_state_zip' END AS source_key_type,
    LOWER(TRIM(REPLACE(REPLACE(REPLACE(COALESCE(f."SPONSOR_DFE_NAME", ''), char(9), ' '), '.', ''), ',', ''))) AS normalized_name,
    LOWER(TRIM(REPLACE(REPLACE(REPLACE(COALESCE(f."PLAN_NAME", ''), char(9), ' '), '.', ''), ',', ''))) AS normalized_plan_name
  FROM "form_5500_2025_latest" f
), form_keys AS (
  SELECT
    form_base.*,
    form_base.company_id || ':plan:' ||
      CASE
        WHEN NULLIF(TRIM(form_base."SPONS_DFE_PN"), '') IS NOT NULL THEN 'pn:' || TRIM(form_base."SPONS_DFE_PN")
        ELSE 'name:' || form_base.normalized_plan_name
      END AS plan_id
  FROM form_base
)`

  return `
${formBaseCte}, ranked_companies AS (
  SELECT
    form_keys.*,
    ROW_NUMBER() OVER (
      PARTITION BY company_id
      ORDER BY COALESCE("DATE_RECEIVED", '') DESC, COALESCE("FORM_PLAN_YEAR_BEGIN_DATE", '') DESC, "ACK_ID" DESC
    ) AS company_rank
  FROM form_keys
), company_counts AS (
  SELECT
    company_id,
    COUNT(*) AS filing_count,
    COUNT(DISTINCT plan_id) AS plan_count,
    MAX("DATE_RECEIVED") AS latest_date_received
  FROM form_keys
  GROUP BY company_id
)
INSERT INTO "companies" (
  "company_id",
  "source_key_type",
  "sponsor_ein",
  "normalized_name",
  "display_name",
  "dba_name",
  "mail_city",
  "mail_state",
  "mail_zip",
  "loc_city",
  "loc_state",
  "loc_zip",
  "phone",
  "business_code",
  "filing_count",
  "plan_count",
  "latest_date_received"
)
SELECT
  r.company_id,
  r.source_key_type,
  NULLIF(TRIM(r."SPONS_DFE_EIN"), ''),
  r.normalized_name,
  r."SPONSOR_DFE_NAME",
  r."SPONS_DFE_DBA_NAME",
  r."SPONS_DFE_MAIL_US_CITY",
  r."SPONS_DFE_MAIL_US_STATE",
  r."SPONS_DFE_MAIL_US_ZIP",
  r."SPONS_DFE_LOC_US_CITY",
  r."SPONS_DFE_LOC_US_STATE",
  r."SPONS_DFE_LOC_US_ZIP",
  r."SPONS_DFE_PHONE_NUM",
  r."BUSINESS_CODE",
  c.filing_count,
  c.plan_count,
  c.latest_date_received
FROM ranked_companies r
INNER JOIN company_counts c ON c.company_id = r.company_id
WHERE r.company_rank = 1;

${formBaseCte}, ranked_plans AS (
  SELECT
    form_keys.*,
    ROW_NUMBER() OVER (
      PARTITION BY plan_id
      ORDER BY COALESCE("DATE_RECEIVED", '') DESC, COALESCE("FORM_PLAN_YEAR_BEGIN_DATE", '') DESC, "ACK_ID" DESC
    ) AS plan_rank
  FROM form_keys
), plan_counts AS (
  SELECT
    plan_id,
    COUNT(*) AS filing_count
  FROM form_keys
  GROUP BY plan_id
)
INSERT INTO "plans" (
  "plan_id",
  "company_id",
  "sponsor_plan_number",
  "plan_name",
  "normalized_plan_name",
  "plan_effective_date",
  "filing_count",
  "latest_ack_id"
)
SELECT
  r.plan_id,
  r.company_id,
  NULLIF(TRIM(r."SPONS_DFE_PN"), ''),
  r."PLAN_NAME",
  r.normalized_plan_name,
  r."PLAN_EFF_DATE",
  c.filing_count,
  r."ACK_ID"
FROM ranked_plans r
INNER JOIN plan_counts c ON c.plan_id = r.plan_id
WHERE r.plan_rank = 1;

${formBaseCte}
INSERT INTO "filings" (
  "ack_id",
  "company_id",
  "plan_id",
  "form_plan_year_begin_date",
  "form_tax_prd",
  "initial_filing_ind",
  "amended_ind",
  "final_filing_ind",
  "short_plan_year_ind",
  "filing_status",
  "date_received",
  "total_participants_boy",
  "total_active_participants",
  "total_active_participants_boy",
  "participant_account_balance_count",
  "type_pension_benefit_code",
  "type_welfare_benefit_code",
  "funding_insurance_ind",
  "benefit_insurance_ind",
  "schedule_a_attached_ind",
  "schedule_a_attached_count"
)
SELECT
  "ACK_ID",
  company_id,
  plan_id,
  "FORM_PLAN_YEAR_BEGIN_DATE",
  "FORM_TAX_PRD",
  "INITIAL_FILING_IND",
  "AMENDED_IND",
  "FINAL_FILING_IND",
  "SHORT_PLAN_YR_IND",
  "FILING_STATUS",
  "DATE_RECEIVED",
  "TOT_PARTCP_BOY_CNT",
  "TOT_ACTIVE_PARTCP_CNT",
  "TOT_ACT_PARTCP_BOY_CNT",
  "PARTCP_ACCOUNT_BAL_CNT",
  "TYPE_PENSION_BNFT_CODE",
  "TYPE_WELFARE_BNFT_CODE",
  "FUNDING_INSURANCE_IND",
  "BENEFIT_INSURANCE_IND",
  "SCH_A_ATTACHED_IND",
  "NUM_SCH_A_ATTACHED_CNT"
FROM form_keys;

INSERT INTO "insurance_contracts" (
  "contract_id",
  "raw_schedule_a_rowid",
  "ack_id",
  "company_id",
  "plan_id",
  "form_id",
  "schedule_a_plan_year_begin_date",
  "schedule_a_plan_year_end_date",
  "schedule_a_plan_number",
  "schedule_a_ein",
  "carrier_name",
  "carrier_ein",
  "carrier_naic_code",
  "carrier_key",
  "contract_number",
  "contract_key",
  "covered_lives_eoy",
  "policy_from_date",
  "policy_to_date",
  "policy_end_month",
  "policy_end_month_day",
  "broker_commission_total",
  "broker_fees_total",
  "premium_received",
  "total_earned_premium",
  "claims_paid",
  "incurred_claims",
  "retained_commissions",
  "retained_admin",
  "retained_total",
  "refund_amount",
  "held_benefits",
  "claims_reserve",
  "total_charges_paid",
  "acquisition_cost",
  "failed_to_provide_info_ind",
  "other_coverage_text"
)
SELECT
  'schedule_a:' || s.rowid,
  s.rowid,
  s."ACK_ID",
  f."company_id",
  f."plan_id",
  s."FORM_ID",
  s."SCH_A_PLAN_YEAR_BEGIN_DATE",
  s."SCH_A_PLAN_YEAR_END_DATE",
  s."SCH_A_PLAN_NUM",
  s."SCH_A_EIN",
  s."INS_CARRIER_NAME",
  s."INS_CARRIER_EIN",
  s."INS_CARRIER_NAIC_CODE",
  CASE
    WHEN NULLIF(TRIM(COALESCE(s."INS_CARRIER_NAME", '')), '') IS NULL
      AND NULLIF(TRIM(COALESCE(s."INS_CARRIER_EIN", '')), '') IS NULL
      AND NULLIF(TRIM(COALESCE(s."INS_CARRIER_NAIC_CODE", '')), '') IS NULL THEN NULL
    ELSE LOWER(TRIM(COALESCE(s."INS_CARRIER_NAME", ''))) || '|' ||
      COALESCE(NULLIF(TRIM(s."INS_CARRIER_EIN"), ''), '') || '|' ||
      COALESCE(NULLIF(TRIM(s."INS_CARRIER_NAIC_CODE"), ''), '')
  END,
  s."INS_CONTRACT_NUM",
  NULLIF(UPPER(TRIM(COALESCE(s."INS_CONTRACT_NUM", ''))), ''),
  s."INS_PRSN_COVERED_EOY_CNT",
  s."INS_POLICY_FROM_DATE",
  s."INS_POLICY_TO_DATE",
  CASE WHEN LENGTH(TRIM(COALESCE(s."INS_POLICY_TO_DATE", ''))) >= 7 THEN SUBSTR(TRIM(s."INS_POLICY_TO_DATE"), 6, 2) ELSE NULL END,
  CASE WHEN LENGTH(TRIM(COALESCE(s."INS_POLICY_TO_DATE", ''))) >= 10 THEN SUBSTR(TRIM(s."INS_POLICY_TO_DATE"), 6, 5) ELSE NULL END,
  s."INS_BROKER_COMM_TOT_AMT",
  s."INS_BROKER_FEES_TOT_AMT",
  s."WLFR_PREMIUM_RCVD_AMT",
  s."WLFR_TOT_EARNED_PREM_AMT",
  s."WLFR_CLAIMS_PAID_AMT",
  s."WLFR_INCURRED_CLAIM_AMT",
  s."WLFR_RET_COMMISSIONS_AMT",
  s."WLFR_RET_ADMIN_AMT",
  s."WLFR_RET_TOT_AMT",
  s."WLFR_REFUND_AMT",
  s."WLFR_HELD_BNFTS_AMT",
  s."WLFR_CLAIMS_RESERVE_AMT",
  s."WLFR_TOT_CHARGES_PAID_AMT",
  s."WLFR_ACQUIS_COST_AMT",
  s."INS_FAIL_PROVIDE_INFO_IND",
  s."WLFR_TYPE_BNFT_OTH_TEXT"
FROM "schedule_a_2025_latest" s
INNER JOIN "filings" f ON f."ack_id" = s."ACK_ID";

INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'health' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_HEALTH_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'dental' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_DENTAL_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'vision' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_VISION_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'life_insurance' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_LIFE_INSUR_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'short_term_disability' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_TEMP_DISAB_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'long_term_disability' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_LONG_TERM_DISAB_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'unemployment' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_UNEMP_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'prescription_drug' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_DRUG_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'stop_loss' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_STOP_LOSS_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'hmo' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_HMO_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'ppo' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_PPO_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'indemnity' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_INDEMNITY_IND" = '1';
INSERT INTO "contract_coverage_types" ("contract_id", "coverage_type")
SELECT ic."contract_id", 'other' FROM "insurance_contracts" ic INNER JOIN "schedule_a_2025_latest" s ON s.rowid = ic."raw_schedule_a_rowid" WHERE s."WLFR_BNFT_OTHER_IND" = '1';

INSERT INTO "company_contract_summary" (
  "company_id",
  "contract_count",
  "carrier_count",
  "contract_number_count",
  "policy_end_month_count",
  "earliest_policy_to_date",
  "latest_policy_to_date",
  "total_covered_lives_eoy",
  "total_premium_received",
  "total_earned_premium"
)
SELECT
  "company_id",
  COUNT(*) AS contract_count,
  COUNT(DISTINCT "carrier_key") AS carrier_count,
  COUNT(DISTINCT "contract_key") AS contract_number_count,
  COUNT(DISTINCT "policy_end_month") AS policy_end_month_count,
  MIN("policy_to_date") AS earliest_policy_to_date,
  MAX("policy_to_date") AS latest_policy_to_date,
  SUM("covered_lives_eoy") AS total_covered_lives_eoy,
  SUM("premium_received") AS total_premium_received,
  SUM("total_earned_premium") AS total_earned_premium
FROM "insurance_contracts"
GROUP BY "company_id";
`
}

function indexesSql() {
  return `
CREATE INDEX IF NOT EXISTS "idx_form_5500_sponsor_ein" ON "form_5500_2025_latest"("SPONS_DFE_EIN");
CREATE INDEX IF NOT EXISTS "idx_form_5500_sponsor_name" ON "form_5500_2025_latest"("SPONSOR_DFE_NAME");
CREATE INDEX IF NOT EXISTS "idx_form_5500_sponsor_state" ON "form_5500_2025_latest"("SPONS_DFE_MAIL_US_STATE");
CREATE INDEX IF NOT EXISTS "idx_form_5500_plan_year" ON "form_5500_2025_latest"("FORM_PLAN_YEAR_BEGIN_DATE", "FORM_TAX_PRD");
CREATE INDEX IF NOT EXISTS "idx_schedule_a_ack_id" ON "schedule_a_2025_latest"("ACK_ID");
CREATE INDEX IF NOT EXISTS "idx_schedule_a_plan_ein" ON "schedule_a_2025_latest"("SCH_A_EIN");
CREATE INDEX IF NOT EXISTS "idx_schedule_a_carrier_ein" ON "schedule_a_2025_latest"("INS_CARRIER_EIN");
CREATE INDEX IF NOT EXISTS "idx_schedule_a_carrier_name" ON "schedule_a_2025_latest"("INS_CARRIER_NAME");
CREATE INDEX IF NOT EXISTS "idx_schedule_a_policy_dates" ON "schedule_a_2025_latest"("INS_POLICY_FROM_DATE", "INS_POLICY_TO_DATE");
CREATE INDEX IF NOT EXISTS "idx_companies_sponsor_ein" ON "companies"("sponsor_ein");
CREATE INDEX IF NOT EXISTS "idx_companies_mail_state_name" ON "companies"("mail_state", "display_name");
CREATE INDEX IF NOT EXISTS "idx_plans_company_id" ON "plans"("company_id");
CREATE INDEX IF NOT EXISTS "idx_filings_company_id" ON "filings"("company_id");
CREATE INDEX IF NOT EXISTS "idx_filings_plan_id" ON "filings"("plan_id");
CREATE INDEX IF NOT EXISTS "idx_insurance_contracts_company_policy_to" ON "insurance_contracts"("company_id", "policy_to_date");
CREATE INDEX IF NOT EXISTS "idx_insurance_contracts_plan_id" ON "insurance_contracts"("plan_id");
CREATE INDEX IF NOT EXISTS "idx_insurance_contracts_carrier_key" ON "insurance_contracts"("carrier_key");
CREATE INDEX IF NOT EXISTS "idx_insurance_contracts_contract_key" ON "insurance_contracts"("contract_key");
CREATE INDEX IF NOT EXISTS "idx_insurance_contracts_policy_end_month" ON "insurance_contracts"("policy_end_month");
CREATE INDEX IF NOT EXISTS "idx_contract_coverage_types_coverage" ON "contract_coverage_types"("coverage_type", "contract_id");
`
}

async function writeDatasetInserts(stream, dataset, fields, batchSize) {
  const selectedFields = selectedFieldsForDataset(dataset, fields)
  const selectedIndexes = selectedFields.map((field) => field.position - 1)
  const columns = selectedFields.map((field) => quoteIdent(field.name)).join(', ')
  let rowNumber = 0
  let inserted = 0
  let batch = []

  for await (const row of parseCsvRows(csvPath(dataset.csv))) {
    rowNumber++

    if (rowNumber === 1) {
      const expected = fields.map((field) => field.name)
      if (row.length !== expected.length || row.some((value, index) => value !== expected[index])) {
        throw new Error(
          `${dataset.csv} header does not match ${dataset.layout}.\n` +
            `Expected: ${expected.join(',')}\n` +
            `Actual:   ${row.join(',')}`,
        )
      }
      continue
    }

    if (row.length !== fields.length) {
      throw new Error(`${dataset.csv} row ${rowNumber} has ${row.length} columns; expected ${fields.length}`)
    }

    batch.push(
      `(${selectedFields.map((field, index) => sqlValue(row[selectedIndexes[index]], field)).join(', ')})`,
    )
    inserted++

    if (batch.length >= batchSize) {
      await write(stream, `INSERT INTO ${quoteIdent(dataset.table)} (${columns}) VALUES\n${batch.join(',\n')};\n`)
      batch = []
    }
  }

  if (batch.length > 0) {
    await write(stream, `INSERT INTO ${quoteIdent(dataset.table)} (${columns}) VALUES\n${batch.join(',\n')};\n`)
  }

  return inserted
}

async function buildSeed(args) {
  const outputDir = dirname(args.output)
  await mkdir(outputDir, { recursive: true })
  await rm(args.output, { force: true })

  const stream = createWriteStream(args.output, { flags: 'wx' })
  const layouts = new Map()
  const rowCounts = new Map()

  try {
    await write(stream, `-- Generated by scripts/seed-d1.mjs at ${new Date().toISOString()}\n`)
    await write(stream, `-- Source datasets: ${DATASETS.map((dataset) => dataset.csv).join(', ')}\n\n`)
    await write(stream, 'PRAGMA foreign_keys = OFF;\n')
    await write(stream, 'BEGIN TRANSACTION;\n\n')

    if (args.drop) {
      for (const table of derivedTableNames()) {
        await write(stream, `DROP TABLE IF EXISTS ${quoteIdent(table)};\n`)
      }
      for (const dataset of [...DATASETS].reverse()) {
        await write(stream, `DROP TABLE IF EXISTS ${quoteIdent(dataset.table)};\n`)
      }
      await write(stream, 'DROP TABLE IF EXISTS "seed_metadata";\n\n')
    }

    for (const dataset of DATASETS) {
      const fields = await parseLayout(csvPath(dataset.layout))
      layouts.set(dataset.table, fields)
      await write(stream, createTableSql(dataset, fields) + '\n')
    }

    await write(stream, derivedSchemaSql() + '\n')

    await write(stream, `CREATE TABLE IF NOT EXISTS "seed_metadata" (\n  "dataset" TEXT PRIMARY KEY,\n  "source_csv" TEXT NOT NULL,\n  "source_layout" TEXT NOT NULL,\n  "row_count" INTEGER NOT NULL,\n  "seeded_at" TEXT NOT NULL\n);\n\n`)

    if (!args.schemaOnly) {
      for (const dataset of DATASETS) {
        const count = await writeDatasetInserts(stream, dataset, layouts.get(dataset.table), args.batchSize)
        rowCounts.set(dataset.table, count)
        await write(stream, '\n')
      }

      await write(stream, derivedPopulateSql() + '\n')
    }

    await write(stream, indexesSql())

    for (const dataset of DATASETS) {
      const count = rowCounts.get(dataset.table) ?? 0
      await write(
        stream,
        `INSERT OR REPLACE INTO "seed_metadata" ("dataset", "source_csv", "source_layout", "row_count", "seeded_at") VALUES (${quoteSql(dataset.table)}, ${quoteSql(dataset.csv)}, ${quoteSql(dataset.layout)}, ${count}, datetime('now'));\n`,
      )
    }

    await write(stream, '\nCOMMIT;\n')
    await write(stream, 'PRAGMA foreign_keys = ON;\n')
  } finally {
    stream.end()
    await once(stream, 'finish')
  }

  return { output: args.output, rowCounts }
}

function applySeed(args) {
  const wranglerArgs = [
    'exec',
    '--workspace',
    '@hackkentucky-slackers/api',
    '--',
    'wrangler',
    '--config',
    args.config,
    'd1',
    'execute',
    args.db,
    args.remote ? '--remote' : '--local',
    `--file=${args.output}`,
  ]
  console.log(`Applying seed with: npm ${wranglerArgs.join(' ')}`)
  const result = spawnSync('npm', wranglerArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`wrangler d1 execute failed with status ${result.status}`)
  }
}

try {
  const args = parseArgs(process.argv.slice(2))
  const { output, rowCounts } = await buildSeed(args)
  console.log(`Wrote ${output}`)
  for (const dataset of DATASETS) {
    console.log(`  ${dataset.table}: ${rowCounts.get(dataset.table) ?? 0} rows`)
  }

  if (args.apply) {
    applySeed(args)
  } else {
    console.log('\nApply it with:')
    console.log(`  npm exec --workspace @hackkentucky-slackers/api -- wrangler --config apps/api/wrangler.jsonc d1 execute <DATABASE_NAME_OR_BINDING> --local --file=${output}`)
    console.log(`  npm exec --workspace @hackkentucky-slackers/api -- wrangler --config apps/api/wrangler.jsonc d1 execute <DATABASE_NAME_OR_BINDING> --remote --file=${output}`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
