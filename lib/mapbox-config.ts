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

export async function getMapboxStyleUrl() {
  // Use MAPBOX_STYLE_URL if provided, otherwise fall back to local style
  const styleUrl = process.env.MAPBOX_STYLE_URL
  
  if (styleUrl) {
    return styleUrl
  }
  
  // Return null to indicate we should use local style
  return null
}
