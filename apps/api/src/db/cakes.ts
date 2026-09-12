import type { CakeColor, CakeRecord, CakeRow, CakeShape, CakeSize, D1DatabaseLike } from '../types'

type CakeImageRow = {
  image_blob: ArrayBuffer | ArrayBufferView | number[] | string | null
  image_mime_type: string | null
  image_filename: string | null
  image_generated_at: string | null
}

export type CakeImageRecord = {
  image_blob: ArrayBuffer
  image_mime_type: string
  image_filename: string | null
  image_generated_at: string | null
}

function normalizeImageBlob(blob: NonNullable<CakeImageRow['image_blob']>): ArrayBuffer {
  if (blob instanceof ArrayBuffer) return blob

  if (ArrayBuffer.isView(blob)) {
    return copyBytesToArrayBuffer(new Uint8Array(blob.buffer, blob.byteOffset, blob.byteLength))
  }

  if (Array.isArray(blob)) return copyBytesToArrayBuffer(Uint8Array.from(blob))
  if (typeof blob === 'string') return stringToArrayBuffer(blob)

  throw new Error('Cake image blob has an unsupported format.')
}

function copyBytesToArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function stringToArrayBuffer(value: string) {
  const content = value.includes(',') ? value.slice(value.indexOf(',') + 1) : value
  const compactContent = content.replace(/\s/g, '')

  if (/^[A-Za-z0-9+/]*={0,2}$/.test(compactContent) && compactContent.length % 4 === 0) {
    try {
      const decoded = atob(compactContent)
      return binaryStringToArrayBuffer(decoded)
    } catch {
      // Fall through and treat the value as a raw binary string.
    }
  }

  return binaryStringToArrayBuffer(value)
}

function binaryStringToArrayBuffer(value: string) {
  const bytes = new Uint8Array(value.length)

  for (let index = 0; index < value.length; index += 1) {
    bytes[index] = value.charCodeAt(index) & 0xff
  }

  return bytes.buffer
}

function cakeRecordFromRow(row: CakeRow): CakeRecord {
  return {
    cake_id: row.cake_id,
    sponsor_ein: row.sponsor_ein,
    company_id: row.company_id,
    message: row.message,
    cake_size: row.cake_size,
    cake_shape: row.cake_shape,
    cake_color: row.cake_color,
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
    "cake_color",
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
    cakeColor: CakeColor
    imageBlob?: ArrayBuffer
    imageMimeType?: string | null
    imageFilename?: string | null
    imageGeneratedAt?: string | null
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
        "cake_color",
        "image_blob",
        "image_mime_type",
        "image_filename",
        "image_generated_at",
        "created_at",
        "updated_at"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      input.cakeId,
      input.sponsorEin,
      input.companyId,
      input.message,
      input.cakeSize,
      input.cakeShape,
      input.cakeColor,
      input.imageBlob ?? null,
      input.imageMimeType ?? null,
      input.imageFilename ?? null,
      input.imageGeneratedAt ?? null,
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
    cake_color: input.cakeColor,
    image_mime_type: input.imageMimeType ?? null,
    image_filename: input.imageFilename ?? null,
    image_generated_at: input.imageGeneratedAt ?? null,
    has_image_blob: input.imageBlob !== undefined && input.imageBlob.byteLength > 0,
    created_at: input.createdAt,
    updated_at: input.createdAt,
  } satisfies CakeRecord
}

export async function getCakeById(db: D1DatabaseLike, cakeId: string) {
  const row = await db.prepare(`${CAKE_SELECT_SQL} WHERE "cake_id" = ?`).bind(cakeId).first<CakeRow>()
  return row ? cakeRecordFromRow(row) : null
}

export async function getCakeImageById(db: D1DatabaseLike, cakeId: string): Promise<CakeImageRecord | null> {
  const row = await db
    .prepare(`
      SELECT "image_blob", "image_mime_type", "image_filename", "image_generated_at"
      FROM "cakes"
      WHERE "cake_id" = ?
    `)
    .bind(cakeId)
    .first<CakeImageRow>()

  if (!row?.image_blob) return null

  return {
    image_blob: normalizeImageBlob(row.image_blob),
    image_mime_type: row.image_mime_type ?? 'image/png',
    image_filename: row.image_filename,
    image_generated_at: row.image_generated_at,
  }
}

export async function updateCakeMessage(
  db: D1DatabaseLike,
  input: {
    cakeId: string
    message: string
    cakeSize: CakeSize
    cakeShape: CakeShape
    cakeColor: CakeColor
    imageBlob: ArrayBuffer
    imageMimeType: string
    imageFilename: string
    imageGeneratedAt: string
    updatedAt: string
  },
) {
  const result = await db
    .prepare(`
      UPDATE "cakes"
      SET
        "message" = ?,
        "cake_size" = ?,
        "cake_shape" = ?,
        "cake_color" = ?,
        "image_blob" = ?,
        "image_mime_type" = ?,
        "image_filename" = ?,
        "image_generated_at" = ?,
        "updated_at" = ?
      WHERE "cake_id" = ?
    `)
    .bind(
      input.message,
      input.cakeSize,
      input.cakeShape,
      input.cakeColor,
      input.imageBlob,
      input.imageMimeType,
      input.imageFilename,
      input.imageGeneratedAt,
      input.updatedAt,
      input.cakeId,
    )
    .run()

  if (result.success === false) throw new Error(result.error ?? 'Failed to update cake.')

  return getCakeById(db, input.cakeId)
}
