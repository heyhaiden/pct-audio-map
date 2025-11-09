/**
 * Audio Metadata API Endpoint
 * GET /api/audio/metadata/[id]
 *
 * Returns metadata for a specific audio file without downloading the file
 */

import { NextRequest, NextResponse } from 'next/server'
import { audioMarkers } from '@/data/audio-markers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const marker = audioMarkers.find(m => m.id === id)

    if (!marker) {
      return NextResponse.json(
        { error: 'Audio file not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: marker.id,
      name: marker.name,
      coordinates: marker.coordinates,
      elevation: marker.elevation,
      chapter: marker.chapter,
      featured: marker.featured,
      audioUrl: marker.audioUrl,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('Error fetching metadata:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    )
  }
}
