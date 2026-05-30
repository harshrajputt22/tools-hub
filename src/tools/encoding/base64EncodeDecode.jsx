"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { encodeBase64, decodeBase64 } from "@/utils/encoders";
import { copyToClipboard, downloadText, readFileAsText } from "@/lib/helpers";

// ============================================================
// CONSTANTS
// ============================================================

const MODE_OPTIONS = [
  { value: "encode", label: "Encode", desc: "Text → Base64" },
  { value: "decode", label: "Decode", desc: "Base64 → Text" },
];

// ============================================================
// HELPERS
// ============================================================

function isLikelyBase64(str) {
  const cleaned = str.trim().replace(/\s/g, "");
  return /^[A-Za-z0-9+/\-_]+=*$/.test(cleaned) && cleaned.length > 0;
}

function calcSizeRatio(inputLen, outputLen) {
  if (!inputLen) return null;
  const ratio = ((outputLen / inputLen) * 100).toFixed(0);
  return `${ratio}% of input`;
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

// ── Mode selector — SVG lock/unlock instead of 🔒/🔓 emoji ──
function ModeSelector({ mode, onChange }) {
  const icons = {
    encode: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    decode: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
      {MODE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            mode === opt.value
              ? "bg-white text-blue-700 shadow-sm border border-gray-200"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          {icons[opt.value]}
          <span>{opt.label}</span>
          <span className={`text-xs font-normal hidden sm:inline ${mode === opt.value ? "text-blue-400" : "text-gray-400"}`}>
            {opt.desc}
          </span>
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        title={description}
        className={`relative w-8 h-4 rounded-full transition-colors focus:outline-none flex-shrink-0 cursor-pointer ${
          checked ? "bg-blue-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </label>
  );
}

function PanelHeader({ label, meta, actions }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-t-xl">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        {meta && (
          <span className="text-xs text-gray-400 tabular-nums">{meta}</span>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1.5">{actions}</div>
      )}
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
      <svg width="14" height="14" className="flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs font-mono text-red-700 leading-relaxed break-all">{message}</p>
    </div>
  );
}

function CopyButton({ text, label = "Copy" }) {
  const [state, setState] = useState("idle");

  async function handleCopy() {
    if (!text) return;
    const ok = await copyToClipboard(text);
    setState(ok ? "copied" : "error");
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-gray-700 rounded-lg transition-colors"
    >
      {state === "copied" ? (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function StatsBar({ stats, mode, input, output }) {
  if (!stats || !output) return null;

  const sizeRatio = calcSizeRatio(input.length, output.length);

  const items = [
    { label: "Input",  value: `${stats.inputLength?.toLocaleString()  ?? 0} chars` },
    { label: "Output", value: `${stats.outputLength?.toLocaleString() ?? 0} chars` },
    ...(sizeRatio ? [{ label: "Size ratio", value: sizeRatio }] : []),
    ...(mode === "encode" && stats.paddingChars > 0
      ? [{ label: "Padding", value: `${stats.paddingChars} char(s)` }]
      : []),
    ...(mode === "decode" && stats.wasUrlSafe
      ? [{ label: "Type", value: "URL-safe Base64" }]
      : []),
  ];

  return (
    <div className="flex flex-wrap gap-4 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5 text-xs">
          <span className="text-gray-400">{label}:</span>
          <span className="font-mono font-semibold text-gray-700">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── File upload zone — SVGs instead of 📂 📄 📁 emojis ───────
function FileUploadZone({ onFile, maxSizeMB = 5 }) {
  const [dragging,   setDragging]   = useState(false);
  const [fileName,   setFileName]   = useState(null);
  const [fileError,  setFileError]  = useState(null);
  const inputRef = useRef(null);

  async function processFile(file) {
    setFileError(null);
    if (file.size > maxSizeMB * 1024 * 1024) {
      setFileError(`File too large. Max size is ${maxSizeMB}MB.`);
      return;
    }
    try {
      const text = await readFileAsText(file);
      setFileName(file.name);
      onFile(text, file.name);
    } catch {
      setFileError("Failed to read file. Please try again.");
    }
  }

  return (
    <div className="space-y-1.5">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) processFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          dragging  ? "border-blue-400 bg-blue-50 scale-[1.01]"  :
          fileName  ? "border-green-300 bg-green-50"             :
                      "border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
          }}
        />

        {/* ← was: 📂 / 📄 / 📁 emojis */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
          dragging ? "bg-blue-100" : fileName ? "bg-green-100" : "bg-gray-100"
        }`}>
          {fileName ? (
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : dragging ? (
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          )}
        </div>

        <div className="text-center">
          {fileName ? (
            <>
              <p className="text-xs font-semibold text-green-700">{fileName}</p>
              <p className="text-xs text-green-500 mt-0.5">Click to change file</p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold text-gray-600">
                {dragging ? "Drop to load file" : "Drop a file or click to browse"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Max {maxSizeMB}MB · Any text file</p>
            </>
          )}
        </div>
      </div>
      {fileError && (
        <p className="text-xs text-red-500 font-medium px-1">{fileError}</p>
      )}
    </div>
  );
}

// ── Output placeholder — SVG instead of 🔒/🔓 emoji ──────────
function OutputPlaceholder({ mode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
      <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center opacity-40">
        {mode === "encode" ? (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <p className="text-xs text-gray-300">
        {mode === "encode" ? "Base64 encoded output appears here" : "Decoded text appears here"}
      </p>
    </div>
  );
}

function UrlSafeBadge({ urlSafe }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${
      urlSafe ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-gray-50 text-gray-500 border-gray-200"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${urlSafe ? "bg-blue-500" : "bg-gray-400"}`} />
      {urlSafe ? "URL-safe" : "Standard"}
    </span>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Base64Tool() {
  const [mode,        setMode]        = useState("encode");
  const [input,       setInput]       = useState("");
  const [output,      setOutput]      = useState("");
  const [error,       setError]       = useState(null);
  const [stats,       setStats]       = useState(null);

  // Encode options
  const [urlSafe,     setUrlSafe]     = useState(false);
  const [noPadding,   setNoPadding]   = useState(false);

  // Decode options
  const [encoding,    setEncoding]    = useState("utf8");

  // UI state
  const [autoConvert, setAutoConvert] = useState(true);
  const [showFile,    setShowFile]    = useState(false);

  // ── Process handler ─────────────────────────────────────────
  const handleProcess = useCallback(() => {
    const trimmed = input.trim();

    if (!trimmed) {
      setError(
        mode === "encode"
          ? "Please enter text to encode."
          : "Please enter a Base64 string to decode."
      );
      setOutput("");
      setStats(null);
      return;
    }

    if (mode === "encode") {
      const result = encodeBase64(trimmed, { urlSafe, noPadding });
      if (result.success) {
        setOutput(result.output);
        setError(null);
        setStats(result.stats);
      } else {
        setOutput("");
        setError(result.error);
        setStats(null);
      }
    } else {
      const cleaned = trimmed.replace(/\s/g, "");
      const result  = decodeBase64(cleaned, { encoding });
      if (result.success) {
        setOutput(result.output);
        setError(null);
        setStats(result.stats);
      } else {
        setOutput("");
        setError(result.error);
        setStats(null);
      }
    }
  }, [input, mode, urlSafe, noPadding, encoding]);

  // ── Auto convert ────────────────────────────────────────────
  useEffect(() => {
    if (!autoConvert || !input.trim()) return;
    const t = setTimeout(handleProcess, 300);
    return () => clearTimeout(t);
  }, [input, autoConvert, handleProcess]);

  // ── Re-run when options change ───────────────────────────────
  useEffect(() => {
    if (input.trim() && output) handleProcess();
  }, [urlSafe, noPadding, encoding]);

  // ── Ctrl/Cmd + Enter ────────────────────────────────────────
  useEffect(() => {
    function handler(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleProcess();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleProcess]);

  function handleModeChange(newMode) {
    setMode(newMode);
    setInput("");
    setOutput("");
    setError(null);
    setStats(null);
  }

  function handleSwap() {
    if (!output) return;
    const newMode = mode === "encode" ? "decode" : "encode";
    setMode(newMode);
    setInput(output);
    setOutput("");
    setError(null);
    setStats(null);
  }

  function handleClear() {
    setInput("");
    setOutput("");
    setError(null);
    setStats(null);
  }

  function handleFile(text) {
    setInput(text);
    setOutput("");
    setError(null);
    setStats(null);
    setShowFile(false);
  }

  function handleInputChange(value) {
    setInput(value);
    if (error) setError(null);
  }

  const inputMeta  = input  ? `${input.length.toLocaleString()} chars`  : null;
  const outputMeta = output ? `${output.length.toLocaleString()} chars` : null;

  const inputLooksLikeBase64 =
    mode === "encode" && input.trim().length > 10 && isLikelyBase64(input);

  return (
    <div className="space-y-5">

      {/* ── Mode selector ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <ModeSelector mode={mode} onChange={handleModeChange} />
        <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
          <Toggle
            checked={autoConvert}
            onChange={setAutoConvert}
            label="Auto convert"
            description="Convert automatically as you type"
          />
        </div>
      </div>

      {/* ── Smart hint ───────────────────────────────────────── */}
      {inputLooksLikeBase64 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <svg width="14" height="14" className="flex-shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-amber-700 flex-1">
            Your input looks like a Base64 string. Did you mean to{" "}
            <strong>decode</strong> it?
          </p>
          <button
            onClick={() => handleModeChange("decode")}
            className="flex-shrink-0 text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2 cursor-pointer transition-colors"
          >
            Switch to decode
          </button>
        </div>
      )}

      {/* ── Options bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">

        <button
          onClick={handleProcess}
          data-primary="true"
          className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-sm"
        >
          <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {mode === "encode" ? "Encode to Base64" : "Decode from Base64"}
        </button>

        {mode === "encode" ? (
          <>
            <Toggle checked={urlSafe}   onChange={setUrlSafe}   label="URL-safe"   description="Use - and _ instead of + and /" />
            <Toggle checked={noPadding} onChange={setNoPadding} label="No padding" description="Remove = padding characters" />
            <UrlSafeBadge urlSafe={urlSafe} />
          </>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Encoding:</span>
            <div className="flex items-center gap-0.5 p-0.5 bg-white border border-gray-200 rounded-lg">
              {[
                { value: "utf8",   label: "UTF-8"   },
                { value: "latin1", label: "Latin-1" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setEncoding(opt.value)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    encoding === opt.value
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {output && (
          <button
            onClick={handleSwap}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-600 rounded-lg transition-all cursor-pointer"
            title={`Use output as input for ${mode === "encode" ? "decoding" : "encoding"}`}
          >
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Swap &amp; {mode === "encode" ? "decode" : "encode"}
          </button>
        )}

        <button
          onClick={() => setShowFile((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-lg transition-all cursor-pointer ${
            showFile
              ? "bg-blue-50 border-blue-200 text-blue-700"
              : "bg-white border-gray-200 hover:border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          {showFile ? "Hide file upload" : "Upload file"}
        </button>

        {(input || output) && (
          <button
            onClick={handleClear}
            className="text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer transition-colors"
          >
            Clear
          </button>
        )}

        <div className="ml-auto hidden sm:flex items-center gap-1 text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono">↵</kbd>
          <span>to {mode}</span>
        </div>
      </div>

      {/* ── File upload zone ─────────────────────────────────── */}
      {showFile && <FileUploadZone onFile={handleFile} maxSizeMB={5} />}

      {/* ── Two-panel layout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Input */}
        <div className="flex flex-col">
          <PanelHeader
            label={mode === "encode" ? "Plain Text Input" : "Base64 Input"}
            meta={inputMeta}
            actions={
              <>
                {input && (
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setInput(text);
                      } catch { /* clipboard read failed silently */ }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
                  >
                    <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Paste
                  </button>
                )}
                {input && (
                  <button onClick={handleClear} className="text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors">
                    Clear
                  </button>
                )}
              </>
            }
          />
          <textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={
              mode === "encode"
                ? "Type or paste text to encode...\n\nSupports:\n• Unicode characters and emoji \n• Multi-line text\n• Special characters"
                : "Paste Base64 string to decode...\n\nExamples:\n• SGVsbG8sIFdvcmxkIQ==\n• URL-safe: SGVsbG8-V29ybGQ_\n• Without padding: SGVsbG8"
            }
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className="flex-1 w-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-white border border-gray-200 border-t-0 rounded-b-xl outline-none resize-none min-h-[280px] focus:border-blue-400 transition-colors placeholder:text-gray-300 placeholder:font-sans placeholder:text-xs"
          />
        </div>

        {/* Output */}
        <div className="flex flex-col">
          <PanelHeader
            label={mode === "encode" ? "Base64 Output" : "Decoded Text Output"}
            meta={outputMeta}
            actions={
              <>
                {output && <CopyButton text={output} />}
                {output && mode === "encode" && (
                  <button
                    onClick={() => downloadText(output, "encoded.txt", "text/plain")}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </button>
                )}
              </>
            }
          />
          <div className="relative flex-1 border border-gray-200 border-t-0 rounded-b-xl overflow-hidden bg-gray-50 min-h-[280px]">
            <textarea
              value={output}
              readOnly
              spellCheck={false}
              className={`w-full h-full px-4 py-3.5 text-sm font-mono leading-relaxed bg-gray-50 outline-none resize-none min-h-[280px] text-gray-800 cursor-default select-all ${
                mode === "encode" ? "whitespace-pre-wrap break-all" : "whitespace-pre-wrap"
              }`}
            />
            {!output && !error && <OutputPlaceholder mode={mode} />}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      <StatsBar stats={stats} mode={mode} input={input} output={output} />
    </div>
  );
}