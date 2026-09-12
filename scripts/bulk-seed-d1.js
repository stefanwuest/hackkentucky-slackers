import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseForm5500, parseScheduleA } from '../src/lib/dataLoader.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const form5500Path = path.join(
  root,
  'public/data/f_5500_2025_latest.csv'
)

const scheduleAPath = path.join(
  root,
  'public/data/F_SCH_A_2025_latest.csv'
)

const formOutput = path.join(root, 'seed-form5500.sql')
const scheduleOutput = path.join(root, 'seed-schedule-a.sql')

const BATCH_SIZE = 300

function sql(value) {
  if (value === null || value === undefined || value === '') {
    return 'NULL'
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL'
  }

  return `'${String(value).replace(/'/g, "''")}'`
}

function makeBatches(rows, columns, valuesForRow) {
  const statements = []

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    const values = batch
      .map((row) => `(${valuesForRow(row).join(', ')})`)
      .join(',\n')

    statements.push(
      `INSERT INTO ${columns.table} (${columns.names.join(', ')}) VALUES\n${values};`
    )

    if ((i + BATCH_SIZE) % 3000 === 0 || i + BATCH_SIZE >= rows.length) {
      console.log(
        `  Prepared ${Math.min(i + BATCH_SIZE, rows.length).toLocaleString()} / ${rows.length.toLocaleString()}`
      )
    }
  }

  return statements
}

console.log('Reading Form 5500...')
const form5500Csv = fs.readFileSync(form5500Path, 'utf8')
const form5500Rows = parseForm5500(form5500Csv)

console.log(`Form 5500 rows: ${form5500Rows.length.toLocaleString()}`)

const duplicateIds = new Set()
const seenIds = new Set()

for (const row of form5500Rows) {
  if (!row.ackId) {
    throw new Error('Found Form 5500 row with missing ACK_ID')
  }

  if (seenIds.has(row.ackId)) {
    duplicateIds.add(row.ackId)
  }

  seenIds.add(row.ackId)
}

if (duplicateIds.size > 0) {
  throw new Error(
    `Found ${duplicateIds.size} duplicate ACK_ID values`
  )
}

console.log('\nBuilding Form 5500 SQL...')

const formStatements = makeBatches(
  form5500Rows,
  {
    table: 'form_5500',
    names: [
      'ackId',
      'ein',
      'sponsorName',
      'planName',
      'planYearBegin',
      'taxPeriod',
      'activeParticipants',
      'businessCode',
      'city',
      'state',
    ],
  },
  (row) => [
    sql(row.ackId),
    sql(row.ein),
    sql(row.sponsorName),
    sql(row.planName),
    sql(row.planYearBegin),
    sql(row.taxPeriod),
    sql(row.activeParticipants),
    sql(row.businessCode),
    sql(row.city),
    sql(row.state),
  ]
)

fs.writeFileSync(
  formOutput,
  `PRAGMA foreign_keys = OFF;\n\n${formStatements.join('\n\n')}\n`
)

console.log(`Wrote ${formOutput}`)
console.log(`Form SQL size: ${(fs.statSync(formOutput).size / 1024 / 1024).toFixed(1)} MB`)

console.log('\nReading Schedule A...')
const scheduleACsv = fs.readFileSync(scheduleAPath, 'utf8')
const scheduleARows = parseScheduleA(scheduleACsv)

console.log(`Schedule A rows: ${scheduleARows.length.toLocaleString()}`)

console.log('\nBuilding Schedule A SQL...')

const scheduleStatements = makeBatches(
  scheduleARows,
  {
    table: 'schedule_a',
    names: [
      'ackId',
      'ein',
      'carrierName',
      'personsCovered',
      'policyFrom',
      'policyTo',
      'earnedPremium',
      'brokerCommission',
      'benefits',
    ],
  },
  (row) => [
    sql(row.ackId),
    sql(row.ein),
    sql(row.carrierName),
    sql(row.personsCovered),
    sql(row.policyFrom),
    sql(row.policyTo),
    sql(row.earnedPremium),
    sql(row.brokerCommission),
    sql(JSON.stringify(row.benefits)),
  ]
)

fs.writeFileSync(
  scheduleOutput,
  `PRAGMA foreign_keys = OFF;\n\n${scheduleStatements.join('\n\n')}\n`
)

console.log(`Wrote ${scheduleOutput}`)
console.log(
  `Schedule SQL size: ${(fs.statSync(scheduleOutput).size / 1024 / 1024).toFixed(1)} MB`
)

console.log('\nDone.')

