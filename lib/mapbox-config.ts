"use server"

export async function getMapboxToken() {
  const token = process.env.MAPBOX_ACCESS_TOKEN

  if (!token || token === "your-mapbox-token-here") {
    throw new Error(
      "Mapbox access token is not configured. Please set MAPBOX_ACCESS_TOKEN in your environment variables.",
    )
  }

  return token
}
