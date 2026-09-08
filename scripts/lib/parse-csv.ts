export interface CsvRow {
  id: string
  name: string
  lng: number
  lat: number
  chapter: string
  filename: string
  description: string
  recordingDate: string
  recordingTime: string
  featured: boolean
}

const COLUMN_ALIASES: Record<string, string> = {
  longitude: "lng",
  long: "lng",
  latitude: "lat",
  audio_filename: "filename",
  audio: "filename",
  file: "filename",
  date: "recording_date",
  recordingdate: "recording_date",
  time: "recording_time",
  recordingtime: "recording_time",
}

function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/\s+/g, "_")
  return COLUMN_ALIASES[key] ?? key
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === "," && !inQuotes) {
      fields.push(current)
      current = ""
      continue
    }
    current += char
  }

  fields.push(current)
  return fields
}

function parseBoolean(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized === "true" || normalized === "1" || normalized === "yes"
}

export function parseMarkerCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row")
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader)
  const required = ["id", "name", "lng", "lat", "chapter"]
  for (const column of required) {
    if (!headers.includes(column)) {
      throw new Error(`CSV missing required column: ${column}`)
    }
  }

  const rows: CsvRow[] = []

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line)
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = values[index]?.trim() ?? ""
    })

    const lng = Number(record.lng)
    const lat = Number(record.lat)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      throw new Error(`Invalid coordinates for marker ${record.id}: lng=${record.lng}, lat=${record.lat}`)
    }

    rows.push({
      id: record.id,
      name: record.name,
      lng,
      lat,
      chapter: record.chapter,
      filename: record.filename,
      description: record.description ?? "",
      recordingDate: record.recording_date ?? "",
      recordingTime: record.recording_time ?? "",
      featured: parseBoolean(record.featured ?? "false"),
    })
  }

  return rows
}
