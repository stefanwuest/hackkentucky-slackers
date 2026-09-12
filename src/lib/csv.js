// src/lib/csv.js
// Minimal dependency-free CSV parser that handles quoted fields
// (needed because address/name fields in these filings can contain commas).

export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        row.push(field)
        field = ''
      } else if (char === '\n' || char === '\r') {
        if (field !== '' || row.length > 0) {
          row.push(field)
          rows.push(row)
          row = []
          field = ''
        }
        // swallow \r\n pairs cleanly
        if (char === '\r' && next === '\n') i++
      } else {
        field += char
      }
    }
  }
  // last field/row if file doesn't end with a newline
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

export function csvToObjects(text) {
  const rows = parseCsv(text)
  const headers = rows[0]
  return rows.slice(1).map((row) => {
    const obj = {}
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? ''
    })
    return obj
  })
}