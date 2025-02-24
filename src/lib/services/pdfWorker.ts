import * as pdfjs from 'pdfjs-dist';

let isWorkerInitialized = false;

export async function initPdfWorker() {
  if (!isWorkerInitialized) {
    // Use webpack's public path
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
    isWorkerInitialized = true;
  }
}

export { pdfjs }; 