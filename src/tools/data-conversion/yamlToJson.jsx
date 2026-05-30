"use client";
import { useState, useCallback } from "react";
import yaml from "js-yaml";
import { FileText } from "lucide-react";
import {
  CopyButton, DownloadButton, PanelHeader, ErrorBanner,
  StatsBar, ProcessButton, ClearButton,
  FileDropZone, Toolbar, OutputTextPanel,
  downloadBlob, readFileAsText,
} from "./_shared";

function yamlToJson(text, indent) {
  const parsed = yaml.load(text, { schema: yaml.JSON_SCHEMA });
  if (parsed === undefined || parsed === null) throw new Error("YAML parsed to null/undefined — check for empty input.");
  return JSON.stringify(parsed, null, indent);
}

function countKeys(obj, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 10) return 0;
  return Object.keys(obj).length + Object.values(obj).reduce(
    (s, v) => s + (typeof v === "object" && v !== null ? countKeys(v, depth + 1) : 0), 0
  );
}

export default function YamlToJson() {
  const [input, setInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [indent, setIndent] = useState(2);
  const [autoMode, setAutoMode] = useState(false);

  const reset = () => {
    setInput(""); setFileName(""); setOutput("");
    setError(null); setStats(null);
  };

  const handleFile = useCallback(async (file, err) => {
    if (err) { setError(err); return; }
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["yaml", "yml", "txt"].includes(ext)) {
      setError("Please upload a .yaml, .yml, or .txt file."); return;
    }
    try {
      const text = await readFileAsText(file);
      setFileName(file.name);
      setInput(text);
      setError(null);
    } catch (e) { setError(e.message); }
  }, []);

  const handleConvert = useCallback(async (raw = input) => {
    const trimmed = raw.trim();
    if (!trimmed) { setError("Input is empty. Paste YAML or upload a file."); return; }
    setLoading(true); setError(null); setOutput(""); setStats(null);

    await new Promise((r) => setTimeout(r, 0));

    try {
      const json = yamlToJson(trimmed, indent);
      const parsed = JSON.parse(json);
      const keys = countKeys(parsed);
      setOutput(json);
      setStats([
        { label: "YAML chars", value: trimmed.length.toLocaleString() },
        { label: "JSON chars", value: json.length.toLocaleString() },
        { label: "Total keys", value: keys },
        { label: "Type", value: Array.isArray(parsed) ? `Array[${parsed.length}]` : typeof parsed },
      ]);
    } catch (e) {
      setError(`YAML parse error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [input, indent]);

  const handleInput = (val) => {
    setInput(val);
    setError(null);
    if (autoMode && val.trim()) {
      clearTimeout(window.__yamlTimer);
      window.__yamlTimer = setTimeout(() => handleConvert(val), 600);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "application/json" });
    const name = fileName ? fileName.replace(/\.(yaml|yml|txt)$/i, "") + ".json" : "output.json";
    downloadBlob(blob, name);
  };

  return (
    <div className="space-y-4">
      <Toolbar>
        <ProcessButton onClick={() => handleConvert()} loading={loading} label="Convert to JSON" />
        {output && <CopyButton text={output} />}
        {output && <DownloadButton onClick={handleDownload} label="Download .json" />}
        {(input || output) && <ClearButton onClick={reset} />}

        <label className="inline-flex items-center gap-2 cursor-pointer select-none ml-2">
          <button
            role="switch"
            aria-checked={autoMode}
            onClick={() => setAutoMode((v) => !v)}
            className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${autoMode ? "bg-blue-600" : "bg-gray-300"}`}
          >
            <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${autoMode ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
          <span className="text-xs font-medium text-gray-600">Auto</span>
        </label>

        <div className="flex items-center gap-1 p-0.5 bg-white border border-gray-200 rounded-lg ml-auto">
          {[2, 4].map((n) => (
            <button key={n} onClick={() => setIndent(n)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${indent === n ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {n}sp
            </button>
          ))}
        </div>
      </Toolbar>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-3">
          <FileDropZone
            onFile={handleFile}
            accept=".yaml,.yml,.txt"
            acceptLabel=".yaml, .yml, .txt · Max 10 MB"
            fileName={fileName}
            disabled={loading}
          />
          <div className="flex flex-col">
            <PanelHeader
              label="YAML Input"
              meta={input ? `${input.length.toLocaleString()} chars` : null}
              actions={input && <ClearButton onClick={reset} />}
            />
            <textarea
              value={input}
              onChange={(e) => handleInput(e.target.value)}
              placeholder={`Paste YAML here…`}
              spellCheck={false}
              disabled={loading}
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[260px] focus:border-blue-400 transition-colors"
            />
          </div>
        </div>

        <OutputTextPanel
          label="JSON Output"
          value={output}
          meta={output ? `${output.length.toLocaleString()} chars` : null}
          emptyIcon={<FileText size={20} />}
          emptyText="Converted JSON appears here"
          actions={output && (
            <>
              <CopyButton text={output} />
              <DownloadButton onClick={handleDownload} label=".json" />
            </>
          )}
        />
      </div>

      <ErrorBanner message={error} />
      {stats && <StatsBar items={stats} />}
    </div>
  );
}