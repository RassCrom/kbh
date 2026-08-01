/// <reference lib="webworker" />

import { parseCrimeData } from './crimeData';

self.onmessage = async (event: MessageEvent<string>) => {
  try {
    const response = await fetch(event.data);
    if (!response.ok) throw new Error(`Crime data request failed (${response.status}).`);
    const raw: unknown = await response.json();
    self.postMessage({ ok: true, result: parseCrimeData(raw) });
  } catch (error) {
    self.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'Unable to process crime data.',
    });
  }
};

export {};
