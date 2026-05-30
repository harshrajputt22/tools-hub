"use client";
import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  FileDropZone, Toolbar, ConvertButton, DownloadButton, CopyButton,
  PanelHeader, ErrorBanner, SuccessBanner, StatsBar,
  LimitationNotice, downloadBlob, readFileAsArrayBuffer, formatBytes,
} from "./_shared";

// ── Load pdf.js ───────────────────────────────────────────────
async function loadPdf(arrayBuffer) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
}

// ── Extract text items with position info ─────────────────────
async function extractPageData(pdfPage) {
  const content   = await pdfPage.getTextContent();
  const viewport  = pdfPage.getViewport({ scale: 1 });
  const pageHeight = viewport.height;
  const items = content.items
    .filter((item) => "str" in item && item.str.trim())
    .map((item) => ({
      text: item.str.trim(),
      x:    Math.round(item.transform[4]),
      y:    Math.round(pageHeight - item.transform[5]),
      width: Math.round(item.width),
      height: Math.round(item.height),
    }));
  return items;
}

// ── Heuristic: group items into rows then columns ─────────────
function itemsToRows(items, rowTolerance = 6) {
  if (!items.length) return [];

  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rowGroups = [];
  let currentGroup = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = currentGroup[currentGroup.length - 1];
    if (Math.abs(sorted[i].y - prev.y) <= rowTolerance) {
      currentGroup.push(sorted[i]);
    } else {
      rowGroups.push(currentGroup.sort((a, b) => a.x - b.x));
      currentGroup = [sorted[i]];
    }
  }
  rowGroups.push(currentGroup.sort((a, b) => a.x - b.x));

  return rowGroups.map((group) => group.map((item) => item.text));
}

// ── Normalise rows ────────────────────────────────────────────
function normaliseRows(rows) {
  const maxCols = Math.max(...rows.map((r) => r.length));
  return rows.map((row) => {
    while (row.length < maxCols) row.push("");
    return row;
  });
}

// ── Build XLSX workbook ───────────────────────────────────────
function rowsToWorkbook(allPageRows) {
  const wb = XLSX.utils.book_new();
  allPageRows.forEach(({ pageNum, rows }) => {
    const normalised = normaliseRows(rows);
    const ws = XLSX.utils.aoa_to_sheet(normalised);
    XLSX.utils.book_append_sheet(wb, ws, `Page ${pageNum}`);
  });
  return wb;
}

// ── Component ─────────────────────────────────────────────────
export default function PdfToExcel() {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [allPages, setAllPages] = useState([]);
  const [csvPreview, setCsvPreview] = useState("");
  const [xlsxBlob, setXlsxBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState(null);
  const [outputFmt, setOutputFmt] = useState("xlsx");

  const reset = () => {
    setFile(null); setFileInfo(null); setAllPages([]);
    setCsvPreview(""); setXlsxBlob(null); setError(null);
    setSuccess(null); setStats(null); setProgress(0);
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
    setAllPages([]); setCsvPreview(""); setXlsxBlob(null); setStats(null); setProgress(0);

    try {
      const buf = await readFileAsArrayBuffer(file);
      const pdf = await loadPdf(buf);
      const numPages = pdf.numPages;
      const pageData = [];

      for (let i = 1; i <= numPages; i++) {
        setProgress(Math.round((i / numPages) * 100));
        const page  = await pdf.getPage(i);
        const items = await extractPageData(page);
        const rows  = itemsToRows(items);
        pageData.push({ pageNum: i, rows, itemCount: items.length });
      }

      const totalItems = pageData.reduce((s, p) => s + p.itemCount, 0);
      const totalRows  = pageData.reduce((s, p) => s + p.rows.length, 0);

      if (totalItems === 0) {
        throw new Error("No text found. PDF might be scanned.");
      }

      const firstRows = pageData[0]?.rows || [];
      const csv = firstRows.map((r) => r.join(",")).join("\n");
      setCsvPreview(csv);

      const wb   = rowsToWorkbook(pageData);
      const buf2 = XLSX.write(wb, { bookType: outputFmt, type: "array" });
      const blob = new Blob([buf2]);

      setXlsxBlob(blob);
      setAllPages(pageData);
      setStats([
        { label: "Pages", value: numPages },
        { label: "Rows", value: totalRows },
      ]);
      setSuccess("Conversion complete");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false); setProgress(0);
    }
  }, [file, outputFmt]);

  const handleDownload = () => {
    if (!xlsxBlob) return;
    downloadBlob(xlsxBlob, "output.xlsx");
  };

  return (
    <div className="space-y-4">

      <LimitationNotice lines={[
        "Best for text-based PDFs",
        "Scanned PDFs need OCR",
      ]} />

      <FileDropZone
        onFile={handleFile}
        accept=".pdf"
        acceptLabel="PDF only"
        fileInfo={fileInfo}
      />

      <Toolbar>
        <ConvertButton onClick={handleConvert} loading={loading} disabled={!file} />
        {xlsxBlob && <DownloadButton onClick={handleDownload} />}
      </Toolbar>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />
      {stats && <StatsBar items={stats} />}

      {csvPreview && (
        <div>
          <PanelHeader label="Preview" actions={<CopyButton text={csvPreview} />} />
          <textarea value={csvPreview} readOnly />
        </div>
      )}
    </div>
  );
}