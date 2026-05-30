"use client";
import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
  FileDropZone, Toolbar, ConvertButton, DownloadButton,
  PanelHeader, ErrorBanner, SuccessBanner, StatsBar,
  LimitationNotice, downloadBlob, readFileAsArrayBuffer, formatBytes,
} from "./_shared";

// ── Parse Excel → sheet data ──────────────────────────────────
function parseExcel(arrayBuffer) {
  const wb     = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  const sheets = {};
  wb.SheetNames.forEach((name) => {
    const ws   = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    sheets[name] = rows;
  });
  return { sheetNames: wb.SheetNames, sheets };
}

// ── Build styled HTML table for a sheet ───────────────────────
function buildTableHtml(rows) {
  if (!rows.length) return "<p style='color:#999'>Empty sheet</p>";
  const [header, ...body] = rows;
  const ths = header.map((h) => `<th>${h ?? ""}</th>`).join("");
  const trs = body.map((row) =>
    `<tr>${header.map((_, i) => `<td>${row[i] ?? ""}</td>`).join("")}</tr>`
  ).join("");
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

// ── Render HTML table → PDF ───────────────────────────────────
async function tableToPdf(htmlContent, sheetName) {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 1100px; padding: 40px;
    background: #fff; font-family: Arial, sans-serif; font-size: 11px;
  `;
  container.innerHTML = `
    <style>
      h2 { font-size: 14px; margin: 0 0 12px; color: #1a1a2e; }
      table { border-collapse: collapse; width: 100%; }
      th { background: #1e3a5f; color: #fff; padding: 7px 10px; }
      td { border: 1px solid #dde; padding: 6px 10px; }
      tr:nth-child(even) td { background: #f5f7fa; }
    </style>
    <h2>Sheet: ${sheetName}</h2>
    ${htmlContent}
  `;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas.default(container, { scale: 2 });
    const pdf = new jsPDF.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    const imgW = pdf.internal.pageSize.getWidth();
    const imgH = (canvas.height * imgW) / canvas.width;

    pdf.addImage(canvas.toDataURL("image/jpeg"), "JPEG", 0, 10, imgW, imgH);
    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

// ── Component ─────────────────────────────────────────────────
export default function ExcelToPdf() {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [sheets, setSheets] = useState({});
  const [activeSheet, setActiveSheet] = useState("");
  const [tableHtml, setTableHtml] = useState("");
  const [pdfBlob, setPdfBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState(null);

  const reset = () => {
    setFile(null); setFileInfo(null); setSheetNames([]); setSheets({});
    setActiveSheet(""); setTableHtml(""); setPdfBlob(null);
    setError(null); setSuccess(null); setStats(null);
  };

  const handleFile = useCallback(async (f, err) => {
    if (err) { setError(err); return; }
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "ods"].includes(ext)) {
      setError("Please upload a valid Excel file."); return;
    }
    reset();

    try {
      const buf = await readFileAsArrayBuffer(f);
      const { sheetNames: names, sheets: allSheets } = parseExcel(buf);

      setFile(f);
      setFileInfo({ name: f.name, meta: `${formatBytes(f.size)} · ${names.length} sheet(s)` });
      setSheetNames(names);
      setSheets(allSheets);

      const first = names[0];
      setActiveSheet(first);
      setTableHtml(buildTableHtml(allSheets[first] || []));
    } catch (e) {
      setError(`Failed: ${e.message}`);
    }
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file || !activeSheet) return;

    setLoading(true);
    try {
      const blob = await tableToPdf(buildTableHtml(sheets[activeSheet]), activeSheet);
      setPdfBlob(blob);
      setSuccess("Converted successfully");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [file, activeSheet, sheets]);

  const handleDownload = () => {
    if (!pdfBlob) return;
    downloadBlob(pdfBlob, "output.pdf");
  };

  return (
    <div className="space-y-4">
      <LimitationNotice lines={[
        "Large sheets may take time.",
        "Charts & images are not included.",
      ]} />

      <FileDropZone
        onFile={handleFile}
        accept=".xlsx,.xls,.ods"
        acceptLabel="Excel files only"
        fileInfo={fileInfo}
      />

      <Toolbar>
        <ConvertButton onClick={handleConvert} loading={loading} disabled={!file} />
        {pdfBlob && <DownloadButton onClick={handleDownload} />}
      </Toolbar>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />
      {stats && <StatsBar items={stats} />}

      {tableHtml && (
        <div>
          <PanelHeader label="Preview" />
          <div dangerouslySetInnerHTML={{ __html: tableHtml }} />
        </div>
      )}
    </div>
  );
}