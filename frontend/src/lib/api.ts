/**
 * The entire data layer. One fetch, one endpoint.
 *
 * Note what ISN'T here: no XLSX.js, no FileReader, no DOMParser scraping an
 * Apache directory listing. Parsing is the server's job now. This file is the
 * only place that talks to the network, so the Excel->Postgres migration is
 * invisible above this line.
 */
import type { PipelinePayload } from './types';

export async function fetchPipeline(signal?: AbortSignal): Promise<PipelinePayload> {
  const res = await fetch('/api/pipeline', {
    credentials: 'same-origin',
    cache: 'no-store',
    signal,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).detail ?? detail;
    } catch {
      /* non-JSON error body; keep statusText */
    }
    throw new Error(`Failed to load pipeline (${res.status}): ${detail}`);
  }
  return res.json() as Promise<PipelinePayload>;
}
