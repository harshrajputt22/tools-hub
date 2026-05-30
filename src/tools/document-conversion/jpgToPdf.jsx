"use client";
import { useState, useCallback, useRef } from "react";
import { UploadCloud, Image as ImageIcon, ArrowLeft, ArrowRight, X } from "lucide-react";
import {
  Toolbar, ConvertButton, DownloadButton,
  PanelHeader, ErrorBanner, SuccessBanner, StatsBar,
  downloadBlob, readFileAsDataURL, formatBytes,
} from "./_shared";

const MAX_IMAGES = 50;
const ACCEPTED   = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const PAGE_SIZES = [
  { label: "A4",     value: "a4"     },
  { label: "Letter", value: "letter" },
  { label: "Auto",   value: "auto"   },
];

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image."));
    img.src     = dataUrl;
  });
}

async function buildPdf(entries, pageSize) {
  const { jsPDF } = await import("jspdf");

  let doc = null;

  for (let i = 0; i < entries.length; i++) {
    const { dataUrl, img } = entries[i];
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    let pdfW, pdfH;
    if (pageSize === "auto") {
      pdfW = (imgW / 96) * 25.4;
      pdfH = (imgH / 96) * 25.4;
    } else if (pageSize === "a4") {
      pdfW = 210; pdfH = 297;
    } else {
      pdfW = 215.9; pdfH = 279.4;
    }

    const orientation = imgW > imgH && pageSize !== "auto" ? "landscape" : "portrait";

    if (!doc) {
      doc = new jsPDF({ orientation: pageSize === "auto" ? "portrait" : orientation, unit: "mm", format: pageSize === "auto" ? [pdfW, pdfH] : pageSize });
    } else {
      doc.addPage(pageSize === "auto" ? [pdfW, pdfH] : pageSize, orientation);
    }

    const margin  = pageSize === "auto" ? 0 : 10;
    const usableW = (pageSize === "auto" ? pdfW : (orientation === "landscape" ? pdfH : pdfW)) - margin * 2;
    const usableH = (pageSize === "auto" ? pdfH : (orientation === "landscape" ? pdfW : pdfH)) - margin * 2;
    const ratio   = Math.min(usableW / imgW, usableH / imgH);
    const drawW   = imgW * ratio;
    const drawH   = imgH * ratio;
    const x       = margin + (usableW - drawW) / 2;
    const y       = margin + (usableH - drawH) / 2;

    const fmt = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
    doc.addImage(dataUrl, fmt, x, y, drawW, drawH);
  }

  return doc ? doc.output("blob") : null;
}

export default function JpgToPdf() {
  const [entries,  setEntries]  = useState([]);
  const [pageSize, setPageSize] = useState("a4");
  const [pdfBlob,  setPdfBlob]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);
  const [stats,    setStats]    = useState(null);
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setEntries([]); setPdfBlob(null);
    setError(null); setSuccess(null); setStats(null);
  };

  const addFiles = useCallback(async (files) => {
    const arr = Array.from(files).filter((f) => ACCEPTED.includes(f.type));
    const invalid = Array.from(files).filter((f) => !ACCEPTED.includes(f.type));

    if (invalid.length > 0) {
      setError(`Unsupported format(s): ${invalid.map((f) => f.name).join(", ")}`);
    }

    if (arr.length === 0) return;
    if (entries.length + arr.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`); return;
    }

    const newEntries = await Promise.all(arr.map(async (file) => {
      const dataUrl = await readFileAsDataURL(file);
      const img     = await loadImage(dataUrl);
      return { file, dataUrl, img, id: `${file.name}-${Date.now()}-${Math.random()}` };
    }));

    setEntries((prev) => [...prev, ...newEntries]);
    setPdfBlob(null); setError(null);
  }, [entries.length]);

  function handleDrop(e) {
    e.preventDefault(); setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl px-6 py-10 cursor-pointer ${
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-300"
        }`}
      >
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

        <UploadCloud size={28} className="text-gray-400" />

        <p className="text-sm font-semibold text-gray-600">
          Drop images or <span className="text-blue-600">browse</span>
        </p>
      </div>

      <Toolbar>
        <ConvertButton />
        {pdfBlob && <DownloadButton />}
      </Toolbar>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />
      {stats && <StatsBar items={stats} />}
    </div>
  );
}