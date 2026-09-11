#!/usr/bin/env node
import 'dotenv/config'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'
import { spawnSync } from 'node:child_process'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

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

    await write(stream, `CREATE TABLE IF NOT EXISTS "seed_metadata" (\n  "dataset" TEXT PRIMARY KEY,\n  "source_csv" TEXT NOT NULL,\n  "source_layout" TEXT NOT NULL,\n  "row_count" INTEGER NOT NULL,\n  "seeded_at" TEXT NOT NULL\n);\n\n`)

    if (!args.schemaOnly) {
      for (const dataset of DATASETS) {
        const count = await writeDatasetInserts(stream, dataset, layouts.get(dataset.table), args.batchSize)
        rowCounts.set(dataset.table, count)
        await write(stream, '\n')
      }
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
  const wranglerArgs = ['wrangler', 'd1', 'execute', args.db, args.remote ? '--remote' : '--local', `--file=${args.output}`]
  console.log(`Applying seed with: npx ${wranglerArgs.join(' ')}`)
  const result = spawnSync('npx', wranglerArgs, {
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
    console.log(`  pnpm wrangler d1 execute <DATABASE_NAME_OR_BINDING> --local --file=${output}`)
    console.log(`  pnpm wrangler d1 execute <DATABASE_NAME_OR_BINDING> --remote --file=${output}`)
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
