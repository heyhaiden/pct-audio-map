import { inflateSync } from "node:zlib"

/**
 * Read one RGBA pixel from an 8-bit RGB/RGBA PNG buffer (Mapbox terrain-rgb tiles).
 */
export function readPngPixel(
  buffer: Buffer,
  pixelX: number,
  pixelY: number,
): { r: number; g: number; b: number } {
  if (buffer[0] !== 0x89 || buffer.toString("ascii", 1, 4) !== "PNG") {
    throw new Error("Not a PNG file")
  }

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = 0
  const idatChunks: Buffer[] = []

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString("ascii", offset + 4, offset + 8)
    const dataStart = offset + 8
    const dataEnd = dataStart + length

    if (type === "IHDR") {
      width = buffer.readUInt32BE(dataStart)
      height = buffer.readUInt32BE(dataStart + 4)
      bitDepth = buffer[dataStart + 8]
      colorType = buffer[dataStart + 9]
    } else if (type === "IDAT") {
      idatChunks.push(buffer.subarray(dataStart, dataEnd))
    } else if (type === "IEND") {
      break
    }

    offset = dataEnd + 4
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error(`Unsupported PNG format (bitDepth=${bitDepth}, colorType=${colorType})`)
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3
  const stride = 1 + width * bytesPerPixel
  const raw = inflateSync(Buffer.concat(idatChunks))
  const rowStart = pixelY * stride
  const filter = raw[rowStart]
  const rowOffset = rowStart + 1 + pixelX * bytesPerPixel

  let r = raw[rowOffset]
  let g = raw[rowOffset + 1]
  let b = raw[rowOffset + 2]

  if (filter !== 0) {
    // Terrain tiles use filter 0; handle Sub filter for safety.
    if (filter === 1) {
      const leftOffset = rowOffset - bytesPerPixel
      if (pixelX > 0) {
        r = (r + raw[leftOffset]) % 256
        g = (g + raw[leftOffset + 1]) % 256
        b = (b + raw[leftOffset + 2]) % 256
      }
    }
  }

  return { r, g, b }
}
