// src/index.ts
import { Hono } from 'hono'
import { parseForm5500, parseScheduleA } from './lib/dataLoader'

type Bindings = {
  DB: D1Database
  ASSETS: Fetcher
}

const app = new Hono<{ Bindings: Bindings }>()

let cachedProspects: ReturnType<typeof blendProspectData> | null = null

async function getProspects(db: D1Database, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase()

  const stmt = normalizedQuery
    ? db
        .prepare(`
          SELECT *
          FROM form_5500
          WHERE LOWER(TRIM(sponsorName)) LIKE ?
        `)
        .bind(`%${normalizedQuery}%`)
    : db.prepare(`SELECT * FROM form_5500`)

  const { results: form5500Rows } = await stmt.all()

  const ackIds = form5500Rows
    .map((r) => r.ackId)
    .filter(Boolean)

  let scheduleARows: any[] = []

  const CHUNK_SIZE = 200

  for (let i = 0; i < ackIds.length; i += CHUNK_SIZE) {
    const chunk = ackIds.slice(i, i + CHUNK_SIZE)
    const placeholders = chunk.map(() => '?').join(',')

    const { results } = await db
      .prepare(
        `SELECT * FROM schedule_a WHERE ackId IN (${placeholders})`
      )
      .bind(...chunk)
      .all()

    scheduleARows.push(...results)
  }

  scheduleARows = scheduleARows.map((row) => ({
    ...row,
    benefits:
      typeof row.benefits === 'string'
        ? JSON.parse(row.benefits)
        : row.benefits,
  }))

    return blendProspectData(form5500Rows, scheduleARows)
  }

// -----------------------------------------------------------------------
// BLENDING LOGIC (unchanged from the prototype)
// -----------------------------------------------------------------------

function blendProspectData(form5500Rows, scheduleARows) {
  return form5500Rows.map((plan) => {
    const coverageLines = scheduleARows.filter((sch) => sch.ein === plan.ein)
    const renewalWindow = getRenewalWindow(plan.taxPeriod)
    const gaps = findCoverageGaps(coverageLines)

    return {
      ein: plan.ein,
      sponsorName: plan.sponsorName,
      planName: plan.planName,
      businessCode: plan.businessCode,
      activeParticipants: plan.activeParticipants,
      city: plan.city,
      state: plan.state,
      renewalWindow,
      coverageLines,
      coverageGaps: gaps,
      callReason: buildCallReason(renewalWindow, gaps, coverageLines),
    }
  })
}

function getRenewalWindow(taxPeriodEndDate) {
  if (!taxPeriodEndDate) return null
  const end = new Date(taxPeriodEndDate)
  if (Number.isNaN(end.getTime())) return null
  return {
    planYearEnd: taxPeriodEndDate,
    likelyRenewalMonth: end.toLocaleString('default', { month: 'long' }),
  }
}

function findCoverageGaps(coverageLines) {
  const gaps = []
  const hasBenefit = (key) => coverageLines.some((c) => c.benefits?.[key])

  if (!hasBenefit('dental')) gaps.push('No dental coverage on file')
  if (!hasBenefit('vision')) gaps.push('No vision coverage on file')
  if (!hasBenefit('stopLoss')) gaps.push('No stop-loss coverage on file')

  return gaps
}

function buildCallReason(renewalWindow, gaps) {
  if (renewalWindow?.likelyRenewalMonth) {
    return `Plan year ends in ${renewalWindow.likelyRenewalMonth} — renewal conversation window is open.`
  }
  if (gaps.length > 0) {
    return `Coverage gap identified: ${gaps[0]}.`
  }
  return 'Recent filing activity detected — worth a check-in.'
}

// -----------------------------------------------------------------------
// ROUTES
// -----------------------------------------------------------------------

app.get('/', async (c) => {
  const query = c.req.query('q')?.trim() || ''
  const prospects = await getProspects(c.env.DB, query)

  return c.html(renderShell(renderReportList(prospects), query))
})

app.get('/report/:ein', async (c) => {
  const ein = c.req.param('ein')
  const prospects = await getProspects(c.env.DB)   // <-- c.env.DB
  const prospect = prospects.find((p) => p.ein === ein)

  if (!prospect) {
    return c.html(renderShell('<p class="empty-state">No report found for that EIN.</p>'), 404)
  }

  return c.html(renderShell(renderReportDetail(prospect)))
})

// -----------------------------------------------------------------------
// VIEW HELPERS
// -----------------------------------------------------------------------

