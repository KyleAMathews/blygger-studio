/*
 * OPTIONAL — QoL extra; delete this file and its one import to remove
 * (authoring.tsx: the import, and the single <OcrScan> it renders in the
 * scan sheet).
 *
 * On-device photo scanning for the "scan text" sheet. Off by default and per
 * device: a checkbox in the scan sheet sets the localStorage key below.
 * Nothing here runs, and nothing is fetched, unless that box is ticked AND
 * the person then takes or chooses a photo — only then is Tesseract.js
 * loaded, from jsDelivr, at a pinned version with Subresource Integrity.
 * Recognition happens in the browser; the photo is not uploaded. (Tesseract
 * fetches its own worker, WASM core and English model from the CDN on first
 * use, a few MB.)
 *
 * The default scan path needs none of this: the sheet points people at the
 * scanner already in their phone (iOS Scan Text, Android Lens/keyboard).
 */
import { useRef, useState } from 'react';

const OCR_KEY = 'blyg-studio-ocr';
const SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const INTEGRITY = 'sha384-GJqSu7vueQ9qN0E9yLPb3Wtpd7OrgK8KmYzC8T1IysG1bcvxvIO4qtYR/D3A991F';

function ocrEnabled(): boolean {
  try {
    return localStorage.getItem(OCR_KEY) === 'on';
  } catch {
    return false;
  }
}
function setOcrEnabled(on: boolean) {
  try {
    if (on) localStorage.setItem(OCR_KEY, 'on');
    else localStorage.removeItem(OCR_KEY);
  } catch {
    /* storage blocked: the option simply does not stick */
  }
}

interface Tesseract {
  recognize(
    image: File,
    lang: string,
    options?: { logger?: (m: { status: string; progress: number }) => void },
  ): Promise<{ data: { text: string } }>;
}
let loading: Promise<Tesseract> | undefined;
function load(): Promise<Tesseract> {
  return (loading ??= new Promise<Tesseract>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SRC;
    script.integrity = INTEGRITY;
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    script.onload = () => resolve((window as unknown as { Tesseract: Tesseract }).Tesseract);
    script.onerror = () => {
      loading = undefined;
      script.remove();
      reject(new Error('could not load the text reader'));
    };
    document.head.append(script);
  }));
}

/** Read the text in a photo, on this device. Line breaks inside a paragraph are joined. */
async function recognize(file: File, progress: (percent: number) => void): Promise<string> {
  const tesseract = await load();
  const { data } = await tesseract.recognize(file, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') progress(Math.round(m.progress * 100));
    },
  });
  return data.text
    .replace(/-\n(?=\w)/g, '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

/**
 * The scan sheet's optional half: the per-device opt-in and, once opted in,
 * take a photo / choose a photo. `insert` puts the text at the saved cursor.
 */
export function OcrScan({ insert }: { insert: (text: string, asQuote: boolean) => void }) {
  const [enabled, setEnabled] = useState(ocrEnabled);
  const [asQuote, setAsQuote] = useState(true);
  const [status, setStatus] = useState<{ text: string; error?: boolean }>();
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
  const read = async (file: File | undefined) => {
    if (!file) return;
    setStatus({ text: 'loading the text reader…' });
    try {
      const text = await recognize(file, (percent) => setStatus({ text: `reading… ${percent}%` }));
      if (!text) return setStatus({ text: 'No text found in that photo.', error: true });
      setStatus(undefined);
      insert(text, asQuote);
    } catch (error) {
      setStatus({ text: error instanceof Error ? error.message : String(error), error: true });
    }
  };
  const picked = (event: React.ChangeEvent<HTMLInputElement>) => {
    void read(event.target.files?.[0]);
    event.target.value = '';
  };
  return (
    <div className="ocr">
      <label className="check">
        <input
          type="checkbox"
          id="ocr-opt-in"
          checked={enabled}
          onChange={(event) => {
            setEnabled(event.target.checked);
            setOcrEnabled(event.target.checked);
          }}
        />
        <span>
          <span className="badge badge-line">optional</span> read a photo on this device
          (Tesseract, a few MB, loaded only when you choose a photo). Remembered on this
          device only.
        </span>
      </label>
      {enabled ? (
        <>
          <label className="check">
            <input
              type="checkbox"
              checked={asQuote}
              onChange={(event) => setAsQuote(event.target.checked)}
            />
            <span>
              insert as a quote (<code>&gt;</code>)
            </span>
          </label>
          {status ? (
            <p className={status.error ? 'scan-status error' : 'scan-status'} role="status">
              {status.text}
            </p>
          ) : null}
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={picked} />
          <input ref={library} type="file" accept="image/*" hidden onChange={picked} />
          <div className="sheet-actions">
            <button
              type="button"
              className="btn btn-ghost"
              data-action="ocr-camera"
              onClick={() => camera.current?.click()}
            >
              📷 take photo
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              data-action="ocr-library"
              onClick={() => library.current?.click()}
            >
              choose a photo
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
