/**
 * Audio Streaming Endpoint
 * GET /api/audio/stream/[id]
 *
 * Streams audio files with range request support for seeking
 * Optimized for CDN caching and mobile delivery
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAudioMetadataById } from '@/lib/audio/metadata-service'
import { audioMarkers } from '@/data/audio-markers'

/**
 * Stream audio file with range request support
 *
 * Strategy: Redirect to audio URL (either Blob CDN or static file)
 * The CDN handles range requests, compression, and global distribution
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get audio marker
    const marker = audioMarkers.find(m => m.id === id)

    if (!marker) {
      return NextResponse.json(
        { error: 'Audio file not found', code: 'AUDIO_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Redirect to audio URL (works for both Blob URLs and static files)
    // 307 preserves method and headers for range requests
    const response = NextResponse.redirect(
      new URL(marker.audioUrl, request.url).toString(),
      307
    )

    // Add cache headers for optimal performance
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    response.headers.set('Accept-Ranges', 'bytes')

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
 * Alternative implementation: Proxy streaming
 * Use this if you need to track streaming metrics or transform audio
 * NOTE: This adds latency and edge function execution time
 */
/*
export async function GET_PROXY(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const metadata = await getAudioMetadata(id)

    if (!metadata) {
      return NextResponse.json(
        { error: 'Audio file not found', code: 'AUDIO_NOT_FOUND' },
        { status: 404 }
      )
    }

    const rangeHeader = request.headers.get('range')

    // Fetch from Vercel Blob with range
    const fetchHeaders: HeadersInit = {}
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader
    }

    const blobResponse = await fetch(metadata.url, { headers: fetchHeaders })

    if (!blobResponse.ok) {
      throw new Error(`Blob fetch failed: ${blobResponse.status}`)
    }

    // Stream through the audio data
    const headers: HeadersInit = {
      'Content-Type': metadata.contentType,
      ...getAudioCacheHeaders(metadata.uploadedAt),
    }

    // Copy relevant headers from blob response
    if (blobResponse.headers.get('content-range')) {
      headers['Content-Range'] = blobResponse.headers.get('content-range')!
      headers['Content-Length'] = blobResponse.headers.get('content-length')!
    }

    return new NextResponse(blobResponse.body, {
      status: blobResponse.status,
      headers,
    })
  } catch (error) {
    console.error('Audio streaming error:', error)
    return NextResponse.json(
      { error: 'Streaming error', code: 'STREAM_ERROR' },
      { status: 500 }
    )
  }
}
*/