function renderShell(bodyContent, query = '') {
  return `
    <html>
      <head>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background: #f5f5f5; color: #1a1a2e; }
          .header-bar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; justify-content: space-between; gap: 2rem; padding: 0.85rem 1.5rem; background: rgba(255,255,255,0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border-bottom: 1px solid rgba(26,26,46,0.08); box-shadow: 0 4px 16px rgba(26,26,46,0.06); }
          .header-titles { display: flex; flex-direction: column; line-height: 1.15; }
          .header-titles h1 { font-size: 1.35rem; font-weight: 700; margin: 0; }
          .header-titles h2 { font-size: 0.85rem; font-weight: 400; color: #3f3755; margin: 0.15rem 0 0; }
          .search-wrap { flex: 0 1 340px; }
          .search-input { width: 100%; padding: 0.55rem 0.9rem; border: 1px solid rgba(26,26,46,0.15); border-radius: 6px; font-size: 0.9rem; background: #fff; outline: none; }
          .search-input:focus { border-color: #c17817; box-shadow: 0 0 0 3px rgba(193,120,23,0.15); }
          .report-area { padding: 2rem 1.5rem; max-width: 900px; margin: 0 auto; }
          .prospect-card { display: block; background: #fff; border: 1px solid rgba(26,26,46,0.08); border-radius: 8px; padding: 1.1rem 1.3rem; margin-bottom: 0.9rem; text-decoration: none; color: inherit; }
          .prospect-card h3 { margin: 0 0 0.25rem; font-size: 1.05rem; }
          .prospect-card .meta { font-size: 0.85rem; color: #3f3755; }
          .prospect-card .call-reason { margin-top: 0.6rem; font-size: 0.85rem; color: #8a5300; background: rgba(193,120,23,0.1); padding: 0.4rem 0.6rem; border-radius: 4px; display: inline-block; }
          .report-detail h2.section { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: #3f3755; margin: 1.6rem 0 0.5rem; }
          .coverage-line { background: #fff; border: 1px solid rgba(26,26,46,0.08); border-radius: 8px; padding: 0.9rem 1.1rem; margin-bottom: 0.6rem; }
          .gap-list { padding-left: 1.1rem; color: #3f3755; }
          .empty-state { color: #3f3755; font-style: italic; }
          .back-link { font-size: 0.85rem; color: #3f3755; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="header-bar">
          <div class="header-titles">
            <h1>Zywave Prospect Intelligence!</h1>
            <h2>Your reason to call...</h2>
          </div>
          <div class="search-wrap">
            <form action="/" method="get">
              <input class="search-input" type="text" name="q" value="${query || ''}" placeholder="Search accounts by sponsor name..." />
            </form>
          </div>
        </div>
        <div class="report-area">${bodyContent}</div>
      </body>
    </html>
  `
}

function renderReportList(prospects) {
  if (prospects.length === 0) {
    return '<p class="empty-state">No prospects match that search.</p>'
  }

  return prospects
    .map(
      (p) => `
    <a class="prospect-card" href="/report/${p.ein}">
      <h3>${p.sponsorName}</h3>
      <div class="meta">${p.planName} · ${p.activeParticipants} active participants${p.state ? ` · ${p.state}` : ''}</div>
      <div class="call-reason">${p.callReason}</div>
    </a>
  `
    )
    .join('')
}

function renderReportDetail(p) {
  const coverageHtml = p.coverageLines.length
    ? p.coverageLines
        .map(
          (c) => `
    <div class="coverage-line">
      <strong>${c.carrierName}</strong><br/>
      <span class="meta">${c.personsCovered} covered · ${c.policyFrom || '—'} to ${c.policyTo || '—'} · $${c.earnedPremium.toLocaleString()} earned premium</span>
    </div>
  `
        )
        .join('')
    : '<p class="empty-state">No Schedule A coverage lines found for this sponsor.</p>'

  const gapsHtml = p.coverageGaps.length
    ? `<ul class="gap-list">${p.coverageGaps.map((g) => `<li>${g}</li>`).join('')}</ul>`
    : `<p class="empty-state">No coverage gaps identified.</p>`

  return `
    <a class="back-link" href="/">&larr; Back to prospect list</a>
    <div class="report-detail">
      <h1>${p.sponsorName}</h1>
      <p class="meta">${p.planName} · EIN ${p.ein}</p>

      <h2 class="section">Reason to Call</h2>
      <div class="call-reason">${p.callReason}</div>

      <h2 class="section">Current Coverage</h2>
      ${coverageHtml}

      <h2 class="section">Identified Coverage Gaps</h2>
      ${gapsHtml}
    </div>
  `
}

export default app