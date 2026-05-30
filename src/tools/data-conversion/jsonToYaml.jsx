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

const YAML_STYLES = [
  { value: "block",  label: "Block" },
  { value: "flow",   label: "Flow"  },
];

function jsonToYaml(text, flowLevel) {
  const parsed = JSON.parse(text.trim());
  if (parsed === undefined) throw new Error("JSON parsed to undefined.");
  return yaml.dump(parsed, {
    indent:    2,
    lineWidth: 120,
    noRefs:    true,
    flowLevel: flowLevel === "flow" ? 0 : -1,
  }).trimEnd();
}

function countDepth(obj, depth = 0) {
  if (!obj || typeof obj !== "object") return depth;
  return Math.max(...Object.values(obj).map((v) => countDepth(v, depth + 1)));
}

export default function JsonToYaml() {
  const [input,     setInput]     = useState("");
  const [fileName,  setFileName]  = useState("");
  const [output,    setOutput]    = useState("");
  const [error,     setError]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [stats,     setStats]     = useState(null);
  const [style,     setStyle]     = useState("block");
  const [autoMode,  setAutoMode]  = useState(false);

  const reset = () => {
    setInput(""); setFileName(""); setOutput("");
    setError(null); setStats(null);
  };

  const handleFile = useCallback(async (file, err) => {
    if (err) { setError(err); return; }
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["json", "txt"].includes(ext)) {
      setError("Please upload a .json or .txt file."); return;
    }
    try {
      const text = await readFileAsText(file);
      setFileName(file.name);
      setInput(text);
      setError(null);
    } catch (e) { setError(e.message); }
  }, []);

  const handleConvert = useCallback(async (raw = input, currentStyle = style) => {
    const trimmed = raw.trim();
    if (!trimmed) { setError("Input is empty. Paste JSON or upload a file."); return; }
    setLoading(true); setError(null); setOutput(""); setStats(null);

    await new Promise((r) => setTimeout(r, 0));

    try {
      const yamlOut = jsonToYaml(trimmed, currentStyle);
      const parsed  = JSON.parse(trimmed);
      const depth   = countDepth(parsed);
      const keys    = typeof parsed === "object" && parsed !== null ? Object.keys(parsed).length : 0;

      setOutput(yamlOut);
      setStats([
        { label: "JSON chars", value: trimmed.length.toLocaleString() },
        { label: "YAML chars", value: yamlOut.length.toLocaleString() },
        { label: "Top keys",   value: keys },
        { label: "Max depth",  value: depth },
        { label: "Style",      value: currentStyle },
      ]);
    } catch (e) {
      let msg = e.message;
      if (msg.includes("JSON Parse") || msg.includes("Unexpected token")) {
        msg = `Invalid JSON: ${msg}`;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [input, style]);

  const handleInput = (val) => {
    setInput(val);
    setError(null);
    if (autoMode && val.trim()) {
      clearTimeout(window.__jsonYamlTimer);
      window.__jsonYamlTimer = setTimeout(() => handleConvert(val, style), 600);
    }
  };

  const handleStyleChange = (s) => {
    setStyle(s);
    if (output && input.trim()) handleConvert(input, s);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: "text/yaml;charset=utf-8;" });
    const name = fileName ? fileName.replace(/\.(json|txt)$/i, "") + ".yaml" : "output.yaml";
    downloadBlob(blob, name);
  };

  return (
    <div className="space-y-4">
      <Toolbar>
        <ProcessButton onClick={() => handleConvert()} loading={loading} label="Convert to YAML" />
        {output && <CopyButton text={output} />}
        {output && <DownloadButton onClick={handleDownload} label="Download .yaml" />}
        {(input || output) && <ClearButton onClick={reset} />}

        {/* Auto toggle */}
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

        {/* Style selector */}
        <div className="flex items-center gap-1 p-0.5 bg-white border border-gray-200 rounded-lg ml-auto">
          {YAML_STYLES.map(({ value, label }) => (
            <button key={value} onClick={() => handleStyleChange(value)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${style === value ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}>
              {label}
            </button>
          ))}
        </div>
      </Toolbar>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div className="flex flex-col gap-3">
          <FileDropZone
            onFile={handleFile}
            accept=".json,.txt"
            acceptLabel=".json, .txt · Max 10 MB"
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
              onChange={(e) => handleInput(e.target.value)}
              placeholder={`Paste JSON here…\n\nExample:\n{\n  "name": "Alice",\n  "age": 30,\n  "address": {\n    "city": "New York",\n    "zip": "10001"\n  },\n  "tags": ["developer", "designer"]\n}`}
              spellCheck={false}
              disabled={loading}
              className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[260px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs disabled:opacity-60"
            />
          </div>
        </div>

        {/* Output */}
        <OutputTextPanel
          label="YAML Output"
          value={output}
          meta={output ? `${output.length.toLocaleString()} chars` : null}
          emptyIcon={<FileText size={20} />}
          emptyText="Converted YAML appears here"
          actions={output && (
            <>
              <CopyButton text={output} />
              <DownloadButton onClick={handleDownload} label=".yaml" />
            </>
          )}
        />
      </div>

      <ErrorBanner message={error} />
      {stats && <StatsBar items={stats} />}
    </div>
  );
}