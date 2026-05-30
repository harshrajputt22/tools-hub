"use client";
import { useState, useCallback, useRef } from "react";
import {
  FileDropZone, Toolbar, ConvertButton, DownloadButton,
  PanelHeader, ErrorBanner, SuccessBanner, StatsBar,
  LimitationNotice, downloadBlob, readFileAsArrayBuffer, formatBytes,
} from "./_shared";

// ── Render a single PDF page to canvas ────────────────────────
async function renderPageToCanvas(pdfPage, scale = 2) {
  const viewport = pdfPage.getViewport({ scale });
  const canvas   = document.createElement("canvas");
  canvas.width   = viewport.width;
  canvas.height  = viewport.height;
  const ctx      = canvas.getContext("2d");

  await pdfPage.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

// ── Load pdf.js ───────────────────────────────────────────────
async function loadPdf(arrayBuffer) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}

const SCALE_OPTIONS = [
  { label: "72 DPI (Fast)", value: 1 },
  { label: "150 DPI",       value: 2 },
  { label: "300 DPI (HQ)",  value: 3 },
];

// ── Component ─────────────────────────────────────────────────
export default function PdfToJpg() {
  const [file,       setFile]       = useState(null);
  const [fileInfo,   setFileInfo]   = useState(null);
  const [images,     setImages]     = useState([]);
  const [scale,      setScale]      = useState(2);
  const [loading,    setLoading]    = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [error,      setError]      = useState(null);
  const [success,    setSuccess]    = useState(null);
  const [stats,      setStats]      = useState(null);
  const [numPages,   setNumPages]   = useState(0);

  const reset = () => {
    setFile(null); setFileInfo(null);
    images.forEach((img) => URL.revokeObjectURL(img.url));
    setImages([]); setError(null); setSuccess(null);
    setStats(null); setProgress(0); setNumPages(0);
  };

  const handleFile = useCallback((f, err) => {
    if (err) { setError(err); return; }
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file (.pdf)."); return;
    }
    reset();
    setFile(f);
    setFileInfo({ name: f.name, meta: `${formatBytes(f.size)} · PDF` });
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setLoading(true); setError(null); setSuccess(null);
    setImages([]); setStats(null); setProgress(0);

    try {
      const buf = await readFileAsArrayBuffer(file);
      const pdf = await loadPdf(buf);
      const n   = pdf.numPages;
      setNumPages(n);

      const results = [];
      for (let i = 1; i <= n; i++) {
        setProgress(Math.round((i / n) * 100));
        const page   = await pdf.getPage(i);
        const canvas = await renderPageToCanvas(page, scale);
        const blob   = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
        const url    = URL.createObjectURL(blob);
        results.push({ pageNum: i, blob, url, size: blob.size });
      }

      setImages(results);
      const totalSize = results.reduce((s, r) => s + r.size, 0);
      setStats([
        { label: "Pages",      value: n },
        { label: "Scale",      value: `${scale}x` },
        { label: "Total size", value: formatBytes(totalSize) },
        { label: "Per page",   value: formatBytes(totalSize / n) },
      ]);
      setSuccess(`Converted ${n} page(s) to JPEG images.`);
    } catch (e) {
      setError(`Conversion failed: ${e.message}`);
    } finally {
      setLoading(false); setProgress(0);
    }
  }, [file, scale]);

  function downloadPage(img) {
    const baseName = file.name.replace(/\\.pdf$/i, "");
    downloadBlob(img.blob, `${baseName}_page${img.pageNum}.jpg`);
  }

  async function downloadAll() {
    for (let i = 0; i < images.length; i++) {
      downloadPage(images[i]);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return (
    <div className="space-y-4">

      <FileDropZone
        onFile={handleFile}
        accept=".pdf,application/pdf"
        acceptLabel="PDF files only · Max 50 MB"
        fileInfo={fileInfo}
        disabled={loading}
      />

      <Toolbar>
        <ConvertButton onClick={handleConvert} loading={loading} disabled={!file} label="Convert to JPG" />
        {images.length > 1 && <DownloadButton onClick={downloadAll} label={`Download All (${images.length})`} />}
        {file && <button onClick={reset} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">Clear</button>}

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-medium text-gray-500">Quality:</span>
          <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
            {SCALE_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setScale(opt.value)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  scale === opt.value ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Toolbar>

      {loading && progress > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Rendering pages…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />
      {stats && <StatsBar items={stats} />}

      {images.length > 0 && (
        <div className="flex flex-col">
          <PanelHeader label={`Page Images (${images.length})`} />
          <div className="p-4 bg-gray-50 border border-gray-200 border-t-0 rounded-b-xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((img) => (
                <div key={img.pageNum} className="flex flex-col gap-2">
                  <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                    <img
                      src={img.url}
                      alt={`Page ${img.pageNum}`}
                      className="w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Page {img.pageNum}</span>
                    <button
                      onClick={() => downloadPage(img)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                    >
                      JPG
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}