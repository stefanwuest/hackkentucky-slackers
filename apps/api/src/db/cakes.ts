import type { CakeRecord, CakeRow, CakeShape, CakeSize, D1DatabaseLike } from '../types'

function cakeRecordFromRow(row: CakeRow): CakeRecord {
  return {
    cake_id: row.cake_id,
    sponsor_ein: row.sponsor_ein,
    company_id: row.company_id,
    message: row.message,
    cake_size: row.cake_size,
    cake_shape: row.cake_shape,
    image_mime_type: row.image_mime_type,
    image_filename: row.image_filename,
    image_generated_at: row.image_generated_at,
    has_image_blob: row.image_blob_present === true || row.image_blob_present === 1 || row.image_blob_present === '1',
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

const CAKE_SELECT_SQL = `
  SELECT
    "cake_id",
    "sponsor_ein",
    "company_id",
    "message",
    "cake_size",
    "cake_shape",
    "image_mime_type",
    "image_filename",
    "image_generated_at",
    "image_blob" IS NOT NULL AS "image_blob_present",
    "created_at",
    "updated_at"
  FROM "cakes"
`

export async function insertCake(
  db: D1DatabaseLike,
  input: {
    cakeId: string
    sponsorEin: string
    companyId: string | null
    message: string
    cakeSize: CakeSize
    cakeShape: CakeShape
    createdAt: string
  },
) {
  const result = await db
    .prepare(`
      INSERT INTO "cakes" (
        "cake_id",
        "sponsor_ein",
        "company_id",
        "message",
        "cake_size",
        "cake_shape",
        "created_at",
        "updated_at"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      input.cakeId,
      input.sponsorEin,
      input.companyId,
      input.message,
      input.cakeSize,
      input.cakeShape,
      input.createdAt,
      input.createdAt,
    )
    .run()

  if (result.success === false) throw new Error(result.error ?? 'Failed to insert cake.')

  return {
    cake_id: input.cakeId,
    sponsor_ein: input.sponsorEin,
    company_id: input.companyId,
    message: input.message,
    cake_size: input.cakeSize,
    cake_shape: input.cakeShape,
    image_mime_type: null,
    image_filename: null,
    image_generated_at: null,
    has_image_blob: false,
    created_at: input.createdAt,
    updated_at: input.createdAt,
  } satisfies CakeRecord
}

export async function getCakeById(db: D1DatabaseLike, cakeId: string) {
  const row = await db.prepare(`${CAKE_SELECT_SQL} WHERE "cake_id" = ?`).bind(cakeId).first<CakeRow>()
  return row ? cakeRecordFromRow(row) : null
}

export async function updateCakeMessage(
  db: D1DatabaseLike,
  input: {
    cakeId: string
    message: string
    cakeSize: CakeSize
    cakeShape: CakeShape
    updatedAt: string
  },
) {
  const result = await db
    .prepare(`
      UPDATE "cakes"
      SET "message" = ?, "cake_size" = ?, "cake_shape" = ?, "updated_at" = ?
      WHERE "cake_id" = ?
    `)
    .bind(input.message, input.cakeSize, input.cakeShape, input.updatedAt, input.cakeId)
    .run()

  if (result.success === false) throw new Error(result.error ?? 'Failed to update cake.')

  return getCakeById(db, input.cakeId)
}
