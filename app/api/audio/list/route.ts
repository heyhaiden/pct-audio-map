/**
 * Audio List API Endpoint
 * GET /api/audio/list
 *
 * Returns a list of all available audio markers with metadata
 */

import { NextResponse } from 'next/server'
import { audioMarkers } from '@/data/audio-markers'

export async function GET() {
  try {
    return NextResponse.json({
      audio: audioMarkers.map(marker => ({
        id: marker.id,
        name: marker.name,
        coordinates: marker.coordinates,
        elevation: marker.elevation,
        chapter: marker.chapter,
        featured: marker.featured,
        audioUrl: marker.audioUrl,
      })),
      total: audioMarkers.length,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Error listing audio:', error)
    return NextResponse.json(
      { error: 'Failed to list audio files' },
      { status: 500 }
    )
  }
}
