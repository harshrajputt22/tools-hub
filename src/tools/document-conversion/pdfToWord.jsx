"use client";
import { useState, useCallback } from "react";
import {
  FileDropZone, Toolbar, ConvertButton, DownloadButton, CopyButton,
  PanelHeader, ErrorBanner, SuccessBanner, StatsBar,
  LimitationNotice, downloadBlob, readFileAsArrayBuffer, formatBytes,
} from "./_shared";

// ── PDF text extraction via pdf.js ────────────────────────────
async function extractTextFromPdf(arrayBuffer) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lines = [];
    let lastY = null;

    for (const item of content.items) {
      if (!("str" in item)) continue;
      const y = item.transform?.[5];
      if (lastY !== null && Math.abs(y - lastY) > 5) lines.push("");
      lines.push(item.str);
      lastY = y;
    }

    pages.push({
      pageNum: i,
      text: lines.join(" ").replace(/\s+/g, " ").trim(),
    });
  }

  return { pages, numPages: pdf.numPages };
}

// ── Build .docx from extracted text ───────────────────────────
async function buildDocx(pages, fileName) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } =
    await import("docx");

  const children = [];

  pages.forEach(({ pageNum, text }, idx) => {
    children.push(
      new Paragraph({
        text: `— Page ${pageNum} —`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );

    const paragraphs = text
      .split(/(?<=[.!?])\s{2,}/)
      .filter(Boolean);

    (paragraphs.length ? paragraphs : [text || "(No text found on this page)"])
      .forEach((para) => {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: para, size: 24, font: "Calibri" })],
            spacing: { after: 120 },
          })
        );
      });

    if (idx < pages.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  });

  const doc = new Document({
    sections: [{ children }],
    creator: "DevTools",
    description: `Converted from ${fileName}`,
  });

  return Packer.toBlob(doc);
}

// ── Component ─────────────────────────────────────────────────
export default function PdfToWord() {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [pages, setPages] = useState([]);
  const [preview, setPreview] = useState("");
  const [docBlob, setDocBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [stats, setStats] = useState(null);

  const reset = () => {
    setFile(null);
    setFileInfo(null);
    setPages([]);
    setPreview("");
    setDocBlob(null);
    setError(null);
    setSuccess(null);
    setStats(null);
  };

  const handleFile = useCallback((f, err) => {
    if (err) {
      setError(err);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF file (.pdf).");
      return;
    }
    reset();
    setFile(f);
    setFileInfo({
      name: f.name,
      meta: `${formatBytes(f.size)} · PDF`,
    });
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    setDocBlob(null);
    setPreview("");
    setStats(null);

    try {
      const buf = await readFileAsArrayBuffer(file);
      const { pages: extracted, numPages } =
        await extractTextFromPdf(buf);

      const totalChars = extracted.reduce(
        (s, p) => s + p.text.length,
        0
      );

      if (totalChars === 0) {
        throw new Error("No extractable text found.");
      }

      setPages(extracted);
      setPreview(
        extracted
          .map((p) => `[Page ${p.pageNum}]\n${p.text}`)
          .join("\n\n")
      );

      const blob = await buildDocx(extracted, file.name);
      setDocBlob(blob);

      setStats([
        { label: "Pages", value: numPages },
        { label: "Chars", value: totalChars.toLocaleString() },
      ]);

      setSuccess("Conversion complete");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [file]);

  const handleDownload = () => {
    if (!docBlob) return;
    downloadBlob(docBlob, "output.docx");
  };

  return (
    <div className="space-y-4">

      <LimitationNotice lines={[
        "Text PDFs only",
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
        {docBlob && <DownloadButton onClick={handleDownload} />}
      </Toolbar>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />
      {stats && <StatsBar items={stats} />}

      {preview && (
        <div>
          <PanelHeader
            label="Preview"
            actions={<CopyButton text={preview} />}
          />
          <textarea value={preview} readOnly />
        </div>
      )}
    </div>
  );
}