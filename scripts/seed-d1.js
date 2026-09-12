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

const outputPath = path.join(root, 'seed.sql')

function sql(value) {
  if (value === null || value === undefined || value === '') {
    return 'NULL'
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL'
  }

  return `'${String(value).replace(/'/g, "''")}'`
}

console.log('Reading Form 5500...')
const form5500Csv = fs.readFileSync(form5500Path, 'utf8')
const form5500Rows = parseForm5500(form5500Csv)

console.log(`Parsed ${form5500Rows.length} Form 5500 rows`)

console.log('Reading Schedule A...')
const scheduleACsv = fs.readFileSync(scheduleAPath, 'utf8')
const scheduleARows = parseScheduleA(scheduleACsv)

console.log(`Parsed ${scheduleARows.length} Schedule A rows`)

const statements = []

// ---------------------------------------------------------------------
// Form 5500
// ---------------------------------------------------------------------

for (const row of form5500Rows) {
  statements.push(`
INSERT OR REPLACE INTO form_5500 (
  ein,
  sponsorName,
  planName,
  planYearBegin,
  taxPeriod,
  activeParticipants,
  businessCode,
  city,
  state
) VALUES (
  ${sql(row.ein)},
  ${sql(row.sponsorName)},
  ${sql(row.planName)},
  ${sql(row.planYearBegin)},
  ${sql(row.taxPeriod)},
  ${sql(row.activeParticipants)},
  ${sql(row.businessCode)},
  ${sql(row.city)},
  ${sql(row.state)}
);`)
}

// ---------------------------------------------------------------------
// Schedule A
// ---------------------------------------------------------------------

for (const row of scheduleARows) {
  statements.push(`
INSERT INTO schedule_a (
  ackId,
  ein,
  carrierName,
  personsCovered,
  policyFrom,
  policyTo,
  earnedPremium,
  brokerCommission,
  benefits
) VALUES (
  ${sql(row.ackId)},
  ${sql(row.ein)},
  ${sql(row.carrierName)},
  ${sql(row.personsCovered)},
  ${sql(row.policyFrom)},
  ${sql(row.policyTo)},
  ${sql(row.earnedPremium)},
  ${sql(row.brokerCommission)},
  ${sql(JSON.stringify(row.benefits))}
);`)
}

fs.writeFileSync(
  outputPath,
  `PRAGMA foreign_keys = OFF;\n\n${statements.join('\n')}\n`
)

console.log(`\nWrote ${statements.length} SQL statements`)
console.log(`Output: ${outputPath}`)

