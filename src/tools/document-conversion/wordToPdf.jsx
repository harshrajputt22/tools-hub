"use client";
import { useState, useCallback, useRef } from "react";
import {
  FileDropZone, Toolbar, ConvertButton, DownloadButton,
  PanelHeader, ErrorBanner, SuccessBanner, StatsBar,
  LimitationNotice, downloadBlob, readFileAsArrayBuffer, formatBytes,
} from "./_shared";

// ── Extract text/HTML from .docx via mammoth ──────────────────
async function docxToHtml(arrayBuffer) {
  const mammoth = await import("mammoth");
  const result  = await mammoth.convertToHtml({ arrayBuffer });
  return { html: result.value, messages: result.messages };
}

// ── Render HTML → PDF via jsPDF + html2canvas ─────────────────
async function htmlToPdfBlob(html, fileName) {
  const [{ jsPDF }, html2canvas] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; left: -9999px; top: 0;
    width: 794px; padding: 60px;
    background: #fff; font-family: Calibri, Georgia, serif;
    font-size: 13px; line-height: 1.7; color: #111;
  `;
  container.innerHTML = `
    <style>
      h1,h2,h3,h4 { margin: 1em 0 0.4em; font-weight: 700; }
      h1 { font-size: 1.6em; } h2 { font-size: 1.3em; } h3 { font-size: 1.1em; }
      p  { margin: 0 0 0.8em; }
      ul,ol { margin: 0 0 0.8em 1.5em; }
      li { margin-bottom: 0.3em; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
      th,td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
      th { background: #f0f0f0; font-weight: 700; }
      strong { font-weight: 700; } em { font-style: italic; }
    </style>
    ${html}
  `;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas.default(container, {
      scale: 2, useCORS: true, logging: false, allowTaint: true,
    });

    const pdf      = new jsPDF.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW    = pdf.internal.pageSize.getWidth();
    const pageH    = pdf.internal.pageSize.getHeight();
    const imgW     = pageW;
    const imgH     = (canvas.height * imgW) / canvas.width;
    const margins  = { top: 10, bottom: 10 };
    const usable   = pageH - margins.top - margins.bottom;

    let yOffset = 0;
    while (yOffset < imgH) {
      if (yOffset > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, margins.top - yOffset, imgW, imgH);
      yOffset += usable;
    }

    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

// ── Component ─────────────────────────────────────────────────
export default function WordToPdf() {
  const [file,     setFile]     = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [pdfBlob,  setPdfBlob]  = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [success,  setSuccess]  = useState(null);
  const [stats,    setStats]    = useState(null);

  const reset = () => {
    setFile(null); setFileInfo(null); setHtmlContent("");
    setPdfBlob(null); setError(null); setSuccess(null); setStats(null);
  };

  const handleFile = useCallback((f, err) => {
    if (err) { setError(err); return; }
    const ext = f.name.split(".").pop().toLowerCase();
    if (!["docx"].includes(ext)) {
      setError("Please upload a .docx file.");
      return;
    }
    reset();
    setFile(f);
    setFileInfo({ name: f.name, meta: `${formatBytes(f.size)} · Word Document` });
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setPdfBlob(null);
    setStats(null);

    try {
      const buf = await readFileAsArrayBuffer(file);
      const { html, messages } = await docxToHtml(buf);

      if (!html?.trim()) throw new Error("No content extracted.");

      setHtmlContent(html);

      const blob = await htmlToPdfBlob(html, file.name);
      setPdfBlob(blob);

      const warnings = messages.filter((m) => m.type === "warning").length;

      setStats([
        { label: "PDF size", value: formatBytes(blob.size) },
        { label: "Warnings", value: warnings || "None" },
      ]);

      setSuccess("Conversion complete");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleDownload = () => {
    if (!pdfBlob) return;
    downloadBlob(pdfBlob, "output.pdf");
  };

  return (
    <div className="space-y-4">

      <LimitationNotice lines={[
        "Only .docx supported",
        "Complex layouts may break",
      ]} />

      <FileDropZone
        onFile={handleFile}
        accept=".docx"
        acceptLabel=".docx only"
        fileInfo={fileInfo}
      />

      <Toolbar>
        <ConvertButton onClick={handleConvert} loading={loading} disabled={!file} />
        {pdfBlob && <DownloadButton onClick={handleDownload} />}
      </Toolbar>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />
      {stats && <StatsBar items={stats} />}

      {htmlContent && (
        <div>
          <PanelHeader label="Preview" />
          <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
        </div>
      )}
    </div>
  );
}