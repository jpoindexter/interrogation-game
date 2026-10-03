import type { RecordedWalkthrough } from './types';

export default function RecordedProvenance({ recording }: { recording: RecordedWalkthrough }) {
  return <details className="mt-6 border-t border-surface pt-4 text-sm text-gray-300">
    <summary className="cursor-pointer py-2 text-gold focus-visible:outline-2 focus-visible:outline-gold">Recording source and limitations</summary>
    <div className="mt-3 space-y-3 break-words leading-relaxed">
      <p>Captured <time dateTime={recording.capturedAt}>{recording.capturedAt}</time> using {recording.provider}.</p>
      <p>{recording.scope}</p>
      <p>Quoted exchanges, exhibits, assessments and final findings are copied from this saved run. Section titles and navigation labels were added for this walkthrough. Nothing here is being generated in response to your clicks.</p>
      <p className="break-all">Source file: <code>{recording.sourceFile}</code></p>
      <p className="break-all">Source SHA-256: <code>{recording.sourceSha256}</code></p>
    </div>
  </details>;
}
