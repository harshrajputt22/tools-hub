"use client";
import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import {
  CopyButton, DownloadButton, PanelHeader, ErrorBanner,
  StatsBar, ProcessButton, ClearButton,
  FileDropZone, Toolbar, OutputTextPanel,
  downloadBlob, readFileAsText,
} from "./_shared";

const DELIMITERS = [
  { label: "Auto detect",   value: ""   },
  { label: "Comma (,)",     value: ","  },
  { label: "Semicolon (;)", value: ";"  },
  { label: "Tab (\\t)",     value: "\t" },
  { label: "Pipe (|)",      value: "|"  },
];

function csvToWorkbook(csvText, delimiter) {
  const result = Papa.parse(csvText, {
    header:          true,
    skipEmptyLines:  true,
    delimiter:       delimiter || undefined,
    dynamicTyping:   true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(result.errors[0].message);
  }

  const ws = XLSX.utils.json_to_sheet(result.data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return { wb, data: result.data, meta: result.meta };
}

export default function CsvToExcel() {
  const [input,     setInput]     = useState("");
  const [fileName,  setFileName]  = useState("");
  const [delimiter, setDelimiter] = useState("");
  const [preview,   setPreview]   = useState("");
  const [error,     setError]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [stats,     setStats]     = useState(null);
  const [wb,        setWb]        = useState(null);

  const reset = () => {
    setInput(""); setFileName(""); setPreview("");
    setError(null); setStats(null); setWb(null);
  };

  const handleFile = useCallback(async (file, err) => {
    if (err) { setError(err); return; }
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "tsv", "txt"].includes(ext)) {
      setError("Please upload a .csv, .tsv, or .txt file."); return;
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
    if (!raw) { setError("Input is empty. Paste CSV or upload a file."); return; }
    setLoading(true); setError(null); setPreview(""); setStats(null); setWb(null);

    await new Promise((r) => setTimeout(r, 0));

    try {
      const { wb: workbook, data, meta } = csvToWorkbook(raw, delimiter);
      const cols           = data.length ? Object.keys(data[0]).length : 0;
      const detectedDelim  = delimiter || meta.delimiter || ",";

      setWb(workbook);
      setPreview(JSON.stringify(data.slice(0, 5), null, 2) + (data.length > 5 ? "\n…" : ""));
      setStats([
        { label: "Rows",      value: data.length },
        { label: "Columns",   value: cols },
        { label: "Delimiter", value: detectedDelim === "\t" ? "Tab" : detectedDelim },
      ]);
    } catch (e) {
      setError(`CSV parse error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [input, delimiter]);

  const handleDownload = useCallback(() => {
    if (!wb) return;
    const buf  = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const name = fileName ? fileName.replace(/\.(csv|tsv|txt)$/i, "") + ".xlsx" : "output.xlsx";
    downloadBlob(blob, name);
  }, [wb, fileName]);

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <Toolbar>
        <ProcessButton onClick={handleConvert} loading={loading} label="Convert to Excel" />
        {wb && <DownloadButton onClick={handleDownload} label="Download .xlsx" />}
        {(input || preview) && <ClearButton onClick={reset} />}

        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-medium text-gray-500">Delimiter:</span>
          <select
            value={delimiter}
            onChange={(e) => setDelimiter(e.target.value)}
            className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-400 cursor-pointer"
          >
            {DELIMITERS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </Toolbar>

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input */}
        <div className="flex flex-col gap-3">
          <FileDropZone
            onFile={handleFile}
            accept=".csv,.tsv,.txt"
            acceptLabel=".csv, .tsv, .txt · Max 10 MB"
            fileName={fileName}
            disabled={loading}
          />
          <div className="flex flex-col">
            <PanelHeader
              label="CSV Input"
              meta={input ? `${input.length.toLocaleString()} chars` : null}
              actions={input && <ClearButton onClick={reset} />}
            />
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(null); }}
              placeholder={`Paste CSV text here…\n\nExample:\nname,age,city\nAlice,30,New York\nBob,25,Los Angeles\nCharlie,35,Chicago`}
              spellCheck={false}
              disabled={loading}
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[260px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs disabled:opacity-60"
            />
          </div>
        </div>

        {/* Output */}
        <OutputTextPanel
          label="Preview (first 5 rows as JSON)"
          value={preview}
          emptyText="Converted preview appears here"
          actions={preview && <CopyButton text={preview} />}
        />
      </div>

      <ErrorBanner message={error} />
      {stats && <StatsBar items={stats} />}
    </div>
  );
}