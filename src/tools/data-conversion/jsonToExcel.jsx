"use client";
import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { BarChart3, Wrench, FileText } from "lucide-react";
import {
  CopyButton, DownloadButton, PanelHeader, ErrorBanner,
  InfoCards, StatsBar, ProcessButton, ClearButton,
  FileDropZone, Toolbar, OutputTextPanel,
  downloadBlob, flattenObject, readFileAsText,
} from "./_shared";

// ── Helpers ───────────────────────────────────────────────────
function parseJsonInput(raw) {
  const parsed = JSON.parse(raw.trim());
  if (Array.isArray(parsed)) return parsed;
  if (typeof parsed === "object" && parsed !== null) return [parsed];
  throw new Error("JSON must be an array of objects or a single object.");
}

function jsonToWorkbook(data) {
  const flat = data.map((row) =>
    typeof row === "object" && row !== null ? flattenObject(row) : { value: row }
  );
  const ws = XLSX.utils.json_to_sheet(flat);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return wb;
}

// ── Component ─────────────────────────────────────────────────
export default function JsonToExcel() {
  const [input,    setInput]    = useState("");
  const [fileName, setFileName] = useState("");
  const [preview,  setPreview]  = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [stats,    setStats]    = useState(null);
  const [wb,       setWb]       = useState(null);

  const reset = () => {
    setInput(""); setFileName(""); setPreview("");
    setError(null); setStats(null); setWb(null);
  };

  const handleFile = useCallback(async (file, err) => {
    if (err) { setError(err); return; }
    if (!file.name.endsWith(".json")) {
      setError("Please upload a .json file."); return;
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
    if (!raw) { setError("Input is empty. Paste JSON or upload a file."); return; }
    setLoading(true); setError(null); setPreview(""); setStats(null); setWb(null);

    await new Promise((r) => setTimeout(r, 0)); // yield to UI

    try {
      const data    = parseJsonInput(raw);
      const workbook = jsonToWorkbook(data);
      const flat    = data.map((r) => typeof r === "object" && r !== null ? flattenObject(r) : { value: r });
      const cols    = flat.length ? Object.keys(flat[0]).length : 0;

      setWb(workbook);
      setPreview(JSON.stringify(flat.slice(0, 5), null, 2) + (flat.length > 5 ? "\n…" : ""));
      setStats([
        { label: "Rows",    value: data.length },
        { label: "Columns", value: cols },
        { label: "Cells",   value: data.length * cols },
      ]);
    } catch (e) {
      setError(`Parse error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleDownload = useCallback(() => {
    if (!wb) return;
    const buf  = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    downloadBlob(blob, "output.xlsx");
  }, [wb]);

  return (
    <div className="space-y-4">
      <Toolbar>
        <ProcessButton onClick={handleConvert} loading={loading} label="Convert to Excel" />
        {wb && <DownloadButton onClick={handleDownload} label="Download .xlsx" />}
        {(input || preview) && <ClearButton onClick={reset} />}
      </Toolbar>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="flex flex-col gap-3">
          <FileDropZone
            onFile={handleFile}
            accept=".json,application/json"
            acceptLabel="JSON files only · Max 10 MB"
            fileName={fileName}
            disabled={loading}
          />
          <div className="flex flex-col">
            <PanelHeader
              label="JSON Input"
              meta={input ? `${input.length.toLocaleString()} chars` : null}
              actions={input && <ClearButton onClick={reset} />}
            />
            <textarea
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(null); }}
              placeholder={`Paste JSON array or object…\n\nExample:\n[\n  { "name": "Alice", "age": 30, "city": "NYC" },\n  { "name": "Bob",   "age": 25, "city": "LA"  }\n]`}
              spellCheck={false}
              disabled={loading}
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[260px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs disabled:opacity-60"
            />
          </div>
        </div>

        {/* Output */}
        <OutputTextPanel
          label="Preview (first 5 rows)"
          value={preview}
          emptyIcon={<BarChart3 size={20} />}
          emptyText="Excel preview appears here after conversion"
          actions={preview && <CopyButton text={preview} />}
        />
      </div>

      <ErrorBanner message={error} />
      {stats && <StatsBar items={stats} />}
    </div>
  );
}
