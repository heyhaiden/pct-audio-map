import { audioMarkers } from "@/data/audio-markers"
import { LibraryPlayer } from "@/components/audio/library-player"
import { SitePage } from "@/components/navigation/site-page"
import { buildAudioLibraryFolders } from "@/lib/audio-library-folders"

const libraryFolders = buildAudioLibraryFolders()
const recordingCount = audioMarkers.filter((marker) => marker.audioUrl).length

export default function LibraryPage() {
  return (
    <SitePage current="library">
        <main className="pct-stagger mx-auto max-w-4xl py-12 md:px-6 md:py-20">
          <section className="mb-12 px-6 text-center md:mb-16 md:px-0">
            <h1 className="pct-display mb-4 text-[36px] font-normal text-[#f6f1e4] md:text-[48px]">
              Audio <span className="pct-wordmark font-wordmark uppercase text-[#ed5a43]">Library</span>
            </h1>
            <p className="pct-display mx-auto max-w-xl text-prose font-light leading-[1.65] text-[#b4aa9b]">
              Browse and listen to all {recordingCount} field recordings from the Pacific Crest Trail.
            </p>
          </section>

          {/* Audio listings by chapter */}
          <LibraryPlayer folders={libraryFolders} />
        </main>

        <footer className="mt-12 border-t border-[#ed5a43]/10 py-8">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <p className="font-mono text-micro uppercase tracking-[0.14em] text-[#6b6455]">
              Offbeat: Soundscapes of the PCT
            </p>
          </div>
        </footer>
    </SitePage>
  )
}
