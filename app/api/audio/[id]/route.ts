/**
 * Audio Streaming API Endpoint
 * GET /api/audio/[id]
 *
 * Streams audio files with:
 * - HTTP range request support (206 Partial Content)
 * - CDN redirect strategy for optimal performance
 * - Aggressive caching headers
 * - Mobile-optimized delivery
 */

import { NextRequest, NextResponse } from 'next/server'
import { audioMarkers } from '@/data/audio-markers'

/**
 * GET /api/audio/[id]
 * Stream audio file with range request support
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Validate ID parameter
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid audio ID', code: 'INVALID_REQUEST' },
        { status: 400 }
      )
    }

    // Get audio marker
    const marker = audioMarkers.find(m => m.id === id)
    if (!marker) {
      return NextResponse.json(
        { error: `Audio file not found: ${id}`, code: 'AUDIO_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Redirect to audio URL (works for both Blob URLs and static files)
    // 307 preserves method and headers for range requests
    const audioUrl = marker.audioUrl.startsWith('http')
      ? marker.audioUrl
      : new URL(marker.audioUrl, request.url).toString()

    const response = NextResponse.redirect(audioUrl, 307)

    // Add cache headers for optimal performance
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    response.headers.set('Accept-Ranges', 'bytes')
    response.headers.set('Content-Type', 'audio/mpeg')

    return response
  } catch (error) {
    console.error('Audio streaming error:', error)
    return NextResponse.json(
      { error: 'Streaming error', code: 'STREAM_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    },
  })
}
