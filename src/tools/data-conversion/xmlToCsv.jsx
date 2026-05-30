"use client";
import { useState, useCallback } from "react";
import { XMLParser } from "fast-xml-parser";
import Papa from "papaparse";
import { FileText } from "lucide-react";
import {
  CopyButton, DownloadButton, PanelHeader, ErrorBanner,
  StatsBar, ProcessButton, ClearButton,
  FileDropZone, Toolbar, OutputTextPanel,
  downloadBlob, readFileAsText,
} from "./_shared";

// ── XML → flat rows ───────────────────────────────────────────
function flattenValue(val, prefix) {
  if (val === null || val === undefined) return { [prefix]: "" };
  if (typeof val !== "object") return { [prefix]: String(val) };
  if (Array.isArray(val)) {
    return val.reduce((acc, item, i) => {
      Object.assign(acc, flattenValue(item, `${prefix}[${i}]`));
      return acc;
    }, {});
  }
  return Object.entries(val).reduce((acc, [k, v]) => {
    const key = k === "#text" ? prefix : `${prefix}.${k}`;
    Object.assign(acc, flattenValue(v, key));
    return acc;
  }, {});
}

function extractRows(parsed) {
  function findRepeating(obj, depth = 0) {
    if (depth > 5 || !obj || typeof obj !== "object") return null;
    for (const [, v] of Object.entries(obj)) {
      if (Array.isArray(v) && v.length > 0) return v;
      if (typeof v === "object") {
        const found = findRepeating(v, depth + 1);
        if (found) return found;
      }
    }
    return null;
  }

  const repeating = findRepeating(parsed);
  if (repeating) {
    return repeating.map((item) => {
      if (typeof item !== "object") return { value: item };
      return Object.entries(item).reduce((acc, [k, v]) => {
        Object.assign(acc, flattenValue(v, k));
        return acc;
      }, {});
    });
  }

  const flat = {};
  Object.entries(parsed).forEach(([k, v]) => {
    Object.assign(flat, flattenValue(v, k));
  });
  return [flat];
}

function xmlToCsv(xmlText) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    parseAttributeValue: true,
    trimValues: true,
  });

  const parsed = parser.parse(xmlText);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("XML parsed to an unexpected structure.");
  }

  const rows = extractRows(parsed);
  if (!rows.length) throw new Error("No data rows could be extracted from the XML.");

  const allKeys = Array.from(new Set(rows.flatMap(Object.keys)));
  const normalized = rows.map((r) =>
    allKeys.reduce((acc, k) => { acc[k] = r[k] ?? ""; return acc; }, {})
  );

  return { csv: Papa.unparse(normalized), rows: normalized, cols: allKeys.length };
}

// ── Component ─────────────────────────────────────────────────
export default function XmlToCsv() {
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const reset = () => {
    setInput(""); setFileName(""); setOutput("");
    setError(null); setStats(null);
  };

  const handleFile = useCallback(async (file, err) => {
    if (err) { setError(err); return; }
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xml", "txt"].includes(ext)) {
      setError("Please upload a .xml or .txt file."); return;
    }
    try {
      const text = await readFileAsText(file);
      setFileName(file.name);
      setInput(text);
      setError(null);
    } catch (e) { setError(e.message); }
  }, []);

  const handleConvert = useCallback(async () => {
    const raw = input.trim();
    if (!raw) { setError("Input is empty. Paste XML or upload a file."); return; }
    if (!raw.startsWith("<")) { setError("Input does not appear to be valid XML (must start with '<')."); return; }

    setLoading(true); setError(null); setOutput(""); setStats(null);
    await new Promise((r) => setTimeout(r, 0));

    try {
      const { csv, rows, cols } = xmlToCsv(raw);
      setOutput(csv);
      setStats([
        { label: "Rows", value: rows.length },
        { label: "Columns", value: cols },
        { label: "Chars", value: csv.length.toLocaleString() },
      ]);
    } catch (e) {
      setError(`XML parse error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/csv;charset=utf-8;" });
    const name = fileName ? fileName.replace(/\\.xml$/i, "") + ".csv" : "output.csv";
    downloadBlob(blob, name);
  };

  return (
    <div className="space-y-4">
      <Toolbar>
        <ProcessButton onClick={handleConvert} loading={loading} label="Convert to CSV" />
        {output && <DownloadButton onClick={handleDownload} label="Download .csv" />}
        {(input || output) && <ClearButton onClick={reset} />}
      </Toolbar>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <FileDropZone
            onFile={handleFile}
            accept=".xml,.txt"
            acceptLabel=".xml, .txt · Max 10 MB"
            fileName={fileName}
            disabled={loading}
          />
          <div className="flex flex-col">
            <PanelHeader
              label="XML Input"
              meta={input ? `${input.length.toLocaleString()} chars` : null}
              actions={input && <ClearButton onClick={reset} />}
            />
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(null); }}
              placeholder={`Paste XML here…`}
              spellCheck={false}
              disabled={loading}
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[260px] focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        <OutputTextPanel
          label="CSV Output"
          value={output}
          meta={output ? `${output.length.toLocaleString()} chars` : null}
          emptyIcon={<FileText size={20} />}
          emptyText="Converted CSV appears here"
          actions={output && (
            <>
              <CopyButton text={output} />
              <DownloadButton onClick={handleDownload} label=".csv" />
            </>
          )}
        />
      </div>

      <ErrorBanner message={error} />
      {stats && <StatsBar items={stats} />}
    </div>
  );
}